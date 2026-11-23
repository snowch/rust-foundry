import './lab-hub.js';
import {courseNavigation} from './course-navigation.js';
import {homeIllustration} from './home-illustration.js';
import {materialSymbol} from './material-symbols.mjs';
import {lessonReferences} from './references.js';
import {createDraft} from './drafts.js';
import { course, chapters, ownershipSteps, courseEdition } from './course-data.js';
import { element as el, button, codeBlock, download } from './dom.js';
import { createLessonRunner } from './lesson-runner.js';
import { createConceptDiagram } from './concept-diagrams.js';
import { experimentEdits, labEdits, exerciseInstruction } from './experiments.js';
const prefix = `rust-foundry-course-v${courseEdition}:`;
const volatile = new Map();
const read = key => { if (volatile.has(key)) return volatile.get(key); try { return localStorage.getItem(prefix + key) === 'true'; } catch { return false; } };
const write = (key, value) => { volatile.set(key, value); try { localStorage.setItem(prefix + key, String(value));volatile.delete(key); return true; } catch { return false; } };
export function markPractice(id) { const persisted = write(`practice:${id}`, true); window.dispatchEvent(new Event('course-progress')); return persisted; }

const labGroups=chapters.map((c,i)=>({...c,number:i+1,summary:c.summary,href:'#lab/'+c.id,requirement:i?'Builds on '+chapters[i-1].title+'.':'No previous programming experience required.',lessons:course.filter(l=>l.chapter===c.id).map(l=>({...l,href:'#course/'+l.id}))}));
const labFor=lesson=>labGroups.find(g=>g.id===lesson?.chapter);
function brandLab(group){const brand=document.querySelector('.brand');brand.href=group?group.href:'#course';brand.querySelector('.brand-subtitle').textContent=group?group.title:'Rust 2021 · Learn in your browser';}
export function initCourse({ openLab, canRun, unsupported }) {
  const root = document.getElementById('course-view');
  let active, activeLab, rendered = false, renderKey, runners = [],predictionDraft,hubCleanup=()=>{};
  const link = (text, hash, className) => { const a = el('a', text, className); a.href = hash; return a; };
  const members = chapter => course.filter(x => x.chapter === chapter);
  const tally = (lessons, kind) => lessons.filter(x => read(`${kind}:${x.id}`)).length;
  function fitMenu() {}
  function updateProgress() {
    root.querySelectorAll('.progress-copy').forEach(node => { node.textContent = `${tally(activeLab?.lessons||course, 'read')} / ${(activeLab?.lessons||course).length} complete`; });
    root.querySelectorAll('[data-chapter-progress]').forEach(node => {
      const lessons = members(node.dataset.chapterProgress);
      node.textContent = `${tally(lessons, 'read')} / ${lessons.length} read · ${tally(lessons, 'practice')} / ${lessons.length} practiced`;
    });
    root.querySelectorAll('[data-lesson-progress]').forEach(node => {
      const id = node.dataset.lessonProgress;
      node.innerHTML=read(`read:${id}`)?materialSymbol('check'):'';node.setAttribute('aria-label',read(`read:${id}`)?'Lesson complete':'Not marked complete');
    });
    root.querySelectorAll('[data-read-toggle]').forEach(node => { node.checked=read(`read:${node.dataset.readToggle}`); });
    root.querySelectorAll('[data-practice-total]').forEach(node=>node.textContent=`${tally(course,'practice')} / ${course.length} practice checks passed`);
    root.querySelectorAll('[data-practice-status]').forEach(node => { node.textContent = read(`practice:${node.dataset.practiceStatus}`) ? '✓ Practice check passed' : 'Practice check not passed yet'; });
    root.querySelectorAll('[data-chapter-meter]').forEach(node => { node.value = tally(members(node.dataset.chapterMeter), 'read'); });
  }
  function prerequisites(lesson){
    const box=el('details',undefined,'lesson-prerequisites');box.append(el('summary','Earlier topics used here'));const list=el('ul');
    for(const id of lesson.prerequisites){const item=el('li');item.append(link(course.find(l=>l.id===id).title,'#course/'+id));list.append(item);}box.append(list);return box;
  }
  function overview() {
    const intro = el('article', undefined, 'course-overview');
    intro.append(el('p', 'Start with a three-line Rust program. No programming, Rust, or SQL experience is required. Run and edit code in each lesson, then use what you learn to explore a small database.'));
    let previous;
    try { previous = course.find(x => x.id === localStorage.getItem(prefix + 'last-lesson')); } catch { /* Optional resume storage. */ }
    const target=foundryHub.destination(course,id=>read('read:'+id),previous?.id);previous=target.lesson;
    const resume = el('section', undefined, 'resume-card');
    resume.append(link(`${target.label}: ${previous.title} →`, '#course/' + (previous || course[0]).id, 'button primary'), el('p', 'The first run downloads about 58 MB of compiler files. Your browser compiles and runs the source locally.')); intro.append(resume);
    const hero=el('div',undefined,'home-hero'),copy=el('div',undefined,'home-copy');copy.append(root.querySelector('.course-heading'));while(intro.firstChild)copy.append(intro.firstChild);hero.append(copy,homeIllustration());intro.append(hero);
    intro.append(el('p',`${course.length} lessons across ${chapters.length} chapters`,'course-size'));
    const choose=el('section',undefined,'hub-choices');choose.innerHTML='<div class="hub-heading"><h2>Choose a lab</h2><p>'+labGroups.filter(g=>g.lessons.every(l=>read('read:'+l.id))).length+' / '+labGroups.length+' labs complete</p></div><div class="foundry-lab-grid">'+foundryHub.cards(labGroups,id=>read('read:'+id))+'</div>';intro.append(choose);intro.append(previousEdition());
    const archive = link('Download all starters, references, and TinyDB projects ↓', './course/rust-foundry-course.zip'); archive.download = ''; intro.append(archive); root.append(intro);const art=intro.querySelector('figure');art?.classList.add('hub-art');const arrange=()=>{if(!art)return;if(matchMedia('(max-width:900px)').matches)choose.after(art);else hero.append(art);};arrange();const query=matchMedia('(max-width:900px)');query.addEventListener('change',arrange);hubCleanup=()=>query.removeEventListener('change',arrange);
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
  function render(id,labId) {
    const next = course.find(x => x.id === id);
    const key=(id||'')+'/'+(labId||'');if (rendered && renderKey===key) { updateProgress(); return; }
    hubCleanup();hubCleanup=()=>{};predictionDraft=undefined;runners.forEach(runner => runner.dispose()); runners = []; active = next;activeLab=labFor(active)||labGroups.find(g=>g.id===labId);brandLab(activeLab);renderKey=key; rendered = true; root.replaceChildren();
    document.title = active ? `${active.title} · Chapter ${Number(chapters.find(x => x.id === active.chapter).number)} — Rust Foundry` : 'Rust Foundry — learn Rust, build a database';
    const header = el('header', undefined, `course-heading${active ? ' lesson-heading' : ''}`);
    header.append(el('h1', active ? active.title : 'Learn Rust and build a database'));
    if (active) {
      const goal = el('p', undefined, 'lesson-goal'); goal.append(el('strong', 'Goal: '), document.createTextNode(active.objective)); header.append(goal);
      if (!active.prerequisites.length) header.append(el('p', 'Start here. No previous programming experience needed.', 'entry-requirement'));
    }

    if(active)root.append(courseNavigation({active,progress:updateProgress}));root.append(header);
    if (!active) {if(activeLab){document.title=activeLab.title+' · Rust Foundry';root.innerHTML=foundryHub.overview(activeLab,id=>read('read:'+id),(()=>{try{return localStorage.getItem(prefix+'last-lesson')}catch{return null}})(),'#course');}else overview();updateProgress();return; }
    const lesson = active, scoped=activeLab.lessons,index = scoped.findIndex(l=>l.id===lesson.id), chapter = chapters.find(x => x.id === lesson.chapter);
    try { localStorage.setItem(prefix + 'last-lesson', lesson.id); } catch { /* Optional resume state. */ }
    if(lesson.prerequisites.length)header.append(prerequisites(lesson));
    const body = el('div', undefined, 'course-body'), article = el('article', undefined, 'reading'); body.append(article); root.append(body);
    lesson.explain.forEach(text => article.append(el('p', text)));
    const diagram = createConceptDiagram(lesson);
    if (diagram) article.append(diagram);
    const createRunner = mode => {
      const runner = createLessonRunner({ lesson, mode, unsupported, canRun: () => !runners.some(item => item.isBusy()) && canRun(), onPass: () => markPractice(lesson.id) }); runners.push(runner); return runner;
    };
    const prediction=predictionDraft=createDraft(`rust-foundry-prediction-v${courseEdition}:${lesson.id}`,'');
    const predict=el('section',undefined,'saved-prediction'),predictionLabel=el('label','Your prediction (optional)'),field=el('textarea');field.id='course-prediction';predictionLabel.htmlFor=field.id;field.rows=2;field.value=prediction.value;field.oninput=()=>prediction.save(field.value);predict.append(el('h2','Predict before you run'),el('p','Inspect main.rs below. What will the program print?'),predictionLabel,field);article.append(predict);
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
    lesson.choices.forEach((choice, i) => quiz.append(button(choice, () => { quiz.dataset.answer=String(i);feedback.textContent = `${i === lesson.answer ? 'Correct.' : 'Try again.'} ${lesson.feedback}`; feedback.className = i === lesson.answer ? 'passed' : 'check-neutral'; }))); quiz.append(feedback); article.append(quiz);
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
        button('Open workspace with this script', () => openLab(lesson.lab), 'button secondary'));
      if (lesson.id === 'tdb1') {
        const cWorkspace = link('C Foundry command workspace', 'https://snowch.github.io/c-foundry/#/workspace');
        cWorkspace.target = '_blank'; cWorkspace.rel = 'noopener'; lab.append(cWorkspace);
      }
      lab.append(initial);
      if (lesson.lab.recoveryScript) lab.append(el('p', 'After each simulated interruption, keep the filename. Replace TinyDB script with these lines and choose Run statements to reopen that file:'), codeBlock(lesson.lab.recoveryScript));
      article.append(lab);
    }
    const downloads = el('details', undefined, 'hint lesson-downloads'); downloads.append(el('summary', 'Download the starter and reference'), button('Download starter .rs', () => download(lesson.starter, `${lesson.id}-starter.rs`, 'text/plain')), button('Download reference .rs', () => download(lesson.solution, `${lesson.id}-reference.rs`, 'text/plain'))); article.append(downloads);
    article.append(lessonReferences(lesson));
    const finish=el('section',undefined,'reading-completion'),label=el('label',undefined,'completion-control'),toggle=el('input');toggle.type='checkbox';toggle.dataset.readToggle=lesson.id;label.append(toggle,document.createTextNode('Mark lesson complete'));
    const completionStatus=el('p','Saved in this browser. Practice checks are recorded separately.','completion-note');completionStatus.setAttribute('role','status');
    toggle.onchange=()=>{const persisted=write(`read:${lesson.id}`,toggle.checked);updateProgress();completionStatus.textContent=persisted?'Saved in this browser. Practice checks are recorded separately.':'This mark lasts until the tab reloads or closes. Browser storage is unavailable.';};finish.append(label,completionStatus);
    const nav = el('nav', undefined, 'adjacent-lessons'); nav.setAttribute('aria-label', 'Adjacent lessons');
    function card(destination,direction,className){const item=link('',destination?'#course/'+destination.id:activeLab.href,className);item.append(el('small',destination?direction:'Lab overview'),el('strong',destination?destination.title:activeLab.title));return item;}
    nav.append(card(scoped[index-1],'Previous lesson','adjacent-previous'),card(scoped[index+1],'Next lesson','adjacent-next'));
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
  return {render,isBusy:()=>runners.some(item=>item.isBusy()),suspend:()=>runners.forEach(runner=>runner.stop()),
      snapshot:()=>({marks:[...volatile],id:active?.id,prediction:predictionDraft?.snapshot(),runners:runners.map(r=>[r.root.dataset.mode,r.snapshot()])}),
      restore(value){if(!value||value.id!==active?.id)return;for(const[key,mark]of value.marks||[])volatile.set(key,mark);if(value.prediction&&predictionDraft){predictionDraft.restore(value.prediction);root.querySelector('#course-prediction').value=predictionDraft.value;}
        for(const[mode,state]of value.runners||[]){if(mode==='reference'&&!runners.some(r=>r.root.dataset.mode===mode)){const box=root.querySelector('.reference-solution');box.open=true;box.ontoggle();}runners.find(r=>r.root.dataset.mode===mode)?.restore?.(state);}updateProgress();}
    };
}
