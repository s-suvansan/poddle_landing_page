// ===== DOM Elements =====
const slideOne           = document.getElementById('slideOne');
const navActions         = document.getElementById('navActions');
const heroImageWrapper   = document.getElementById('heroImageWrapper');
const heroImageContainer = document.getElementById('heroImageContainer');

// ===== Split hero text into character spans =====
const cascadeLines = [];

document.querySelectorAll('.cascade-text').forEach((el) => {
  const text = el.textContent;
  el.textContent = '';
  const chars = [];
  const words = text.split(' ');

  words.forEach((word, wIdx) => {
    const wordWrap = document.createElement('span');
    wordWrap.className = 'cascade-word';

    for (let i = 0; i < word.length; i++) {
      const span = document.createElement('span');
      span.className = 'cascade-char';
      span.textContent = word[i];
      wordWrap.appendChild(span);
      chars.push(span);
    }

    el.appendChild(wordWrap);

    if (wIdx < words.length - 1) {
      const space = document.createElement('span');
      space.className = 'cascade-char is-space';
      space.innerHTML = '&nbsp;';
      el.appendChild(space);
      chars.push(space);
    }
  });

  cascadeLines.push({ el, chars });
});

// Button mask
const maskWrap  = document.querySelector('.mask-wrap');
const maskInner = maskWrap ? maskWrap.querySelector('.mask-inner') : null;

// ===== Slide State Machine =====
// 0 = hero, 1 = expand + cascade
let slideIndex     = 0;
const TOTAL_SLIDES = 2;
let isAnimating    = false;
let scrollCooldown = false;

function goToSlide(next) {
  next = Math.max(0, Math.min(TOTAL_SLIDES - 1, next));
  if (next === slideIndex) return;
  const prev = slideIndex;
  slideIndex = next;
  applyState(slideIndex, prev);
}

function applyState(index, prev) {
  // --- Hero / image expansion ---
  if (index >= 1) {
    slideOne.classList.add('collapsed');
    heroImageWrapper.classList.add('expanded');
    heroImageContainer.classList.add('expanded');
    navActions.classList.add('visible');
    if (maskInner) maskInner.classList.add('mask-hidden');
    if (prev === 0) triggerCascadeOut();
    if (heroSlider.pause) heroSlider.pause();
  } else {
    slideOne.classList.remove('collapsed');
    heroImageWrapper.classList.remove('expanded');
    heroImageContainer.classList.remove('expanded');
    navActions.classList.remove('visible');
    if (maskInner) maskInner.classList.remove('mask-hidden');
    resetCascade();
    if (heroSlider.resume) heroSlider.resume();
  }
}

function triggerCascadeOut() {
  isAnimating = true;
  let maxDelay = 0;

  cascadeLines.forEach(({ chars }) => {
    chars.forEach((char, i) => {
      const delay = i * 0.015;
      char.style.animationDelay = `${delay}s`;
      char.classList.add('animate-out');
      if (delay > maxDelay) maxDelay = delay;
    });
  });

  // Release animation lock after cascade completes
  setTimeout(() => { isAnimating = false; }, (maxDelay + 0.45) * 1000);
}

function resetCascade() {
  cascadeLines.forEach(({ chars }) => {
    chars.forEach(char => {
      char.classList.remove('animate-out');
      char.style.animationDelay = '';
    });
  });
}

// ===== Wheel input =====
// macOS trackpad sends momentum (inertia) events for 500–1500ms after the
// finger lifts. Those events only decelerate. A real new gesture accelerates.
// Strategy: fire only when deltaY is LARGER than the previous event (accelerating)
// OR when there has been a long gap (>300ms) since the last event.
let prevWheelAbs  = 0;
let prevWheelTime = 0;

window.addEventListener('wheel', (e) => {
  e.preventDefault();

  const abs = Math.abs(e.deltaY);
  const now = Date.now();
  const gap = now - prevWheelTime;

  if (abs < 2) return; // ignore sub-pixel noise

  const isAccelerating = abs > prevWheelAbs; // true on a real new gesture
  const isAfterPause   = gap > 300;          // true after finger fully lifted

  // Always update so momentum decay is tracked during and after cooldown
  prevWheelAbs  = abs;
  prevWheelTime = now;

  if (scrollCooldown) return;
  if (!isAccelerating && !isAfterPause) return; // momentum — ignore

  const dir  = e.deltaY > 0 ? 1 : -1;
  const next = Math.max(0, Math.min(TOTAL_SLIDES - 1, slideIndex + dir));

  scrollCooldown = true;
  goToSlide(next);
  setTimeout(() => { scrollCooldown = false; }, 1000);
}, { passive: false });

// ===== Touch input =====
let touchStartY = 0;

window.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (scrollCooldown) return;
  const diff = touchStartY - e.changedTouches[0].clientY;
  if (Math.abs(diff) < 40) return;
  scrollCooldown = true;
  goToSlide(slideIndex + (diff > 0 ? 1 : -1));
  setTimeout(() => { scrollCooldown = false; }, 950);
}, { passive: true });

// ===== Hero Image Slider =====
const heroSlider = (function () {
  const slides  = document.querySelectorAll('.hero-slide');
  const btnPrev = document.getElementById('sliderPrev');
  const btnNext = document.getElementById('sliderNext');
  if (!slides.length) return {};

  let current   = 0;
  let animating = false;
  let autoTimer = null;

  function goTo(nextIdx, dir = 'next') {
    if (animating || nextIdx === current) return;
    animating = true;

    const incoming = slides[nextIdx];

    if (dir === 'prev') {
      // Position incoming off-screen to the left instantly
      incoming.style.transition = 'none';
      incoming.style.transform  = 'translateX(-100%)';
      incoming.offsetHeight; // reflow
      incoming.style.transition = '';
      incoming.style.transform  = '';

      slides[current].classList.add('exit-right');
    } else {
      slides[current].classList.add('exit');
    }

    slides[current].classList.remove('active');
    incoming.classList.add('active');
    current = nextIdx;

    setTimeout(() => {
      slides.forEach(s => {
        if (s.classList.contains('exit')) {
          s.style.transition = 'none';
          s.classList.remove('exit');
          s.offsetHeight;
          s.style.transition = '';
        }
        s.classList.remove('exit-right'); // already at translateX(100%) — no snap needed
      });
      animating = false;
    }, 700);
  }

  function next() { goTo((current + 1) % slides.length, 'next'); }
  function prev() { goTo((current - 1 + slides.length) % slides.length, 'prev'); }

  function pause()  { clearInterval(autoTimer); autoTimer = null; }
  function resume() { if (!autoTimer) autoTimer = setInterval(next, 3500); }

  btnNext.addEventListener('click', () => { next(); pause(); resume(); });
  btnPrev.addEventListener('click', () => { prev(); pause(); resume(); });

  resume();
  return { pause, resume };
})();
