const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Animaciones de página ----------
const nav = $('#nav'), prog = $('#progress');
addEventListener('scroll', () => {
  const h = document.documentElement;
  prog.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) * 100 + '%';
  nav.classList.toggle('solid', scrollY > 30);
}, { passive: true });
if (!reduceMotion && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('anim');
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$('.rv').forEach((el, i) => { el.style.transitionDelay = (i % 3) * 0.08 + 's'; io.observe(el); });
}
const countTo = (el, to) => {
  if (reduceMotion) { el.textContent = to; return; }
  const from = +el.textContent || 0, t0 = performance.now();
  const tick = t => { const k = Math.min((t - t0) / 600, 1); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};

// ---------- Datos ----------
const PLANS = { emp: { name: 'Emprendedor', limit: 40 }, neg: { name: 'Negocio', limit: 150 }, des: { name: 'Despacho', limit: 600 } };
let mem = {}, memSession = null;
const loadDb = () => { try { return JSON.parse(localStorage.getItem('timbro_db') || '{}'); } catch { return mem; } };
const saveDb = db => { mem = db; try { localStorage.setItem('timbro_db', JSON.stringify(db)); } catch {} };
const getSession = () => { try { return localStorage.getItem('timbro_session'); } catch { return memSession; } };
const setSession = e => { memSession = e; try { e ? localStorage.setItem('timbro_session', e) : localStorage.removeItem('timbro_session'); } catch {} };

// Modo nube: si el visor tiene cuenta de Claude y puede guardar, la cuenta vive en la base de datos de la página.
// Modo local: correo y contraseña guardados solo en este navegador.
let mode = 'local', cloud = null, acct = null, localEmail = null, queue = Promise.resolve();

async function initCloud() {
  try {
    if (!window.claude || !claude.use) return;
    const [user, db] = await Promise.all([claude.use('user'), claude.use('db')]);
    if (!user || !db) return;
    const me = await user.me();
    if (!me.id) return;
    cloud = { ref: db.doc('data/users/' + me.id + '/account'), name: me.name, avatar: me.avatarUrl };
    mode = 'cloud';
  } catch { mode = 'local'; }
}

// ---------- Utilidades ----------
const money = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);
const rfcOk = v => /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(v);
const monthKey = () => new Date().toISOString().slice(0, 7);
const say = (el, text, err) => { el.hidden = false; el.textContent = text; el.classList.toggle('err', !!err); el.style.animation = 'none'; el.offsetWidth; el.style.animation = ''; };
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function hashPass(pass, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(salt), iterations: 150000, hash: 'SHA-256' }, key, 256));
}
const newAcct = (razon, rfc, regimen) => ({ razon, rfc, regimen, plan: 'emp', month: monthKey(), used: 0, seq: 0, invoices: [] });

// Guardado: nube o navegador
function persist() {
  if (!acct) return;
  if (mode === 'cloud') {
    const copy = JSON.parse(JSON.stringify(acct));
    queue = queue.then(() => cloud.ref.set(copy)).catch(() => say($('#iMsg'), 'No se pudo guardar en la nube. Intenta de nuevo.', true));
  } else {
    const db = loadDb(); db[localEmail] = acct; saveDb(db);
  }
}
const update = fn => { fn(acct); persist(); renderDash(); };

// ---------- Acceso ----------
const showTab = tab => {
  const reg = tab === 'registro';
  $('#fLogin').hidden = reg; $('#fReg').hidden = !reg;
  $('#tabLogin').classList.toggle('on', !reg); $('#tabReg').classList.toggle('on', reg);
};
$$('[data-tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));

function showAuth() {
  $('#dashView').hidden = true; $('#authView').hidden = false; $('#navAcct').textContent = 'Entrar';
  const isCloud = mode === 'cloud';
  $('#authView').classList.toggle('cloud', isCloud);
  $('#authTabs').hidden = isCloud; $('#cloudNote').hidden = !isCloud;
  $('#banner').textContent = isCloud
    ? 'Tu cuenta de Claude está conectada: tus datos se guardan en la nube y solo tú los ves. Las facturas no se timbran ante el SAT todavía.'
    : 'Modo demostración: las facturas no se timbran ante el SAT. Tus datos se guardan solo en este navegador.';
  if (isCloud) {
    $('#cName').textContent = cloud.name || 'Tu cuenta de Claude';
    $('#cAv').src = cloud.avatar;
    const has = !!acct;
    $('#cloudEnter').hidden = !has; $('#fLogin').hidden = true; $('#fReg').hidden = has;
    if (has) $('#cloudCo').textContent = acct.razon + ' · RFC ' + acct.rfc;
    $('#bReg').textContent = 'Crear cuenta de empresa';
  } else {
    $('#cloudEnter').hidden = true; $('#bReg').textContent = 'Crear cuenta';
  }
  $$('.loc-only input').forEach(i => i.required = !isCloud);
}

$('#fReg').onsubmit = async e => {
  e.preventDefault();
  const rfc = $('#rRfc'); rfc.value = rfc.value.trim().toUpperCase();
  const msg = $('#rMsg'), cloudMode = mode === 'cloud';
  rfc.classList.toggle('bad', !rfcOk(rfc.value));
  if (!rfcOk(rfc.value)) return say(msg, 'El RFC no tiene un formato válido (12 o 13 caracteres).', true);
  if (!$('#rRazon').value.trim()) return say(msg, 'Escribe la razón social o tu nombre.', true);
  const a = newAcct($('#rRazon').value.trim(), rfc.value, $('#rReg').value);
  if (cloudMode) {
    try { await cloud.ref.set(a); } catch {
      mode = 'local'; showAuth(); showTab('registro');
      return say($('#rMsg'), 'Tu acceso no permite guardar en la nube. Crea una cuenta local con correo y contraseña.', true);
    }
    acct = a; e.target.reset(); msg.hidden = true; return openDash();
  }
  const mail = $('#rEmail').value.trim().toLowerCase();
  if (!e.target.checkValidity()) return say(msg, 'Completa todos los campos. La contraseña lleva mínimo 8 caracteres.', true);
  if (!crypto.subtle) return say(msg, 'Tu navegador no permite crear la cuenta en este contexto.', true);
  const db = loadDb();
  if (db[mail]) return say(msg, 'Ya existe una cuenta con ese correo. Inicia sesión.', true);
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  Object.assign(a, { salt, hash: await hashPass($('#rPass').value, salt) });
  db[mail] = a; saveDb(db); setSession(mail); localEmail = mail; acct = a;
  e.target.reset(); msg.hidden = true; openDash();
};

$('#fLogin').onsubmit = async e => {
  e.preventDefault();
  const msg = $('#lMsg'), mail = $('#lEmail').value.trim().toLowerCase(), pass = $('#lPass').value;
  if (!mail || !pass) return say(msg, 'Escribe tu correo y contraseña.', true);
  const u = loadDb()[mail];
  if (!u || !crypto.subtle || await hashPass(pass, u.salt) !== u.hash) return say(msg, 'Correo o contraseña incorrectos.', true);
  setSession(mail); localEmail = mail; acct = u; e.target.reset(); msg.hidden = true; openDash();
};

$('#bEnter').onclick = openDash;
$('#bOut').onclick = () => {
  if (mode === 'local') { setSession(null); acct = null; localEmail = null; }
  showAuth();
};

// ---------- Panel ----------
let lines = [];
function openDash() {
  if (!acct) return;
  if (acct.month !== monthKey()) { acct.month = monthKey(); acct.used = 0; persist(); }
  $('#authView').hidden = true; $('#dashView').hidden = false; $('#navAcct').textContent = 'Mi cuenta';
  if (!lines.length) addLine();
  renderDash();
}

const CIRC = 326.7;
function renderDash() {
  const u = acct; if (!u) return;
  const limit = PLANS[u.plan].limit, left = Math.max(limit - u.used, 0);
  $('#dCompany').textContent = u.razon; $('#dRfc').textContent = 'RFC ' + u.rfc + ' · Régimen ' + u.regimen.split(' ')[0];
  $('#dPlan').value = u.plan;
  countTo($('#mLeft'), left);
  $('#mUsed').textContent = u.used; $('#mLimit').textContent = limit;
  const ring = $('#mRing');
  ring.style.strokeDashoffset = CIRC * (1 - left / limit);
  ring.classList.toggle('warn', left / limit <= 0.2);
  const body = $('#hBody'); body.replaceChildren();
  [...u.invoices].reverse().forEach((inv, n) => {
    const tr = document.createElement('tr'); tr.style.animationDelay = Math.min(n, 8) * 0.04 + 's';
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
  const limit = PLANS[acct.plan].limit, msg = $('#iMsg');
  if (acct.used >= limit) { say(msg, `Llegaste al límite de ${limit} timbres. Mejora tu plan o compra timbres extra ($3 c/u).`, true); return false; }
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

// ---------- Inicio ----------
(async () => {
  showAuth();
  await initCloud();
  if (mode === 'cloud') {
    try { const snap = await cloud.ref.get(); acct = snap.exists ? JSON.parse(JSON.stringify(snap.data())) : null; } catch { mode = 'local'; }
  }
  if (mode === 'local') {
    const s = getSession(), u = s && loadDb()[s];
    if (u) { localEmail = s; acct = u; }
  }
  if (mode === 'cloud') { showAuth(); if (acct) openDash(); }
  else if (acct) openDash();
})();
