import { loadCompiler } from './compiler.js';
import { startRun } from './runner.js';
import { matchesOutput } from './examples.js';
import { insertCode } from './editing.js';
import { createDraft } from './drafts.js';
import { element as el, button, download } from './dom.js';

export function createLessonRunner({ lesson, mode, canRun, unsupported, onPass }) {
  const initial = mode === 'exercise' ? lesson.starter : mode === 'worked' ? lesson.source : lesson.solution;
  const key = `rust-foundry-lesson-draft-v${lesson.revision || 1}:${lesson.id}:${mode}`;
  let earlierDraft;
  let running = false, disposed = false, task, controller, artifact, lastOutput = null;
  const root = el('section', undefined, 'inline-runner'); root.dataset.mode = mode;
  root.setAttribute('aria-label', mode === 'exercise' ? 'Your practice code' : mode === 'reference' ? 'Reference program' : 'Worked program');
  const bar = el('div', undefined, 'inline-code-heading');
  const label = el('label', mode === 'exercise' ? 'Your practice · main.rs' : mode === 'reference' ? 'Reference · main.rs' : 'Worked example · main.rs');
  const editor = el('textarea'); editor.id = `lesson-code-${lesson.id}-${mode}`; label.htmlFor = editor.id;
  Object.assign(editor, { spellcheck: false, autocapitalize: 'off', autocomplete: 'off', value: initial });
  editor.setAttribute('autocorrect', 'off'); editor.setAttribute('wrap', 'off'); editor.setAttribute('aria-label', `${mode === 'exercise' ? 'Practice' : mode === 'reference' ? 'Reference' : 'Example'} Rust code`);
  let starter = initial;
  try {
    const legacy = localStorage.getItem(`rust-foundry-lesson-draft-v1:${lesson.id}:${mode}`) ?? JSON.parse(localStorage.getItem('rust-foundry-mvp-v1') || '{}').sources?.[`course:${lesson.id}:${mode}`];
    if (lesson.revision > 1 && typeof legacy === 'string') earlierDraft = legacy;
    else if (typeof legacy === 'string') starter = legacy;
  } catch { /* Current drafts can still be edited and exported. */ }
  const draft = createDraft(key, starter);
  editor.value = draft.value;
  const saved = el('p', '', 'inline-save'); saved.setAttribute('role', 'status');
  const updateDraftControls = () => {
    reset.disabled = running || editor.value === starter;
    undo.hidden = !draft.canUndo;
    undo.disabled = running;
    saved.hidden = draft.durable;
    saved.textContent = draft.durable ? '' : 'Saved for this tab only. Use Download .rs in Editor tools before reloading or closing the tab.';
  };
  const reset = button('Restore starter', () => {
    draft.replace(starter); editor.value = draft.value; edited('Starter restored. Undo restore recovers the previous draft.');
  });
  const undo = button('Undo restore', () => {
    draft.undo(); editor.value = draft.value; edited('Previous draft restored.');
  });
  bar.append(label);
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
  const status = el('p', unsupported || '', 'inline-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const outputLabel = el('h3', 'Program output');
  const provenance = el('p', '', 'output-context'); provenance.hidden = true;
  const result = el('pre', '', 'console inline-output'), errors = el('pre', '', 'console stderr');
  result.hidden = true; errors.hidden = true;
  result.setAttribute('aria-label', `${mode} program output`); errors.setAttribute('aria-label', `${mode} runtime errors`);
  const compilerMessages = el('details', undefined, 'inline-diagnostics');
  const diagnostics = el('pre', '', 'console'); compilerMessages.append(el('summary', 'Compiler messages'), diagnostics); compilerMessages.hidden = true;
  const controls = el('div', undefined, 'inline-controls');
  const runButton = button(mode === 'exercise' ? 'Run checks' : mode === 'reference' ? 'Run reference' : 'Run example', run, 'button primary'); runButton.disabled = !!unsupported;
  const stop = button('Stop', () => { controller?.abort(); task?.cancel(); }, 'button stop'); stop.hidden = true;
  const setRunning = value => {
    running = value; runButton.disabled = value || !!unsupported; stop.hidden = !value; editor.readOnly = value; updateDraftControls();
    keys.querySelectorAll('button').forEach(control => { control.disabled = value; });
  };
  controls.append(runButton, stop);
  const more = el('details', undefined, 'inline-more');
  const wasm = button('Download compiled .wasm', () => { if (artifact) download(artifact, `${lesson.id}.wasm`, 'application/wasm'); }); wasm.disabled = true;
  more.append(el('summary', 'Editor tools'), reset, undo, button('Download .rs', () => download(editor.value, `${lesson.id}-${mode}.rs`, 'text/plain')), wasm);
  root.append(bar, editor, keys, controls, progress, status, saved, compilerMessages, errors, outputLabel, provenance, result, more);
  outputLabel.hidden = true;
  updateDraftControls();
  if (earlierDraft) {
    const archive = el('details', undefined, 'inline-more previous-draft');
    archive.append(el('summary', 'Previous edition draft · preserved'), el('p', 'This lesson was rewritten to teach fewer new ideas at once. Your earlier draft is preserved separately; the revised example is shown above.'), button('Download previous draft .rs', () => download(earlierDraft, `${lesson.id}-${mode}-previous-edition.rs`, 'text/plain')));
    root.append(archive);
  }
  function updateOutputContext() {
    provenance.hidden = !lastOutput || lastOutput.source === editor.value;
    provenance.textContent = 'Output from the earlier source. Run this code to update it.';
  }
  function edited(message) {
    updateDraftControls(); updateOutputContext();
    artifact = undefined; wasm.disabled = true;
    status.className = 'inline-status'; status.textContent = message;
  }
  function changed() { draft.save(editor.value); edited(''); }
  editor.oninput = changed;
  editor.onkeydown = event => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); if (!runButton.disabled) run(); }
  };
  async function run() {
    if (disposed || running || unsupported) return;
    if (!canRun()) { status.textContent = 'Another program is running. Stop it or wait for it to finish, then try again.'; return; }
    const source = editor.value;
    if (new TextEncoder().encode(source).length > 64_000) { status.textContent = 'This program exceeds the 64 KB source limit.'; return; }
    draft.save(source); setRunning(true); errors.textContent = ''; errors.hidden = true; diagnostics.textContent = ''; compilerMessages.hidden = true; compilerMessages.open = false; artifact = undefined; wasm.disabled = true;
    let runOutput = '';
    if (lastOutput) { provenance.hidden = false; provenance.textContent = 'Previous output while this run is in progress.'; }
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
        if (data.type === 'stdout') runOutput += data.text;
        if (data.type === 'stderr') { errors.hidden = false; errors.textContent += data.text; }
        if (data.type === 'artifact') { artifact = data.bytes; wasm.disabled = false; }
        if (data.type === 'diagnostic') {
          messages += data.text;
          diagnostics.textContent = messages.split('\n').filter(line => !line.startsWith('Linking using ')).join('\n').trim();
          compilerMessages.hidden = !diagnostics.textContent;
        }
      } });
      const outcome = await task.finished;
      if (disposed) return;
      if (Number.isInteger(outcome.exitCode)) {
        lastOutput = { source }; provenance.hidden = true; outputLabel.hidden = false; result.hidden = false;
        result.textContent = runOutput || '(No output.)';
      } else if (lastOutput) {
        provenance.hidden = false; provenance.textContent = 'This is the previous program output. The latest attempt did not finish.';
      }
      if (outcome.ok) {
        const passed = matchesOutput(outcome.stdout, lesson.expected);
        status.className = 'inline-status ' + (mode === 'exercise' && passed ? 'passed' : 'check-neutral');
        status.textContent = mode === 'exercise' ? (passed ? 'Practice checks passed.' : 'The program ran. Its output differs from the exercise target. Choose Show practice output target to compare.') : 'Run finished.';
        if (mode === 'exercise' && passed && onPass() === false) status.textContent += ' Progress could not be saved; this mark lasts for this visit only.';
      } else if (outcome.stage === 'compile') {
        status.textContent = 'Rust found a compile error. Read Compiler messages, then run again.';
        if (!diagnostics.textContent) diagnostics.textContent = outcome.message || 'Compilation stopped before producing a program.';
        compilerMessages.hidden = false; compilerMessages.open = true;
      } else if (outcome.stage === 'cancelled' || outcome.stage === 'timeout') status.textContent = outcome.message;
      else {
        status.textContent = mode === 'exercise' && /not yet implemented/.test(errors.textContent) ? 'Replace todo! in main.rs. Open a hint below if you need help.' : /assertion/.test(errors.textContent) ? 'A check in the Rust source did not pass. Read the assertion message.' : outcome.message || `Program exited with status ${outcome.exitCode}.`;
        status.className = 'inline-status check-neutral';
      }
    } catch (error) { if (!disposed) status.textContent = error.name === 'AbortError' ? 'Stopped. Choose Run to try again.' : error.message; }
    finally {
      if (!disposed && lastOutput && provenance.textContent === 'Previous output while this run is in progress.') {
        provenance.textContent = 'This is the previous program output. The latest attempt did not finish.';
      }
      const focusWasOnStop = document.activeElement === stop;
      task = undefined; controller = undefined; progress.hidden = true; setRunning(false);
      if (!disposed && focusWasOnStop) runButton.focus();
    }
  }
  return { root, isBusy: () => running, focus: () => editor.focus({ preventScroll: true }), dispose: () => { disposed = true; controller?.abort(); task?.cancel(); }, stop: () => { controller?.abort(); task?.cancel(); } };
}
