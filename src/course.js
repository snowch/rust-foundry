import { course, chapters, ownershipSteps, courseEdition } from './course-data.js';
import { element as el, button, codeBlock, download } from './dom.js';
import { createLessonRunner } from './lesson-runner.js';
import { createConceptDiagram } from './concept-diagrams.js';
import { experimentEdits, labEdits, exerciseInstruction } from './experiments.js';
const prefix = `rust-foundry-course-v${courseEdition}:`;
const volatile = new Map();
const read = key => { if (volatile.has(key)) return volatile.get(key); try { return localStorage.getItem(prefix + key) === 'true'; } catch { return false; } };
const write = (key, value) => { volatile.set(key, value); try { localStorage.setItem(prefix + key, String(value)); return true; } catch { return false; } };
export function markPractice(id) { const persisted = write(`practice:${id}`, true); window.dispatchEvent(new Event('course-progress')); return persisted; }

export function initCourse({ openLab, canRun, unsupported }) {
  const root = document.getElementById('course-view');
  let active, rendered = false, runners = [];
  const link = (text, hash, className) => { const a = el('a', text, className); a.href = hash; return a; };
  const members = chapter => course.filter(x => x.chapter === chapter);
  const tally = (lessons, kind) => lessons.filter(x => read(`${kind}:${x.id}`)).length;
  function fitMenu(allowScroll = false, opening = false) {
    const bar = root.querySelector('.lesson-position');
    if (!bar || (!opening && !bar.querySelector(':scope > details[open]'))) return;
    const viewportBottom = (window.visualViewport?.offsetTop || 0) + (window.visualViewport?.height || innerHeight);
    if (allowScroll && bar.getBoundingClientRect().bottom > viewportBottom - 160) bar.scrollIntoView({ block: 'start', behavior: 'instant' });
    bar.style.setProperty('--lesson-menu-height', `${Math.max(0, viewportBottom - bar.getBoundingClientRect().bottom - 12)}px`);
  }
  function updateProgress() {
    root.querySelectorAll('.progress-copy').forEach(node => { node.textContent = `${tally(course, 'read')} / ${course.length} read · ${tally(course, 'practice')} / ${course.length} practice checks passed.`; });
    root.querySelectorAll('[data-chapter-progress]').forEach(node => {
      const lessons = members(node.dataset.chapterProgress);
      node.textContent = `${tally(lessons, 'read')} / ${lessons.length} read · ${tally(lessons, 'practice')} / ${lessons.length} practiced`;
    });
    root.querySelectorAll('[data-lesson-progress]').forEach(node => {
      const id = node.dataset.lessonProgress;
      node.textContent = `${read(`read:${id}`) ? '✓ Read' : 'Unread'} · ${read(`practice:${id}`) ? '✓ Practice passed' : 'Practice not passed'}`;
    });
    root.querySelectorAll('[data-read-toggle]').forEach(node => { node.textContent = read(`read:${node.dataset.readToggle}`) ? '✓ Read · mark unread' : 'Mark reading complete'; });
    root.querySelectorAll('[data-practice-status]').forEach(node => { node.textContent = read(`practice:${node.dataset.practiceStatus}`) ? '✓ Practice check passed' : 'Practice check not passed yet'; });
    root.querySelectorAll('[data-chapter-meter]').forEach(node => { node.value = tally(members(node.dataset.chapterMeter), 'read'); });
  }
  const progress = id => { const node = el('small', undefined, 'lesson-progress-label'); node.dataset.lessonProgress = id; return node; };
  function chapterLinks(chapter, currentId) {
    const list = el('ol', undefined, 'chapter-lesson-list');
    for (const [i, lesson] of members(chapter.id).entries()) {
      const item = el('li'), a = link('', '#course/' + lesson.id, 'chapter-lesson');
      const title = el('span', `${i + 1}. ${lesson.title}`, 'chapter-lesson-title');
      if (lesson.id === currentId) { a.setAttribute('aria-current', 'page'); title.append(el('strong', 'You are here', 'current-lesson-badge')); }
      a.append(title, progress(lesson.id)); item.append(a); list.append(item);
    }
    return list;
  }
  function outline(chapter) {
    const details = el('details', undefined, 'outline-disclosure'); details.id = 'chapter-contents';
    const summary = el('summary', 'Outline'); summary.setAttribute('aria-label', 'Course outline'); details.append(summary);
    const panel = el('div', undefined, 'course-outline lesson-menu');
    const navigation = el('nav'); navigation.setAttribute('aria-label', 'Lessons in this chapter');
    const copy = el('p', undefined, 'chapter-progress-copy'); copy.dataset.chapterProgress = chapter.id;
    const meter = el('progress'); meter.max = members(chapter.id).length; meter.dataset.chapterMeter = chapter.id; meter.setAttribute('aria-label', 'Chapter reading progress');
    navigation.append(el('p', `CHAPTER ${chapter.number}`, 'eyebrow'), el('h2', chapter.title), copy, meter, chapterLinks(chapter, active.id), el('p', '', 'progress-copy'));
    const all = el('details', undefined, 'all-chapters'); all.append(el('summary', `All ${chapters.length} chapters`));
    const chaptersNav = el('nav'); chaptersNav.setAttribute('aria-label', 'All course chapters');
    for (const item of chapters) {
      const a = link(`${item.number}. ${item.title}`, '#course/' + members(item.id)[0].id);
      if (item.id === chapter.id) a.className = 'current-chapter'; chaptersNav.append(a);
    }
    all.append(chaptersNav); panel.append(navigation, all, link('← Course overview', '#course')); details.append(panel); return details;
  }
  function position(chapter, lesson) {
    const index = members(chapter.id).indexOf(lesson);
    const bar = el('nav', undefined, 'lesson-position'); bar.setAttribute('aria-label', 'Your course position');
    const copy = el('p', `Chapter ${Number(chapter.number)} of ${chapters.length}`, 'chapter-position');
    const selection = el('div', undefined, 'position-select-label'), select = el('select'); select.setAttribute('aria-label', 'Lesson in this chapter');
    const current = el('option', `Lesson ${index + 1} of ${members(chapter.id).length}`); current.value = ''; current.disabled = true; current.selected = true; select.append(current);
    for (const [i, member] of members(chapter.id).entries()) { const option = el('option', `${i + 1}. ${member.title}${member.id === lesson.id ? ' · current' : ''}`); option.value = member.id; select.append(option); }
    select.onchange = () => { location.hash = '#course/' + select.value; }; selection.append(select); bar.append(copy, selection, outline(chapter));
    if (lesson.prerequisites.length) {
      const requirements = el('details', undefined, 'lesson-prerequisites');
      requirements.append(el('summary', 'Before this lesson'));
      const panel = el('div', undefined, 'lesson-menu');
      panel.append(el('p', 'This lesson builds on these earlier topics. Revisit any that are unfamiliar.'));
      const list = el('ul');
      for (const required of lesson.prerequisites) { const dependency = course.find(item => item.id === required); const li = el('li'); li.append(link(dependency.title, '#course/' + required)); list.append(li); }
      panel.append(list); requirements.append(panel); bar.append(requirements);
    }
    bar.querySelectorAll(':scope > details').forEach(details => {
      details.querySelector('summary').onclick = () => { if (!details.open) fitMenu(true, true); };
      details.ontoggle = () => {
        if (!details.open) return;
        bar.querySelectorAll(':scope > details').forEach(other => { if (other !== details) other.open = false; });
        fitMenu(true);
      };
    });
    return bar;
  }
  function overview() {
    const intro = el('article', undefined, 'course-overview');
    intro.append(el('p', 'Start with a three-line Rust program. No programming, Rust, or SQL experience is required. Run and edit code in each lesson, then use what you learn to explore a small database.'));
    let previous;
    try { previous = course.find(x => x.id === localStorage.getItem(prefix + 'last-lesson')); } catch { /* Optional resume storage. */ }
    const resume = el('section', undefined, 'resume-card');
    resume.append(link(`${previous ? 'Continue' : 'Start'}: ${(previous || course[0]).title} →`, '#course/' + (previous || course[0]).id, 'button primary'), el('p', 'The first run downloads about 58 MB of compiler files. Your browser compiles and runs the source locally.')); intro.append(resume);
    intro.append(el('p', `${course.length} lessons across ${chapters.length} chapters`, 'course-size'));
    intro.append(previousEdition());
    for (const chapter of chapters) {
      const card = el('section', undefined, 'chapter-card'), count = el('p', undefined, 'chapter-progress-copy'); count.dataset.chapterProgress = chapter.id;
      card.append(el('h2', `${chapter.number} · ${chapter.title}`), el('p', chapter.summary), count, chapterLinks(chapter)); intro.append(card);
    }
    const archive = link('Download all starters, references, and TinyDB projects ↓', './course/rust-foundry-course.zip'); archive.download = ''; intro.append(archive); root.append(intro);
  }
  function previousEdition() {
    const box = el('details', undefined, 'previous-edition');
    box.append(el('summary', 'Download drafts and marks from the previous edition'));
    box.append(el('p', 'This edition tracks reading and practice separately. Open Editor tools on a lesson to manage the current draft. Earlier drafts have their own download beside the worked code or practice editor.'));
    const previous = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('rust-foundry-course-v1:') || key.startsWith('rust-foundry-lesson-draft-v1:') || key === 'rust-foundry-mvp-v1') previous[key] = localStorage.getItem(key);
      }
    } catch { /* A blocked browser still offers the new course. */ }
    if (Object.keys(previous).length) box.append(button('Download previous-edition work .json', () => download(JSON.stringify(previous, null, 2), 'rust-foundry-previous-edition.json', 'application/json')));
    return box;
  }
  function render(id) {
    const next = course.find(x => x.id === id);
    if (rendered && active?.id === next?.id) { updateProgress(); return; }
    runners.forEach(runner => runner.dispose()); runners = []; active = next; rendered = true; root.replaceChildren();
    document.title = active ? `${active.title} · Chapter ${Number(chapters.find(x => x.id === active.chapter).number)} — Rust Foundry` : 'Rust Foundry — learn Rust, build a database';
    const header = el('header', undefined, `course-heading${active ? ' lesson-heading' : ''}`);
    if (active) {
      const chapter = chapters.find(x => x.id === active.chapter), crumbs = el('nav', undefined, 'course-breadcrumb'); crumbs.setAttribute('aria-label', 'Breadcrumb');
      crumbs.append(link('Course', '#course'), el('span', '/'), el('span', `${chapter.number}. ${chapter.title}`)); header.append(crumbs);
    }
    header.append(el('h1', active ? active.title : 'Learn Rust and build a database'));
    if (active) {
      const goal = el('p', undefined, 'lesson-goal'); goal.append(el('strong', 'Goal: '), document.createTextNode(active.objective)); header.append(goal);
      if (!active.prerequisites.length) header.append(el('p', 'Start here. No previous programming experience needed.', 'entry-requirement'));
    }
    if (!active) header.append(el('p', '', 'progress-copy'));
    root.append(header);
    if (!active) { overview(); updateProgress(); return; }
    const lesson = active, index = course.indexOf(lesson), chapter = chapters.find(x => x.id === lesson.chapter);
    try { localStorage.setItem(prefix + 'last-lesson', lesson.id); } catch { /* Optional resume state. */ }
    root.append(position(chapter, lesson));
    const body = el('div', undefined, 'course-body'), article = el('article', undefined, 'reading'); body.append(article); root.append(body);
    lesson.explain.forEach(text => article.append(el('p', text)));
    const diagram = createConceptDiagram(lesson);
    if (diagram) article.append(diagram);
    const createRunner = mode => {
      const runner = createLessonRunner({ lesson, mode, unsupported, canRun: () => !runners.some(item => item.isBusy()) && canRun(), onPass: () => markPractice(lesson.id) }); runners.push(runner); return runner;
    };
    const worked = createRunner('worked');
    const [before, after, observe] = experimentEdits[lesson.id];
    const starterInstructions = el('p');
    starterInstructions.append('The worked editor opens with ', el('code', 'main.rs'), '. If you have a saved edit, choose Editor tools → Restore starter. Predict the output, then choose Run example.');
    const editInstructions = el('p');
    editInstructions.append('In that same editor, replace the code under Find with the code under Replace with, then choose Run example again.');
    const edit = el('div', undefined, 'experiment-edit');
    edit.append(codeBlock(before.trim(), 'Find'), codeBlock(after.trim(), 'Replace with'));
    article.append(el('h2', 'Run the starter and try a change'), starterInstructions, editInstructions, edit, el('p', observe), worked.root);
    const expected = el('details', undefined, 'expected-output'); expected.id = 'expected-output';
    expected.append(el('summary', 'Starter result and practice output target'), codeBlock(lesson.expected)); article.append(expected);
    const steps = el('ol'); lesson.walkthrough.forEach(text => steps.append(el('li', text))); article.append(el('h2', 'Read the starter step by step'), steps, el('h3', 'Common mistake'), el('p', lesson.pitfall, 'callout'));
    if (lesson.showOwnershipWalkthrough) {
      const walk = el('section', undefined, 'ownership-walk'); let step = 0;
      const update = () => {
        const state = ownershipSteps[step]; walk.replaceChildren(el('h3', 'Follow ownership, step by step'), el('p', 'This is an annotated example, independent of your edited program.'), el('p', `Step ${step + 1} / ${ownershipSteps.length} · owner: ${state.owner}`), codeBlock(state.line), el('p', state.access), el('p', state.state));
        const row = el('div', undefined, 'reading-actions'), previous = button('Previous step', () => { step--; update(); }), next = button('Next step', () => { step++; update(); }); previous.disabled = step === 0; next.disabled = step === ownershipSteps.length - 1; row.append(previous, next); walk.append(row);
      }; update(); article.append(walk);
    }
    const quiz = el('fieldset', undefined, 'prediction'); quiz.append(el('legend', 'Check your understanding'), el('p', lesson.question));
    const feedback = el('p'); feedback.setAttribute('role', 'status');
    lesson.choices.forEach((choice, i) => quiz.append(button(choice, () => { feedback.textContent = `${i === lesson.answer ? 'Correct.' : 'Try again.'} ${lesson.feedback}`; feedback.className = i === lesson.answer ? 'passed' : 'check-neutral'; }))); quiz.append(feedback); article.append(quiz);
    const practice = el('section', undefined, 'lesson-practice'); practice.id = 'lesson-practice';
    practice.append(el('h2', 'Practice'), el('p', exerciseInstruction(lesson)));
    const check = el('p');
    check.append(lesson.checkType === 'assertions' ? 'Run checks executes the assertions in main.rs and compares the printed result. ' : 'Run checks compares the printed result. ',
      button('Show practice output target', () => { expected.open = true; expected.querySelector('summary').focus(); }));
    practice.append(check);
    const exercise = createRunner('exercise'); practice.append(exercise.root);
    const practiceStatus = el('p', undefined, 'practice-pass-status'); practiceStatus.dataset.practiceStatus = lesson.id; practice.append(practiceStatus);
    lesson.hints.forEach((hint, i) => { const details = el('details', undefined, 'hint'); details.append(el('summary', `Hint ${i + 1}`), el('p', hint)); practice.append(details); });
    const reference = el('details', undefined, 'hint reference-solution'); reference.append(el('summary', 'Reference solution · reveal when you need it'));
    let referenceRunner;
    reference.ontoggle = () => { if (reference.open && !referenceRunner) { referenceRunner = createRunner('reference'); reference.append(referenceRunner.root); } };
    practice.append(reference); article.append(practice);
    if (lesson.lab) {
      const [original, replacement, evidence] = labEdits[lesson.id];
      const lab = el('section', undefined, 'lab-card');
      const initial = el('details'); initial.append(el('summary', 'Inspect the prepared script'), codeBlock(lesson.lab.script, 'SQL and TinyDB commands'));
      lab.append(el('h2', 'Try it on TinyDB files'), el('p', `Open the workspace to load the script and ${lesson.lab.filename} into the editor. If a file with that name appears under Workspace files, use an unused filename for this run. Choose Run statements to run the starter.`),
        el('p', 'For the comparison, change Database filename to another unused name. Replace the indicated text in TinyDB script, then choose Run statements again.'), codeBlock(original, 'Find in TinyDB script'), codeBlock(replacement, 'Replace with'), el('p', evidence),
        button('Open workspace with this script', () => openLab(lesson.lab), 'button secondary'), initial);
      if (lesson.lab.recoveryScript) lab.append(el('p', 'After each simulated interruption, keep the filename. Replace TinyDB script with these lines and choose Run statements to reopen that file:'), codeBlock(lesson.lab.recoveryScript));
      article.append(lab);
    }
    const downloads = el('details', undefined, 'hint lesson-downloads'); downloads.append(el('summary', 'Download the starter and reference'), button('Download starter .rs', () => download(lesson.starter, `${lesson.id}-starter.rs`, 'text/plain')), button('Download reference .rs', () => download(lesson.solution, `${lesson.id}-reference.rs`, 'text/plain'))); article.append(downloads);
    const finish = el('section', undefined, 'reading-completion'); finish.append(el('h2', 'Reading progress'), el('p', 'Mark this lesson when you finish reading. Practice checks have their own progress mark.'));
    const completionStatus = el('p'); completionStatus.setAttribute('role', 'status');
    const toggle = button('', () => {
      const persisted = write(`read:${lesson.id}`, !read(`read:${lesson.id}`)); updateProgress();
      completionStatus.textContent = persisted ? 'Reading mark saved.' : 'This mark lasts until the tab reloads or closes. Browser storage is unavailable.';
    }); toggle.dataset.readToggle = lesson.id; finish.append(toggle, completionStatus);
    const nav = el('nav', undefined, 'adjacent-lessons'); nav.setAttribute('aria-label', 'Adjacent lessons');
    if (index > 0) { const previous = course[index - 1]; nav.append(link(`← Previous lesson\n${previous.title}`, '#course/' + previous.id, 'adjacent-previous')); }
    if (index + 1 < course.length) {
      const next = course[index + 1], crossChapter = next.chapter !== lesson.chapter;
      nav.append(link(`${crossChapter ? `Next: chapter ${Number(chapters.find(x => x.id === next.chapter).number)}` : 'Next lesson'} →\n${next.title}`, '#course/' + next.id, 'adjacent-next'));
    } else nav.append(link('Course complete · return to overview →', '#course', 'adjacent-next'));
    finish.append(nav); article.append(finish); updateProgress();
  }
  window.addEventListener('storage', event => {
    if (event.key === null) { volatile.clear(); updateProgress(); }
    else if (event.key.startsWith(prefix)) { volatile.delete(event.key.slice(prefix.length)); updateProgress(); }
  });
  window.addEventListener('course-progress', updateProgress);
  window.addEventListener('resize', () => fitMenu());
  window.addEventListener('scroll', () => fitMenu(), { passive: true });
  window.visualViewport?.addEventListener('resize', () => fitMenu());
  document.addEventListener('pointerdown', event => {
    const bar = root.querySelector('.lesson-position');
    if (bar && !bar.contains(event.target)) bar.querySelectorAll(':scope > details[open]').forEach(details => { details.open = false; });
  });
  root.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const open = root.querySelector('.lesson-position > details[open]');
    if (open) { open.open = false; open.querySelector('summary').focus(); event.preventDefault(); }
  });
  return { render, isBusy: () => runners.some(item => item.isBusy()), suspend: () => runners.forEach(runner => runner.stop()) };
}
