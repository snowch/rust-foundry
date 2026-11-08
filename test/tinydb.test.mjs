import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runBinary } from '../src/runner.js';
import { createWorker } from './worker-helper.mjs';
import { databaseLessons } from '../src/course-data.js';
const bytes = new Uint8Array(await readFile(new URL('../public/programs/tinydb.wasm', import.meta.url)));
async function run(stdin, files = [], database = 'people.rdb') {
  return runBinary({ bytes, stdin, files, args: [database], createWorker }).finished;
}
test('real bundled Rust TinyDB operates on persistent virtual files', { timeout: 30_000 }, async t => {
  let files;
  await t.test('SQL CRUD and normal nonzero exits preserve prior commits', async () => {
    const result = await run("INSERT INTO people VALUES (1, 'café', 90);\nINSERT INTO people VALUES (1, 'duplicate', 1);\nSELECT * FROM people;");
    assert.equal(result.exitCode, 2, JSON.stringify(result));
    assert.match(result.stdout, /1 \| café \| 90/); assert.match(result.stderr, /duplicate/i);
    assert.ok(result.files.some(([name]) => name === 'people.rdb')); files = result.files;
    const reopen = await run("UPDATE people SET name = 'O''Neil', score = 95 WHERE id = 1;\nSELECT * FROM people;", files);
    assert.equal(reopen.ok, true, JSON.stringify(reopen)); assert.match(reopen.stdout, /1 \| O'Neil \| 95/); files = reopen.files;
  });
  await t.test('a transaction commits once; rollback and EOF discard staged changes', async () => {
    const result = await run("BEGIN;\nINSERT INTO people VALUES (2, 'Lin', 80);\nROLLBACK;\nSELECT COUNT(*) FROM people;\nBEGIN;\nDELETE FROM people WHERE id = 1;", files);
    assert.equal(result.ok, true, JSON.stringify(result)); assert.match(result.stdout, /ROLLBACK\n1\nBEGIN/);
    const reopened = await run('SELECT COUNT(*) FROM people;', result.files);
    assert.equal(reopened.stdout, '1\n');
    const committed = await run("BEGIN;\nINSERT INTO people VALUES (2, 'Lin', 80);\nINSERT INTO people VALUES (3, 'Grace', 70);\nCOMMIT;\n.check", reopened.files);
    assert.equal(committed.ok, true, JSON.stringify(committed)); assert.match(committed.stdout, /OK: 3 rows/); files = committed.files;
  });
  await t.test('actual pages split and merge; EXPLAIN follows the index', async () => {
    const script = Array.from({ length: 60 }, (_, i) => `INSERT INTO people VALUES (${i + 1}, 'n${i}', ${i});`).join('\n');
    const result = await run(script + '\n.index\nEXPLAIN SELECT * FROM people WHERE id = 42;\n.check');
    assert.equal(result.ok, true, JSON.stringify(result)); assert.match(result.stdout, /height [3-9]/); assert.match(result.stdout, /B\+ tree point lookup/);
    const deletion = await run(Array.from({ length: 57 }, (_, i) => `DELETE FROM people WHERE id = ${i + 1};`).join('\n') + '\n.check\n.pages', result.files);
    assert.equal(deletion.ok, true, JSON.stringify(deletion)); assert.match(deletion.stdout, /OK: 3 rows; 1 allocated pages; height 1/); assert.match(deletion.stdout, /free/);
  });
  for (const point of ['prepare', 'commit', 'install']) await t.test(`interruption at ${point} and idempotent recovery`, async () => {
    const interrupted = await run(`.crash ${point}\nINSERT INTO people VALUES (7, 'Ada', 90);`);
    assert.equal(interrupted.exitCode, 80, JSON.stringify(interrupted));
    assert.ok(interrupted.files.some(([name]) => name === 'people.rdb.wal'));
    const recovered = await run('SELECT COUNT(*) FROM people;', interrupted.files);
    assert.equal(recovered.ok, true, JSON.stringify(recovered));
    assert.match(recovered.stdout, point === 'prepare' ? /Discarded uncommitted.*\n0\n/ : /Recovered committed.*\n1\n/);
    assert.ok(!recovered.files.some(([name]) => name.endsWith('.wal')));
    const again = await run('SELECT COUNT(*) FROM people;', recovered.files);
    assert.equal(again.stdout, point === 'prepare' ? '0\n' : '1\n');
  });
  await t.test('TDB1 import/export and malformed file preservation', async () => {
    const exported = await run('.export exchange.tdb', files);
    assert.equal(exported.ok, true, JSON.stringify(exported));
    const legacy = exported.files.find(([name]) => name === 'exchange.tdb')[1];
    assert.deepEqual([...legacy.slice(0, 8)], [84, 68, 66, 49, 1, 40, 3, 0]);
    const imported = await run('.import exchange.tdb\nSELECT COUNT(*) FROM people;', [['exchange.tdb', legacy]], 'other.rdb');
    assert.equal(imported.stdout, 'OK\n3\n');
    const bad = new Uint8Array([1, 2, 3]);
    const rejected = await run('SELECT * FROM people;', [['people.rdb', bad]]);
    assert.equal(rejected.exitCode, 3); assert.deepEqual(rejected.files[0][1], bad);
  });
});

test('all TinyDB lesson scripts run the real database, including recovery followups', async t => {
  for (const lesson of databaseLessons) await t.test(lesson.id, async () => {
    const result = await run(lesson.lab.script);
    assert.equal(result.exitCode, lesson.lab.recoveryScript ? 80 : 0, JSON.stringify(result));
    assert.ok(result.files);
    if (lesson.lab.recoveryScript) {
      const reopened = await run(lesson.lab.recoveryScript, result.files);
      assert.equal(reopened.ok, true, JSON.stringify(reopened));
    }
  });
});
