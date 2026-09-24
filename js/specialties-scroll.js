/* ============================================================================
   Specialties pinned-scroll interaction — purely additive on top of the
   existing .sp-row markup/CSS. This file never edits the page's HTML source;
   it only wraps the six .sp-row sections in JS-created stage elements at
   runtime and toggles state classes (body.sp-scroll-active / .is-active /
   .is-dimmed / .sp-scroll-mobile) that css/style.css already defines.

   Behavior:
   - >=768px: each .sp-row is pinned (position: sticky) inside a tall
     JS-created wrapper so it "takes over" the viewport for a beat before the
     next one arrives. An IntersectionObserver tracks which row is centered
     and marks it .is-active (children stagger-reveal), while the previously
     active row gets .is-dimmed (opacity ~0.4). A small "0X / 06" progress
     readout updates alongside it.
   - <768px: no pinning at all — rows just fade/rise into place once as the
     user scrolls past them normally (.sp-scroll-mobile + .is-visible).
   - prefers-reduced-motion: the pin/active tracking still runs, but
     css/style.css switches every transition to an instant opacity-only
     change (see the @media (prefers-reduced-motion: reduce) block there).
   ============================================================================ */

(() => {
  'use strict';

  const stack = document.querySelector('.sp-stack');
  if (!stack) return;

  const rows = Array.from(stack.querySelectorAll('.sp-row[data-sp-section]'));
  if (!rows.length) return;

  const desktopQuery = window.matchMedia('(min-width: 768px)');
  let mode = null; // 'pin' | 'mobile'
  let rowObserver = null;
  let mobileObserver = null;
  let progressEl = null;
  let resizeRaf = null;

  const isDesktop = () => desktopQuery.matches;

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

  function updateProgress(activeIndex) {
    if (!progressEl) return;
    progressEl.classList.add('is-visible');
    const current = progressEl.querySelector('.sp-scroll-progress__current');
    const fill = progressEl.querySelector('.sp-scroll-progress__fill');
    if (current) current.textContent = String(activeIndex + 1).padStart(2, '0');
    if (fill) fill.style.width = (((activeIndex + 1) / rows.length) * 100) + '%';
  }

  /* -------------------------------- pin mode (desktop) -------------------------------- */

  function wrapForPin(row) {
    if (row.parentElement && row.parentElement.classList.contains('sp-pin-stage')) return row.parentElement;
    const stage = document.createElement('div');
    stage.className = 'sp-pin-stage';
    row.parentNode.insertBefore(stage, row);
    stage.appendChild(row);
    return stage;
  }

  function unwrapFromPin(row) {
    const stage = row.parentElement;
    if (stage && stage.classList.contains('sp-pin-stage')) {
      stage.parentNode.insertBefore(row, stage);
      stage.remove();
    }
  }

  function setStageHeights() {
    const vh = window.innerHeight;
    rows.forEach((row) => {
      const stage = row.parentElement;
      if (!stage || !stage.classList.contains('sp-pin-stage')) return;
      // One full viewport of "pin dwell" on top of however tall the row's own
      // content is — keeps the takeover feel even when a row (video + list)
      // is naturally taller than the screen.
      stage.style.height = (row.offsetHeight + vh) + 'px';
    });
  }

  let activeIndex = -1;

  function setActive(index) {
    if (index === activeIndex) return;
    if (activeIndex >= 0 && rows[activeIndex]) {
      rows[activeIndex].classList.remove('is-active');
      rows[activeIndex].classList.add('is-dimmed');
    }
    if (index >= 0 && rows[index]) {
      rows[index].classList.add('is-active');
      rows[index].classList.remove('is-dimmed');
      updateProgress(index);
    }
    activeIndex = index;
  }

  function initPinMode() {
    mode = 'pin';
    document.body.classList.add('sp-scroll-active');
    rows.forEach(wrapForPin);
    setStageHeights();
    buildProgress();

    // First row starts active immediately — nothing to scroll to reach it.
    setActive(0);

    rowObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const idx = rows.indexOf(entry.target);
        if (idx !== -1) setActive(idx);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    rows.forEach((row) => rowObserver.observe(row));
  }

  function teardownPinMode() {
    if (rowObserver) { rowObserver.disconnect(); rowObserver = null; }
    removeProgress();
    document.body.classList.remove('sp-scroll-active');
    rows.forEach((row) => {
      row.classList.remove('is-active', 'is-dimmed');
      row.removeAttribute('style');
      unwrapFromPin(row);
    });
    activeIndex = -1;
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
    if (mode === 'pin') teardownPinMode();
    if (mode === 'mobile') teardownMobileMode();
    mode = null;
  }

  function init() {
    if (isDesktop()) initPinMode();
    else initMobileMode();
  }

  init();

  desktopQuery.addEventListener('change', () => {
    teardown();
    init();
  });

  window.addEventListener('resize', () => {
    if (mode !== 'pin') return;
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(setStageHeights);
  }, { passive: true });

  // Video/poster loads and web-font swaps can change row height after the
  // first measurement — recheck once shortly after load.
  window.addEventListener('load', () => {
    if (mode === 'pin') setStageHeights();
  });
})();
