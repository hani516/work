/* Native document scrolling only. Sticky scenes and reveals are optional layers. */
(() => {
  'use strict';
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const storyViewport = matchMedia('(min-width: 981px) and (min-height: 650px)');
  const story = document.querySelector('[data-scroll-story]');
  const steps = story ? [...story.querySelectorAll('[data-story-step]')] : [];
  const frames = story ? [...story.querySelectorAll('[data-story-frame]')] : [];
  let revealObserver;
  let frameRequested = false;
  let storyEnabled = false;
  let activeStep = -1;

  function setActive(index) {
    if (index === activeStep) return;
    activeStep = index;
    steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
    frames.forEach((frame, i) => {
      frame.classList.toggle('is-active', i === index);
      // All the source screenshots remain accessible in normal document order.
      if (storyEnabled) frame.setAttribute('aria-hidden', String(i !== index));
      else frame.removeAttribute('aria-hidden');
    });
  }

  function updateStory() {
    frameRequested = false;
    if (!storyEnabled) return;
    const center = window.innerHeight * .52;
    let index = 0;
    steps.forEach((step, i) => {
      if (step.getBoundingClientRect().top < center) index = i;
    });
    setActive(index);
  }

  function requestStoryUpdate() {
    if (!storyEnabled || frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(updateStory);
  }

  function configureStory() {
    if (!story) return;
    storyEnabled = !reducedMotion.matches && storyViewport.matches;
    story.classList.toggle('lt-story-enhanced', storyEnabled);
    activeStep = -1;
    if (storyEnabled) {
      // The next screenshot must be ready before its scroll transition begins.
      frames.forEach(frame => frame.querySelectorAll('img').forEach(img => { img.loading = 'eager'; }));
      updateStory();
    } else {
      frames.forEach(frame => {
        frame.classList.remove('is-active');
        frame.removeAttribute('aria-hidden');
      });
      steps.forEach(step => step.classList.remove('is-active'));
    }
  }

  function configureReveals() {
    revealObserver?.disconnect();
    const targets = document.querySelectorAll('[data-lt-reveal]');
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      document.body.classList.remove('lt-motion-ready');
      targets.forEach(element => element.classList.add('is-visible'));
      return;
    }
    document.body.classList.add('lt-motion-ready');
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .07, rootMargin: '0px 0px -24px 0px' });
    targets.forEach(element => revealObserver.observe(element));
  }

  // Reveal copy and artwork independently, without animating entire long sections.
  document.querySelectorAll('.ln-heading, .ln-stage-copy, .ln-intro, .ln-priority > h3, .ln-footer-stage > h3, .lt-position-decision, .lt-search-decision > h3, .lt-experiment-result > h3').forEach(element => { element.dataset.ltReveal = 'copy'; });
  document.querySelectorAll('.ln-category-pair > figure, .ln-banner-pair > figure, .ln-footer-part, .ln-nav-comparison > figure, .ln-home-pair > figure, .ln-fomo-visual, .lt-case-entry').forEach(element => { element.dataset.ltReveal = 'image'; });
  document.querySelectorAll('.ln-metric, .lt-position-fact, .ln-decisions > li, .ln-experiment-flow > li').forEach(element => { element.dataset.ltReveal = 'copy'; });
  document.querySelectorAll('.ln-chapters, .ln-metrics, .ln-footer-evidence, .lt-position-facts, .ln-decisions, .ln-experiment-flow, .ln-home-pair, .ln-nav-comparison').forEach(group => {
    [...group.children].forEach((element, index) => { element.style.setProperty('--lt-delay', `${Math.min(index, 3) * 90}ms`); });
  });

  configureStory();
  configureReveals();
  addEventListener('scroll', requestStoryUpdate, { passive: true });
  addEventListener('resize', requestStoryUpdate, { passive: true });
  addEventListener('pageshow', requestStoryUpdate);
  reducedMotion.addEventListener('change', () => { configureStory(); configureReveals(); });
  storyViewport.addEventListener('change', configureStory);

  const sectionLinks = [...document.querySelectorAll('.case-nav a')];
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        sectionLinks.forEach(link => {
          if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
    document.querySelectorAll('.ln-hero, .ln-section').forEach(section => sectionObserver.observe(section));
  }
})();
