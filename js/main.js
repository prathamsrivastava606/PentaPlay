// PentaPlay: tiny helper for the mobile menu and the active nav link. No libraries.
(function () {
  const toggle = document.querySelector('.nav-toggle'), menu = document.getElementById('menu');
  const setOpen = open => { menu.classList.toggle('open', open); toggle.setAttribute('aria-expanded', String(open)); };
  toggle.addEventListener('click', () => setOpen(!menu.classList.contains('open')));
  menu.addEventListener('click', e => { if (e.target.tagName === 'A') setOpen(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  const links = {}; document.querySelectorAll('[data-link]').forEach(a => links[a.dataset.link] = a);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { Object.values(links).forEach(l => l.classList.remove('active')); (links[en.target.id] || {}).classList?.add('active'); } });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['home', 'games', 'about'].forEach(id => { const s = document.getElementById(id); if (s) io.observe(s); });
  }
})();
