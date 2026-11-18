# Learner wording and interface review

The audit starts from the course’s stated entry point. A reader can begin with no programming, Rust, or SQL experience. The prerequisite sequence remains available beside each later lesson. The review covered the 85 lessons and their questions, feedback, figures, code, scaffold instructions, and outputs. It also covered the course overview, four standalone editor examples, TinyDB workspace, eight project starters, and their downloadable instructions.

## Changes after the opening review

- Put the prepared starter and literal comparison beside the runnable worked program. The two copyable snippets identify the line to find and what to replace it with. A question names the relevant output, compiler message, assertion, or returned Rust value.
- Identify the function around each unfinished instruction in practice. Separate understanding questions, practice output comparisons, source assertions, and compile or runtime errors. Keep the expected starter and practice target together under one descriptive disclosure.
- Label previous output when source, input, or database filename changes. Show Stop during an active run. Use normal Tab focus order, including Shift+Tab, and keep the keyboard shortcut to run and the touch indentation control.
- Put Restore starter, Undo restore, and downloads in Editor tools. Preserve existing draft keys, previous-edition downloads, and workspace revisions. If local storage refuses a replacement or undo write, retain the earlier durable copy and keep the latest source available in the tab for export. A valid current draft still opens if older archive data is corrupt.
- Identify which actions load SQL into the script and which run it. Confirm the comparison uses a fresh filename. The 14 lab variants name the relevant row, count, path, generation, or recovery message. The workspace’s file list supports importing and downloading actual file bytes.
- Keep project code, extra source inspection, and reference answers optional. Label browser journal interruption as a simulation that saves the resulting files at the workspace boundary. The native suite exercises additional file and failure cases.

## Functional evidence

- Native Rust compiled and ran all 85 worked programs and their 85 literal variants. This included the intended compiler diagnostics and program assertion failures.
- The native database suite passed 12 invariant tests, the C Foundry exchange against its pinned implementation, and all eight project starter compilations.
- All 14 TinyDB starter scripts and their documented changes ran in Chromium. This included the prepared and committed journal cases, opening a recovered file twice, and finding the renamed export and snapshot.
- Chromium exercised the production worker, lesson checks, exact legacy downloads, persisted drafts, compiler cancellation, and TinyDB recovery, stale-tab protection, and quota fallback. Tested 99 learner views at each of 320, 390, 820 and 1440 CSS pixels, across the light and dark themes, with no document overflow or page exceptions.
- Regression tests protect the durable draft when Restore or Undo succeeds in memory but a replacement write fails. Keyboard walkthroughs exercise the code editor and SQL example loader.

These checks establish functional behavior in the tested environments. Learning effectiveness and physical-device performance remain unmeasured.
