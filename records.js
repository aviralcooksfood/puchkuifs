const factPrefix='aadya-fact:';
const focusPrefix='aadya-focus-session:';
const facts=new Map();
const focusSessions=new Map();
let editingFact=null;
function loadRecords(){
  facts.clear();focusSessions.clear();
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      const collection=key.startsWith(factPrefix)?facts:key.startsWith(focusPrefix)?focusSessions:null;
      if(!collection)continue;
      try{
        const record=JSON.parse(localStorage.getItem(key));
        if(record?.id)collection.set(record.id,record);
      }catch{}
    }
  }catch{}
}
loadRecords();
for(const name of subjects)byId('fact-subject').add(new Option(name,name));
function factEditor(fact=null){
  editingFact=fact?.id||null;
  byId('fact-heading').textContent=fact?'Edit fact':'Save a fact';
  byId('fact-text').value=fact?.text||'';
  byId('fact-source').value=fact?.source||'';
  byId('fact-subject').value=fact?.subject||defaultTags(selected)[0]||'Current affairs';
  byId('fact-status').textContent='';
}
function renderFacts(){
  const query=field('fact-search').toLowerCase();
  const list=byId('fact-list');list.replaceChildren();
  for(const fact of [...facts.values()].sort((a,b)=>b.updated-a.updated)){
    if(![fact.text,fact.subject,fact.source,fact.date].join(' ').toLowerCase().includes(query))continue;
    const card=action(fact.text,()=>{factEditor(fact);byId('fact-text').focus();},'note-row');
    card.append(element('span',[fact.subject,fact.date,fact.source].filter(Boolean).join(' · ')));
    list.append(card);
  }
  if(!list.children.length)list.append(element('p',query?'No matching facts.':'Your saved facts will appear here.'));
}
byId('fact-form').onsubmit=e=>{
  e.preventDefault();
  const text=field('fact-text');
  if(!text){byId('fact-status').textContent='Write the fact you want to save.';return;}
  const id=editingFact||crypto.randomUUID();
  const fact={id,text,source:field('fact-source'),subject:field('fact-subject'),date:facts.get(id)?.date||selected,updated:Date.now()};
  try{localStorage.setItem(factPrefix+id,JSON.stringify(fact));}
  catch{byId('fact-status').textContent='Could not save this fact. Your text is still here.';return;}
  facts.set(id,fact);factEditor(fact);renderFacts();renderRecent();
  byId('fact-status').textContent='Fact saved in this browser.';
};
byId('fact-search').oninput=renderFacts;
byId('fact-new').onclick=()=>{factEditor();byId('fact-text').focus();};
factEditor();renderFacts();

function logFocus(clock){
  const session={id:String(clock.end),at:clock.end,topic:clock.task||'Free study',date:clock.day,minutes:clock.minutes};
  try{localStorage.setItem(focusPrefix+session.id,JSON.stringify(session));}catch{return;}
  focusSessions.set(session.id,session);
  renderRecent();
}
function recordEvents(){
  const events=[];
  for(const fact of facts.values())events.push({kind:'Facts',at:fact.updated,title:fact.text,detail:fact.date+' · '+fact.subject,open:()=>{
    location.hash='facts';factEditor(fact);byId('fact-text').focus();
  }});
  for(const session of focusSessions.values())events.push({kind:'Focus',at:session.at,title:session.topic,detail:session.date+' · '+session.minutes+' min focus session',open:()=>{
    openStudy(session.date);byId('timer-title').scrollIntoView();
  }});
  return events;
}
function creditEvents(){
  return syllabus.filter(t=>creditedTopics.has(t.id)).map(t=>{
    let at=0;
    try{const saved=Number(localStorage.getItem(receiptPrefix+t.id));if(saved>1)at=saved;}catch{}
    return {kind:'Credits',at,title:t.name,detail:t.subject+' · +10 credits',open:()=>{
      byId('topic-search').value='#'+t.id;renderSyllabus();location.hash='syllabus';
    }};
  });
}
function renderHistory(){
  const kind=byId('history-filter').value;
  const query=field('history-search').toLowerCase();
  const events=[...studyEvents(),...recordEvents(),...creditEvents()].sort((a,b)=>b.at-a.at);
  const list=byId('history-list');list.replaceChildren();
  for(const event of events){
    if(kind!=='All' && event.kind!==kind)continue;
    const when=event.at?new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Kolkata'}).format(new Date(event.at)):'Earlier';
    if(![event.title,event.detail,event.kind,when].join(' ').toLowerCase().includes(query))continue;
    const card=action(event.title,event.open,'recent-row');
    card.append(element('small',[when,event.kind,event.detail].join(' · ')));list.append(card);
  }
  if(!list.children.length)list.append(element('p',query?'No matching activity.':'No saved activity in this category yet.'));
}
for(const link of document.querySelectorAll('[data-history]'))link.onclick=()=>{
  byId('history-filter').value=link.dataset.history;
  byId('history-search').value='';
  renderHistory();
};
byId('history-filter').onchange=renderHistory;
byId('history-search').oninput=renderHistory;
window.addEventListener('hashchange',()=>{if(location.hash==='#history')renderHistory();});
window.addEventListener('DOMContentLoaded',()=>{if(location.hash==='#history')renderHistory();});
window.addEventListener('storage',e=>{
  if(e.key===null||e.key.startsWith(factPrefix)||e.key.startsWith(focusPrefix)){
    loadRecords();renderFacts();renderRecent();
  }
  if(location.hash==='#history')renderHistory();
});
