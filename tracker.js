const byId = id => document.getElementById(id);
const isoToday = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const first = plan[0][0];
const last = plan.at(-1)[0];
const current = isoToday < first ? first : isoToday > last ? last : isoToday;
const key = 'aadya-prelims-2027-nov24';
let selected = current;
let state = {};
try {
  const saved=localStorage.getItem(key);
  if(saved) state=JSON.parse(saved)||{};
  else {
    const original=JSON.parse(localStorage.getItem('aadya-prelims-2027')||'{}');
    for(const [date,record] of Object.entries(original)) {
      const mapped=learningDateChanges[date];
      if(mapped || (date>=first && !Object.values(learningDateChanges).includes(date))) state[mapped||date]={...record,originalDate:date};
      else state['previous:'+date]=record;
    }
    localStorage.setItem(key,JSON.stringify(state));
  }
} catch {}

const asDate = iso => new Date(iso + 'T00:00:00Z');
const daysBetween = (a,b) => Math.round((asDate(b) - asDate(a)) / 86400000);
function format(date, options) {
  return asDate(date).toLocaleDateString('en-GB', {...options,timeZone:'UTC'});
}
function weekOf(date) {
  const day = asDate(date);
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay()+6)%7);
  return day.toISOString().slice(0,10);
}
let week = weekOf(selected);

function save() {
  state[selected].updated=Date.now();
  try {
    localStorage.setItem(key,JSON.stringify(state));
    byId('saved').textContent = 'Progress saved in this browser.';
  } catch {
    byId('saved').textContent = 'Browser storage is unavailable. Changes last until you close or reload this page.';
  }
  document.dispatchEvent(new Event('work-updated'));
}
function entry() {
  return state[selected] ||= {tasks:[],status:''};
}
let completedChoiceDays=new Set();
let daysWithExtras=new Set();
function renderProgress() {
  const done = plan.filter(row => row[2] === 'Learn' && (daysWithExtras.has(row[0])?completedChoiceDays.has(row[0]):state[row[0]]?.status==='Done')).length;
  byId('count').textContent = done + ' / 64';
  byId('progress').value = done;
}
let customWeek = {};
function renderWeek() {
  const rows = plan.filter(row => weekOf(row[0]) === week);
  const short = date => format(date,{day:'numeric',month:'short'});
  byId('range').textContent = short(rows[0][0]) + ' – ' + short(rows.at(-1)[0]);
  byId('prev').disabled = week === weekOf(first);
  byId('next').disabled = week === weekOf(last);
  byId('days').replaceChildren(...rows.map(([date,,,theme]) => {
    const button = document.createElement('button');
    button.className = 'day';
    button.type = 'button';
    button.dataset.date = date;
    button.setAttribute('aria-pressed',String(date === selected));
    const day = document.createElement('time');
    day.dateTime = date;
    day.textContent = format(date,{weekday:'short',day:'numeric'});
    const title = document.createElement('span');
    title.textContent = customWeek[date]?.title || theme;
    const status = document.createElement('span');
    status.textContent = customWeek[date]?.status || state[date]?.status || (date === isoToday ? 'Today' : '');
    button.append(day,title,status);
    button.addEventListener('click',() => {
      selected = date;
      render();
      byId('days').querySelector('[aria-pressed=true]').focus();
    });
    return button;
  }));
}
function renderFocus() {
  const [date,phase,type,theme,focus,practice,extra,hours] = plan.find(row => row[0] === selected);
  byId('focus-date').textContent = (date === isoToday ? 'Today · ' : '') + format(date,{weekday:'long',day:'numeric',month:'short'});
  byId('hours').textContent = hours ? hours + ' h planned' : type;
  byId('focus-title').textContent = type === 'Learn' ? focus.split(':')[0] : theme;
  byId('phase').textContent = phase.replace(/^\d - /,'') + (type === 'Learn' ? ' · ' + theme : '');
  const blocks = [['Main focus',focus],['Practice',practice],['CSAT & current affairs',extra]].flatMap(([name,detail],index) => {
    if (!detail || state[date]?.hiddenBlocks?.includes(index)) return [];
    const task = document.createElement('label');
    task.className = 'task';
    const text = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = name;
    const description = document.createElement('small');
    description.textContent = detail;
    text.append(title,description);
    if (type !== 'Rest' && type !== 'Exam') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = Boolean(state[date]?.tasks[index]);
      checkbox.addEventListener('change',() => {
        const record = entry();
        record.tasks[index] = checkbox.checked;
        const remaining=[focus,practice,extra].some((detail,i)=>detail && !record.hiddenBlocks?.includes(i) && !record.tasks[i]);
        if (!remaining) record.status = 'Done';
        else record.status = record.tasks.some(Boolean) ? 'Partial' : '';
        byId('status').value = record.status;
        save();
        renderWeek();
        renderProgress();
      });
      task.append(checkbox);
    }
    task.append(text);
    const wrapper=document.createElement('div');wrapper.className='original-block';
    const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';
    remove.setAttribute('aria-label','Remove '+name+' from this day');
    remove.onclick=()=>{
      const record=entry();
      record.hiddenBlocks=[...new Set([...(record.hiddenBlocks||[]),index])];
      save();render();
    };
    wrapper.append(task,remove);
    return [wrapper];
  });
  byId('tasks').replaceChildren(...blocks);
  byId('status').value = state[date]?.status || '';
}
function render() {
  renderFocus();
  renderWeek();
  renderProgress();
  document.dispatchEvent(new Event("study-day-change"));
}
function moveWeek(offset) {
  const date = asDate(week);
  date.setUTCDate(date.getUTCDate() + offset * 7);
  week = date.toISOString().slice(0,10);
  selected = plan.find(row => weekOf(row[0]) === week)[0];
  render();
}
byId('status').addEventListener('change',event => {
  const record=entry();
  record.status=event.target.value;
  const row=plan.find(r=>r[0]===selected);
  if(record.status==='Done' && !['Rest','Exam'].includes(row[2])) record.tasks=row.slice(4,7).map((detail,i)=>record.hiddenBlocks?.includes(i)?Boolean(record.tasks[i]):Boolean(detail));
  if(record.status==='Skipped' || !record.status)record.tasks=[];
  renderFocus();
  save();
  renderWeek();
  renderProgress();
});
byId('today').addEventListener('click',() => {
  selected = current;
  week = weekOf(current);
  render();
});
byId('prev').addEventListener('click',() => moveWeek(-1));
byId('next').addEventListener('click',() => moveWeek(1));
byId('today-date').textContent = format(isoToday,{weekday:'long',day:'numeric',month:'long'});
byId('target').textContent = Math.max(0,daysBetween(isoToday,'2027-05-10'));
byId('exam').textContent = Math.max(0,daysBetween(isoToday,'2027-05-23'));
render();
