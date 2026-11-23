import {course,chapters} from './course-data.js';
import {element as el} from './dom.js';
import {materialSymbol} from './material-symbols.mjs';
export function courseNavigation({active,progress,home=false}){
 const root=el('section',undefined,'course-navigation'),row=el('div',undefined,'course-row'),toggle=el('button',undefined,'course-toggle');toggle.type='button';toggle.id='course-toggle';toggle.setAttribute('aria-controls','course-contents');toggle.innerHTML='Course lessons '+materialSymbol('expand_more');
 const counter=el('span','','progress-copy'),crumbs=el('nav',undefined,'course-crumbs');crumbs.setAttribute('aria-label','Breadcrumb');
 const panel=el('div',undefined,'shared-outline');panel.id='course-contents';panel.hidden=!home;
 toggle.setAttribute('aria-expanded',String(home));const show=open=>{panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));};toggle.onclick=()=>show(panel.hidden);
 const overview=el('a','Course overview');overview.href=active?'#lab/'+active.chapter:'#course';overview.textContent=active?'Lab overview':'All labs';panel.append(overview);const all=el('a','All labs');all.href='#course';if(active)panel.append(all);
 const label=el('label','Show chapter'),select=el('select');select.id='outline-chapter';label.htmlFor=select.id;
 for(const[id,title]of[['all','All chapters'],...chapters.map(c=>[c.id,c.title])]){const option=el('option',title);option.value=id;select.append(option);}select.value=active?.chapter||'all';panel.append(label,select);
 const groups=el('nav',undefined,'outline-groups');groups.setAttribute('aria-label','Course lessons');panel.append(groups);
 function populate(){groups.replaceChildren();for(const chapter of chapters.filter(c=>select.value==='all'||select.value===c.id)){
  const section=el('section',undefined,'chapter-card');section.id='outline-'+chapter.id;
  const title=el('h2',chapter.title),copy=el('p',chapter.summary,'chapter-summary'),count=el('p','','chapter-progress-copy');count.dataset.chapterProgress=chapter.id;const list=el('ol',undefined,'chapter-lesson-list');
  for(const lesson of course.filter(l=>l.chapter===chapter.id)){
   const li=el('li'),link=el('a',undefined,'chapter-lesson'),number=el('span',String(course.indexOf(lesson)+1).padStart(2,'0'),'lesson-number'),text=el('span',lesson.title,'chapter-lesson-title'),mark=el('span','','lesson-progress-label');mark.dataset.lessonProgress=lesson.id;link.href='#course/'+lesson.id;
   if(lesson===active)link.setAttribute('aria-current','page');link.append(number,text,mark);li.append(link);list.append(li);
  }section.append(title,copy,count,list);groups.append(section);
 }progress();}
 select.onchange=populate;row.append(toggle,counter,crumbs);root.append(row,panel);
 if(active){const chapter=chapters.find(c=>c.id===active.chapter),sectionLink=el('a',chapter.title);sectionLink.href='#lab/'+chapter.id;const current=el('span',active.title);current.setAttribute('aria-current','page');crumbs.append(el('span','/'),sectionLink,el('span','/'),current);}
 panel.onkeydown=event=>{if(event.key==='Escape'){show(false);toggle.focus();event.preventDefault();}};
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){show(false);toggle.focus();}});
 populate();return root;
}
