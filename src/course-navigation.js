import { partGroups, chapterGroups, partFor } from "./course-structure.js";
import { element as el } from "./dom.js";
import { courseEdition } from "./course-data.js";
import { materialSymbol } from "./material-symbols.mjs";
export function courseNavigation({ active, progress }) {
  const part = partFor(active),
    chapter = chapterGroups.find((c) => c.id === active.chapter),
    root = el("section", undefined, "course-navigation"),
    row = el("div", undefined, "course-row"),
    toggle = el("button", undefined, "course-toggle");
  toggle.type = "button";
  toggle.id = "course-toggle";
  toggle.setAttribute("aria-controls", "course-contents");
  toggle.innerHTML = "Course contents " + materialSymbol("expand_more");
  const counter = el("span", "", "progress-copy"),
    crumbs = el("nav", undefined, "course-crumbs");
  crumbs.setAttribute("aria-label", "Course location");
  crumbs.innerHTML = foundryHub.trail(part, chapter, active, "#course");
  const panel = el("div", undefined, "shared-outline");
  panel.id = "course-contents";
  panel.hidden = true;
  toggle.setAttribute("aria-expanded", "false");
  const show = (open) => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  };
  toggle.onclick = () => show(panel.hidden);
  panel.innerHTML = foundryHub.contents(partGroups, part, active, (id) => {
    try {
      return (
        localStorage.getItem(
          `rust-foundry-course-v${courseEdition}:read:` + id,
        ) === "true"
      );
    } catch {
      return false;
    }
  });
  panel.querySelectorAll('[data-hierarchy-progress]').forEach(node=>{node.classList.add('chapter-progress-copy');node.dataset.chapterProgress=node.dataset.hierarchyProgress;});
  panel.querySelectorAll("[data-hierarchy-complete]").forEach((n) => {
    n.dataset.lessonProgress = n.dataset.hierarchyComplete;
  });
  panel.addEventListener("click", (event) => {
    if (
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey &&
      !event.altKey &&
      event.target.closest("a")?.getAttribute("href") === location.hash
    ) {
      event.preventDefault();
      show(false);
      const h = document.querySelector("#course-view h1");
      h.tabIndex = -1;
      h.focus();
    }
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      show(false);
      toggle.focus();
      event.preventDefault();
    }
  });
  row.append(toggle, counter, crumbs);
  root.append(row, panel);
  return root;
}
