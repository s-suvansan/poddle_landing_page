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
// 0 = hero, 1 = expanded + testimonials (body unlocks after animation)
let slideIndex     = 0;
const TOTAL_SLIDES = 2;
let isAnimating    = false;
let scrollCooldown = false;

function lockScroll() {
  document.body.classList.remove('scrollable');
  window.scrollTo(0, 0);
}

function unlockScroll() {
  document.body.classList.add('scrollable');
  scrollCooldown = false;
}

function goToSlide(next) {
  next = Math.max(0, Math.min(TOTAL_SLIDES - 1, next));
  if (next === slideIndex) return;
  const prev = slideIndex;
  slideIndex = next;
  applyState(slideIndex, prev);
}

function applyState(index, prev) {
  if (index >= 1) {
    slideOne.classList.add('collapsed');
    heroImageWrapper.classList.add('expanded');
    heroImageContainer.classList.add('expanded');
    navActions.classList.add('visible');
    if (maskInner) maskInner.classList.add('mask-hidden');
    if (prev === 0) triggerCascadeOut();
    if (heroSlider.pause) heroSlider.pause();
    // Unlock scroll after expand animation so user can scroll to problem section
    setTimeout(() => unlockScroll(), 900);
  } else {
    lockScroll();
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
  // Once scroll is unlocked, allow natural scroll except when user scrolls up past the top
  if (document.body.classList.contains('scrollable')) {
    if (window.scrollY === 0 && e.deltaY < 0 && slideIndex === 1 && !scrollCooldown) {
      e.preventDefault();
      scrollCooldown = true;
      goToSlide(0);
      setTimeout(() => { scrollCooldown = false; }, 1000);
    }
    return;
  }

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
  if (document.body.classList.contains('scrollable')) {
    if (window.scrollY === 0 && slideIndex === 1) {
      const diff = touchStartY - e.changedTouches[0].clientY;
      if (diff < -40 && !scrollCooldown) {
        scrollCooldown = true;
        goToSlide(0);
        setTimeout(() => { scrollCooldown = false; }, 950);
      }
    }
    return;
  }
  if (scrollCooldown) return;
  const diff = touchStartY - e.changedTouches[0].clientY;
  if (Math.abs(diff) < 40) return;
  scrollCooldown = true;
  goToSlide(slideIndex + (diff > 0 ? 1 : -1));
  setTimeout(() => { scrollCooldown = false; }, 950);
}, { passive: true });

// ===== Morphing Label =====
const morphLabel = (function () {
  const text1 = document.getElementById('morphText1');
  const text2 = document.getElementById('morphText2');
  if (!text1 || !text2) return { to: () => {} };

  const MORPH_TIME = 1.2; // seconds
  let animId   = null;
  let busy     = false;

  function setStyles(fraction) {
    const inv = 1 - fraction;
    text2.style.filter  = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
    text2.style.opacity = Math.pow(fraction, 0.4);
    text1.style.filter  = `blur(${Math.min(8 / inv - 8, 100)}px)`;
    text1.style.opacity = Math.pow(inv, 0.4);
  }

  // Init
  text1.style.opacity = '1';
  text1.style.filter  = 'none';
  text2.style.opacity = '0';
  text2.style.filter  = 'blur(100px)';

  function to(newText) {
    if (text1.textContent === newText && !busy) return;
    text2.textContent = newText;
    busy = true;
    cancelAnimationFrame(animId);
    let start = null;

    function animate(ts) {
      if (!start) start = ts;
      const fraction = Math.min((ts - start) / (MORPH_TIME * 1000), 1);
      setStyles(fraction);
      if (fraction < 1) {
        animId = requestAnimationFrame(animate);
      } else {
        // Swap: text1 becomes the new text, reset text2
        text1.textContent = newText;
        text1.style.filter  = 'none';
        text1.style.opacity = '1';
        text2.style.filter  = 'blur(100px)';
        text2.style.opacity = '0';
        busy = false;
      }
    }
    animId = requestAnimationFrame(animate);
  }

  return { to };
})();

// ===== Hero Image Slider =====
const heroSlider = (function () {
  const slides  = document.querySelectorAll('.hero-slide');
  const btnPrev = document.getElementById('sliderPrev');
  const btnNext = document.getElementById('sliderNext');
  const labels  = ['Restaurants', 'Takeaway', 'Clubs & Bars', 'Cafés & Coffee Shops'];
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

    morphLabel.to(labels[current]);

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

// ===== Testimonials =====
(function () {
  const data = [
    {
      quote: "Within the first month, three new tables told us they came in because a regular recommended us. Poddle made that happen.",
      name: "Marco Ricci",
      role: "Owner / Marco's Kitchen",
      avatar: ""
    },
    {
      quote: "We went from zero Google reviews to 47 in six weeks. Our regulars finally had a reason to share us.",
      name: "Priya Nair",
      role: "Owner / Spice Route",
      avatar: ""
    },
    {
      quote: "It's word-of-mouth, but switched on. New customers arrive every week and I haven't spent a penny on ads.",
      name: "James Holloway",
      role: "Manager / The Daily Grind",
      avatar: ""
    }
  ];

  const indexEl  = document.getElementById('testiIndex');
  const quoteEl  = document.getElementById('testiQuote');
  const authorEl = document.getElementById('testiAuthor');
  const nameEl   = document.getElementById('testiName');
  const roleEl   = document.getElementById('testiRole');
  const countEl  = document.getElementById('testiCount');
  const linesEl  = document.getElementById('testiLines');
  const prevBtn  = document.getElementById('testiPrev');
  const nextBtn  = document.getElementById('testiNext');
  if (!indexEl) return;

  let active       = 0;
  let transitioning = false;

  // Build line buttons
  data.forEach((_, i) => {
    const btn = document.createElement('button');
    btn.className = 'testi-line-btn' + (i === 0 ? ' active' : '');
    btn.innerHTML = '<span></span>';
    btn.addEventListener('click', () => goTo(i));
    linesEl.appendChild(btn);
  });

  function render(i) {
    const t = data[i];
    indexEl.textContent = String(i + 1).padStart(2, '0');
    quoteEl.textContent = t.quote;
    nameEl.textContent  = t.name;
    roleEl.textContent  = t.role;
    countEl.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(data.length).padStart(2, '0');
    linesEl.querySelectorAll('.testi-line-btn').forEach((b, j) => {
      b.classList.toggle('active', j === i);
    });
  }

  function goTo(i) {
    if (transitioning || i === active) return;
    transitioning = true;
    quoteEl.classList.add('transitioning');
    authorEl.classList.add('transitioning');
    setTimeout(() => {
      active = i;
      render(active);
      quoteEl.classList.remove('transitioning');
      authorEl.classList.remove('transitioning');
      transitioning = false;
    }, 300);
  }

  let autoTimer = null;

  function startAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      goTo(active === data.length - 1 ? 0 : active + 1);
    }, 4000);
  }

  prevBtn.addEventListener('click', () => { goTo(active === 0 ? data.length - 1 : active - 1); startAuto(); });
  nextBtn.addEventListener('click', () => { goTo(active === data.length - 1 ? 0 : active + 1); startAuto(); });
  linesEl.addEventListener('click', () => startAuto());

  render(0);
  startAuto();
})();

// ===== Bento grid staggered entrance =====
(function () {
  const cards = document.querySelectorAll('[data-bento]');
  if (!cards.length || !('IntersectionObserver' in window)) {
    cards.forEach(c => c.classList.add('in-view'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      const index = Array.from(cards).indexOf(card);
      setTimeout(() => card.classList.add('in-view'), index * 90);
      observer.unobserve(card);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

  cards.forEach(card => observer.observe(card));
})();
