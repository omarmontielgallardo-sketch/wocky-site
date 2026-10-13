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
