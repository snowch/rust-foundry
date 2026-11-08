import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { zipFiles } from '../src/archive.js';
const rustc = process.env.RUSTC || 'rustc';
const temp = await mkdtemp(join(tmpdir(), 'foundry-native-'));
try {
  const test = join(temp, 'tests'), rust = join(temp, 'rust-tinydb'), c = join(temp, 'c-tinydb');
  execFileSync(rustc, ['--edition', '2021', '-D', 'warnings', '--test', 'native/tinydb.rs', '-o', test], { stdio: 'inherit' });
  execFileSync(test, { stdio: 'inherit' });
  execFileSync(rustc, ['--edition', '2021', '-D', 'warnings', 'native/tinydb.rs', '-o', rust], { stdio: 'inherit' });
  // Fetch the user's actual C implementation at a pinned revision. Do not ship
  // another repository's unlicensed source in this website's distribution.
  const reference = process.env.TINYDB_C_SOURCE ? await readFile(process.env.TINYDB_C_SOURCE) : execFileSync('curl', ['--fail', '--silent', '--show-error', '--location', '--max-time', '60',
    'https://raw.githubusercontent.com/snowch/c-foundry/b98c0e7235bc69bd8e0ccd5d4a3935c6ff1cb83a/native/cli/tinydb.c']);
  assert.equal(createHash('sha1').update(`blob ${reference.length}\0`).update(reference).digest('hex'), '2494ef5e4a1d96624bd9d53498c8378a3fdefddc');
  const csource = join(temp, 'tinydb.c'); await writeFile(csource, reference);
  execFileSync(process.env.CC || 'cc', ['-std=c11', '-Wall', '-Wextra', '-Werror', csource, '-o', c], { stdio: 'inherit' });
  const run = (binary, file, sql) => execFileSync(binary, [file, '--execute', sql], { encoding: 'utf8' });
  const legacy = join(temp, 'c.tdb'), database = join(temp, 'rust.rdb'), exchanged = join(temp, 'rust.tdb');
  assert.equal(run(c, legacy, "INSERT INTO people VALUES (9, 'Zoë', 4294967295);"), 'OK\n');
  assert.equal(run(c, legacy, "INSERT INTO people VALUES (1, 'O''Neil', 0);"), 'OK\n');
  assert.equal(run(rust, database, `.import ${legacy}`), 'OK\n');
  assert.equal(run(rust, database, 'SELECT * FROM people;'), "1 | O'Neil | 0\n9 | Zoë | 4294967295\n2 rows\n");
  run(rust, database, "UPDATE people SET score = 42 WHERE id = 1;");
  run(rust, database, `.export ${exchanged}`);
  assert.equal(run(c, exchanged, 'SELECT * FROM people;'), "1 | O'Neil | 42\n9 | Zoë | 4294967295\n2 rows\n");
  run(c, exchanged, 'DELETE FROM people WHERE id = 9;');
  run(rust, database, `.import ${exchanged}`);
  assert.equal(run(rust, database, 'SELECT COUNT(*) FROM people;'), '1\n');
  // A full-capacity, independent fixture includes byte-length boundaries.
  const full = join(temp, 'full.tdb');
  for (let id = 1; id <= 128; id++) run(c, full, `INSERT INTO people VALUES (${id}, '${id === 128 ? 'a'.repeat(31) : 'row' + id}', ${id});`);
  run(rust, database, `.import ${full}`); run(rust, database, `.export ${exchanged}`);
  assert.deepEqual(await readFile(exchanged), await readFile(full));
  run(rust, database, "INSERT INTO people VALUES (129, 'extra', 0);");
  assert.equal(spawnSync(rust, [database, '--execute', `.export ${exchanged}`]).status, 2);
  assert.deepEqual(await readFile(exchanged), await readFile(full));
  // Compile every generated real-project starter to catch extraction errors.
  const projects = JSON.parse(await readFile('public/course/projects.json', 'utf8'));
  for (const project of projects) {
    execFileSync(rustc, ['--edition', '2021', '-A', 'warnings', '--emit=metadata', `public/course/${project.file}`, '-o', join(temp, project.id + '.rmeta')], { stdio: 'inherit' });
  }
  const archive = join(temp, 'files.zip'); await writeFile(archive, zipFiles([['café.tdb', new Uint8Array(await readFile(full))]]));
  execFileSync('python3', ['-c', 'import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.testzip() is None; assert z.namelist()==["café.tdb"]', archive]);
  console.log('C ↔ Rust TDB1 interop, 128-row boundary, project starters, and ZIP CRC validation passed.');
} finally { await rm(temp, { recursive: true, force: true }); }
