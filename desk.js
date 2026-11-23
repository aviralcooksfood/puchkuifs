const choicesKey='aadya-free-choice-v1';
let studyChoices={};
try{studyChoices=JSON.parse(localStorage.getItem(choicesKey)||'{}')||{};}catch{}
const topicKey = 'aadya-syllabus-v1';
const subjectOrder = ['Economy','Polity','Geography','Environment','Modern History','Biology','Science & Tech','Ancient History','Medieval History','Culture','CSAT'];
const blockNames = ['Main focus','Practice','CSAT & current affairs'];
let overrides = {};
try { overrides = JSON.parse(localStorage.getItem(topicKey) || '{}') || {}; } catch {}
function tracked(t) {
  const latest=Math.max(0,...Object.values(studyChoices).flat().filter(s=>s.id===t.id).map(s=>s.done||0));
  if (overrides[t.id] && overrides[t.id].at>=latest) return overrides[t.id].done;
  if (latest) return true;
  if (t.id===117 || t.id===118) return true;
  return t.dates.length>0 && t.dates.every(d=>state[d]?.tasks?.[0] || (state[d]?.status==='Done' && !state[d]?.hiddenBlocks?.includes(0) && !state[d]?.tasks?.length));
}
function due(t) {
  return t.dates.length>0 && t.dates.at(-1)<isoToday;
}
function renderCharts() {
  const cards=subjectOrder.map(subject=>{
    const group=syllabus.filter(t=>t.subject===subject);
    const done=group.filter(tracked).length;
    const expected=group.filter(due).length;
    const missing=group.filter(t=>due(t)&&!tracked(t)).length;
    const status=done===group.length?'Complete':missing?missing+' to catch up':subject==='CSAT'?'Ongoing practice':!expected && !group.some(t=>t.dates.includes(isoToday))?'Upcoming':'On track';
    const card=element('button','','chart-card');
    card.type='button';
    const label=element('span',subject,'chart-name');
    const bar=element('span','','bar-track');
    const fill=element('span','','bar-fill');
    fill.style.width=100*done/group.length+'%';bar.append(fill);
    if(expected){
      const marker=element('span','','bar-marker');marker.style.left=100*expected/group.length+'%';bar.append(marker);
    }
    card.append(label,element('span',done+' / '+group.length,'fraction'),bar,element('span',status,'pace-status'));
    card.title=expected+' topics due through yesterday';
    card.setAttribute('aria-label',subject+', '+done+' of '+group.length+' complete, '+expected+' due through yesterday, '+status+'. View topics.');
    card.onclick=()=>{
      byId('topic-search').value='';renderSyllabus();location.hash='syllabus';
      requestAnimationFrame(()=>document.getElementById('group-'+subject).scrollIntoView({block:'start'}));
    };
    return card;
  });
  byId('charts').replaceChildren(...cards);
}
function renderSyllabus(){
  const q=byId('topic-search').value.trim().toLowerCase();
  const list=byId('syllabus-list');list.replaceChildren();
  let matches=0;
  for(const subject of subjectOrder){
    const group=syllabus.filter(t=>t.subject===subject);
    const found=group.filter(t=>/^#\d+$/.test(q) ? '#'+t.id===q : [subject,t.name,...t.items].join(' ').toLowerCase().includes(q));
    if(!found.length)continue;
    matches+=found.length;
    const section=element('section','','syllabus-section panel');
    section.id='group-'+subject;
    const head=element('div','','week-head');
    head.append(element('h2',subject),element('span',group.filter(tracked).length+' / '+group.length,'pill'));
    section.append(head);
    for(const t of found){
      const row=element('div','','syllabus-row'),box=document.createElement('input');
      box.type='checkbox';box.checked=tracked(t);box.setAttribute('aria-label','Mark '+t.name+' complete');
      const details=document.createElement('details');
      const summary=element('summary',t.name);details.append(summary);
      const items=document.createElement('ul');
      for(const item of t.items)items.append(element('li',item));
      details.append(items);
      details.append(action('Study this topic',()=>{addChoice(t.id);location.hash='desk';requestAnimationFrame(()=>byId('my-topics').scrollIntoView({block:'center'}));}));
      for(const d of t.dates)details.append(action('Open study day · '+d,()=>{openStudy(d);requestAnimationFrame(()=>byId('day-plan-title').scrollIntoView());}));
      box.onchange=()=>{
        const changed={...overrides,[t.id]:{done:box.checked,at:Date.now()}};
        try{localStorage.setItem(topicKey,JSON.stringify(changed));}catch{box.checked=tracked(t);byId('topic-feedback').textContent='Could not save this change in your browser.';return;}
        overrides=changed;head.lastChild.textContent=group.filter(tracked).length+' / '+group.length;
        updateCoverage();renderCharts();renderRecent();
      };
      row.append(box,details);section.append(row);
    }
    list.append(section);
  }
  if(!matches)list.append(element('p','No matching topics. Try another search.'));
  updateCoverage();
}
function updateCoverage(){
  const completed=syllabus.filter(tracked);
  byId('coverage').textContent=completed.length+' of '+syllabus.length+' topics complete';
  renderRewards(completed);
}
function studyEvents(){
  const events=[];
  for(const row of plan){
    const rec=state[row[0]];
    if(!rec)continue;
    const completed=blockNames.filter((_,i)=>rec.tasks?.[i]);
    if(!completed.length && !['Done','Partial'].includes(rec.status))continue;
    events.push({kind:"Study",at:rec.updated||asDate(row[0]).getTime(),title:topic(row),detail:(rec.originalDate||row[0])+' · '+(rec.status==='Done'?'Day complete':completed.join(', ')||'Partial day'),open:()=>{openStudy(row[0]);byId('day-plan-title').scrollIntoView();}});
  }
  for(const [date,sessions] of Object.entries(studyChoices))for(const session of sessions){
    const t=syllabus.find(t=>t.id===session.id);
    if(t && session.done)events.push({kind:"Study",at:session.done,title:t.name,detail:date+' · '+t.subject+' · Chosen topic complete',open:()=>{byId('topic-search').value='#'+t.id;renderSyllabus();location.hash='syllabus';}});
  }
  for(const n of notes.values())events.push({kind:"Journal",at:n.updated,title:n.title,detail:'Journal · '+n.date,open:()=>openNote(n)});
  for(const t of syllabus){const log=overrides[t.id];if(log?.done)events.push({kind:"Study",at:log.at,title:t.name,detail:t.subject+' · Topic complete',open:()=>{byId('topic-search').value='#'+t.id;renderSyllabus();location.hash='syllabus';}});}
  for(const t of syllabus.filter(t=>[117,118].includes(t.id)&&tracked(t)&&!overrides[t.id])){
    events.push({kind:"Study",at:0,title:t.name,detail:'Polity · Complete in original tracker',open:()=>{byId('topic-search').value='#'+t.id;renderSyllabus();location.hash='syllabus';}});
  }
  return events;
}
function renderRecent(){
  const events=[...studyEvents(),...recordEvents()];
  const recent=byId('recent-list');recent.replaceChildren();
  for(const event of events.sort((a,b)=>b.at-a.at).slice(0,3)){
    const button=action(event.title,event.open,'recent-row');button.append(element('small',event.detail));recent.append(button);
  }
  if(!events.length)recent.append(element('p','Tick a study block or save a note to see your recent work here.','detail-text'));
}
function renderNext(){
  const button=byId('next-action');
  const next=byId('tasks').querySelector('input:not(:checked)');
  button.hidden=!next;
  button.textContent='Complete next timetable block';
  button.onclick=()=>byId('tasks').querySelector('input:not(:checked)')?.click();
}
function updateDesk(){renderNext();renderRecent();renderCharts();renderSyllabus();}
byId('topic-search').oninput=renderSyllabus;
document.addEventListener('work-updated',updateDesk);
window.addEventListener('hashchange',()=>{if(location.hash==='#desk')updateDesk();});
updateDesk();

document.addEventListener('study-day-change',renderNext);
