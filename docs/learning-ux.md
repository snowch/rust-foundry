# Lesson flow and orientation

The learner should be able to explain, run, change, and test a small Rust
program without leaving its lesson. The standalone editor is a separate tool
for open-ended programs and complete TinyDB projects.

## Keep related information together

- Place editable worked code and its run controls inside the explanation.
- Show actual output and compiler/runtime messages below that same code.
- Reveal expected output on request, allowing a prediction before comparison.
- Put the starter, checks, hints, and reference in the practice section.
- Run the reference in its own card so it never replaces a learner's draft.
- Label stale output after edits; do not imply an earlier run checks new code.

## Make the course hierarchy visible

- Keep the chapter number/title and local lesson number visible while scrolling.
- Offer a native lesson chooser with every lesson in the current chapter.
- Highlight the current lesson with both an accessible current-page state and
  the words “You are here” in the chapter outline.
- Show chapter progress separately from overall course progress.
- Name the previous/next lesson and explicitly label a chapter transition.
- Provide an overview with all lesson titles and a resume link.

## Give progress a clear meaning

Running a worked or reference program does not complete reading or practice.
Practice passes only after a successful process exit and matching the supplied
expected output. Early starters change ordinary code; assertion-based checks
and TODO markers appear only after their own introductory lesson. Reading
completion remains an explicit choice. These are learning aids, not a secure
assessment system.

Updating progress, including changes from another tab, changes only progress
labels. It must not rebuild active editors, clear feedback, or move the reader.
Inline drafts use separate keys per edition, lesson, and mode. Earlier-edition
drafts are retained as downloads and never replace the revised beginner
examples. Unavailable storage is reported next to the draft. Lesson objectives
and prerequisite links appear before each worked example; the complete audit
is recorded in [curriculum-review.md](curriculum-review.md).

## Phone and tablet interaction

Use 18px prose, 17px code/results, 44px or larger editing and execution targets,
and a horizontally scrolling punctuation row. Keep long code inside its editor
rather than overflowing the document. The chapter outline collapses on narrow
screens; the lesson chooser remains visible. Cancel a run when its lesson is
left, and reuse the prepared compiler between lesson cards and the full editor.

## Verification

The real-browser course check covers every lesson, chapter-local positions,
inline first-run cancellation/retry, edited output, compile errors, failed and
passing practice, preserved editors/results on completion changes, navigation
across a chapter boundary, resume, persistent drafts, and compiler reuse.
Responsive checks cover 320, 390, 768, 1024, and 1280 pixel widths alongside the
existing persistent TinyDB workspace checks.
