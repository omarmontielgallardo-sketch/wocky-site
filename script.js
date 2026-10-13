const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Avisos breves (toasts) ----------
function toast(text, type = 'ok') {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = text;
  $('#toasts').append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
}

// ---------- Navegación y animaciones de página ----------
const nav = $('#nav'), prog = $('#progress'), burger = $('#burger'), menu = $('#menu');
addEventListener('scroll', () => {
  const h = document.documentElement;
  prog.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight || 1)) * 100 + '%';
  nav.classList.toggle('solid', scrollY > 30);
}, { passive: true });
const setMenu = open => { menu.classList.toggle('open', open); burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú'); };
burger.onclick = () => setMenu(!menu.classList.contains('open'));
$$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

if ('IntersectionObserver' in window) {
  // Sección activa en el menú
  const links = $$('#menu a[href^="#"]:not(.navtab):not([data-nav])');
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(a => { const s = $(a.getAttribute('href')); if (s) spy.observe(s); });
  if (!reduceMotion) {
    document.documentElement.classList.add('anim');
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
    $$('.rv').forEach((el, i) => { el.style.transitionDelay = (i % 3) * 0.08 + 's'; io.observe(el); });
  }
}
if (!reduceMotion && matchMedia('(pointer:fine)').matches) {
  const blobs = $$('.blob');
  addEventListener('mousemove', e => {
    const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    blobs.forEach((b, i) => b.style.translate = `${x * 50 * (i + 1)}px ${y * 40 * (i + 1)}px`);
  }, { passive: true });
}
const countTo = (el, to, fmt = v => v) => {
  if (reduceMotion) { el.textContent = fmt(to); return; }
  const from = parseFloat(el.dataset.v) || 0, t0 = performance.now(); el.dataset.v = to;
  const tick = t => { const k = Math.min((t - t0) / 600, 1); el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};

// ---------- Vistas: Inicio y Panel (pestañas del menú superior) ----------
const views = { home: $('#viewHome'), panel: $('#viewPanel') };
let view = 'home';
function setView(v, opts = {}) {
  if (document.startViewTransition && !reduceMotion && opts.scroll !== false) document.startViewTransition(() => applyView(v, opts));
  else applyView(v, opts);
}
function applyView(v, { scroll = true } = {}) {
  view = v;
  Object.entries(views).forEach(([k, el]) => { el.hidden = k !== v; if (k === v) { el.classList.remove('view-in'); el.offsetWidth; el.classList.add('view-in'); } });
  $$('#menu [data-nav]').forEach(a => { const on = a.dataset.nav === v; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  if (scroll) scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  if (v === 'panel') $$('.rv', views.panel).forEach(el => el.classList.add('in'));
}
// Cualquier enlace interno cambia de pestaña si hace falta
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.matches('[data-open]')) return;
  const id = a.getAttribute('href').slice(1);
  if (!id) return;
  if (id === 'panel') { e.preventDefault(); setView('panel'); history.replaceState(null, '', '#panel'); return; }
  const t = document.getElementById(id);
  if (t && views.home.contains(t) && view !== 'home') {
    e.preventDefault(); setView('home', { scroll: false }); history.replaceState(null, '', '#' + id);
    requestAnimationFrame(() => t.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }));
  }
});
addEventListener('hashchange', () => { if (location.hash === '#panel' && view !== 'panel') setView('panel'); });

// ---------- Documentos legales y cookies ----------
let lastFocus = null;
document.addEventListener('click', e => {
  const o = e.target.closest('[data-open]');
  if (o) {
    e.preventDefault();
    $$('dialog[open]').forEach(d => d.close());
    const d = document.getElementById(o.dataset.open);
    lastFocus = o;
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    const b = $('.legal-body', d); if (b) b.scrollTop = 0;
    return;
  }
  if (e.target.closest('[data-close]')) { e.target.closest('dialog').close(); return; }
  if (e.target.tagName === 'DIALOG') e.target.close();
});
$$('dialog.legal').forEach(d => d.addEventListener('close', () => lastFocus && lastFocus.focus && lastFocus.focus()));

const CK = 'timbro_consent';
const getConsent = () => { try { return localStorage.getItem(CK); } catch { return null; } };
const setConsent = v => { try { localStorage.setItem(CK, v); } catch {} $('#cookie').hidden = true; };
if (!getConsent()) setTimeout(() => { $('#cookie').hidden = false; }, 900);
$('#ckOk').onclick = () => setConsent('all');
$('#ckNec').onclick = () => setConsent('necessary');
$('#cookiePrefs').onclick = e => { e.preventDefault(); $('#cookie').hidden = false; };

// ---------- Datos (solo en este navegador) ----------
const PLANS = { emp: { name: 'Emprendedor', limit: 40, precio: 99, rfc: 1 }, neg: { name: 'Negocio', limit: 150, precio: 249, rfc: 3 }, des: { name: 'Despacho', limit: 600, precio: 649, rfc: 20 } };
let mem = {}, memSession = null, acct = null, localEmail = null;
const loadDb = () => { try { return JSON.parse(localStorage.getItem('timbro_db') || '{}'); } catch { return mem; } };
const saveDb = db => { mem = db; try { localStorage.setItem('timbro_db', JSON.stringify(db)); } catch {} };
const getSession = () => { try { return localStorage.getItem('timbro_session'); } catch { return memSession; } };
const setSession = e => { memSession = e; try { e ? localStorage.setItem('timbro_session', e) : localStorage.removeItem('timbro_session'); } catch {} };

// ---------- Utilidades ----------
const money = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);
const GENERICOS = ['XAXX010101000', 'XEXX010101000'];
const DIC = '0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ';
const cleanRfc = v => String(v).toUpperCase().replace(/[^A-ZÑ&0-9]/g, '').slice(0, 13);
// Valida estructura, fecha y dígito verificador del RFC (algoritmo del SAT). La existencia ante el SAT se confirmará con el PAC.
function rfcCheck(raw, { generico = false } = {}) {
  const r = cleanRfc(raw);
  if (!r) return { ok: false, msg: '' };
  if (GENERICOS.includes(r)) return generico ? { ok: true, msg: 'RFC genérico válido' } : { ok: false, msg: 'Un RFC genérico no se puede usar para registrar una empresa.' };
  if (r.length < 12) return { ok: false, msg: `Faltan caracteres (${r.length}/12 o 13).` };
  if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(r)) return { ok: false, msg: 'Formato inválido: 3 o 4 letras, 6 números de fecha y 3 de homoclave.' };
  const f = r.slice(r.length - 9, r.length - 3), yy = +f.slice(0, 2), mm = +f.slice(2, 4), dd = +f.slice(4, 6);
  const fechaOk = [1900, 2000].some(b => { const d = new Date(b + yy, mm - 1, dd); return d.getFullYear() === b + yy && d.getMonth() === mm - 1 && d.getDate() === dd; });
  if (!fechaOk) return { ok: false, msg: 'La fecha dentro del RFC no es válida.' };
  const base = r.padStart(13, ' ');
  let sum = 0; for (let i = 0; i < 12; i++) sum += DIC.indexOf(base[i]) * (13 - i);
  const d = 11 - (sum % 11), esperado = d === 11 ? '0' : d === 10 ? 'A' : String(d);
  if (base[12] !== esperado) return { ok: false, msg: 'Ese RFC no existe: el dígito verificador no coincide. Revisa que esté bien escrito.' };
  return { ok: true, msg: 'RFC válido' };
}
const rfcOk = (v, o) => rfcCheck(v, o).ok;

const DESECHABLES = ['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'yopmail.com', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'throwawaymail.com', 'mailnesia.com'];
const ERRATAS = { 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'yahooo.com': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'icloud.con': 'icloud.com' };
// Revisa que el correo tenga forma real. Que el buzón exista se confirma con el enlace que se envía en la app completa.
function correoCheck(v) {
  const e = String(v).trim().toLowerCase();
  if (!e) return { ok: false, msg: '' };
  const [user, dom] = e.split('@');
  if (!dom || !/^[a-z0-9._%+-]{1,64}$/.test(user) || user.startsWith('.') || user.endsWith('.') || user.includes('..') ||
      !/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(dom) || dom.includes('..')) return { ok: false, msg: 'Escribe un correo válido, por ejemplo tu@empresa.mx.' };
  if (ERRATAS[dom]) return { ok: false, msg: `¿Quisiste escribir ${user}@${ERRATAS[dom]}? Corrígelo para continuar.` };
  if (DESECHABLES.includes(dom)) return { ok: false, msg: 'Ese correo es temporal. Usa un correo real que revises.' };
  return { ok: true, msg: '' };
}
const monthKey = (d = new Date()) => new Date(d).toISOString().slice(0, 7);
const say = (el, text, err) => { el.hidden = false; el.textContent = text; el.classList.toggle('err', !!err); el.style.animation = 'none'; el.offsetWidth; el.style.animation = ''; };
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function hashPass(pass, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(salt), iterations: 150000, hash: 'SHA-256' }, key, 256));
}
// Varias empresas por administrador: los datos de la empresa activa viven en `acct`; las demás, en acct.empresas.
const COF = ['razon', 'rfc', 'regimen', 'giro', 'invoices', 'received', 'clients', 'items', 'seq', 'formDraft', 'taxIn'];
function ensureEmpresas() {
  if (acct.empresas) return;
  acct.empresas = [{ id: crypto.randomUUID() }]; acct.activa = 0; syncActive();
}
function syncActive() { const e = acct.empresas && acct.empresas[acct.activa]; if (e) COF.forEach(k => { e[k] = acct[k]; }); }
function switchEmpresa(i) {
  syncActive(); const e = acct.empresas[i]; if (!e) return;
  acct.activa = i;
  COF.forEach(k => { acct[k] = e[k] !== undefined ? e[k] : (['invoices', 'received', 'clients', 'items'].includes(k) ? [] : k === 'seq' ? 0 : k === 'giro' ? 'general' : null); });
  lines = []; filter = 'todas'; query = ''; $('#hSearch').value = '';
  persist(); addLine(); restoreDraft(); renderDash();
}
const persist = () => { if (!acct) return; syncActive(); const db = loadDb(); db[localEmail] = acct; saveDb(db); };
const update = fn => { fn(acct); persist(); renderDash(); };
const swap = (hide, show) => { hide.hidden = true; show.hidden = false; show.classList.remove('view-in'); show.offsetWidth; show.classList.add('view-in'); };

// Validación de RFC en vivo
function bindRfc(input, hint, generico) {
  const paint = () => {
    const c = rfcCheck(input.value, { generico }), n = cleanRfc(input.value).length;
    input.classList.toggle('ok', c.ok); input.classList.toggle('bad', !c.ok && n >= 12);
    hint.className = 'fhint' + (c.ok ? ' ok' : n >= 12 ? ' err' : '');
    hint.textContent = !n ? (generico ? 'Para público en general usa XAXX010101000.' : '12 caracteres para personas morales, 13 para personas físicas.') : c.ok ? '✓ ' + c.msg : (n >= 12 ? c.msg : `${n}/13 · ${c.msg || 'sigue escribiendo'}`);
  };
  input.addEventListener('input', () => { const pos = input.selectionStart; const v = cleanRfc(input.value); if (v !== input.value) { input.value = v; try { input.setSelectionRange(pos, pos); } catch {} } paint(); });
  paint(); input.paint = () => { paint(); if (input.id === 'iRfc' && typeof applyTaxDefaults === 'function' && !taxTouched) applyTaxDefaults(); };
}
bindRfc($('#rRfc'), $('#rRfcHint'), false);
bindRfc($('#iRfc'), $('#iRfcHint'), true);
$('#rEmail').addEventListener('blur', () => { const c = correoCheck($('#rEmail').value), h = $('#rEmailHint'); h.className = 'fhint' + (c.msg ? ' err' : ''); h.textContent = c.msg; $('#rEmail').classList.toggle('bad', !!c.msg); });
// Mostrar u ocultar contraseña
$$('[data-eye]').forEach(b => b.onclick = () => {
  const i = document.getElementById(b.dataset.eye), show = i.type === 'password';
  i.type = show ? 'text' : 'password'; b.classList.toggle('on', show); b.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
});

// ---------- Acceso (cuenta de administrador) ----------
const showTab = tab => {
  const reg = tab === 'registro', a = reg ? $('#fReg') : $('#fLogin'), b = reg ? $('#fLogin') : $('#fReg');
  swap(b, a);
  $('#tabLogin').classList.toggle('on', !reg); $('#tabReg').classList.toggle('on', reg);
  $('#tabLogin').setAttribute('aria-selected', !reg); $('#tabReg').setAttribute('aria-selected', reg);
};
$$('[data-tab]').forEach(b => b.onclick = () => showTab(b.dataset.tab));

const only = el => { [$('#authView'), $('#dashView'), $('#planView')].forEach(x => { x.hidden = x !== el; }); el.classList.remove('view-in'); el.offsetWidth; el.classList.add('view-in'); if (view === 'panel' && scrollY > 80) scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); };
function showAuth() { only($('#authView')); }

$('#fReg').onsubmit = async e => {
  e.preventDefault();
  const rfc = $('#rRfc'); rfc.value = cleanRfc(rfc.value);
  const msg = $('#rMsg'), mail = $('#rEmail').value.trim().toLowerCase();
  const rc = rfcCheck(rfc.value);
  rfc.classList.toggle('bad', !rc.ok);
  if (!rc.ok) { rfc.focus(); return say(msg, rc.msg || 'Escribe el RFC de tu empresa.', true); }
  const cc = correoCheck(mail);
  if (!cc.ok) { $('#rEmail').classList.add('bad'); $('#rEmail').focus(); return say(msg, cc.msg || 'Escribe tu correo.', true); }
  if (!$('#rAcc').checked) return say(msg, 'Para crear tu cuenta debes aceptar el Aviso de privacidad y los Términos y condiciones.', true);
  if (!e.target.checkValidity()) return say(msg, 'Completa todos los campos. La contraseña lleva mínimo 8 caracteres.', true);
  if (!crypto.subtle) return say(msg, 'Tu navegador no permite crear la cuenta en este contexto.', true);
  const db = loadDb();
  if (db[mail]) return say(msg, 'Ya existe una cuenta con ese correo. Inicia sesión.', true);
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  const a = { role: 'admin', email: mail, razon: $('#rRazon').value.trim(), rfc: rfc.value, regimen: $('#rReg').value, salt, hash: await hashPass($('#rPass').value, salt),
    plan: 'emp', month: monthKey(), used: 0, seq: 0, invoices: [], clients: [], items: [], aceptoEn: Date.now() };
  a.giro = $('#rGiro').value || 'general';
  a.empresas = [{ id: crypto.randomUUID(), razon: a.razon, rfc: a.rfc, regimen: a.regimen, giro: a.giro, invoices: [], received: [], clients: [], items: [], seq: 0, formDraft: null, taxIn: null }]; a.activa = 0;
  db[mail] = a; saveDb(db); setSession(mail); localEmail = mail; acct = a;
  e.target.reset(); $$('#fReg input').forEach(i => i.classList.remove('ok')); $('#rRfc').paint(); $('#rEmailHint').textContent = ''; msg.hidden = true; openDash(); toast('Cuenta creada. ¡Bienvenido a Timbro!');
};

$('#fLogin').onsubmit = async e => {
  e.preventDefault();
  const msg = $('#lMsg'), mail = $('#lEmail').value.trim().toLowerCase(), pass = $('#lPass').value;
  if (!mail || !pass) return say(msg, 'Escribe tu correo y contraseña.', true);
  const u = loadDb()[mail];
  if (!u || !crypto.subtle || await hashPass(pass, u.salt) !== u.hash) return say(msg, 'Correo o contraseña incorrectos.', true);
  setSession(mail); localEmail = mail; acct = u; e.target.reset(); msg.hidden = true; openDash();
};

$('#bOut').onclick = () => { setSession(null); acct = null; localEmail = null; showAuth(); toast('Sesión cerrada.'); };

// ---------- Panel ----------
let lines = [], filter = 'todas', query = '', flashId = null;
function openDash() {
  if (!acct) return;
  ensureEmpresas(); acct.received = acct.received || [];
  acct.clients = acct.clients || []; acct.items = acct.items || [];
  if (acct.month !== monthKey()) { acct.month = monthKey(); acct.used = 0; persist(); }
  if (!acct.planElegido) { showPlan(true); return; }
  only($('#dashView'));
  if (!lines.length) addLine();
  restoreDraft();
  renderDash();
}

const CIRC = 326.7;
function renderDash() {
  const u = acct; if (!u) return;
  const limit = PLANS[u.plan].limit, left = Math.max(limit - u.used, 0);
  $('#dCompany').textContent = u.razon;
  $('#dRfc').textContent = 'RFC ' + u.rfc + ' · Régimen ' + u.regimen.split(' ')[0] + ' · ' + (GIROS[u.giro || 'general'] || GIROS.general).n; $('#iGiro').value = u.giro || 'general'; applyTaxDefaults(); $('#dMail').textContent = u.email || localEmail;
  $('#dPlanName').textContent = PLANS[u.plan].name + ' · $' + PLANS[u.plan].precio;
  countTo($('#mLeft'), left, v => Math.round(v));
  $('#mUsed').textContent = u.used; $('#mLimit').textContent = limit;
  const ring = $('#mRing');
  ring.style.strokeDashoffset = CIRC * (1 - left / limit);
  ring.classList.toggle('warn', left / limit <= 0.2);
  const mk = monthKey(), stamped = u.invoices.filter(i => i.estatus === 'timbrada' && monthKey(i.fecha) === mk);
  countTo($('#kTot'), stamped.reduce((s, i) => s + i.total, 0), money);
  countTo($('#kStamp'), stamped.length, v => Math.round(v));
  countTo($('#kDraft'), u.invoices.filter(i => i.estatus === 'borrador').length, v => Math.round(v));
  // Listas de autocompletado
  $('#dlClients').replaceChildren(...u.clients.map(c => { const o = document.createElement('option'); o.value = c.name; o.label = c.rfc; return o; }));
  $('#dlItems').replaceChildren(...u.items.map(c => { const o = document.createElement('option'); o.value = c.d; return o; }));
  // Filtros
  $$('#chips button').forEach(b => {
    const f = b.dataset.f, n = f === 'todas' ? u.invoices.length : u.invoices.filter(i => i.estatus === f).length;
    $('i', b).textContent = n; b.classList.toggle('on', f === filter);
  });
  const q = query.trim().toLowerCase();
  const list = [...u.invoices].reverse().filter(i => (filter === 'todas' || i.estatus === filter) && (!q || i.cliente.toLowerCase().includes(q) || i.folio.toLowerCase().includes(q) || i.rfc.toLowerCase().includes(q)));
  const body = $('#hBody'); body.replaceChildren();
  list.forEach((inv, n) => {
    const tr = document.createElement('tr'); tr.style.animationDelay = Math.min(n, 8) * 0.04 + 's'; if (inv.id === flashId) tr.classList.add('flash');
    const cell = t => { const td = document.createElement('td'); td.textContent = t; tr.append(td); return td; };
    cell(inv.folio);
    cell(new Date(inv.fecha).toLocaleDateString('es-MX'));
    const c = cell(inv.cliente); const r = document.createElement('small'); r.className = 'uuid'; r.textContent = inv.rfc; c.append(r);
    cell(money(inv.total));
    const st = cell(''); const s = document.createElement('span'); s.className = 'st ' + inv.estatus; s.textContent = inv.estatus; st.append(s);
    if (inv.uuid) { const k = document.createElement('small'); k.className = 'uuid'; k.textContent = 'UUID demo ' + inv.uuid.slice(0, 8) + '…'; st.append(k); }
    const act = document.createElement('div'); act.className = 'rowact';
    const btn = (t, f) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.onclick = f; act.append(b); };
    if (inv.estatus === 'borrador') { btn('Timbrar', () => stamp(inv.id)); btn('Eliminar', () => { update(x => { x.invoices = x.invoices.filter(i => i.id !== inv.id); }); toast('Borrador eliminado.'); }); }
    if (inv.estatus === 'timbrada') btn('Cancelar', () => { update(x => { x.invoices.find(i => i.id === inv.id).estatus = 'cancelada'; }); toast('Factura cancelada.'); });
    btn('Duplicar', () => duplicate(inv));
    const last = document.createElement('td'); last.append(act); tr.append(last);
    body.append(tr);
  });
  $('#hEmpty').hidden = list.length > 0;
  renderExtras(); renderEmpresas(); renderRecibidas(); if (typeof tab !== 'undefined' && tab === 'tax') renderTaxes();
  $('#hEmpty p').innerHTML = u.invoices.length ? '<b>Sin resultados</b><br>Prueba con otro filtro o búsqueda.' : '<b>Aún no hay facturas</b><br>Crea la primera con el formulario de arriba.';
}
$$('#chips button').forEach(b => b.onclick = () => { filter = b.dataset.f; renderDash(); });
$('#hSearch').oninput = e => { query = e.target.value; renderDash(); };
// ---------- Elegir plan ----------
let planSel = 'neg', planPrimera = true;
function renderPlan() {
  $$('.pcard').forEach(c => { const on = c.dataset.plan === planSel; c.classList.toggle('sel', on); c.setAttribute('aria-checked', on); });
  $('#bPlanOk').textContent = (planPrimera ? 'Continuar con el plan ' : 'Cambiar al plan ') + PLANS[planSel].name;
}
function showPlan(primera) {
  planPrimera = primera; planSel = acct.planElegido ? acct.plan : 'neg';
  $('#planStep').textContent = primera ? 'Último paso' : 'Tu plan';
  $('#planTitle').textContent = primera ? 'Elige tu plan' : 'Cambiar de plan';
  $('#planSub').textContent = primera ? 'Tu cuenta ya está creada. Elige el plan que quieres usar; podrás cambiarlo cuando quieras.' : 'El cambio aplica a tus timbres de este mes.';
  $('#bPlanCancel').hidden = primera;
  only($('#planView')); renderPlan();
}
$$('.pcard').forEach(c => c.onclick = () => { planSel = c.dataset.plan; renderPlan(); });
$('#bPlanOk').onclick = () => {
  const primera = planPrimera;
  ensureEmpresas();
  if (acct.empresas.length > PLANS[planSel].rfc) { toast(`Tienes ${acct.empresas.length} empresas y el plan ${PLANS[planSel].name} permite ${PLANS[planSel].rfc}. Elige un plan con más empresas.`, 'err'); return; }
  update(u => { u.plan = planSel; u.planElegido = true; });
  toast((primera ? 'Plan ' : 'Cambiaste al plan ') + PLANS[planSel].name + (primera ? ' activado.' : '.') + ' Sin cobro en la demostración.');
  openDash();
};
$('#bPlanCancel').onclick = () => openDash();
$('#bPlan').onclick = () => showPlan(false);

// Conceptos y totales
let focusLast = false;
function addLine(f = false) { lines.push({ d: '', q: 1, p: 0 }); focusLast = f; drawLines(); }
function drawLines() {
  const box = $('#lines'); box.replaceChildren();
  lines.forEach((l, i) => {
    const row = document.createElement('div'); row.className = 'line';
    const mk = (ph, type, val, key, label) => {
      const inp = document.createElement('input'); inp.type = type; inp.placeholder = ph; inp.value = val; inp.setAttribute('aria-label', label);
      if (type === 'number') { inp.min = '0'; inp.step = 'any'; inp.inputMode = 'decimal'; } else { inp.setAttribute('list', 'dlItems'); inp.autocomplete = 'off'; }
      inp.oninput = () => { l[key] = type === 'number' ? parseFloat(inp.value) || 0 : inp.value; totals(); };
      if (key === 'd') inp.onchange = () => { const it = acct.items.find(x => x.d === inp.value); if (it && !l.p) { l.p = it.p; const pi = row.children[2]; if (pi) pi.value = it.p; totals(); } };
      if (key === 'p') inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); if (i === lines.length - 1) addLine(true); } };
      return inp;
    };
    const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.textContent = '×'; x.setAttribute('aria-label', 'Quitar concepto');
    x.onclick = () => { if (lines.length > 1) { lines.splice(i, 1); drawLines(); } };
    row.append(mk('Concepto', 'text', l.d, 'd', 'Concepto'), mk('Cant.', 'number', l.q, 'q', 'Cantidad'), mk('Precio', 'number', l.p || '', 'p', 'Precio unitario'), x);
    box.append(row);
  });
  if (focusLast) { const r = $$('.line', box).pop(); r && r.firstChild.focus(); focusLast = false; }
  totals(); if (typeof saveDraft === 'function') saveDraft();
}
// ---------- Impuestos de la factura (según giro y régimen) ----------
const GIROS = {
  general:       { n: 'Otro / general', iva: '16' },
  profesional:   { n: 'Servicios profesionales y honorarios', iva: '16', ret: 'prof' },
  tecnologia:    { n: 'Tecnología, software y diseño', iva: '16', ret: 'prof' },
  comercio:      { n: 'Comercio y venta de mercancías', iva: '16' },
  restaurante:   { n: 'Restaurantes y alimentos preparados', iva: '16' },
  alimentos0:    { n: 'Alimentos básicos y medicinas (tasa 0%)', iva: '0' },
  construccion:  { n: 'Construcción y servicios generales', iva: '16' },
  arrendamiento: { n: 'Arrendamiento de locales y oficinas', iva: '16', ret: 'arr' },
  casahab:       { n: 'Arrendamiento de casa habitación', iva: 'exento' },
  educacion:     { n: 'Educación con RVOE', iva: 'exento' },
  salud:         { n: 'Servicios médicos y de salud', iva: 'exento' },
  transporte:    { n: 'Transporte terrestre de carga', iva: '16', ret: 'transp' },
  agro:          { n: 'Agricultura, ganadería y pesca', iva: '0' },
  hospedaje:     { n: 'Hospedaje y turismo', iva: '16', ish: 0.03 },
  licores:       { n: 'Bebidas alcohólicas y tabaco (IEPS)', iva: '16', ieps: 0.265 },
  exportacion:   { n: 'Exportación de bienes o servicios', iva: '0' },
};
['#rGiro', '#eGiro', '#iGiro'].forEach(id => { $(id).innerHTML = Object.entries(GIROS).map(([k, g]) => `<option value="${k}">${g.n}</option>`).join(''); });
const r2 = n => Math.round((n + Number.EPSILON) * 100) / 100;
const pctTxt = n => (Math.round(n * 10000) / 100).toLocaleString('es-MX') + '%';
let taxTouched = false;
const setSel = (sel, num) => { const o = [...sel.options].find(x => Math.abs(parseFloat(x.value) - num) < 1e-9); if (o) sel.value = o.value; };

// Sugiere los impuestos según el giro, el régimen del emisor y si el cliente es persona moral.
function taxDefaults() {
  const giro = GIROS[(acct && acct.giro) || 'general'] || GIROS.general, reg = acct ? String(acct.regimen || '').split(' ')[0] : '';
  const emisorPF = !!acct && cleanRfc(acct.rfc).length === 13, rc = cleanRfc($('#iRfc').value), receptorPM = rc.length === 12 && !GENERICOS.includes(rc);
  const c = { iva: giro.iva, isr: 0, ivaRet: 0, ieps: giro.ieps || 0, ish: giro.ish || 0 };
  const motivos = [`Sugerido para «${giro.n}»`];
  if (receptorPM && giro.ret) {
    if ((giro.ret === 'prof' || giro.ret === 'arr') && emisorPF) { c.isr = reg === '626' ? 0.0125 : 0.10; c.ivaRet = 0.106667; motivos.push(`tu cliente es persona moral y tú persona física: te retiene ISR ${pctTxt(c.isr)} e IVA 2/3`); }
    if (giro.ret === 'transp') { c.ivaRet = 0.04; motivos.push('tu cliente es persona moral: retiene 4% de IVA por autotransporte'); }
  }
  if (c.iva === 'exento') c.ivaRet = 0;
  if (giro.ieps) motivos.push('la tasa de IEPS depende del producto; ajústala');
  if (giro.ish) motivos.push('el impuesto sobre hospedaje varía por estado; ajústalo');
  return { c, nota: motivos.join(' · ') + '. Confirma con tu contador.' };
}
function setTaxControls(c) {
  $('#tIvaSel').value = String(c.iva);
  [['Isr', c.isr], ['IvaRet', c.ivaRet], ['Ieps', c.ieps], ['Ish', c.ish]].forEach(([k, v]) => { $('#t' + k + 'On').checked = v > 0; if (v > 0) setSel($('#t' + k + 'Sel'), v); });
  syncTaxEnabled();
}
function syncTaxEnabled() {
  const ex = $('#tIvaSel').value === 'exento';
  $('#tIvaRetOn').disabled = ex; if (ex) $('#tIvaRetOn').checked = false;
  [['Isr'], ['IvaRet'], ['Ieps'], ['Ish']].forEach(([k]) => { $('#t' + k + 'Sel').disabled = !$('#t' + k + 'On').checked; });
}
function taxConfig() {
  const on = k => $('#t' + k + 'On').checked && !$('#t' + k + 'On').disabled;
  return { iva: $('#tIvaSel').value, isr: on('Isr') ? +$('#tIsrSel').value : 0, ivaRet: on('IvaRet') ? +$('#tIvaRetSel').value : 0, ieps: on('Ieps') ? +$('#tIepsSel').value : 0, ish: on('Ish') ? +$('#tIshSel').value : 0 };
}
function applyTaxDefaults() {
  if (!acct) return;
  const d = taxDefaults(); $('#taxNote').textContent = d.nota;
  if (!taxTouched) setTaxControls(d.c);
  totals();
}
$$('#taxes select, #taxes input').forEach(el => el.addEventListener('change', () => { taxTouched = true; syncTaxEnabled(); totals(); saveDraft(); }));
$('#bTaxReset').onclick = () => { taxTouched = false; applyTaxDefaults(); saveDraft(); toast('Impuestos restablecidos según tu giro.'); };
$('#iGiro').onchange = e => { acct.giro = e.target.value; taxTouched = false; persist(); renderDash(); toast('Giro actualizado: ' + GIROS[acct.giro].n); };
$('#iRfc').addEventListener('input', () => { if (!taxTouched) applyTaxDefaults(); });

const calc = () => {
  const c = taxConfig(), sub = r2(lines.reduce((t, l) => t + r2(l.q * l.p), 0));
  const ieps = r2(sub * c.ieps), ish = r2(sub * c.ish), tasa = c.iva === 'exento' ? 0 : (+c.iva) / 100;
  const iva = r2((sub + ieps) * tasa), isr = r2(sub * c.isr), ivaRet = r2(sub * c.ivaRet);
  return { c, sub, ieps, ish, iva, isr, ivaRet, tot: r2(sub + ieps + ish + iva - isr - ivaRet) };
};
function totals() {
  const t = calc(), vis = (id, v) => { $(id).hidden = !v; };
  $('#tSub').textContent = money(t.sub);
  $('#lIva').textContent = t.c.iva === 'exento' ? 'IVA (exento)' : 'IVA ' + t.c.iva + '%'; $('#tIva').textContent = money(t.iva);
  $('#tIeps').textContent = money(t.ieps); vis('#rIeps', t.c.ieps > 0);
  $('#tIsh').textContent = money(t.ish); vis('#rIsh', t.c.ish > 0);
  $('#lIsr').textContent = 'Retención ISR ' + pctTxt(t.c.isr); $('#tIsr').textContent = '−' + money(t.isr); vis('#rIsr', t.c.isr > 0);
  $('#lIvaRet').textContent = 'Retención IVA ' + pctTxt(t.c.ivaRet); $('#tIvaRet').textContent = '−' + money(t.ivaRet); vis('#rIvaRet', t.c.ivaRet > 0);
  $('#tTot').textContent = money(t.tot);
}

$('#bAdd').onclick = () => addLine(true);

// Autocompletar cliente
$('#iName').addEventListener('change', () => { const c = acct && acct.clients.find(x => x.name.toLowerCase() === $('#iName').value.trim().toLowerCase()); if (c) { $('#iRfc').value = c.rfc; $('#iRfc').paint(); } });

function buildInvoice() {
  const msg = $('#iMsg'), rfc = $('#iRfc'); rfc.value = cleanRfc(rfc.value);
  const name = $('#iName').value.trim(), valid = lines.filter(l => l.d.trim() && l.p > 0 && l.q > 0);
  const rc = rfcCheck(rfc.value, { generico: true });
  rfc.classList.toggle('bad', !rc.ok);
  if (!name) { say(msg, 'Escribe el nombre del cliente.', true); $('#iName').focus(); return null; }
  if (!rc.ok) { say(msg, rc.msg || 'Escribe el RFC del cliente.', true); rfc.focus(); return null; }
  if (!valid.length) { say(msg, 'Agrega al menos un concepto con cantidad y precio.', true); return null; }
  return { id: crypto.randomUUID(), cliente: name, rfc: rfc.value, uso: $('#iUso').value, metodo: $('#iMet').value, lineas: valid.map(l => ({ ...l })), ...(() => { const t = calc(); return { total: t.tot, sub: t.sub, iva: t.iva, ieps: t.ieps, ish: t.ish, isr: t.isr, ivaRet: t.ivaRet, cfg: t.c }; })(), fecha: Date.now(), estatus: 'borrador' };
}
function resetForm() { $('#fInv').reset(); taxTouched = false; $('#iRfc').paint(); lines = []; addLine(); $('#iMsg').hidden = true; }
function remember(x, inv) {
  const c = x.clients.find(k => k.rfc === inv.rfc); if (c) c.name = inv.cliente; else x.clients.push({ name: inv.cliente, rfc: inv.rfc });
  inv.lineas.forEach(l => { const it = x.items.find(k => k.d === l.d); if (it) it.p = l.p; else x.items.push({ d: l.d, p: l.p }); });
}

function stamp(id, newInv) {
  const limit = PLANS[acct.plan].limit, msg = $('#iMsg');
  if (acct.used >= limit) { say(msg, `Llegaste al límite de ${limit} timbres. Mejora tu plan o compra timbres extra ($3 c/u).`, true); toast('Sin timbres disponibles.', 'err'); return false; }
  update(x => {
    const inv = newInv || x.invoices.find(i => i.id === id);
    if (newInv) { x.invoices.push(inv); remember(x, inv); }
    if (!inv.folio) inv.folio = 'A-' + String(++x.seq).padStart(4, '0');
    inv.estatus = 'timbrada'; inv.uuid = crypto.randomUUID(); x.used++; inv.fecha = Date.now();
  });
  flashId = newInv ? newInv.id : id; renderDash(); celebrate();
  say(msg, 'Factura timbrada (demostración). Se descontó 1 timbre.'); toast('Factura timbrada. Quedan ' + (limit - acct.used) + ' timbres.'); return true;
}
$('#bStamp').onclick = () => { const inv = buildInvoice(); if (inv && stamp(null, inv)) resetForm(); };
$('#bDraft').onclick = () => {
  const inv = buildInvoice(); if (!inv) return;
  update(u => { inv.folio = 'A-' + String(++u.seq).padStart(4, '0'); u.invoices.push(inv); remember(u, inv); });
  flashId = inv.id; renderDash(); say($('#iMsg'), 'Borrador guardado. No consume timbres.'); toast('Borrador guardado.'); resetForm();
};
function duplicate(inv) {
  $('#iName').value = inv.cliente; $('#iRfc').value = inv.rfc; $('#iRfc').paint();
  $('#iUso').value = inv.uso; $('#iMet').value = inv.metodo;
  lines = inv.lineas.map(l => ({ ...l }));
  if (inv.cfg) { taxTouched = true; setTaxControls(inv.cfg); } else { taxTouched = false; }
  drawLines(); applyTaxDefaults();
  $('#fInv').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  toast('Factura copiada al formulario. Ajusta y timbra.');
}
// Atajo: Ctrl/Cmd + Enter timbra
$('#fInv').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('#bStamp').click(); } });

// ---------- Mi privacidad: acceso y cancelación ----------
$('#bData').onclick = () => {
  const { salt, hash, ...safe } = acct;
  $('#dataBox').value = JSON.stringify(safe, null, 2);
  $$('dialog[open]').forEach(d => d.close()); lastFocus = $('#bData'); $('#dlgData').showModal();
};
$('#bCopy').onclick = async () => {
  const box = $('#dataBox');
  try { await navigator.clipboard.writeText(box.value); toast('Datos copiados.'); } catch { box.select(); toast('Selecciona y copia el texto (Ctrl+C).'); }
};
$('#bDel').onclick = () => { $('#delConfirm').value = ''; $('#bDelOk').disabled = true; lastFocus = $('#bDel'); $('#dlgDel').showModal(); };
$('#delConfirm').oninput = e => { $('#bDelOk').disabled = e.target.value.trim().toUpperCase() !== 'ELIMINAR'; };
$('#bDelOk').onclick = () => {
  const db = loadDb(); delete db[localEmail]; saveDb(db); setSession(null);
  $('#dlgDel').close(); acct = null; localEmail = null; lines = []; showAuth(); toast('Tu cuenta y tus datos fueron eliminados.');
};


// Descargar la app: copiar enlace
$('#bCopyLink').onclick = async () => {
  try { await navigator.clipboard.writeText(location.href.split('#')[0]); toast('Enlace copiado.'); } catch { toast('No se pudo copiar. Copia la dirección desde el navegador.', 'err'); }
};

// ---------- Fluidez y facilidad ----------
const fine = matchMedia('(pointer:fine)').matches;

// Efecto de onda en botones
document.addEventListener('pointerdown', e => {
  const b = e.target.closest('.btn'); if (!b || reduceMotion) return;
  const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 1.6, s = document.createElement('span');
  s.className = 'ripple'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
  b.append(s); setTimeout(() => s.remove(), 650);
});
// Luz que sigue al cursor e inclinación suave en tarjetas
if (fine && !reduceMotion) {
  document.addEventListener('pointermove', e => {
    const c = e.target.closest('.feat,.plan,.kpi'); if (!c) return;
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    c.style.setProperty('--mx', x * 100 + '%'); c.style.setProperty('--my', y * 100 + '%');
    if (!c.matches('.kpi')) { c.style.setProperty('--ry', (x - .5) * 7 + 'deg'); c.style.setProperty('--rx', (.5 - y) * 7 + 'deg'); }
  }, { passive: true });
  document.addEventListener('pointerout', e => { const c = e.target.closest('.feat,.plan'); if (c && !c.contains(e.relatedTarget)) { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); } });
}
// Volver arriba
const toTop = $('#toTop');
addEventListener('scroll', () => toTop.classList.toggle('show', scrollY > 700), { passive: true });
toTop.onclick = () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
// Contadores de la portada
$$('.hstats [data-count]').forEach(el => countTo(el, +el.dataset.count));
// Palabra que cambia en la portada
const rotor = $('#rotor');
if (rotor && !reduceMotion) {
  const words = rotor.dataset.words.split('|'); let wi = 0;
  setInterval(() => { rotor.classList.add('out'); setTimeout(() => { wi = (wi + 1) % words.length; rotor.textContent = words[wi]; rotor.classList.remove('out'); }, 300); }, 2800);
}
// Celebración al timbrar
function celebrate() {
  if (reduceMotion) return;
  const c = $('#celebrate'); c.classList.remove('on'); $$('.cf', c).forEach(x => x.remove());
  const colors = ['#5b4bff', '#00c2a8', '#ffb84d', '#ff6b8b', '#2ff0cf'];
  for (let i = 0; i < 30; i++) {
    const f = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 200;
    f.className = 'cf'; f.style.cssText = `--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d - 70}px;--r:${Math.random() * 720 - 360}deg;background:${colors[i % 5]};animation-delay:${Math.random() * .12}s`;
    c.append(f);
  }
  c.offsetWidth; c.classList.add('on');
  setTimeout(() => { c.classList.remove('on'); $$('.cf', c).forEach(x => x.remove()); }, 1800);
}

// Primeros pasos, clientes recientes y acciones rápidas
function renderExtras() {
  if (!acct) return;
  const done = [true, acct.invoices.length > 0, acct.invoices.some(i => i.uuid)], n = done.filter(Boolean).length;
  done.forEach((d, i) => $('#ob' + (i + 1)).classList.toggle('done', d));
  $('#obCount').textContent = n === 3 ? '¡Listo!' : n + ' de 3'; $('#obBar').style.width = n / 3 * 100 + '%';
  $('#onboard').classList.toggle('complete', n === 3);
  const box = $('#recent'), rec = [...acct.clients].slice(-5).reverse();
  box.hidden = !rec.length; box.replaceChildren(...rec.map(c => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rchip'; b.textContent = c.name.length > 22 ? c.name.slice(0, 21) + '…' : c.name; b.title = c.name + ' · ' + c.rfc;
    b.onclick = () => { $('#iName').value = c.name; $('#iRfc').value = c.rfc; $('#iRfc').paint(); saveDraft(); const l = $('.line input'); l && l.focus(); };
    return b;
  }));
  $('#qRepeat').disabled = !acct.invoices.length;
}
const goForm = () => { $('#fInv').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); setTimeout(() => $('#iName').focus({ preventScroll: true }), 350); };
$('#qNew').onclick = goForm;
$('#qRepeat').onclick = () => { const last = acct && acct.invoices[acct.invoices.length - 1]; if (last) duplicate(last); else toast('Aún no hay facturas para repetir.', 'err'); };
$('#qExample').onclick = () => {
  $('#iName').value = 'Estudio Aurora S.A. de C.V.'; $('#iRfc').value = 'GAMJ800101AB8'; $('#iRfc').paint();
  lines = [{ d: 'Diseño de marca', q: 1, p: 12000 }]; drawLines(); goForm(); toast('Ejemplo cargado. Presiona «Timbrar factura».');
};
$('#qSearch').onclick = () => { const i = $('#hSearch'); i.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); setTimeout(() => i.focus({ preventScroll: true }), 350); };
// Atajos de teclado
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || !acct || view !== 'panel') return;
  const t = e.target; if (t.closest && t.closest('input,textarea,select,[contenteditable],dialog')) return;
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); goForm(); }
  else if (e.key === '/') { e.preventDefault(); $('#qSearch').click(); }
});
// Borrador automático del formulario
let draftT;
function saveDraft() {
  if (!acct) return; clearTimeout(draftT);
  draftT = setTimeout(() => {
    const f = { name: $('#iName').value, rfc: $('#iRfc').value, uso: $('#iUso').value, met: $('#iMet').value, lines: lines.map(l => ({ ...l })), cfg: taxTouched ? taxConfig() : null };
    const empty = !f.name && !f.rfc && lines.every(l => !l.d && !l.p);
    if (empty && !acct.formDraft) return;
    acct.formDraft = empty ? null : f; persist();
  }, 400);
}
function restoreDraft() {
  const f = acct && acct.formDraft; if (!f || $('#iName').value || lines.some(l => l.d || l.p)) return;
  $('#iName').value = f.name; $('#iRfc').value = f.rfc; $('#iRfc').paint(); $('#iUso').value = f.uso; $('#iMet').value = f.met;
  lines = f.lines.length ? f.lines : [{ d: '', q: 1, p: 0 }];
  if (f.cfg) { taxTouched = true; setTaxControls(f.cfg); } else taxTouched = false;
  drawLines(); applyTaxDefaults(); toast('Recuperamos tu borrador sin terminar.');
}
$('#fInv').addEventListener('input', saveDraft); $('#fInv').addEventListener('change', saveDraft);
// Indicador de carga en los botones de acceso
[$('#fReg'), $('#fLogin')].forEach(f => { const orig = f.onsubmit; f.onsubmit = async e => { const sb = e.submitter; sb && sb.classList.add('loading'); try { return await orig.call(f, e); } finally { setTimeout(() => sb && sb.classList.remove('loading'), 250); } }; });

// ---------- Mis empresas (panel del administrador) ----------
let tab = 'fact';
function setTab(t) {
  tab = t;
  const map = { fact: ['#tabFact', '#ptFact'], rec: ['#tabRec', '#ptRec'], emp: ['#tabEmp', '#ptEmp'], tax: ['#tabTax', '#ptTax'] };
  Object.entries(map).forEach(([k, [pane, btn]]) => { $(pane).hidden = k !== t; $(btn).classList.toggle('on', k === t); $(btn).setAttribute('aria-selected', k === t); });
  const el = $(map[t][0]); el.classList.remove('view-in'); el.offsetWidth; el.classList.add('view-in');
  if (t === 'emp') renderEmpresas();
  if (t === 'tax') renderTaxes();
  if (t === 'rec') renderRecibidas();
}
$('#ptFact').onclick = () => setTab('fact'); $('#ptEmp').onclick = () => setTab('emp'); $('#ptTax').onclick = () => setTab('tax'); $('#ptRec').onclick = () => setTab('rec');
$('#eReg').innerHTML = $('#rReg').innerHTML;
bindRfc($('#eRfc'), $('#eRfcHint'), false);

const statsEmpresa = e => {
  const inv = e.invoices || [], mk = monthKey();
  return {
    total: inv.length, timbradas: inv.filter(i => i.estatus === 'timbrada').length, borradores: inv.filter(i => i.estatus === 'borrador').length,
    canceladas: inv.filter(i => i.estatus === 'cancelada').length, facturado: inv.filter(i => i.estatus === 'timbrada').reduce((s, i) => s + i.total, 0),
    mes: inv.filter(i => i.uuid && monthKey(i.fecha) === mk).length,
  };
};
function renderEmpresas() {
  if (!acct || !acct.empresas) return;
  syncActive();
  const lista = acct.empresas, max = PLANS[acct.plan].rfc;
  $('#ptCount').textContent = lista.length;
  const sel = $('#dEmp'); sel.hidden = lista.length < 2;
  sel.replaceChildren(...lista.map((e, i) => { const o = document.createElement('option'); o.value = i; o.textContent = e.razon; return o; })); sel.value = acct.activa;
  let totF = 0, totM = 0;
  const body = $('#eBody'); body.replaceChildren();
  lista.forEach((e, i) => {
    const st = statsEmpresa(e); totF += st.total; totM += st.facturado;
    const tr = document.createElement('tr'); tr.style.animationDelay = Math.min(i, 8) * 0.04 + 's';
    const cell = (t, cls) => { const td = document.createElement('td'); td.textContent = t; if (cls) td.className = cls; tr.append(td); return td; };
    const c = cell(e.razon); if (i === acct.activa) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = 'Activa'; b.style.marginLeft = '8px'; c.append(b); }
    const reg = document.createElement('small'); reg.className = 'uuid'; reg.textContent = 'Régimen ' + String(e.regimen || '').split(' ')[0] + ' · ' + (GIROS[e.giro || 'general'] || GIROS.general).n; c.append(reg);
    cell(e.rfc, 'mono'); cell(st.total, 'num strong'); cell(st.timbradas, 'num'); cell(st.borradores, 'num'); cell(st.canceladas, 'num'); cell(money(st.facturado), 'num'); cell(st.mes, 'num');
    const act = document.createElement('div'); act.className = 'rowact';
    const b = document.createElement('button'); b.type = 'button'; b.textContent = i === acct.activa ? 'Ver facturas' : 'Abrir';
    b.onclick = () => { if (i !== acct.activa) switchEmpresa(i); setTab('fact'); $('#tabFact').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); };
    act.append(b); const td = document.createElement('td'); td.append(act); tr.append(td); body.append(tr);
  });
  $('#eCount').textContent = lista.length + ' de ' + max; $('#eFacts').textContent = totF; $('#eMonto').textContent = money(totM);
  const lleno = lista.length >= max;
  $('#eLimit').textContent = `Tu plan ${PLANS[acct.plan].name} permite ${max} ${max === 1 ? 'empresa' : 'empresas'}.` + (lleno ? ' Para agregar más, cambia de plan.' : '');
  $('#bAddEmp').disabled = false; $('#bAddEmp').classList.toggle('ghost', lleno);
}
$('#dEmp').onchange = e => { switchEmpresa(+e.target.value); toast('Empresa activa: ' + acct.razon); };
$('#bAddEmp').onclick = () => {
  const max = PLANS[acct.plan].rfc;
  if (acct.empresas.length >= max) { toast(`Tu plan permite ${max} ${max === 1 ? 'empresa' : 'empresas'}. Cambia de plan para agregar más.`, 'err'); return; }
  $('#fEmp').hidden = false; $('#fEmp').classList.remove('view-in'); $('#fEmp').offsetWidth; $('#fEmp').classList.add('view-in'); $('#eRazon').focus();
};
$('#bCancelEmp').onclick = () => { $('#fEmp').hidden = true; $('#fEmp').reset(); $('#eRfc').paint(); $('#eMsg').hidden = true; };
$('#fEmp').onsubmit = e => {
  e.preventDefault();
  const msg = $('#eMsg'), razon = $('#eRazon').value.trim(), rfc = cleanRfc($('#eRfc').value); $('#eRfc').value = rfc;
  const rc = rfcCheck(rfc);
  if (razon.length < 2) return say(msg, 'Escribe la razón social o el nombre de la empresa.', true);
  if (!rc.ok) { $('#eRfc').focus(); return say(msg, rc.msg || 'Escribe el RFC de la empresa.', true); }
  syncActive();
  if (acct.empresas.some(x => x.rfc === rfc)) return say(msg, 'Ya registraste una empresa con ese RFC.', true);
  const max = PLANS[acct.plan].rfc;
  if (acct.empresas.length >= max) return say(msg, `Tu plan permite ${max} ${max === 1 ? 'empresa' : 'empresas'}. Cambia de plan para agregar más.`, true);
  acct.empresas.push({ id: crypto.randomUUID(), razon, rfc, regimen: $('#eReg').value, giro: $('#eGiro').value || 'general', invoices: [], received: [], clients: [], items: [], seq: 0, formDraft: null, taxIn: null });
  persist(); $('#fEmp').reset(); $('#eRfc').paint(); $('#fEmp').hidden = true; msg.hidden = true;
  switchEmpresa(acct.empresas.length - 1); toast('Empresa agregada: ' + razon); setTab('fact');
};

// ---------- Impuestos del periodo (cálculo automático por régimen fiscal) ----------
// Tarifa mensual del art. 96 de la LISR, Anexo 8 de la RMF 2026: [límite inferior, cuota fija, % sobre el excedente]. Verifica el Anexo 8 vigente.
const TARIFA_2026 = [[0.01, 0, 1.92], [844.60, 16.22, 6.40], [7168.52, 420.95, 10.88], [12598.03, 1011.68, 16.00], [14644.65, 1339.14, 17.92], [17533.65, 1856.84, 21.36],
  [35362.84, 5665.16, 23.52], [55736.69, 10457.09, 30.00], [106410.51, 25659.23, 32.00], [141880.67, 37009.69, 34.00], [425642.00, 133488.54, 35.00]];
// RESICO personas físicas (art. 113-E LISR): ingresos cobrados del mes hasta [tope, tasa].
const RESICO_PF = [[25000, 0.01], [50000, 0.011], [83333.33, 0.015], [208333.33, 0.02], [291666.67, 0.025]];
function isrTarifa(base, meses) {
  if (base <= 0) return 0;
  let f = TARIFA_2026[0]; for (const r of TARIFA_2026) if (base >= r[0] * meses) f = r;
  return r2(f[1] * meses + (base - f[0] * meses) * f[2] / 100);
}
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const invAmt = i => { const sub = i.sub !== undefined ? i.sub : r2(i.total / 1.16); return { sub, iva: i.iva !== undefined ? i.iva : r2(sub * 0.16), isr: i.isr || 0, ivaRet: i.ivaRet || 0 }; };
const REG_TXT = {
  '626': ['RESICO persona física', 'ISR sobre los ingresos cobrados del mes, sin deducciones, con la tabla del art. 113-E. Te retienen 1.25% de ISR cuando facturas a personas morales.'],
  '626m': ['RESICO persona moral', '30% sobre la utilidad de flujo de efectivo acumulada del año (ingresos menos gastos).'],
  '612': ['Actividades empresariales y profesionales', 'Pago provisional acumulado: (ingresos − deducciones) con la tarifa del art. 96 por los meses transcurridos, menos pagos previos y retenciones.'],
  '606': ['Arrendamiento', 'Ingresos acumulados menos deducciones (o la deducción opcional del 35%) con la tarifa del art. 96, menos pagos previos y retenciones.'],
  '601': ['General de Ley Personas Morales', 'Pago provisional: coeficiente de utilidad × ingresos acumulados × 30%, menos pagos previos y retenciones.'],
  '603': ['Personas morales con fines no lucrativos', 'No hay pago provisional de ISR por ingresos propios de la actividad; sí aplica IVA cuando hay actos gravados.'],
};
function periodosDisponibles() {
  const hoy = new Date(), out = [];
  for (let m = hoy.getMonth(); m >= 0; m--) out.push(`${hoy.getFullYear()}-${String(m + 1).padStart(2, '0')}`);
  return out;
}
function estimarImpuestos(period, inp, sim) {
  const [yy, mm] = period.split('-').map(Number), reg = String(acct.regimen).split(' ')[0], pm = cleanRfc(acct.rfc).length === 12;
  const stamped = acct.invoices.filter(i => i.estatus === 'timbrada');
  const mes = stamped.filter(i => monthKey(i.fecha) === period);
  const ytd = stamped.filter(i => { const k = monthKey(i.fecha); return k.slice(0, 4) === String(yy) && +k.slice(5) <= mm; });
  const sum = (arr, k) => r2(arr.reduce((t, i) => t + invAmt(i)[k], 0));
  let ingMes = sum(mes, 'sub'), ivaTr = sum(mes, 'iva'); const ivaRet = sum(mes, 'ivaRet'); let ingAcum = sum(ytd, 'sub'); const isrRetMes = sum(mes, 'isr'), isrRetAcum = sum(ytd, 'isr');
  // Facturas recibidas: gastos deducibles del año e IVA acreditable del mes
  const rec = (acct.received || []).filter(r => r.deducible), recMes = rec.filter(r => monthKey(r.fecha) === period);
  const recYtd = rec.filter(r => { const k = monthKey(r.fecha); return k.slice(0, 4) === String(yy) && +k.slice(5) <= mm; });
  const gastosRec = r2(recYtd.reduce((t, r) => t + r.sub, 0)), ivaRec = r2(recMes.reduce((t, r) => t + r.iva, 0));
  let gastos = (+inp.gastos || 0) + gastosRec, ivaAc = (+inp.ivaAc || 0) + ivaRec; const prev = +inp.prev || 0;
  if (sim) {
    const ti = sim.ivaIng === 'exento' ? 0 : (+sim.ivaIng) / 100, tg = sim.ivaGas === 'exento' ? 0 : (+sim.ivaGas) / 100;
    ingMes = r2(ingMes + sim.ing); ingAcum = r2(ingAcum + sim.ing); ivaTr = r2(ivaTr + sim.ing * ti);
    gastos = r2(gastos + sim.gas); ivaAc = r2(ivaAc + sim.gas * tg);
  }
  const ivaNeto = r2(ivaTr - ivaRet - ivaAc);
  const iva = [['Ingresos del mes (sin IVA)', ingMes], ['IVA trasladado en tus facturas', ivaTr], ['(−) IVA que te retuvieron', -ivaRet], [`(−) IVA acreditable de tus gastos${ivaRec ? ' (incluye facturas recibidas)' : ''}`, -ivaAc], [ivaNeto >= 0 ? 'IVA por pagar' : 'IVA a favor', Math.abs(ivaNeto), 'sum']];
  let isr = [], isrPagar = null, nota = '', key = reg === '626' && pm ? '626m' : reg;
  const final = (isrPer, etiquetaPrev) => { const neto = r2(isrPer - prev - isrRetAcum); isr.push([etiquetaPrev, -prev], ['(−) ISR que te retuvieron en el año', -isrRetAcum], [neto > 0 ? 'ISR a pagar' : 'ISR a favor / sin pago', Math.abs(neto), 'sum']); isrPagar = Math.max(neto, 0); };
  if (key === '626') {
    const fila = RESICO_PF.find(r => ingMes <= r[0]) || RESICO_PF[RESICO_PF.length - 1], isrM = r2(ingMes * fila[1]), neto = r2(isrM - isrRetMes);
    isr = [['Ingresos cobrados del mes', ingMes], ['Tasa RESICO', pctTxt(fila[1])], ['ISR del mes', isrM], ['(−) ISR que te retuvieron (1.25%)', -isrRetMes], [neto > 0 ? 'ISR a pagar' : 'ISR retenido a tu favor', Math.abs(neto), 'sum']];
    isrPagar = Math.max(neto, 0);
    if (ingMes > RESICO_PF[RESICO_PF.length - 1][0]) nota = 'Tus ingresos del mes superan el tope de la tabla mensual de RESICO; revisa tu situación con tu contador.';
    if (ingAcum > 3500000) nota = 'Tus ingresos del año superan 3.5 millones de pesos, el límite para tributar en RESICO.';
  } else if (key === '626m') {
    const util = Math.max(r2(ingAcum - gastos), 0), isrP = r2(util * 0.30);
    isr = [['Ingresos acumulados del año', ingAcum], ['(−) Gastos deducibles acumulados', -gastos], ['Utilidad estimada', util], ['ISR al 30%', isrP]]; final(isrP, '(−) Pagos provisionales anteriores');
  } else if (key === '612' || key === '606') {
    const ded = key === '606' && inp.ded35 ? r2(ingAcum * 0.35) : gastos, base = Math.max(r2(ingAcum - ded), 0), isrP = isrTarifa(base, mm);
    isr = [['Ingresos acumulados del año', ingAcum], [key === '606' && inp.ded35 ? '(−) Deducción opcional 35%' : '(−) Gastos deducibles acumulados', -ded], ['Base del pago provisional', base], [`ISR con tarifa 2026 por ${mm} ${mm === 1 ? 'mes' : 'meses'}`, isrP]]; final(isrP, '(−) Pagos provisionales anteriores');
  } else if (key === '601') {
    const coef = +inp.coef > 0 ? +inp.coef : 0.2, util = r2(ingAcum * coef), isrP = r2(util * 0.30);
    isr = [['Ingresos acumulados del año', ingAcum], ['Coeficiente de utilidad', coef.toFixed(4)], ['Utilidad fiscal estimada', util], ['ISR al 30%', isrP]]; final(isrP, '(−) Pagos provisionales anteriores');
    if (!(+inp.coef > 0)) nota = 'Usé un coeficiente de 0.2000 de ejemplo. Captura el de tu última declaración anual.';
  } else if (key === '603') { isr = [['ISR por ingresos de la actividad', 'No aplica']]; isrPagar = 0; }
  else { isr = [['ISR', 'Sin cálculo automático']]; nota = `Para el régimen ${reg} todavía no calculamos el ISR automáticamente; el IVA sí. ${reg === '625' ? 'Las plataformas tecnológicas retienen ISR e IVA por tus ingresos.' : 'Consulta a tu contador.'}`; }
  const due = new Date(yy, mm, 17);
  return { iva, isr, ivaNeto, isrPagar, gastosRec, ivaRec, ingMes, ingAcum, ivaTr, total: r2(Math.max(ivaNeto, 0) + (isrPagar || 0)), nota, key, due: `Se presenta a más tardar el 17 de ${MESES[due.getMonth()]} de ${due.getFullYear()} (si es inhábil, el siguiente día hábil).`, ivaFavor: ivaNeto < 0 };
}
function dlRows(el, rows) {
  el.replaceChildren(...rows.map(([t, v, cls]) => {
    const d = document.createElement('div'); if (cls) d.className = cls;
    const a = document.createElement('dt'); a.textContent = t; const b = document.createElement('dd'); b.textContent = typeof v === 'number' ? money(v) : v; d.append(a, b); return d;
  }));
}
function renderTaxes() {
  if (!acct) return;
  syncActive();
  const sel = $('#xMes'), per = periodosDisponibles(), cur = sel.value && per.includes(sel.value) ? sel.value : per[0];
  sel.replaceChildren(...per.map(k => { const o = document.createElement('option'); o.value = k; o.textContent = MESES[+k.slice(5) - 1][0].toUpperCase() + MESES[+k.slice(5) - 1].slice(1) + ' ' + k.slice(0, 4); return o; })); sel.value = cur;
  const reg = String(acct.regimen).split(' ')[0], pm = cleanRfc(acct.rfc).length === 12, key = reg === '626' && pm ? '626m' : reg, info = REG_TXT[key];
  $('#xReg').textContent = `Régimen ${reg}${info ? ' · ' + info[0] : ''}. ${info ? info[1] : 'Todavía no calculamos el ISR de este régimen; el IVA sí.'}`;
  const inp = acct.taxIn || {};
  const setIf = (id, v) => { if (document.activeElement !== $(id)) $(id).value = v === undefined || v === null ? '' : v; };
  setIf('#xGastos', inp.gastos); setIf('#xIvaAc', inp.ivaAc); setIf('#xPrev', inp.prev); setIf('#xCoef', inp.coef); $('#xDed35').checked = !!inp.ded35;
  $('#xGastos').parentElement.hidden = key === '626' || key === '603' || !info; $('#xPrev').parentElement.hidden = key === '626' || key === '603' || !info;
  $('#xCoefBox').hidden = key !== '601'; $('#xDedBox').hidden = key !== '606';
  const r = estimarImpuestos(cur, inp);
  dlRows($('#xIva'), r.iva); dlRows($('#xIsr'), r.isr);
  $('#xTot').textContent = money(r.total); $('#xDue').textContent = r.due;
  $('#xNote').textContent = (r.ivaFavor ? 'Tienes IVA a favor este periodo: no se paga y puede acreditarse o solicitarse. ' : '') + r.nota;
  $('#xNote').hidden = !$('#xNote').textContent;
  curPeriodo = cur; renderSim(); renderTips(r, key);
}
let taxT;
['#xGastos', '#xIvaAc', '#xPrev', '#xCoef', '#xDed35'].forEach(id => $(id).addEventListener('input', () => {
  acct.taxIn = { gastos: $('#xGastos').value, ivaAc: $('#xIvaAc').value, prev: $('#xPrev').value, coef: $('#xCoef').value, ded35: $('#xDed35').checked };
  renderTaxes(); clearTimeout(taxT); taxT = setTimeout(persist, 400);
}));
$('#xMes').onchange = renderTaxes;

// ---------- Facturas recibidas (gastos y proveedores) ----------
const hoyISO = () => new Date().toISOString().slice(0, 10);
$('#cFecha').value = hoyISO();
bindRfc($('#cRfc'), $('#cRfcHint'), false);
function recCalc() {
  const sub = Math.max(+$('#cSub').value || 0, 0), t = $('#cIvaR').value, iva = t === 'exento' ? 0 : r2(sub * (+t) / 100), total = r2(sub + iva);
  const efectivoAlto = $('#cMet').value === 'efectivo' && total > 2000;
  return { sub, iva, total, efectivoAlto, ded: $('#cDed').checked && !efectivoAlto };
}
function paintRecPrev() {
  const c = recCalc(), el = $('#cPrev');
  el.className = 'fhint' + (c.efectivoAlto ? ' err' : c.sub ? ' ok' : '');
  el.textContent = !c.sub ? '' : c.efectivoAlto ? `Total ${money(c.total)}: los pagos en efectivo mayores a $2,000 no son deducibles ni acreditables.` : `Total ${money(c.total)} · IVA ${c.ded ? 'acreditable' : 'no acreditable'} ${money(c.iva)}`;
}
['#cSub', '#cIvaR', '#cMet', '#cDed'].forEach(id => $(id).addEventListener('input', paintRecPrev));
$('#fRec').onsubmit = e => {
  e.preventDefault();
  const msg = $('#cMsg'), rfc = cleanRfc($('#cRfc').value); $('#cRfc').value = rfc;
  const prov = $('#cProv').value.trim(), conc = $('#cConc').value.trim(), c = recCalc(), rc = rfcCheck(rfc);
  if (prov.length < 2) { $('#cProv').focus(); return say(msg, 'Escribe el nombre del proveedor.', true); }
  if (!rc.ok) { $('#cRfc').focus(); return say(msg, rc.msg || 'Escribe el RFC del proveedor.', true); }
  if (!conc) { $('#cConc').focus(); return say(msg, 'Escribe el concepto de la factura.', true); }
  if (!(c.sub > 0)) { $('#cSub').focus(); return say(msg, 'Escribe el subtotal de la factura.', true); }
  const fecha = new Date($('#cFecha').value + 'T12:00:00').getTime();
  if (!fecha || fecha > Date.now() + 864e5) return say(msg, 'La fecha de la factura no es válida.', true);
  acct.received.unshift({ id: crypto.randomUUID(), fecha, proveedor: prov, rfc, concepto: conc, categoria: $('#cCat').value, metodo: $('#cMet').value, ivaTasa: $('#cIvaR').value,
    sub: c.sub, iva: c.iva, total: c.total, deducible: c.ded, motivo: c.efectivoAlto ? 'Pago en efectivo mayor a $2,000' : !$('#cDed').checked ? 'Marcado como no deducible' : '' });
  persist(); $('#fRec').reset(); $('#cRfc').paint(); $('#cFecha').value = hoyISO(); paintRecPrev(); msg.hidden = true; renderRecibidas();
  toast(c.ded ? `Factura recibida registrada. IVA acreditable: ${money(c.iva)}.` : 'Factura recibida registrada (no deducible).');
};
function renderRecibidas() {
  if (!acct) return;
  const lista = acct.received || [], mk = monthKey(), mes = lista.filter(r => r.deducible && monthKey(r.fecha) === mk);
  $('#rkGasto').textContent = money(mes.reduce((t, r) => t + r.sub, 0)); $('#rkIva').textContent = money(mes.reduce((t, r) => t + r.iva, 0));
  $('#rkCount').textContent = lista.length; $('#ptRecCount').textContent = lista.length;
  const body = $('#rBody'); body.replaceChildren();
  [...lista].sort((a, b) => b.fecha - a.fecha).forEach((r, n) => {
    const tr = document.createElement('tr'); tr.style.animationDelay = Math.min(n, 8) * 0.04 + 's';
    const cell = (t, cls) => { const td = document.createElement('td'); td.textContent = t; if (cls) td.className = cls; tr.append(td); return td; };
    cell(new Date(r.fecha).toLocaleDateString('es-MX'));
    const c = cell(r.proveedor); const sm = document.createElement('small'); sm.className = 'uuid'; sm.textContent = r.rfc; c.append(sm);
    const k = cell(r.concepto); const sk = document.createElement('small'); sk.className = 'uuid'; sk.textContent = r.categoria; k.append(sk);
    cell(money(r.sub), 'num'); cell(r.ivaTasa === 'exento' ? 'Exento' : money(r.iva), 'num'); cell(money(r.total), 'num');
    const t = cell(''); const b = document.createElement('span'); b.className = 'st ' + (r.deducible ? 'timbrada' : 'borrador'); b.textContent = r.deducible ? 'Deducible' : 'No deducible'; if (r.motivo) b.title = r.motivo; t.append(b);
    if (r.motivo) { const m = document.createElement('small'); m.className = 'uuid'; m.textContent = r.motivo; t.append(m); }
    const act = document.createElement('div'); act.className = 'rowact';
    const d = document.createElement('button'); d.type = 'button'; d.textContent = 'Eliminar'; d.onclick = () => { acct.received = acct.received.filter(x => x.id !== r.id); persist(); renderRecibidas(); renderDash(); toast('Factura recibida eliminada.'); };
    act.append(d); const td = document.createElement('td'); td.append(act); tr.append(td); body.append(tr);
  });
  $('#rEmpty').hidden = lista.length > 0;
}

// ---------- Calculadora de facturas ----------
let cModo = 'neto';
const CALC_TXT = {
  neto: ['Monto neto que quiero recibir', 'Con los impuestos y retenciones de la factura que estás creando, calcula cuánto facturar (subtotal) para recibir esa cantidad.'],
  desglosar: ['Total con IVA incluido', 'Separa el subtotal y el IVA de un precio que ya incluye IVA.'],
  agregar: ['Subtotal', 'Suma los impuestos y retenciones de la factura que estás creando a un subtotal.'],
};
function calcResultado() {
  const v = Math.max(+$('#cMonto').value || 0, 0);
  const rows = []; let sub = 0;
  if (cModo === 'desglosar') {
    const t = (+$('#cIva').value) / 100; sub = r2(v / (1 + t));
    rows.push(['Subtotal', sub], [`IVA ${$('#cIva').value}%`, r2(v - sub)], ['Total', v, 'grand']);
    return { rows: v ? rows : [], sub };
  }
  const c = taxConfig(), tasa = c.iva === 'exento' ? 0 : (+c.iva) / 100;
  const factor = 1 + c.ieps + c.ish + (1 + c.ieps) * tasa - c.isr - c.ivaRet;
  sub = cModo === 'neto' ? r2(v / factor) : v;
  const ieps = r2(sub * c.ieps), ish = r2(sub * c.ish), iva = r2((sub + ieps) * tasa), isr = r2(sub * c.isr), ivr = r2(sub * c.ivaRet), tot = r2(sub + ieps + ish + iva - isr - ivr);
  rows.push([cModo === 'neto' ? 'Subtotal a facturar' : 'Subtotal', sub]);
  if (ieps) rows.push(['IEPS', ieps]); if (ish) rows.push(['Impuesto sobre hospedaje', ish]);
  rows.push([c.iva === 'exento' ? 'IVA (exento)' : `IVA ${c.iva}%`, iva]);
  if (isr) rows.push([`Retención ISR ${pctTxt(c.isr)}`, -isr]); if (ivr) rows.push([`Retención IVA ${pctTxt(c.ivaRet)}`, -ivr]);
  rows.push([cModo === 'neto' ? 'Total que recibes' : 'Total', tot, 'grand']);
  return { rows: v ? rows : [], sub };
}
function renderCalc() {
  $('#cLabel').textContent = CALC_TXT[cModo][0]; $('#cHelp').textContent = CALC_TXT[cModo][1]; $('#cIvaBox').hidden = cModo !== 'desglosar';
  $$('#calcModes button').forEach(b => { const on = b.dataset.m === cModo; b.classList.toggle('on', on); });
  const r = calcResultado(); dlRows($('#cOut'), r.rows); $('#cUse').disabled = !(r.sub > 0);
}
$$('#calcModes button').forEach(b => b.onclick = () => { cModo = b.dataset.m; renderCalc(); });
['#cMonto', '#cIva'].forEach(id => $(id).addEventListener('input', renderCalc));
$('#cClear').onclick = () => { $('#cMonto').value = ''; renderCalc(); };
$('#cUse').onclick = () => {
  const r = calcResultado(); if (!(r.sub > 0)) return;
  if (lines.length === 1 && !lines[0].d && !lines[0].p) lines[0] = { d: 'Servicio', q: 1, p: r.sub }; else lines.push({ d: 'Servicio', q: 1, p: r.sub });
  drawLines(); saveDraft(); $('#fInv').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); toast(`Subtotal de ${money(r.sub)} agregado a la factura.`);
};
renderCalc();

// ---------- Simulador de IVA y consejos para pagar menos ----------
let curPeriodo = null;
const fmtIva = n => n >= 0 ? money(n) + ' por pagar' : money(-n) + ' a favor';
function renderSim() {
  if (!acct || !curPeriodo) return;
  const inp = acct.taxIn || {}, sim = { ing: Math.max(+$('#sIng').value || 0, 0), ivaIng: $('#sIvaIng').value, gas: Math.max(+$('#sGas').value || 0, 0), ivaGas: $('#sIvaGas').value };
  const a = estimarImpuestos(curPeriodo, inp), b = estimarImpuestos(curPeriodo, inp, sim), dif = (x, y) => { const d = r2(y - x); return d === 0 ? '—' : (d > 0 ? '+' : '−') + money(Math.abs(d)); };
  const rows = [
    ['IVA del periodo', fmtIva(a.ivaNeto), fmtIva(b.ivaNeto), dif(a.ivaNeto, b.ivaNeto)],
    ['ISR del periodo', a.isrPagar === null ? 'N/D' : money(a.isrPagar), b.isrPagar === null ? 'N/D' : money(b.isrPagar), a.isrPagar === null ? '—' : dif(a.isrPagar, b.isrPagar)],
    ['Total estimado a pagar', money(a.total), money(b.total), dif(a.total, b.total)],
  ];
  const body = $('#sBody'); body.replaceChildren(...rows.map(([t, x, y, d], i) => {
    const tr = document.createElement('tr'); if (i === 2) tr.className = 'strong';
    [t, x, y, d].forEach((v, k) => { const td = document.createElement('td'); td.textContent = v; if (k === 3) td.className = v.startsWith('−') ? 'down' : v.startsWith('+') ? 'up' : ''; tr.append(td); });
    return tr;
  }));
  const hay = sim.ing > 0 || sim.gas > 0;
  let msg = 'Escribe el subtotal de una factura que emitirías o de un gasto que recibirías para ver el efecto.';
  if (hay) {
    msg = b.ivaNeto >= 0 ? `Con esta simulación tendrías IVA por pagar de ${money(b.ivaNeto)}.` : `Con esta simulación tendrías IVA a favor de ${money(-b.ivaNeto)}.`;
    const d = r2(b.total - a.total); msg += d < 0 ? ` Tu pago estimado bajaría ${money(-d)}.` : d > 0 ? ` Tu pago estimado subiría ${money(d)}.` : ' Tu pago estimado no cambiaría.';
  }
  $('#sMsg').textContent = msg; $('#sMsg').className = 'simmsg' + (hay ? (b.ivaNeto < 0 ? ' fav' : ' pay') : '');
}
['#sIng', '#sIvaIng', '#sGas', '#sIvaGas'].forEach(id => $(id).addEventListener('input', renderSim));
$('#sClear').onclick = () => { ['#sIng', '#sGas'].forEach(id => { $(id).value = ''; }); renderSim(); };

function renderTips(r, key) {
  const tips = [], rec = acct.received || [], efec = rec.filter(x => x.metodo === 'efectivo' && x.total > 2000).length;
  if (!rec.length) tips.push(['Registra tus facturas recibidas', 'En la pestaña Recibidas captura las facturas de tus proveedores: el IVA que pagaste se acredita contra el IVA que cobras y tus gastos pueden bajar el ISR.']);
  else if (r.ivaRec > 0) tips.push(['Ya estás acreditando IVA', `Este periodo acreditas ${money(r.ivaRec)} de IVA por tus facturas recibidas. Entre más gastos del negocio facturados, menos IVA pagas.`]);
  if (efec) tips.push(['Evita el efectivo en gastos grandes', `Tienes ${efec} ${efec === 1 ? 'factura pagada' : 'facturas pagadas'} en efectivo por más de $2,000: no ${efec === 1 ? 'es deducible ni acreditable' : 'son deducibles ni acreditables'}. Paga con transferencia, tarjeta o cheque.`]);
  if (r.ivaFavor || r.ivaNeto < 0) tips.push(['Tienes IVA a favor', 'No lo pierdes: puedes acreditarlo contra tus siguientes pagos de IVA o pedir su devolución ante el SAT.']);
  if (key === '626') tips.push(['RESICO: el IVA sí se acredita', 'En RESICO de personas físicas los gastos no reducen el ISR (se calcula sobre ingresos cobrados), pero el IVA acreditable de tus gastos sí baja el IVA que pagas.']);
  else if (['612', '606', '601', '626m'].includes(key)) tips.push(['Pide factura de todo gasto del negocio', 'Solicita el CFDI a tus proveedores con tu RFC y el uso correcto (por ejemplo, G03 gastos en general). Un gasto sin factura no se puede deducir ni acreditar.']);
  if (key === '606') tips.push(['Compara tus deducciones', 'En arrendamiento puedes deducir tus gastos reales o usar la deducción opcional del 35%. Marca la opción en este panel y compara cuál te conviene.']);
  if (['612', '606', '601', '626m'].includes(key)) tips.push(['Captura tus pagos previos y retenciones', 'Los pagos provisionales anteriores y el ISR que te retuvieron se restan del periodo. Regístralos para no pagar de más.']);
  tips.push(['Haz pruebas antes de facturar', 'Usa el simulador de arriba para ver cómo cambia tu IVA y tu ISR con una factura emitida o un gasto más.']);
  const ul = $('#tipList'); ul.replaceChildren(...tips.map(([t, d]) => { const li = document.createElement('li'); const b = document.createElement('b'); b.textContent = t; const sp = document.createElement('span'); sp.textContent = d; li.append(b, sp); return li; }));
}

// ---------- Inicio ----------
setView(location.hash === '#panel' ? 'panel' : 'home', { scroll: false });
(() => {
  const s = getSession(), u = s && loadDb()[s];
  if (u) { localEmail = s; acct = u; openDash(); } else { $('#authView').hidden = false; $('#dashView').hidden = true; }
})();
