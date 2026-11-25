import {initializeReadingState} from './reading-state.js';
import {readResult,writeResult} from './result-state.js';
import {assetURL} from './asset-url.js';
import './style.css';
import './themes.css';
import './course-style.css';
import './managed-runner.js';
import { examples, matchesOutput } from './examples.js';
import { startRun } from './runner.js';
import { insertCode } from './editing.js';
import { course, courseEdition } from './course-data.js';
import { initCourse, markPractice } from './course.js';
import { initDatabase } from './database.js';
import { loadCompiler } from './compiler.js';
const $ = (id) => document.getElementById(id);
const storageKey = 'rust-foundry-mvp-v1';
let saved = { sources: {}, inputs: {}, completed: [], recovery: {}, selected: 'hello' };
try { saved = { ...saved, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; } catch { /* Recover from blocked or corrupt storage. */ }
if (!saved.sources || typeof saved.sources !== 'object') saved.sources = {};
if (!saved.inputs || typeof saved.inputs !== 'object') saved.inputs = {};
if (!Array.isArray(saved.completed)) saved.completed = [];
if (!saved.recovery || typeof saved.recovery !== 'object') saved.recovery = {};
let baseline=structuredClone(saved);
let current = examples.find(x => x.id === saved.selected) || examples[0];
let cancelLoading, task, artifact, phase;
let busy = false;
let output = '', errors = '', diagnostics = '', lastRun;
const updateEditorTools = () => {
  $('undo-reset').hidden = !saved.recovery[current.id];
  $('undo-reset').disabled = busy;
  $('reset').disabled = busy || ($('source').value === current.source && $('stdin').value === current.stdin);
};
const save = () => {
  const hint = $('draft-save-status');
  try {
    // Merge only this tab's changed keys; another window may have edited a different lesson.
    const latest=JSON.parse(localStorage.getItem(storageKey)||'{}');
    for(const group of ['sources','inputs','recovery']){
      latest[group]||={};for(const key of new Set([...Object.keys(saved[group]),...Object.keys(baseline[group])])){
        if(JSON.stringify(saved[group][key])!==JSON.stringify(baseline[group][key])){
          if(key in saved[group])latest[group][key]=saved[group][key];else delete latest[group][key];
        }
      }
    }
    latest.completed=[...new Set([...(latest.completed||[]),...saved.completed])];latest.selected=saved.selected;
    localStorage.setItem(storageKey, JSON.stringify(latest));saved=latest;baseline=structuredClone(saved);
    hint.hidden = true; $('saved-dot').classList.remove('unsaved');
  } catch {
    hint.hidden = false; hint.textContent = 'Saved for this tab only. Use Download Rust source in Editor tools and copy any program input before reloading or closing the tab.';
    $('saved-dot').classList.add('unsaved');
  }
  updateEditorTools();
};
const status = (text, kind = '') => { $('run-summary').hidden = !text; $('status-text').textContent = text; $('status-light').className = 'status-light ' + kind; };
const setBusy = (value) => {
  busy = value;
  $('run').disabled = busy || !supported;
  $('stop').hidden = !busy;
  $('source').readOnly = busy;
  $('stdin').readOnly = busy;
  updateEditorTools();
  $('install-tinydb').disabled = busy || !artifact;
  document.querySelectorAll('#code-keys button').forEach(button => { button.disabled = busy; });
  document.querySelectorAll('.lesson-button').forEach(button => { button.disabled = busy; });
  if (!busy) $('runtime-state').textContent = '';
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
    button.addEventListener('click', () => { if (!busy) { current = lesson; saved.selected = lesson.id; save(); renderLesson(); location.hash = '#practice'; } });
    return button;
  }));
  const completed = examples.filter(x => saved.completed.includes(x.id)).length;
  $('progress-count').textContent = `${completed} / ${examples.length}`;
  $('course-progress').style.width = `${completed / examples.length * 100}%`;
};
const clearResults = () => {
  output = ''; errors = ''; diagnostics = ''; artifact = undefined; lastRun = undefined;
  $('editor-result-context').hidden = true;
  $('stdout').textContent = ''; $('stdout').hidden = true;
  $('stderr').textContent = ''; $('stderr').hidden = true;
  $('empty-output').hidden = false;
  $('empty-output').querySelector('strong').textContent = 'Choose Run code to see the output.';
  $('empty-output').querySelector('p').textContent = '';
  $('diagnostics').textContent = 'Compiler messages will appear here.';
  $('diagnostic-indicator').hidden = true;
  $('check-result').hidden = true;
  $('export-wasm').disabled = true;
  selectTab('output');
};
const renderLesson = () => {
  $('lesson-title').textContent = current.title;
  $('description').textContent = current.description;
  $('note').textContent = current.note;
  $('goal-text').textContent = current.goal;
  $('source').value = typeof saved.sources[current.id] === 'string' ? saved.sources[current.id] : current.source;
  $('stdin').value = typeof saved.inputs[current.id] === 'string' ? saved.inputs[current.id] : current.stdin;
  $('practice-context').hidden = !current.courseId;
  $('practice-context').replaceChildren();
  if (current.courseId) {
    const link = document.createElement('a'); link.href = '#course/' + current.courseId; link.textContent = '← Return to the lesson';
    $('practice-context').append(link, document.createTextNode(' · This editor has a separate draft from the lesson editor.'));
  }
  $('install-tinydb').hidden = !current.tinydb;
  $('install-tinydb').disabled = true;
  clearResults(); restoreEditorResult(readResult('editor:'+current.id)); refreshLines(); renderNav(); updateEditorTools();
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
    $('compatibility').textContent = 'Preparing the secure browser runtime. This page may reload once; the compiler download starts when you choose Run code.';
    setTimeout(() => { if (!window.crossOriginIsolated) explain(); }, 12_000);
  } else explain();
}
const ensureToolchain = () => {

  $('compiler-download-progress').hidden = false;
  $('compiler-download-progress').value = 0;
  $('runtime-state').textContent = 'Preparing first run…';
  status('Preparing first run…', 'busy');
  const controller = new AbortController();
  cancelLoading = () => controller.abort();
  return loadCompiler({ signal: controller.signal, onProgress: data => {
    $('compiler-download-progress').value = Math.min(1, data.loaded / data.total);
    const progress = `${(data.loaded / 1e6).toFixed(1)} / ${(data.total / 1e6).toFixed(1)} MB`;
    $('runtime-state').textContent = data.label?.startsWith('Preparing') ? data.label+'…' : data.loaded < data.total ? `Downloading · ${progress}` : 'Preparing first run…';
    status(data.label?.startsWith('Preparing') ? data.label+'…' : data.loaded < data.total ? `Downloading compiler · ${progress}` : 'Preparing compiler…', 'busy');
  } }).finally(() => {
    cancelLoading = undefined; $('compiler-download-progress').hidden = true;
  });
};
const event = (data) => {
  if (data.type === 'phase') {
    phase = data.phase;
    $('runtime-state').textContent = data.phase === 'compiling' ? 'Compiling…' : 'Running…';
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
  if (!supported || busy) return;
  if (learning.isBusy()) { status('Stop the lesson’s current run first.', ''); return; }
  if (database.isBusy()) { status('Stop the TinyDB workspace run first.', ''); return; }
  if (new TextEncoder().encode($('source').value).length > 64_000) { status('Source exceeds the 64 KB limit.', 'error'); return; }
  if (new TextEncoder().encode($('stdin').value).length > 100_000) { status('Input exceeds the 100 KB limit.', 'error'); return; }
  const source = $('source').value, stdin = $('stdin').value, lesson = current;
  setBusy(true);
  $('empty-output').querySelector('strong').textContent = 'Your compiler is at work.';
  $('empty-output').querySelector('p').textContent = 'Compilation happens in browser workers. You can stop it at any time.';
  let result;
  try {
    const toolchain=await ensureToolchain();
    clearResults();lastRun={source,stdin};
    task = startRun({ toolchain, source, stdin, args: lesson.tinydb ? ['people.rdb'] : [], files: lesson.tinydb ? [] : undefined, onEvent: event });
    result = await task.finished;
  } catch (error) {
    $('empty-output').querySelector('strong').textContent = error.name === 'AbortError' ? 'Run stopped.' : 'This run could not start.';
    $('empty-output').querySelector('p').textContent = error.message || 'Choose Run code to try again.';
    status(error.message || 'Could not prepare this run. Choose Run code to retry.', error.name === 'AbortError' ? '' : 'error');
    return;
  } finally {
    const focusWasOnStop = document.activeElement === $('stop');
    task = undefined; setBusy(false);
    if (focusWasOnStop) $('run').focus();
    rememberEditorResult();
  }
  if (result.stage === 'compile') {
    selectTab('diagnostics'); status(result.message || 'Rust found an error. See the compiler message.', 'error');
  } else if (result.stage === 'cancelled' || result.stage === 'timeout') {
    status(result.message, '');
    if (lesson.id === 'loop' && phase === 'running') { saved.completed = [...new Set([...saved.completed, lesson.id])]; save(); renderNav(); }
  } else if (!result.ok) {
    status(Number.isInteger(result.exitCode) ? `Program exited with status ${result.exitCode}.` : result.message || 'The program stopped before finishing.', Number.isInteger(result.exitCode) ? '' : 'error');
  } else {
    if (lesson.tinydb && artifact) $('install-tinydb').disabled = false;
    status('Run finished.', 'success');
    if (!output) $('stdout').textContent = '(Program finished without output.)';
    if (lesson.expected !== null) {
      const customInput = stdin !== lesson.stdin;
      const passed = !customInput && matchesOutput(result.stdout, lesson.expected);
      $('check-result').hidden = false;
      $('check-result').className = passed ? 'passed' : 'check-neutral';
      $('check-result').textContent = passed ? 'Output matches the target.' : customInput ? 'The example check uses the supplied input.' : 'This output differs from the target above.';
      if (passed) { saved.completed = [...new Set([...saved.completed, lesson.id])]; save(); renderNav(); }
      if (passed && lesson.courseId && lesson.practiceMode === 'exercise') markPractice(lesson.courseId);
    }
  }
  rememberEditorResult();
});
$('stop').addEventListener('click', () => {
  if (cancelLoading) cancelLoading();
  else task?.cancel();
});
function draftChanged() {
  $('check-result').hidden = true;
  $('editor-result-context').hidden = !lastRun || (lastRun.source === $('source').value && lastRun.stdin === $('stdin').value);
  $('editor-result-context').textContent = 'Output from the earlier source or input. Choose Run code to update it.';
  artifact = undefined; $('export-wasm').disabled = true; $('install-tinydb').disabled = true;
  status('');
}
$('source').addEventListener('input', () => { saved.sources[current.id] = $('source').value; save(); refreshLines(); draftChanged(); });
$('source').addEventListener('scroll', () => { $('line-numbers').scrollTop = $('source').scrollTop; });
for (const type of ['click', 'keyup', 'select']) $('source').addEventListener(type, refreshLines);
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
$('stdin').addEventListener('input', () => { saved.inputs[current.id] = $('stdin').value; save(); draftChanged(); });
function showDraft() {
  $('source').value = saved.sources[current.id] ?? current.source;
  $('stdin').value = saved.inputs[current.id] ?? current.stdin;
  // Source, input and recovery keys share one atomic localStorage write.
  save(); refreshLines(); draftChanged(); $('source').focus();
}
$('reset').addEventListener('click', () => {
  saved.recovery[current.id] = { source: $('source').value, stdin: $('stdin').value };
  delete saved.sources[current.id]; delete saved.inputs[current.id]; showDraft();
  status('Starter restored. Undo restore recovers your previous source and input.');
});
$('undo-reset').addEventListener('click', () => {
  const previous = saved.recovery[current.id];
  if (!previous) return;
  saved.sources[current.id] = previous.source; saved.inputs[current.id] = previous.stdin;
  delete saved.recovery[current.id]; showDraft(); status('Previous source and input restored.');
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
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    if (!$('database-view').hidden) { event.preventDefault(); if (!$('db-run').disabled) $('db-run').click(); }
    else if (!$('practice-view').hidden) { event.preventDefault(); if (!$('run').disabled) $('run').click(); }
  }
});
if (!navigator.platform?.includes('Mac')) document.querySelector('kbd').textContent = 'Ctrl ↵';
const openPractice = (lesson, mode) => {
  if (busy) { location.hash = '#practice'; status('Stop the current run before opening another program.'); return; }
  current = { id: `course:v${courseEdition}:${lesson.id}:${mode}`, courseId: lesson.id, practiceMode: mode,
    title: lesson.title, concept: mode === 'exercise' ? 'PRACTICE · IMPLEMENT THE FUNCTION' : 'WORKED RUST PROGRAM',
    description: mode === 'exercise' ? lesson.practiceInstruction : 'Run the complete program, then change it and inspect the result.',
    source: mode === 'exercise' ? lesson.starter : lesson.solution, stdin: '', expected: lesson.expected,
    goal: lesson.checkType === 'assertions' ? 'Keep the supplied assertions and match the documented output.' : 'Match the documented output for this exercise.', note: lesson.pitfall };
  renderLesson(); setBusy(false);
  const target = `#practice/${lesson.id}/${mode}`;
  if (location.hash !== target) location.hash = target;
};
const openDatabaseSource = (source, project = 'reference') => {
  if (busy) return;
  current = { id: 'tinydb-source:' + project, tinydb: true, title: project === 'reference' ? 'TinyDB source' : 'TinyDB project · ' + project, concept: 'THE FULL DATABASE · EDIT, COMPILE, INSTALL',
    description: 'Edit the real Rust reference. Run code compiles your changes and tests the script against temporary files. Then install the compiled program into the persistent workspace.',
    source, stdin: '.help\n', expected: null, goal: 'Compile your changes, then choose Use compiled TinyDB in workspace.',
    note: 'Editor runs use temporary files. Installing a compiled program changes what runs in the workspace; existing saved files are only changed when you run it there.' };
  renderLesson(); setBusy(false); location.hash = '#practice/tinydb-source/' + project;
};
const database = initDatabase({ canRun: () => !busy && !learning.isBusy(), openSource: openDatabaseSource });
$('install-tinydb').onclick = () => { if (artifact && !busy && !database.install(artifact)) status('Stop the TinyDB workspace run before installing another program.'); };
const learning = initCourse({ openLab: database.openLab, canRun: () => !busy && !database.isBusy(), unsupported: supported ? '' : `The browser compiler needs ${features.join(', ')}. Update your browser or export your code to keep working.` });
function route() {
  const [name, id, mode] = location.hash.slice(1).split('/');
  const view = ['course', 'workspace', 'practice'].includes(name) ? name : name === 'about' ? 'practice' : 'course';
  $('course-view').hidden = view !== 'course'; $('database-view').hidden = view !== 'workspace'; $('practice-view').hidden = view !== 'practice';
  document.querySelectorAll('[data-view]').forEach(link => { if (link.dataset.view === view) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
  if (view === 'course') learning.render(['lab','part'].includes(name)?undefined:id,name==='lab'?id:undefined,name==='part'?id:undefined);
  else learning.suspend();
  if (view === 'workspace') { document.title = 'TinyDB workspace — Rust Foundry'; database.initialize(); }
  if (view === 'practice') document.title = 'Rust editor — Rust Foundry';
  if (view === 'practice' && id && id !== 'tinydb-source') {
    const lesson = course.find(x => x.id === id);
    if (lesson && ['worked', 'exercise', 'reference'].includes(mode) && current.id !== `course:v${courseEdition}:${id}:${mode}`) openPractice(lesson, mode);
  }
  if (view === 'practice' && id === 'tinydb-source' && current.id !== 'tinydb-source:' + mode && !busy) {
    const project = /^(0[1-8]-[a-z-]+|reference)$/.test(mode || '') ? mode : 'reference';
    const url = project === 'reference' ? './programs/tinydb.rs' : `./course/${project}.rs`;
    fetch(assetURL(url)).then(response => {
      if (!response.ok) throw new Error('Could not load the TinyDB source.');
      return response.text();
    }).then(source => {
      if (location.hash.startsWith('#practice/tinydb-source') && !busy) openDatabaseSource(source, project);
    }).catch(error => status(error.message, 'error'));
  }
  if (name !== 'about') {window.scrollTo(0,0);if(view==='course'){const heading=$('course-view').querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}}
  else requestAnimationFrame(() => $('about').scrollIntoView());
}
window.addEventListener('hashchange', route);
renderLesson(); setBusy(false); route();

function editorResult(){return{output,errors,diagnostics,lastRun,artifact,status:$('status-text').textContent,kind:$('status-light').className,check:{text:$('check-result').textContent,hidden:$('check-result').hidden,className:$('check-result').className},tab:$('tab-diagnostics').getAttribute('aria-selected')==='true'?'diagnostics':'output'};}
function rememberEditorResult(){const value=editorResult();delete value.artifact;writeResult('editor:'+current.id,value);}
function restoreEditorResult(value){if(!value)return;({output='',errors='',diagnostics='',lastRun,artifact}=value);$('stdout').textContent=output;$('stdout').hidden=!output;$('stderr').textContent=errors;$('stderr').hidden=!errors;$('empty-output').hidden=!!lastRun;$('diagnostics').textContent=diagnostics||'Compiler messages will appear here.';$('export-wasm').disabled=!artifact;$('install-tinydb').disabled=!artifact;status(value.status||'');$('status-light').className=value.kind||'status-light';if(value.check){$('check-result').textContent=value.check.text;$('check-result').hidden=value.check.hidden;$('check-result').className=value.check.className;}selectTab(value.tab||'output');$('editor-result-context').hidden=!lastRun||(lastRun.source===$('source').value&&lastRun.stdin===$('stdin').value);$('editor-result-context').textContent='Output from the earlier source or input. Choose Run code to update it.';}
const appState={
 isBusy:()=>busy||learning.isBusy()||database.isBusy()||window.rustFoundryRunner.status().loading||window.rustFoundryRunner.status().active>0,
 stopAll(){cancelLoading?.();task?.cancel();learning.suspend();database.stop();},
 releaseCaches(){database.releaseCaches();},
 flush(){save();rememberEditorResult();},
 snapshot:()=>({current,source:$('source').value,stdin:$('stdin').value,editor:editorResult(),saved,baseline,learning:learning.snapshot(),database:database.snapshot()}),
 async restore(value){if(!value)return;
  // Restore only undurable changes over the newest persistent record.
  const previous=value.baseline||{},candidate=value.saved||{};
  for(const group of ['sources','inputs','recovery'])for(const key of new Set([...Object.keys(candidate[group]||{}),...Object.keys(previous[group]||{})]))if(JSON.stringify(candidate[group]?.[key])!==JSON.stringify(previous[group]?.[key])){if(key in candidate[group])saved[group][key]=candidate[group][key];else delete saved[group][key];}
  current=value.current||current;renderLesson();$('source').value=value.source;$('stdin').value=value.stdin;restoreEditorResult(value.editor);refreshLines();learning.restore(value.learning);await database.restore(value.database);
 }
};window.rustFoundryApp=appState;initializeReadingState(appState);
