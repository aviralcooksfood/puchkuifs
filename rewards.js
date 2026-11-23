// Each topic has its own receipt so two tabs can credit different topics independently.
const receiptPrefix = 'aadya-credit-topic:';
const stickerKey = 'aadya-desk-sticker';
const creditPerTopic = 10;
const stickerRewards = [
  {name:'Tea cup', icon:'☕', cost:30},
  {name:'Cherry pair', icon:'🍒', cost:100},
  {name:'Pink bow', icon:'🎀', cost:250},
  {name:'Book stack', icon:'📚', cost:500},
  {name:'Crescent moon', icon:'🌙', cost:900},
  {name:'Butterfly', icon:'🦋', cost:1300},
  {name:'Atlas crown', icon:'👑', cost:1800}
];
const creditedTopics = new Set();
let deskSticker = '';
let priorCredits = null;
let rewardStorageAvailable = true;
try {
  for (const topic of syllabus) {
    if (localStorage.getItem(receiptPrefix + topic.id)) creditedTopics.add(topic.id);
  }
  deskSticker = localStorage.getItem(stickerKey) || '';
} catch { rewardStorageAvailable = false; }

function drawStickerBook(credits) {
  const book = byId('stickers');
  const equipped = stickerRewards.find(reward => reward.name === deskSticker && reward.cost <= credits);
  const desk = byId('desk-sticker');
  desk.hidden = !equipped;
  desk.textContent = equipped?.icon || '';
  desk.setAttribute('aria-label', equipped?.name || 'Desk sticker');
  const cards = stickerRewards.map(reward => {
    const unlocked = credits >= reward.cost;
    const active = equipped === reward;
    const card = document.createElement('div');
    card.className = 'sticker-card' + (unlocked ? ' unlocked' : '');
    const art = element('span', reward.icon, 'sticker-art');
    art.setAttribute('aria-hidden','true');
    card.append(art,element('strong',reward.name));
    if (unlocked) {
      const button = action(active ? 'Remove sticker' : 'Use sticker', () => {
        deskSticker = active ? '' : reward.name;
        try { localStorage.setItem(stickerKey,deskSticker); } catch { rewardStorageAvailable = false; }
        drawStickerBook(credits);
        byId('stickers').querySelector('[data-cost="'+reward.cost+'"]').focus();
        byId('reward-message').textContent = (active ? 'Sticker removed.' : reward.name+' is on your desk.') + storageNote();
      },'sticker-button');
      button.dataset.cost = String(reward.cost);
      button.setAttribute('aria-label',(active?'Remove ':'Use ')+reward.name+' sticker');
      card.append(button);
    } else {
      card.append(element('small',reward.cost+' credits · '+(reward.cost-credits)+' to go'));
    }
    return card;
  });
  book.replaceChildren(...cards);
}
function storageNote() {
  return rewardStorageAvailable ? '' : ' Browser storage is unavailable. New rewards last for this session.';
}
function renderRewards(completed) {
  for (const topic of completed) {
    if (creditedTopics.has(topic.id)) continue;
    creditedTopics.add(topic.id);
    try { localStorage.setItem(receiptPrefix + topic.id,String(Date.now())); } catch { rewardStorageAvailable = false; }
  }
  const credits = creditedTopics.size * creditPerTopic;
  if (credits === priorCredits) return;
  const unlocked = stickerRewards.filter(reward => reward.cost <= credits);
  const next = stickerRewards[unlocked.length];
  byId('credit-total').textContent = credits.toLocaleString()+' credits';
  byId('sticker-count').textContent = unlocked.length+' / '+stickerRewards.length+' unlocked';
  const target = byId('reward-target');
  target.replaceChildren(element('strong', next ? 'Next sticker · '+next.name : 'Sticker collection complete'));
  target.append(element('span', next ? (next.cost-credits)+' credits to go' : 'All '+stickerRewards.length+' unlocked'));
  const meter = byId('reward-meter');
  meter.max = next?.cost || stickerRewards.at(-1).cost;
  meter.value = credits;
  let message = '';
  if (priorCredits !== null && credits > priorCredits) {
    const newNames = unlocked.filter(r => r.cost > priorCredits).map(r => r.name);
    message = '+'+(credits-priorCredits)+' credits.'+(newNames.length?' Unlocked '+newNames.join(', ')+'!':'');
  }
  byId('reward-message').textContent = message+storageNote();
  priorCredits = credits;
  drawStickerBook(credits);
}
window.addEventListener('storage', event => {
  if (event.key === stickerKey) {
    deskSticker = event.newValue || '';
    drawStickerBook(creditedTopics.size*creditPerTopic);
  } else if (event.key?.startsWith(receiptPrefix) && event.newValue) {
    const id = Number(event.key.slice(receiptPrefix.length));
    if (syllabus.some(t => t.id === id)) {
      creditedTopics.add(id);
      renderRewards([]);
    }
  }
});
