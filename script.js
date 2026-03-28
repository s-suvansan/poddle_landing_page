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

// Pain images panel (for gap calculation)
const painImagesPanel = document.querySelector('.pain-images-panel');

// ===== Split pain body text into word spans for blur animation =====
document.querySelectorAll('.pain-body').forEach(el => {
  const words = el.textContent.trim().split(' ');
  el.textContent = '';
  words.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.textContent = word;
    el.appendChild(span);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
});

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
  const prevPainIdx = (prev  >= 2) ? prev  - 2 : -1;
  const newPainIdx  = (index >= 2) ? index - 2 : -1;

  // Exit previous pain item (slide up and fade)
  if (prevPainIdx >= 0 && prevPainIdx < painItems.length) {
    const exitEl = painItems[prevPainIdx];
    exitEl.classList.add('exiting');
    setTimeout(() => exitEl.classList.remove('visible', 'exiting'), 320);
  }

  // Enter new pain item (slide up from below + word blur)
  if (newPainIdx >= 0 && newPainIdx < painItems.length) {
    const enterEl = painItems[newPainIdx];
    enterEl.classList.add('visible');
    triggerWordBlur(enterEl);
  }

  // 3D image carousel — delay on first entry so overlay text fades before image appears
  const imgDelay = 0;
  setTimeout(() => updatePainImages(newPainIdx), imgDelay);
}

// ===== Image carousel (from image_carasol) =====
function calculateGap(width) {
  const minWidth = 1024, maxWidth = 1456, minGap = 60, maxGap = 86;
  if (width <= minWidth) return minGap;
  if (width >= maxWidth) return Math.max(minGap, maxGap + 0.06018 * (width - maxWidth));
  return minGap + (maxGap - minGap) * ((width - minWidth) / (maxWidth - minWidth));
}

let prevPainActiveIdx = -1;

function updatePainImages(activeIdx) {
  const panelWidth  = painImagesPanel ? painImagesPanel.offsetWidth : 600;
  const gap         = calculateGap(panelWidth);
  const maxStickUp  = gap * 0.8;
  const total       = painImgs.length;
  const oldActive   = prevPainActiveIdx; // save BEFORE updating
  const isFirstShow = oldActive < 0 && activeIdx >= 0;
  prevPainActiveIdx = activeIdx;

  // On first show: snap all images to clean default instantly (no transition),
  // then restore CSS transition so the carousel entry animates properly.
  if (isFirstShow) {
    painImgs.forEach(img => {
      img.style.transition = 'none';
      img.style.transform  = '';
      img.style.opacity    = '0';
    });
    painImgs[0] && painImgs[0].offsetHeight; // force reflow
    painImgs.forEach(img => { img.style.transition = ''; });
  }

  painImgs.forEach((img, i) => {
    const isActive = i === activeIdx;
    const isLeft   = activeIdx >= 0 && (activeIdx - 1 + total) % total === i;
    const isRight  = activeIdx >= 0 && (activeIdx + 1) % total === i;

    if (isActive || isLeft || isRight) {
      const zIndex = isActive ? '3' : '2';
      const targetTransform = isActive
        ? 'translateX(0px) translateY(0px) scale(1) rotateY(0deg)'
        : isLeft
          ? `translateX(-${gap}px) translateY(-${maxStickUp}px) scale(0.85) rotateY(15deg)`
          : `translateX(${gap}px) translateY(-${maxStickUp}px) scale(0.85) rotateY(-15deg)`;

      // Detect teleport: image crosses from one visible side to the opposite side.
      // With 3 images this happens every step — e.g. left → right flies across center.
      // Fix: snap transform instantly while opacity is 0, then fade in at target.
      const wasLeft  = oldActive >= 0 && (oldActive - 1 + total) % total === i;
      const wasRight = oldActive >= 0 && (oldActive + 1) % total === i;
      const isTeleport = !isFirstShow && ((wasLeft && isRight) || (wasRight && isLeft));

      if (isTeleport) {
        img.style.transition    = 'none';
        img.style.transform     = targetTransform;
        img.style.zIndex        = zIndex;
        img.offsetHeight; // force reflow — snap transform while still hidden
        img.style.transition    = '';
        img.style.transitionDelay = '0s';
        img.style.opacity       = '1';
        img.style.pointerEvents = 'auto';
      } else {
        img.style.transitionDelay = '0s';
        img.style.zIndex          = zIndex;
        img.style.opacity         = '1';
        img.style.transform       = targetTransform;
        img.style.pointerEvents   = 'auto';
      }
    } else {
      // Instant hide — overlay appears cleanly without images lingering.
      // transition is restored by isFirstShow snap on next entry.
      img.style.transition      = 'none';
      img.style.transitionDelay = '0s';
      img.style.zIndex          = '1';
      img.style.opacity         = '0';
      img.style.pointerEvents   = 'none';
    }
  });
}

// ===== Word blur animation (Web Animations API) =====
function triggerWordBlur(el) {
  el.querySelectorAll('.pain-body .word').forEach((word, i) => {
    word.getAnimations().forEach(a => a.cancel());
    word.animate([
      { filter: 'blur(10px)', opacity: 0, transform: 'translateY(5px)' },
      { filter: 'blur(0px)',  opacity: 1, transform: 'translateY(0)' }
    ], { duration: 220, delay: i * 25, easing: 'ease', fill: 'both' });
  });
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
  if (Math.abs(diff) < 30) return;
  scrollCooldown = true;
  goToSlide(slideIndex + (diff > 0 ? 1 : -1));
  setTimeout(() => { scrollCooldown = false; }, 1000);
}, { passive: true });
