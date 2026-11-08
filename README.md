# Rust Foundry

[Open Rust Foundry](https://snowch.github.io/rust-foundry/)

A browser-only Rust course with **12 chapters, 36 authored lessons, and eight
TinyDB implementation projects**. Start with values, ownership, borrowing,
structs, enums, errors, collections, traits, and byte codecs. Then build a
working database with SQL, paged storage, a B+ tree, transactions, and recovery.
Every lesson includes a complete runnable program, expected output, a
walkthrough, a pitfall, a prediction question with feedback, an experiment,
progressive hints, and a TODO exercise with assertions and a reference solution.
Explicit reading completion and passing an exercise are tracked separately.

The **TinyDB workspace** runs a bundled 842 KB Rust/Wasm program; it does not
download the full compiler. It saves real files in IndexedDB with a revision
check inside the write transaction, so a stale tab cannot overwrite newer
files. Import/export supports C Foundry's TDB1 format. Inspect actual pages,
index paths, and recovery journals. Edit the complete source or one of eight
project starters, compile it locally, then install that actual compiled program
into the workspace. Download the course archive for starters, references,
project instructions, and native invariant tests.

The Rust compiler,
LLVM backend, integrated LLD linker, standard library, and generated programs
run on the learner's device. The server only serves static files. No compiler
API, source upload, analytics, or runtime CDN requests are used.

## Run locally

Requires Node.js 20.19+ for serving/building. Target devices are phones and
tablets: Safari on iPhone/iPad and Chrome on Android. Current versions are
needed for the shared-memory and nested-worker APIs. Desktop browsers remain
useful for development. Physical-device verification is still outstanding.

```sh
npm ci
npm run dev
```

Vite sets the required cross-origin isolation headers. Choosing **Run code**
automatically loads the compiler on first use (57.8 MB compressed), shows
progress in the run toolbar, then compiles and executes the program. There is
no separate compiler setup button or readiness card. **Stop** can cancel the
first preparation as well as compilation/execution; choosing Run again retries.
Compiler assets are not requested before Run. Later runs reuse the prepared
compiler in tab memory, with integrity checks on the initial downloads.
Cache Storage reuses verified downloads where browser storage permits it.
Initialization still needs time to decompress and prepare the Wasm compiler.

For the production static build:

```sh
npm run build
npm run serve
```

Open the printed localhost URL. Loading `index.html` via `file://` will not work.

## Scope

- Real Rust 2021 single-file source, compiled to `wasm32-wasip1`.
- Standard input, stdout, stderr, compiler diagnostics, and output checks.
- Source editing, per-example/exercise/reference local drafts and completion, reset, `.rs` export,
  and `.wasm` export after successful compilation.
- A deliberate ownership error shows Rust's real E0382 diagnostic.
- Stop cancels compilation or execution by terminating its worker tree.
- Compilation: three-minute limit. Execution: five-second limit. Output and
  diagnostics: 100 KB. Source: 64 KB. Input: 100 KB.
- No Cargo dependencies, procedural macros, OS processes, or sockets. Source
  and reading/practice progress use localStorage; ordinary editor runs use a
  fresh filesystem. The TinyDB workspace explicitly mounts persistent files.
- TinyDB: 4,096 rows; 256-byte pages; unique B+ index on ID, leaf/branch splits,
  sibling redistribution, merges, free-page reuse, root collapse, point/range
  queries; staged transactions, rollback, autocommit, after-image journal redo.
- Workspace: 32 flat files, 2 MiB per file, 8 MiB total. IndexedDB saves the full
  file set atomically after normal exits, including nonzero exits. Stop, traps,
  and timeouts retain saved files. Storage errors keep candidates downloadable.

See [TinyDB's exact file formats and failure contracts](docs/tinydb-format.md).
This is bounded teaching code: pages load into memory, commits rewrite a full
snapshot, and native callers must serialize writers. Browser journal crashes
are deterministic simulations, distinct from actual tab termination and the
IndexedDB save boundary. Browser storage may be evicted; export important files.

This is an experimental compiler distribution, not current stable Rust or a
full Cargo environment. The interface prioritizes phones and tablets, with
44px touch controls, 18px body text, 17px code/input/output, 16px buttons,
a punctuation keyboard row,
stacked panels up to 1024px, and a sticky run/stop bar with safe-area padding.
These changes are not a claim that compilation has passed on physical devices.
Memory usage is substantial: the raw
compiler is 95 MB, the sysroot is 74 MB, and compiler linear memory can grow to
1 GiB. The sysroot now uses one SharedArrayBuffer: archive entries are views,
worker messages share it without cloning it, and compiler files read those
views without another copy. The filesystem transport buffer is 64 MiB rather
than 128 MiB. This reduces avoidable copies; it does not bound total engine
memory or prevent a mobile OS from reclaiming a tab. Keep the page in the
foreground while compiling. A small program compiled in approximately 1.1
seconds in a Chromium browser check after fixing a runtime delay. The original
approximately 56-second result included an unconditional one-second pause on
each descriptor-map update in the pinned WASI shim. The Vite build replaces
that single delay with a microtask yield and retains the atomic mapping and
acknowledgement protocol. Its exact-match patch fails the build on an unexpected
runtime distribution. Compiler download/preparation is measured separately;
performance still depends on browser and hardware.

## Architecture

`src/loader.worker.js` loads same-origin gzip parts, checks their SHA-256 hashes,
prepares the Wasm compiler module, and extracts its standard library. Toolchain
data stays in tab memory until the tab closes; verified compressed downloads
are cached when possible.

`src/engine.worker.js` owns a fresh in-memory filesystem. A separate compiler
worker uses `@oligami/browser_wasi_shim-threads` to run the patched compiler and
its threads. The compiler links Wasm directly. After compilation, that entire
worker tree is terminated. `src/run.worker.js` executes the resulting Wasm
with the browser WASI shim in a new filesystem. Editor files are temporary;
workspace runs mount and return a validated file snapshot. `src/runner.js`
coordinates the phases, cancellation, and deadlines. `src/workspace-store.js`
performs the revision comparison and complete-file save in one IndexedDB
transaction. The Rust program owns SQL parsing, indexing, formats, transactions,
and recovery; JavaScript supplies the filesystem and presentation. The UI checks
Promise.withResolvers as well as shared-memory and decompression APIs because
the pinned thread runtime requires it. It does not block by browser name.

The compiler stack follows the simpler Rubrc 1.1.2 architecture and is pinned
to `oligamiq/rust_wasm` v0.2.0, with matching compiler and target libraries.
Compiler assets and fonts are bundled with the site; nothing fetches code from
an external service at runtime. See `public/THIRD-PARTY-NOTICES.txt`.

## Static hosting

GitHub Pages deploys automatically from `main` through
`.github/workflows/pages.yml`. The workflow installs dependencies, checks
compiler assets, builds the site, runs real Wasm integration tests and a real
Chromium smoke test, and deploys
the `dist/` artifact. Pages must use **GitHub Actions** as its build source.

GitHub Pages does not apply the `_headers` file. A pinned, same-origin
`coi-serviceworker.js` adds COOP/COEP to responses in the browser instead. On
first visit, the page may reload once to enable cross-origin isolation and
SharedArrayBuffer. `coi-config.js` selects `require-corp`, including for Safari.
Service workers must be permitted, and the site should be opened directly
rather than in an embedded preview. All scripts, worker scripts, fonts and
compiler parts stay under the repository's `/rust-foundry/` path.

This service worker supplies headers; it does not compile remotely or proxy
source code. See the [upstream implementation](https://github.com/gzuidhof/coi-serviceworker).

Serve `dist/` over HTTPS with these headers on the HTML and worker scripts:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: same-origin
```

`public/_headers` contains these rules for hosts that support that format.
The UI checks isolation and reports an actionable error when it is missing.
Every toolchain asset is smaller than 8 MiB, so the site fits common per-file
static hosting limits. All application asset paths are relative.

The server is only a file host. A local build or CI build prepares the site;
learner programs are always compiled and run in their own browser.

## Verify

```sh
npm run build
npm run test:native
npm test
python test/browser-smoke.py
python test/browser-course.py
```

Tests also require stable `rustc` (or set `RUSTC`), a C compiler, curl, Python
Playwright, and Chromium. The native checks run randomized tree invariants,
transaction/recovery failpoints, corruption rejection, and C ↔ Rust exchange
against a SHA-pinned copy of C Foundry's actual source downloaded only for tests.
The website does not fetch that source. All 36 reference programs execute their
assertions, and TODO starters must fail. Browser checks cover every lesson,
separate progress, persistent files, journal recovery, downloads/imports,
stale-tab CAS, quota fallback, and executing learner-edited TinyDB source.

To rebuild the bundled TinyDB using the exact shipped browser compiler:

```sh
npm run build
npm run tinydb:build
npm run check
npm run build
```

Normal builds regenerate the downloadable course archive. The bundled Rust
source must exactly match the non-test portion of `native/tinydb.rs`; integrity
checks verify its source hash and the shipped Wasm hash. The learner source
fits the existing 64 KB editor limit. The archive also includes native tests.

The integration tests run the actual production loader, compiler, linker, and
runtime Wasm under Node workers using a browser-worker adapter. Outbound HTTP
is prohibited in that adapter. Tests cover real stdin and output, Unicode and
partial lines, ownership errors, nonzero exits, panics, runaway programs,
cancellation, output caps, and fresh program filesystems.

The Node checks do not establish browser compatibility. The additional
`test/browser-smoke.py` runs a real Chromium browser against static hosting
without server-supplied isolation headers. It checks service-worker startup,
SharedArrayBuffer availability, on-demand compiler loading, cancel/retry,
compiler reuse across runs, a real Rust compile and execution, touch
editing, and phone/tablet viewport sizes. Run it after building with
`python test/browser-smoke.py` (Python Playwright and Chromium required).
Set `BASE_URL` to test the deployed Pages URL.

Chromium viewport emulation does not establish Safari compatibility or the
memory limits of physical iPhone, iPad, Android phone, and Android tablet
devices. Those remain to be verified. Safari's underlying async Atomics, gzip streams, and nested worker
features are documented in [WebKit's Safari 16.4 release notes](https://webkit.org/blog/13966/webkit-features-in-safari-16-4/);
the pinned runtime additionally needs newer Promise APIs. API support alone
does not establish that the compiler fits a device's memory budget.
Physical-device Safari and Android verification is not claimed.

## Reproduce compiler assets

The vendored compressed files are tracked so normal builds need no compiler
bootstrap or external toolchain download. `npm run toolchain:fetch` regenerates
them from the two pinned upstream Brotli files after checking their SHA-256
hashes. The browser does not use Brotli: the fetched binaries are recompressed
as gzip, split into 8 MiB parts, and described by `public/toolchain/manifest.json`.

Dependency lifecycle scripts are disabled in `.npmrc` because the published
thread shim includes its compiled distribution and has a prepare script that
otherwise attempts to rebuild unpublished developer tooling.
