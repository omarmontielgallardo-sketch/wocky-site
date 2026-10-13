const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

// ---------- Datos (solo en este navegador; demostración) ----------
const PLANS = { emp: { name: 'Emprendedor', limit: 40 }, neg: { name: 'Negocio', limit: 150 }, des: { name: 'Despacho', limit: 600 } };
let mem = {}, memSession = null;
const loadDb = () => { try { return JSON.parse(localStorage.getItem('timbro_db') || '{}'); } catch { return mem; } };
const saveDb = db => { mem = db; try { localStorage.setItem('timbro_db', JSON.stringify(db)); } catch {} };
const getSession = () => { try { return localStorage.getItem('timbro_session'); } catch { return memSession; } };
const setSession = e => { memSession = e; try { e ? localStorage.setItem('timbro_session', e) : localStorage.removeItem('timbro_session'); } catch {} };

// ---------- Utilidades ----------
const money = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);
const rfcOk = v => /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(v);
const monthKey = () => new Date().toISOString().slice(0, 7);
const say = (el, text, err) => { el.hidden = false; el.textContent = text; el.classList.toggle('err', !!err); };
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function hashPass(pass, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(salt), iterations: 150000, hash: 'SHA-256' }, key, 256));
}

// ---------- Acceso ----------
const showTab = tab => {
  const reg = tab === 'registro';
  $('#fLogin').hidden = reg; $('#fReg').hidden = !reg;
  $('#tabLogin').classList.toggle('on', !reg); $('#tabReg').classList.toggle('on', reg);
};
$$('[data-tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));

$('#fReg').onsubmit = async e => {
  e.preventDefault();
  const rfc = $('#rRfc'); rfc.value = rfc.value.trim().toUpperCase();
  const msg = $('#rMsg'), mail = $('#rEmail').value.trim().toLowerCase();
  rfc.classList.toggle('bad', !rfcOk(rfc.value));
  if (!rfcOk(rfc.value)) return say(msg, 'El RFC no tiene un formato válido (12 o 13 caracteres).', true);
  if (!e.target.checkValidity()) return say(msg, 'Completa todos los campos. La contraseña lleva mínimo 8 caracteres.', true);
  if (!crypto.subtle) return say(msg, 'Tu navegador no permite crear la cuenta en este contexto.', true);
  const db = loadDb();
  if (db[mail]) return say(msg, 'Ya existe una cuenta con ese correo. Inicia sesión.', true);
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  db[mail] = { razon: $('#rRazon').value.trim(), rfc: rfc.value, regimen: $('#rReg').value, salt, hash: await hashPass($('#rPass').value, salt),
    plan: 'emp', month: monthKey(), used: 0, seq: 0, invoices: [] };
  saveDb(db); setSession(mail); e.target.reset(); msg.hidden = true; openDash();
};

$('#fLogin').onsubmit = async e => {
  e.preventDefault();
  const msg = $('#lMsg'), mail = $('#lEmail').value.trim().toLowerCase(), pass = $('#lPass').value;
  if (!mail || !pass) return say(msg, 'Escribe tu correo y contraseña.', true);
  const u = loadDb()[mail];
  if (!u || !crypto.subtle || await hashPass(pass, u.salt) !== u.hash) return say(msg, 'Correo o contraseña incorrectos.', true);
  setSession(mail); e.target.reset(); msg.hidden = true; openDash();
};

$('#bOut').onclick = () => { setSession(null); email = null; $('#dashView').hidden = true; $('#authView').hidden = false; $('#navAcct').textContent = 'Entrar'; };

// ---------- Panel ----------
let email = null, lines = [];
const user = () => loadDb()[email];
const update = fn => { const db = loadDb(); fn(db[email]); saveDb(db); renderDash(); };

function openDash() {
  email = getSession();
  if (!email || !user()) { setSession(null); email = null; return; }
  update(u => { if (u.month !== monthKey()) { u.month = monthKey(); u.used = 0; } });
  $('#authView').hidden = true; $('#dashView').hidden = false; $('#navAcct').textContent = 'Mi cuenta';
  if (!lines.length) addLine();
}

function renderDash() {
  const u = user(); if (!u) return;
  const limit = PLANS[u.plan].limit;
  $('#dCompany').textContent = u.razon; $('#dRfc').textContent = 'RFC ' + u.rfc + ' · Régimen ' + u.regimen.split(' ')[0];
  $('#dPlan').value = u.plan;
  $('#mLeft').textContent = Math.max(limit - u.used, 0);
  $('#mUsed').textContent = u.used; $('#mLimit').textContent = limit;
  const pct = Math.min(u.used / limit * 100, 100);
  $('#mBar').style.width = pct + '%'; $('#mBar').parentElement.classList.toggle('warn', pct >= 80);
  const body = $('#hBody'); body.replaceChildren();
  [...u.invoices].reverse().forEach(inv => {
    const tr = document.createElement('tr');
    const cell = t => { const td = document.createElement('td'); td.textContent = t; tr.append(td); return td; };
    cell(inv.folio);
    cell(new Date(inv.fecha).toLocaleDateString('es-MX'));
    const c = cell(inv.cliente); const r = document.createElement('small'); r.className = 'uuid'; r.textContent = inv.rfc; c.append(r);
    cell(money(inv.total));
    const st = cell(''); const s = document.createElement('span'); s.className = 'st ' + inv.estatus; s.textContent = inv.estatus; st.append(s);
    if (inv.uuid) { const k = document.createElement('small'); k.className = 'uuid'; k.textContent = 'UUID demo ' + inv.uuid.slice(0, 8) + '…'; st.append(k); }
    const act = document.createElement('div'); act.className = 'rowact';
    const btn = (t, f) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = f; act.append(b); };
    if (inv.estatus === 'borrador') { btn('Timbrar', () => stamp(inv.id)); btn('Eliminar', () => update(x => { x.invoices = x.invoices.filter(i => i.id !== inv.id); })); }
    if (inv.estatus === 'timbrada') btn('Cancelar', () => update(x => { x.invoices.find(i => i.id === inv.id).estatus = 'cancelada'; }));
    const last = document.createElement('td'); last.append(act); tr.append(last);
    body.append(tr);
  });
  $('#hEmpty').hidden = u.invoices.length > 0;
}

$('#dPlan').onchange = e => update(u => { u.plan = e.target.value; });

// Conceptos y totales
function addLine() { lines.push({ d: '', q: 1, p: 0 }); drawLines(); }
function drawLines() {
  const box = $('#lines'); box.replaceChildren();
  lines.forEach((l, i) => {
    const row = document.createElement('div'); row.className = 'line';
    const mk = (ph, type, val, key, label) => {
      const inp = document.createElement('input'); inp.type = type; inp.placeholder = ph; inp.value = val; inp.setAttribute('aria-label', label);
      if (type === 'number') { inp.min = '0'; inp.step = 'any'; }
      inp.oninput = () => { l[key] = type === 'number' ? parseFloat(inp.value) || 0 : inp.value; totals(); };
      return inp;
    };
    const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.textContent = '×'; x.setAttribute('aria-label', 'Quitar concepto');
    x.onclick = () => { if (lines.length > 1) { lines.splice(i, 1); drawLines(); } };
    row.append(mk('Concepto', 'text', l.d, 'd', 'Concepto'), mk('Cant.', 'number', l.q, 'q', 'Cantidad'), mk('Precio', 'number', l.p || '', 'p', 'Precio unitario'), x);
    box.append(row);
  });
  totals();
}
const calc = () => { const sub = lines.reduce((s, l) => s + l.q * l.p, 0); return { sub, tot: sub * 1.16 }; };
function totals() { const t = calc(); $('#tSub').textContent = money(t.sub); $('#tIva').textContent = money(t.sub * 0.16); $('#tTot').textContent = money(t.tot); }
$('#bAdd').onclick = addLine;

function buildInvoice() {
  const msg = $('#iMsg'), rfc = $('#iRfc'); rfc.value = rfc.value.trim().toUpperCase();
  const name = $('#iName').value.trim(), valid = lines.filter(l => l.d.trim() && l.p > 0 && l.q > 0);
  rfc.classList.toggle('bad', !rfcOk(rfc.value));
  if (!name) { say(msg, 'Escribe el nombre del cliente.', true); return null; }
  if (!rfcOk(rfc.value)) { say(msg, 'El RFC del cliente no es válido.', true); return null; }
  if (!valid.length) { say(msg, 'Agrega al menos un concepto con cantidad y precio.', true); return null; }
  return { id: crypto.randomUUID(), cliente: name, rfc: rfc.value, uso: $('#iUso').value, metodo: $('#iMet').value, lineas: valid.map(l => ({ ...l })), total: calc().tot, fecha: Date.now(), estatus: 'borrador' };
}
function resetForm() { $('#fInv').reset(); lines = []; addLine(); }

function stamp(id, newInv) {
  const u = user(), limit = PLANS[u.plan].limit, msg = $('#iMsg');
  if (u.used >= limit) { say(msg, `Llegaste al límite de ${limit} timbres. Mejora tu plan o compra timbres extra ($3 c/u).`, true); return false; }
  update(x => {
    const inv = newInv || x.invoices.find(i => i.id === id);
    if (newInv) x.invoices.push(inv);
    if (!inv.folio) inv.folio = 'A-' + String(++x.seq).padStart(4, '0');
    inv.estatus = 'timbrada'; inv.uuid = crypto.randomUUID(); x.used++;
  });
  say(msg, 'Factura timbrada (demostración). Se descontó 1 timbre.'); return true;
}
$('#bStamp').onclick = () => { const inv = buildInvoice(); if (inv && stamp(null, inv)) resetForm(); };
$('#bDraft').onclick = () => {
  const inv = buildInvoice(); if (!inv) return;
  update(u => { inv.folio = 'A-' + String(++u.seq).padStart(4, '0'); u.invoices.push(inv); });
  say($('#iMsg'), 'Borrador guardado. No consume timbres.'); resetForm();
};

openDash();
