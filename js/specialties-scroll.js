/* ============================================================================
   Specialties stacked-card scroll interaction — purely additive on top of
   the existing .sp-row markup/CSS. No wrapper elements are inserted and no
   HTML is edited; this only sets `top`/`z-index`/`transform`/`filter`
   inline on the six existing .sp-row elements and toggles the small
   progress-readout element it creates.

   Mechanic (desktop, >=768px):
   - Each .sp-row gets position: sticky (from CSS) with an inline `top` of
     0, or a negative offset (row height - viewport height) for rows taller
     than the viewport, so a tall row finishes scrolling past before it
     locks instead of clipping itself early.
   - Each row gets an increasing z-index, so as the next row's sticky point
     is reached it slides up and physically covers the previous one, which
     stays pinned underneath — no fade, the overlap itself is the effect.
   - A scroll-driven (not timed) loop tracks how far the *next* row has
     advanced over each row and scales it down toward 0.95 and darkens it
     slightly in direct proportion — reset to normal the moment it's fully
     covered or the user scrolls back up.

   <768px or prefers-reduced-motion: no pinning at all (or, under reduced
   motion only, the sticky stacking stays but the scale/darken is skipped —
   see the CSS) — see initMobileMode() for the plain fade/rise fallback.
   ============================================================================ */

(() => {
  'use strict';

  const stack = document.querySelector('.sp-stack');
  if (!stack) return;

  const rows = Array.from(stack.querySelectorAll('.sp-row[data-sp-section]'));
  if (!rows.length) return;

  const desktopQuery = window.matchMedia('(min-width: 768px)');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let mode = null; // 'stack' | 'mobile'
  let mobileObserver = null;
  let progressEl = null;
  let scrollHandler = null;
  let resizeHandler = null;
  let rafId = null;

  const prefersReducedMotion = () => reducedMotionQuery.matches;

  /* ------------------------------ progress readout ------------------------------ */

  function buildProgress() {
    if (progressEl) return;
    progressEl = document.createElement('div');
    progressEl.className = 'sp-scroll-progress';
    progressEl.setAttribute('aria-hidden', 'true');
    progressEl.innerHTML =
      '<span class="sp-scroll-progress__count">' +
        '<span class="sp-scroll-progress__current">01</span> / ' + String(rows.length).padStart(2, '0') +
      '</span>' +
      '<span class="sp-scroll-progress__track"><span class="sp-scroll-progress__fill"></span></span>';
    document.body.appendChild(progressEl);
  }

  function removeProgress() {
    if (progressEl) { progressEl.remove(); progressEl = null; }
  }

  function updateProgress(index, visible) {
    if (!progressEl) return;
    progressEl.classList.toggle('is-visible', visible);
    if (!visible) return;
    const current = progressEl.querySelector('.sp-scroll-progress__current');
    const fill = progressEl.querySelector('.sp-scroll-progress__fill');
    if (current) current.textContent = String(index + 1).padStart(2, '0');
    if (fill) fill.style.width = (((index + 1) / rows.length) * 100) + '%';
  }

  /* -------------------------------- stack mode (desktop) -------------------------------- */

  function navH() {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--nav-h');
    return parseFloat(v) || 0;
  }

  function computeTops() {
    const vh = window.innerHeight;
    const nav = navH();
    rows.forEach((row, i) => {
      const h = row.offsetHeight;
      const top = h > vh ? -(h - vh) : 0;
      row.style.top = top + 'px';
      row.style.zIndex = String(i + 1);

      // Nested sticky "header" (label + name) so it stays pinned to the top
      // of the viewport for the card's whole time on screen, even while a
      // taller card's body/media is still scrolling past underneath it.
      const topEl = row.querySelector('.sp-row__top');
      const nameEl = row.querySelector('.sp-row__name');
      if (topEl) {
        topEl.style.top = nav + 'px';
        if (nameEl) nameEl.style.top = (nav + topEl.offsetHeight) + 'px';
      } else if (nameEl) {
        nameEl.style.top = nav + 'px';
      }
    });
  }

  function clamp01(n) { return Math.max(0, Math.min(1, n)); }

  function tick() {
    rafId = null;
    const vh = window.innerHeight;
    const reduced = prefersReducedMotion();
    let activeIndex = 0;

    rows.forEach((row, i) => {
      const top = parseFloat(row.style.top) || 0;
      if (row.getBoundingClientRect().top <= top + 1) activeIndex = i;
    });

    for (let i = 0; i < rows.length; i++) {
      const next = rows[i + 1];
      let progress = 0;
      if (next) {
        const nextTop = parseFloat(next.style.top) || 0;
        const range = Math.max(1, vh - nextTop);
        const nextRectTop = next.getBoundingClientRect().top;
        progress = clamp01((vh - nextRectTop) / range);
      }
      if (reduced) {
        rows[i].style.transform = '';
        rows[i].style.filter = '';
      } else {
        rows[i].style.transform = progress > 0 ? `scale(${(1 - 0.05 * progress).toFixed(4)})` : '';
        rows[i].style.filter = progress > 0 ? `brightness(${(1 - 0.15 * progress).toFixed(4)})` : '';
      }
    }

    const firstTop = parseFloat(rows[0].style.top) || 0;
    const lastRect = rows[rows.length - 1].getBoundingClientRect();
    const withinStack = rows[0].getBoundingClientRect().top <= firstTop + 1 && lastRect.bottom > 0;
    updateProgress(activeIndex, withinStack);
  }

  function requestTick() {
    if (rafId === null) rafId = requestAnimationFrame(tick);
  }

  function initStackMode() {
    mode = 'stack';
    document.body.classList.add('sp-scroll-active');
    computeTops();
    buildProgress();
    tick();

    scrollHandler = requestTick;
    resizeHandler = () => { computeTops(); requestTick(); };
    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', resizeHandler, { passive: true });
    window.addEventListener('load', resizeHandler);
  }

  function teardownStackMode() {
    if (scrollHandler) window.removeEventListener('scroll', scrollHandler);
    if (resizeHandler) { window.removeEventListener('resize', resizeHandler); window.removeEventListener('load', resizeHandler); }
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    scrollHandler = null;
    resizeHandler = null;
    removeProgress();
    document.body.classList.remove('sp-scroll-active');
    rows.forEach((row) => {
      row.style.top = '';
      row.style.zIndex = '';
      row.style.transform = '';
      row.style.filter = '';
      const topEl = row.querySelector('.sp-row__top');
      const nameEl = row.querySelector('.sp-row__name');
      if (topEl) topEl.style.top = '';
      if (nameEl) nameEl.style.top = '';
    });
  }

  /* -------------------------------- mobile fallback -------------------------------- */

  function initMobileMode() {
    mode = 'mobile';
    document.body.classList.add('sp-scroll-mobile');
    mobileObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        mobileObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    rows.forEach((row) => mobileObserver.observe(row));
  }

  function teardownMobileMode() {
    if (mobileObserver) { mobileObserver.disconnect(); mobileObserver = null; }
    document.body.classList.remove('sp-scroll-mobile');
    rows.forEach((row) => row.classList.remove('is-visible'));
  }

  /* ---------------------------------- mode switching ---------------------------------- */

  function teardown() {
    if (mode === 'stack') teardownStackMode();
    if (mode === 'mobile') teardownMobileMode();
    mode = null;
  }

  function init() {
    if (desktopQuery.matches) initStackMode();
    else initMobileMode();
  }

  init();
  desktopQuery.addEventListener('change', () => { teardown(); init(); });
})();
