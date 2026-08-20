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
  const ring = document.getElementById('cursorRing');
  const label = document.getElementById('cursorLabel');

  if (hasHover) {
    let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
      if (label) label.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%) scale(${label.classList.contains('is-active') ? 1 : 0.6})`;
    });

    const followRing = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(followRing);
    };
    requestAnimationFrame(followRing);

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('[data-cursor="hover"]')) ring.classList.add('is-hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('[data-cursor="hover"]')) ring.classList.remove('is-hover');
    });

    /* cursor label morph over case-study media */
    if (label) {
      document.querySelectorAll('[data-cursor-text]').forEach((el) => {
        el.addEventListener('mouseenter', () => {
          label.textContent = el.getAttribute('data-cursor-text');
          label.classList.add('is-active');
          dot.classList.add('is-hidden');
          ring.classList.add('is-hidden');
        });
        el.addEventListener('mouseleave', () => {
          label.classList.remove('is-active');
          dot.classList.remove('is-hidden');
          ring.classList.remove('is-hidden');
        });
      });
    }

    /* magnetic buttons */
    document.querySelectorAll('.btn').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const relX = e.clientX - (rect.left + rect.width / 2);
        const relY = e.clientY - (rect.top + rect.height / 2);
        btn.style.transition = 'transform 0.15s ease-out';
        btn.style.transform = `translate(${relX * 0.25}px, ${relY * 0.35}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        btn.style.transform = 'translate(0, 0)';
      });
    });
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

  const darkSections = document.querySelectorAll('.hero, .industries, .packages, .site-footer');

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);

    const navMid = header.offsetHeight / 2;
    let overDark = false;
    darkSections.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top <= navMid && rect.bottom >= navMid) overDark = true;
    });
    header.classList.toggle('is-over-dark', overDark);

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

})();
