// Shared hub contract: navigation only; never starts a runtime or changes learner data.
(()=>{
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function destination(items,done,last){
  const complete=items.every(x=>done(x.id));if(complete)return {lesson:items[0],label:'Review'};
  const previous=items.find(x=>x.id===last);
  const lesson=previous&&!done(previous.id)?previous:items.slice(previous?items.indexOf(previous)+1:0).find(x=>!done(x.id))||items.find(x=>!done(x.id));
  return {lesson,label:previous||items.some(x=>done(x.id))?'Continue':'Start'};
 }
 function cards(groups,done){return groups.map((g,i)=>`<article class="foundry-lab-card"><p class="lab-number">Lab ${i+1}</p><h3><a href="${escape(g.href)}">${escape(g.title)}</a></h3><p>${escape(g.summary)}</p><p class="lab-requirement">${i?'Builds on '+escape(groups[i-1].title)+'.':'No previous programming experience required.'}</p><p class="lab-progress">${g.lessons.filter(l=>done(l.id)).length} / ${g.lessons.length} lessons complete</p><a class="lab-open" href="${escape(g.href)}">Open ${escape(g.title)} →</a></article>`).join('');}
 function overview(g,done,last,hub){const next=destination(g.lessons,done,last);return `<section class="foundry-lab-intro"><a href="${escape(hub)}">All labs</a><p class="lab-number">Lab ${g.number}</p><h1>${escape(g.title)}</h1><p>${escape(g.summary)}</p><p>${escape(g.requirement)}</p><p>${g.lessons.filter(l=>done(l.id)).length} / ${g.lessons.length} lessons complete</p><a class="lab-primary" href="${escape(next.lesson.href)}">${next.label}: ${escape(next.lesson.title)} →</a></section><section class="foundry-lab-outline" aria-label="Lessons in this lab"><h2>Lessons in this lab</h2><ol>${g.lessons.map(l=>`<li><a href="${escape(l.href)}">${escape(l.title)}</a>${done(l.id)?' · Complete':''}</li>`).join('')}</ol></section>`;}
 globalThis.foundryHub={escape,destination,cards,overview};
})();
