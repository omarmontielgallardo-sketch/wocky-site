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
  const links = $$('#menu a[href^="#"]:not(.btn)');
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
const PLANS = { emp: { name: 'Emprendedor', limit: 40 }, neg: { name: 'Negocio', limit: 150 }, des: { name: 'Despacho', limit: 600 } };
let mem = {}, memSession = null, acct = null, localEmail = null;
const loadDb = () => { try { return JSON.parse(localStorage.getItem('timbro_db') || '{}'); } catch { return mem; } };
const saveDb = db => { mem = db; try { localStorage.setItem('timbro_db', JSON.stringify(db)); } catch {} };
const getSession = () => { try { return localStorage.getItem('timbro_session'); } catch { return memSession; } };
const setSession = e => { memSession = e; try { e ? localStorage.setItem('timbro_session', e) : localStorage.removeItem('timbro_session'); } catch {} };

// ---------- Utilidades ----------
const money = n => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0);
const rfcOk = v => /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(v);
const monthKey = (d = new Date()) => new Date(d).toISOString().slice(0, 7);
const say = (el, text, err) => { el.hidden = false; el.textContent = text; el.classList.toggle('err', !!err); el.style.animation = 'none'; el.offsetWidth; el.style.animation = ''; };
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function hashPass(pass, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(salt), iterations: 150000, hash: 'SHA-256' }, key, 256));
}
const persist = () => { if (!acct) return; const db = loadDb(); db[localEmail] = acct; saveDb(db); };
const update = fn => { fn(acct); persist(); renderDash(); };
const swap = (hide, show) => { hide.hidden = true; show.hidden = false; show.classList.remove('view-in'); show.offsetWidth; show.classList.add('view-in'); };

// Validación de RFC en vivo
$$('#rRfc,#iRfc').forEach(i => i.addEventListener('input', () => {
  i.value = i.value.toUpperCase();
  i.classList.toggle('ok', rfcOk(i.value)); i.classList.remove('bad');
}));
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

function showAuth() { swap($('#dashView'), $('#authView')); $('#navAcct').textContent = 'Entrar'; }

$('#fReg').onsubmit = async e => {
  e.preventDefault();
  const rfc = $('#rRfc'); rfc.value = rfc.value.trim().toUpperCase();
  const msg = $('#rMsg'), mail = $('#rEmail').value.trim().toLowerCase();
  rfc.classList.toggle('bad', !rfcOk(rfc.value));
  if (!rfcOk(rfc.value)) return say(msg, 'El RFC no tiene un formato válido (12 o 13 caracteres).', true);
  if (!$('#rAcc').checked) return say(msg, 'Para crear tu cuenta debes aceptar el Aviso de privacidad y los Términos y condiciones.', true);
  if (!e.target.checkValidity()) return say(msg, 'Completa todos los campos. La contraseña lleva mínimo 8 caracteres.', true);
  if (!crypto.subtle) return say(msg, 'Tu navegador no permite crear la cuenta en este contexto.', true);
  const db = loadDb();
  if (db[mail]) return say(msg, 'Ya existe una cuenta con ese correo. Inicia sesión.', true);
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  const a = { role: 'admin', email: mail, razon: $('#rRazon').value.trim(), rfc: rfc.value, regimen: $('#rReg').value, salt, hash: await hashPass($('#rPass').value, salt),
    plan: 'emp', month: monthKey(), used: 0, seq: 0, invoices: [], clients: [], items: [], aceptoEn: Date.now() };
  db[mail] = a; saveDb(db); setSession(mail); localEmail = mail; acct = a;
  e.target.reset(); $$('#fReg input').forEach(i => i.classList.remove('ok')); msg.hidden = true; openDash(); toast('Cuenta creada. ¡Bienvenido a Timbro!');
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
let lines = [], filter = 'todas', query = '';
function openDash() {
  if (!acct) return;
  acct.clients = acct.clients || []; acct.items = acct.items || [];
  if (acct.month !== monthKey()) { acct.month = monthKey(); acct.used = 0; persist(); }
  swap($('#authView'), $('#dashView')); $('#navAcct').textContent = 'Mi cuenta';
  if (!lines.length) addLine();
  renderDash();
}

const CIRC = 326.7;
function renderDash() {
  const u = acct; if (!u) return;
  const limit = PLANS[u.plan].limit, left = Math.max(limit - u.used, 0);
  $('#dCompany').textContent = u.razon;
  $('#dRfc').textContent = 'RFC ' + u.rfc; $('#dMail').textContent = u.email || localEmail;
  $('#dPlan').value = u.plan;
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
    if (inv.estatus === 'borrador') { btn('Timbrar', () => stamp(inv.id)); btn('Eliminar', () => { update(x => { x.invoices = x.invoices.filter(i => i.id !== inv.id); }); toast('Borrador eliminado.'); }); }
    if (inv.estatus === 'timbrada') btn('Cancelar', () => { update(x => { x.invoices.find(i => i.id === inv.id).estatus = 'cancelada'; }); toast('Factura cancelada.'); });
    btn('Duplicar', () => duplicate(inv));
    const last = document.createElement('td'); last.append(act); tr.append(last);
    body.append(tr);
  });
  $('#hEmpty').hidden = list.length > 0;
  $('#hEmpty p').innerHTML = u.invoices.length ? '<b>Sin resultados</b><br>Prueba con otro filtro o búsqueda.' : '<b>Aún no hay facturas</b><br>Crea la primera con el formulario de arriba.';
}
$$('#chips button').forEach(b => b.onclick = () => { filter = b.dataset.f; renderDash(); });
$('#hSearch').oninput = e => { query = e.target.value; renderDash(); };
$('#dPlan').onchange = e => { update(u => { u.plan = e.target.value; }); toast('Plan cambiado a ' + PLANS[e.target.value].name + '.'); };

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
      if (key === 'd') inp.onchange = () => { const it = acct.items.find(x => x.d === inp.value); if (it && !l.p) { l.p = it.p; drawLines(); } };
      if (key === 'p') inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); if (i === lines.length - 1) addLine(true); } };
      return inp;
    };
    const x = document.createElement('button'); x.type = 'button'; x.className = 'x'; x.textContent = '×'; x.setAttribute('aria-label', 'Quitar concepto');
    x.onclick = () => { if (lines.length > 1) { lines.splice(i, 1); drawLines(); } };
    row.append(mk('Concepto', 'text', l.d, 'd', 'Concepto'), mk('Cant.', 'number', l.q, 'q', 'Cantidad'), mk('Precio', 'number', l.p || '', 'p', 'Precio unitario'), x);
    box.append(row);
  });
  if (focusLast) { const r = $$('.line', box).pop(); r && r.firstChild.focus(); focusLast = false; }
  totals();
}
const calc = () => { const sub = lines.reduce((s, l) => s + l.q * l.p, 0); return { sub, tot: sub * 1.16 }; };
function totals() { const t = calc(); $('#tSub').textContent = money(t.sub); $('#tIva').textContent = money(t.sub * 0.16); $('#tTot').textContent = money(t.tot); }
$('#bAdd').onclick = () => addLine(true);

// Autocompletar cliente
$('#iName').addEventListener('change', () => { const c = acct && acct.clients.find(x => x.name.toLowerCase() === $('#iName').value.trim().toLowerCase()); if (c) { $('#iRfc').value = c.rfc; $('#iRfc').classList.add('ok'); } });

function buildInvoice() {
  const msg = $('#iMsg'), rfc = $('#iRfc'); rfc.value = rfc.value.trim().toUpperCase();
  const name = $('#iName').value.trim(), valid = lines.filter(l => l.d.trim() && l.p > 0 && l.q > 0);
  rfc.classList.toggle('bad', !rfcOk(rfc.value));
  if (!name) { say(msg, 'Escribe el nombre del cliente.', true); $('#iName').focus(); return null; }
  if (!rfcOk(rfc.value)) { say(msg, 'El RFC del cliente no es válido.', true); rfc.focus(); return null; }
  if (!valid.length) { say(msg, 'Agrega al menos un concepto con cantidad y precio.', true); return null; }
  return { id: crypto.randomUUID(), cliente: name, rfc: rfc.value, uso: $('#iUso').value, metodo: $('#iMet').value, lineas: valid.map(l => ({ ...l })), total: calc().tot, fecha: Date.now(), estatus: 'borrador' };
}
function resetForm() { $('#fInv').reset(); $('#iRfc').classList.remove('ok', 'bad'); lines = []; addLine(); $('#iMsg').hidden = true; }
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
  say(msg, 'Factura timbrada (demostración). Se descontó 1 timbre.'); toast('Factura timbrada. Quedan ' + (limit - acct.used) + ' timbres.'); return true;
}
$('#bStamp').onclick = () => { const inv = buildInvoice(); if (inv && stamp(null, inv)) resetForm(); };
$('#bDraft').onclick = () => {
  const inv = buildInvoice(); if (!inv) return;
  update(u => { inv.folio = 'A-' + String(++u.seq).padStart(4, '0'); u.invoices.push(inv); remember(u, inv); });
  say($('#iMsg'), 'Borrador guardado. No consume timbres.'); toast('Borrador guardado.'); resetForm();
};
function duplicate(inv) {
  $('#iName').value = inv.cliente; $('#iRfc').value = inv.rfc; $('#iRfc').classList.add('ok');
  $('#iUso').value = inv.uso; $('#iMet').value = inv.metodo;
  lines = inv.lineas.map(l => ({ ...l })); drawLines();
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

// ---------- Inicio ----------
(() => {
  const s = getSession(), u = s && loadDb()[s];
  if (u) { localEmail = s; acct = u; openDash(); } else { $('#authView').hidden = false; $('#dashView').hidden = true; }
})();
