// A reviewable scope/sequence record generated from the actual teaching data.
import { writeFile } from 'node:fs/promises';
import { course, chapters, validateSequence } from '../src/course-data.js';
validateSequence();
const safe = value => value.replaceAll('|', '\\|').replaceAll('\n', ' ');
const url = id => `https://snowch.github.io/rust-foundry/#course/${id}`;
const intro = `# Curriculum review: beginner sequence, edition 2

Applied the [Curriculum Designer AI skill](https://github.com/2nth-ai/skills/blob/26238a6e5563df4818a6c2f4da856cf5e3824eeb/edu/curriculum/SKILL.md)
as an editorial workflow: identify gaps, resequence topics, write measurable
objectives, model the task, provide guided support, and assess the same goal.
This is a self-paced Rust course, so no school-framework alignment or formal
classroom certification is claimed. No external account or teaching service is
required to read these public skill instructions or use the resulting course.

## Entry point and progression

No previous programming, Rust, SQL, command-line, or filesystem knowledge is
required. The learner needs to read the explanation and edit the code box; the
first lesson explains source code, main, braces, println!, quotes, semicolons,
the compiler, and the Run action. Its complete program is three lines.

The opening practice changes only quoted text. Binding names and placeholders
come after printing; numeric types, arithmetic, conditionals, and function calls
follow. Return values, assertions, and TODO markers each receive instruction
before they become part of an exercise. Optional advanced full-source projects
are distinguished from the core course and link to their preparation.

## Findings and changes across the previous course

| Previous gap | Revision |
| --- | --- |
| First lesson returned \`&'static str\` and asserted a helper result | Start with a three-line main and literal print; introduce return values and reference lifetimes later |
| Every starter required understanding a function and todo! | Output-only starters first; unfinished functions begin after the assertion/TODO lesson |
| Types, comparisons, loops, tuples, arrays, and formatting were assumed | Add their direct explanations and practice before using them in ownership or database examples |
| First struct included an unexplained derive attribute | Teach a plain struct, then methods; introduce derives after traits |
| Slice example used Option, Vec, and iterator adapters early | Teach borrowed arrays first, introduce Option explicitly, then use a match-based checked lookup |
| Optional search used a closure/iterator before either was explained | Use an array and a for loop for the first lookup; teach closures and iterator steps before pipelines/maps |
| Error propagation used map_err closures before closures | Reuse a named parsing helper with ?; introduce map_err explicitly in decoding after closures |
| Trait example already required a generic function | Teach the concrete implementation first, then generic bounds and Ord |
| File, byte, header, checksum, and SQL terminology was assumed | Add file round trips, byte/character distinctions, checksum limits, table vocabulary, and CRUD before formats |
| Recursive tree code and full-source helpers were left unexplained | Add base-case recursion, tree vocabulary, and a supplied-scaffold source primer |
| Ownership walkthrough included references in early ownership lessons | Show the annotated reference walkthrough only after shared references are introduced |
| Saved old examples could replace newly simplified source | Use edition-specific draft keys, retain old keys, and offer previous-edition downloads |
| Old passing checks could appear to certify rewritten exercises | Keep old marks as earlier-edition records and use separate progress for this edition |

## Lesson design and assessment

Each lesson has one stated performance goal, earlier prerequisite links,
direct instruction before its complete worked program, a walkthrough, a
specific pitfall, a question with feedback, a starter, progressive hints, a
separate reference, and an extension experiment. New library methods are named
in the current explanation or an earlier explanation before being required.
The reference never replaces the learner's current practice draft.

Early output checks assess printing and calculations. Later visible assertions
add extra cases once assertions have been taught. Compile-error starters are
explicitly identified as error-repair activities. Reading completion remains
an explicit choice; running a worked example does not complete an exercise.

## Verification and limits

The sequence validator rejects duplicate IDs and prerequisites that point to
untaught lessons. Source guards check that assertions/TODOs, String, shared text
types, Option/Result, matching, mutable references, vectors, closures, iterators,
imports, maps/sets, derives, and generic functions do not appear before their
introductions. A method-name check flags APIs absent from direct instruction.
These guards protect known classes of regression; editorial review supplies
the explanations and task alignment rather than claiming a regex proves
learning quality.

Every worked/reference program is compiled with warnings denied and executed
against its documented output. Starters must need a genuine change, whether
their first result is different, a deliberately taught compile error, or a
runtime check failure. Browser checks cover every goal and prerequisite link,
beginner output-only practice, inline execution, retained previous drafts,
separate progress, and phone/tablet layouts. TinyDB scripts exercise the real
bundled Rust database, including recovery followups.

## Complete lesson-by-lesson scope and sequence

${course.length} lessons in ${chapters.length} chapters. Prerequisites below are
actual earlier lesson IDs, not completion locks. An experienced learner can
still navigate freely and revisit the linked explanation when needed.

| # | Chapter / lesson | Performance goal | Earlier prerequisites | New concepts introduced |
| --- | --- | --- | --- | --- |
`;
const rows = course.map((item, index) => {
  const chapter = chapters.find(c => c.id === item.chapter);
  const required = item.prerequisites.map(id => `[${safe(course.find(x => x.id === id).title)}](${url(id)})`).join('; ') || 'None — course entry';
  return `| ${index + 1} | ${chapter.number}: [${safe(item.title)}](${url(item.id)}) | ${safe(item.objective)} | ${required} | ${safe(item.introduces.join(', '))} |`;
});
await writeFile('docs/curriculum-review.md', intro + rows.join('\n') + '\n');
console.log(`Reviewed sequence: ${course.length} lessons; ${chapters.length} chapters; every prerequisite points backward.`);
