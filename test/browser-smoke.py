"""Real browser QA against a Pages-style /rust-foundry/ deployment.

Requires Python Playwright and Chromium. Set BASE_URL to the deployed URL or
serve dist/ at /rust-foundry/ on localhost without adding isolation headers.
An optional CHROMIUM_PATH selects a system installation.
"""
import json
import os
import shutil
import atexit
import functools
import http.server
import pathlib
import tempfile
import threading
import time
from contextlib import ExitStack
from playwright.sync_api import sync_playwright, expect

resources = ExitStack()
atexit.register(resources.close)
base = os.environ.get('BASE_URL')
if not base:
    directory = pathlib.Path(resources.enter_context(tempfile.TemporaryDirectory()))
    (directory / 'rust-foundry').symlink_to(pathlib.Path(__file__).resolve().parent.parent / 'dist', target_is_directory=True)
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    handler = functools.partial(QuietHandler, directory=str(directory))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    resources.callback(server.server_close)
    resources.callback(server.shutdown)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/rust-foundry/'
executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
with sync_playwright() as p:
    options = {'headless': True, 'args': ['--no-sandbox']}
    if executable:
        options['executable_path'] = executable
    browser = p.chromium.launch(**options)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    page = context.new_page()
    errors = []
    toolchain_requests = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    context.on('request', lambda request: toolchain_requests.append(request.url) if '/toolchain/' in request.url else None)
    page.goto(base, wait_until='domcontentloaded')
    page.wait_for_function('crossOriginIsolated && !!navigator.serviceWorker.controller', timeout=30_000)
    expect(page.locator('#course-view')).to_be_visible()
    expect(page.locator('#course-view h1')).to_contain_text('From your first value')
    assert toolchain_requests == [], 'Reading requested compiler assets.'
    page.locator('[data-view="practice"]').click()
    expect(page.locator('#run')).to_be_enabled()
    assert page.locator('#load').count() == 0
    assert page.locator('.toolchain-card').count() == 0
    assert toolchain_requests == [], 'Compiler assets were requested before Run.'
    assert page.evaluate('typeof SharedArrayBuffer') == 'function'
    assert page.evaluate('getComputedStyle(document.getElementById("source")).fontSize') == '17px'
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    editor = page.locator('#source')
    editor.fill('fn main() ')
    editor.evaluate('(element) => element.setSelectionRange(10, 10)')
    page.get_by_role('button', name='Insert braces', exact=True).click()
    expect(editor).to_have_value('fn main() {}')
    assert editor.evaluate('(element) => element.selectionStart') == 11
    page.locator('#reset').click()
    # First Run can be stopped while the compiler is being downloaded/prepared.
    page.locator('#run').click()
    expect(page.locator('#stop')).to_be_enabled()
    page.locator('#stop').click()
    expect(page.locator('#status-text')).to_contain_text('Stopped')
    expect(page.locator('#run')).to_be_enabled()
    expect(page.locator('#download-progress')).to_be_hidden()
    # The next Run downloads as needed and executes without a separate setup step.
    page.locator('#run').click()
    page.wait_for_function('document.getElementById("status-text").textContent.startsWith("Finished") || document.getElementById("status-light").classList.contains("error")', timeout=300_000)
    expect(page.locator('#status-text')).to_contain_text('Finished')
    expect(page.locator('#stdout')).to_have_text('Hello, Rust!\n')
    expect(page.locator('#check-result')).to_contain_text('Output matches')
    assert not errors, errors
    print(json.dumps({'phone_compile': 'passed', 'status': page.locator('#status-text').inner_text(), 'isolation': page.evaluate('crossOriginIsolated')}), flush=True)
    assert toolchain_requests, 'Run did not request the real compiler assets.'
    request_count = len(toolchain_requests)
    editor.fill('fn main() { println!("Run again"); }')
    started = time.monotonic()
    page.locator('#run').click()
    expect(page.locator('#status-text')).to_contain_text('Finished', timeout=20_000)
    assert time.monotonic() - started < 20, 'Warm compilation exceeded the desktop CI performance budget.'
    expect(page.locator('#stdout')).to_have_text('Run again\n')
    assert len(toolchain_requests) == request_count, 'A later Run downloaded compiler assets again.'
    print(json.dumps({'on_demand_loading': 'passed', 'cancel_and_retry': 'passed', 'warm_run_reuses_compiler': 'passed'}), flush=True)
    # Real responsive layout checks in Chromium, not physical-device emulation
    # of Safari's engine, memory budget, or the mobile operating system.
    for width, height in [(320, 700), (390, 844), (768, 1024), (1024, 768), (1280, 800)]:
        page.set_viewport_size({'width': width, 'height': height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
        for selector, minimum in [('body', 18), ('#description', 18), ('#source', 17), ('#stdin', 17), ('#diagnostics', 17), ('#stdout', 17), ('#run', 16), ('#status-text', 16), ('#note', 16)]:
            size = page.locator(selector).evaluate('(element) => parseFloat(getComputedStyle(element).fontSize)')
            assert size >= minimum, (width, selector, size)
        for selector in ['#run', '#stop', '#code-keys button']:
            for button in page.locator(selector).all():
                if button.is_visible():
                    box = button.bounding_box()
                    assert box['height'] >= 44 and box['width'] >= 44, (width, selector, box)
        for lesson in page.locator('.lesson-button').all():
            lesson.click()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, lesson.inner_text())
    print(json.dumps({'phone_and_tablet_layouts': 'passed', 'page_errors': errors}), flush=True)
    browser.close()
