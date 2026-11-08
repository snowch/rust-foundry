import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { course, chapters } from '../src/course-data.js';
const rustc = process.env.RUSTC || 'rustc';
test('all authored examples and reference exercises execute their assertions', { timeout: 120_000 }, async t => {
  const folder = await mkdtemp(join(tmpdir(), 'foundry-course-'));
  try {
    assert.equal(course.length, 36); assert.equal(new Set(course.map(x => x.id)).size, course.length);
    for (const chapter of chapters) assert.equal(course.filter(x => x.chapter === chapter.id).length, 3);
    for (const lesson of course) {
      await t.test(lesson.id, async () => {
        assert.ok(lesson.explain.length >= 2 && lesson.walkthrough.length >= 2 && lesson.hints.length >= 2);
        assert.ok(lesson.choices[lesson.answer]);
        assert.notEqual(lesson.starter, lesson.solution);
        const source = join(folder, lesson.id + '.rs'), binary = join(folder, lesson.id);
        await writeFile(source, lesson.source);
        execFileSync(rustc, ['--edition', '2021', '-D', 'warnings', source, '-o', binary], { timeout: 15_000, stdio: 'pipe' });
        assert.equal(execFileSync(binary, { timeout: 2000, encoding: 'utf8' }), lesson.expected);
        // The supplied TODO must fail; it must never receive a completion mark.
        await writeFile(source, lesson.starter);
        const starter = spawnSync(rustc, ['--edition', '2021', source, '-o', binary], { timeout: 15_000 });
        assert.equal(starter.status, 0, starter.stderr?.toString());
        assert.notEqual(spawnSync(binary, { timeout: 2000 }).status, 0);
      });
    }
  } finally { await rm(folder, { recursive: true, force: true }); }
});
