/* Lokalform – gemeinsame Shell & Bewegung (alle Seiten) */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Fortschrittsbalken ---------- */
  const bar = $('.lf-progress');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (bar) {
        const max = root.scrollHeight - innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? Math.min(scrollY / max, 1) : 0})`;
      }
      scrollHooks.forEach(fn => fn());
    });
  };
  const scrollHooks = [];
  window.lfOnScroll = fn => { scrollHooks.push(fn); fn(); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });

  /* ---------- Menü (Tablet/Handy) ---------- */
  const burger = $('.lf-burger'), sheet = $('.lf-sheet');
  const setSheet = open => {
    if (!burger || !sheet) return;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    sheet.classList.toggle('open', open);
    sheet.toggleAttribute('inert', !open);
    document.body.classList.toggle('lf-lock', open);
  };
  if (sheet) sheet.setAttribute('inert', '');
  burger?.addEventListener('click', () => setSheet(burger.getAttribute('aria-expanded') !== 'true'));
  sheet?.addEventListener('click', e => { if (e.target.closest('a,button')) setSheet(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && sheet?.classList.contains('open')) { setSheet(false); burger.focus(); } });
  matchMedia('(min-width:1100px)').addEventListener?.('change', e => { if (e.matches) setSheet(false); });

  /* ---------- Scrollspy + gleitender Indikator in der Seitenleiste ---------- */
  const sideNav = $('.lf-side .lf-nav[data-spy]');
  const pill = sideNav ? $('.lf-pill', sideNav) : null;
  const movePill = link => {
    if (!pill) return;
    if (!link) { pill.classList.remove('on'); return; }
    pill.style.transform = `translateY(${link.offsetTop}px)`;
    pill.classList.add('on');
  };
  const spyLinks = $$('.lf-nav[data-spy] a[href^="#"]');
  const targets = [...new Set(spyLinks.map(a => a.getAttribute('href')))]
    .map(h => ({ h, el: h.length > 1 ? document.getElementById(h.slice(1)) : null }))
    .filter(t => t.el);
  if (targets.length) {
    let current = null;
    window.lfOnScroll(() => {
      const line = innerHeight * 0.35;
      let active = targets[0];
      for (const t of targets) if (t.el.getBoundingClientRect().top <= line) active = t;
      if (active === current) return;
      current = active;
      spyLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === active.h));
      movePill(sideNav && $(`a[href="${active.h}"]`, sideNav));
    });
  } else if (sideNav) {
    movePill($('a.is-active', sideNav));
  }
  // Ohne Übergang positionieren, dann animieren
  if (pill) { pill.style.transition = 'none'; requestAnimationFrame(() => requestAnimationFrame(() => (pill.style.transition = ''))); }

  /* ---------- Headline Wort für Wort ---------- */
  $$('.lf-split').forEach(el => {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const w = document.createElement('span'); w.className = 'w';
            const inner = document.createElement('span'); inner.textContent = part;
            inner.style.setProperty('--i', i++);
            w.append(inner); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  });

  /* ---------- Unterseiten automatisch für Reveal markieren ---------- */
  const autoGroups = [
    '.subhero .container', '.t-product .section > .container > *', '.feature-list', '.pricing-grid', '.addons',
    '.service-grid', '.work-grid', '.form-grid', '.t-article .hero .wrap > *', '.t-local .hero .wrap',
    '.t-article .hero-grid > div', '.copy', '.grid3', '.steps', '.links', '.facts', '.faq', '.cta-grid', '.t-legal .hero .wrap', '.t-legal .content > .wrap'
  ];
  if (!$('.lf-home')) {
    $$(autoGroups.join(',')).forEach(group => {
      if (group.closest('[data-r]')) return;
      const kids = [...group.children].filter(k => !k.matches('script,style,input[type=hidden]'));
      if (group.matches('.grid3,.steps,.links,.facts,.feature-list,.pricing-grid,.addons,.service-grid,.work-grid,.faq')) {
        kids.forEach((k, n) => { k.setAttribute('data-r', ''); k.style.setProperty('--d', Math.min(n, 8) * 60 + 'ms'); });
      } else {
        kids.slice(0, 8).forEach((k, n) => { if (!k.closest('[data-r]')) { k.setAttribute('data-r', ''); k.style.setProperty('--d', n * 70 + 'ms'); } });
      }
    });
  }

  /* ---------- Reveal-Beobachter ---------- */
  $$('[data-r-group]').forEach(g => [...g.children].forEach((k, n) => {
    if (!k.hasAttribute('data-r')) k.setAttribute('data-r', '');
    k.style.setProperty('--d', Math.min(n, 10) * Number(g.dataset.rGroup || 70) + 'ms');
  }));
  const watched = $$('[data-r],[data-io],.hero-visual');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      e.target.dispatchEvent(new CustomEvent('lf:in'));
      io.unobserve(e.target);
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    watched.forEach(el => io.observe(el));
  } else watched.forEach(el => el.classList.add('in'));

  /* ---------- Akkordeons: nur eines offen ---------- */
  const groups = new Map();
  $$('details').forEach(d => {
    const g = d.parentElement; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(d);
    d.addEventListener('toggle', () => { if (d.open) groups.get(g).forEach(o => { if (o !== d) o.open = false; }); });
  });

  /* ---------- Jahr ---------- */
  $$('[data-year],#year').forEach(el => (el.textContent = new Date().getFullYear()));

  window.lfReduce = reduce;
})();
