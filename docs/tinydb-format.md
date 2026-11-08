# TinyDB storage and failure contracts

This is a bounded, single-writer teaching database implemented entirely in
`native/tinydb.rs`. No JavaScript SQL engine substitutes for the Rust program.
The browser uses the same program compiled to WASI WebAssembly. It is not a
production database or a complete SQL implementation.

## Schema and SQL

One `people` table: positive unique `u32 id`, a UTF-8 name of 1–31 bytes without
ASCII controls or DEL, and `u32 score`. Limits: 4,096 rows and 4,096 pages.
Identifiers and keywords are case insensitive; quoted text preserves case.
Use doubled single quotes inside SQL strings. Each SQL statement must be
complete on one input line and end with `;`. Multiple statements can share a
line. Metacommands occupy their own line; whole-line `--` comments are allowed.
Statements are limited to 4,096 bytes and 128 tokens.

```sql
INSERT INTO people VALUES (1, 'Ada', 90);
SELECT * FROM people;
SELECT COUNT(*) FROM people;
SELECT * FROM people WHERE id = 1;
SELECT * FROM people WHERE id >= 1 AND id <= 10 ORDER BY id;
UPDATE people SET name = 'Ada Lovelace', score = 95 WHERE id = 1;
DELETE FROM people WHERE id = 1;
BEGIN;
COMMIT;
ROLLBACK;
EXPLAIN SELECT * FROM people WHERE id = 1;
```

Rows are returned in ascending ID order. No joins, secondary indexes, schema
changes, arbitrary expressions, Cargo crates, or concurrent SQL transactions
are implemented. A statement error preserves the previous staged state and
leaves an explicit transaction active. Open transactions roll back at EOF.
In the browser, finish a transaction in the same Run script.

## TDB1 exchange format (C Foundry compatible)

Exactly eight header bytes:

| Offset | Length | Value |
| --- | --- | --- |
| 0 | 4 | ASCII `TDB1` |
| 4 | 1 | Version 1 |
| 5 | 1 | Row size 40 |
| 6 | 1 | Row count, 0–128 |
| 7 | 1 | Reserved, zero |

Exactly `count` records follow. Each record is an ID (`u32` little endian),
32 name bytes (UTF-8 terminated by a zero byte), then score (`u32` little
endian). Rust exports zero padding and sorted rows. The import accepts the C
row order, checks duplicate/zero IDs, names, exact length, and version.
`.export exchange.tdb` writes a separate exchange file. `.import filename`
replaces the candidate database after validating the complete imported file.
The current active database and its journal/temp filenames cannot be export
targets. TDB1 has no checksum or persisted index.

## RDB2 paged snapshot

All integers are little endian. A file contains exactly `page_count * 256`
bytes. Page IDs are zero-based. Page 0 is the header, never a tree node.

| Header offset | Length | Meaning |
| --- | --- | --- |
| 0 | 4 | ASCII `RDB2` |
| 4 | 1 | Version 1 |
| 6 | 2 | Page size, 256 |
| 8 | 4 | Root page ID |
| 12 | 4 | Total page count including header and free pages |
| 16 | 4 | Row count |
| 20 | 8 | Committed generation |
| 28 | 4 | Whole-file FNV-1a checksum, treating these four bytes as zero |

Data pages have type at byte 0 and a `u16` count at byte 2. Leaf type 1 stores
its next leaf ID at byte 4 (zero means none), then up to four 40-byte records
starting at byte 16. Branch type 2 counts children, stores up to four `u32`
separator keys at byte 16 and up to five child IDs at byte 32. Bytes 252–255
contain the FNV-1a checksum of bytes 0–251. A free page is entirely zero.

The B+ tree keeps data in leaves, unique ascending keys, exact separators
(minimum key of the right subtree), equal leaf depths, and a linked leaf
chain matching tree order. Non-root leaves hold 2–4 rows; non-root branches
have 3–5 children. A root branch has 2–5 children; an empty database has one
empty root leaf. Inserts split leaves/branches; deletes redistribute or merge,
collapse the root, and reuse free pages. Decoding validates all references,
reachability, occupancy, depth, ordering, row count, and leaf links before use.

All pages are loaded into memory. Commits rewrite a bounded snapshot; this
implementation does not include a buffer pool or incremental dirty-page IO.
FNV-1a (offset 2166136261, multiplier 16777619, wrapping `u32`) detects accidental
corruption. It provides no authentication against deliberate rewriting.

## RWL2 journal and recovery

`DATABASE.wal` contains a 32-byte header plus a complete RDB2 after-image:
magic `RWL2`, version at byte 4, prepared/committed flag 0/1 at byte 5,
reserved zero bytes 6–7, base generation at 8 (`u64`), target generation at 16
(`u64`), payload length at 24 (`u32`), and whole-journal FNV-1a at 28 (`u32`,
treating the checksum field as zero). Target must equal base + 1 and match the
validated snapshot generation.

Commit writes prepared journal → committed journal → main snapshot → removes
journal. Atomic writes use a newly created `.tmp` then rename; foreign temp
files are retained and block writing. Native Unix writes sync file and parent
directory. Wasm uses the virtual filesystem and does not call physical fsync.

On reopen, an uncommitted journal is discarded only when main generation
equals base. A committed journal installs over base, or verifies exact bytes
when target is already installed. Recovery then removes the journal. Invalid,
truncated, or conflicting journals are retained and reported. A real IO error
after the commit marker can mean an indeterminate client outcome; reopen to
recover before another write. This is a redo-after-image teaching protocol,
not an append-only production WAL or concurrent locking scheme.

`.crash prepare|commit|install` deterministically interrupts the next commit
with exit code 80. Reopen the file to exercise recovery. An unexpected native
process death during temp-file writing can leave a temp file that intentionally
requires inspection; the lab does not claim automatic recovery of every OS
failure. Native callers must serialize writers; generation checks catch stale
sequential sessions but are not an OS process lock.

## Browser persistence boundary

Each Run receives a private filesystem snapshot. After a normal process exit
(including nonzero exits and simulated interruption), the host validates file
limits and saves the complete result in one IndexedDB read/write transaction.
It compares the expected workspace revision in that same transaction. A stale
tab cannot overwrite another tab's saved files. Its candidate stays in memory
for download until saved files are explicitly reloaded. Stop, traps, output
overflow, and timeouts return no snapshot and retain previous saved files.

This browser boundary is distinct from Rust's journal stages. A simulated
interruption saves the journal and main file together; an actual tab kill
during the run leaves the previous IndexedDB snapshot. Browser storage can be
denied, evicted, or lost; no physical power-loss durability is promised.
Storage failure leaves candidate files downloadable. Limits: 32 flat files,
2 MiB per file, 8 MiB total, 100 KB input/output, five seconds per program.
The bundled TinyDB program downloads on demand without the full compiler.
Edited source is compiled by the shipped browser compiler and installed into
the workspace only by the learner's explicit button action.
