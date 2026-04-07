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
  } else {
    slideOne.classList.remove('collapsed');
    heroImageWrapper.classList.remove('expanded');
    heroImageContainer.classList.remove('expanded');
    navActions.classList.remove('visible');
    if (maskInner) maskInner.classList.remove('mask-hidden');
    resetCascade();
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
