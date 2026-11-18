const slides = [...document.querySelectorAll('.slide')];
const viewer = document.querySelector('.viewer');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
const counter = document.querySelector('#counter');
let current = 0;

function fitSlide() {
  const scale = Math.min(viewer.clientWidth / 1280, viewer.clientHeight / 720);
  document.documentElement.style.setProperty('--scale', scale);
}

function showSlide() {
  const index = slides.findIndex(slide => '#' + slide.id === location.hash);
  current = index < 0 ? 0 : index;
  slides.forEach((slide, i) => { slide.hidden = i !== current; });
  counter.textContent = (current + 1) + ' / ' + slides.length;
  previous.disabled = current === 0;
  next.disabled = current === slides.length - 1;
}

function go(index) {
  if (slides[index]) location.hash = slides[index].id;
}

previous.onclick = () => go(current - 1);
next.onclick = () => go(current + 1);
document.querySelector('#print').onclick = () => window.print();
window.addEventListener('hashchange', showSlide);
window.addEventListener('resize', fitSlide);
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const direction = { ArrowLeft: -1, PageUp: -1, ArrowRight: 1, PageDown: 1 }[event.key];
  if (direction) {
    event.preventDefault();
    go(current + direction);
  }
});
showSlide();
fitSlide();
