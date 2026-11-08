import { validateFiles } from './files.js';
const DATABASE = 'rust-foundry-workspace-v1';
export class RevisionConflict extends Error {}
export async function openWorkspaceStore() {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('snapshots');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close older Rust Foundry tabs to open storage.'));
    request.onsuccess = () => resolve(request.result);
  });
  db.onversionchange = () => db.close();
  const transact = (mode, work) => new Promise((resolve, reject) => {
    const tx = db.transaction('snapshots', mode); const store = tx.objectStore('snapshots'); let value, failure;
    tx.oncomplete = () => resolve(value);
    tx.onabort = () => reject(failure || tx.error || new Error('Browser storage could not save the workspace.'));
    tx.onerror = () => {}; // onabort reports the transaction result, including quota errors.
    const read = store.get('workspace');
    read.onsuccess = () => {
      try {
        const current = read.result || { revision: 0, files: [] };
        if (!Number.isSafeInteger(current.revision) || current.revision < 0 || current.revision === Number.MAX_SAFE_INTEGER) throw new Error('Invalid or exhausted workspace revision. Export your files.');
        value = work(current, store);
      }
      catch (error) { failure = error; tx.abort(); }
    };
  });
  return {
    read: () => transact('readonly', snapshot => { validateFiles(snapshot.files); return snapshot; }),
    save: (revision, files) => {
      validateFiles(files);
      return transact('readwrite', (current, store) => {
        if (current.revision !== revision) throw new RevisionConflict('Another tab saved newer files. Download your unsaved files, then reload the saved workspace.');
        const snapshot = { revision: revision + 1, files };
        store.put(snapshot, 'workspace'); return snapshot;
      });
    },
    close: () => db.close(),
  };
}
