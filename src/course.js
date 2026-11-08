import { course, chapters, ownershipSteps } from './course-data.js';
import { element as el, button, codeBlock, download } from './dom.js';
const prefix = 'rust-foundry-course-v1:';
const volatile = new Map();
const read = key => { if (volatile.has(key)) return volatile.get(key); try { return localStorage.getItem(prefix + key) === 'true'; } catch { return false; } };
const write = (key, value) => { volatile.set(key, value); try { localStorage.setItem(prefix + key, String(value)); return true; } catch { return false; } };
export function markPractice(id) {
  write(`practice:${id}`, true);
  window.dispatchEvent(new Event('course-progress'));
}
export function initCourse({ openPractice, openLab }) {
  const root = document.getElementById('course-view');
  let active;
  const link = (text, hash) => { const a = el('a', text); a.href = hash; return a; };
  function map() {
    const box = el('details', undefined, 'course-map');
    box.append(el('summary', 'Course map · 12 chapters / 36 lessons'));
    const list = el('nav'); list.setAttribute('aria-label', 'Course chapters');
    for (const chapter of chapters) {
      const group = el('section'); group.append(el('h3', `${chapter.number} · ${chapter.title}`));
      for (const lesson of course.filter(x => x.chapter === chapter.id)) {
        const a = link(`${read(`read:${lesson.id}`) ? '✓ ' : ''}${lesson.title}${read(`practice:${lesson.id}`) ? ' · practice passed' : ''}`, `#course/${lesson.id}`);
        if (active?.id === lesson.id) a.setAttribute('aria-current', 'page');
        group.append(a);
      }
      list.append(group);
    }
    box.append(list); return box;
  }
  function render(id) {
    active = course.find(x => x.id === id);
    root.replaceChildren();
    const readCount = course.filter(x => read(`read:${x.id}`)).length;
    const practiceCount = course.filter(x => read(`practice:${x.id}`)).length;
    const header = el('div', undefined, 'course-heading');
    header.append(el('p', 'RUST, ONE SMALL PROGRAM AT A TIME', 'eyebrow'), el('h1', active ? active.title : 'From your first value to a database.'),
      el('p', `${readCount} / 36 read · ${practiceCount} / 36 practice checks passed. Saved on this browser when storage permits.`, 'progress-copy'));
    root.append(header, map());
    if (!active) {
      const intro = el('article', undefined, 'reading');
      intro.append(el('p', 'Learn real Rust on your phone or tablet. Each lesson has an explanation, a complete program, expected output, a prediction question, and an exercise with hints. The last four chapters build up to TinyDB: files, storage pages, a B+ tree, transactions, and recovery.'),
        el('p', 'Reading starts immediately. TinyDB runs a small bundled Rust program. The full compiler downloads only when you run or edit Rust.'),
        link('Start with values →', '#course/bindings'));
      const archive = link('Download all starters, references, and TinyDB projects ↓', './course/rust-foundry-course.zip'); archive.download = '';
      intro.append(archive);
      for (const chapter of chapters) {
        const card = el('section', undefined, 'chapter-card');
        const first = course.find(x => x.chapter === chapter.id);
        card.append(link(`${chapter.number} · ${chapter.title}`, '#course/' + first.id), el('p', chapter.summary)); intro.append(card);
      }
      root.append(intro); return;
    }
    const lesson = active, index = course.indexOf(lesson), chapter = chapters.find(x => x.id === lesson.chapter);
    const article = el('article', undefined, 'reading');
    article.append(el('p', `${chapter.number} · ${chapter.title} / Lesson ${index + 1} of 36`, 'eyebrow'));
    lesson.explain.forEach(text => article.append(el('p', text)));
    article.append(el('h2', 'A complete program'), codeBlock(lesson.source, 'Rust 2021 · standard library only'));
    const actions = el('div', undefined, 'reading-actions');
    actions.append(button('Open worked program', () => openPractice(lesson, 'worked')), button('Try the exercise', () => openPractice(lesson, 'exercise'), 'button primary'));
    article.append(actions, el('h2', 'Expected output'), codeBlock(lesson.expected));
    const steps = el('ol'); lesson.walkthrough.forEach(text => steps.append(el('li', text)));
    article.append(el('h2', 'Walk through it'), steps, el('h3', 'Watch for this'), el('p', lesson.pitfall, 'callout'));
    if (lesson.chapter === 'ownership' || lesson.chapter === 'borrowing') {
      const walk = el('section', undefined, 'ownership-walk'); let step = 0;
      const update = () => {
        const state = ownershipSteps[step]; walk.replaceChildren(el('h3', 'Follow ownership, step by step'),
          el('p', 'This is an annotated example, independent of your edited program.'), el('p', `Step ${step + 1} / ${ownershipSteps.length} · owner: ${state.owner}`), codeBlock(state.line), el('p', state.access), el('p', state.state));
        const row = el('div', undefined, 'reading-actions');
        const previous = button('Previous step', () => { step--; update(); }); previous.disabled = step === 0;
        const next = button('Next step', () => { step++; update(); }); next.disabled = step === ownershipSteps.length - 1;
        row.append(previous, next); walk.append(row);
      }; update(); article.append(walk);
    }
    const quiz = el('fieldset', undefined, 'prediction'); quiz.append(el('legend', 'Check your understanding'), el('p', lesson.question));
    const feedback = el('p'); feedback.setAttribute('role', 'status');
    lesson.choices.forEach((choice, i) => quiz.append(button(choice, () => {
      feedback.textContent = `${i === lesson.answer ? 'Correct.' : 'Try again.'} ${lesson.feedback}`;
      feedback.className = i === lesson.answer ? 'passed' : 'check-neutral';
    })));
    quiz.append(feedback); article.append(quiz, el('h2', 'Practice'), el('p', 'Implement the function at the top of the starter. The assertions in main check boundaries as well as the displayed example. Passing records a practice check; it does not mark this reading complete.'));
    lesson.hints.forEach((hint, i) => { const details = el('details', undefined, 'hint'); details.append(el('summary', `Hint ${i + 1}`), el('p', hint)); article.append(details); });
    const reference = el('details', undefined, 'hint'); reference.append(el('summary', 'Reference solution'), codeBlock(lesson.solution), button('Open reference in editor', () => openPractice(lesson, 'reference'))); article.append(reference);
    article.append(el('h3', 'Experiment'), el('p', lesson.experiment));
    if (lesson.lab) {
      const lab = el('section', undefined, 'lab-card');
      lab.append(el('h2', 'Use the real TinyDB'), el('p', 'This script runs the complete Rust database in a separate lesson file. You can inspect, download, and reopen its real pages. Re-running an INSERT into an existing lesson file can report duplicate IDs.'), codeBlock(lesson.lab.script, 'SQL and TinyDB commands'),
        button('Open TinyDB lab', () => openLab(lesson.lab), 'button primary'));
      if (lesson.lab.recoveryScript) lab.append(el('p', 'After the simulated interruption, run this second script to reopen and recover:'), codeBlock(lesson.lab.recoveryScript));
      article.append(lab);
    }
    const downloads = el('div', undefined, 'reading-actions');
    downloads.append(button('Download starter .rs', () => download(lesson.starter, `${lesson.id}-starter.rs`, 'text/plain')), button('Download reference .rs', () => download(lesson.solution, `${lesson.id}-reference.rs`, 'text/plain')));
    article.append(downloads);
    const finish = el('div', undefined, 'reading-completion');
    const toggle = button(read(`read:${lesson.id}`) ? '✓ Read · mark unread' : 'Mark reading complete', () => {
      const persisted = write(`read:${lesson.id}`, !read(`read:${lesson.id}`)); render(lesson.id);
      if (!persisted) root.querySelector('.progress-copy').textContent += ' Storage is unavailable; this mark lasts for this visit only.';
    });
    finish.append(toggle, el('p', read(`practice:${lesson.id}`) ? '✓ Practice check passed' : 'Practice check not passed yet'));
    const nav = el('nav', undefined, 'reading-actions'); nav.setAttribute('aria-label', 'Adjacent lessons');
    if (index > 0) nav.append(link('← ' + course[index - 1].title, '#course/' + course[index - 1].id));
    if (index + 1 < course.length) nav.append(link(course[index + 1].title + ' →', '#course/' + course[index + 1].id));
    article.append(finish, nav); root.append(article);
  }
  window.addEventListener('storage', event => {
    if (event.key === null) { volatile.clear(); render(active?.id); }
    else if (event.key.startsWith(prefix)) { volatile.delete(event.key.slice(prefix.length)); render(active?.id); }
  });
  window.addEventListener('course-progress', () => render(active?.id));
  return { render };
}
