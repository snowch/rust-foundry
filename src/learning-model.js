// Original, local teaching models. No code execution, storage, network or UI side effects.
const modelEscape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modelText = (tag, value, cls='') => `<${tag}${cls ? ` class="${cls}"` : ''}>${modelEscape(value)}</${tag}>`;
const modelArrow = '<span class="lm-arrow" aria-hidden="true">↓</span>';

export function renderLearningBody(model) {
  const e = modelEscape;
  switch (model.kind) {
    case 'slots':
      return model.rows.map(row => `<section class="lm-state">${modelText('h4',row.label)}<ol class="lm-slots" style="--slots:${row.values.length}">${row.values.map((value,i)=>`<li class="lm-slot ${row.active?.includes(i)?'lm-active':''} ${row.muted?.includes(i)?'lm-muted':''}"><span class="lm-index">${e(row.indices?.[i] ?? i)}</span>${modelText('strong',value)}${row.tags?.[i]?modelText('span',row.tags[i],'lm-tag'):''}</li>`).join('')}</ol>${row.note?modelText('p',row.note,'lm-state-note'):''}</section>`).join('');
    case 'bytes':
      return `<section class="lm-state">${modelText('h4',model.label)}<div class="lm-byte-groups" style="--slots:${model.values.length}">${model.groups.map(g=>`<div style="grid-column:span ${g.size}">${modelText('strong',g.label)}${g.note?modelText('span',g.note):''}</div>`).join('')}</div>${renderLearningBody({kind:'slots',rows:[{label:model.byteLabel||'Byte offsets · hexadecimal',values:model.values,indices:model.indices,active:model.active}]})}</section>`;
    case 'references':
      return model.states.map(state => `<section class="lm-state">${modelText('h4',state.label)}<div class="lm-objects">${state.objects.map(object=>{
        const refs=object.refs||[];
        return `<div class="lm-object-group"><div class="lm-ref-names" style="--refs:${Math.max(1,refs.length)}">${refs.map(ref=>`<div>${modelText('strong',ref.name,'lm-binding')}${modelText('span',ref.edge,'lm-edge-label')}</div>`).join('')}</div>${refs.length?`<svg class="lm-ref-lines" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true" focusable="false">${refs.map((_,i)=>`<path d="M${(i+.5)*100/refs.length} 1V11L50 25 M46 20L50 25L54 20"/>`).join('')}</svg>`:''}<div class="lm-object ${object.dead?'lm-dead':''}">${modelText('span',object.label,'lm-object-label')}${modelText('strong',object.value,'lm-object-value')}</div></div>`;
      }).join('')}</div>${state.note?modelText('p',state.note,'lm-state-note'):''}</section>`).join('');
    case 'branch':
      return `<div class="lm-root">${modelText('strong',model.root)}</div><div class="lm-branches">${model.paths.map(path=>`<section>${modelArrow}${modelText('h4',path.when,'lm-condition')}<div class="lm-outcome">${modelText('strong',path.result)}${path.detail?modelText('p',path.detail):''}</div></section>`).join('')}</div>${model.join?`${modelArrow}<div class="lm-root">${modelText('strong',model.join)}</div>`:''}`;
    case 'flow':
      return `<ol class="lm-flow">${model.steps.map((step,i)=>`<li>${i?modelArrow:''}${modelText('strong',step.label)}${step.detail?modelText('p',step.detail):''}${step.edge?modelText('span',step.edge,'lm-edge-label'):''}</li>`).join('')}</ol>`;
    case 'table':
    case 'lanes':
      return `<div class="lm-table-scroll" tabindex="0" role="region" aria-label="${e(model.label||'Compare the model states')}"><table class="lm-table"><caption>${e(model.label||'')}</caption><thead><tr>${model.headings.map(h=>modelText('th',h)).join('')}</tr></thead><tbody>${model.rows.map(row=>`<tr>${row.map((value,i)=>modelText(i?'td':'th',value)).join('')}</tr>`).join('')}</tbody></table></div>${model.links?.length?`<ul class="lm-dependencies">${model.links.map(link=>modelText('li',link)).join('')}</ul>`:''}`;
    case 'graph': {
      const nodes=new Map(model.nodes.map(n=>[n.id,n]));
      const lines=model.edges.map(edge=>{
        const a=nodes.get(edge.from),b=nodes.get(edge.to);
        if(!a||!b)throw Error('Unknown teaching-model vertex');
        const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
        // Coordinates are percentages. Leave space for the live-text node labels.
        const ax=(a.x+ux*7)*10,ay=(a.y+uy*7)*5,bx=(b.x-ux*7)*10,by=(b.y-uy*7)*5;
        const reciprocal=model.edges.some(other=>other.from===edge.to&&other.to===edge.from);
        const mx=(ax+bx)/2-uy*85,my=(ay+by)/2+ux*85;
        const tx=bx-ax,ty=by-ay,tlen=Math.hypot(tx,ty),vx=tx/tlen,vy=ty/tlen;
        // A mid-edge arrow stays visible with live-text nodes of different widths.
        const px=reciprocal?(ax+2*mx+bx)/4:(ax+bx)/2,py=reciprocal?(ay+2*my+by)/4:(ay+by)/2;
        const arrow=edge.directed===false?'':` M${px-vx*15-vy*10} ${py-vy*15+vx*10} L${px} ${py} L${px-vx*15+vy*10} ${py-vy*15-vx*10}`;
        return `<path d="M${ax} ${ay}${reciprocal?`Q${mx} ${my} `:'L'}${bx} ${by}${arrow}"/>`;
      }).join('');
      return `<div class="lm-graph" style="--graph-height:${model.height||300}px"><svg viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true" focusable="false">${lines}</svg>${model.edges.filter(edge=>edge.label).map(edge=>{const a=nodes.get(edge.from),b=nodes.get(edge.to),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),offset=model.edges.some(other=>other.from===edge.to&&other.to===edge.from)?18:9;return `<span class="lm-graph-edge" style="left:${edge.x??(a.x+b.x)/2-dy/len*offset}%;top:${edge.y??(a.y+b.y)/2+dx/len*offset}%">${e(edge.label)}</span>`;}).join('')}${model.nodes.map(n=>`<div class="lm-vertex ${n.active?'lm-active':''}" style="left:${n.x}%;top:${n.y}%">${modelText('strong',n.label)}${n.detail?modelText('span',n.detail):''}</div>`).join('')}</div>${model.legend?modelText('p',model.legend,'lm-state-note'):''}`;
    }
    case 'frames':
      return `<ol class="lm-frames">${model.frames.map((frame,i)=>`<li style="--depth:${i}">${modelText('strong',frame.call)}${modelText('span',frame.pending)}${modelText('span',frame.result,'lm-return')}</li>`).join('')}</ol>`;
    case 'panels':
      return model.panels.map(panel=>`<section class="lm-state">${modelText('h4',panel.label)}${renderLearningBody(panel.model)}</section>`).join('');
    default: throw Error('Unknown teaching-model layout: '+model.kind);
  }
}

export function learningFigure(model, id, cls='concept-diagram') {
  const e=modelEscape;
  return `<figure class="${cls} learning-model" data-model="${e(id)}" aria-labelledby="lm-${e(id)}"><figcaption><h3 id="lm-${e(id)}">${e(model.title)}</h3><p>${e(model.question)}</p></figcaption>${renderLearningBody(model)}${model.note?modelText('p',model.note,'lm-note'):''}<p class="lm-scope">${e(model.scope||'Illustration of the supplied example. Editing the program does not update this picture.')}</p><details class="lm-description"><summary>Diagram in words</summary><p>${e(model.description)}</p></details></figure>`;
}
