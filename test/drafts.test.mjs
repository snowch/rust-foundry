import assert from 'node:assert/strict';
import test from 'node:test';
import { createDraft } from '../src/drafts.js';

test('restoring a smaller starter keeps the durable draft if the recovery write fails', () => {
  const values = new Map();
  let blocked;
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { if (key === blocked) throw Error('quota'); values.set(key, value); },
    removeItem: key => values.delete(key),
  };
  const draft = createDraft('example', 'starter');
  draft.save('a longer learner draft');
  blocked = 'example:restore';
  draft.replace('starter');
  assert.equal(values.get('example'), 'a longer learner draft');
  assert.equal(draft.value, 'starter');
  assert.equal(draft.durable, false);
  assert.equal(createDraft('example', 'starter').value, 'starter');
  blocked = undefined;
  draft.undo();
  assert.equal(values.get('example'), 'a longer learner draft');
  assert.equal(draft.canUndo, false);
});

test('undo retains the durable recovery when writing the restored source fails', () => {
  const values = new Map();
  let blocked;
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { if (key === blocked) throw Error('quota'); values.set(key, value); },
    removeItem: key => values.delete(key),
  };
  const draft = createDraft('practice', 'starter');
  draft.save('learner draft');
  draft.replace('starter');
  blocked = 'practice';
  draft.undo();
  assert.equal(draft.value, 'learner draft');
  assert.equal(draft.durable, false);
  assert.equal(draft.canUndo, true);
  assert.equal(values.get('practice'), 'starter');
  assert.equal(values.get('practice:restore'), 'learner draft');
  blocked = undefined;
  draft.undo();
  assert.equal(values.get('practice'), 'learner draft');
  assert.equal(values.has('practice:restore'), false);
});
