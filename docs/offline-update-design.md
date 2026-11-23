# Verified offline copies and updates

Rust Foundry uses the [shared course design guide](https://github.com/snowch/cuda-python-lab/blob/main/docs/course-design-guide.md) and the same verified release protocol as CUDA and C Foundry. Its additional constraint is cross-origin isolation: the threaded Rust compiler needs COOP/COEP even on GitHub Pages, which cannot supply those response headers itself.

## One service worker, one release protocol

`scripts/offline.mjs` finalizes Vite output into a SHA-256 release contract and immutable `releases/<id>/` tree. HTML pins scripts, styles and fonts; runtime URLs pin compiler parts, manifests, project starters and TinyDB programs. `scripts/service-worker.js` supplies verification, background downloads, range responses, controlled restart and COOP/COEP/CORP headers together. Never register a separate isolation worker over the offline worker.

`public/isolation.js` registers this worker. An initially unisolated document snapshots work and reloads once after control is established. It never begins the compiler download automatically. Replacing the legacy `coi-serviceworker.js` is a transport migration: only that older registration can request immediate activation, and already-isolated open pages are not reloaded. Old isolation scripts remain for old clients. Subsequent shared-worker updates follow the explicit safe-restart protocol.

Online navigations use the live page. A page's executable graph and runtime assets remain pinned to its release to avoid mixed versions. An offline navigation uses the verified complete saved release. Normal browsing does not download the complete compiler or claim that the course is saved offline.

## Course status and download states

Check release metadata automatically, without automatically downloading the whole course. App status distinguishes:

- Online course current, no complete copy: **Save offline copy**.
- Complete verified copy: **Downloaded and ready to use offline**.
- New release: **Update offline copy**, then **Restart to update** when staged and verified.
- Interrupted copy: retain the previous complete copy; offer resume/retry.
- Missing or corrupt bytes: clear the ready claim and offer repair while online.

The primary action and status must derive from the same verified state. A newer live page and an older saved copy can coexist; name them separately. Manual checks request fresh verification (`freshVerification: 1`), waiting for an older in-flight scan before scanning again. Older worker responses require two sequential status requests. Never infer completeness from commit equality, download percentage, or a historical completion marker.

A complete copy includes all lessons, local fonts/icons, references' local content, source archives/projects, TinyDB binaries and the compiler. External documentation still needs internet. Verify every file and write completion last. Failed or interrupted staging cannot replace or delete a usable prior copy. Worker-owned transfers can outlive the dialog; Android may suspend the process, so persist progress and resume verified bytes. Do not promise uninterrupted background execution.

## Restart and runtime recovery

Restart is a two-phase transaction across controlled windows: PREPARE_RESTART asks every window to save and confirm; only unanimous success allows activation and COMMIT_RESTART. Running jobs, unfinished file operations, composition, failed storage or an older window without the protocol veto restart. ABORT_RESTART unlocks all prepared windows and discards the pending restoration marker. Keep saved work and the previous release. Never use skipWaiting followed by an unconditional reload for normal updates.

`src/reading-state.js` writes and reads back a per-tab IndexedDB snapshot before marking it in sessionStorage. This avoids sessionStorage quotas for compiled binaries or unsaved workspace candidates. On reload, restore source/input, predictions, output and provenance, compiler messages, disclosure/quiz state, reading position, custom TinyDB bytes and unsaved candidate files; do not rerun code. Existing stable draft keys and workspace CAS revisions remain authoritative. A candidate restored after another window has written files must remain blocked/downloadable instead of overwriting those newer files. Ordinary durable workspace files stay in their existing store.

Missing runtime assets, HTTP 503, hashes and worker-load failures require a visible modal, even if the course itself opened. Save before offering reload, retain original output, and preserve predictions and files. Compile errors and program assertions are separate local outcomes. A repair error page is a last-resort escape route, not an acceptable proof that offline readiness works.

## Deployment compatibility

A new deployment keeps two previous immutable release trees. The first rollout also preserves the old Vite module/worker/font graph at its original hashed asset URLs. `scripts/retain-legacy-assets.mjs` fetches that graph and carries its byte hashes forward; it refuses an incompatible root compiler manifest change. This lets a previously open tab perform its first real compilation after deployment. Retained graphs are compatibility support and are excluded from the current offline download contract. Change or remove this bridge only with an explicit compatibility migration.

## Verification matrix

Use a Pages-style path on a server **without** isolation headers. Verify first visit and isolation reload; ordinary online reading; complete save, fresh revalidation and restart; genuine network-off navigation/reload/new tab and real Rust compilation/TinyDB statements; reopening the browser context; interrupted/cancelled transfers; corruption followed by fresh status and repair; newer release available while retaining older usable files; all-window restart veto/abort/commit; quota/blocked storage; HTTP503 preparation recovery; and old open-page cold compilation after replacing the deployment. Include saved edits, prediction, results, manual progress, custom TinyDB binary and workspace-file protection. Add screen sizes, themes and keyboard focus checks. Passing these checks demonstrates functional behavior, not learning effectiveness or a guarantee against operating-system eviction of browser storage.

First-visit isolation must wait for initial workspace storage to finish opening before saving and reloading; otherwise a direct `#workspace` visit can remain unisolated behind a misleading recovery dialog. During PREPARE_RESTART, lock all working views and navigation **before** the asynchronous snapshot write. Recheck the transaction token after saving: an expired request cannot relock a window or authorize a late restart. A verified snapshot temporarily permits reload past an unsaved-candidate beforeunload guard; an ordinary unsaved-window close still warns. Aborted restart markers and their orphan snapshots are discarded.

The automated journeys are `test/browser-smoke.py`, `test/browser-course.py`, `test/browser-shared.py` and `test/browser-updates.py`; the Node suite also runs the real production Wasm toolchain. Run compiler-heavy suites sequentially so unrelated cold preparations do not create artificial timeout failures. Native checks remain separate (`npm run test:native`).

Snapshot disclosure positions separately within each view. Hidden lesson content may not exist after a workspace reload; a single document-wide index can mistakenly apply a lesson’s closed state to the workspace tools. Verify a learner-installed TinyDB binary still runs after guarded reload and that its open tools remain open.

A retained root filename alone is insufficient: an already-installed worker may resolve an unlisted root asset inside its selected release directory. Publication therefore copies the legacy graph into the current and retained immutable trees too, outside their download contracts. New workers fetch undeclared, unpinned root assets at their original root URL; explicitly pinned and declared files continue to require their own release bytes. Test cold startup of an unlisted legacy worker after the new release has been selected, including its cross-origin isolation and SharedArrayBuffer access.
