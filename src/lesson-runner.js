import { loadCompiler } from './compiler.js';
import { startRun } from './runner.js';
import { matchesOutput } from './examples.js';
import { insertCode } from './editing.js';
import { element as el, button, download } from './dom.js';

export function createLessonRunner({ lesson, mode, canRun, unsupported, onPass }) {
  const initial = mode === 'exercise' ? lesson.starter : mode === 'worked' ? lesson.source : lesson.solution;
  const key = `rust-foundry-lesson-draft-v1:${lesson.id}:${mode}`;
  let running = false, disposed = false, task, controller, artifact, hasRun = false;
  const root = el('section', undefined, 'inline-runner'); root.dataset.mode = mode;
  root.setAttribute('aria-label', mode === 'exercise' ? 'Your practice code' : mode === 'reference' ? 'Reference program' : 'Worked program');
  const bar = el('div', undefined, 'inline-code-heading');
  const label = el('label', mode === 'exercise' ? 'Your practice · main.rs' : mode === 'reference' ? 'Reference · main.rs' : 'Worked example · main.rs');
  const editor = el('textarea'); editor.id = `lesson-code-${lesson.id}-${mode}`; label.htmlFor = editor.id;
  Object.assign(editor, { spellcheck: false, autocapitalize: 'off', autocomplete: 'off', value: initial });
  editor.setAttribute('autocorrect', 'off'); editor.setAttribute('wrap', 'off'); editor.setAttribute('aria-label', `${mode === 'exercise' ? 'Practice' : mode === 'reference' ? 'Reference' : 'Example'} Rust code`);
  try {
    const draft = localStorage.getItem(key);
    // Adopt existing course drafts without changing their old full-editor copies.
    const legacy = draft === null ? JSON.parse(localStorage.getItem('rust-foundry-mvp-v1') || '{}').sources?.[`course:${lesson.id}:${mode}`] : null;
    editor.value = typeof draft === 'string' ? draft : typeof legacy === 'string' ? legacy : initial;
  } catch { /* Editing and downloads still work without browser storage. */ }
  const saved = el('span', 'Edits save on this browser', 'inline-save');
  const save = () => {
    try { localStorage.setItem(key, editor.value); saved.textContent = 'Saved on this browser'; }
    catch { saved.textContent = 'Unsaved · download your code to keep it'; }
  };
  const reset = button('Reset code', () => {
    editor.value = initial; save(); result.textContent = ''; errors.textContent = ''; diagnostics.textContent = '';
    compilerMessages.open = false; compilerMessages.hidden = true; outputLabel.textContent = 'Your output'; hasRun = false;
    artifact = undefined; wasm.disabled = true; status.className = 'inline-status'; status.textContent = 'Code reset. Run it here when you are ready.';
  });
  bar.append(label, reset);
  const keys = el('div', undefined, 'code-keys'); keys.setAttribute('role', 'group'); keys.setAttribute('aria-label', `${mode} code editing keys`);
  for (const [keyName, text, accessible] of [['indent', '↹', 'Insert four spaces'], ['{}', '{ }', 'Insert braces'], ['()', '( )', 'Insert parentheses'], ['[]', '[ ]', 'Insert brackets'], [';', ';', 'Insert semicolon'], ['""', '" "', 'Insert quotes'], ['&', '&', 'Insert ampersand'], [':', ':', 'Insert colon'], ['newline', '↵', 'New line']]) {
    const control = button(text, () => {
      if (running) return;
      const edit = insertCode(editor.value, editor.selectionStart, editor.selectionEnd, keyName);
      editor.setRangeText(edit.text, editor.selectionStart, editor.selectionEnd, 'end'); editor.setSelectionRange(edit.cursor, edit.cursor);
      editor.focus({ preventScroll: true }); changed();
    }); control.setAttribute('aria-label', accessible); control.onpointerdown = event => event.preventDefault(); keys.append(control);
  }
  keys.append(button('↓', () => editor.blur())); keys.lastElementChild.setAttribute('aria-label', 'Hide keyboard');
  const progress = el('progress'); progress.max = 1; progress.value = 0; progress.hidden = true; progress.setAttribute('aria-label', 'Compiler download');
  const status = el('p', unsupported || (mode === 'exercise' ? 'Replace todo! and run the checks here.' : 'Edit or run this example here. Your place in the lesson stays the same.'), 'inline-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const outputLabel = el('h3', 'Your output');
  const result = el('pre', '', 'console inline-output'), errors = el('pre', '', 'console stderr');
  result.setAttribute('aria-label', `${mode} program output`); errors.setAttribute('aria-label', `${mode} runtime errors`);
  const compilerMessages = el('details', undefined, 'inline-diagnostics');
  const diagnostics = el('pre', '', 'console'); compilerMessages.append(el('summary', 'Compiler messages'), diagnostics); compilerMessages.hidden = true;
  const controls = el('div', undefined, 'inline-controls');
  const runButton = button(mode === 'exercise' ? 'Run checks' : mode === 'reference' ? 'Run reference' : 'Run example', run, 'button primary'); runButton.disabled = !!unsupported;
  const stop = button('Stop', () => { controller?.abort(); task?.cancel(); }, 'button stop'); stop.disabled = true;
  const setRunning = value => {
    running = value; runButton.disabled = value || !!unsupported; stop.disabled = !value; reset.disabled = value; editor.readOnly = value;
    keys.querySelectorAll('button').forEach(control => { control.disabled = value; });
  };
  controls.append(runButton, stop, saved);
  const more = el('details', undefined, 'inline-more');
  const wasm = button('Download compiled .wasm', () => { if (artifact) download(artifact, `${lesson.id}.wasm`, 'application/wasm'); }); wasm.disabled = true;
  more.append(el('summary', 'Download code'), button('Download this .rs', () => download(editor.value, `${lesson.id}-${mode}.rs`, 'text/plain')), wasm);
  root.append(bar, editor, keys, controls, progress, status, outputLabel, result, errors, compilerMessages, more);
  function changed() {
    save(); artifact = undefined; wasm.disabled = true;
    status.className = 'inline-status'; status.textContent = mode === 'exercise' ? 'Code changed. Run the checks to test this version.' : 'Code changed. Run the example to see this version’s output.';
    if (hasRun) outputLabel.textContent = 'Previous output · run again after editing';
  }
  editor.oninput = changed;
  editor.onkeydown = event => {
    if (event.key === 'Tab' && !running) { event.preventDefault(); editor.setRangeText('    ', editor.selectionStart, editor.selectionEnd, 'end'); changed(); }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); if (!runButton.disabled) run(); }
  };
  async function run() {
    if (disposed || running || unsupported) return;
    if (!canRun()) { status.textContent = 'Another program is running. Stop it or wait for it to finish, then try again.'; return; }
    const source = editor.value;
    if (new TextEncoder().encode(source).length > 64_000) { status.textContent = 'This program exceeds the 64 KB source limit.'; return; }
    save(); setRunning(true); hasRun = true; outputLabel.textContent = 'Your output'; result.textContent = ''; errors.textContent = ''; diagnostics.textContent = ''; compilerMessages.hidden = true; compilerMessages.open = false; artifact = undefined; wasm.disabled = true;
    status.className = 'inline-status'; status.textContent = 'Preparing your run…'; controller = new AbortController();
    let messages = '';
    try {
      const toolchain = await loadCompiler({ signal: controller.signal, onProgress: data => {
        progress.hidden = false; progress.value = Math.min(1, data.loaded / data.total);
        status.textContent = data.loaded < data.total ? `Downloading compiler · ${(data.loaded / 1e6).toFixed(1)} / ${(data.total / 1e6).toFixed(1)} MB` : 'Preparing compiler…';
      } });
      progress.hidden = true;
      if (disposed || controller.signal.aborted) return;
      task = startRun({ toolchain, source, stdin: '', onEvent: data => {
        if (disposed) return;
        if (data.type === 'phase') status.textContent = data.phase === 'compiling' ? 'Compiling your Rust…' : 'Running locally…';
        if (data.type === 'stdout') result.textContent += data.text;
        if (data.type === 'stderr') errors.textContent += data.text;
        if (data.type === 'artifact') { artifact = data.bytes; wasm.disabled = false; }
        if (data.type === 'diagnostic') {
          messages += data.text;
          diagnostics.textContent = messages.split('\n').filter(line => !line.startsWith('Linking using ')).join('\n').trim();
          compilerMessages.hidden = !diagnostics.textContent;
        }
      } });
      const outcome = await task.finished;
      if (disposed) return;
      if (outcome.ok) {
        const passed = matchesOutput(outcome.stdout, lesson.expected);
        status.className = 'inline-status ' + (passed ? 'passed' : 'check-neutral');
        status.textContent = mode === 'exercise' ? (passed ? '✓ Practice checks passed. Reading completion is separate.' : 'The program ran, but its output differs from the check. Compare it with the expected output.') : (passed ? '✓ Example finished. Your output matches the expected output.' : 'Finished. Your edited program produced a different result—compare it with the example.');
        if (mode === 'exercise' && passed && onPass() === false) status.textContent += ' Progress could not be saved; this mark lasts for this visit only.';
        if (!outcome.stdout) result.textContent = '(Finished without output.)';
      } else if (outcome.stage === 'compile') {
        status.textContent = 'Rust found a compile error. Read the compiler message below and try again.'; compilerMessages.hidden = false; compilerMessages.open = true;
      } else if (outcome.stage === 'cancelled' || outcome.stage === 'timeout') status.textContent = outcome.message;
      else {
        status.textContent = /todo!|not yet implemented/.test(source + errors.textContent) ? 'The starter still has todo! to implement. Use a hint below, then run the checks again.' : /assertion/.test(errors.textContent) ? 'An assertion did not pass. Read the message below, adjust your code, and try again.' : outcome.message || `The program exited with code ${outcome.exitCode}. Read the message below.`;
        status.className = 'inline-status check-neutral';
      }
    } catch (error) { if (!disposed) status.textContent = error.name === 'AbortError' ? 'Stopped. Your code is saved; you can run again.' : error.message; }
    finally { task = undefined; controller = undefined; progress.hidden = true; setRunning(false); }
  }
  return { root, isBusy: () => running, focus: () => editor.focus({ preventScroll: true }), dispose: () => { disposed = true; controller?.abort(); task?.cancel(); }, stop: () => { controller?.abort(); task?.cancel(); } };
}
