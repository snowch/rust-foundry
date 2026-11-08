import './style.css';
import { examples, matchesOutput } from './examples.js';
import { startRun } from './runner.js';
import { insertCode } from './editing.js';
const $ = (id) => document.getElementById(id);
const storageKey = 'rust-foundry-mvp-v1';
let saved = { sources: {}, inputs: {}, completed: [], selected: 'hello' };
try { saved = { ...saved, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; } catch { /* Recover from blocked or corrupt storage. */ }
if (!saved.sources || typeof saved.sources !== 'object') saved.sources = {};
if (!saved.inputs || typeof saved.inputs !== 'object') saved.inputs = {};
if (!Array.isArray(saved.completed)) saved.completed = [];
let current = examples.find(x => x.id === saved.selected) || examples[0];
let toolchain, loader, loadingTimer, task, artifact, phase;
let output = '', errors = '', diagnostics = '';
const save = () => {
  try { localStorage.setItem(storageKey, JSON.stringify(saved)); $('saved-dot').classList.remove('unsaved'); }
  catch { $('saved-dot').classList.add('unsaved'); $('saved-dot').title = 'Browser storage unavailable; export your code to keep it.'; }
};
const status = (text, kind = '') => { $('status-text').textContent = text; $('status-light').className = 'status-light ' + kind; };
const setBusy = (busy) => {
  $('run').disabled = busy || !toolchain;
  $('stop').disabled = !busy;
  $('load').disabled = busy || !!toolchain || !supported;
  $('source').readOnly = busy;
  $('stdin').readOnly = busy;
  $('reset').disabled = busy;
  document.querySelectorAll('#code-keys button').forEach(button => { button.disabled = busy; });
  document.querySelectorAll('.lesson-button').forEach(button => { button.disabled = busy; });
};
const selectTab = (name) => {
  for (const tab of ['output', 'diagnostics']) {
    $(tab + '-panel').hidden = tab !== name;
    $('tab-' + tab).setAttribute('aria-selected', String(tab === name));
  }
};
const refreshLines = () => {
  const editor = $('source');
  $('line-numbers').textContent = Array.from({ length: editor.value.split('\n').length }, (_, i) => i + 1).join('\n');
  const before = editor.value.slice(0, editor.selectionStart);
  $('cursor-position').textContent = `Ln ${before.split('\n').length}, Col ${before.length - before.lastIndexOf('\n')}`;
};
const renderNav = () => {
  $('lessons').replaceChildren(...examples.map((lesson, index) => {
    const button = document.createElement('button');
    button.className = 'lesson-button' + (lesson.id === current.id ? ' active' : '');
    button.setAttribute('aria-current', lesson.id === current.id ? 'step' : 'false');
    const number = document.createElement('span'); number.className = 'lesson-number'; number.textContent = saved.completed.includes(lesson.id) ? '✓' : String(index + 1).padStart(2, '0');
    const copy = document.createElement('span');
    const title = document.createElement('strong'); title.textContent = lesson.title;
    const detail = document.createElement('small'); detail.textContent = lesson.tag;
    copy.append(title, detail); button.append(number, copy);
    button.addEventListener('click', () => { if (!task && !loader) { current = lesson; saved.selected = lesson.id; save(); renderLesson(); } });
    return button;
  }));
  const completed = examples.filter(x => saved.completed.includes(x.id)).length;
  $('progress-count').textContent = `${completed} / ${examples.length}`;
  $('course-progress').style.width = `${completed / examples.length * 100}%`;
};
const clearResults = () => {
  output = ''; errors = ''; diagnostics = ''; artifact = undefined;
  $('stdout').textContent = ''; $('stdout').hidden = true;
  $('stderr').textContent = ''; $('stderr').hidden = true;
  $('empty-output').hidden = false;
  $('empty-output').querySelector('strong').textContent = 'Your program starts here.';
  $('empty-output').querySelector('p').textContent = toolchain ? 'Run your code. Its output will appear in this panel.' : 'Load the compiler, then run your code. Output will appear in this panel.';
  $('diagnostics').textContent = 'Compiler messages will appear here.';
  $('diagnostic-indicator').hidden = true;
  $('check-result').hidden = true;
  $('export-wasm').disabled = true;
  selectTab('output');
};
const renderLesson = () => {
  const index = examples.indexOf(current);
  $('lesson-index').textContent = String(index + 1).padStart(2, '0');
  $('lesson-title').textContent = current.title;
  $('breadcrumb').textContent = current.title;
  $('concept').textContent = current.concept;
  $('description').textContent = current.description;
  $('note').textContent = current.note;
  $('goal-text').textContent = current.goal;
  $('source').value = typeof saved.sources[current.id] === 'string' ? saved.sources[current.id] : current.source;
  $('stdin').value = typeof saved.inputs[current.id] === 'string' ? saved.inputs[current.id] : current.stdin;
  clearResults(); refreshLines(); renderNav(); status('Ready when you are');
};
const features = [];
if (!globalThis.crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') features.push('cross-origin isolation (COOP/COEP headers)');
if (typeof globalThis.Atomics?.waitAsync !== 'function') features.push('Atomics.waitAsync');
if (typeof Promise.withResolvers !== 'function') features.push('Promise.withResolvers (update your browser)');
if (typeof DecompressionStream === 'undefined') features.push('gzip decompression');
if (!globalThis.crypto?.subtle) features.push('a secure context');
if (typeof WebAssembly === 'undefined' || typeof Worker === 'undefined') features.push('WebAssembly and Web Workers');
const supported = features.length === 0;
if (!supported) {
  $('compatibility').hidden = false;
  const explain = () => {
    $('compatibility').textContent = `The browser compiler needs ${features.join(', ')}. Open this site directly in an up-to-date Safari on iPhone/iPad or Chrome on Android, then reload once if needed. The site must be allowed to use its service worker. Your code can still be edited and exported.`;
  };
  if (window.rustFoundryIsolationPending) {
    $('compatibility').textContent = 'Preparing the secure browser runtime. This page may reload once; the compiler download will start only when you choose Load compiler.';
    setTimeout(() => { if (!window.crossOriginIsolated) explain(); }, 12_000);
  } else explain();
}
const finishLoading = () => { loader?.terminate(); loader = undefined; clearTimeout(loadingTimer); $('download-track').hidden = true; setBusy(false); };
$('load').addEventListener('click', () => {
  if (loader || toolchain || !supported) return;
  setBusy(true);
  $('load').textContent = 'Loading…';
  $('download-track').hidden = false;
  $('download-progress').style.width = '0%';
  status('Loading the local compiler…', 'busy');
  loader = new Worker(new URL('./loader.worker.js', import.meta.url), { type: 'module' });
  const fail = (message) => {
    finishLoading(); $('load').textContent = 'Try again'; $('load-title').textContent = 'The compiler could not start.';
    $('load-detail').textContent = message; status('Compiler loading failed', 'error');
  };
  loadingTimer = setTimeout(() => fail('Loading exceeded five minutes. Check your connection and try again.'), 300_000);
  loader.onerror = (event) => { event.preventDefault(); fail(event.message || 'Worker loading failed.'); };
  loader.onmessage = ({ data }) => {
    if (data.type === 'progress') {
      $('download-progress').style.width = `${Math.min(99, data.loaded / data.total * 100)}%`;
      $('load-title').textContent = data.label;
      $('load-detail').textContent = `${(data.loaded / 1e6).toFixed(1)} / ${(data.total / 1e6).toFixed(1)} MB prepared${data.cacheHit ? ' · using browser cache' : ''}`;
    } else if (data.type === 'ready') {
      toolchain = { module: data.module, files: data.files };
      finishLoading(); $('load').textContent = '✓ Loaded';
      $('load-title').textContent = 'The compiler is ready. Make something.';
      $('load-detail').textContent = 'Compiling and running happens locally. Files are cached when browser storage permits.';
      $('runtime-state').textContent = 'Local compiler ready'; $('runtime-dot').classList.add('ready');
      status('Compiler ready', 'success');
    } else if (data.type === 'failure') fail(data.message);
  };
  loader.postMessage({ manifestUrl: new URL('./toolchain/manifest.json', document.baseURI).href });
});
const event = (data) => {
  if (data.type === 'phase') {
    phase = data.phase;
    status(data.phase === 'compiling' ? 'Compiling locally…' : 'Running your WebAssembly…', 'busy');
    if (data.phase === 'running') {
      $('empty-output').hidden = true; $('stdout').hidden = false;
      if (!diagnostics.split('\n').filter(line => !line.startsWith('Linking using ')).join('\n').trim()) $('diagnostics').textContent = 'Compilation successful. No warnings.';
    }
  } else if (data.type === 'stdout') { output += data.text; $('stdout').hidden = false; $('stdout').textContent = output; }
  else if (data.type === 'stderr') { errors += data.text; $('stderr').hidden = false; $('stderr').textContent = errors; }
  else if (data.type === 'diagnostic') {
    diagnostics += data.text;
    const readable = diagnostics.split('\n').filter(line => !line.startsWith('Linking using ')).join('\n');
    $('diagnostics').textContent = readable || 'Linking your program…';
    $('diagnostic-indicator').hidden = !/error|warning/.test(readable);
  } else if (data.type === 'artifact') { artifact = data.bytes; $('export-wasm').disabled = false; }
};
$('run').addEventListener('click', async () => {
  if (!toolchain || task || loader) return;
  if (new TextEncoder().encode($('source').value).length > 64_000) { status('Source exceeds the MVP’s 64 KB limit.', 'error'); return; }
  if (new TextEncoder().encode($('stdin').value).length > 100_000) { status('Input exceeds the 100 KB limit.', 'error'); return; }
  const source = $('source').value, stdin = $('stdin').value, lesson = current;
  clearResults(); setBusy(true);
  $('empty-output').querySelector('strong').textContent = 'Your compiler is at work.';
  $('empty-output').querySelector('p').textContent = 'Compilation happens in browser workers. You can stop it at any time.';
  task = startRun({ toolchain, source, stdin, onEvent: event });
  const result = await task.finished;
  task = undefined; setBusy(false);
  const seconds = (result.compileMs / 1000).toFixed(1);
  if (result.stage === 'compile') {
    selectTab('diagnostics'); status(result.message || 'Rust found an error. See the compiler message.', 'error');
  } else if (result.stage === 'cancelled' || result.stage === 'timeout') {
    status(result.message, '');
    if (lesson.id === 'loop' && phase === 'running') { saved.completed = [...new Set([...saved.completed, lesson.id])]; save(); renderNav(); }
  } else if (!result.ok) {
    status(result.message || `Program exited with code ${result.exitCode}.`, 'error');
    if (result.stage === 'compile') selectTab('diagnostics');
  } else {
    status(`Finished · compiled ${seconds}s · ran ${result.runMs.toFixed(0)}ms`, 'success');
    if (!output) $('stdout').textContent = '(Program finished without output.)';
    if (lesson.expected !== null) {
      const customInput = stdin !== lesson.stdin;
      const passed = !customInput && matchesOutput(result.stdout, lesson.expected);
      $('check-result').hidden = false;
      $('check-result').className = passed ? 'passed' : 'check-neutral';
      $('check-result').textContent = passed ? '✓ Output matches. Nicely done.' : customInput ? 'Custom input · example check skipped.' : 'Output differs from the example. Keep experimenting.';
      if (passed) { saved.completed = [...new Set([...saved.completed, lesson.id])]; save(); renderNav(); }
    }
  }
});
$('stop').addEventListener('click', () => {
  if (loader) {
    finishLoading(); $('load').textContent = 'Load compiler'; $('load-title').textContent = 'Compiler loading stopped.';
    $('load-detail').textContent = 'Completed file downloads will be reused when you try again.'; status('Loading stopped');
  } else task?.cancel();
});
$('source').addEventListener('input', () => { saved.sources[current.id] = $('source').value; save(); refreshLines(); });
$('source').addEventListener('scroll', () => { $('line-numbers').scrollTop = $('source').scrollTop; });
for (const type of ['click', 'keyup', 'select']) $('source').addEventListener(type, refreshLines);
$('source').addEventListener('keydown', (event) => {
  if (event.key === 'Tab' && !$('source').readOnly) {
    event.preventDefault(); const editor = $('source'); editor.setRangeText('    ', editor.selectionStart, editor.selectionEnd, 'end');
    editor.dispatchEvent(new Event('input'));
  }
});
document.querySelectorAll('#code-keys [data-key]').forEach(button => {
  button.addEventListener('pointerdown', event => event.preventDefault());
  button.addEventListener('click', () => {
    const editor = $('source');
    if (editor.readOnly) return;
    const edit = insertCode(editor.value, editor.selectionStart, editor.selectionEnd, button.dataset.key);
    editor.setRangeText(edit.text, editor.selectionStart, editor.selectionEnd, 'end');
    editor.setSelectionRange(edit.cursor, edit.cursor);
    editor.focus({ preventScroll: true });
    editor.dispatchEvent(new Event('input'));
  });
});
$('hide-keyboard').addEventListener('click', () => { $('source').blur(); $('stdin').blur(); });
$('stdin').addEventListener('input', () => { saved.inputs[current.id] = $('stdin').value; save(); });
$('reset').addEventListener('click', () => {
  delete saved.sources[current.id]; delete saved.inputs[current.id]; save(); renderLesson(); $('source').focus();
});
const download = (data, name, type) => {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.hidden = true;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('export-source').addEventListener('click', () => download($('source').value, 'main.rs', 'text/plain'));
$('export-wasm').addEventListener('click', () => { if (artifact) download(artifact, 'main.wasm', 'application/wasm'); });
$('tab-output').addEventListener('click', () => selectTab('output'));
$('tab-diagnostics').addEventListener('click', () => selectTab('diagnostics'));
document.querySelector('.result-tabs').addEventListener('keydown', (event) => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const name = event.key === 'Home' ? 'output' : event.key === 'End' ? 'diagnostics' : $('tab-output').getAttribute('aria-selected') === 'true' ? 'diagnostics' : 'output';
  selectTab(name); $('tab-' + name).focus();
});
document.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); if (!$('run').disabled) $('run').click(); } });
if (!navigator.platform?.includes('Mac')) document.querySelector('kbd').textContent = 'Ctrl ↵';
renderLesson(); setBusy(false);
