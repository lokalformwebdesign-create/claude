/* Lokalform – Startseite: Zentrale-Vorschau, Bühne, Konfigurator, Anfrage */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Zahlen hochzählen ---------- */
  const countUp = el => {
    const to = Number(el.dataset.count) || 0;
    if (reduce()) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 1100;
    const step = t => {
      const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(to * e);
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  };

  /* ---------- Zentrale-Vorschau: Eingang mit fiktiven Beispieldaten ---------- */
  const consoleEl = $('.lf-console'), rowsEl = $('#lfRows');
  const clock = $('#lfClock');
  if (clock) clock.textContent = 'heute · ' + new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const pool = [
    ['Nordwerk GmbH', 'Website Business'],
    ['Mova Atelier', 'Website Start'],
    ['Kinetic Systems', 'Individuelles System'],
    ['Café am Sternplatz', 'Website Start + Care'],
    ['Salon Beispiel', 'Terminbuchung'],
    ['Praxis Muster', 'Local SEO']
  ];
  const flow = ['Neu', 'Termin', 'In Arbeit', 'Live'];
  const ROW = 46, VISIBLE = 3;
  let rows = [], next = 0, timer = null, visible = false;
  const badge = s => s === 'Live' ? 'lf-badge live' : s === 'Neu' ? 'lf-badge solid' : 'lf-badge';
  const makeRow = (item, status) => {
    const el = document.createElement('div');
    el.className = 'lf-row';
    el.innerHTML = `<b></b><em></em><span></span>`;
    el.children[0].textContent = item[0];
    el.children[1].textContent = item[1];
    const b = el.children[2]; b.className = badge(status); b.textContent = status;
    return { el, status, b };
  };
  const layout = () => rows.forEach((r, i) => { r.el.style.transform = `translateY(${i * ROW}px)`; });
  const setStatus = (r, s) => { r.status = s; r.b.className = badge(s); r.b.textContent = s; };
  const statInbox = $('.lf-stat strong[data-count="12"]');
  const addRow = () => {
    const r = makeRow(pool[next++ % pool.length], 'Neu');
    r.el.classList.add('enter');
    rowsEl.prepend(r.el);
    rows.unshift(r);
    requestAnimationFrame(() => requestAnimationFrame(() => { r.el.classList.remove('enter'); layout(); }));
    if (rows.length > VISIBLE) {
      const out = rows.pop();
      out.el.style.opacity = '0';
      setTimeout(() => out.el.remove(), 500);
    }
    if (statInbox) statInbox.textContent = String(Number(statInbox.textContent) + 1);
  };
  const tick = () => {
    // Erst bestehende Zeilen weiterschalten, dann neue Anfrage
    const movable = rows.filter(r => r.status !== 'Live');
    if (movable.length && Math.random() < 0.6) {
      const r = movable[movable.length - 1];
      setStatus(r, flow[flow.indexOf(r.status) + 1]);
    } else addRow();
  };
  const run = () => { clearInterval(timer); if (visible && !document.hidden && !reduce()) timer = setInterval(tick, 2400); };
  if (rowsEl) {
    // Startzustand: drei Zeilen in unterschiedlichen Phasen
    [['Live', 2], ['In Arbeit', 1], ['Termin', 0]].forEach(([s, i]) => { const r = makeRow(pool[i], s); rowsEl.append(r.el); rows.push(r); });
    next = 3; layout();
    consoleEl?.addEventListener('lf:in', () => { $$('[data-count]', consoleEl).forEach(countUp); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; run(); }, { threshold: 0.2 }).observe(consoleEl);
    }
    document.addEventListener('visibilitychange', run);
  }

  /* ---------- Bühne: Demos & Terminbuchung im Vollbild ---------- */
  const stage = $('#stage'), frame = $('#stageFrame'), title = $('#stageTitle'), closeBtn = $('#stageClose');
  let opener = null;
  // location.replace statt src=, damit die Vorschau keine zusätzlichen Verlaufseinträge erzeugt
  const load = url => { try { frame.contentWindow.location.replace(url === 'about:blank' ? url : new URL(url, location.href).href); } catch { frame.src = url; } };
  const openStage = (url, t, from) => {
    opener = from || document.activeElement;
    load(url);
    title.textContent = t || 'Vorschau';
    stage.removeAttribute('inert');
    stage.setAttribute('aria-hidden', 'false');
    stage.classList.add('open');
    document.body.classList.add('lf-lock');
    history.pushState({ stage: true }, '', '#ansicht');
    setTimeout(() => closeBtn.focus({ preventScroll: true }), 60);
  };
  const closeStage = (fromPop) => {
    if (!stage.classList.contains('open')) return;
    stage.classList.remove('open');
    stage.setAttribute('aria-hidden', 'true');
    stage.setAttribute('inert', '');
    document.body.classList.remove('lf-lock');
    setTimeout(() => { if (!stage.classList.contains('open')) load('about:blank'); }, 520);
    if (!fromPop && history.state?.stage) history.back();
    opener?.focus?.({ preventScroll: true });
  };
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-stage]');
    if (!t) return;
    e.preventDefault();
    openStage(t.dataset.stage, t.dataset.title, t);
  });
  closeBtn?.addEventListener('click', () => closeStage(false));
  addEventListener('keydown', e => { if (e.key === 'Escape') closeStage(false); });
  // Zurück-Geste am Handy schließt die Bühne statt die Seite zu verlassen
  addEventListener('popstate', () => closeStage(true));
  if (location.hash === '#ansicht') history.replaceState(null, '', location.pathname + location.search);

  /* ---------- Ablauf: Linie folgt dem Scrollen ---------- */
  const steps = $('#lfSteps');
  if (steps && window.lfOnScroll) {
    const line = $('.lf-steps-line i', steps), items = $$('.lf-step', steps);
    window.lfOnScroll(() => {
      const r = steps.getBoundingClientRect(), mark = innerHeight * 0.62;
      const p = Math.max(0, Math.min(1, (mark - r.top) / r.height));
      line.style.transform = `scaleY(${p})`;
      items.forEach(it => it.classList.toggle('on', it.getBoundingClientRect().top + 30 < mark));
    });
  }

  /* ---------- Konfigurator ---------- */
  const state = { scope: 'small', features: 'basic', care: 'none' };
  const box = $('#resultBox');
  const render = animate => {
    let name = 'Website Start', price = 'ab 400 €', text = 'Eine klare, hochwertige Website mit den wichtigsten Seiten und Kontaktfunktion.';
    if (state.scope === 'business') { name = 'Website Business'; price = 'ab 600 €'; text = 'Mehrseitige Website für mehrere Leistungen, mehr Inhalt und stärkere SEO-Flächen.'; }
    if (state.scope === 'custom' || state.features === 'system') { name = 'Individuelles Websystem'; price = 'nach Umfang'; text = 'Individuelle Struktur mit erweiterten Funktionen, Adminlogik oder besonderen Prozessen.'; }
    else if (state.features === 'booking') text += ' Mit integrierter Terminbuchung und Übergabe in die Zentrale.';
    const care = state.care === 'care' ? ' + Care 20 €/Monat' : state.care === 'growth' ? ' + Growth 40 €/Monat' : '';
    const apply = () => {
      $('#resultName').textContent = name;
      $('#resultPrice').innerHTML = price + ' <small>einmalig' + care + '</small>';
      $('#resultText').textContent = text;
    };
    if (!animate || reduce()) { apply(); return; }
    box.classList.add('out');
    setTimeout(() => { apply(); box.classList.remove('out'); }, 160);
  };
  $$('[data-choice]').forEach(group => {
    const btns = $$('button', group), ind = $('.lf-seg-ind', group);
    btns.forEach((btn, k) => btn.addEventListener('click', () => {
      btns.forEach(x => { x.classList.toggle('active', x === btn); x.setAttribute('aria-checked', String(x === btn)); });
      ind.style.transform = `translateX(${k * 100}%)`;
      state[group.dataset.choice] = btn.dataset.value;
      render(true);
    }));
    group.addEventListener('keydown', e => {
      const i = btns.findIndex(b => b.classList.contains('active'));
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = btns[(i + d + btns.length) % btns.length]; n.click(); n.focus();
    });
  });
  if (box) render(false);
  $('#usePlan')?.addEventListener('click', () => {
    const form = $('#leadForm');
    form.querySelector('[name=service]').value = state.scope === 'business' ? 'Website Business · ab 600 €' : (state.scope === 'custom' || state.features === 'system') ? 'Individuelles Websystem' : 'Website Start · ab 400 €';
    form.querySelector('[name=message]').value = `Konfigurator: ${$('#resultName').textContent}; Funktionen: ${state.features}; Betreuung: ${state.care}. `;
    form.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => form.querySelector('[name=company]').focus({ preventScroll: true }), reduce() ? 0 : 600);
  });

  /* ---------- Suche → Treffer → Anfrage ---------- */
  const search = $('#lfSearch');
  if (search) {
    const q = $('#lfQuery'), full = q.textContent, funnel = $$('.lf-funnel div', search);
    const finish = () => { search.classList.add('found'); funnel.forEach(f => f.classList.add('on')); };
    if (!reduce()) q.textContent = '';
    search.addEventListener('lf:in', () => {
      if (reduce()) { finish(); return; }
      let i = 0;
      const type = () => {
        q.textContent = full.slice(0, ++i);
        if (i < full.length) setTimeout(type, 38);
        else setTimeout(() => {
          search.classList.add('found');
          funnel.forEach((f, n) => setTimeout(() => f.classList.add('on'), 450 + n * 420));
        }, 280);
      };
      setTimeout(type, 300);
    });
  }

  /* ---------- Anfrageformular → Zentrale ---------- */
  $('#leadForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    const f = new FormData(form);
    const payload = { company: f.get('company') || '', name: f.get('name') || '', email: f.get('email') || '', phone: f.get('phone') || '', service: f.get('service') || '', budget: f.get('budget') || '', message: f.get('message') || '', website: f.get('website') || '', consent: true };
    const out = $('#leadSuccess'), button = form.querySelector('[type=submit]');
    button.disabled = true;
    const label = button.innerHTML; button.textContent = 'Wird gesendet …';
    try {
      const response = await fetch('/api.php?action=lead', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Die Anfrage konnte nicht gesendet werden.');
      out.innerHTML = '<strong>Anfrage sicher übermittelt.</strong><br>Referenz: ' + String(result.reference).replace(/[<>&"]/g, '') + '<br><small>Du erhältst eine persönliche Rückmeldung.</small>';
      out.classList.add('show');
      form.reset();
    } catch (error) {
      out.innerHTML = '<strong>Übermittlung nicht möglich.</strong><br><small></small>';
      out.querySelector('small').textContent = String(error.message || error) + ' Alternativ: webdesign@lokalform.de';
      out.classList.add('show');
    } finally {
      button.disabled = false; button.innerHTML = label;
      out.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'center' });
    }
  });
})();
