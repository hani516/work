(() => {
  const header = document.querySelector("body > .site-header, body > .project-page-header");
  if (!header) return;

  let pending = false;
  const update = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 24);
    pending = false;
  };
  const scheduleUpdate = () => {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("pageshow", update);
})();
