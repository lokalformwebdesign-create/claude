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
  sheet?.addEventListener('click', e => { if (e.target.closest('a,button:not([data-theme-toggle])')) setSheet(false); });
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

  /* ---------- Schnellzugriff (oben rechts) ---------- */
  const quick = $('#lfQuick');
  if (quick) {
    const qIn = $('#lfQuickQ'), qBtns = $$('[aria-controls="lfQuick"]'), empty = $('.lf-quick-empty', quick);
    const links = $$('.lf-quick-group a', quick), groupsQ = $$('.lf-quick-group', quick);
    const fine = matchMedia('(pointer: fine)');
    const mobile = matchMedia('(max-width: 1099px)');
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) $$('kbd', quick).concat($$('.lf-qbtn kbd')).forEach(k => { if (k.textContent === 'Strg K') k.textContent = '⌘K'; if (k.textContent === 'Strg') k.textContent = '⌘'; });
    const norm = t => t.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
    let visible = links, sel = -1, qOpener = null;
    const mark = i => { links.forEach(a => a.classList.remove('is-sel')); sel = i; if (visible[i]) { visible[i].classList.add('is-sel'); visible[i].scrollIntoView({ block: 'nearest' }); } };
    const filter = q => {
      const words = norm(q).split(/\s+/).filter(Boolean);
      links.forEach(a => { const hay = norm(a.dataset.k || a.textContent); a.parentElement.hidden = !words.every(w => hay.includes(w)); });
      groupsQ.forEach(g => (g.hidden = !$$('li:not([hidden])', g).length));
      visible = links.filter(a => !a.parentElement.hidden);
      empty.hidden = visible.length > 0;
      mark(words.length ? 0 : -1);
    };
    const setQuick = (open, viaKey) => {
      if (open === quick.classList.contains('open')) return;
      quick.classList.toggle('instant', !!viaKey);
      quick.classList.toggle('open', open);
      quick.toggleAttribute('inert', !open);
      qBtns.forEach(b => b.setAttribute('aria-expanded', String(open)));
      if (open) {
        setSheet(false);
        qOpener = document.activeElement;
        qIn.value = ''; filter('');
        if (mobile.matches) document.body.classList.add('lf-lock');
        if (fine.matches || viaKey) setTimeout(() => qIn.focus({ preventScroll: true }), viaKey ? 0 : 40);
        else quick.focus?.({ preventScroll: true });
      } else {
        document.body.classList.remove('lf-lock');
        if (qOpener && document.contains(qOpener)) qOpener.focus({ preventScroll: true });
      }
    };
    quick.tabIndex = -1;
    qBtns.forEach(b => b.addEventListener('click', e => { e.stopPropagation(); setQuick(!quick.classList.contains('open')); }));
    $('.lf-quick-close', quick).addEventListener('click', () => setQuick(false));
    qIn.addEventListener('input', () => filter(qIn.value));
    quick.addEventListener('click', e => { if (e.target.closest('a,[data-stage]')) setQuick(false); });
    quick.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!visible.length) return;
        const n = e.key === 'ArrowDown' ? (sel + 1) % visible.length : (sel - 1 + visible.length) % visible.length;
        mark(n); visible[n].focus({ preventScroll: true });
      } else if (e.key === 'Enter' && e.target === qIn && visible[Math.max(sel, 0)]) {
        e.preventDefault(); visible[Math.max(sel, 0)].click();
      } else if (e.key === 'Tab') {
        const f = $$('input,button,a', quick).filter(x => !x.closest('[hidden]'));
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    document.addEventListener('click', e => { if (quick.classList.contains('open') && !quick.contains(e.target)) setQuick(false); });
    addEventListener('keydown', e => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setQuick(!quick.classList.contains('open'), true); }
      else if (e.key === '/' && !typing && !quick.classList.contains('open')) { e.preventDefault(); setQuick(true, true); }
      else if (e.key === 'Escape' && quick.classList.contains('open')) { e.stopPropagation(); setQuick(false); }
    }, true);
    burger?.addEventListener('click', () => setQuick(false));
    mobile.addEventListener?.('change', () => setQuick(false));
  }

  /* ---------- Tag / Nacht ---------- */
  const KEY = 'lf-theme', dark = matchMedia('(prefers-color-scheme: dark)');
  const effective = () => root.dataset.theme || (dark.matches ? 'dark' : 'light');
  const syncTheme = () => $$('[data-theme-toggle]').forEach(b => b.setAttribute('aria-checked', String(effective() === 'dark')));
  const applyTheme = t => {
    root.classList.add('lf-theming');
    root.dataset.theme = t;
    try { localStorage.setItem(KEY, t); } catch { /* ohne Speicher nur für diese Seite */ }
    syncTheme();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('lf-theming')));
  };
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-theme-toggle]');
    if (!btn) return;
    const next = effective() === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || reduce.matches) { applyTheme(next); return; }
    const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(() => applyTheme(next));
    vt.ready.then(() => root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.77,0,.175,1)', pseudoElement: '::view-transition-new(root)' }
    )).catch(() => {});
  });
  dark.addEventListener?.('change', syncTheme);
  syncTheme();

  /* ---------- Anfragen & Buchungen zusätzlich an die Lokalform-Zentrale ---------- */
  // Das bisherige System (/api.php) bleibt führend; die Zentrale erhält eine Kopie.
  if (window.fetch && !window.lfMirror) {
    window.lfMirror = true;
    const original = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const result = original(input, init);
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const m = /\/api\.php\?action=(lead|appointment)\b/.exec(url);
        if (m && init && String(init.method).toUpperCase() === 'POST' && typeof init.body === 'string' && !/\/zentrale\//.test(url)) {
          original('/zentrale/api.php?action=' + m[1], { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: init.body }).catch(() => {});
        }
      } catch { /* Kopie ist optional */ }
      return result;
    };
  }

  window.lfReduce = reduce;
})();
