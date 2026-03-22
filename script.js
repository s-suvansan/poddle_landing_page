// ===== Config =====
const LINE_STAGGER = 0;
const CHAR_STAGGER = 0.02;
const SCROLL_RANGE_VH = 0.45;

// Image config
const IMG_START_WIDTH = 85;   // % of viewport
const IMG_END_WIDTH = 100;    // vw
const IMG_START_RADIUS = 48;  // px

// ===== DOM Elements =====
const slideOne = document.getElementById('slideOne');
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
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement('span');
    span.className = 'cascade-char';
    if (text[i] === ' ') {
      span.innerHTML = '&nbsp;';
      span.classList.add('is-space');
    } else {
      span.textContent = text[i];
    }
    el.appendChild(span);
    chars.push(span);
  }

  cascadeLines.push({ el, order, chars });
});

// Button mask element
const maskWrap = document.querySelector('.mask-wrap');
const maskInner = maskWrap ? maskWrap.querySelector('.mask-inner') : null;
const maskOrder = maskWrap ? parseInt(maskWrap.dataset.maskOrder, 10) : 3;

// ===== Scroll Handler =====
let ticking = false;

function onScroll() {
  if (!ticking) {
    requestAnimationFrame(update);
    ticking = true;
  }
}

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
  if (maskInner) {
    const btnStart = maskOrder * LINE_STAGGER * scrollRange;
    const btnEnd = btnStart + scrollRange * 0.5;

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

  // --- Slide-one height shrink (synced with image expansion) ---
  // Uses the same expandStart/expandEnd as the image, calculated below
  const expandStartVal = 0;
  const expandEndVal = windowH * 0.8;
  const slideStartH = windowH * 0.82; // 82vh

  if (scrollY <= expandStartVal) {
    slideOne.style.height = `${slideStartH}px`;
    slideOne.style.pointerEvents = 'auto';
  } else if (scrollY >= expandEndVal) {
    slideOne.style.height = '0px';
    slideOne.style.pointerEvents = 'none';
  } else {
    const p = (scrollY - expandStartVal) / (expandEndVal - expandStartVal);
    const eased = easeInOutCubic(p);
    slideOne.style.height = `${slideStartH * (1 - eased)}px`;
    slideOne.style.pointerEvents = eased > 0.5 ? 'none' : 'auto';
  }

  // --- Phase 2 & 3: Image expansion + scroll up ---
  // Image natural dimensions
  const imgNaturalW = heroFullImg.naturalWidth || 1;
  const imgNaturalH = heroFullImg.naturalHeight || 1;

  // Phase 2: expand width + reduce radius (happens during/after text cascade)
  const expandStart = 0;
  const expandEnd = expandStart + windowH * 0.8;

  // Phase 3: scroll image up to reveal full image
  const panStart = expandEnd;
  // Calculate how tall the image will be at full viewport width
  const imgFullDisplayH = (window.innerWidth / imgNaturalW) * imgNaturalH;
  const maxPan = Math.max(0, imgFullDisplayH - windowH);
  const panEnd = panStart + maxPan;

  // Set total scroll space (only once image is loaded)
  if (imgNaturalW > 1) {
    const totalNeeded = panEnd + windowH;
    document.getElementById('scrollSpace').style.height = `${totalNeeded}px`;
  }

  // Wrapper starts at 18vh height pinned to the bottom. On expansion it grows to 100vh.
  const startH = windowH * 0.18; // 18vh

  if (scrollY < expandStart) {
    // Before expansion: initial state
    heroImageContainer.style.width = `${IMG_START_WIDTH}%`;
    heroImageContainer.style.borderRadius = `${IMG_START_RADIUS}px ${IMG_START_RADIUS}px 0 0`;
    heroImageWrapper.style.height = `${startH}px`;
    heroFullImg.style.transform = 'translateY(0)';
  } else if (scrollY >= expandStart && scrollY < expandEnd) {
    // During expansion: width grows, radius shrinks, wrapper height grows
    const progress = (scrollY - expandStart) / (expandEnd - expandStart);
    const eased = easeInOutCubic(progress);

    const width = IMG_START_WIDTH + (IMG_END_WIDTH - IMG_START_WIDTH) * eased;
    const radius = IMG_START_RADIUS * (1 - eased);
    const wrapH = startH + (windowH - startH) * eased; // 18vh → 100vh

    heroImageContainer.style.width = `${width}vw`;
    heroImageContainer.style.borderRadius = `${radius}px ${radius}px 0 0`;
    heroImageWrapper.style.height = `${wrapH}px`;
    heroFullImg.style.transform = 'translateY(0)';
  } else if (scrollY >= panStart) {
    // Phase 3: full width, pan image up to reveal whole thing
    heroImageContainer.style.width = '100vw';
    heroImageContainer.style.borderRadius = '0px';
    heroImageWrapper.style.height = '100vh';

    const panProgress = Math.min(1, (scrollY - panStart) / (panEnd - panStart));
    heroFullImg.style.transform = `translateY(${-panProgress * maxPan}px)`;
  }
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

// ===== Init =====
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => {
  requestAnimationFrame(update);
}, { passive: true });

// Wait for image to load so we have natural dimensions
heroFullImg.addEventListener('load', () => {
  requestAnimationFrame(update);
});

update();
