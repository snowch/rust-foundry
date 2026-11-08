import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { course, chapters, validateSequence } from '../src/course-data.js';
const rustc = process.env.RUSTC || 'rustc';
test('every worked program and reference exercise runs; starters need a genuine change', { timeout: 180_000 }, async t => {
  const folder = await mkdtemp(join(tmpdir(), 'foundry-course-'));
  try {
    assert.ok(course.length > 36); assert.equal(new Set(course.map(x => x.id)).size, course.length);
    for (const chapter of chapters) assert.ok(course.some(x => x.chapter === chapter.id));
    for (const lesson of course) {
      await t.test(lesson.id, async () => {
        assert.ok(lesson.explain.length >= 2 && lesson.walkthrough.length >= 2 && lesson.hints.length >= 2);
        assert.ok(lesson.choices[lesson.answer]);
        assert.notEqual(lesson.starter, lesson.solution);
        const source = join(folder, lesson.id + '.rs'), binary = join(folder, lesson.id);
        await writeFile(source, lesson.source);
        execFileSync(rustc, ['--edition', '2021', '-D', 'warnings', source, '-o', binary], { timeout: 15_000, stdio: 'pipe' });
        assert.equal(execFileSync(binary, { timeout: 2000, encoding: 'utf8', cwd: folder }), lesson.expected);
        // Early starters are valid programs with an unfinished message/calculation.
        // Compile-error starters are explicitly taught as error-repair exercises.
        await writeFile(source, lesson.starter);
        const starter = spawnSync(rustc, ['--edition', '2021', source, '-o', binary], { timeout: 15_000 });
        if (starter.status !== 0) assert.equal(lesson.allowCompileErrorStarter, true, starter.stderr?.toString());
        else {
          const result = spawnSync(binary, { timeout: 2000, encoding: 'utf8', cwd: folder });
          assert.ok(result.status !== 0 || result.stdout !== lesson.expected, 'Starter already passes: ' + lesson.id);
        }
      });
    }
  } finally { await rm(folder, { recursive: true, force: true }); }
});

test('prerequisites point backward and familiar syntax is introduced before it is required', () => {
  assert.equal(validateSequence(), true);
  const known = new Set();
  let taughtExplanation = '';
  const rules = [
    [/assert(?:_eq|_ne)?!|todo!/, 'assertions'], [/&'static\s+str/, 'static-text'],
    [/\bString\b/, 'strings'], [/\b(?:Option|Some|None)\b/, 'optional-values'],
    [/\b(?:Result|Ok|Err)\b/, 'result-basics'], [/\bVec\b|vec!/, 'vector-basics'],
    [/\bmatch\b/, 'enums'], [/&mut\s/, 'mutable'], [/&str\b/, 'text-slices'],
    [/->/, 'return-values'], [/\buse\s/, 'imports'], [/HashMap/, 'maps'], [/HashSet/, 'sets'],
    [/(?:=|\(|,)\s*\|[^|\n]*\|/, 'closures'], [/\.(?:iter|next|copied|collect|filter|sum|any|all)\(/, 'iterator-basics'],
    [/#\[derive/, 'derive'], [/fn\s+\w+<T/, 'generics'], [/std::fs|fs::(?:read|write)/, 'files']
  ];
  for (const lesson of course) {
    const available = new Set([...known, lesson.id]);
    taughtExplanation += '\n' + lesson.explain.join('\n');
    for (const source of [lesson.source, lesson.starter]) {
      const code = source.replace(/"(?:\\.|[^"\\])*"/gs, '"text"').replace(/\/\/[^\n]*/g, '');
      for (const [pattern, introduction] of rules) if (pattern.test(code)) assert.ok(available.has(introduction), `${lesson.id} uses ${pattern} before ${introduction}`);
      for (const [, method] of code.matchAll(/\.([A-Za-z_]\w*)\s*\(/g)) {
        assert.ok(new RegExp('\\b' + method + '\\b').test(taughtExplanation) || new RegExp('fn\\s+' + method + '\\b').test(code), `${lesson.id} calls unexplained method ${method}`);
      }
    }
    known.add(lesson.id);
  }
  const bad = [...course]; const optional = bad.findIndex(x => x.id === 'optional-values');
  [bad[0], bad[optional]] = [bad[optional], bad[0]];
  assert.throws(() => validateSequence(bad), /untaught/);
  assert.doesNotMatch(course[0].source, /assert|todo|->|&|String|let /);
});
