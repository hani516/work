const reduceCaseMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const caseRevealTargets = document.querySelectorAll("main > section, .case-footer");
const caseNavLinks = [...document.querySelectorAll('.case-nav a[href^="#"]')];
const caseNavSections = caseNavLinks
  .map((link) => ({ link, section: document.querySelector(link.getAttribute("href")) }))
  .filter(({ section }) => section);

caseRevealTargets.forEach((target) => target.classList.add("scroll-reveal"));

if (reduceCaseMotion) {
  caseRevealTargets.forEach((target) => target.classList.add("is-visible"));
} else {
  const caseRevealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      caseRevealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });

  caseRevealTargets.forEach((target) => caseRevealObserver.observe(target));
}

function updateCaseNavigation() {
  if (!caseNavSections.length) return;
  const headerHeight = document.querySelector(".project-page-header")?.offsetHeight || 66;
  const marker = window.scrollY + headerHeight + window.innerHeight * 0.22;
  let current = caseNavSections[0];
  caseNavSections.forEach((item) => {
    if (item.section.offsetTop <= marker) current = item;
  });
  caseNavSections.forEach(({ link }) => {
    const active = link === current.link;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}

window.addEventListener("scroll", updateCaseNavigation, { passive: true });
updateCaseNavigation();
