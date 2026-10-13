const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

// Nav con fondo al hacer scroll
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 40), { passive: true });

// Menú móvil
const menu = $('#menu');
$('#burger').onclick = () => menu.classList.toggle('open');
$$('a', menu).forEach(a => a.onclick = () => menu.classList.remove('open'));

// Revelar al hacer scroll
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  io.unobserve(e.target);
}), { threshold: 0.15 });
$$('.reveal').forEach(el => io.observe(el));

// Lista de espera (demostración: aún no envía datos a ningún servidor)
$('#form').onsubmit = e => {
  e.preventDefault();
  $('#ok').hidden = false;
  e.target.reset();
};

// Medidor de membresía (demostración)
(() => {
  const m = $('#meter');
  let used = +m.dataset.used, limit = +m.dataset.limit;
  const bar = $('#mBar'), msg = $('#mMsg');
  const draw = () => {
    const unlimited = limit === 0;
    $('#mUsed').textContent = used;
    $('#mOf').textContent = unlimited ? '' : ' de ' + limit;
    $('#mLeft').textContent = unlimited ? '∞' : Math.max(limit - used, 0);
    $('#mLeftTxt').textContent = unlimited ? 'timbrado ilimitado' : 'facturas por timbrar este mes';
    const pct = unlimited ? 8 : Math.min(used / limit * 100, 100);
    bar.style.width = pct + '%';
    bar.parentElement.classList.toggle('warn', !unlimited && pct >= 80);
  };
  $$('.seg button', m).forEach(b => b.onclick = () => {
    $$('.seg button', m).forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    limit = +b.dataset.limit; used = Math.min(used, limit || used);
    $('#mPlan').textContent = b.dataset.name;
    msg.textContent = 'Plan ' + b.dataset.name + ' seleccionado.';
    draw();
  });
  $('#mGen').onclick = () => msg.textContent = 'Borrador generado. No consume tu cuota.';
  $('#mStamp').onclick = () => {
    if (limit && used >= limit) { msg.textContent = 'Llegaste a tu límite. Mejora tu plan o paga una factura extra.'; return; }
    used++; msg.textContent = 'Factura timbrada. Se descontó 1 de tu cuota.'; draw();
  };
  new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { draw(); o.disconnect(); } })).observe(m);
  draw();
})();

// Acceso: pestañas y validación (demostración: no envía ni guarda datos)
(() => {
  const fL = $('#fLogin'), fR = $('#fReg');
  const show = tab => {
    const reg = tab === 'registro';
    fL.hidden = reg; fR.hidden = !reg;
    $('#tabLogin').classList.toggle('on', !reg);
    $('#tabReg').classList.toggle('on', reg);
  };
  $$('[data-tab]').forEach(b => b.addEventListener('click', () => show(b.dataset.tab)));
  const say = (el, text, err) => { el.hidden = false; el.textContent = text; el.classList.toggle('err', !!err); };
  const rfcOk = v => /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(v);
  fL.onsubmit = e => {
    e.preventDefault();
    if (!fL.checkValidity()) return say($('#lMsg'), 'Escribe tu correo y contraseña.', true);
    say($('#lMsg'), 'Demostración: el inicio de sesión estará disponible al lanzamiento.');
    fL.reset();
  };
  fR.onsubmit = e => {
    e.preventDefault();
    const rfc = $('#rRfc'); rfc.value = rfc.value.trim().toUpperCase();
    rfc.classList.toggle('bad', !rfcOk(rfc.value));
    if (!rfcOk(rfc.value)) return say($('#rMsg'), 'El RFC no tiene un formato válido (12 o 13 caracteres).', true);
    if (!fR.checkValidity()) return say($('#rMsg'), 'Completa todos los campos. La contraseña lleva mínimo 8 caracteres.', true);
    say($('#rMsg'), 'Demostración: tu empresa se registrará cuando abramos el acceso anticipado.');
    fR.reset();
  };
})();
