# Rust Foundry course style

The [shared course design guide](https://github.com/snowch/cuda-python-lab/blob/main/docs/course-design-guide.md) is the source of the preferred visual and learning structure. Rust Foundry applies it to an existing beginner course: stable lesson URLs, editioned drafts, reading completion and separate practice checks remain intact.

The header contains Code runner, App status and the theme action. Existing Learn Rust, Rust editor and TinyDB workspace links remain below it because they open distinct working contexts. The course row combines Course lessons, manual completion count and chapter/current-lesson breadcrumbs. The outline expands in the page, uses ordinary numbered links, and filters by chapter to keep an 85-lesson course manageable. Escape closes it and returns focus. Opening the outline or changing its filter must not recreate an editor.

Use local IBM Plex Sans and Mono, readable text, 44-pixel controls, visible keyboard focus, calm green surfaces and official Material Symbols SVGs. Theme controls describe the action, persist the choice and initially follow the operating system. Code panels retain a dark, high-contrast surface in both themes. Prose has a readable measure; code, diagrams and output can use more width. On wide screens, the original source → compiler → output illustration sits beside the homepage introduction. It stacks underneath on narrow screens. Its accessible description and caption explain the compilation relationship rather than adding decoration.

A lesson presents its goal and prerequisites, explanation and question, a saved prediction, a concrete starter/edit/run comparison, observed output and interpretation, then practice. Keep the existing code and checks real. Successful execution, matching an original example and understanding the concept are different outcomes. Reading completion is a learner-selected checkbox; passing practice remains separately recorded. Neither is proof of learning effectiveness.

Each lesson ends with a References row for its actual Rust topics, short reminders and direct official documentation links, followed by completion and previous/next cards naming their destinations. References are optional; essential instructions stay visible. Solutions can nest a runnable reference because revealing an answer after attempting practice has a clear benefit. Preserve earlier-edition drafts and export controls.

Verify phone, tablet and wide layouts, both themes using the actual theme button, outline and dialog keyboard behavior, all authored routes, original code and suggested edits. Functional tests establish that the interface and examples work; they do not establish learning effectiveness.

The Foundry now uses the [focused lab-series hub](lab-series.md): numbered lab cards, scoped progress and stable lesson links.


## Foundry navigation

Use Course → Part → Chapter → Lesson. See the [navigation review](navigation-review.md)
for reading order, learner actions, compatibility and verification.
