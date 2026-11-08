import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { course } from '../src/course-data.js';
import { zipFiles } from '../src/archive.js';
const encode = text => new TextEncoder().encode(text);
const files = [];
for (const lesson of course) {
  files.push([`lessons/${lesson.id}/starter.rs`, encode(lesson.starter)], [`lessons/${lesson.id}/reference.rs`, encode(lesson.solution)]);
  if (lesson.lab) files.push([`lessons/${lesson.id}/lab.sql`, encode(lesson.lab.script + '\n')]);
  files.push([`lessons/${lesson.id}/README.txt`, encode(`${lesson.title}\n\n${lesson.explain.join('\n\n')}\n\nExpected output:\n${lesson.expected}\nExercise: replace todo!; keep the supplied assertions.\n\n${lesson.hints.map((x, i) => `Hint ${i + 1}: ${x}`).join('\n')}\n\nExperiment: ${lesson.experiment}\n`)]);
}
const source = await readFile('native/tinydb.rs', 'utf8');
const projects = [
  ['01-rows', '    pub fn new(id: u32, name: &str, score: u32) -> DbResult<Self> {', 'Validate the schema before returning a Row. Check byte lengths and ASCII controls.'],
  ['02-parser', 'fn parse(text: &str) -> DbResult<Statement> {', 'Consume the complete token stream. Reject unsupported statements, overflow, and trailing tokens.'],
  ['03-paged-codec', '    pub fn decode(bytes: &[u8]) -> DbResult<Self> {', 'Check header, lengths, checksums, page tags, references, and full tree invariants.'],
  ['04-index-insertion', '    fn insert_at(&mut self, id: usize, row: Row) -> DbResult<Option<(u32, usize)>> {', 'Insert recursively; split leaves and branches; return a separator and new right page on overflow.'],
  ['05-index-deletion', '    fn rebalance(&mut self, children: &mut Vec<usize>, at: usize) -> DbResult<()> {', 'Prefer borrowing from a sibling with spare occupancy; otherwise merge and free the removed page.'],
  ['06-staged-changes', '    fn apply(&mut self, change: impl FnOnce(&mut Database) -> DbResult<()>) -> DbResult<String> {', 'Change a candidate, keep failure atomic, stage during BEGIN, otherwise autocommit.'],
  ['07-journal-commit', '    fn commit(&mut self, mut candidate: Database) -> DbResult<()> {', 'Check the generation, prepare a journal, commit its marker, install the snapshot, then clean up. Preserve all failpoints.'],
  ['08-recovery', 'fn recover(path: &Path) -> DbResult<Option<String>> {', 'Discard prepared journals, redo committed snapshots, validate installed targets, and retain corrupt/conflicting evidence.'],
];
await mkdir('public/course', { recursive: true });
const manifest = [];
for (const [id, signature, hint] of projects) {
  const start = source.indexOf(signature);
  if (start < 0) throw new Error('Milestone signature changed: ' + signature);
  const body = start + signature.length, indent = signature.startsWith('    ') ? '    ' : '';
  const oneLine = source[body] !== '\n';
  const end = oneLine ? source.lastIndexOf('}', source.indexOf('\n', body)) : source.indexOf('\n' + indent + '}\n', body);
  if (end < body) throw new Error('Milestone boundary changed: ' + id);
  const starter = source.slice(0, body) + `\n${indent}    todo!("${id}: ${hint}")` + (oneLine ? '\n' + indent : '') + source.slice(end);
  files.push([`tinydb/${id}/starter.rs`, encode(starter)], [`tinydb/${id}/reference.rs`, encode(source)],
    [`tinydb/${id}/README.txt`, encode(`${id}\n\n${hint}\n\nImplement the TODO in the otherwise working database.\nNative checks: rustc --edition 2021 --test starter.rs -o tinydb-tests && ./tinydb-tests\nNative CLI: rustc --edition 2021 starter.rs -o tinydb && ./tinydb people.rdb\nBrowser: open this milestone in Rust Foundry, compile it, and install it in the workspace. Browser examples are smoke checks; use the native invariant suite for the full check.\n`)]);
  const browserStarter = starter.split('\n#[cfg(test)]\nmod tests')[0].trimEnd() + '\n';
  await writeFile(`public/course/${id}.rs`, browserStarter);
  manifest.push({ id, hint, signature: signature.trim(), file: `${id}.rs` });
}
files.push(['tinydb/reference.rs', encode(source)], ['tinydb/FORMAT.md', encode(await readFile('docs/tinydb-format.md', 'utf8'))]);
files.push(['README.txt', encode('Rust Foundry — 36 lessons and 8 TinyDB projects\n\nStart with the lesson explanations at https://snowch.github.io/rust-foundry/#course\nEach lesson includes a runnable reference and a TODO starter with assertions in main.\nRun: rustc --edition 2021 starter.rs -o lesson && ./lesson\nTinyDB projects each remove one real function from the complete implementation. The reference includes the native invariant suite. See each project README.\n\nNo Cargo dependencies are required. Browser compiler version is experimental and pinned; native tests use stable Rust. Files and source stay local when using the website.\n')]);
await writeFile('public/course/projects.json', JSON.stringify(manifest, null, 2) + '\n');
await writeFile('public/course/rust-foundry-course.zip', zipFiles(files));
console.log(`Exported ${course.length} lessons, ${projects.length} TinyDB projects, and ${files.length} archive entries.`);
