// ===== DOM Elements =====
const slideOne           = document.getElementById('slideOne');
const navActions         = document.getElementById('navActions');
const heroImageWrapper   = document.getElementById('heroImageWrapper');
const heroImageContainer = document.getElementById('heroImageContainer');
const overlayText        = document.getElementById('overlayText');
const painSection        = document.getElementById('painSection');
const painItems          = document.querySelectorAll('.pain-item');
const painImgs           = document.querySelectorAll('.pain-img');
const painNavDots        = document.querySelectorAll('.pain-nav-dot');

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

// ===== Overlay block-sweep init =====
function initOverlayBlockReveal() {
  if (!overlayText) return;
  overlayText.querySelectorAll('p').forEach(p => {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;overflow:hidden;display:block;';

    const block = document.createElement('div');
    block.className = 'overlay-sweep-block';
    block.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;' +
      'background:#fff;z-index:2;transform:scaleX(0);transform-origin:left center;';

    p.parentNode.insertBefore(wrapper, p);
    wrapper.appendChild(p);
    wrapper.appendChild(block);
    p.style.opacity = '0';
  });
}
initOverlayBlockReveal();

// ===== Slide State Machine =====
// 0 = hero, 1 = expand + cascade + overlay, 2/3/4 = pain points
let slideIndex             = 0;
const TOTAL_SLIDES         = 5;
let painSectionFirstShown  = false;
let painHideTimer          = null;
let isAnimating    = false;
let scrollCooldown = false;
let overlayAnimated = false;

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

  // --- Overlay text — block-sweep reveal after image expansion (800ms), reset on return to slide 0 ---
  if (overlayText) {
    if (index >= 1) {
      if (!overlayAnimated) {
        overlayAnimated = true;
        setTimeout(() => {
          overlayText.classList.add('visible');
          triggerOverlayReveal();
        }, 600);
      }
    } else {
      resetOverlay();
    }
  }

  // --- Pain section: slide up on entry, slide down on exit ---
  if (painSection) painSection.classList.toggle('active', index >= 2);
  painNavDots.forEach((dot, i) => dot.classList.toggle('active', index === i + 2));

  // --- Pain points ---
  painItems.forEach((el, i) => el.classList.toggle('visible', index === i + 2));

  const prevPainIdx = (prev  >= 2) ? prev  - 2 : -1;
  const newPainIdx  = (index >= 2) ? index - 2 : -1;

  if (newPainIdx < 0 && prevPainIdx >= 0) {
    // Leaving pain section — keep images visible during slide-down, reset after
    if (painHideTimer) clearTimeout(painHideTimer);
    painHideTimer = setTimeout(() => {
      painHideTimer = null;
      painImgs.forEach(img => {
        img.style.transition = 'none';
        img.classList.remove('active');
        img.style.opacity    = '0';
        img.style.transform  = 'scale(1)';
      });
      painImgs[0] && painImgs[0].offsetHeight;
      painImgs.forEach(img => { img.style.transition = ''; });
      painSectionFirstShown = false;
    }, 900);

  } else if (newPainIdx >= 0) {
    // Cancel any pending hide if user scrolls back in before timer fires
    if (painHideTimer) { clearTimeout(painHideTimer); painHideTimer = null; }
    if (!painSectionFirstShown) {
      // First entry only: Ken Burns effect — snap to zoomed-in, then animate to normal
      painSectionFirstShown = true;
      painImgs.forEach(img => {
        img.style.transition = 'none';
        img.style.opacity    = '0';
        img.style.transform  = 'scale(1.06)';
        img.classList.remove('active');
      });
      painImgs[0] && painImgs[0].offsetHeight;
      painImgs.forEach(img => { img.style.transition = ''; });
      painImgs.forEach((img, i) => {
        if (index === i + 2) {
          img.style.opacity   = '1';
          img.style.transform = 'scale(1)';
        }
      });
    } else {
      // Subsequent entries: clear inline overrides so CSS handles it, crossfade only
      painImgs.forEach((img, i) => {
        img.style.opacity   = '';
        img.style.transform = '';
        img.classList.toggle('active', index === i + 2);
      });
    }
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

// ===== Overlay sweep animation =====
function triggerOverlayReveal() {
  if (!overlayText) return;
  const DURATION = 600;
  const STAGGER  = 150;

  overlayText.querySelectorAll('.overlay-sweep-block').forEach((block, i) => {
    const p = block.previousElementSibling;
    const delay = i * STAGGER;

    setTimeout(() => {
      // A: sweep block left → right
      block.style.transformOrigin = 'left center';
      block.animate(
        [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
        { duration: DURATION, fill: 'forwards', easing: 'cubic-bezier(0.76,0,0.24,1)' }
      );

      // B: reveal text at midpoint
      setTimeout(() => { if (p) p.style.opacity = '1'; }, DURATION / 2);

      // C: sweep block off right → left (starts at 60% of entry)
      setTimeout(() => {
        block.style.transformOrigin = 'right center';
        block.animate(
          [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
          { duration: DURATION, fill: 'forwards', easing: 'cubic-bezier(0.76,0,0.24,1)' }
        );
      }, DURATION * 0.6);

    }, delay);
  });
}

function resetOverlay() {
  if (!overlayText) return;
  overlayAnimated = false;
  const FADE = 400;

  // Fade out any visible paragraph text
  overlayText.querySelectorAll('.overlay-sweep-block').forEach(block => {
    const p = block.previousElementSibling;
    if (p && p.style.opacity !== '0') {
      p.animate(
        [{ opacity: '1' }, { opacity: '0' }],
        { duration: FADE, fill: 'forwards', easing: 'ease' }
      );
    }
  });

  // After fade, snap everything clean and hide container
  setTimeout(() => {
    overlayText.classList.remove('visible');
    overlayText.querySelectorAll('.overlay-sweep-block').forEach(block => {
      block.getAnimations().forEach(a => a.cancel());
      block.style.transform = 'scaleX(0)';
      block.style.transformOrigin = 'left center';
      const p = block.previousElementSibling;
      if (p) {
        p.getAnimations().forEach(a => a.cancel());
        p.style.opacity = '0';
      }
    });
  }, FADE);
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
