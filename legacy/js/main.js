/* ============================================
   Homeland Tours — Main JS
   ============================================ */

// Header shadow on scroll
(function() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.style.boxShadow = y > 8 ? '0 4px 18px rgba(14, 31, 18, 0.08)' : 'none';
    lastY = y;
  }, { passive: true });
})();

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    const el = document.querySelector(id);
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// Auto-rotate hero search placeholder suggestions
(function() {
  const input = document.querySelector('.search__field-text input');
  if (!input) return;
  const opts = [
    '¿A dónde quieres ir?',
    'Salar de Uyuni',
    'La Paz',
    'Valle de la Luna',
    'Amazonía',
    'Titicaca',
    'Potosí',
  ];
  let i = 0;
  setInterval(() => {
    if (document.activeElement === input) return;
    if (input.value) return;
    i = (i + 1) % opts.length;
    input.placeholder = opts[i];
  }, 3500);
})();

// Reveal on scroll (gentle: elements stay visible if observer doesn't fire)
(function() {
  if (!('IntersectionObserver' in window)) return;
  const items = document.querySelectorAll('.card, .why-card, .cat-card, .review-card, .diff-card, .form-card, .booking-card, .summary-card, .voucher');
  if (!items.length) return;
  // Only apply animation to elements currently in the viewport
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-revealed');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
  items.forEach(el => {
    el.classList.add('reveal-on-scroll');
    obs.observe(el);
  });
})();

// Console greeting
console.log('%c🇧🇴 Homeland Tours', 'font-family: serif; font-size: 24px; color: #1d3a25; font-weight: 600;');
console.log('%cMaqueta desarrollada para revisión de diseño.', 'color: #6a7670; font-size: 12px;');
