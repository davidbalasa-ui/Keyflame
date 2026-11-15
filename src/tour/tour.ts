// The swipe-through tour at /tour/. Swiping is native scroll snapping; this file adds the
// dots, the back/next buttons, arrow keys, and sizes each picture to fit its space.
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import './tour.css';

const tour = document.getElementById('tour') as HTMLElement;
const panels = [...tour.querySelectorAll<HTMLElement>('.panel')];
const dots = [...document.querySelectorAll<HTMLButtonElement>('.dot')];
const prev = document.querySelector('.nav-btn.prev') as HTMLButtonElement;
const next = document.querySelector('.nav-btn.next') as HTMLButtonElement;

let current = -1;

function goTo(i: number): void {
  const n = Math.max(0, Math.min(panels.length - 1, i));
  tour.scrollTo({ left: n * tour.clientWidth });
}

function show(i: number): void {
  if (i === current) return;
  current = i;
  dots.forEach((d, n) => d.setAttribute('aria-current', String(n === i)));
  panels.forEach((p, n) => p.setAttribute('aria-hidden', String(n !== i)));
  panels[i].classList.add('seen');
  prev.disabled = i === 0;
  next.disabled = i === panels.length - 1;
  next.classList.remove('nudge');
}

tour.addEventListener('scroll', () => show(Math.round(tour.scrollLeft / Math.max(1, tour.clientWidth))), { passive: true });
dots.forEach((d, n) => d.addEventListener('click', () => goTo(n)));
prev.addEventListener('click', () => goTo(current - 1));
next.addEventListener('click', () => goTo(current + 1));
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') goTo(current + 1);
  else if (e.key === 'ArrowLeft') goTo(current - 1);
});

// Each picture is as large as fits its stage, keeping its shape, so nothing is cropped.
function fit(): void {
  for (const shot of document.querySelectorAll<HTMLElement>('.shot')) {
    const stage = shot.parentElement as HTMLElement;
    const img = shot.querySelector('img') as HTMLImageElement;
    const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : Number(img.getAttribute('width')) / Number(img.getAttribute('height'));
    const w = Math.min(stage.clientWidth, stage.clientHeight * ratio, 1100);
    shot.style.width = `${Math.floor(w)}px`;
  }
}
new ResizeObserver(() => {
  fit();
  if (current >= 0) tour.scrollTo({ left: current * tour.clientWidth, behavior: 'instant' as ScrollBehavior });
}).observe(tour);

document.querySelectorAll('.shot img').forEach((img) => img.addEventListener('load', fit));
fit();
show(0);
next.classList.add('nudge');
