// ===== Config =====
const LINE_STAGGER = 0;
const CHAR_STAGGER = 0.02;
const SCROLL_RANGE_VH = 1.2;

// Image config
const IMG_START_WIDTH = 85;   // % of viewport
const IMG_END_WIDTH = 100;    // vw
const IMG_START_RADIUS = 48;  // px

// ===== DOM Elements =====
const slideOne = document.getElementById('slideOne');
const navActions = document.getElementById('navActions');
const heroImageWrapper = document.getElementById('heroImageWrapper');
const heroImageContainer = document.getElementById('heroImageContainer');
const heroFullImg = document.getElementById('heroFullImg');

// ===== Split text into individual character spans =====
const cascadeLines = [];

document.querySelectorAll('.cascade-text').forEach((el) => {
  const order = parseInt(el.dataset.cascadeOrder, 10);
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

    // Add space between words (not after last word)
    if (wIdx < words.length - 1) {
      const space = document.createElement('span');
      space.className = 'cascade-char is-space';
      space.innerHTML = '&nbsp;';
      el.appendChild(space);
      chars.push(space);
    }
  });

  cascadeLines.push({ el, order, chars });
});

// Button mask element
const maskWrap = document.querySelector('.mask-wrap');
const maskInner = maskWrap ? maskWrap.querySelector('.mask-inner') : null;
const maskOrder = maskWrap ? parseInt(maskWrap.dataset.maskOrder, 10) : 3;

// ===== Scroll Handler =====
let ticking = false;

function update() {
  ticking = false;
  const scrollY = window.scrollY;
  const windowH = window.innerHeight;
  const scrollRange = windowH * SCROLL_RANGE_VH;

  // --- Phase 1: Cascade text animation (per-letter) ---
  // All lines finish in the same scroll distance regardless of character count
  const CASCADE_FINISH = scrollRange * 0.7; // all lines done by this scroll point

  cascadeLines.forEach(({ order, chars }) => {
    const lineStart = 0;
    const charCount = chars.length || 1;
    // Spread characters evenly across the cascade window
    const perCharDelay = (CASCADE_FINISH * 0.5) / charCount;

    chars.forEach((charSpan, i) => {
      const charStart = lineStart + i * perCharDelay;
      const charEnd = charStart + CASCADE_FINISH * 0.5;

      if (scrollY <= charStart) {
        charSpan.style.transform = 'translateY(0) rotate(0deg)';
        charSpan.style.opacity = '1';
      } else if (scrollY >= charEnd) {
        charSpan.style.transform = 'translateY(-110%) rotate(-8deg)';
        charSpan.style.opacity = '0';
      } else {
        const progress = (scrollY - charStart) / (charEnd - charStart);
        const eased = easeOutCubic(progress);
        charSpan.style.transform = `translateY(${-eased * 110}%) rotate(${-eased * 8}deg)`;
        charSpan.style.opacity = `${1 - eased}`;
      }
    });
  });

  // Button mask animation (block slide up)
  const btnStart = maskOrder * LINE_STAGGER * scrollRange;
  const btnEnd = btnStart + scrollRange * 0.5;

  if (maskInner) {
    if (scrollY <= btnStart) {
      maskInner.style.transform = 'translateY(0)';
      maskInner.style.opacity = '1';
    } else if (scrollY >= btnEnd) {
      maskInner.style.transform = 'translateY(-100%)';
      maskInner.style.opacity = '0';
    } else {
      const progress = (scrollY - btnStart) / (btnEnd - btnStart);
      const eased = easeOutCubic(progress);
      maskInner.style.transform = `translateY(${-eased * 100}%)`;
      maskInner.style.opacity = `${1 - eased}`;
    }
  }

  // --- Show/hide nav buttons based on hero CTA visibility ---
  if (scrollY >= btnEnd) {
    navActions.classList.add('visible');
  } else {
    navActions.classList.remove('visible');
  }

  // --- Image expansion: auto-trigger via CSS transition ---
  const expandTrigger = scrollRange * 0.1; // trigger very early, near start of cascade

  if (scrollY >= expandTrigger) {
    // Expand image to full page + collapse slide-one
    heroImageWrapper.classList.add('expanded');
    heroImageContainer.classList.add('expanded');
    slideOne.classList.add('collapsed');
  } else {
    // Shrink back to peek state
    heroImageWrapper.classList.remove('expanded');
    heroImageContainer.classList.remove('expanded');
    slideOne.classList.remove('collapsed');
  }

  // Image stays fixed once expanded — no further scrolling
  heroFullImg.style.transform = 'translateY(0)';
}

// ===== Easing Functions =====
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ===== Lenis Smooth Scroll =====
const lenis = new Lenis({
  lerp: 0.07,
  duration: 1.5,
  smoothWheel: true,
});

lenis.on('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(update);
    ticking = true;
  }
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// ===== Init =====
window.addEventListener('resize', () => {
  requestAnimationFrame(update);
}, { passive: true });

// Wait for image to load so we have natural dimensions
heroFullImg.addEventListener('load', () => {
  requestAnimationFrame(update);
});

update();
