# Managed Rust compiler and runtime

The [shared course guide](https://github.com/snowch/cuda-python-lab/blob/main/docs/course-design-guide.md), [offline/update design](offline-update-design.md) and this document describe reusable behavior. Implementation: `src/compiler.js`, `src/managed-runner.js`, `src/runner.js`, `src/loader.worker.js`, and `src/reading-state.js`.

## Ownership and resources

One page owns a prepared WebAssembly compiler module and SharedArrayBuffer-backed sysroot. Lesson editors and the full Rust editor reuse that preparation across hash routes. Each compilation still creates and terminates its own compiler/engine/thread worker tree; each program executes in a fresh, bounded WASI worker. This preserves fresh program state and the existing source/input/output limits and timeouts. A new tab prepares its own compiler. Ordinary reading downloads none of the compiler.

TinyDB statements run the bundled small WASI binary or a learner-installed binary and need no Rust compiler. Workspace files use revision-checked IndexedDB writes. Free memory terminates active jobs, releases the prepared compiler and cached bundled TinyDB bytes, and preserves source, results, saved files, unsaved workspace candidates and the learner-installed program.

The header reports Stopped, Starting, Ready, Compiling or Running. Explicit Start runner acknowledges the resource explanation. An implicit first Run opens an actual modal **before** compiler preparation, with a dimmed backdrop, Continue run and Runner settings. Escape cancels without starting the compiler; returning from settings never silently runs code. Header-started preparation must not produce a second introduction when Run is later selected. No toast or timer may hide this information.

The default idle limit is 30 minutes; choices are 5, 15, 30 and 60, persisted in browser storage. Count from the last completed run/preparation, never from merely opening settings. Check elapsed time again on visibility changes because a background tab can suspend timers. No resource numbers are displayed: browsers do not expose a reliable per-runner CPU percentage or total-memory measurement. A prepared compiler retains memory; CPU rises during compilation and execution.

## Failures and saved work

HTTP errors, integrity failures and missing compiler workers are preparation failures, not learner-code errors. Show a native modal describing the retry/reload action. Guard reload by saving a verified per-tab IndexedDB snapshot first; never erase an editor or restart while compilation, program execution, file import or workspace writes are active. The snapshot retains active editors, prediction, displayed results and provenance, compiled bytes and unsaved/custom TinyDB state. Ordinary Rust compiler messages and program failures stay next to their output and do not request a course repair.

Stopping or cancelling preparation keeps earlier output. An edited source labels earlier output clearly. Compiler preparation promises are shared, rejected jobs are cleared for retry, and finished worker trees cannot keep compiler references alive. Source keys remain backward compatible; full-editor saves merge changed lesson keys so independent tabs do not overwrite each other's drafts.

Before publishing, test header Start → Ready → editor Run with no second introduction; first implicit Run → cancel/settings/continue; stop during preparation and execution; warm runs; idle and explicit free/restart; ordinary compile error versus missing-runtime recovery; reload and cross-tab update with preserved work; and TinyDB execution without compiler download.
