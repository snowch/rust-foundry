# Visual opportunities across the whole course

Reviewed on 25 November 2026 against `ea7cacffdd1080d23ed1c136d88c61d163aaab2f`. This extends the review beyond existing diagrams: 85 lessons have coverage records, including 8 newly illustrated lessons and 26 revised models.

Follow the [shared course-design guide](https://github.com/snowch/cuda-python-lab/blob/main/docs/course-design-guide.md). No dedicated UX or learning skill was available; this records equivalent design and learning reviews.

## Learning review

Look for references to shared objects, changing slots, exclusive bounds, call/return state, alternative branches, dependency edges, occupancy thresholds and publication/retention boundaries. Add a model when it answers a named question more directly than code/output alone. Keep simple syntax, API lookup and one-step results concise. The JSON companion quotes the passage, pins the starter source, and records each selected question, parts, connections, values, units and assumptions. Keep prerequisite definitions visible. Static models explicitly describe the supplied example, not arbitrary source edits.

## Presentation review

Before: spatial relationships were sometimes encoded in prose cards, small labels or a differently sized example. After: stable indexed cells for storage/ranges, converging name-to-object edges for aliases, actual graph/tree links, explicit alternatives, and labelled dependency tables. Essential model labels use live text at 16px or larger. Use theme roles and text/shape cues as well as color. Retain local scroll only where needed; never shrink the whole model to conceal small type.

## Reading order and scope

Keep the course’s existing reading order and compact lesson navigation. Put models next to the worked explanation/result without moving the editor into another page. Models never execute code, modify source/Input, write storage or mark completion. Keep the existing fgets interaction in C. A model can replace repeated relationship narration; it does not replace preconditions, definitions or caveats.

## Curated additions and revisions

| Lesson | Decision | Question answered |
| --- | --- | --- |
| [Store a fixed-size sequence](https://snowch.github.io/rust-foundry/#course/arrays) | Revised | Why does second(values) return 20? |
| [Follow a moved String](https://snowch.github.io/rust-foundry/#course/moves) | Revised | Which binding owns the String at each boundary? |
| [Clone deliberately](https://snowch.github.io/rust-foundry/#course/clone) | Revised | Why does appending Jr leave the original Ada unchanged? |
| [Read a String without taking it](https://snowch.github.io/rust-foundry/#course/references) | Revised | Why can main still print name after name_length(&name)? |
| [Change through one mutable borrow](https://snowch.github.io/rust-foundry/#course/mutable) | Revised | Why does score progress from 10 to 15 to 20? |
| [Read a view of text with &str](https://snowch.github.io/rust-foundry/#course/text-slices) | Added | How can text_length read owned.as_str() without consuming owned? |
| [Distinguish bytes from letters](https://snowch.github.io/rust-foundry/#course/unicode) | Revised | Which two bytes encode the final é? |
| [Read through a shared borrow](https://snowch.github.io/rust-foundry/#course/shared) | Added | Why does the final print still include café? |
| [Borrow part of an array](https://snowch.github.io/rust-foundry/#course/borrowed-slices) | Revised | Why is the subrange sum 50 while the printed full-array sum is 60? |
| [Represent alternatives](https://snowch.github.io/rust-foundry/#course/enums) | Revised | Which payload can the selected match arm read? |
| [Separate success from failure](https://snowch.github.io/rust-foundry/#course/result-basics) | Revised | Why must the zero-ID case not be used as a successful ID? |
| [Turn overflow into a result](https://snowch.github.io/rust-foundry/#course/checked-arithmetic) | Added | Why does u32::MAX + 1 become an error instead of a wrapped success? |
| [Propagate with ?](https://snowch.github.io/rust-foundry/#course/question-mark) | Added | Which step is skipped when parsing a fails? |
| [Validate before you mutate](https://snowch.github.io/rust-foundry/#course/atomic-change) | Added | Why does a rejected empty replacement preserve Ada? |
| [Keep sorted, unique rows](https://snowch.github.io/rust-foundry/#course/vectors) | Revised | Why does inserting 3 into [1,5] preserve sorted order? |
| [Describe where a borrow comes from](https://snowch.github.io/rust-foundry/#course/lifetimes) | Added | Why can longer return Grace without allocating a new String? |
| [Implement binary search](https://snowch.github.io/rust-foundry/#course/alg-search) | Revised | Why is 23 found at the original index 5? |
| [Insertion sort and a sorted-prefix invariant](https://snowch.github.io/rust-foundry/#course/alg-sort) | Revised | Where is key 5 while 9 and 7 shift right? |
| [Recursive algorithms and stack cost](https://snowch.github.io/rust-foundry/#course/alg-recursion) | Revised | Why does factorial(6) return 720? |
| [Linked lists and owned links](https://snowch.github.io/rust-foundry/#course/alg-lists) | Revised | Which nodes are reused when 3 is prepended? |
| [Stacks: validate nested delimiters](https://snowch.github.io/rust-foundry/#course/alg-stacks) | Revised | Why does { [ ( ) ] } finish with an empty stack? |
| [Queues: first in, first out](https://snowch.github.io/rust-foundry/#course/alg-queues) | Revised | Why must 20 leave before the newly added 30? |
| [Binary search trees and height](https://snowch.github.io/rust-foundry/#course/alg-trees) | Revised | Why does in-order traversal return [1,2,3,5,7]? |
| [Graphs and breadth-first search](https://snowch.github.io/rust-foundry/#course/alg-graphs) | Revised | Why is vertex 4 two edges away from vertex 0? |
| [Encode a number explicitly](https://snowch.github.io/rust-foundry/#course/little-endian) | Revised | How do four chosen bytes reconstruct 258? |
| [Reject short input safely](https://snowch.github.io/rust-foundry/#course/decode) | Added | Why must the short-input cases return an error before decoding? |
| [Stop a missing calculation with ?](https://snowch.github.io/rust-foundry/#course/option-propagation) | Added | Why is the oversized record count None? |
| [Address fixed-size pages](https://snowch.github.io/rust-foundry/#course/page-layout) | Revised | Why is page 1 accepted while page 2 is outside a 512-byte file? |
| [Seek through a B+ tree](https://snowch.github.io/rust-foundry/#course/bplus-lookup) | Revised | Why does key 15 select child 1? |
| [Split, merge, and preserve invariants](https://snowch.github.io/rust-foundry/#course/rebalance) | Revised | Where does the copied separator 5 belong? |
| [Stage changes before publishing](https://snowch.github.io/rust-foundry/#course/staging) | Revised | Why does stage(&committed,3) leave committed as [1,2]? |
| [Rollback discards the candidate](https://snowch.github.io/rust-foundry/#course/rollback) | Revised | Why does committed remain [1] after rollback? |
| [Record intent before installing pages](https://snowch.github.io/rust-foundry/#course/journal) | Revised | Why is prepared discarded while committed is redone? |
| [Save files without overwriting another tab](https://snowch.github.io/rust-foundry/#course/browser-storage) | Revised | Why does expected=3/current=4 reject the update? |

## Complete coverage

See [all per-lesson decisions, passages and model specifications](visual-opportunities.json). “Keep prose” means no additional visual is selected for that focused objective in this pass; it is not a claim that no possible illustration could help. Existing figures outside the changed set remain available.

## Verification

Build, toolchain integrity/static checks, all 129 tests, native Rust and C/Rust TDB1 interchange tests passed. Real browser course checks cover all 85 lesson routes, inline editors, persistent TinyDB, recovery, revision conflicts, quota fallback and edited Rust. Shared-runner/offline/restart checks and the navigation suite passed. The dedicated figure check passed for 34 models across 204 viewport/theme states, with readable labels, text equivalents, valid byte groups/edges and no automatic compiler startup. These checks do not measure comprehension.
