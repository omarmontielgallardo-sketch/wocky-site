const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

// Nav con fondo al hacer scroll
const nav = $('#nav');
addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 40), { passive: true });

// Menú móvil
const menu = $('#menu');
$('#burger').onclick = () => menu.classList.toggle('open');
$$('a', menu).forEach(a => a.onclick = () => menu.classList.remove('open'));

// Revelar al hacer scroll + contadores
const countUp = el => {
  const to = +el.dataset.count; let n = 0;
  const t = setInterval(() => { n += Math.ceil(to / 30); if (n >= to) { n = to; clearInterval(t); } el.textContent = n; }, 35);
};
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  $$('[data-count]', e.target).forEach(countUp);
  io.unobserve(e.target);
}), { threshold: 0.15 });
$$('.card,.plan,.meter,.table,details,.code,.stats-strip').forEach(el => { el.classList.add('reveal'); io.observe(el); });

// Terminal animada del hero
const lines = [
  ['dim', '$ timbro factura --cliente "Estudio Aurora"'],
  ['', 'Validando RFC EAU200101AB1 ........ <span class="ok">ok</span>'],
  ['', 'Régimen fiscal 601 ................. <span class="ok">ok</span>'],
  ['', 'Código postal 06600 ................ <span class="ok">ok</span>'],
  ['', 'Subtotal      $12,000.00'],
  ['', 'IVA 16%        $1,920.00'],
  ['hl', 'Total         $13,920.00'],
  ['', 'Timbrando ante el SAT ............. <span class="ok">ok</span>'],
  ['ok', '✓ Factura timbrada en 0.8 s'],
  ['dim', 'UUID 3f9a…c21e · PDF + XML enviados']
];
const term = $('#term');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const render = n => { term.innerHTML = lines.slice(0, n).map(([c, t]) => `<div class="${c}">${t}</div>`).join('') + '<span class="caret"></span>'; };
if (reduce) render(lines.length);
else {
  let i = 0;
  const step = () => { render(++i); if (i < lines.length) setTimeout(step, 520); else setTimeout(() => { i = 0; step(); }, 5000); };
  render(0); setTimeout(step, 500);
}

// Precio mensual / anual
$$('.billing button').forEach(b => b.onclick = () => {
  $$('.billing button').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  $$('[data-m]').forEach(s => s.textContent = '$' + s.dataset[b.dataset.per]);
});

// Medidor de membresía (demostración)
(() => {
  const m = $('#meter');
  let used = +m.dataset.used, limit = +m.dataset.limit;
  const bar = $('#mBar'), msg = $('#mMsg');
  const draw = () => {
    $('#mUsed').textContent = used;
    $('#mOf').textContent = limit;
    $('#mLeft').textContent = Math.max(limit - used, 0);
    const pct = Math.min(used / limit * 100, 100);
    bar.style.width = pct + '%';
    bar.parentElement.classList.toggle('warn', pct >= 80);
  };
  $$('.seg button', m).forEach(b => b.onclick = () => {
    $$('.seg button', m).forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    limit = +b.dataset.limit; used = Math.min(used, limit);
    $('#mPlan').textContent = b.dataset.name;
    msg.textContent = 'Plan ' + b.dataset.name + ' seleccionado.';
    draw();
  });
  $('#mGen').onclick = () => msg.textContent = 'Borrador generado. No consume tu cuota.';
  $('#mStamp').onclick = () => {
    if (used >= limit) { msg.textContent = 'Llegaste a tu límite. Compra timbres extra ($3 c/u) o mejora tu plan.'; return; }
    used++; msg.textContent = 'Factura timbrada. Se descontó 1 timbre.'; draw();
  };
  draw();
})();

// Lista de espera (demostración: aún no envía datos a ningún servidor)
$('#form').onsubmit = e => {
  e.preventDefault();
  $('#ok').hidden = false;
  e.target.reset();
};
