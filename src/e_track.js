<script>
/* ---------- order tracking ----------
   After checkout the modal turns into a printed pickup ticket. Its four steps retell the site's story:
   raw (ink) → cooking (halftone) → ready (neon) → done (seal).
   Demo mode (no ORDER_URL): progress is simulated from the order's age, fast-forwarded so it is watchable.
   With an endpoint: polls GET ?action=status&id=&tel= and expects
     { ok:true, status:'已收到'|'製作中'|'可取餐'|'已出貨'|'已完成'|'已取消', order:{mode, store, when, people, items, subtotal, shipping, total, createdAt} }
   (gas/Code.gs lookup()). The phone's last 3 digits are required because order ids are sequential.
   Orders placed on this device are kept in localStorage ('jj-orders') so the ticket can be reopened. */
(function(){
const J = window.JJ; if(!J) return;
const {$, $$, money, esc, ORDER_URL} = J;
const KEY = 'jj-orders', MAX = 8;
const DEMO = {cook: 8, ready: 30};     // seconds after ordering
const POLL = 25000;                    // real mode: Apps Script has daily quotas, so poll gently
const STAGES = ['received', 'cooking', 'ready', 'done'];
const FROM_SHEET = {'已收到':'received', '製作中':'cooking', '可取餐':'ready', '已出貨':'ready', '已完成':'done', '已取消':'cancelled'};
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const COOKING = ['鍋貼下鍋了', '淋上麵粉水、蓋鍋悶煎，冰花正在鍋底長出來。'];
const COPY = {
  takeout: { steps:['已收到','煎製中','可取餐','已取餐'], seal:'已取', sim:'模擬：我已取餐',
    received:['訂單收到了', o => `${o.store}正在備料，鐵鍋熱起來了。`],
    cooking: COOKING,
    ready:['起鍋了，請來取餐', o => `請到${o.store}櫃台，報訂單編號或手機末三碼 ${o.tel3}。`],
    done:['取餐完成，趁熱吃', '冰花脆底放久會軟，路上先吃一顆吧。'] },
  dinein: { steps:['已收到','煎製中','起鍋','已上桌'], seal:'上桌', sim:'模擬：已上桌',
    received:['座位留好了', o => `已在${o.store}為你保留 ${o.people}，到店報手機末三碼即可。`],
    cooking: COOKING,
    ready:['起鍋了，準備上桌', '整盤倒扣、冰花朝上，店員馬上送過去。'],
    done:['已上桌，用餐愉快', '想加點的話，跟店員說一聲就好。'] },
  delivery: { steps:['已收到','急速冷凍','已出貨','已送達'], seal:'送達', sim:'模擬：包裹送達',
    received:['訂單收到了', '出貨前一天在門市手包，包好立刻急凍。'],
    cooking:['急速冷凍中', '−196°C 鎖住肉汁與麵皮，裝箱後就出貨。'],
    ready:['禮盒已出貨', o => `低溫宅配運送中，預計 ${o.when} 送達。`],
    done:['禮盒送達了', '收到請立刻放進冷凍庫，可保存 60 天。'] }
};
const CANCEL = ['訂單已取消', '如有疑問，請來電客服 02-0000-0000。'];
const copyOf = o => COPY[o.mode] || COPY.takeout;

/* ---------- storage ---------- */
function load(){ try{ const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a.filter(o => o && o.id) : []; }catch(e){ return []; } }
function persist(list){ try{ localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))); }catch(e){} }
function put(o){ const l = load(), i = l.findIndex(x => x.id === o.id); if(i >= 0) l[i] = o; else l.unshift(o); persist(l); }
const find = id => load().find(o => o.id === id);

const tpDate = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Taipei', year:'numeric', month:'2-digit', day:'2-digit'});
const tpHM = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Taipei', hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
const tpHMS = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Taipei', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'});

// same shape as the Apps Script ids: JJ + yyyymmdd + daily sequence
function demoId(){
  const p = 'JJ' + tpDate.format(new Date()).replace(/-/g, '') + '-';
  const n = load().reduce((m, o) => o.id.indexOf(p) === 0 ? Math.max(m, +o.id.slice(p.length) || 0) : m, 0);
  return p + String(n + 1).padStart(3, '0');
}

function stageOf(o){
  if(o.status) return o.status;
  if(!o.demo) return 'received';
  if(o.doneAt) return 'done';
  const t = (Date.now() - o.createdAt) / 1000;
  return t < DEMO.cook ? 'received' : t < DEMO.ready ? 'cooking' : 'ready';
}
const stageLabel = (o, st = stageOf(o)) => st === 'cancelled' ? '已取消' : copyOf(o).steps[STAGES.indexOf(st)];

/* ---------- step icons: one potsticker drawn in each of the site's three styles, then the seal ---------- */
let uid = 0;
const SKIN = 'M-30,7 C-25,-7 -9,-13 3,-12.5 C17,-12 27,-5 30,4 C23,11 -19,13 -30,7 Z';
const pleats = c => `<path d="M-14,-9q3,-3 1,-6M-5,-11q3,-3 1,-6M4,-11.5q3,-3 1,-6M12,-10q3,-3 1,-6" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round"/>`;
const OFF = `<path class="off" d="${SKIN}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3"/>`;
function icons(o){
  const id = 'tk' + (++uid), vb = 'viewBox="-34 -26 68 44" aria-hidden="true" focusable="false"';
  const raw = `<svg ${vb}>${OFF}<g class="on">
      <defs><filter id="${id}b" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="3"/></filter></defs>
      <ellipse class="wash" cx="2" cy="5" rx="30" ry="10" fill="#1e1830" opacity=".2" filter="url(#${id}b)"/>
      <path d="${SKIN}" fill="#f7f5f0" stroke="#1e1830" stroke-width="2.2" stroke-linejoin="round"/>${pleats('#1e1830')}</g></svg>`;
  const ht = `<svg ${vb}>${OFF}<g class="on">
      <defs><clipPath id="${id}c"><path d="${SKIN}"/></clipPath>
        <pattern id="${id}d" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="2" cy="2" r="1" fill="#c8321f"/></pattern></defs>
      <g class="steam" fill="none" stroke="#5d5870" stroke-width="1.5" stroke-linecap="round"><path d="M-8,-17q-3,-4 0,-8"/><path d="M7,-17q3,-4 0,-8"/></g>
      <path d="${SKIN}" fill="#f7f5f0"/>
      <g clip-path="url(#${id}c)"><rect x="-34" y="0" width="68" height="16" fill="#f07a2a"/><rect x="-34" y="3" width="68" height="16" fill="url(#${id}d)" opacity=".85"/></g>
      <path d="${SKIN}" fill="none" stroke="#1e1830" stroke-width="2" stroke-linejoin="round"/>${pleats('#1e1830')}</g></svg>`;
  const neon = `<svg ${vb}>${OFF}<g class="on neon" fill="none" stroke-linecap="round">
      <ellipse cx="0" cy="10" rx="32" ry="5" stroke="#ff8a3d" stroke-width="1.5" stroke-dasharray="1.5 3"/>
      <path d="${SKIN}" stroke="#3ee6ff" stroke-width="2" stroke-linejoin="round"/>${pleats('#3ee6ff')}</g></svg>`;
  const seal = `<svg viewBox="-20 -20 40 40" aria-hidden="true" focusable="false"><rect class="off" x="-14" y="-14" width="28" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3"/></svg><span class="tk-seal on" aria-hidden="true">${copyOf(o).seal}</span>`;
  return [raw, ht, neon, seal];
}

/* ---------- the ticket ---------- */
function ticketHtml(o){
  const c = copyOf(o), ic = icons(o);
  const way = o.mode === 'delivery' ? '低溫宅配' : `${o.mode === 'dinein' ? '內用' : '外帶'} · ${esc(o.store)}`;
  const whenRow = o.mode === 'delivery' ? ['希望到貨', o.when] : o.mode === 'takeout' ? ['取餐時間', o.when] : ['用餐人數', o.people];
  return `<article class="ticket" aria-label="取餐單 ${esc(o.id)}">
    <div class="tk-top">
      <div><div class="tk-brand">煎記鍋貼 · 取餐單${o.demo ? ' · 示範' : ''}</div><div class="tk-no">${esc(o.id)}</div></div>
      <span class="tk-chip" data-r="chip"></span>
    </div>
    <div class="tk-perf" aria-hidden="true"></div>
    <div class="tk-body">
      <div class="tk-head" aria-live="polite" aria-atomic="true"><h3 data-r="h"></h3><p data-r="p"></p></div>
      <ol class="tk-steps" data-r="steps" aria-label="製作進度">${c.steps.map((s, i) => `<li class="tk-step"><span class="tk-ic">${ic[i]}</span><b>${s}<span class="sr"></span></b></li>`).join('')}</ol>
      <dl class="tk-dl">
        <dt>取餐方式</dt><dd>${way}</dd>
        ${whenRow[1] ? `<dt>${whenRow[0]}</dt><dd>${esc(whenRow[1])}</dd>` : ''}
        <dt>下單時間</dt><dd>${o.createdAt ? tpHM.format(new Date(o.createdAt)) : '—'}</dd>
        <dt>品項</dt><dd><ul class="tk-items">${(o.items || []).map(it => `<li><span>${esc(it.name)} × ${it.qty}</span><span>${it.sum != null ? money(it.sum) : ''}</span></li>`).join('')}</ul></dd>
        ${o.mode === 'delivery' ? `<dt>運費</dt><dd>${o.shipping ? money(o.shipping) : '免運'}</dd>` : ''}
        <dt class="sum">應付總額</dt><dd class="sum">${money(o.total || 0)}</dd>
      </dl>
      <div class="tk-foot"><span data-r="upd"></span>${o.demo
        ? `<button class="tk-sim" type="button" data-r="sim" hidden>${c.sim}</button>`
        : `<button class="tk-sim" type="button" data-r="refresh">重新整理</button>`}</div>
    </div>
    <div class="tk-stamp" aria-hidden="true" data-r="stamp"></div>
  </article>`;
}

const mounts = new Set();
function mount(box, o, opt = {}){
  box.innerHTML = ticketHtml(o);
  const m = {el: $('.ticket', box), id: o.id, stage: null};
  if(opt.print && !reduce) m.el.classList.add('print-in');
  const sim = $('[data-r="sim"]', m.el);
  if(sim) sim.addEventListener('click', () => { const r = find(m.id); if(!r) return; r.doneAt = Date.now(); put(r); tick(); });
  const rf = $('[data-r="refresh"]', m.el);
  if(rf) rf.addEventListener('click', () => poll(m.id));
  mounts.add(m);
  update(m, o);
  if(!o.demo && ORDER_URL && !settled(o)) poll(o.id);
  return m;
}
function update(m, o){
  const st = stageOf(o), c = copyOf(o), el = m.el;
  $('[data-r="upd"]', el).textContent = o.demo ? '示範模式 · 進度快轉模擬' : '更新於 ' + tpHMS.format(new Date(o.updated || o.createdAt || Date.now()));
  if(st === m.stage) return;
  m.stage = st;
  const idx = STAGES.indexOf(st);           // -1 when cancelled
  el.classList.toggle('is-night', idx >= 2);
  el.classList.toggle('is-done', st === 'done');
  el.classList.toggle('is-cancel', st === 'cancelled');
  const [h, p] = st === 'cancelled' ? CANCEL : c[st];
  $('[data-r="h"]', el).textContent = h;
  $('[data-r="p"]', el).textContent = typeof p === 'function' ? p(o) : p;
  $('[data-r="chip"]', el).textContent = stageLabel(o, st);
  $('[data-r="stamp"]', el).textContent = st === 'cancelled' ? '取消' : c.seal;
  $$('.tk-step', el).forEach((li, i) => {
    const s = i < idx || (i === idx && st === 'done') ? 'done' : i === idx ? 'now' : 'todo';
    li.className = 'tk-step ' + s;
    $('.sr', li).textContent = s === 'done' ? '（完成）' : s === 'now' ? '（進行中）' : '';
    if(s === 'now') li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
  $('[data-r="steps"]', el).style.setProperty('--prog', Math.max(0, idx) / 3);
  const sim = $('[data-r="sim"]', el); if(sim) sim.hidden = st !== 'ready';
}

/* ---------- real mode: ask the order sheet ---------- */
async function fetchStatus(id, tel3){
  const u = ORDER_URL + (ORDER_URL.includes('?') ? '&' : '?') + 'action=status&id=' + encodeURIComponent(id) + '&tel=' + encodeURIComponent(tel3);
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 15000);
  try{
    const r = await fetch(u, {signal: ctl.signal, redirect: 'follow'});
    const j = await r.json();
    if(!j.ok) throw new Error(j.error || '查無此訂單');
    return j;
  } finally { clearTimeout(t); }
}
const lastPoll = {};
async function poll(id){
  lastPoll[id] = Date.now();
  const o = find(id); if(!o || o.demo || !ORDER_URL) return;
  try{
    const j = await fetchStatus(o.id, o.tel3);
    const cur = find(id) || o;
    if(j.status && FROM_SHEET[j.status]) cur.status = FROM_SHEET[j.status];
    cur.updated = Date.now(); put(cur);
    tick();
  }catch(e){ /* keep the last known state; the next poll retries */ }
}
const settled = o => ['done', 'cancelled'].includes(stageOf(o));

/* ---------- open the ticket ---------- */
function openTicket(o, opt = {}){
  const box = $('#co-body');
  $('#co-title').textContent = '取餐單';
  box.innerHTML = `<div class="tk-wrap" id="tk-modal"></div>
    <div class="tk-after"><button class="go" type="button" id="tk-done">完成</button><a class="go ghost" href="#track" id="tk-go">到訂單查詢</a></div>
    <p class="tk-hint">關掉也沒關係：點右上角的取餐單圖示，或到「訂單查詢」輸入編號與手機末三碼，隨時可以再看。</p>`;
  mount($('#tk-modal'), o, opt);
  $('#tk-done').addEventListener('click', () => J.closeLayer());
  $('#tk-go').addEventListener('click', e => {
    e.preventDefault(); J.closeLayer();
    showInSection(o);
    document.getElementById('track').scrollIntoView({behavior: reduce ? 'auto' : 'smooth'});
  });
  const modal = $('#checkout');
  if(J.isOpen(modal)) setTimeout(() => $('#tk-done').focus(), 50);
  else J.openLayerEl(modal, '#tk-done');
  // focusing the buttons below the ticket would scroll it out of view; start from the top
  setTimeout(() => { $('.mbox', modal).scrollTop = 0; }, 80);
}
function afterOrder(rec){
  put(rec);
  seen[rec.id] = stageOf(rec);
  openTicket(rec, {print: true});
  watch();
}

/* ---------- lookup section ---------- */
const out = $('#track-out'), form = $('#track-form'), noIn = $('#tk-no'), telIn = $('#tk-tel'), err = $('#tk-err');
let shownId = null;
const EMPTY = `<div class="track-empty">
  <svg viewBox="-34 -26 68 44" aria-hidden="true"><path d="${SKIN}" fill="none" stroke="#a59bb8" stroke-width="1.6" stroke-dasharray="3 3"/>${pleats('#a59bb8')}</svg>
  <b>還沒有查詢</b><p>輸入訂單編號與手機末三碼，鍋貼會在這裡一步步煎熟。</p></div>`;
function showInSection(o){ shownId = o.id; noIn.value = o.id; telIn.value = o.tel3; err.textContent = ''; mount(out, o); renderRecent(true); }
function bad(input, msg){ err.textContent = msg; input.setAttribute('aria-invalid', 'true'); input.focus(); }
form.addEventListener('submit', async e => {
  e.preventDefault();
  [noIn, telIn].forEach(i => i.removeAttribute('aria-invalid')); err.textContent = '';
  const id = noIn.value.toUpperCase().replace(/\s+/g, ''), t3 = telIn.value.replace(/\D/g, '');
  noIn.value = id;
  if(!/^JJ\d{8}-\d{3}$/.test(id)) return bad(noIn, '訂單編號格式為 JJ + 日期 + 流水號，例如 JJ20261119-007。');
  if(t3.length !== 3) return bad(telIn, '請輸入下單手機號碼的最後三碼。');
  const local = find(id);
  if(local){
    if(local.tel3 !== t3) return bad(telIn, '訂單編號與手機末三碼不符，請再確認一次。');
    return showInSection(local);
  }
  if(!ORDER_URL) return bad(noIn, '查無此訂單。示範模式只查得到這台裝置送出的訂單。');
  const btn = $('button[type="submit"]', form); btn.disabled = true; btn.textContent = '查詢中…';
  try{
    const j = await fetchStatus(id, t3);
    if(!j.order) throw new Error('查無此訂單，請確認編號與手機末三碼。');
    const o = Object.assign({}, j.order, {id, tel3: t3, demo: false, status: FROM_SHEET[j.status] || 'received', updated: Date.now()});
    put(o); showInSection(o);
  }catch(e2){
    bad(noIn, e2.name === 'AbortError' || e2 instanceof TypeError ? '連線失敗，請稍後再試。' : e2.message);
  }finally{ btn.disabled = false; btn.textContent = '查詢進度'; }
});
telIn.addEventListener('input', () => { telIn.value = telIn.value.replace(/\D/g, '').slice(0, 3); });

let recentSig = '';
function renderRecent(force){
  const list = load().slice(0, 5);
  const sig = shownId + '|' + list.map(o => o.id + stageOf(o)).join(',');
  if(sig === recentSig && !force) return;
  recentSig = sig;
  $('#track-recent').innerHTML = list.length ? `<h3>這台裝置的訂單</h3><ul class="recent">${list.map(o => { const st = stageOf(o); return `
    <li><button type="button" data-tk="${esc(o.id)}" ${o.id === shownId ? 'aria-current="true"' : ''}>
      <span><b>${esc(o.id)}</b><small>${o.createdAt ? tpHM.format(new Date(o.createdAt)) + ' · ' : ''}${o.mode === 'delivery' ? '宅配' : esc(o.store)} · ${money(o.total || 0)}</small></span>
      <span class="st ${st === 'ready' ? 'ready' : ''}">${stageLabel(o, st)}</span></button></li>`; }).join('')}</ul>
    <p class="recent-note">訂單只記在這台裝置的瀏覽器裡，清除瀏覽資料後就不會列在這裡。</p>` : '';
}
$('#track-recent').addEventListener('click', e => { const b = e.target.closest('[data-tk]'); if(!b) return; const o = find(b.dataset.tk); if(o) showInSection(o); });

/* ---------- header ticket button + status-change toasts ---------- */
const btn = $('#ticket-open'), seen = {};
const latestActive = () => load().find(o => Date.now() - o.createdAt < 864e5 && !['done', 'cancelled'].includes(stageOf(o)));
function onScreen(id){
  for(const m of mounts){
    if(m.id !== id || !m.el.isConnected || m.el.closest('.modal:not(.open)')) continue;
    const r = m.el.getBoundingClientRect();
    if(r.bottom > 0 && r.top < innerHeight) return true;
  }
  return false;
}
function say(o, st){
  const msg = st === 'ready'
    ? (o.mode === 'delivery' ? `${o.id} 禮盒已出貨` : o.mode === 'dinein' ? '鍋貼起鍋了，馬上上桌' : `起鍋了！請到${o.store}取餐`)
    : st === 'cooking' ? (o.mode === 'delivery' ? `${o.id} 急速冷凍中` : `${o.id} 已經下鍋`) : '';
  if(msg) J.toast(msg, false);
}
function watch(){
  const a = latestActive();
  btn.hidden = !a;
  if(a){
    const st = stageOf(a);
    btn.classList.toggle('hot', st === 'ready');
    $('.tk-dot', btn).hidden = st !== 'ready';
    btn.setAttribute('aria-label', `查看取餐單 ${a.id}，目前${stageLabel(a, st)}`);
  }
  load().slice(0, 3).forEach(o => {
    const st = stageOf(o);
    if(seen[o.id] && seen[o.id] !== st && !onScreen(o.id)) say(o, st);
    seen[o.id] = st;
  });
  renderRecent();
}
btn.addEventListener('click', () => { const a = latestActive(); if(a) openTicket(a); });

function tick(){
  const due = new Set();
  for(const m of mounts){
    if(!m.el.isConnected){ mounts.delete(m); continue; }
    const o = find(m.id); if(!o) continue;
    update(m, o);
    due.add(o);
  }
  // real orders: keep asking even when no ticket is open, so the header dot and toast still fire
  const a = latestActive(); if(a) due.add(a);
  if(ORDER_URL && !document.hidden) due.forEach(o => {
    if(!o.demo && !settled(o) && Date.now() - (lastPoll[o.id] || 0) > POLL) poll(o.id);
  });
  watch();
}
setInterval(tick, 1000);

out.innerHTML = EMPTY;
watch();
window.JJTrack = { afterOrder, demoId };
})();
</script>
