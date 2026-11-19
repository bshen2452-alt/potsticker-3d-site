/**
 * 煎記鍋貼 · 線上訂單接收程式（Google Apps Script 網頁應用程式）
 *
 * 網站結帳 → POST 到這支程式 → 驗證、重新計價 → 寫入試算表「訂單」工作表。
 * 訂單查詢 → GET ?action=status&id=訂單編號&tel=手機末三碼 → 回傳狀態與品項（不含姓名、手機、地址）。
 * 安裝與部署步驟見同資料夾的 README.md。
 *
 * 價格與門市以這裡為準，不信任網頁送來的金額。
 * 修改網站菜單（src/d_shop.js 的 ITEMS / GIFTS / STORES）時，這裡也要一起改。
 */

// 訂單要寫入的試算表 ID（網址 /d/ 與 /edit 之間那一段）
const SPREADSHEET_ID = '1YtDO3NcpehE2O2JI1mWgBt1TiefgFMaG_z6zmhLMPNc';
const SHEET_NAME = '訂單';

const MENU = {
  'pork':      { name: '招牌豬肉鍋貼', price: 70 },
  'lace':      { name: '冰花煎餃',     price: 85 },
  'shrimp':    { name: '韭黃鮮蝦鍋貼', price: 110 },
  'mala':      { name: '麻辣鍋貼',     price: 80 },
  'cabbage':   { name: '高麗菜鍋貼',   price: 70 },
  'corn':      { name: '玉米鍋貼',     price: 75 },
  'b-pork':    { name: '鮮肉水餃',     price: 70 },
  'b-chive':   { name: '韭菜水餃',     price: 70 },
  'b-shrimp':  { name: '鮮蝦水餃',     price: 110 },
  'b-wonton':  { name: '紅油抄手',     price: 80 },
  's-hotsour': { name: '酸辣湯',       price: 40 },
  's-corn':    { name: '玉米濃湯',     price: 40 },
  'd-soy':     { name: '古早味豆漿',   price: 25 },
  'd-tea':     { name: '古早味紅茶',   price: 25 },
  'x-cuke':    { name: '涼拌小黃瓜',   price: 40 },
  'x-tofu':    { name: '滷豆干',       price: 35 },
  'x-egg':     { name: '皮蛋豆腐',     price: 45 },
  'x-veg':     { name: '燙青菜',       price: 40 },
  'g-fortune': { name: '招財鍋貼禮盒', price: 699, gift: true },
  'g-family':  { name: '家庭常備組',   price: 999, gift: true },
  'g-festival':{ name: '節慶伴手禮盒', price: 880, gift: true }
};

const STORES = { flag: '旗艦店', xinyi: '信義店', banqiao: '板橋店' };
const MODES = { dinein: '內用', takeout: '外帶', delivery: '宅配' };

const FREE_SHIPPING = 1500;
const SHIPPING_FEE = 150;

const HEADERS = ['下單時間', '訂單編號', '狀態', '取餐方式', '門市', '取餐時間／到貨日', '人數',
  '姓名', '手機', '宅配地址', '品項', '件數', '小計', '運費', '總金額', '備註', '請求編號'];
const COL_REQUEST_ID = HEADERS.length;   // 最後一欄，用來防止重複建單
const COL_STATUS = 3;

// 「狀態」欄的下拉選單。店員改這一欄，顧客在網站上的取餐單就會跟著變
const STATUSES = ['已收到', '製作中', '可取餐', '已出貨', '已完成', '已取消'];

// 訂單編號是流水號，猜得到，所以查詢必須附手機末三碼；同一張單答錯太多次就暫時鎖住
const LOOKUP_MAX_FAILS = 5;
const LOOKUP_LOCK_SECONDS = 600;
const NOT_FOUND = '查無此訂單，請確認訂單編號與手機末三碼';

/* ---------- 入口 ---------- */

function doPost(e) {
  let data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '');
  } catch (err) {
    return reply({ ok: false, error: '資料格式錯誤' });
  }

  // 機器人陷阱：網頁上隱藏的欄位，真人不會填
  if (data.website) return reply({ ok: true, orderId: 'JJ-TEST', total: 0 });

  let order;
  try {
    order = validate(data);
  } catch (err) {
    return reply({ ok: false, error: err.message });
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return reply({ ok: false, error: '目前訂單較多，請稍後再試一次' });
  try {
    const sheet = getSheet();
    const dup = findByRequestId(sheet, order.requestId);
    if (dup) return reply({ ok: true, orderId: dup.orderId, total: dup.total, duplicate: true });

    const now = new Date();
    const orderId = makeOrderId(sheet, now);
    const row = [
      now, orderId, '已收到', MODES[order.mode], order.store, order.when, order.people,
      order.name, order.tel, order.addr, order.itemsText, order.count,
      order.subtotal, order.shipping, order.total, order.note, order.requestId
    ];
    const r = sheet.getLastRow() + 1;
    if (r > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 200);
    const range = sheet.getRange(r, 1, 1, row.length);
    // 文字欄位設成「純文字」，手機開頭的 0 才不會消失，也不會被當成公式執行
    range.setNumberFormats([row.map((v, i) => i === 0 ? 'yyyy-mm-dd hh:mm:ss' : typeof v === 'number' ? '#,##0' : '@')]);
    range.setValues([row]);
    sheet.getRange(r, COL_STATUS).setDataValidation(statusRule());
    SpreadsheetApp.flush();
    return reply({ ok: true, orderId: orderId, total: order.total });
  } catch (err) {
    console.error(err);
    return reply({ ok: false, error: '訂單寫入失敗，請稍後再試' });
  } finally {
    lock.releaseLock();
  }
}

// ?action=status 是網站的訂單查詢；直接用瀏覽器打開部署網址則回傳健康檢查，用來確認程式有在運作
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'status') {
    try {
      return reply(lookup(String(p.id || ''), String(p.tel || '')));
    } catch (err) {
      console.error(err);
      return reply({ ok: false, error: '查詢失敗，請稍後再試' });
    }
  }
  return reply({ ok: true, service: '煎記鍋貼訂單', time: new Date().toISOString() });
}

/* ---------- 訂單查詢 ---------- */

// 只回傳取餐單需要的欄位：姓名、手機、地址、備註都不回傳
function lookup(id, tel) {
  id = id.trim().toUpperCase();
  tel = tel.trim();
  if (!/^JJ\d{8}-\d{3}$/.test(id) || !/^\d{3}$/.test(tel)) return { ok: false, error: NOT_FOUND };

  const cache = CacheService.getScriptCache();
  const failKey = 'lookup-fail:' + id;
  const fails = Number(cache.get(failKey)) || 0;
  if (fails >= LOOKUP_MAX_FAILS) return { ok: false, error: '查詢錯誤次數過多，請 10 分鐘後再試' };

  const row = findByOrderId(getSheet(), id);
  // 查無訂單與末三碼不符回傳同一句話，避免被拿來試探哪些編號存在
  if (!row || String(row[8]).slice(-3) !== tel) {
    cache.put(failKey, String(fails + 1), LOOKUP_LOCK_SECONDS);
    return { ok: false, error: NOT_FOUND };
  }

  const mode = Object.keys(MODES).filter(k => MODES[k] === row[3])[0] || 'takeout';
  const placed = row[0] instanceof Date ? row[0].getTime() : null;
  return {
    ok: true,
    status: String(row[2] || '已收到').trim(),
    order: {
      mode: mode,
      store: String(row[4] || ''),
      when: row[5] instanceof Date ? Utilities.formatDate(row[5], 'Asia/Taipei', 'HH:mm') : String(row[5] || ''),
      people: String(row[6] || ''),
      items: parseItems(row[10]),
      subtotal: Number(row[12]) || 0,
      shipping: Number(row[13]) || 0,
      total: Number(row[14]) || 0,
      createdAt: placed
    }
  };
}

function findByOrderId(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const cell = sheet.getRange(2, 2, last - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
  return cell ? sheet.getRange(cell.getRow(), 1, 1, HEADERS.length).getValues()[0] : null;
}

// 「品項」欄是「名稱 × 數量」一行一項；小計依目前價目表換算，查不到價格的品項不顯示金額
function parseItems(text) {
  const price = {};
  Object.keys(MENU).forEach(id => { price[MENU[id].name] = MENU[id].price; });
  return String(text || '').split('\n').map(line => {
    const m = line.match(/^(.*?)\s*×\s*(\d+)\s*$/);
    if (!m) return null;
    const qty = Number(m[2]);
    return { name: m[1], qty: qty, sum: price[m[1]] != null ? price[m[1]] * qty : null };
  }).filter(Boolean);
}

/* ---------- 驗證與計價 ---------- */

function validate(d) {
  const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

  const requestId = str(d.requestId, 64);
  if (!/^[A-Za-z0-9-]{8,64}$/.test(requestId)) throw new Error('請重新整理頁面後再送出');

  const mode = str(d.mode, 10);
  if (!MODES[mode]) throw new Error('請選擇取餐方式');

  const name = str(d.name, 40);
  if (!name) throw new Error('請填寫姓名');
  const tel = str(d.tel, 20).replace(/[\s-]/g, '');
  if (!/^09\d{8}$/.test(tel)) throw new Error('請填寫 09 開頭的 10 碼手機號碼');

  if (!Array.isArray(d.items) || !d.items.length) throw new Error('購物車是空的');
  if (d.items.length > 30) throw new Error('品項過多');
  const merged = {};
  d.items.forEach(it => {
    const id = str(it && it.id, 20);
    const qty = Math.floor(Number(it && it.qty));
    if (!MENU[id]) throw new Error('菜單已更新，請重新整理頁面');
    if (!(qty >= 1 && qty <= 99)) throw new Error('數量需介於 1 到 99');
    merged[id] = Math.min(99, (merged[id] || 0) + qty);
  });
  const ids = Object.keys(merged);
  const onlyGifts = ids.every(id => MENU[id].gift);

  let store = '', when = '', people = '', addr = '';
  if (mode === 'delivery') {
    if (!onlyGifts) throw new Error('現煎餐點不提供宅配，請選擇內用或外帶');
    addr = str(d.addr, 120);
    if (addr.length < 8) throw new Error('請填寫完整地址（含縣市與門牌）');
    when = str(d.date, 20);
    if (!when) throw new Error('請選擇希望到貨日');
  } else {
    store = STORES[str(d.store, 20)];
    if (!store) throw new Error('請選擇門市');
    if (mode === 'takeout') {
      const t = str(d.time, 10);
      if (t !== 'asap' && !/^\d{2}:\d{2}$/.test(t)) throw new Error('請選擇取餐時間');
      when = t === 'asap' ? '盡快（約 15 分鐘）' : t;
    } else {
      people = str(d.people, 10);
      if (!/^[1-9]\d? 位$/.test(people)) throw new Error('請選擇用餐人數');
    }
  }

  const subtotal = ids.reduce((a, id) => a + MENU[id].price * merged[id], 0);
  const shipping = mode === 'delivery' && subtotal < FREE_SHIPPING ? SHIPPING_FEE : 0;
  return {
    requestId, mode, store, when, people, addr, name, tel,
    note: str(d.note, 300),
    itemsText: ids.map(id => MENU[id].name + ' × ' + merged[id]).join('\n'),
    count: ids.reduce((a, id) => a + merged[id], 0),
    subtotal, shipping, total: subtotal + shipping
  };
}

/* ---------- 試算表 ---------- */

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#f3ead8');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findByRequestId(sheet, requestId) {
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const from = Math.max(2, last - 499);          // 只看最近 500 筆，重送通常在幾秒內
  const rows = sheet.getRange(from, 1, last - from + 1, HEADERS.length).getValues();
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i][COL_REQUEST_ID - 1] === requestId) return { orderId: rows[i][1], total: rows[i][14] };
  }
  return null;
}

// 訂單編號：JJ + 年月日 + 當天流水號，例如 JJ20261119-007
function makeOrderId(sheet, now) {
  const prefix = 'JJ' + Utilities.formatDate(now, 'Asia/Taipei', 'yyyyMMdd') + '-';
  let n = 0;
  const last = sheet.getLastRow();
  if (last >= 2) {
    const from = Math.max(2, last - 499);
    sheet.getRange(from, 2, last - from + 1, 1).getValues().forEach(r => {
      const v = String(r[0]);
      if (v.indexOf(prefix) === 0) n = Math.max(n, Number(v.slice(prefix.length)) || 0);
    });
  }
  return prefix + String(n + 1).padStart(3, '0');
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- 安裝時手動執行一次 ---------- */

// 在 Apps Script 編輯器選 setup → 執行：建立「訂單」工作表與標題列、狀態下拉選單與顏色，並完成授權。
// 重複執行沒有關係。
function setup() {
  const sheet = getSheet();
  sheet.setColumnWidth(11, 220);
  const status = sheet.getRange(2, COL_STATUS, sheet.getMaxRows() - 1, 1);
  status.setDataValidation(statusRule());

  // 狀態上色，店員一眼看出哪些該出餐。只重設這一欄的規則，保留其他自訂格式
  const a1 = status.getA1Notation();
  const color = (text, bg, fg, strike) => {
    const b = SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(text).setBackground(bg).setFontColor(fg).setRanges([status]);
    if (strike) b.setStrikethrough(true);
    return b.build();
  };
  const others = sheet.getConditionalFormatRules().filter(r => !r.getRanges().some(g => g.getA1Notation() === a1));
  sheet.setConditionalFormatRules(others.concat([
    color('製作中', '#fde7c7', '#8a4b00'),
    color('可取餐', '#f07a2a', '#ffffff'),
    color('已出貨', '#f07a2a', '#ffffff'),
    color('已完成', '#e7e5df', '#5d5870'),
    color('已取消', '#e7e5df', '#9a95a8', true)
  ]));
  console.log('完成：' + sheet.getParent().getName() + ' / ' + sheet.getName());
}

function statusRule() {
  return SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUSES, true)
    .setAllowInvalid(false)
    .setHelpText('請從清單選擇：' + STATUSES.join('、'))
    .build();
}
