const bridges = [
  ['Geopolitics','Geography','How do sea routes and mountain passes shape bargaining power?'],
  ['Geopolitics','Economy','Trace an oil supply shock from a shipping route to India’s import bill.'],
  ['Geopolitics','Polity','Who can negotiate an international agreement, and who gives it effect at home?'],
  ['Economy','Polity','How does Parliament’s control over spending shape fiscal policy?'],
  ['Economy','Environment','What changes for farmers when groundwater is cheap to pump?'],
  ['Geography','Environment','Follow a river downstream. Where do rainfall, wetlands and livelihoods meet?'],
  ['Geography','Modern History','How did ports and railways influence colonial trade?'],
  ['Ancient History','Geography','How did rivers and fertile plains support early states?'],
  ['Medieval History','Economy','How could a ruler’s land-revenue system affect the choices of cultivators?'],
  ['Culture','Medieval History','How did patronage and trade bring artistic traditions together?'],
  ['Biology','Environment','How can the loss of a pollinator change a food web?'],
  ['Science & Tech','Biology','How does a vaccine turn immune memory into protection?'],
  ['CSAT','Economy','Read a price index as a data interpretation problem. What is its base year?'],
  ['Current affairs','Geopolitics','Choose one headline. Which border, resource or alliance helps explain it?']
];
const subjects = [...new Set(bridges.flatMap(([a,b]) => [a,b]))].sort();
let subject = 'Geopolitics';
let editing = null;
const notePrefix = 'aadya-atlas-note:';
const notes = new Map();
const tags = byId('tags');
const field = id => byId(id).value.trim();
function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
function action(text, handler, cls='map-item') {
  const button = element('button',text,cls);
  button.type = 'button';
  button.addEventListener('click',handler);
  return button;
}
function readNotes() {
  notes.clear();
  for (let i=0;i<localStorage.length;i++) {
    const k=localStorage.key(i);
    if (!k.startsWith(notePrefix)) continue;
    try {
      const note=JSON.parse(localStorage.getItem(k));
      if (note && typeof note.title === 'string' && Array.isArray(note.tags)) notes.set(note.id,note);
    } catch {}
  }
}
try { readNotes(); } catch { byId('note-status').textContent='This browser could not read saved notes.'; }
const orderedNotes = () => [...notes.values()].sort((a,b)=>b.updated-a.updated);
function topic(row) { return row[2]==='Learn' ? row[4].split(':')[0] : row[3]; }
for (const row of plan) byId('note-day').add(new Option(row[0]+' · '+topic(row),row[0]));
for (const name of subjects) {
  byId('subject').add(new Option(name,name));
  const label=document.createElement('label');
  const input=document.createElement('input');
  input.type='checkbox'; input.value=name;
  label.append(input,document.createTextNode(name)); tags.append(label);
}
function defaultTags(date) {
  const row=plan.find(r=>r[0]===date);
  if(!row)return [];
  return subjects.filter(name=>row[3].toLowerCase().includes(name.toLowerCase()));
}
function setTags(values) { for (const input of tags.querySelectorAll('input')) input.checked=values.includes(input.value); }
const journalPrompts={
  'Connection':['What clicked?','Why does a rate hike affect the rupee?','Trace the link in your own words.'],
  'Question':['What do you want to find out?','What makes a monsoon stronger?','What do you know already? Add the answer when you find it.'],
  'Small win':['What went well?','I worked through my first map question','What helped you start? What would you try again?']
};
function setKind(kind){
  if(!Object.hasOwn(journalPrompts,kind))kind='Connection';
  const input=[...document.querySelectorAll('[name="kind"]')].find(el=>el.value===kind);
  input.checked=true;
  const [label,title,body]=journalPrompts[kind];
  byId('title-prompt').textContent=label;
  byId('note-title').placeholder=title;
  byId('note-body').placeholder=body;
}
document.querySelectorAll('[name="kind"]').forEach(input=>input.onchange=()=>setKind(input.value));
let recallIndex=0;
function reviewCard(){
  const cards=orderedNotes().filter(n=>n.question || n.kind==='Question');
  const item=cards[recallIndex%cards.length];
  const prompt=byId('recall-prompt'),answer=byId('recall-answer'),reveal=byId('recall-reveal'),next=byId('recall-next');
  prompt.textContent=item?(item.question||item.title):'What can you remember?';
  answer.hidden=Boolean(item);
  answer.textContent=item?(item.body||(item.question && item.question!==item.title?item.title:'Still open. Add your answer to the saved note when you find it.')):'Save a question in your journal to practise recalling it here.';
  reveal.hidden=!item;next.hidden=cards.length<2;reveal.textContent='Reveal note';
  reveal.onclick=()=>{answer.hidden=!answer.hidden;reveal.textContent=answer.hidden?'Reveal note':'Hide note';};
  next.onclick=()=>{recallIndex++;reviewCard();};
}
function journal(note=null) {
  editing=note?.id || null;
  setKind(note?.kind);
  byId('form-title').textContent=note ? 'Edit field note' : 'New field note';
  if(note && ![...byId('note-day').options].some(o=>o.value===note.date))byId('note-day').add(new Option(note.date+' · Previous plan',note.date));
  byId('note-day').value=note?.date || selected;
  byId('note-title').value=note?.title || '';
  byId('note-body').value=note?.body || '';
  byId('note-question').value=note?.question || '';
  setTags(note?.tags || defaultTags(selected));
  byId('note-status').textContent='';
  noteLinks(note);
}
function openNote(note) { journal(note); location.hash='journal'; byId('note-title').focus(); }
function openStudy(date) { selected=date;week=weekOf(date);render();location.hash='desk'; }
function renderNotes() {
  const query=field('search').toLowerCase();
  const list=byId('note-list');
  list.replaceChildren();
  reviewCard();
  for (const n of orderedNotes()) {
    const kind=n.kind||'Connection';
    if(byId('kind-filter').value!=='All notes' && kind!==byId('kind-filter').value)continue;
    if (![n.title,n.body,n.question,n.date,...n.tags].join(' ').toLowerCase().includes(query)) continue;
    const button=action(n.title,()=>openNote(n),'note-row');
    button.append(element('span',[kind,n.date,...n.tags].join(' · ')));
    list.append(button);
  }
  if (!list.children.length) list.append(element('p',query || byId('kind-filter').value!=='All notes'?'No matching notes.':'Your first saved note will appear here.','detail-text'));
}
function renderMemory() {
  const box=byId('memory');
  const row=plan.find(r=>r[0]===selected);
  const ranked=orderedNotes();
  const note=ranked.find(n=>n.date===selected) || ranked.find(n=>n.tags.includes(row[3])) || ranked[0];
  box.hidden=!note;
  box.replaceChildren();
  if (note) box.append(element('strong',note.question?'Recall prompt':'From your journal'),document.createTextNode(note.question||note.title),action('Revisit note',()=>openNote(note),''));
}
byId('note-form').addEventListener('submit',event=>{
  event.preventDefault();
  if (!field('note-title')) {byId('note-status').textContent='Give your note a title first.';return;}
  const note={id:editing || crypto.randomUUID(),updated:Date.now(),date:field('note-day'),title:field('note-title'),body:field('note-body'),question:field('note-question'),tags:[...tags.querySelectorAll(':checked')].map(i=>i.value)};
  note.kind=document.querySelector('[name=kind]:checked').value;
  const prior=notes.get(note.id);
  note.scheduleVersion=24;
  note.planDate=prior && prior.date===note.date ? prior.planDate || (prior.scheduleVersion===24?prior.date:learningDateChanges[prior.date]||prior.date) : note.date;
  try {localStorage.setItem(notePrefix+note.id,JSON.stringify(note));} catch {byId('note-status').textContent='Could not save in this browser. Your text is still in the form.';return;}
  notes.set(note.id,note);editing=note.id;
  byId('form-title').textContent='Edit field note';
  byId('note-status').textContent='Saved to your journal and map in this browser.';
  noteLinks(note);renderNotes();renderMemory();document.dispatchEvent(new Event('work-updated'));
});
byId('new-note').onclick=()=>{journal();byId('note-title').focus();};
byId('write').onclick=()=>{
  openNote(null);
  const next=activeChoices(selected).find(s=>!s.done);
  const t=next && syllabus.find(t=>t.id===next.id);
  if(t)setTags([t.subject]);
};
byId('note-day').onchange=()=>{if(!editing && !field('note-title'))setTags(defaultTags(field('note-day')));};
byId('search').oninput=renderNotes;
byId('kind-filter').onchange=renderNotes;
function explore(name){subject=name;byId('subject').value=name;renderMap();}
byId('subject').onchange=()=>explore(byId('subject').value);
function draw(canvas,paint) {
  const w=canvas.clientWidth,h=canvas.clientHeight;
  if(!w||!h) return;
  const ratio=Math.min(devicePixelRatio||1,2);
  canvas.width=w*ratio;canvas.height=h*ratio;
  const ctx=canvas.getContext('2d');
  ctx.scale(ratio,ratio);
  paint(ctx,w,h);
}
function renderMap() {
  const nearby=new Set(), reasons=[],linked=orderedNotes().filter(n=>n.tags.includes(subject));
  for (const [a,b,why] of bridges) {
    if(a!==subject && b!==subject)continue;
    const other=a===subject?b:a;nearby.add(other);reasons.push([other,why]);
  }
  for (const n of linked) for(const name of n.tags) if(name!==subject)nearby.add(name);
  const network=byId('network'),canvas=document.createElement('canvas');
  canvas.setAttribute('aria-hidden','true');
  network.replaceChildren(canvas);
  const names=[...nearby];
  network.style.height=Math.max(310,Math.ceil(names.length/2)*70+60)+'px';
  const positions=names.map((_,i)=>{
    const side=i%2, count=side?Math.floor(names.length/2):Math.ceil(names.length/2);
    return [side?83:17,(Math.floor(i/2)+.5)/count*84+8];
  });
  nodesAt(network,element('span',subject,'node center'),[50,50]);
  names.forEach((name,i)=>nodesAt(network,action(name,()=>explore(name),'node'),positions[i]));
  draw(canvas,(ctx,w,h)=>{
    ctx.strokeStyle='#c795ac';ctx.lineWidth=1.4;
    for(const [x,y] of positions){ctx.beginPath();ctx.moveTo(w/2,h/2);ctx.lineTo(w*x/100,h*y/100);ctx.stroke();}
  });
  const detail=byId('detail');
  byId('detail-title').textContent=subject;
  detail.replaceChildren();
  for(const [name,why] of reasons) detail.append(element('h3',name),element('p',why,'detail-text'));
  detail.append(element('h3','Journal connections'));
  for(const note of linked) detail.append(action(note.title,()=>openNote(note)));
  if(!linked.length) detail.append(element('p','Tag a field note with this subject to connect it here.','detail-text'));
  const sessions=plan.filter(row=>row[2]==='Learn' && row[3]===subject);
  if(sessions.length){
    const details=document.createElement('details');details.append(element('summary','Study days ('+sessions.length+')'));
    sessions.forEach(row=>details.append(action(row[0]+' · '+topic(row),()=>openStudy(row[0]))));detail.append(details);
  }
}
function nodesAt(parent,node,[x,y]){node.style.left=x+'%';node.style.top=y+'%';parent.append(node);}
function route(){
  const view=['journal','map','syllabus','facts','history'].includes(location.hash.slice(1))?location.hash.slice(1):'desk';
  for(const section of document.querySelectorAll('.view'))section.hidden=section.id!==view;
  for(const a of document.querySelectorAll('nav a')){if(a.hash==='#'+view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');}
  if(view==='map')explore(subject);
  if(view==='desk'){renderMemory();}
}
journal();renderNotes();route();
window.addEventListener('hashchange',route);
window.addEventListener('resize',()=>{if(!byId('map').hidden)renderMap();});
window.addEventListener('storage',event=>{if(event.key===null||event.key.startsWith(notePrefix)){readNotes();renderNotes();route();}});
document.addEventListener('study-day-change',renderMemory);

function noteLinks(note) {
  const box=byId('note-links');
  box.replaceChildren();
  if (!note) return;
  const d=note.planDate || (note.scheduleVersion===24?note.date:(learningDateChanges[note.date]||note.date));
  if(plan.some(row=>row[0]===d))box.append(action('Open study day · '+d,()=>openStudy(d)));
  for(const name of note.tags)box.append(action('Explore '+name,()=>{subject=name;location.hash='map';}));
}
const lens=byId('lens');
try {const prior=localStorage.getItem('aadya-study-lens');if(['why','low','deep'].includes(prior))lens.value=prior;} catch {}
function renderLens(){
  const row=plan.find(r=>r[0]===selected);
  lens.parentElement.hidden=['Rest','Exam'].includes(row[2]);
  byId('topic-map').onclick=()=>{subject=defaultTags(selected)[0]||'Geopolitics';location.hash='map';};
  const why=bridges.find(([a,b])=>a===row[3]||b===row[3]);
  const source={Polity:'a case in D. D. Basu','Modern History':'Bipan Chandra or a history NCERT',Geography:'a geography NCERT'};
  const prompts={low:'Try five minutes with a short explainer or just the headings. Write down one question you could pick up tomorrow.',
    deep:'Choose one question from '+topic(row)+'. Start with '+(source[row[3]]||'your book')+', follow one source, then sketch the cause and effect in your journal.',
    why:why?why[2]:'What caused the change in this topic, and who felt its effects? Capture one link in your journal.'};
  byId('lens-prompt').textContent=prompts[lens.value];
}
lens.onchange=()=>{try{localStorage.setItem('aadya-study-lens',lens.value);}catch{}renderLens();};
document.addEventListener('study-day-change',renderLens);
renderLens();
