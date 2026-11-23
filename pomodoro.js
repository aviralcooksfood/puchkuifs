const timerKey='aadya-focus-clock-v1';
function freshClock(minutes=25){
  return {minutes,phase:'focus',left:minutes*60,end:0,started:false,task:'',day:'',rounds:0};
}
function readClock(){
  try{
    const saved=JSON.parse(localStorage.getItem(timerKey));
    if(saved && [5,25,45].includes(saved.minutes) && ['focus','break'].includes(saved.phase) && Number.isFinite(saved.left))return saved;
  }catch{}
  return freshClock();
}
let clockState=readClock();
function persistClock(){
  try{localStorage.setItem(timerKey,JSON.stringify(clockState));}
  catch{byId('timer-message').textContent='This timer is available for this session.';}
}
function remainingSeconds(){
  return clockState.end?Math.max(0,Math.ceil((clockState.end-Date.now())/1000)):clockState.left;
}
function nextFocus(){
  const next=activeChoices(selected).find(s=>!s.done);
  if(next)return syllabus.find(t=>t.id===next.id)?.name;
  const row=plan.find(r=>r[0]===selected);
  const index=row.slice(4,7).findIndex((d,i)=>d && !state[selected]?.hiddenBlocks?.includes(i) && !state[selected]?.tasks?.[i]);
  if(index<0)return 'Free study';
  return index===0?topic(row):blockNames[index];
}
function showClock(){
  let left=remainingSeconds();
  if(!left && clockState.end){
    const focused=clockState.phase==='focus';
    if(focused){
      clockState.rounds++;
      logFocus(clockState);
    }
    clockState.phase=focused?'break':'focus';
    clockState.left=(focused?5:clockState.minutes)*60;
    clockState.end=0;clockState.started=false;
    left=clockState.left;
    byId('timer-message').textContent=focused?'Focus session complete. Your five-minute break is ready.':'Break complete. Your next focus session is ready.';
    persistClock();
  }
  const focus=clockState.phase==='focus',length=(focus?clockState.minutes:5)*60;
  byId('timer-phase').textContent=focus?'Pomodoro':'Break';
  byId('timer-clock').textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');
  byId('timer-dial').style.setProperty('--elapsed',(1-left/length)*360+'deg');
  byId('timer-length').value=String(clockState.minutes);
  byId('timer-length').disabled=clockState.started||!focus;
  byId('timer-topic').textContent=focus?(clockState.started?clockState.task:nextFocus()):'Stretch, get water, or rest your eyes.';
  byId('timer-toggle').textContent=clockState.end?'Pause':clockState.started?'Resume':focus?'Start focus':'Start break';
  byId('timer-reset').textContent=!focus?'Back to focus':'Reset';
}
byId('timer-length').onchange=()=>{
  clockState.minutes=Number(byId('timer-length').value);clockState.left=clockState.minutes*60;
  persistClock();showClock();
};
byId('timer-toggle').onclick=()=>{
  showClock();
  if(clockState.end){
    clockState.left=remainingSeconds();clockState.end=0;
  }else{
    if(!clockState.started && clockState.phase==='focus'){clockState.task=nextFocus();clockState.day=selected;}
    clockState.started=true;clockState.end=Date.now()+clockState.left*1000;
  }
  byId('timer-message').textContent='';
  persistClock();showClock();
};
byId('timer-reset').onclick=()=>{
  clockState={...freshClock(clockState.minutes),rounds:clockState.rounds};
  byId('timer-message').textContent='';
  persistClock();showClock();
};
window.addEventListener('storage',e=>{if(e.key===timerKey){clockState=readClock();showClock();}});
document.addEventListener('visibilitychange',showClock);
document.addEventListener('timetable-updated',showClock);
showClock();
window.setInterval(()=>{if(clockState.end)showClock();},500);
