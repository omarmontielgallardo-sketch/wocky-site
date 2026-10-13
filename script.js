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
