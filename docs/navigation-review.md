# Course navigation review

## Decision

Use **Course → Part → Chapter → Lesson**. A part is a substantial stage of the
course; a chapter groups closely related lessons. Reserve “lab” for the overall
interactive product or an individual experiment, rather than another navigation
level. This course has 4 parts and 85 lessons.

The header brand returns to **All parts**. Its subtitle names the current part.
The lesson's **Course contents** row shows All parts, numbered Part and Chapter
links, and the lesson's position within that chapter. The page heading names the
lesson. Progress explicitly names the part whose lessons it counts. Completion
is learner-controlled and does not imply passing practice checks.

Part overviews group lessons under linked, numbered chapter headings. Chapter
overviews list that chapter's lessons. The contents selector filters chapters
without navigating, running code or replacing the editor. Escape closes it and
returns focus to its trigger. Previous/Next lesson follow the original lesson
order within a part, including chapter boundaries. The first lesson links back
to its part; the final lesson offers **Next part**, which opens the following
part's overview. The final part returns to All parts. Navigation never marks a
lesson complete automatically.

## Before and after

Before: the same small group could be called a lab or chapter; progress lacked
scope, parent links were incomplete, and the brand could return only to the
current group. At a boundary, a generic Next link could lead back to its overview.

After: All parts → chosen part → chapter overview or lesson; the same parent
links remain visible while reading. A learner can identify the current part,
chapter and lesson position without opening the contents. Chapter filters leave
the learner's current activity in place. Large parts contain genuine existing
chapters, rather than empty extra levels. Lesson sequence, examples and stated
prerequisites are unchanged.

## Compatibility and runtime

Existing lesson links, original chapter/group overview links, draft keys,
predictions, completion marks and results remain valid. New part links are
additional entry points. Keep navigation metadata independent of runner
lifetime, Linux guest persistence and offline release selection. Do not create
a new storage namespace for a presentation change. Course contents are served
locally with the application; no new external assets are required.

## Review and checks

UX review: identify location, choose another lesson, inspect scoped progress,
resume saved work, cross a chapter/part boundary, return with Back/Forward.
Learning-design review: retain outcomes, prerequisites, lesson order, examples,
predictions, practice and reading marks; distinguish choosing a lesson from
executing its code. These functional checks do not establish learning
effectiveness.

Automated navigation checks cover every part and chapter, first/middle/final
lessons, legacy links, scoped progress, completion, saved predictions, filter
behaviour, keyboard closure, browser history, phone/tablet/desktop layouts and
both themes. Existing runtime and offline checks remain separate from these
navigation checks. See the repository test output for executed checks.

The [shared course design guide](https://github.com/snowch/cuda-python-lab/blob/main/docs/course-design-guide.md)
is the canonical style reference.
