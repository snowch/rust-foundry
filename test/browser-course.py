"""Real mobile-sized Chromium checks for learning and persistent Rust TinyDB."""
import atexit
import functools
import http.server
import json
import os
import pathlib
import shutil
import subprocess
import tempfile
import threading
import zipfile
from contextlib import ExitStack
from playwright.sync_api import sync_playwright, expect

root = pathlib.Path(__file__).resolve().parent.parent
resources = ExitStack()
atexit.register(resources.close)
base = os.environ.get('BASE_URL')
if not base:
    directory = pathlib.Path(resources.enter_context(tempfile.TemporaryDirectory()))
    (directory / 'rust-foundry').symlink_to(root / 'dist', target_is_directory=True)
    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(directory)))
    resources.callback(server.server_close)
    resources.callback(server.shutdown)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/rust-foundry/'

catalog = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', 'import {course,chapters} from "./src/course-data.js"; console.log(JSON.stringify({course,chapters}));'], cwd=root))

lessons, chapters = catalog['course'], catalog['chapters']
by_id = {lesson['id']: lesson for lesson in lessons}
first_size = sum(lesson['chapter'] == lessons[0]['chapter'] for lesson in lessons)

def route(page, fragment):
    page.evaluate('(fragment) => location.hash = fragment', fragment)

def run(page, script, name=None):
    if name:
        page.locator('#db-name').fill(name)
    page.locator('#db-script').fill(script)
    page.locator('#db-run').click()
    expect(page.locator('#db-run')).to_be_enabled(timeout=20_000)
    return page.locator('#db-output').inner_text()

with sync_playwright() as p:
    options = {'headless': True, 'args': ['--no-sandbox']}
    executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    if executable:
        options['executable_path'] = executable
    if base.startswith('https://') and (os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY')):
        options['proxy'] = {'server': os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY'), 'bypass': '127.0.0.1,localhost'}
    browser = p.chromium.launch(**options)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True)
    context.add_init_script('''
      try {
      if ((location.protocol === 'http:' || location.protocol === 'https:') && !localStorage.getItem('learning-review-seed')) {
        const old = `fn greeting() -> &'static str { "Hello, Rust!" }
fn main() { println!("{}", greeting()); }
`;
        localStorage.setItem('rust-foundry-lesson-draft-v1:bindings:worked', old);
        localStorage.setItem('rust-foundry-course-v1:read:bindings', 'true');
        localStorage.setItem('rust-foundry-course-v1:practice:bindings', 'true');
        localStorage.setItem('rust-foundry-mvp-v1', JSON.stringify({sources: {'course:bindings:worked': old}}));
        localStorage.setItem('learning-review-seed', 'true');
      }
      } catch { /* Initial about:blank documents do not expose local storage. */ }
    ''')
    page = context.new_page()
    errors, compiler_requests = [], []
    context.on('page', lambda tab: tab.on('pageerror', lambda error: errors.append(str(error))))
    page.on('pageerror', lambda error: errors.append(str(error)))
    context.on('request', lambda request: compiler_requests.append(request.url) if '/toolchain/' in request.url else None)
    page.goto(base, wait_until='domcontentloaded')
    page.wait_for_function('crossOriginIsolated && !!navigator.serviceWorker.controller', timeout=60_000)
    expect(page.locator('#course-view h1')).to_contain_text('From your first value')
    # Each authored route renders real prose, source, output, a question and hints.
    for lesson in lessons:
        route(page, '#course/' + lesson['id'])
        expect(page.locator('#course-view h1')).to_have_text(lesson['title'])
        expect(page.locator('.prediction button')).to_have_count(3)
        page.locator('.prediction button').nth(lesson['answer']).click()
        expect(page.locator('.prediction [role="status"]')).to_contain_text('Correct.')
        assert page.locator('.inline-runner[data-mode="worked"] textarea').input_value().strip() == lesson['source'].strip()
        expect(page.locator('.lesson-goal')).to_contain_text(lesson['objective'])
        actual_prerequisites = page.locator('.lesson-prerequisites a').evaluate_all('(links) => links.map(link => link.hash.slice(8))')
        assert actual_prerequisites == lesson['prerequisites'], lesson['id']
        chapter_index = next(i for i, value in enumerate(lessons) if value['chapter'] == lesson['chapter'])
        expect(page.locator('.chapter-position')).to_contain_text(f'Lesson {lessons.index(lesson) - chapter_index + 1} of {sum(item["chapter"] == lesson["chapter"] for item in lessons)}')
        expect(page.locator('.progress-copy')).to_contain_text(f'0 / {len(lessons)} read')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), lesson['id']
    assert compiler_requests == [], 'Reading downloaded the compiler.'
    # Bring an earlier full-editor draft into the lesson, then keep inline edits across navigation.
    legacy = 'fn main() { println!("Earlier draft"); }\n'
    page.evaluate('''source => { const key = 'rust-foundry-mvp-v1'; const saved = JSON.parse(localStorage.getItem(key) || '{}'); saved.sources ||= {}; saved.sources['course:copy:worked'] = source; localStorage.setItem(key, JSON.stringify(saved)); }''', legacy)
    route(page, '#course/copy')
    legacy_editor = page.locator('#lesson-code-copy-worked')
    expect(legacy_editor).to_have_value(by_id['copy']['source'])
    old_draft = page.locator('.inline-runner[data-mode="worked"] .previous-draft')
    old_draft.locator('summary').click()
    with page.expect_download() as transfer:
        old_draft.get_by_role('button', name='Download previous draft .rs').click()
    assert pathlib.Path(transfer.value.path()).read_text() == legacy
    assert page.evaluate('JSON.parse(localStorage.getItem("rust-foundry-mvp-v1")).sources["course:copy:worked"]') == legacy
    edited = 'fn main() { println!("Kept inline"); }\n'
    legacy_editor.fill(edited)
    route(page, '#course/functions')
    expect(page.locator('#course-view h1')).to_have_text(by_id['functions']['title'])
    route(page, '#course/copy')
    expect(page.locator('#lesson-code-copy-worked')).to_have_value(edited)
    page.locator('.inline-runner[data-mode="worked"]').get_by_role('button', name='Reset code', exact=True).click()
    route(page, '#course/references')
    expect(page.locator('#course-view h1')).to_have_text(by_id['references']['title'])
    page.get_by_role('button', name='Next step', exact=True).click()
    expect(page.locator('.ownership-walk')).to_contain_text('view reads through a shared borrow')
    page.get_by_role('button', name='Mark reading complete', exact=True).click()
    expect(page.locator('.progress-copy')).to_contain_text(f'1 / {len(lessons)} read')
    expect(page.locator('.progress-copy')).to_contain_text(f'0 / {len(lessons)} practice')
    # Storage events reconcile reading completion in another tab.
    second = context.new_page()
    second.goto(base + '#course/references', wait_until='domcontentloaded')
    expect(second.get_by_role('button', name='✓ Read · mark unread', exact=True)).to_be_visible()
    second.get_by_role('button', name='✓ Read · mark unread', exact=True).click()
    expect(page.locator('.progress-copy')).to_contain_text(f'0 / {len(lessons)} read')
    second.close()
    # TinyDB first run downloads only its small Wasm program.
    route(page, '#workspace')
    expect(page.locator('#db-storage')).to_contain_text('Saved in this browser')
    output = run(page, "INSERT INTO people VALUES (1, 'Ada', 90);\nSELECT * FROM people;", 'qa.rdb')
    assert '1 | Ada | 90' in output
    expect(page.locator('#db-storage')).to_contain_text('Saved in this browser')
    assert compiler_requests == [], 'Bundled TinyDB downloaded the full compiler.'
    page.reload(wait_until='domcontentloaded')
    expect(page.locator('#db-storage')).to_contain_text('Saved in this browser')
    assert '1 | Ada | 90' in run(page, 'SELECT * FROM people;', 'qa.rdb')
    assert run(page, "BEGIN;\nINSERT INTO people VALUES (2, 'Staged', 80);\nROLLBACK;\nSELECT COUNT(*) FROM people;").endswith('1\n')
    run(page, ".crash commit\nINSERT INTO people VALUES (3, 'Recovery', 80);", 'recovery.rdb')
    expect(page.locator('#db-status')).to_contain_text('Simulated interruption')
    expect(page.locator('#db-files')).to_contain_text('recovery.rdb.wal')
    output = run(page, 'SELECT * FROM people;\n.check')
    assert 'Recovered committed transaction' in output and '3 | Recovery | 80' in output
    assert 'recovery.rdb.wal' not in page.locator('#db-files').inner_text()
    # Download actual C-compatible bytes, then import them without conversion.
    run(page, '.export exchange.tdb', 'qa.rdb')
    row = page.locator('.db-file').filter(has_text='exchange.tdb')
    with page.expect_download() as transfer:
        row.get_by_role('button', name='Download', exact=True).click()
    legacy = pathlib.Path(transfer.value.path()).read_bytes()
    assert legacy[:8] == bytes([84, 68, 66, 49, 1, 40, 1, 0])
    page.locator('#db-import').set_input_files({'name': 'from-c.tdb', 'mimeType': 'application/octet-stream', 'buffer': legacy})
    expect(page.locator('#db-status')).to_contain_text('Imported files saved')
    assert '1 | Ada | 90' in run(page, '.import from-c.tdb\nSELECT * FROM people;', 'imported.rdb')
    # Stale tabs must keep a downloadable candidate and never overwrite saved files.
    second = context.new_page()
    second.goto(base + '#workspace', wait_until='domcontentloaded')
    expect(second.locator('#db-storage')).to_contain_text('Saved in this browser')
    run(page, "INSERT INTO people VALUES (9, 'First tab', 9);", 'qa.rdb')
    second.locator('#db-name').fill('qa.rdb')
    second.locator('#db-script').fill("INSERT INTO people VALUES (10, 'Stale tab', 10);")
    second.locator('#db-run').click()
    expect(second.locator('#db-storage')).to_contain_text('Newer files exist')
    expect(second.locator('#db-run')).to_be_disabled()
    with second.expect_download() as transfer:
        second.locator('#db-download').click()
    with zipfile.ZipFile(transfer.value.path()) as archive:
        assert archive.testzip() is None
        assert 'qa.rdb' in archive.namelist()
    output = run(page, 'SELECT * FROM people;', 'qa.rdb')
    assert '9 | First tab' in output and 'Stale tab' not in output
    second.on('dialog', lambda dialog: dialog.accept())
    second.locator('#db-reload').click()
    expect(second.locator('#db-run')).to_be_enabled()
    second.close()
    # Quota failure must not erase saved state or lose the candidate download.
    page.evaluate('''() => { window.originalPut = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function() { throw new DOMException('Test quota exceeded', 'QuotaExceededError'); }; }''')
    run(page, "INSERT INTO people VALUES (11, 'Unsaved', 11);", 'qa.rdb')
    expect(page.locator('#db-storage')).to_contain_text('Unsaved files in memory')
    with page.expect_download() as transfer:
        page.locator('#db-download').click()
    with zipfile.ZipFile(transfer.value.path()) as archive:
        assert archive.testzip() is None
    page.evaluate('() => { IDBObjectStore.prototype.put = window.originalPut; }')
    page.locator('#db-retry').click()
    expect(page.locator('#db-storage')).to_contain_text('Saved in this browser')
    assert '11 | Unsaved | 11' in run(page, 'SELECT * FROM people;')
    # Check layouts with the longest actual file names, scripts, and course code.
    screenshot_dir = pathlib.Path(os.environ.get('SCREENSHOT_DIR', '/tmp/rust-foundry-qa'))
    screenshot_dir.mkdir(parents=True, exist_ok=True)
    for width, height in [(320, 700), (390, 844), (768, 1024), (1024, 768), (1280, 800)]:
        page.set_viewport_size({'width': width, 'height': height})
        for fragment in ['#workspace', '#course/bplus-lookup', '#course/references']:
            route(page, fragment)
            expect(page.locator('#database-view' if fragment == '#workspace' else '#course-view')).to_be_visible()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (width, fragment)
        if width in (390, 768):
            page.screenshot(path=str(screenshot_dir / f'course-{width}.png'), full_page=True)
            route(page, '#workspace')
            page.screenshot(path=str(screenshot_dir / f'workspace-{width}.png'), full_page=True)
    # Compile a real exercise: the starter fails, the reference passes; reading stays separate.
    route(page, '#course/first-program')
    worked = page.locator('.inline-runner[data-mode="worked"]')
    worked.get_by_role('button', name='Run example', exact=True).click()
    worked.get_by_role('button', name='Stop', exact=True).click()
    expect(worked.locator('.inline-status')).to_contain_text('Stopped')
    worked.get_by_role('button', name='Run example', exact=True).click()
    expect(worked.get_by_role('button', name='Run example', exact=True)).to_be_enabled(timeout=300_000)
    expect(worked.locator('.inline-output')).to_have_text(lessons[0]['expected'])
    expect(worked.locator('.inline-status')).to_contain_text('Example finished')
    expect(page.locator('.progress-copy')).to_contain_text(f'0 / {len(lessons)} read · 0 / {len(lessons)} practice')
    assert page.url.endswith('#course/first-program')
    request_count = len(compiler_requests)
    worked.locator('textarea').fill('fn main() { println!("An inline edit"); }')
    worked.get_by_role('button', name='Run example', exact=True).click()
    expect(worked.locator('.inline-output')).to_have_text('An inline edit\n', timeout=30_000)
    expect(worked.get_by_role('button', name='Run example', exact=True)).to_be_enabled()
    assert len(compiler_requests) == request_count, 'Inline re-runs fetched the compiler again.'
    worked.locator('textarea').fill('fn main() { let value = ; }')
    worked.get_by_role('button', name='Run example', exact=True).click()
    expect(worked.locator('.inline-status')).to_contain_text('compile error', timeout=30_000)
    assert worked.locator('.inline-diagnostics').evaluate('(node) => node.open')
    worked.get_by_role('button', name='Reset code', exact=True).click()
    page.get_by_role('button', name='Try the exercise ↓', exact=True).click()
    practice = page.locator('.inline-runner[data-mode="exercise"]')
    assert 'todo!' not in practice.locator('textarea').input_value()
    assert 'assert' not in practice.locator('textarea').input_value()
    practice.get_by_role('button', name='Run checks', exact=True).click()
    expect(practice.get_by_role('button', name='Run checks', exact=True)).to_be_enabled(timeout=300_000)
    expect(practice.locator('.inline-status')).to_contain_text('output differs')
    assert page.url.endswith('#course/first-program'), 'Running code left the lesson.'
    assert page.evaluate('localStorage.getItem("rust-foundry-course-v2:practice:first-program")') is None
    practice.locator('textarea').fill(lessons[0]['solution'])
    practice.get_by_role('button', name='Run checks', exact=True).click()
    expect(practice.locator('.inline-status')).to_contain_text('Practice checks passed', timeout=30_000)
    expect(practice.locator('.inline-output')).to_have_text(lessons[0]['expected'])
    assert page.url.endswith('#course/first-program')
    expect(page.locator('.progress-copy')).to_contain_text(f'0 / {len(lessons)} read · 1 / {len(lessons)} practice')
    # Progress updates must retain editor nodes, their drafts, and execution feedback.
    page.evaluate('window.practiceEditor = document.querySelector(".inline-runner[data-mode=exercise] textarea")')
    page.get_by_role('button', name='Mark reading complete', exact=True).click()
    assert page.evaluate('window.practiceEditor === document.querySelector(".inline-runner[data-mode=exercise] textarea")')
    expect(practice.locator('.inline-output')).to_have_text(lessons[0]['expected'])
    expect(page.locator('.chapter-progress-copy')).to_contain_text(f'1 / {first_size} read · 1 / {first_size} practiced')
    # Leaving a running lesson stops its worker; the new lesson can run immediately.
    worked.locator('textarea').fill('fn main() { loop { std::hint::spin_loop(); } }')
    worked.get_by_role('button', name='Run example', exact=True).click()
    expect(worked.locator('.inline-status')).to_have_text('Running locally…', timeout=30_000)
    # Chapter navigation uses local lesson numbers and explains chapter transitions.
    page.get_by_label('Lesson in this chapter', exact=True).select_option('compiler-messages')
    expect(page.locator('.chapter-position')).to_have_text(f'Chapter 1 of {len(chapters)} · Lesson {first_size} of {first_size}')
    next_program = page.locator('.inline-runner[data-mode="worked"]')
    next_program.get_by_role('button', name='Run example', exact=True).click()
    expect(next_program.locator('.inline-output')).to_have_text('Fixed\n', timeout=30_000)
    expect(next_program.get_by_role('button', name='Run example', exact=True)).to_be_enabled()
    page.locator('.adjacent-next').click()
    expect(page.locator('.chapter-position')).to_have_text(f'Chapter 2 of {len(chapters)} · Lesson 1 of {sum(item["chapter"] == "flow" for item in lessons)}')
    page.locator('.adjacent-previous').click()
    expect(page.locator('.chapter-position')).to_have_text(f'Chapter 1 of {len(chapters)} · Lesson {first_size} of {first_size}')
    route(page, '#course')
    expect(page.locator('.resume-card')).to_contain_text('Continue: Read a compiler message')
    route(page, '#course/first-program')
    expect(page.locator('.inline-runner[data-mode="exercise"] textarea')).to_have_value(lessons[0]['solution'])
    # The full source really compiles; installing edits must change workspace behavior.
    route(page, '#workspace')
    page.locator('.workspace-tools > summary').click()
    page.locator('#db-edit-source').click()
    expect(page.locator('#lesson-title')).to_have_text('TinyDB source')
    source = page.locator('#source').input_value()
    page.locator('#source').fill(source.replace('fn main() {', 'fn main() {\n    println!("learner edited TinyDB");', 1))
    page.locator('#run').click()
    expect(page.locator('#status-text')).to_contain_text('Finished', timeout=120_000)
    expect(page.locator('#install-tinydb')).to_be_enabled()
    page.locator('#install-tinydb').click()
    expect(page.locator('#db-program')).to_contain_text('Your compiled Rust program')
    assert run(page, 'SELECT COUNT(*) FROM people;', 'qa.rdb').startswith('learner edited TinyDB\n')
    page.locator('#db-bundled').click()
    assert not run(page, 'SELECT COUNT(*) FROM people;').startswith('learner edited TinyDB')
    assert len(compiler_requests) == request_count, 'The full editor did not reuse the lesson compiler.'
    assert not errors, errors
    print(json.dumps({'lessons': len(lessons), 'inline_practice': True, 'chapter_position': True, 'reading_and_practice_separate': True, 'tinydb_without_compiler': True, 'persistent_files': True, 'recovery': True, 'cross_tab_CAS': True, 'quota_fallback': True, 'edited_rust_executes': True, 'page_errors': errors}), flush=True)
    browser.close()
