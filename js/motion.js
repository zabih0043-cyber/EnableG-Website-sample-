(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("in"));
    return;
  }

  // Hero stagger: add .in with small delays
  const hero = document.querySelector("[data-hero]");
  if (hero) {
    const items = hero.querySelectorAll("[data-stagger]");
    items.forEach((el, i) => {
      el.style.transitionDelay = `${i * 90}ms`;
      requestAnimationFrame(() => el.classList.add("in"));
    });
  }

  // Section reveal on scroll
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll(".reveal").forEach(el => {
    if (el.classList.contains("in")) return;
    obs.observe(el);
  });
})();