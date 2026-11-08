import { course, chapters, ownershipSteps } from './course-data.js';
import { element as el, button, codeBlock, download } from './dom.js';
import { createLessonRunner } from './lesson-runner.js';
const prefix = 'rust-foundry-course-v1:';
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
  function updateProgress() {
    root.querySelectorAll('.progress-copy').forEach(node => { node.textContent = `${tally(course, 'read')} / 36 read · ${tally(course, 'practice')} / 36 practice checks passed. Saved on this browser when storage permits.`; });
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
    const aside = el('aside', undefined, 'course-outline');
    const details = el('details', undefined, 'outline-disclosure'); details.id = 'chapter-contents'; details.open = matchMedia('(min-width: 1100px)').matches;
    details.append(el('summary', `Chapter ${Number(chapter.number)} · lessons and course outline`));
    const navigation = el('nav'); navigation.setAttribute('aria-label', 'Lessons in this chapter');
    const copy = el('p', undefined, 'chapter-progress-copy'); copy.dataset.chapterProgress = chapter.id;
    const meter = el('progress'); meter.max = members(chapter.id).length; meter.dataset.chapterMeter = chapter.id; meter.setAttribute('aria-label', 'Chapter reading progress');
    navigation.append(el('p', `CHAPTER ${chapter.number}`, 'eyebrow'), el('h2', chapter.title), copy, meter, chapterLinks(chapter, active.id), el('p', '', 'progress-copy'));
    const all = el('details', undefined, 'all-chapters'); all.append(el('summary', 'All 12 chapters'));
    const chaptersNav = el('nav'); chaptersNav.setAttribute('aria-label', 'All course chapters');
    for (const item of chapters) {
      const a = link(`${item.number}. ${item.title}`, '#course/' + members(item.id)[0].id);
      if (item.id === chapter.id) a.className = 'current-chapter'; chaptersNav.append(a);
    }
    all.append(chaptersNav); details.append(navigation, all, link('← Course overview', '#course')); aside.append(details); return aside;
  }
  function position(chapter, lesson) {
    const index = members(chapter.id).indexOf(lesson);
    const bar = el('nav', undefined, 'lesson-position'); bar.setAttribute('aria-label', 'Your course position');
    const copy = el('div'); copy.append(el('p', `Chapter ${Number(chapter.number)} of 12 · Lesson ${index + 1} of ${members(chapter.id).length}`, 'chapter-position'), el('p', chapter.title, 'position-title'));
    const selection = el('label', 'Current lesson', 'position-select-label'), select = el('select'); select.setAttribute('aria-label', 'Lesson in this chapter');
    for (const [i, member] of members(chapter.id).entries()) { const option = el('option', `${i + 1}. ${member.title}`); option.value = member.id; option.selected = member.id === lesson.id; select.append(option); }
    select.onchange = () => { location.hash = '#course/' + select.value; }; selection.append(select); bar.append(copy, selection); return bar;
  }
  function overview() {
    const intro = el('article', undefined, 'course-overview');
    intro.append(el('p', 'Learn real Rust on your phone or tablet. Read a short explanation, run and edit the example right in the lesson, then practise with assertions and hints. The final chapters build TinyDB: storage pages, a B+ tree, transactions, and recovery.'));
    let previous;
    try { previous = course.find(x => x.id === localStorage.getItem(prefix + 'last-lesson')); } catch { /* Optional resume storage. */ }
    const resume = el('section', undefined, 'resume-card');
    resume.append(el('p', previous ? 'PICK UP WHERE YOU LEFT OFF' : 'START HERE', 'eyebrow'), link(previous ? `Continue: ${previous.title} →` : 'Start: Give values names →', '#course/' + (previous || course[0]).id, 'button primary'), el('p', 'Examples run here in the lesson. The compiler downloads only on your first Run.')); intro.append(resume);
    for (const chapter of chapters) {
      const card = el('section', undefined, 'chapter-card'), count = el('p', undefined, 'chapter-progress-copy'); count.dataset.chapterProgress = chapter.id;
      card.append(el('h2', `${chapter.number} · ${chapter.title}`), el('p', chapter.summary), count, chapterLinks(chapter)); intro.append(card);
    }
    const archive = link('Download all starters, references, and TinyDB projects ↓', './course/rust-foundry-course.zip'); archive.download = ''; intro.append(archive); root.append(intro);
  }
  function render(id) {
    const next = course.find(x => x.id === id);
    if (rendered && active?.id === next?.id) { updateProgress(); return; }
    runners.forEach(runner => runner.dispose()); runners = []; active = next; rendered = true; root.replaceChildren();
    document.title = active ? `${active.title} · Chapter ${Number(chapters.find(x => x.id === active.chapter).number)} — Rust Foundry` : 'Rust Foundry — learn Rust, build a database';
    const header = el('header', undefined, 'course-heading');
    if (active) {
      const chapter = chapters.find(x => x.id === active.chapter), crumbs = el('nav', undefined, 'course-breadcrumb'); crumbs.setAttribute('aria-label', 'Breadcrumb');
      crumbs.append(link('Course', '#course'), el('span', ' / '), link(`${chapter.number}. ${chapter.title}`, '#course/' + members(chapter.id)[0].id)); header.append(crumbs);
    } else header.append(el('p', 'RUST, ONE SMALL PROGRAM AT A TIME', 'eyebrow'));
    header.append(el('h1', active ? active.title : 'From your first value to a database.'));
    if (!active) header.append(el('p', '', 'progress-copy'));
    root.append(header);
    if (!active) { overview(); updateProgress(); return; }
    const lesson = active, index = course.indexOf(lesson), chapter = chapters.find(x => x.id === lesson.chapter);
    try { localStorage.setItem(prefix + 'last-lesson', lesson.id); } catch { /* Optional resume state. */ }
    root.append(position(chapter, lesson));
    const body = el('div', undefined, 'course-body'), article = el('article', undefined, 'reading'); body.append(outline(chapter), article); root.append(body);
    lesson.explain.forEach(text => article.append(el('p', text)));
    const createRunner = mode => {
      const runner = createLessonRunner({ lesson, mode, unsupported, canRun: () => !runners.some(item => item.isBusy()) && canRun(), onPass: () => markPractice(lesson.id) }); runners.push(runner); return runner;
    };
    const worked = createRunner('worked');
    article.append(el('h2', 'Run and explore'), el('p', 'Predict what this program will do. Run it here, compare your output, then change one thing and run it again.'), worked.root);
    const expected = el('details', undefined, 'expected-output'); expected.append(el('summary', 'Expected output · compare after your run'), codeBlock(lesson.expected)); article.append(expected);
    const steps = el('ol'); lesson.walkthrough.forEach(text => steps.append(el('li', text))); article.append(el('h2', 'Walk through it'), steps, el('h3', 'Watch for this'), el('p', lesson.pitfall, 'callout'));
    if (lesson.chapter === 'ownership' || lesson.chapter === 'borrowing') {
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
    practice.append(el('h2', 'Your turn'), el('p', 'Implement the function in the starter. Keep the assertions in main: they check boundaries as well as the displayed result. Run the checks here when you are ready.'));
    const exercise = createRunner('exercise'); practice.append(exercise.root);
    const practiceStatus = el('p', undefined, 'practice-pass-status'); practiceStatus.dataset.practiceStatus = lesson.id; practice.append(practiceStatus);
    lesson.hints.forEach((hint, i) => { const details = el('details', undefined, 'hint'); details.append(el('summary', `Hint ${i + 1}`), el('p', hint)); practice.append(details); });
    const reference = el('details', undefined, 'hint reference-solution'); reference.append(el('summary', 'Reference solution · reveal when you need it'));
    let referenceRunner;
    reference.ontoggle = () => { if (reference.open && !referenceRunner) { referenceRunner = createRunner('reference'); reference.append(referenceRunner.root); } }; practice.append(reference, el('h3', 'Experiment'), el('p', lesson.experiment)); article.append(practice);
    worked.root.after(button('Try the exercise ↓', () => practice.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })));
    if (lesson.lab) {
      const lab = el('section', undefined, 'lab-card'); lab.append(el('h2', 'TinyDB project lab'), el('p', 'Use the persistent TinyDB workspace for this SQL script and its database files. The Rust examples above run here in the lesson. Re-running an INSERT into an existing lab file can report duplicate IDs.'), codeBlock(lesson.lab.script, 'SQL and TinyDB commands'), button('Open persistent TinyDB workspace', () => openLab(lesson.lab), 'button secondary'));
      if (lesson.lab.recoveryScript) lab.append(el('p', 'After the simulated interruption, run this second script to reopen and recover:'), codeBlock(lesson.lab.recoveryScript)); article.append(lab);
    }
    const downloads = el('details', undefined, 'hint lesson-downloads'); downloads.append(el('summary', 'Download the starter and reference'), button('Download starter .rs', () => download(lesson.starter, `${lesson.id}-starter.rs`, 'text/plain')), button('Download reference .rs', () => download(lesson.solution, `${lesson.id}-reference.rs`, 'text/plain'))); article.append(downloads);
    const finish = el('section', undefined, 'reading-completion'); finish.append(el('h2', 'Ready to move on?'), el('p', 'Mark the reading when you have understood it. Running an example does not mark reading or practice complete.'));
    const completionStatus = el('p'); completionStatus.setAttribute('role', 'status');
    const toggle = button('', () => {
      const persisted = write(`read:${lesson.id}`, !read(`read:${lesson.id}`)); updateProgress();
      completionStatus.textContent = persisted ? 'Reading mark saved.' : 'Storage is unavailable; this mark lasts for this visit only.';
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
  return { render, isBusy: () => runners.some(item => item.isBusy()), suspend: () => runners.forEach(runner => runner.stop()) };
}
