// Navigation only: no runner calls and no learner-storage migrations.
(() => {
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  function destination(items, done, last) {
    if (items.every((x) => done(x.id)))
      return { lesson: items[0], label: "Review" };
    const previous = items.find((x) => x.id === last);
    const lesson =
      previous && !done(previous.id)
        ? previous
        : items
            .slice(previous ? items.indexOf(previous) + 1 : 0)
            .find((x) => !done(x.id)) || items.find((x) => !done(x.id));
    return {
      lesson,
      label: previous || items.some((x) => done(x.id)) ? "Continue" : "Start",
    };
  }
  function structure(specs, chapters, partURL, home) {
    const groups = specs.map(([id, title, ids], i) => ({
      id,
      title,
      kind: "part",
      number: i + 1,
      href: partURL(id),
      summary: "",
      requirement: i
        ? "Builds on " + specs[i - 1][1] + "."
        : "No previous programming experience required.",
      chapters: ids.map((id) => chapters.find((c) => c.id === id)),
    }));
    for (const g of groups) {
      if (g.chapters.some((c) => !c)) throw Error("Unknown chapter in " + g.id);
      g.lessons = g.chapters.flatMap((c) => c.lessons);
      g.summary = g.chapters.map((c) => c.title).join(" · ");
      for (const c of g.chapters) {
        c.kind = "chapter";
        c.number = chapters.indexOf(c) + 1;
        c.parent = g;
        c.home = home;
      }
    }
    if (
      new Set(groups.flatMap((g) => g.chapters.map((c) => c.id))).size !==
        chapters.length ||
      groups.reduce((n, g) => n + g.chapters.length, 0) !== chapters.length
    )
      throw Error("Each chapter must belong to exactly one part");
    return groups;
  }
  const count = (g, done) => g.lessons.filter((l) => done(l.id)).length;
  const scope = (g, done) =>
    `${g.kind === "chapter" ? "Chapter" : "Part"} ${g.number} progress: ${count(g, done)} / ${g.lessons.length} lessons complete`;
  function trail(g, c, l, home) {
    const pieces = [`<a href="${escape(home)}">All parts</a>`];
    if (g)
      pieces.push(
        c
          ? `<a href="${escape(g.href)}">Part ${g.number}: ${escape(g.title)}</a>`
          : `<span aria-current="page">Part ${g.number}: ${escape(g.title)}</span>`,
      );
    if (c)
      pieces.push(
        l
          ? `<a href="${escape(c.href)}">Chapter ${c.number}: ${escape(c.title)}</a>`
          : `<span aria-current="page">Chapter ${c.number}: ${escape(c.title)}</span>`,
      );
    if (l)
      pieces.push(
        `<span aria-current="page">Lesson ${c.lessons.findIndex((x) => x.id === l.id) + 1} of ${c.lessons.length}</span>`,
      );
    return pieces.join(
      '<span class="hierarchy-separator" aria-hidden="true">/</span>',
    );
  }
  function cards(groups, done) {
    return groups
      .map(
        (g) =>
          `<article class="foundry-lab-card"><p class="lab-number">Part ${g.number}</p><h3><a href="${escape(g.href)}">${escape(g.title)}</a></h3><p>${g.chapters.length} chapters · ${g.lessons.length} lessons</p><p class="lab-requirement">${escape(g.requirement)}</p><p class="lab-progress" data-hierarchy-part-progress="${escape(g.id)}">${count(g, done)} / ${g.lessons.length} lessons complete</p><a class="lab-open" href="${escape(g.href)}">Open ${escape(g.title)} →</a></article>`,
      )
      .join("");
  }
  function list(c, done, active) {
    return `<ol class="hierarchy-lessons">${c.lessons.map((l, i) => `<li><a data-lesson-id="${escape(l.id)}" href="${escape(l.href)}" ${l.id === active?.id ? 'aria-current="page"' : ""}><span class="lesson-number">${String(i + 1).padStart(2, "0")}</span><span>${escape(l.title)}</span><span class="hierarchy-mark" data-hierarchy-complete="${escape(l.id)}">${done(l.id) ? "Complete" : ""}</span></a></li>`).join("")}</ol>`;
  }
  function chapter(c, done, active) {
    return `<section class="hierarchy-chapter" data-hierarchy-chapter="${escape(c.id)}"><h3><a href="${escape(c.href)}">Chapter ${c.number}: ${escape(c.title)}</a></h3><p data-hierarchy-progress="${escape(c.id)}">${scope(c, done)}</p>${list(c, done, active)}</section>`;
  }
  function overview(g, done, last, home) {
    const next = destination(g.lessons, done, last),
      part = g.kind === "chapter" ? g.parent : g;
    return `<nav class="hierarchy-trail" aria-label="Course location">${trail(part, g.kind === "chapter" ? g : null, null, home)}</nav><section class="foundry-lab-intro"><p class="lab-number">${g.kind === "chapter" ? "Chapter" : "Part"} ${g.number}</p><h1 tabindex="-1">${escape(g.title)}</h1><p>${escape(g.summary)}</p><p>${escape(g.requirement)}</p><p>${scope(g, done)}</p><a class="lab-primary" href="${escape(next.lesson.href)}">${next.label}: ${escape(next.lesson.title)} →</a></section><section class="foundry-lab-outline" aria-label="${g.kind === "chapter" ? "Lessons in this chapter" : "Chapters in this part"}"><h2>${g.kind === "chapter" ? "Lessons in this chapter" : "Chapters in this part"}</h2>${g.kind === "chapter" ? list(g, done) : g.chapters.map((c) => chapter(c, done)).join("")}</section>`;
  }
  function contents(groups, selected, active, done) {
    return `<a href="${escape(selected.href)}">Part ${selected.number} overview</a><label class="hierarchy-filter-label" for="hierarchy-filter">Show chapters in</label><select id="hierarchy-filter" data-hierarchy-filter><option value="all">All parts</option>${groups.map((g) => `<option value="${escape(g.id)}" ${g === selected ? "selected" : ""}>Part ${g.number}: ${escape(g.title)}</option>`).join("")}</select><div data-hierarchy-groups>${groups.map((g) => `<section data-hierarchy-part="${escape(g.id)}" ${g !== selected ? "hidden" : ""}><h2>Part ${g.number}: ${escape(g.title)}</h2>${g.chapters.map((c) => chapter(c, done, active)).join("")}</section>`).join("")}</div>`;
  }
  function adjacent(groups, g, l, home) {
    const i = g.lessons.findIndex((x) => x.id === l.id),
      next = groups[groups.indexOf(g) + 1];
    return [
      {
        ...(g.lessons[i - 1] || { href: g.href, title: g.title }),
        label: i ? "Previous lesson" : "Part overview",
      },
      {
        ...(g.lessons[i + 1] || next || { href: home, title: "Choose a part" }),
        label:
          i < g.lessons.length - 1
            ? "Next lesson"
            : next
              ? "Next part"
              : "All parts",
      },
    ];
  }
  function pager(groups, g, l, home) {
    return adjacent(groups, g, l, home)
      .map(
        (x) =>
          `<a href="${escape(x.href)}"><small>${x.label}</small><strong>${escape(x.title)}</strong></a>`,
      )
      .join("");
  }
  function refresh(root, groups, done) {
    for (const node of root.querySelectorAll(
      "[data-hierarchy-part-progress]",
    )) {
      const group = groups.find(
        (g) => g.id === node.dataset.hierarchyPartProgress,
      );
      if (group)
        node.textContent =
          count(group, done) +
          " / " +
          group.lessons.length +
          " lessons complete";
    }
    for (const node of root.querySelectorAll("[data-hierarchy-progress]")) {
      const group = groups
        .flatMap((g) => g.chapters)
        .find((c) => c.id === node.dataset.hierarchyProgress);
      if (group) node.textContent = scope(group, done);
    }
    for (const node of root.querySelectorAll("[data-hierarchy-complete]"))
      node.textContent = done(node.dataset.hierarchyComplete) ? "Complete" : "";
  }
  if (typeof document !== "undefined")
    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        !link ||
        new URL(link.href).href !== location.href
      )
        return;
      const panel = link.closest("#outline,#course-contents,.contents-body");
      if (!panel) return;
      event.preventDefault();
      const trigger = document.querySelector(
        '[aria-controls="' + panel.id + '"]',
      );
      if (trigger) trigger.setAttribute("aria-expanded", "false");
      const contents = panel.closest(".contents");
      if (contents) contents.dataset.open = "false";
      else panel.hidden = true;
      const heading = [...document.querySelectorAll("h1")].find(
        (n) => !n.closest("[hidden]"),
      );
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    });
  if (typeof document !== "undefined")
    document.addEventListener("change", (event) => {
      if (!event.target.matches("[data-hierarchy-filter]")) return;
      const region = event.target.parentElement;
      for (const node of region.querySelectorAll("[data-hierarchy-part]"))
        node.hidden =
          event.target.value !== "all" &&
          node.dataset.hierarchyPart !== event.target.value;
    });
  globalThis.foundryHub = {
    escape,
    destination,
    structure,
    scope,
    trail,
    cards,
    overview,
    contents,
    adjacent,
    pager,
    refresh,
    chapterOutline: chapter,
  };
})();
