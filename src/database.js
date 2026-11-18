import { runBinary } from './runner.js';
import { openWorkspaceStore, RevisionConflict } from './workspace-store.js';
import { validFilename, validateFiles, FILE_LIMIT } from './files.js';
import { element as el, button, download } from './dom.js';
import { zipFiles } from './archive.js';
import { createDraft } from './drafts.js';
const $ = id => document.getElementById(id);
const presets = [
  ['Query', 'SELECT * FROM people;\n.check'],
  ['CRUD', "INSERT INTO people VALUES (1, 'Ada', 90);\nINSERT INTO people VALUES (2, 'Lin', 80);\nUPDATE people SET score = 95 WHERE id = 1;\nSELECT * FROM people;"],
  ['Pages and index', 'BEGIN;\n' + Array.from({ length: 20 }, (_, i) => `INSERT INTO people VALUES (${i + 1}, 'person ${i + 1}', ${i + 60});`).join('\n') + '\nCOMMIT;\n.pages\n.index\nEXPLAIN SELECT * FROM people WHERE id = 12;\nSELECT * FROM people WHERE id >= 8 AND id <= 12;\n.check'],
  ['Rollback', "BEGIN;\nINSERT INTO people VALUES (101, 'Staged', 75);\nSELECT COUNT(*) FROM people;\nROLLBACK;\nSELECT COUNT(*) FROM people;"],
  ['Commit', "BEGIN;\nINSERT INTO people VALUES (102, 'Committed', 75);\nUPDATE people SET score = 80 WHERE id = 102;\nCOMMIT;\nSELECT * FROM people WHERE id = 102;"],
  ['Interrupt after commit', ".crash commit\nINSERT INTO people VALUES (103, 'Recovered', 90);"],
  ['Reopen and recover', 'SELECT * FROM people;\n.recover\n.check'],
  ['Exchange with C', '.export exchange.tdb\n.snapshot backup.rdb'],
  ['Help', '.help'],
];
export function initDatabase({ openSource, canRun = () => true }) {
  let store, ready, files = [], revision = 0, dirty = false, blocked = false, running = false, task, custom, bundled;
  let lastRun;
  const message = text => { $('db-status').textContent = text; };
  const storageStatus = () => {
    $('db-storage').textContent = blocked ? 'Newer files exist in another tab. Your unsaved candidate is downloadable.' : dirty ? 'Unsaved files in memory. Download to keep them.' : store ? `Saved in this browser · revision ${revision}` : 'Memory only · download files to keep them.';
    $('db-retry').hidden = !dirty || blocked || !store;
    $('db-run').disabled = running || blocked;
    $('db-import').disabled = running || blocked;
    $('db-reload').disabled = running;
    $('db-stop').hidden = !running;
    $('db-load-preset').disabled = $('db-presets').disabled = $('db-undo-script').disabled = running;
    $('db-script').readOnly = running;
    $('db-name').disabled = running;
    $('db-edit-source').disabled = running;
    $('db-bundled').disabled = running || !custom;
  };
  const renderFiles = () => {
    const list = $('db-files'); list.replaceChildren();
    if (!files.length) list.append(el('p', 'No files yet. Run a script to create your database.'));
    for (const [name, bytes] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
      const row = el('div', undefined, 'db-file');
      row.append(el('span', `${name} · ${bytes.length.toLocaleString()} bytes`), button('Download', () => download(bytes, name)));
      const remove = button('Delete', async () => {
        if (running || blocked || !confirm(`Delete ${name} from this browser workspace? Download it first if you need a copy.`)) return;
        await saveFiles(files.filter(([other]) => other !== name));
      }); remove.disabled = running || blocked; row.append(remove); list.append(row);
    }
    $('db-download').disabled = !files.length; storageStatus();
  };
  async function initialize() {
    if (ready) return ready;
    ready = (async () => {
      try { store = await openWorkspaceStore(); const saved = await store.read(); files = saved.files; revision = saved.revision; }
      catch (error) { store?.close(); store = undefined; message(`Storage unavailable: ${error.message}. Runs work in memory; download your files.`); }
      renderFiles();
    })();
    return ready;
  }
  async function saveFiles(candidate) {
    validateFiles(candidate); files = candidate; dirty = true;
    try {
      if (store) { const saved = await store.save(revision, files); revision = saved.revision; dirty = false; }
      renderFiles(); return !dirty;
    } catch (error) {
      blocked = error instanceof RevisionConflict; renderFiles(); message(error.message + ' Your candidate files are available below.'); return false;
    }
  }
  async function loadBundled(signal) {
    if (bundled) return bundled;
    const base = new URL('./programs/', document.baseURI);
    const manifestResponse = await fetch(new URL('tinydb.json', base), { signal });
    if (!manifestResponse.ok) throw new Error('Could not download TinyDB. Check your connection and retry.');
    const manifest = await manifestResponse.json();
    const response = await fetch(new URL('tinydb.wasm', base), { signal });
    if (!response.ok) throw new Error('Could not download TinyDB. Check your connection and retry.');
    const data = new Uint8Array(await response.arrayBuffer());
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))].map(x => x.toString(16).padStart(2, '0')).join('');
    if (data.length !== manifest.bytes || hash !== manifest.wasmSha256) throw new Error('TinyDB integrity check failed. Reload to fetch matching files.');
    bundled = data; return data;
  }
  $('db-run').onclick = async () => {
    await initialize();
    if (running || blocked) return;
    if (!canRun()) { message('Wait for the Rust editor’s current run to finish, or stop it first.'); return; }
    const name = $('db-name').value;
    if (!validFilename(name) || /\.(wal|tmp)$/i.test(name)) { message('Choose a simple database filename, such as people.rdb; .wal and .tmp are sidecars.'); return; }
    const script = $('db-script').value;
    if (new TextEncoder().encode(script).length > 100_000) { message('Script exceeds the 100 KB input limit.'); return; }
    running = true; lastRun = { name, script }; storageStatus(); renderFiles();
    $('db-output-context').hidden = true; $('db-output-heading').hidden = true;
    $('db-output').hidden = true; $('db-errors').hidden = true;
    $('db-output').textContent = ''; $('db-errors').textContent = '';
    message(custom ? 'Running your compiled Rust program…' : 'Preparing TinyDB…');
    let cancelled = false;
    const controller = new AbortController();
    const loadTimer = setTimeout(() => controller.abort(), 30_000);
    // Cancellation also covers the initial program download; fetch cannot later start a cancelled run.
    task = { cancel: () => { cancelled = true; controller.abort(); } };
    try {
      const bytes = custom || await loadBundled(controller.signal);
      clearTimeout(loadTimer);
      if (cancelled) { message('Stopped. Saved files were retained.'); return; }
      message('Running TinyDB locally…');
      task = runBinary({ bytes, stdin: script, args: [name], files,
        onEvent: data => {
          if (data.type === 'stdout') { $('db-output-heading').hidden = false; $('db-output').hidden = false; $('db-output').textContent += data.text; }
          if (data.type === 'stderr') { $('db-output-heading').hidden = false; $('db-errors').hidden = false; $('db-errors').textContent += data.text; }
        } });
      const result = await task.finished;
      if (result.files) {
        const persisted = await saveFiles(result.files);
        if (!blocked) message(result.exitCode === 80 ? `Simulated interruption preserved the journal${persisted ? ' in browser storage' : ' in memory'}. Load the Reopen and recover example, then choose Run statements.` : `${result.ok ? 'Finished' : `Program exited with status ${result.exitCode}. See the messages below`}. ${persisted ? 'Workspace files saved.' : 'Download files to keep this in-memory result.'}`);
      } else message(result.message || 'Run failed. Saved files were retained.');
    } catch (error) { message(cancelled ? 'Stopped. Saved files were retained.' : error.name === 'AbortError' ? 'Program download timed out. Check your connection and retry.' : error.message + ' Saved files were retained.'); }
    finally {
      const focusWasOnStop = document.activeElement === $('db-stop');
      clearTimeout(loadTimer); running = false; task = undefined; storageStatus(); renderFiles();
      if (focusWasOnStop) $('db-run').focus();
    }
  };
  $('db-stop').onclick = () => { task?.cancel(); message('Stopping…'); };
  $('db-retry').onclick = () => saveFiles(files);
  $('db-reload').onclick = async () => {
    if (running) return;
    if (dirty && !confirm('Discard the unsaved in-memory candidate and reload saved browser files? Download your candidate first if needed.')) return;
    try {
      if (!store) { ready = undefined; await initialize(); }
      else { const saved = await store.read(); files = saved.files; revision = saved.revision; }
      blocked = false; dirty = false; renderFiles(); message('Reloaded saved browser files.');
    } catch (error) { message(error.message); }
  };
  $('db-download').onclick = () => download(zipFiles(files), `rust-foundry-workspace${dirty ? '-unsaved' : ''}.zip`, 'application/zip');
  $('db-import').onchange = async event => {
    await initialize(); if (running || blocked) return;
    try {
      const additions = await Promise.all([...event.target.files].map(async file => {
        if (!validFilename(file.name) || file.size > FILE_LIMIT) throw new Error('Import simple filenames, each at most 2 MB.');
        return [file.name, new Uint8Array(await file.arrayBuffer())];
      }));
      const existing = additions.filter(([name]) => files.some(([other]) => name === other));
      if (existing.length && !confirm(`Replace ${existing.map(([name]) => name).join(', ')} in the workspace?`)) return;
      const map = new Map(files); additions.forEach(([name, data]) => map.set(name, data));
      const candidate = [...map]; validateFiles(candidate);
      const saved = await saveFiles(candidate);
      if (!blocked) message(saved ? 'Imported files saved. Use .import filename to load an exchange file into the active database.' : 'Imported files are in memory; download to keep them.');
    } catch (error) { message(error.message); }
    finally { event.target.value = ''; }
  };
  $('db-edit-source').onclick = async () => {
    try {
      const response = await fetch(new URL('./programs/tinydb.rs', document.baseURI));
      if (!response.ok) throw new Error('Could not load the Rust source.');
      openSource(await response.text());
    } catch (error) { message(error.message); }
  };
  $('db-open-project').onclick = async () => {
    if (running) return;
    const id = $('db-project').value;
    try {
      const response = await fetch(new URL(`./course/${id}.rs`, document.baseURI));
      if (!response.ok) throw new Error('Could not load the project starter.');
      openSource(await response.text(), id);
    } catch (error) { message(error.message); }
  };
  $('db-bundled').onclick = () => { custom = undefined; $('db-program').textContent = 'Bundled TinyDB program'; storageStatus(); message('Using the bundled reference program.'); };
  const presetsElement = $('db-presets');
  for (const [title, script] of presets) {
    const option = el('option', title); option.value = title; presetsElement.append(option);
  }
  const draft = createDraft('rust-foundry-sql-v1', JSON.stringify({ script: presets[1][1], name: 'people.rdb' }));
  const currentDraft = () => JSON.stringify({ script: $('db-script').value, name: $('db-name').value });
  const showDraftState = () => {
    $('db-undo-script').hidden = !draft.canUndo;
    $('db-draft-status').hidden = draft.durable;
    $('db-draft-status').textContent = draft.durable ? '' : 'This script is saved for this tab only. Copy it before reloading or closing the tab.';
    $('db-output-context').hidden = !lastRun || $('db-output-heading').hidden ||
      (lastRun.name === $('db-name').value && lastRun.script === $('db-script').value);
    $('db-output-context').textContent = 'Output from the earlier script or filename. Run the current script to update it.';
  };
  const showDraft = () => {
    let value;
    try { value = JSON.parse(draft.value); } catch { /* A corrupt legacy draft can be replaced by editing. */ }
    $('db-script').value = typeof value?.script === 'string' ? value.script : presets[1][1];
    $('db-name').value = typeof value?.name === 'string' ? value.name : 'people.rdb';
    showDraftState();
  };
  const replaceDraft = (script, name) => {
    draft.replace(JSON.stringify({ script, name })); showDraft();
  };
  $('db-load-preset').onclick = () => {
    if (running) return;
    const [title, script] = presets.find(([label]) => label === presetsElement.value);
    replaceDraft(script, $('db-name').value);
    message(`Loaded ${title}. Choose Run statements. Undo script change restores your previous script and filename.`);
  };
  $('db-undo-script').onclick = () => {
    if (running) return;
    draft.undo(); showDraft(); message('Previous script and filename restored.');
  };
  const saveDraft = () => { draft.save(currentDraft()); showDraftState(); };
  $('db-script').oninput = saveDraft; $('db-name').oninput = saveDraft;
  presetsElement.value = 'CRUD'; showDraft();
  // No save on storage events: the revision check is authoritative at write time.
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  return {
    initialize, isBusy: () => running,
    openLab: async lab => {
      await initialize();
      if (running) { message('Stop the current workspace run before opening another lab.'); return; }
      replaceDraft(lab.script, lab.filename); location.hash = '#workspace';
      message('Lesson script loaded. Choose Run statements. Undo script change restores your previous script and filename.');
    },
    install: bytes => {
      if (running) return false;
      custom = bytes; $('db-program').textContent = 'Your compiled Rust program · this tab only'; storageStatus(); location.hash = '#workspace'; return true;
    },
  };
}
