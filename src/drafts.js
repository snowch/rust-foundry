// Keep the existing source key readable by earlier editions. If storage refuses
// a write, the in-tab copy takes precedence until a successful retry.
const tabDrafts = new Map();
const read = key => {
  if (tabDrafts.has(key)) return tabDrafts.get(key);
  try { return localStorage.getItem(key); } catch { return null; }
};
function write(key, value) {
  tabDrafts.set(key, value);
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    tabDrafts.delete(key);
    return true;
  } catch { return false; }
}

export function createDraft(key, initial) {
  const recoveryKey = key + ':restore';
  let value = read(key) ?? initial;
  let backup = read(recoveryKey);
  let durable = !tabDrafts.has(key);
  let backupDurable = !tabDrafts.has(recoveryKey);

  function save(next) {
    value = next;
    if (!backupDurable) backupDurable = write(recoveryKey, backup);
    // A shorter starter could fit even when saving the previous draft failed.
    // Keep the older durable copy until a recovery record has been saved.
    if (backupDurable) durable = write(key, value);
    else { tabDrafts.set(key, value); durable = false; }
  }

  return {
    get value() { return value; },
    get durable() { return durable; },
    get canUndo() { return backup !== null; },
    save,
    snapshot:()=>({value,backup}),
    restore(snapshot){if(!snapshot)return;value=snapshot.value;backup=snapshot.backup;backupDurable=write(recoveryKey,backup);durable=write(key,value);},
    replace(next) {
      if (value === next) return;
      backup = value;
      backupDurable = write(recoveryKey, backup);
      save(next);
    },
    undo() {
      if (backup === null) return;
      save(backup);
      // A failed write to the draft must never delete its durable recovery copy.
      if (durable && write(recoveryKey, null)) { backup = null; backupDurable = true; }
    },
  };
}

export const snapshotDraftMemory=()=>[...tabDrafts];
export function restoreDraftMemory(values){for(const[key,value]of values||[])tabDrafts.set(key,value);}
