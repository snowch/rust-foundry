# UX review


## Focused lab hubs — 2026-11-23

The previous entry page exposed the full curriculum before learners could choose a manageable sequence. The hub now offers 14 numbered labs containing the existing 85 lessons. Each lab has its own URL, prerequisite, progress, direct Start / Continue / Review and lesson list. Lesson routes, drafts and completion keys retain their existing identities. First and last lesson navigation returns to the lab.

Reading order is compact introduction → primary resume → lab choices → optional illustration on narrow screens. On wide screens the illustration sits beside the introduction. The lab list uses one/two/three columns at 390/820/1440 px; theme surfaces and keyboard focus use the shared design tokens. The reusable decision checks cover unfinished resume, advancing after completion, earlier gaps and review. Browser checks exercise actual completion controls, reload, Back/Forward and zero automatic runtime starts. Existing real compiler/offline/saved-work suites provide separate execution evidence. None of these checks establishes learning effectiveness.

A cold visit on GitHub Pages enables isolation by saving and reloading the reading window. Hub layout cleanup is kept separate from lesson runner snapshots, and stale prediction state is cleared on navigation. The mobile smoke journey covers the real isolation reload as well as compilation, cancellation and warm reuse; direct lesson-only checks would miss this path.


## Foundry navigation

Use Course → Part → Chapter → Lesson. See the [navigation review](navigation-review.md)
for reading order, learner actions, compatibility and verification.


## Visual opportunities, 25 November 2026

See [the whole-course visual review](visual-opportunities.md) and its source-pinned lesson records. This pass adds source-specific models as well as revising existing diagrams; the model renderer has no runner, navigation, draft or completion side effects.
