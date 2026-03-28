// ===== DOM Elements =====
const slideOne           = document.getElementById('slideOne');
const navActions         = document.getElementById('navActions');
const heroImageWrapper   = document.getElementById('heroImageWrapper');
const heroImageContainer = document.getElementById('heroImageContainer');
const overlayText        = document.getElementById('overlayText');
const painItems          = document.querySelectorAll('.pain-item');
const painImgs           = document.querySelectorAll('.pain-img');

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
// 0 = hero, 1 = expand + cascade + overlay, 2/3/4 = pain points
let slideIndex     = 0;
const TOTAL_SLIDES = 5;
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

  // --- Overlay text (appears with expansion on slide 1) ---
  if (overlayText) overlayText.classList.toggle('visible', index === 1);

  // --- Pain points ---
  painItems.forEach((el, i) => el.classList.toggle('visible', index === i + 2));
  painImgs.forEach((img, i) => img.classList.toggle('active',  index === i + 2));
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
window.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (scrollCooldown) return;
  scrollCooldown = true;
  goToSlide(slideIndex + (e.deltaY > 0 ? 1 : -1));
  setTimeout(() => { scrollCooldown = false; }, 700);
}, { passive: false });

// ===== Touch input =====
let touchStartY = 0;

window.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (scrollCooldown) return;
  const diff = touchStartY - e.changedTouches[0].clientY;
  if (Math.abs(diff) < 30) return;
  scrollCooldown = true;
  goToSlide(slideIndex + (diff > 0 ? 1 : -1));
  setTimeout(() => { scrollCooldown = false; }, 700);
}, { passive: true });
