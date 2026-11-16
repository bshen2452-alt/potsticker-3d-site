
<script>
(function(){
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const money = n => 'NT$ ' + n.toLocaleString('en-US');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- printed-style product art (inline SVG, halftone shading) ---------- */
const INK = '#1e1830', OR = '#f07a2a', RED = '#c8321f', SKIN = '#f7f5f0', PAPER = '#e7e5df';
let artN = 0;
function art(type, tint, mode){
  const id = 'a' + (++artN);
  const night = mode === 'night';
  const ink = night ? '#3ee6ff' : INK, fillSkin = night ? 'none' : SKIN;
  const dots = (c, r=1.2, s=5) => `<pattern id="${id}d${c.replace('#','')}${r}" width="${s}" height="${s}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><circle cx="${s/2}" cy="${s/2}" r="${r}" fill="${c}"/></pattern>`;
  const P = (c, r=1.2, s=5) => `url(#${id}d${c.replace('#','')}${r})`;
  let defs = dots(INK,1.2) + dots(RED,1.3) + dots(INK,.7,4) + dots(OR,1.4);
  let body = '';
  const pot = (x, y, s, rot) => {
    const g = `translate(${x} ${y}) rotate(${rot}) scale(${s})`;
    const shape = 'M-62,14 C-52,-14 -18,-26 6,-25 C34,-24 56,-10 62,8 C48,22 -40,26 -62,14 Z';
    return `<g transform="${g}">
      <clipPath id="${id}c${x}"><path d="${shape}"/></clipPath>
      <path d="${shape}" fill="${fillSkin}"/>
      <g clip-path="url(#${id}c${x})">
        <rect x="-70" y="6" width="140" height="30" fill="${night ? 'none' : (tint||OR)}"/>
        <rect x="-70" y="10" width="140" height="30" fill="${P(RED,1.3)}" opacity="${night?0:.8}"/>
        <path d="M-10,-30 C30,-26 70,-5 70,30 L70,40 L-10,40 Z" fill="${P(INK,1.2)}" opacity="${night?0:.55}"/>
      </g>
      <path d="${shape}" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M-48,-6 C-30,-20 10,-26 46,-10" fill="none" stroke="${ink}" stroke-width="1.6"/>
      ${[-36,-22,-8,6,20,34].map(px=>`<path d="M${px},${-15-Math.abs(px)*.08} q4,-6 2,-11" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`).join('')}
    </g>`;
  };
  if(type === 'potsticker'){
    body = pot(92,78,1,-8) + pot(66,52,.82,-14);
  } else if(type === 'lace'){
    const blob = Array.from({length:22},(_,i)=>{ const a=i/22*Math.PI*2, r=50+((i*37)%11)-4; return `${80+Math.cos(a)*r*1.25},${62+Math.sin(a)*r*.72}`; }).join(' ');
    body = `<polygon points="${blob}" fill="${night?'none':OR}" stroke="${ink}" stroke-width="2"/>
      ${Array.from({length:16},(_,i)=>{ const a=i*2.4, r=18+(i*13)%30; return `<ellipse cx="${80+Math.cos(a)*r*1.4}" cy="${62+Math.sin(a)*r*.75}" rx="${3+(i%3)*2}" ry="${2+(i%2)*2}" fill="${night?'none':PAPER}" stroke="${ink}" stroke-width="1.3"/>`; }).join('')}
      <rect x="0" y="0" width="160" height="120" fill="${P(RED,1.3)}" opacity="${night?0:.35}" clip-path="url(#${id}lc)"/>
      <clipPath id="${id}lc"><polygon points="${blob}"/></clipPath>
      ${[0,1,2].map(i=>{ const a=-1.9+i*1.0; return `<g transform="translate(${80+Math.cos(a)*30} ${62+Math.sin(a)*16}) rotate(${a*57+90})"><ellipse rx="10" ry="25" fill="${fillSkin}" stroke="${ink}" stroke-width="2"/><path d="M0,-20 L0,20" stroke="${ink}" stroke-width="1.4"/>${[-12,-4,4,12].map(y=>`<path d="M-4,${y} L4,${y}" stroke="${ink}" stroke-width="1.2"/>`).join('')}</g>`; }).join('')}`;
  } else if(type === 'boiled'){
    const d = (x,y,s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-40,14 C-46,-6 -22,-26 0,-26 C22,-26 46,-6 40,14 C26,22 -26,22 -40,14 Z" fill="${fillSkin}" stroke="${ink}" stroke-width="2.4"/><path d="M-26,-12 C-10,-22 10,-22 26,-12" fill="none" stroke="${ink}" stroke-width="1.6"/>${[-16,-6,4,14].map(px=>`<path d="M${px},-18 q3,-5 1,-9" stroke="${ink}" stroke-width="1.5" fill="none"/>`).join('')}<path d="M8,-10 C28,-6 40,4 38,14 L10,18 Z" fill="${P(INK,1.2)}" opacity="${night?0:.5}"/></g>`;
    body = `<ellipse cx="80" cy="88" rx="66" ry="16" fill="${night?'none':PAPER}" stroke="${ink}" stroke-width="2"/>` + d(58,72,.85) + d(102,74,.85) + d(80,58,.8);
    if(tint) body += `<path d="M30,92 Q80,104 130,92" stroke="${tint}" stroke-width="3" fill="none"/>`;
  } else if(type === 'wonton'){
    body = `<path d="M20,52 L140,52 C138,92 112,108 80,108 C48,108 22,92 20,52 Z" fill="${night?'none':SKIN}" stroke="${ink}" stroke-width="2.4"/>
      <ellipse cx="80" cy="52" rx="60" ry="12" fill="${night?'none':RED}" stroke="${ink}" stroke-width="2"/>
      <ellipse cx="80" cy="52" rx="60" ry="12" fill="${P(INK,1.2)}" opacity="${night?0:.35}"/>
      ${[[60,48],[84,44],[100,52],[72,56]].map(([x,y])=>`<path d="M${x-12},${y} q12,-14 24,0 q-12,8 -24,0z" fill="${fillSkin}" stroke="${ink}" stroke-width="1.6"/>`).join('')}
      <path d="M30,64 C40,96 120,96 130,64" fill="${P(INK,.7,4)}" opacity="${night?0:.5}"/>`;
  } else if(type === 'soup'){
    body = `<path d="M24,50 L136,50 C134,90 110,106 80,106 C50,106 26,90 24,50 Z" fill="${night?'none':SKIN}" stroke="${ink}" stroke-width="2.4"/>
      <ellipse cx="80" cy="50" rx="56" ry="11" fill="${night?'none':(tint||OR)}" stroke="${ink}" stroke-width="2"/>
      <ellipse cx="80" cy="50" rx="56" ry="11" fill="${P(INK,1.2)}" opacity="${night?0:.25}"/>
      <path d="M30,62 C40,96 120,96 130,62" fill="${P(INK,.7,4)}" opacity="${night?0:.5}"/>
      ${[60,80,100].map(x=>`<path d="M${x},38 c-6,-8 6,-12 0,-22" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`).join('')}`;
  } else if(type === 'drink'){
    body = `<path d="M54,26 L106,26 L98,108 L62,108 Z" fill="${night?'none':SKIN}" stroke="${ink}" stroke-width="2.4"/>
      <path d="M57,46 L103,46 L98,106 L62,106 Z" fill="${night?'none':(tint||OR)}"/>
      <path d="M80,46 L103,46 L98,106 L80,106 Z" fill="${P(INK,1.2)}" opacity="${night?0:.4}"/>
      <path d="M54,26 L106,26 L98,108 L62,108 Z" fill="none" stroke="${ink}" stroke-width="2.4"/>
      <path d="M86,10 L80,60" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`;
  } else if(type === 'side'){
    body = `<ellipse cx="80" cy="76" rx="64" ry="26" fill="${night?'none':SKIN}" stroke="${ink}" stroke-width="2.4"/>
      <ellipse cx="80" cy="74" rx="48" ry="17" fill="none" stroke="${ink}" stroke-width="1.2"/>
      ${[[56,70],[74,64],[92,72],[68,80],[100,64],[86,82]].map(([x,y],i)=>`<rect x="${x-9}" y="${y-6}" width="18" height="12" rx="${tint==='round'?6:2}" transform="rotate(${i*23-30} ${x} ${y})" fill="${night?'none':(i%2?OR:'#8a9a6a')}" stroke="${ink}" stroke-width="1.6"/>`).join('')}
      <path d="M80,92 C110,92 140,84 144,76 C142,90 116,102 80,102 Z" fill="${P(INK,1.2)}" opacity="${night?0:.5}"/>`;
  } else if(type === 'box'){
    body = `<g fill="none" stroke-linejoin="round">
      <path d="M40,46 L80,30 L124,44 L84,62 Z" stroke="#3ee6ff" stroke-width="2"/>
      <path d="M40,46 L40,88 L84,106 L84,62" stroke="#3ee6ff" stroke-width="2"/>
      <path d="M84,106 L124,88 L124,44" stroke="#3ee6ff" stroke-width="2"/>
      <path d="M60,38 L104,54 L104,98" stroke="${tint||'#ff8a3d'}" stroke-width="3"/>
      <path d="M62,54 L62,96" stroke="${tint||'#ff8a3d'}" stroke-width="3" opacity=".7"/>
      <path d="M96,40 q8,-14 16,-4 q-8,6 -16,4 q-2,-14 -14,-12 q2,10 14,12" stroke="${tint||'#ff8a3d'}" stroke-width="2"/>
      ${[[28,26],[136,30],[30,100],[140,96],[120,20]].map(([x,y])=>`<path d="M${x-5},${y} L${x+5},${y} M${x},${y-5} L${x},${y+5} M${x-3.5},${y-3.5} L${x+3.5},${y+3.5} M${x-3.5},${y+3.5} L${x+3.5},${y-3.5}" stroke="#3ee6ff" stroke-width="1.2" opacity=".7"/>`).join('')}
    </g>`;
    defs += `<filter id="${id}g" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
    return `<svg class="art" viewBox="0 0 160 120" role="img" aria-hidden="true"><defs>${defs}</defs><g filter="url(#${id}g)">${body}</g></svg>`;
  }
  return `<svg class="art" viewBox="0 0 160 120" role="img" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;
}

/* Photo-first product cards; retain original art until a matching image is available. */
const PHOTO_IDS = new Set(['pork','lace','shrimp','mala','cabbage','corn','b-pork','b-chive','b-shrimp','g-fortune','g-family','g-festival']);
function productVisual(item, mode){
  const fallback = item.gift ? art('box',item.tint,'night') : art(item.art,item.tint);
  if(!PHOTO_IDS.has(item.id)) return fallback;
  const src = 'assets/products/' + item.id + '.webp';
  return '<span class="product-visual"><img src="' + src + '" alt="' + esc(item.name) + '商品示意照片" loading="lazy" decoding="async" onerror="this.parentElement.classList.add(\'photo-failed\')">' + fallback + '</span>';
}

/* ---------- data (sample menu; replace with the shop's real items) ---------- */
const CATS = [
  {id:'potsticker', name:'招牌鍋貼'},
  {id:'boiled', name:'精選水餃'},
  {id:'soup', name:'湯品/飲料'},
  {id:'side', name:'經典小菜'}
];
const ITEMS = [
  {id:'pork', cat:'potsticker', name:'招牌豬肉鍋貼', desc:'台灣溫體豬前腿肉加高麗菜，咬開先噴湯汁。', price:70, unit:'10 顆', tags:['人氣','爆汁'], spicy:0, art:'potsticker'},
  {id:'lace', cat:'potsticker', name:'冰花煎餃', desc:'整盤倒扣上桌，薄脆冰花朝上，招牌必點。', price:85, unit:'10 顆', tags:['招牌'], spicy:0, art:'lace'},
  {id:'shrimp', cat:'potsticker', name:'韭黃鮮蝦鍋貼', desc:'整尾鮮蝦配韭黃，甜味比較清爽。', price:110, unit:'10 顆', tags:['人氣'], spicy:0, art:'potsticker', tint:'#e9b44c'},
  {id:'mala', cat:'potsticker', name:'麻辣鍋貼', desc:'花椒、辣油拌入肉餡，越吃越麻。', price:80, unit:'10 顆', tags:[], spicy:2, art:'potsticker', tint:RED},
  {id:'cabbage', cat:'potsticker', name:'高麗菜鍋貼', desc:'高山高麗菜比例加倍，口感脆甜。', price:70, unit:'10 顆', tags:[], spicy:0, art:'potsticker', tint:'#d9a441'},
  {id:'corn', cat:'potsticker', name:'玉米鍋貼', desc:'玉米粒加豬肉，小朋友最愛。', price:75, unit:'10 顆', tags:[], spicy:0, art:'potsticker', tint:'#f2c14e'},
  {id:'b-pork', cat:'boiled', name:'鮮肉水餃', desc:'皮薄餡多，沾醬油膏加蒜泥。', price:70, unit:'10 顆', tags:['人氣'], spicy:0, art:'boiled'},
  {id:'b-chive', cat:'boiled', name:'韭菜水餃', desc:'韭菜現切，香氣足。', price:70, unit:'10 顆', tags:[], spicy:0, art:'boiled'},
  {id:'b-shrimp', cat:'boiled', name:'鮮蝦水餃', desc:'每顆一尾蝦，Q彈有咬勁。', price:110, unit:'10 顆', tags:['爆汁'], spicy:0, art:'boiled', tint:OR},
  {id:'b-wonton', cat:'boiled', name:'紅油抄手', desc:'自製紅油加花椒粉，香辣不嗆。', price:80, unit:'8 顆', tags:[], spicy:2, art:'wonton'},
  {id:'s-hotsour', cat:'soup', name:'酸辣湯', desc:'豆腐、筍絲、木耳、蛋花，胡椒味足。', price:40, unit:'碗', tags:['人氣'], spicy:1, art:'soup', tint:'#b5562a'},
  {id:'s-corn', cat:'soup', name:'玉米濃湯', desc:'玉米粒現煮，濃稠香甜。', price:40, unit:'碗', tags:[], spicy:0, art:'soup', tint:'#f2c14e'},
  {id:'d-soy', cat:'soup', name:'古早味豆漿', desc:'每日現磨，微糖。', price:25, unit:'杯', tags:[], spicy:0, art:'drink', tint:'#efe6cf'},
  {id:'d-tea', cat:'soup', name:'古早味紅茶', desc:'炒糖熬煮，解膩剛好。', price:25, unit:'杯', tags:[], spicy:0, art:'drink', tint:'#a8542a'},
  {id:'x-cuke', cat:'side', name:'涼拌小黃瓜', desc:'蒜末、辣油、香油，爽口開胃。', price:40, unit:'盤', tags:[], spicy:1, art:'side'},
  {id:'x-tofu', cat:'side', name:'滷豆干', desc:'老滷汁慢滷一整晚。', price:35, unit:'盤', tags:['人氣'], spicy:0, art:'side', tint:'round'},
  {id:'x-egg', cat:'side', name:'皮蛋豆腐', desc:'嫩豆腐配皮蛋、肉鬆、醬油膏。', price:45, unit:'盤', tags:[], spicy:0, art:'side', tint:'round'},
  {id:'x-veg', cat:'side', name:'燙青菜', desc:'當季青菜，淋肉燥。', price:40, unit:'盤', tags:[], spicy:0, art:'side'}
];
const GIFTS = [
  {id:'g-fortune', name:'招財鍋貼禮盒', unit:'50 入', price:699, desc:'招牌豬肉鍋貼 50 顆，附自製沾醬兩包。過年送禮最常被指名。', tint:'#ff8a3d', gift:true},
  {id:'g-family', name:'家庭常備組', unit:'80 入', price:999, desc:'豬肉、高麗菜、玉米三種口味各一袋，冷凍庫裡放著就安心。', tint:'#ff4fa3', gift:true},
  {id:'g-festival', name:'節慶伴手禮盒', unit:'60 入', price:880, desc:'鍋貼 30 顆加鮮蝦水餃 30 顆，附煎法說明卡與提袋。', tint:'#3ee6ff', gift:true}
];
const ALL = Object.fromEntries([...ITEMS, ...GIFTS].map(i => [i.id, i]));

const STORES = [
  {id:'flag', name:'旗艦店', area:'台北 · 大安', addr:'台北市大安區金煎路一段 219 巷 12 號', tel:'02-0000-0001',
   hours:[[660,1500],[660,1500],[660,1500],[660,1500],[660,1500],[660,1500],[660,1500]], note:'宵夜時段 21:00 後供應冰花煎餃限定加大份', plats:['Uber Eats','foodpanda'], roads:['金煎路一段','麵香路四段','冰花街'], seed:3},
  {id:'xinyi', name:'信義店', area:'台北 · 信義', addr:'台北市信義區鍋貼路 58 號 1 樓', tel:'02-0000-0002',
   hours:[[660,1260],null,[660,1260],[660,1260],[660,1260],[660,1260],[660,1260]], note:'每週一公休', plats:['Uber Eats','foodpanda'], roads:['鍋貼路','蔥花路','酥脆路五段'], seed:7},
  {id:'banqiao', name:'板橋店', area:'新北 · 板橋', addr:'新北市板橋區餃子路 32 號', tel:'02-0000-0003',
   hours:[[630,1230],[630,1230],[630,1230],[630,1230],[630,1230],[630,1230],[630,1230]], note:'捷運站 1 號出口步行 3 分鐘', plats:['foodpanda'], roads:['餃子路','韭黃街','麵粉路一段'], seed:11}
];
const DAYS = ['週日','週一','週二','週三','週四','週五','週六'];
const hm = m => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0'); };
function taipeiNow(){
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei', weekday:'short', hour:'2-digit', minute:'2-digit', hour12:false}).formatToParts(new Date());
  const g = k => parts.find(p => p.type === k).value;
  const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(g('weekday'));
  return {day, min: (parseInt(g('hour'),10) % 24)*60 + parseInt(g('minute'),10)};
}
function storeStatus(s){
  const {day, min} = taipeiNow();
  const today = s.hours[day], yest = s.hours[(day+6)%7];
  if(yest && yest[1] > 1440 && min < yest[1]-1440) return {open:true, text:`營業中 · ${hm(yest[1])} 打烊`};
  if(today && min >= today[0] && min < today[1]) return {open:true, text:`營業中 · ${hm(today[1])} 打烊`};
  if(today && min < today[0]) return {open:false, text:`已打烊 · 今天 ${hm(today[0])} 開門`};
  for(let i=1;i<=7;i++){ const d = s.hours[(day+i)%7]; if(d) return {open:false, text: today ? `已打烊 · ${i===1?'明天':DAYS[(day+i)%7]} ${hm(d[0])} 開門` : `今日公休 · ${i===1?'明天':DAYS[(day+i)%7]} ${hm(d[0])} 開門`}; }
  return {open:false, text:'暫停營業'};
}

/* ---------- toast ---------- */
const toast = $('#toast'); let toastT;
function showToast(msg, withView=true){
  $('#toast-t').textContent = msg;
  $('#toast-btn').hidden = !withView;
  toast.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(()=>toast.classList.remove('show'), 2600);
}
$('#toast-btn').addEventListener('click', ()=>{ toast.classList.remove('show'); openDrawer(); });

/* ---------- cart ---------- */
let cart = [];
try{ const s = JSON.parse(localStorage.getItem('jj-cart') || '[]'); if(Array.isArray(s)) cart = s.filter(l => ALL[l.id] && l.qty > 0); }catch(e){}
const save = () => { try{ localStorage.setItem('jj-cart', JSON.stringify(cart)); }catch(e){} };
const count = () => cart.reduce((a,l) => a + l.qty, 0);
const subtotal = () => cart.reduce((a,l) => a + ALL[l.id].price*l.qty, 0);
function add(id, qty=1){
  const l = cart.find(x => x.id === id);
  if(l) l.qty = Math.min(99, l.qty + qty); else cart.push({id, qty});
  save(); renderCart(true);
  showToast(`已加入購物車：${ALL[id].name}`);
}
function setQty(id, q){
  const l = cart.find(x => x.id === id); if(!l) return;
  l.qty = Math.max(0, Math.min(99, q));
  if(l.qty === 0) cart = cart.filter(x => x.id !== id);
  save(); renderCart();
}
function renderCart(bump){
  const n = count(), badge = $('#cart-badge');
  badge.hidden = n === 0; badge.textContent = n > 99 ? '99+' : n;
  if(bump){ badge.classList.remove('pop'); void badge.offsetWidth; badge.classList.add('pop'); }
  $('#cart-open').setAttribute('aria-label', `開啟購物車，目前 ${n} 件`);
  const list = $('#dr-list');
  if(!cart.length){
    list.innerHTML = `<li class="empty"><b>購物車是空的</b>到菜單挑幾樣吧，鍋貼點了才下鍋。</li>`;
  } else {
    list.innerHTML = cart.map(l => { const it = ALL[l.id]; return `
      <li class="ci">
        ${it.gift ? art('box', it.tint, 'night').replace('class="art"','class="art" style="background:#0c0913"') : art(it.art, it.tint)}
        <div><b>${esc(it.name)}</b><small>${money(it.price)} / ${esc(it.unit)}</small><br><button class="del" type="button" data-del="${l.id}">刪除</button></div>
        <div class="ci-r">
          <span class="sum">${money(it.price*l.qty)}</span>
          <div class="step" role="group" aria-label="${esc(it.name)} 數量">
            <button type="button" data-dec="${l.id}" aria-label="減少">−</button><output aria-live="polite">${l.qty}</output><button type="button" data-inc="${l.id}" aria-label="增加">+</button>
          </div>
        </div>
      </li>`; }).join('');
  }
  const sub = subtotal();
  $('#dr-sub').textContent = money(sub);
  $('#dr-total').textContent = money(sub);
  $('#go-checkout').disabled = !cart.length;
}
$('#dr-list').addEventListener('click', e => {
  const b = e.target.closest('button'); if(!b) return;
  if(b.dataset.inc){ const l = cart.find(x=>x.id===b.dataset.inc); setQty(b.dataset.inc, l.qty+1); }
  if(b.dataset.dec){ const l = cart.find(x=>x.id===b.dataset.dec); setQty(b.dataset.dec, l.qty-1); }
  if(b.dataset.del){ const name = ALL[b.dataset.del].name; setQty(b.dataset.del, 0); showToast(`已刪除：${name}`, false); }
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-add]'); if(b) add(b.dataset.add);
  const buy = e.target.closest('[data-buy]'); if(buy){ add(buy.dataset.buy); openCheckout(); }
});

/* ---------- overlays: drawer + modals ---------- */
const scrim = $('#scrim'), drawer = $('#drawer');
let lastFocus = null, openLayer = null;
function lock(on){ document.body.classList.toggle('lock', on); }
function showScrim(on){
  if(on){ scrim.hidden = false; requestAnimationFrame(()=>scrim.classList.add('show')); }
  else { scrim.classList.remove('show'); setTimeout(()=>{ if(!openLayer) scrim.hidden = true; }, 260); }
}
function openLayerEl(el, focusSel){
  if(openLayer && openLayer !== el) closeLayer(true);
  lastFocus = lastFocus || document.activeElement;
  openLayer = el; el.classList.add('open'); el.setAttribute('aria-hidden','false');
  showScrim(true); lock(true);
  setTimeout(()=>{ const f = $(focusSel || '[data-close]', el); f && f.focus(); }, 50);
}
function closeLayer(keepScrim){
  if(!openLayer) return;
  openLayer.classList.remove('open'); openLayer.setAttribute('aria-hidden','true');
  openLayer = null;
  if(!keepScrim){ showScrim(false); lock(false); if(lastFocus) lastFocus.focus(); lastFocus = null; }
}
function openDrawer(){ renderCart(); openLayerEl(drawer); }
$('#cart-open').addEventListener('click', openDrawer);
scrim.addEventListener('click', ()=>closeLayer());
$$('[data-close]').forEach(b => b.addEventListener('click', ()=>closeLayer()));
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && openLayer) closeLayer();
  if(e.key === 'Tab' && openLayer){
    const f = $$('button:not([disabled]),input:not([disabled]),select,textarea,a[href]', openLayer).filter(x => x.offsetParent !== null);
    if(!f.length) return;
    if(e.shiftKey && document.activeElement === f[0]){ e.preventDefault(); f[f.length-1].focus(); }
    else if(!e.shiftKey && document.activeElement === f[f.length-1]){ e.preventDefault(); f[0].focus(); }
  }
});
$('#privacy-open').addEventListener('click', ()=>openLayerEl($('#privacy')));

/* ---------- checkout ---------- */
const coBody = $('#co-body');
let coMode = 'takeout';
function slots(){
  const {min} = taipeiNow();
  const start = Math.ceil((min + 15)/15)*15;
  return Array.from({length:9}, (_,i) => hm(start + i*15));
}
function shipping(mode, sub){ return mode === 'delivery' ? (sub >= 1500 ? 0 : 150) : 0; }
function openCheckout(){
  if(!cart.length) return;
  const onlyGifts = cart.every(l => ALL[l.id].gift);
  const hasGifts = cart.some(l => ALL[l.id].gift);
  if(coMode === 'delivery' && !onlyGifts) coMode = 'takeout';
  if(onlyGifts) coMode = 'delivery';
  coBody.innerHTML = `
    <form id="co-form" novalidate>
      <fieldset>
        <legend>取餐方式</legend>
        <div class="modes">
          <div class="mode"><input type="radio" name="mode" id="m-dinein" value="dinein" ${coMode==='dinein'?'checked':''}><label for="m-dinein"><b>內用</b><small>到店用餐，現煎上桌</small></label></div>
          <div class="mode"><input type="radio" name="mode" id="m-takeout" value="takeout" ${coMode==='takeout'?'checked':''}><label for="m-takeout"><b>外帶</b><small>選門市與取餐時間</small></label></div>
          <div class="mode"><input type="radio" name="mode" id="m-delivery" value="delivery" ${coMode==='delivery'?'checked':''} ${onlyGifts?'':'disabled'}><label for="m-delivery"><b>宅配</b><small>冷凍禮盒限定</small></label></div>
        </div>
      </fieldset>
      <p class="note ${onlyGifts?'':'warn'}" id="co-note">${onlyGifts ? '冷凍禮盒以低溫宅配寄送，滿 NT$ 1,500 免運，未滿酌收 NT$ 150。' : hasGifts ? '購物車內有現煎餐點，無法宅配。禮盒可一併到門市取貨。' : '現煎餐點不提供宅配，請選擇內用或外帶。'}</p>
      <div id="co-where"></div>
      <div class="grid2">
        <div class="f"><label for="co-name">姓名</label><input id="co-name" name="name" autocomplete="name" required><span class="e" id="co-name-e"></span></div>
        <div class="f"><label for="co-tel">手機</label><input id="co-tel" name="tel" type="tel" inputmode="tel" autocomplete="tel" placeholder="0912345678" required><span class="e" id="co-tel-e"></span></div>
      </div>
      <div class="f"><label for="co-note-t">備註（選填）</label><textarea id="co-note-t" name="note" placeholder="例如：醬料多一包、不要辣"></textarea><span class="e"></span></div>
      <div class="osum" id="co-sum"></div>
      <button class="go" type="submit">送出訂單</button>
    </form>`;
  renderWhere(); renderSum();
  $$('input[name="mode"]', coBody).forEach(r => r.addEventListener('change', () => { coMode = r.value; renderWhere(); renderSum(); }));
  $('#co-form').addEventListener('submit', submitOrder);
  openLayerEl($('#checkout'), 'input[name="mode"]:checked');
}
function renderWhere(){
  const w = $('#co-where'); const opts = STORES.map(s => `<option value="${s.id}">${s.name}（${s.area}）</option>`).join('');
  if(coMode === 'delivery'){
    w.innerHTML = `<div class="f"><label for="co-addr">宅配地址</label><input id="co-addr" name="addr" autocomplete="street-address" placeholder="縣市、區、路名、門牌" required><span class="e" id="co-addr-e"></span></div>
      <div class="f"><label for="co-date">希望到貨日</label><select id="co-date" name="date">${[2,3,4,5].map(d=>{ const dt=new Date(Date.now()+d*864e5); return `<option>${dt.getMonth()+1}/${dt.getDate()}（${DAYS[dt.getDay()]}）</option>`; }).join('')}</select><span class="e"></span></div>`;
  } else if(coMode === 'dinein'){
    w.innerHTML = `<div class="grid2"><div class="f"><label for="co-store">門市</label><select id="co-store" name="store">${opts}</select><span class="e"></span></div>
      <div class="f"><label for="co-ppl">用餐人數</label><select id="co-ppl" name="ppl">${[1,2,3,4,5,6].map(n=>`<option>${n} 位</option>`).join('')}</select><span class="e"></span></div></div>`;
  } else {
    w.innerHTML = `<div class="grid2"><div class="f"><label for="co-store">取餐門市</label><select id="co-store" name="store">${opts}</select><span class="e"></span></div>
      <div class="f"><label for="co-time">取餐時間</label><select id="co-time" name="time"><option value="asap">盡快（約 15 分鐘）</option>${slots().map(s=>`<option>${s}</option>`).join('')}</select><span class="e"></span></div></div>`;
  }
}
function renderSum(){
  const sub = subtotal(), ship = shipping(coMode, sub);
  $('#co-sum').innerHTML = `<ul>${cart.map(l=>`<li><span>${esc(ALL[l.id].name)} × ${l.qty}</span><span>${money(ALL[l.id].price*l.qty)}</span></li>`).join('')}</ul>
    <div class="row"><span>小計</span><span>${money(sub)}</span></div>
    ${coMode==='delivery' ? `<div class="row"><span>運費</span><span>${ship ? money(ship) : '免運'}</span></div>` : ''}
    <div class="row total"><span>總金額</span><span>${money(sub+ship)}</span></div>`;
}
function fieldErr(id, msg){ const el = $('#'+id); el.setAttribute('aria-invalid', msg ? 'true' : 'false'); $('#'+id+'-e').textContent = msg || ''; return !msg; }
function submitOrder(e){
  e.preventDefault();
  const name = $('#co-name').value.trim(), tel = $('#co-tel').value.replace(/[\s-]/g,'');
  let ok = fieldErr('co-name', name ? '' : '請填寫姓名');
  ok = fieldErr('co-tel', /^09\d{8}$/.test(tel) ? '' : '請填寫 09 開頭的 10 碼手機號碼') && ok;
  if(coMode === 'delivery'){ const a = $('#co-addr').value.trim(); ok = fieldErr('co-addr', a.length >= 8 ? '' : '請填寫完整地址（含縣市與門牌）') && ok; }
  if(!ok){ const bad = $('[aria-invalid="true"]', coBody); bad && bad.focus(); return; }
  const d = new Date(), no = 'JJ' + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') + '-' + String(Math.floor(Math.random()*900)+100);
  const total = subtotal() + shipping(coMode, subtotal());
  let where = '';
  if(coMode === 'delivery') where = `禮盒將於 ${$('#co-date').value} 送達，出貨時會以簡訊通知。`;
  else { const s = STORES.find(x => x.id === $('#co-store').value); const tm = coMode==='takeout' ? $('#co-time').value : null;
    where = coMode === 'dinein' ? `已為你在${s.name}保留 ${$('#co-ppl').value}，到店報手機末三碼即可。` : `請${tm==='asap' ? '約 15 分鐘後' : '於 ' + tm + ' '}至${s.name}取餐（${s.addr}）。`; }
  coBody.innerHTML = `<div class="ok-box">
      <div class="ok-ic"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#1e1830" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <h3>訂單已建立</h3>
      <div class="no">${no}</div>
      <p>${esc(name)}，謝謝你的訂購！${esc(where)} 應付金額 ${money(total)}。</p>
      <button class="go" type="button" id="co-done">完成</button>
    </div>`;
  cart = []; save(); renderCart();
  $('#co-done').addEventListener('click', ()=>closeLayer());
  $('#co-done').focus();
}
$('#go-checkout').addEventListener('click', openCheckout);

/* ---------- menu tabs ---------- */
const tabsEl = $('#tabs'), grid = $('#menu-grid');
let curCat = 'potsticker';
tabsEl.innerHTML = CATS.map(c => `<button class="tab" role="tab" type="button" id="tab-${c.id}" data-cat="${c.id}" aria-selected="${c.id===curCat}" tabindex="${c.id===curCat?0:-1}" aria-controls="menu-grid">${c.name}<span class="cnt">${ITEMS.filter(i=>i.cat===c.id).length}</span></button>`).join('');
const chili = n => n ? `<span class="chili" title="辣度 ${n}/3">${[1,2,3].map(i=>`<i class="${i<=n?'':'off'}"></i>`).join('')}<span class="sr">辣度 ${n}</span></span>` : '';
function tagHtml(t){ return `<span class="tag ${t==='人氣'?'hot':t==='招牌'?'sig':''}">${t}</span>`; }
function renderMenu(){
  grid.innerHTML = ITEMS.filter(i => i.cat === curCat).map(i => `
    <article class="item">
      ${productVisual(i)}
      <div class="item-b">
        <h3>${esc(i.name)}</h3>
        <div class="tags">${i.tags.map(tagHtml).join('')}${chili(i.spicy)}</div>
        <p>${esc(i.desc)}</p>
        <div class="item-f"><span class="price">${money(i.price)}<small>/ ${esc(i.unit)}</small></span><button class="add" type="button" data-add="${i.id}" aria-label="將 ${esc(i.name)} 加入購物車">＋ 加入購物車</button></div>
      </div>
    </article>`).join('');
  grid.setAttribute('aria-labelledby', 'tab-' + curCat);
  grid.classList.remove('fade'); void grid.offsetWidth; grid.classList.add('fade');
}
function selectTab(id, focus){
  curCat = id;
  $$('.tab', tabsEl).forEach(t => { const on = t.dataset.cat === id; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if(on && focus) t.focus(); });
  renderMenu();
}
tabsEl.addEventListener('click', e => { const t = e.target.closest('.tab'); if(t) selectTab(t.dataset.cat); });
tabsEl.addEventListener('keydown', e => {
  const i = CATS.findIndex(c => c.id === curCat);
  if(e.key === 'ArrowRight'){ e.preventDefault(); selectTab(CATS[(i+1)%CATS.length].id, true); }
  if(e.key === 'ArrowLeft'){ e.preventDefault(); selectTab(CATS[(i+CATS.length-1)%CATS.length].id, true); }
});
renderMenu();

/* ---------- featured over the 3D pan ---------- */
$('#feat-list').innerHTML = ['pork','lace','shrimp'].map(id => { const i = ALL[id]; return `
  <li>${productVisual(i)}<div><b>${esc(i.name)}</b><small>${money(i.price)} · ${esc(i.unit)}${i.tags.length ? ' · ' + i.tags.join('、') : ''}</small></div>
  <button class="add-mini" type="button" data-add="${id}" aria-label="將 ${esc(i.name)} 加入購物車">＋</button></li>`; }).join('');

/* ---------- gifts ---------- */
$('#gift-grid').innerHTML = GIFTS.map(g => `
  <article class="gift">
    ${productVisual(g)}
    <div class="gift-b">
      <h3>${esc(g.name)} <small style="font:500 13px var(--mono);color:var(--n-muted)">${esc(g.unit)}</small></h3>
      <p>${esc(g.desc)}</p>
      <span class="price">${money(g.price)}<small>/ 盒</small></span>
      <div class="gift-f"><button class="nbtn solid" type="button" data-buy="${g.id}">直接購買</button><button class="nbtn" type="button" data-add="${g.id}">加入購物車</button></div>
    </div>
  </article>`).join('');

/* ---------- stores + neon map ---------- */
let curStore = 0, zoom = 1;
function rng(seed){ let s = seed*9301 + 49297; return () => (s = (s*9301 + 49297) % 233280) / 233280; }
function mapSvg(s){
  const r = rng(s.seed); const ang = (r()-.5)*30;
  let minor = '';
  for(let i=-8;i<=8;i++){ const o = i*44 + r()*14; minor += `<line x1="${300+o}" y1="-300" x2="${300+o}" y2="720" /><line x1="-300" y1="${210+o}" x2="900" y2="${210+o}" />`; }
  let blocks = '';
  for(let i=0;i<26;i++){ const x = r()*560+20, y = r()*380+20, w = 18+r()*30, h = 14+r()*26; blocks += `<rect x="${x}" y="${y}" width="${w}" height="${h}" />`; }
  const river = s.seed === 11 ? `<path d="M-40,360 C120,300 220,380 360,330 S560,250 660,290" stroke="#3ee6ff" stroke-opacity=".25" stroke-width="22" fill="none"/>` : '';
  return `<svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><filter id="glow" filterUnits="userSpaceOnUse" x="-400" y="-400" width="1400" height="1300"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <g class="map-g" style="transform:scale(${zoom})">
      ${river}
      <g transform="rotate(${ang} 300 210)">
        <g fill="#ffffff" fill-opacity=".035">${blocks}</g>
        <g stroke="#a59bb8" stroke-opacity=".16" stroke-width="1">${minor}</g>
        <line x1="-300" y1="210" x2="900" y2="210" stroke="#ff4fa3" stroke-opacity=".55" stroke-width="5" filter="url(#glow)"/>
        <line x1="300" y1="-300" x2="300" y2="720" stroke="#ff8a3d" stroke-opacity=".6" stroke-width="5" filter="url(#glow)"/>
        <line x1="-300" y1="${210+132}" x2="900" y2="${210+132}" stroke="#3ee6ff" stroke-opacity=".35" stroke-width="3"/>
        <text x="40" y="200" fill="#ff4fa3" font-size="13" font-family="Noto Sans TC, sans-serif" opacity=".85">${esc(s.roads[1])}</text>
        <text x="312" y="60" fill="#ff8a3d" font-size="13" font-family="Noto Sans TC, sans-serif" opacity=".85">${esc(s.roads[0])}</text>
        <text x="420" y="${210+124}" fill="#3ee6ff" font-size="12" font-family="Noto Sans TC, sans-serif" opacity=".7">${esc(s.roads[2])}</text>
      </g>
      <g transform="translate(318 196)">
        <circle r="22" fill="#ff8a3d" opacity=".18"><animate attributeName="r" values="10;30;10" dur="2.4s" repeatCount="indefinite"/><animate attributeName="opacity" values=".35;0;.35" dur="2.4s" repeatCount="indefinite"/></circle>
        <path d="M0,0 C-12,-14 -14,-22 -14,-28 A14,14 0 1 1 14,-28 C14,-22 12,-14 0,0 Z" fill="#ff8a3d" filter="url(#glow)"/>
        <circle cy="-28" r="5" fill="#0c0913"/>
      </g>
    </g>
  </svg>`;
}
function renderStores(){
  $('#store-tabs').innerHTML = STORES.map((s,i) => { const st = storeStatus(s); return `<button class="store-tab" role="tab" type="button" id="st-${s.id}" aria-selected="${i===curStore}" tabindex="${i===curStore?0:-1}" data-i="${i}"><span class="dot ${st.open?'open':''}"></span>${s.name}</button>`; }).join('');
  const s = STORES[curStore], st = storeStatus(s), {day} = taipeiNow();
  const order = [1,2,3,4,5,6,0];
  $('#store-card').setAttribute('aria-labelledby', 'st-' + s.id);
  $('#store-card').innerHTML = `
    <h3>${s.name} <small style="font:500 13px var(--mono);color:var(--n-muted)">${s.area}</small></h3>
    <span class="status ${st.open?'open':'closed'}">● ${st.text}</span>
    <dl class="dl">
      <dt>地址</dt><dd><span id="st-addr">${esc(s.addr)}</span><span class="demo">示範</span><button class="copy" type="button" data-copy="st-addr">複製</button></dd>
      <dt>電話</dt><dd><span id="st-tel">${s.tel}</span><button class="copy" type="button" data-copy="st-tel">複製</button></dd>
      <dt>營業時間</dt><dd><ul class="hours">${order.map(d => `<li class="${d===day?'today':''}"><span>${DAYS[d]}${d===day?'（今天）':''}</span><span>${s.hours[d] ? hm(s.hours[d][0]) + ' – ' + hm(s.hours[d][1]) : '公休'}</span></li>`).join('')}</ul></dd>
      <dt>備註</dt><dd>${esc(s.note)}</dd>
      <dt>外送</dt><dd><div class="platforms">${s.plats.map(p => `<span class="plat">${p}</span>`).join('')}</div></dd>
    </dl>`;
  const q = encodeURIComponent('煎記鍋貼 ' + s.addr);
  $('#map').innerHTML = `${mapSvg(s)}
    <span class="map-badge">${s.area}</span>
    <div class="map-ui"><button type="button" id="zin" aria-label="放大地圖">+</button><button type="button" id="zout" aria-label="縮小地圖">−</button></div>
    <div class="map-bar"><div><b>煎記鍋貼 ${s.name}</b><small>${esc(s.addr)}</small></div>
      <a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">在 Google 地圖開啟 ↗</a></div>`;
  $('#zin').addEventListener('click', () => setZoom(zoom + .25));
  $('#zout').addEventListener('click', () => setZoom(zoom - .25));
}
function setZoom(z){ zoom = Math.max(.75, Math.min(2, z)); const g = $('.map-g'); if(g) g.style.transform = `scale(${zoom})`; }
$('#store-tabs').addEventListener('click', e => { const b = e.target.closest('.store-tab'); if(!b) return; curStore = +b.dataset.i; zoom = 1; renderStores(); $('#st-' + STORES[curStore].id).focus(); });
$('#store-tabs').addEventListener('keydown', e => {
  if(e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; e.preventDefault();
  curStore = (curStore + (e.key === 'ArrowRight' ? 1 : STORES.length-1)) % STORES.length; zoom = 1; renderStores(); $('#st-' + STORES[curStore].id).focus();
});
renderStores();
setInterval(renderStoresStatusOnly, 60000);
function renderStoresStatusOnly(){ const f = document.activeElement && document.activeElement.closest('#stores'); if(!f) renderStores(); }

/* ---------- copy buttons ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]'); if(!b) return;
  const el = document.getElementById(b.dataset.copy); const text = el.textContent.trim();
  const done = () => showToast(`已複製：${text}`, false);
  const fallback = () => { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); showToast('已選取文字，請按複製', false); };
  try{ navigator.clipboard.writeText(text).then(done, fallback); }catch(err){ fallback(); }
});

/* ---------- FAQ accordion ---------- */
const FAQ = [
  ['點餐', [
    ['線上點餐後多久可以取餐？', '鍋貼都是點了才下鍋，從下單到起鍋約 10 至 15 分鐘。尖峰時段（11:30–13:00、17:30–19:30）可能需要 20 分鐘，建議預選取餐時間。'],
    ['可以預約取餐時間嗎？', '可以。結帳時選擇「外帶」，就能挑選 15 分鐘一格的取餐時段，最晚可預約兩小時後。'],
    ['可以只點 5 顆嗎？', '線上點餐以每份 10 顆為單位。想加點或減量，可以在備註中說明，門市會依顆數現場調整價格。']
  ]],
  ['保存方式', [
    ['冷凍禮盒收到後要怎麼保存？', '收到後請立刻放入冷凍庫（−18°C 以下），可保存 60 天。退冰再冷凍會讓麵皮變軟、容易破，請不要反覆解凍。'],
    ['在家怎麼煎出冰花？', '不用退冰。平底鍋抹油，排好鍋貼開中火煎 1 分鐘，淋入禮盒附的冰花粉水（約 120ml），蓋鍋悶 6 分鐘，開蓋收乾水分再煎 1 分鐘，倒扣盛盤即可，總共約 8 分鐘。'],
    ['外帶的鍋貼吃不完可以放多久？', '冷藏建議一天內吃完。回熱時用平底鍋小火乾煎 3 分鐘，比微波更能保住酥脆的底。']
  ]],
  ['外送與宅配', [
    ['有提供外送嗎？', '旗艦店與信義店可透過 Uber Eats、foodpanda 訂購，板橋店目前只上架 foodpanda。外送價格以各平台為準。'],
    ['宅配範圍與運費？', '冷凍禮盒以低溫宅配寄送，本島皆可配送，滿 NT$ 1,500 免運，未滿酌收 NT$ 150。離島暫不配送。'],
    ['現煎餐點可以宅配嗎？', '為了口感，現煎鍋貼、湯品與小菜只提供內用和外帶，宅配僅限冷凍禮盒。']
  ]]
];
let qn = 0;
$('#faq').innerHTML = FAQ.map(([g, qs]) => `<div class="faq-grp">${g}</div>` + qs.map(([q,a]) => { const i = ++qn; return `
  <div class="qa"><h3><button type="button" aria-expanded="false" aria-controls="qa-${i}" id="qb-${i}">${esc(q)}</button></h3>
  <div class="qa-a" id="qa-${i}" role="region" aria-labelledby="qb-${i}"><div><p>${esc(a)}</p></div></div></div>`; }).join('')).join('');
$('#faq').addEventListener('click', e => {
  const b = e.target.closest('.qa button'); if(!b) return;
  const qa = b.closest('.qa'), open = !qa.classList.contains('open');
  $$('.qa.open', $('#faq')).forEach(x => { if(x !== qa){ x.classList.remove('open'); $('button', x).setAttribute('aria-expanded','false'); } });
  qa.classList.toggle('open', open); b.setAttribute('aria-expanded', open);
});

/* ---------- newsletter ---------- */
$('#news').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('#news-email').value.trim(), m = $('#news-msg');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)){ m.className = 'news-msg err'; m.textContent = 'Email 格式不正確，請再檢查一次。'; $('#news-email').focus(); return; }
  m.className = 'news-msg ok'; m.textContent = `已訂閱，下一封電子報會寄到 ${v}。`; $('#news-email').value = '';
});

/* ---------- nav: mobile toggle + current section ---------- */
const nav = $('#nav'), mb = $('#menu-btn');
mb.addEventListener('click', () => { const o = !nav.classList.contains('open'); nav.classList.toggle('open', o); mb.setAttribute('aria-expanded', o); mb.textContent = o ? '關閉' : '選單'; });
$$('a', nav).forEach(a => a.addEventListener('click', () => { nav.classList.remove('open'); mb.setAttribute('aria-expanded','false'); mb.textContent = '選單'; }));
const secIds = ['hero','brand','featured','order','lace','gift','stores','contact'];
const navIO = new IntersectionObserver(es => es.forEach(e => {
  if(!e.isIntersecting) return;
  $$('a', nav).forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id));
  $$('a[aria-current]', nav).forEach(a => a.setAttribute('aria-current','true'));
}), {rootMargin:'-45% 0px -50% 0px'});
secIds.forEach(id => navIO.observe(document.getElementById(id)));

/* ---------- stats count-up ---------- */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const statIO = new IntersectionObserver(es => es.forEach(e => {
  if(!e.isIntersecting) return; statIO.unobserve(e.target);
  const el = e.target, to = +el.dataset.count;
  if(reduce){ el.textContent = to.toLocaleString('en-US'); return; }
  const t0 = performance.now();
  (function tick(now){ const k = Math.min(1, (now-t0)/1400), v = Math.round(to*(1-Math.pow(1-k,3))); el.textContent = v.toLocaleString('en-US'); if(k < 1) requestAnimationFrame(tick); })(t0);
}), {threshold:.6});
$$('[data-count]').forEach(el => { el.textContent = el.dataset.count === '10000' ? '10,000' : el.dataset.count; statIO.observe(el); });

renderCart();
})();
</script>
