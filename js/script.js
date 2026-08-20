(() => {
  'use strict';

  const hasHover = window.matchMedia('(hover: hover)').matches;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smoothScrollEnabled = hasHover && !prefersReducedMotion;

  const hero = document.querySelector('.hero');

  /* --------------------------------- loader --------------------------------- */
  /* The brand kit's logo intro (Intro_Final2NoAudio.mov) is ProRes 422, which no
     browser can play — so this uses a numeric counter with the static PNG mark
     instead, in the same spirit as a video intro. */

  const loader = document.getElementById('loader');
  const loaderPct = document.getElementById('loaderPct');
  const loaderBarFill = document.getElementById('loaderBarFill');

  const revealHero = () => {
    if (hero) hero.classList.add('is-loaded');
  };

  if (loader && loaderPct && loaderBarFill) {
    document.body.style.overflow = 'hidden';

    const countDuration = prefersReducedMotion ? 300 : 1700;
    const countStart = performance.now();

    const tickCount = (now) => {
      const progress = Math.min((now - countStart) / countDuration, 1);
      const pct = Math.round(progress * 100);
      loaderPct.textContent = String(pct);
      loaderBarFill.style.width = `${pct}%`;
      if (progress < 1) requestAnimationFrame(tickCount);
    };
    requestAnimationFrame(tickCount);

    const minWait = new Promise((resolve) => setTimeout(resolve, countDuration));
    const readyWait = new Promise((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve, { once: true });
    });
    const maxWait = new Promise((resolve) => setTimeout(resolve, 4000));

    Promise.race([Promise.all([minWait, readyWait]), maxWait]).then(() => {
      loader.classList.add('is-hidden');
      document.body.style.overflow = '';
      revealHero();
      setTimeout(() => loader.remove(), 900);
    });
  } else {
    revealHero();
  }

  /* ------------------------------ glow rotation ----------------------------- */
  /* Drives the shared --angle custom property directly from JS so the conic-
     gradient ring rotation doesn't depend on @property browser support. */

  if (!prefersReducedMotion) {
    const root = document.documentElement;
    let angle = 0;
    const spinGlow = () => {
      angle = (angle + 1.1) % 360;
      root.style.setProperty('--angle', `${angle}deg`);
      requestAnimationFrame(spinGlow);
    };
    requestAnimationFrame(spinGlow);
  }

  /* ---------------------------- custom cursor ---------------------------- */

  const dot = document.getElementById('cursorDot');
  const label = document.getElementById('cursorLabel');

  if (hasHover) {
    window.addEventListener('mousemove', (e) => {
      const x = e.clientX;
      const y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      if (label) label.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${label.classList.contains('is-active') ? 1 : 0.6})`;
    });

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('[data-cursor="hover"]')) dot.classList.add('is-hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('[data-cursor="hover"]')) dot.classList.remove('is-hover');
    });

    /* cursor label morph over case-study media */
    if (label) {
      document.querySelectorAll('[data-cursor-text]').forEach((el) => {
        el.addEventListener('mouseenter', () => {
          label.textContent = el.getAttribute('data-cursor-text');
          label.classList.add('is-active');
          dot.classList.add('is-hidden');
        });
        el.addEventListener('mouseleave', () => {
          label.classList.remove('is-active');
          dot.classList.remove('is-hidden');
        });
      });
    }
  }

  /* ---------------------------- smooth scroll ------------------------------ */
  /* Decouples visual scroll position from native scroll via a lerp, while
     leaving the native scrollbar/wheel/keyboard/touch handling untouched. */

  const scrollWrapper = document.getElementById('scrollWrapper');

  if (smoothScrollEnabled && scrollWrapper) {
    scrollWrapper.classList.add('is-smooth');

    let current = window.scrollY;
    let target = window.scrollY;

    const setBodyHeight = () => {
      document.body.style.height = `${scrollWrapper.scrollHeight}px`;
    };
    setBodyHeight();
    window.addEventListener('load', setBodyHeight);
    window.addEventListener('resize', setBodyHeight);
    new ResizeObserver(setBodyHeight).observe(scrollWrapper);

    window.addEventListener('scroll', () => { target = window.scrollY; }, { passive: true });

    const raf = () => {
      current += (target - current) * 0.09;
      if (Math.abs(target - current) < 0.05) current = target;
      scrollWrapper.style.transform = `translate3d(0, ${-current}px, 0)`;
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }

  /* ------------------------------ anchor nav ------------------------------- */

  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const hash = link.getAttribute('href');
      if (!hash) return;
      if (hash.length < 2) { e.preventDefault(); return; }
      const targetEl = document.querySelector(hash);
      if (!targetEl) return;

      e.preventDefault();
      const navH = document.getElementById('siteHeader').offsetHeight;
      const y = targetEl.getBoundingClientRect().top + window.scrollY - navH + 1;

      if (smoothScrollEnabled) {
        window.scrollTo({ top: y, left: 0, behavior: 'instant' });
      } else {
        window.scrollTo({ top: y, left: 0, behavior: 'smooth' });
      }

      if (mobileMenu.classList.contains('is-open')) {
        mobileMenu.classList.remove('is-open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  });

  /* ------------------------------ scroll fx ------------------------------- */

  const header = document.getElementById('siteHeader');
  const scrollFill = document.getElementById('scrollFill');
  const navLinks = document.querySelectorAll('[data-nav-link]');
  const sections = document.querySelectorAll('main section[id]');

  /* Every dark/light block on the page (hero, trust strip, each section,
     footer) carries data-theme. Whichever one is centered in the viewport
     sets body[data-theme], which the shared page background and the header
     both key off of — one source of truth instead of separate scroll math
     for each. */
  const themeBlocks = document.querySelectorAll('[data-theme]');
  const themeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) document.body.dataset.theme = entry.target.dataset.theme;
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  themeBlocks.forEach((el) => themeObserver.observe(el));

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);

    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollFill.style.width = max > 0 ? `${(y / max) * 100}%` : '0%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: '-45% 0px -45% 0px' });
  sections.forEach((s) => navObserver.observe(s));

  /* ------------------------------ hero parallax ----------------------------- */

  if (hero && !prefersReducedMotion) {
    const heroVideo = document.getElementById('heroVideo');
    const updateParallax = () => {
      const rect = hero.getBoundingClientRect();
      const progress = Math.min(Math.max(-rect.top / rect.height, 0), 1);
      if (heroVideo) heroVideo.style.transform = `scale(1.12) translateY(${progress * 6}%)`;
      requestAnimationFrame(updateParallax);
    };
    requestAnimationFrame(updateParallax);
  }

  /* -------------------------------- reveals -------------------------------- */

  const splitWords = (el) => {
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((piece) => {
            if (piece.trim() === '') {
              frag.appendChild(document.createTextNode(piece));
            } else {
              const word = document.createElement('span');
              word.className = 'word';
              const inner = document.createElement('span');
              inner.textContent = piece;
              word.appendChild(inner);
              frag.appendChild(word);
            }
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    el.querySelectorAll('.word > span').forEach((span, i) => {
      span.style.transitionDelay = `${i * 0.06}s`;
    });
  };
  document.querySelectorAll('.section-title, .local-impact__headline').forEach(splitWords);

  const revealTargets = document.querySelectorAll('[data-reveal], .section-num, .section-title, .section-sub, .local-impact__headline');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealTargets.forEach((el) => revealObserver.observe(el));

  /* ------------------------------ stat counters ----------------------------- */

  const counters = document.querySelectorAll('[data-count]');
  const animateCount = (el) => {
    const target = parseFloat(el.getAttribute('data-count'));
    const decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    const duration = 1400;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = (eased * target).toFixed(decimals);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  counters.forEach((el) => counterObserver.observe(el));

  /* --------------------------- industry hover-cards -------------------------- */

  const industryCards = document.querySelectorAll('.industry-card');
  industryCards.forEach((card) => {
    card.addEventListener('click', () => {
      const isOpen = card.classList.contains('is-open');
      industryCards.forEach((c) => { c.classList.remove('is-open'); c.setAttribute('aria-expanded', 'false'); });
      if (!isOpen) { card.classList.add('is-open'); card.setAttribute('aria-expanded', 'true'); }
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
    });
  });

  /* --------------------------- department accordion --------------------------- */
  /* Hover/focus already expands a row via CSS; this click handler just gives
     touch devices (no real :hover) a way to reach the same expanded state,
     one row open at a time. */

  const deptItems = document.querySelectorAll('.dept-item');
  deptItems.forEach((item) => {
    item.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      deptItems.forEach((d) => { d.classList.remove('is-open'); d.setAttribute('aria-expanded', 'false'); });
      if (!isOpen) { item.classList.add('is-open'); item.setAttribute('aria-expanded', 'true'); }
    });
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); item.click(); }
    });
  });

  /* --------------------------------- mobile menu ------------------------------ */

  burger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(isOpen));
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  /* -------------------------- lazy video play-in-view -------------------------- */

  const lazyVideos = document.querySelectorAll('.cs-tile__video');
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) {
        if (!video.getAttribute('src') && video.dataset.loaded !== 'true') {
          video.dataset.loaded = 'true';
          video.load();
        }
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.35 });
  lazyVideos.forEach((v) => videoObserver.observe(v));

  /* ------------------------------ topo contours ------------------------------ */
  /* Animated topographic contour-line backgrounds. A small value-noise field is
     sampled on a grid and traced with marching squares at several thresholds,
     producing flowing elevation-map lines rather than a static texture. */

  const topoCanvases = document.querySelectorAll('[data-topo]');

  if (topoCanvases.length) {
    const hash2 = (x, y) => {
      const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return s - Math.floor(s);
    };
    const smooth = (t) => t * t * (3 - 2 * t);
    const noise2 = (x, y) => {
      const x0 = Math.floor(x);
      const y0 = Math.floor(y);
      const xf = x - x0;
      const yf = y - y0;
      const v00 = hash2(x0, y0);
      const v10 = hash2(x0 + 1, y0);
      const v01 = hash2(x0, y0 + 1);
      const v11 = hash2(x0 + 1, y0 + 1);
      const tx = smooth(xf);
      const ty = smooth(yf);
      const a = v00 + (v10 - v00) * tx;
      const b = v01 + (v11 - v01) * tx;
      return a + (b - a) * ty;
    };
    const field = (x, y) => (
      noise2(x, y) * 0.6 +
      noise2(x * 2.13 + 11, y * 2.13 + 7) * 0.3 +
      noise2(x * 4.7 - 5, y * 4.7 + 19) * 0.1
    );

    const CELL = 20;
    const SCALE = 0.005;
    const LEVELS = [0.32, 0.42, 0.52, 0.62, 0.72];

    // Local radius (px) and strength (noise-space units) of the cursor's
    // warp — the field itself never moves; only the part of it near the
    // cursor gets pushed, and it settles back once the cursor is far away.
    const RADIUS = 360;
    const STRENGTH = 0.32;

    const traceContours = (ctx, w, h, time, cx, cy, colorFor) => {
      const cols = Math.ceil(w / CELL) + 1;
      const rows = Math.ceil(h / CELL) + 1;
      const grid = new Float32Array(cols * rows);

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const px = i * CELL;
          const py = j * CELL;
          let sx = px * SCALE + time * 0.6;
          let sy = py * SCALE + time;

          const dx = px - cx;
          const dy = py - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < RADIUS && dist > 0.001) {
            const ft = 1 - dist / RADIUS;
            const falloff = ft * ft * (3 - 2 * ft);
            const push = falloff * STRENGTH;
            sx += (dx / dist) * push;
            sy += (dy / dist) * push;
          }

          grid[j * cols + i] = field(sx, sy);
        }
      }
      const at = (i, j) => grid[j * cols + i];
      const lerp = (a, b, level) => (level - a) / (b - a);
      const seg = (a, b) => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); };

      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;

      LEVELS.forEach((level, idx) => {
        ctx.beginPath();
        ctx.strokeStyle = colorFor(idx, LEVELS.length);

        for (let j = 0; j < rows - 1; j++) {
          for (let i = 0; i < cols - 1; i++) {
            const x0 = i * CELL;
            const y0 = j * CELL;
            const tl = at(i, j);
            const tr = at(i + 1, j);
            const br = at(i + 1, j + 1);
            const bl = at(i, j + 1);
            const caseIdx = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) |
                             (br > level ? 2 : 0) | (bl > level ? 1 : 0);
            if (caseIdx === 0 || caseIdx === 15) continue;

            const top = [x0 + lerp(tl, tr, level) * CELL, y0];
            const right = [x0 + CELL, y0 + lerp(tr, br, level) * CELL];
            const bottom = [x0 + lerp(bl, br, level) * CELL, y0 + CELL];
            const left = [x0, y0 + lerp(tl, bl, level) * CELL];

            switch (caseIdx) {
              case 1: case 14: seg(left, bottom); break;
              case 2: case 13: seg(bottom, right); break;
              case 3: case 12: seg(left, right); break;
              case 4: case 11: seg(top, right); break;
              case 6: case 9: seg(top, bottom); break;
              case 7: case 8: seg(top, left); break;
              case 5: seg(top, right); seg(left, bottom); break;
              case 10: seg(top, left); seg(bottom, right); break;
              default: break;
            }
          }
        }
        ctx.stroke();
      });
    };

    // Raw viewport cursor position — starts far off-canvas so nothing
    // warps until the user actually moves the mouse near a canvas.
    let clientX = -99999;
    let clientY = -99999;
    if (hasHover) {
      window.addEventListener('mousemove', (e) => {
        clientX = e.clientX;
        clientY = e.clientY;
      }, { passive: true });
    }

    const CURSOR_LERP = 0.045;

    topoCanvases.forEach((canvas) => {
      const variant = canvas.dataset.topo;
      const ctx = canvas.getContext('2d');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let w = 0;
      let h = 0;
      let running = false;
      let raf = null;
      let cx = -99999;
      let cy = -99999;
      let time = Math.random() * 1000;

      const colorFor = variant === 'dark'
        ? (idx, total) => `rgba(116, 117, 236, ${0.12 - idx * (0.07 / total)})`
        : (idx, total) => `rgba(10, 10, 10, ${0.05 - idx * (0.03 / total)})`;

      const draw = () => traceContours(ctx, w, h, time, cx, cy, colorFor);

      const resize = () => {
        const rect = canvas.parentElement.getBoundingClientRect();
        w = rect.width;
        h = rect.height;
        canvas.width = Math.max(1, Math.round(w * dpr));
        canvas.height = Math.max(1, Math.round(h * dpr));
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        draw();
      };

      const tick = () => {
        time += 0.0006;
        const rect = canvas.getBoundingClientRect();
        const targetX = clientX - rect.left;
        const targetY = clientY - rect.top;
        cx += (targetX - cx) * CURSOR_LERP;
        cy += (targetY - cy) * CURSOR_LERP;
        draw();
        if (running) raf = requestAnimationFrame(tick);
      };

      const start = () => {
        if (prefersReducedMotion) { draw(); return; }
        if (running) return;
        running = true;
        raf = requestAnimationFrame(tick);
      };
      const stop = () => {
        running = false;
        if (raf) cancelAnimationFrame(raf);
      };

      new IntersectionObserver((entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? start() : stop()));
      }, { threshold: 0.05 }).observe(canvas.parentElement);

      window.addEventListener('resize', resize, { passive: true });
      resize();
    });
  }

})();
