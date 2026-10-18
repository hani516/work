document.querySelectorAll('[data-scroll-compare]').forEach((comparison) => {
  const viewports = [...comparison.querySelectorAll('[data-compare-viewport]')];
  const sync = comparison.querySelector('[data-compare-sync]');
  const zoom = comparison.querySelector('[data-compare-zoom]');
  let activeViewport;
  let frame;

  function synchronize(source) {
    if (!sync.checked) return;
    const yRange = source.scrollHeight - source.clientHeight;
    const xRange = source.scrollWidth - source.clientWidth;
    const y = yRange > 0 ? source.scrollTop / yRange : 0;
    const x = xRange > 0 ? source.scrollLeft / xRange : 0;
    viewports.forEach((target) => {
      if (target === source) return;
      const top = y * (target.scrollHeight - target.clientHeight);
      const left = x * (target.scrollWidth - target.clientWidth);
      if (Math.abs(target.scrollTop - top) > 1) target.scrollTop = top;
      if (Math.abs(target.scrollLeft - left) > 1) target.scrollLeft = left;
    });
  }

  viewports.forEach((viewport) => {
    ['pointerenter', 'pointerdown', 'touchstart', 'keydown', 'wheel'].forEach((event) => {
      viewport.addEventListener(event, () => { activeViewport = viewport; }, { passive: true });
    });
    viewport.addEventListener('scroll', () => {
      if (activeViewport !== viewport) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => synchronize(viewport));
    }, { passive: true });
    viewport.querySelector('img').addEventListener('load', () => {
      if (activeViewport) synchronize(activeViewport);
    });
  });

  sync.addEventListener('change', () => synchronize(activeViewport || viewports[0]));
  zoom.addEventListener('change', () => {
    const source = activeViewport || viewports[0];
    const range = source.scrollHeight - source.clientHeight;
    const progress = range > 0 ? source.scrollTop / range : 0;
    comparison.style.setProperty('--compare-image-width', `${Number(zoom.value) * 100}%`);
    viewports.forEach((viewport) => {
      viewport.scrollTop = progress * (viewport.scrollHeight - viewport.clientHeight);
    });
  });
});
