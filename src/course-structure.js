import "./lab-hub.js";
import { course, chapters } from "./course-data.js";
export const chapterGroups = chapters.map((c) => ({
  ...c,
  href: "#lab/" + c.id,
  lessons: course
    .filter((l) => l.chapter === c.id)
    .map((l) => ({ ...l, href: "#course/" + l.id })),
}));
export const partGroups = foundryHub.structure(
  [
    ["language", "Learn Rust", ["start", "flow", "ownership", "borrowing"]],
    [
      "programs",
      "Build reliable Rust programs",
      ["model", "errors", "collections", "abstraction"],
    ],
    [
      "algorithms",
      "Algorithms and byte representations",
      ["algorithms", "bytes"],
    ],
    [
      "database",
      "Build and recover a database",
      ["database", "pages", "transactions", "recovery"],
    ],
  ],
  chapterGroups,
  (id) => "#part/" + id,
  "#course",
);
export const partFor = (lesson) =>
  chapterGroups.find((c) => c.id === lesson?.chapter)?.parent;
