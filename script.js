const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

// Título letra por letra
$$('.split').forEach(el => {
  el.innerHTML = [...el.dataset.text].map((ch, i) =>
    `<span class="ch" style="animation-delay:${0.2 + i * 0.09}s">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
});

// Barra de progreso y nav
const nav = $('#nav'), bar = $('#progress');
addEventListener('scroll', () => {
  const h = document.documentElement;
  bar.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100 + '%';
  nav.classList.toggle('solid', scrollY > 60);
}, { passive: true });

// Menú móvil
const menu = $('#menu');
$('#burger').onclick = () => menu.classList.toggle('open');
$$('a', menu).forEach(a => a.onclick = () => menu.classList.remove('open'));

// Revelar al hacer scroll + contadores
const countUp = el => {
  const to = +el.dataset.count; let n = 0;
  const t = setInterval(() => { n += Math.ceil(to / 40); if (n >= to) { n = to; clearInterval(t); } el.textContent = n; }, 35);
};
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  e.target.classList.add('in');
  $$('[data-count]', e.target).forEach(countUp);
  io.unobserve(e.target);
}), { threshold: 0.15 });
$$('.reveal').forEach(el => io.observe(el));

// Pestañas del menú
$$('.tab').forEach(t => t.onclick = () => {
  $$('.tab').forEach(x => x.classList.remove('active'));
  $$('.panel').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  const p = $('#' + t.dataset.tab);
  p.classList.add('active');
});

// Parallax suave en el hero
const orbs = $$('.orb');
addEventListener('mousemove', e => {
  const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
  orbs.forEach((o, i) => o.style.translate = `${x * 60 * (i + 1)}px ${y * 60 * (i + 1)}px`);
});

// Formulario (demostración: no envía datos)
$('#form').onsubmit = e => { e.preventDefault(); $('#ok').hidden = false; e.target.reset(); };
