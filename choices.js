function activeChoices(date,store=studyChoices){
  return (store[date]||[]).filter(s=>!s.archived);
}
function archiveCompleted(items){
  return items.filter(s=>s.done).map(s=>({...s,archived:true}));
}
byId('switch-timetable').onclick=()=>{
  const record=entry();
  if(changeChoices(()=>[])){
    record.hiddenBlocks=[];
    save();render();updateDesk();
    byId('choice-message').textContent='Original day schedule restored.';
  }
};
function changeChoices(transform) {
  try {
    const stored=JSON.parse(localStorage.getItem(choicesKey)||'{}');
    const previous=stored[selected]||[];
    const active=previous.filter(s=>!s.archived);
    const next=transform(active,stored);
    const removed=active.filter(s=>!next.some(item=>item.id===s.id));
    stored[selected]=[...previous.filter(s=>s.archived),...archiveCompleted(removed),...next];
    localStorage.setItem(choicesKey,JSON.stringify(stored));
    studyChoices=stored;
  }catch{
    byId('choice-message').textContent='Could not save this timetable change.';
    return false;
  }
  renderChoices();updateDesk();
  return true;
}
function addChoice(id){
  const topic=syllabus.find(t=>t.id===id);
  if(!topic)return;
  let duplicate=false;
  if(changeChoices(items=>{
    duplicate=items.some(s=>s.id===id);
    return duplicate?items:[...items,{id,done:0}];
  }))byId('choice-message').textContent=duplicate?'Already on this day.':'Added '+topic.name+' above the original blocks.';
}
function renderChoices(){
  completedChoiceDays=new Set();
  daysWithExtras=new Set();
  for(const [date,items] of Object.entries(studyChoices)){
    const extras=items.filter(s=>!s.archived);
    if(extras.length)daysWithExtras.add(date);
    const row=plan.find(r=>r[0]===date);
    if(!row||!extras.length||!extras.every(s=>s.done))continue;
    if(row.slice(4,7).every((detail,i)=>!detail||state[date]?.hiddenBlocks?.includes(i)||state[date]?.tasks?.[i]))completedChoiceDays.add(date);
  }
  renderProgress();
  byId('choice-day').value=selected;
  const label=format(selected,{weekday:'short',day:'numeric',month:'long'});
  byId('choice-date').textContent='Day '+(daysBetween(first,selected)+1)+' · '+label;
  const list=byId('my-topics');list.replaceChildren();
  const choices=activeChoices(selected);
  byId('switch-timetable').disabled=!choices.length && !state[selected]?.hiddenBlocks?.length;
  customWeek={};
  for(const date of Object.keys(studyChoices)){
    const items=activeChoices(date);
    if(!items.length)continue;
    const t=syllabus.find(t=>t.id===(items.find(s=>!s.done)||items[0]).id);
    customWeek[date]={title:t?.name||'Added topics',status:items.filter(s=>s.done).length+'/'+items.length};
  }
  renderWeek();
  document.dispatchEvent(new Event('timetable-updated'));
  if(!choices.length)return;
  const head=element('div','','agenda-heading');
  head.append(element('strong',label),element('span',choices.filter(s=>s.done).length+' / '+choices.length+' complete','pill'));
  list.append(head);
  const startLabel=element('label','First block starts at ','start-label');
  const start=document.createElement('input');start.type='time';
  const startKey='aadya-start-time:'+selected;
  try {start.value=localStorage.getItem(startKey)||'21:00';} catch {start.value='21:00';}
  start.onchange=()=>{if(start.value){try {localStorage.setItem(startKey,start.value);} catch {byId('choice-message').textContent='Could not save start time.';return;}renderChoices();}};
  startLabel.append(start);list.append(startLabel);
  const [hours,mins]=start.value.split(':').map(Number);
  const base=hours*60+mins;
  const clock=m=>String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0')+(m>=1440?' (+1 day)':'');
  const upcoming=choices.find(item=>!item.done);
  for(const choice of choices){
    const topic=syllabus.find(t=>t.id===choice.id);
    if(!topic)continue;
    const row=element('div','','choice-row');
    const label=document.createElement('label');
    const box=document.createElement('input');box.type='checkbox';box.checked=Boolean(choice.done);
    box.onchange=()=>{
      const done=box.checked?Date.now():0;
      if(!changeChoices(items=>items.map(s=>s.id===choice.id?{...s,done}:s))) box.checked=!box.checked;
      else byId('choice-message').textContent=done?'Recorded in your recent work and subject chart.':'Topic reopened.';
    };
    label.append(box,element('span',topic.name));
    const slot=choices.indexOf(choice);
    row.classList.toggle('up-next',choice===upcoming);
    const at=base+slot*30;
    row.append(element('small',clock(at)+' – '+clock(at+25)+(choice===upcoming?' · Up next':''),'slot-time'),label);
    row.append(action('Remove',()=>{if(changeChoices(items=>items.filter(s=>s.id!==choice.id)))byId('choice-message').textContent='Removed from this day.';},'remove-choice'));
    const content=document.createElement('details');
    content.append(element('summary','Study outline'));
    const bullets=document.createElement('ul');
    for(const item of topic.items)bullets.append(element('li',item));
    content.append(bullets,action('Journal about this topic',()=>{
      openNote(null);byId('note-title').value=topic.name;setTags([topic.subject]);
    },''));
    row.append(content);
    if(!choice.done)row.append(scheduleControls(choice,choices,topic));
    list.append(row);
  }
}
function fillTopicMenu(){
  const select=byId('choose-topic');select.replaceChildren();
  for(const t of syllabus.filter(t=>t.subject===byId('choose-subject').value)){
    select.add(new Option(t.name,t.id));
  }
}
for(const name of subjectOrder)byId('choose-subject').add(new Option(name,name));
fillTopicMenu();
byId('choose-subject').onchange=fillTopicMenu;
byId('choose-form').onsubmit=e=>{e.preventDefault();addChoice(Number(byId('choose-topic').value));};
document.addEventListener('study-day-change',()=>{
  byId('choice-message').textContent='';renderChoices();
});
window.addEventListener('storage',e=>{

  if(e.key===choicesKey||e.key===null){
    studyChoices=JSON.parse(localStorage.getItem(choicesKey)||'{}');
    renderChoices();updateDesk();
  }
});
renderChoices();

byId('choice-day').min=first;
byId('choice-day').max=last;
byId('choice-day').onchange=()=>{
  const input=byId('choice-day');
  if(!input.value || !input.checkValidity()){input.reportValidity();return;}
  openStudy(input.value);
};
renderProgress();

function scheduleControls(choice, choices, topic){
  const tools=document.createElement('details');
  tools.append(element('summary','Move or swap'));
  const controls=element('div','','schedule-controls');
  tools.append(controls);
  const swap=document.createElement('select');
  swap.setAttribute('aria-label','Replacement for '+topic.name);
  swap.add(new Option('Select a topic',''));
  for(const name of subjectOrder){
    const group=document.createElement('optgroup');group.label=name;
    syllabus.filter(t=>t.subject===name && t.id!==choice.id).forEach(t=>group.append(new Option(t.name,t.id)));
    swap.append(group);
  }
  const swapLabel=element('label','Swap topic');swapLabel.append(swap);
  const swapButton=action('Swap',()=>{
    if(!swap.value)return;
    const id=Number(swap.value);
    changeChoices(items=>items.map(s=>s.id===choice.id?(items.find(t=>t.id===id)||{id,done:0}):s.id===id?choice:s));
  },'');
  const pos=choices.findIndex(s=>s.id===choice.id);
  function move(offset){
    changeChoices(items=>{
      const i=items.findIndex(s=>s.id===choice.id),j=i+offset;
      if(i<0 || j<0 || j>=items.length)return items;
      [items[i],items[j]]=[items[j],items[i]];
      return items;
    });
  }
  const earlier=action('Move earlier',()=>move(-1),'');
  const later=action('Move later',()=>move(1),'');
  earlier.disabled=pos===0;later.disabled=pos===choices.length-1;
  const date=document.createElement('input');date.type='date';date.min=first;date.max=last;
  const dateLabel=element('label','Move to day');dateLabel.append(date);
  const dest=document.createElement('select');dest.setAttribute('aria-label','Destination slot');
  function destinations(){
    dest.replaceChildren(new Option('Add at end',''));
    activeChoices(date.value).filter(s=>!s.done).forEach(s=>{
      dest.add(new Option('Swap with '+syllabus.find(t=>t.id===s.id).name,s.id));
    });
  }
  date.onchange=destinations;destinations();
  const feedback=element('span','','move-feedback');feedback.setAttribute('role','status');
  const transfer=action('Move to day',()=>{
    const d=date.value;
    if(!d || !date.checkValidity() || d===selected){feedback.textContent='Choose another day in the plan.';return;}
    let moved=false;
    changeChoices((items,stored)=>{
      const other=activeChoices(d,stored),replacing=other.find(s=>s.id===Number(dest.value));
      const from=items.find(s=>s.id===choice.id);
      if(!from || from.done || other.some(s=>s.id===choice.id) || (replacing && (replacing.done || items.some(s=>s.id===replacing.id))))return items;
      stored[d]=[...(stored[d]||[]).filter(s=>s.archived),...(replacing?other.map(s=>s===replacing?from:s):[...other,from])];
      moved=true;
      return replacing?items.map(s=>s===from?replacing:s):items.filter(s=>s!==from);
    });
    byId('choice-message').textContent=moved?'Timetable updated for '+d+'.':'That topic is already in one of the selected slots.';
  },'');
  controls.append(earlier,later,swapLabel,swapButton,dateLabel,dest,transfer,feedback);
  return tools;
}

document.addEventListener('work-updated',renderChoices);
