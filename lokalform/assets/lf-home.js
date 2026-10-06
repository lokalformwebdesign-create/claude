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
  // Indikator folgt der aktiven Option – nebeneinander (Desktop) oder untereinander (Handy)
  const placeInd = group => {
    const b = $('button.active', group), ind = $('.lf-seg-ind', group);
    if (!b || !ind) return;
    ind.style.width = b.offsetWidth + 'px'; ind.style.height = b.offsetHeight + 'px';
    ind.style.transform = `translate(${b.offsetLeft}px,${b.offsetTop}px)`;
  };
  addEventListener('resize', () => $$('[data-choice]').forEach(g => { const i = $('.lf-seg-ind', g); i.style.transition = 'none'; placeInd(g); requestAnimationFrame(() => (i.style.transition = '')); }));
  $$('[data-choice]').forEach(group => {
    const btns = $$('button', group), ind = $('.lf-seg-ind', group);
    ind.style.transition = 'none'; placeInd(group); requestAnimationFrame(() => requestAnimationFrame(() => (ind.style.transition = '')));
    btns.forEach((btn, k) => btn.addEventListener('click', () => {
      btns.forEach(x => { x.classList.toggle('active', x === btn); x.setAttribute('aria-checked', String(x === btn)); });
      placeInd(group);
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

  /* ---------- Vorher/Nachher-Regler ---------- */
  const cmp = $('#lfCompare');
  if (cmp) {
    const range = $('#lfCmpRange'), layer = $('#lfCmpNew'), handle = $('#lfCmpHandle');
    const set = v => {
      layer.style.clipPath = `inset(0 0 0 ${v}%)`;
      handle.style.transform = `translateX(${v}%)`;
      range.setAttribute('aria-valuetext', `${Math.round(100 - v)} Prozent Lokalform sichtbar`);
    };
    range.addEventListener('input', () => set(Number(range.value)));
    set(50);
    // Einmaliger Hinweis, dass man ziehen kann
    cmp.addEventListener('lf:in', () => {
      if (reduce()) return;
      let touched = false;
      range.addEventListener('pointerdown', () => (touched = true), { once: true });
      const keys = [[0, 50], [700, 30], [1500, 68], [2200, 50]], t0 = performance.now() + 500;
      const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      const step = now => {
        if (touched) return;
        const t = now - t0;
        if (t < 0) return requestAnimationFrame(step);
        let i = keys.findIndex(k => k[0] > t);
        if (i === -1) { range.value = 50; set(50); return; }
        const [ta, va] = keys[i - 1], [tb, vb] = keys[i];
        const v = va + (vb - va) * ease((t - ta) / (tb - ta));
        range.value = v; set(v);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- Lighthouse-Anzeigen ---------- */
  $$('.lf-gauge').forEach(g => $('.fg', g).style.setProperty('--v', Number(g.dataset.v) / 100));
  $('#lfGauges')?.addEventListener('lf:in', e => $$('[data-count]', e.currentTarget).forEach(countUp));

  /* ---------- Anfrage vorbefüllen (gemeinsam) ---------- */
  const prefillLead = (company, service, message) => {
    const form = $('#leadForm'); if (!form) return;
    if (company) form.querySelector('[name=company]').value = company;
    if (service) form.querySelector('[name=service]').value = service;
    form.querySelector('[name=message]').value = message;
    form.scrollIntoView({ behavior: reduce() ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => form.querySelector(company ? '[name=name]' : '[name=company]').focus({ preventScroll: true }), reduce() ? 0 : 650);
  };

  /* ---------- Ausprobieren: Tabs ---------- */
  const tabs = $$('.lf-tabs [role=tab]'), tabInd = $('.lf-tabs-ind');
  const selectTab = (t, focus) => {
    tabs.forEach((x, i) => {
      const on = x === t;
      x.classList.toggle('active', on); x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
      $('#' + x.getAttribute('aria-controls')).hidden = !on;
      if (on && tabInd) tabInd.style.transform = `translateX(${i * 100}%)`;
    });
    if (focus) t.focus();
  };
  tabs.forEach(t => t.addEventListener('click', () => selectTab(t)));
  $('.lf-tabs')?.addEventListener('keydown', e => {
    const i = tabs.findIndex(t => t.classList.contains('active'));
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (d) { e.preventDefault(); selectTab(tabs[(i + d + tabs.length) % tabs.length], true); }
  });

  /* ---------- Chips (Einfachauswahl) ---------- */
  const chipValue = {};
  $$('[data-chip]').forEach(g => {
    const btns = $$('button', g);
    chipValue[g.dataset.chip] = (btns.find(b => b.classList.contains('active')) || btns[0]).dataset.value;
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', String(x === b)); });
      chipValue[g.dataset.chip] = b.dataset.value;
      g.dispatchEvent(new CustomEvent('lf:chip', { detail: b.dataset.value }));
    }));
    g.addEventListener('keydown', e => {
      const i = btns.findIndex(b => b.classList.contains('active'));
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return; e.preventDefault();
      const n = btns[(i + d + btns.length) % btns.length]; n.click(); n.focus();
    });
  });
  $$('#studioForm,#serpForm').forEach(f => f.addEventListener('submit', e => e.preventDefault()));

  /* ---------- Live-Studio ---------- */
  const BR = {
    handwerk: { l: 'Handwerk', h: o => `Handwerk aus ${o}, das hält.`, s: 'Reparatur, Umbau und Wartung – mit festen Ansprechpartnern.', c: 'Angebot anfragen', v: ['Reparatur', 'Umbau', 'Notdienst'], i: ['Mo–Fr 7–17 Uhr', 'Einsatz im Märkischen Kreis'] },
    cafe: { l: 'Café', h: o => `Frisch geröstet in ${o}.`, s: 'Frühstück, hausgemachter Kuchen und richtig guter Kaffee.', c: 'Tisch reservieren', v: ['Frühstück', 'Kuchen', 'Catering'], i: ['Di–So 8–18 Uhr', 'Plätze drinnen und draußen'] },
    salon: { l: 'Salon', h: o => `Dein Termin in ${o}.`, s: 'Schnitt, Farbe und Pflege – rund um die Uhr online buchbar.', c: 'Termin buchen', v: ['Schnitt', 'Farbe', 'Pflege'], i: ['Di–Sa 9–19 Uhr', 'Online-Buchung jederzeit'] },
    praxis: { l: 'Praxis', h: o => `Gut versorgt in ${o}.`, s: 'Termine online, kurze Wege und klare Informationen.', c: 'Termin vereinbaren', v: ['Sprechzeiten', 'Leistungen', 'Team'], i: ['Mo–Fr 8–12 Uhr', 'Rezepte online bestellen'] }
  };
  const site = $('#phSite');
  if (site) {
    const nameIn = $('#stName'), townIn = $('#stTown');
    const initials = n => (n.trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('') || 'LF').toUpperCase();
    const paint = () => {
      const b = BR[chipValue.branch], name = nameIn.value.trim() || 'Dein Betrieb', o = townIn.value;
      site.dataset.branch = chipValue.branch; site.dataset.style = chipValue.style;
      $('#phName').textContent = name; $('#phLogo').textContent = initials(name);
      $('#phKicker').textContent = `${b.l} · ${o}`; $('#phHead').textContent = b.h(o); $('#phSub').textContent = b.s;
      $('#phCta').textContent = b.c; $('#phBar').textContent = b.c;
      $$('#phCards b').forEach((el, i) => (el.textContent = b.v[i]));
      $('#phInfo1').textContent = b.i[0]; $('#phInfo2').textContent = b.i[1];
    };
    const swap = () => {
      if (reduce()) { paint(); return; }
      site.classList.add('swap');
      setTimeout(() => { paint(); site.classList.remove('swap'); }, 170);
    };
    nameIn.addEventListener('input', paint);
    townIn.addEventListener('change', swap);
    $$('#studioForm [data-chip]').forEach(g => g.addEventListener('lf:chip', swap));
    paint();
    $('#studioUse').addEventListener('click', () => {
      const b = BR[chipValue.branch];
      prefillLead(nameIn.value.trim(), null, `Live-Studio: ${b.l}, Stil „${chipValue.style}“, Ort ${townIn.value}. `);
    });
  }

  /* ---------- Google-Vorschau ---------- */
  const serp = $('#seCard');
  if (serp) {
    const f = id => $('#' + id);
    const ctx = document.createElement('canvas').getContext('2d');
    const LIMIT = { title: 580, desc: 920 };
    const width = (t, px) => { ctx.font = `${px}px Arial, Helvetica, sans-serif`; return ctx.measureText(t).width; };
    const fit = (t, px, max) => {
      if (width(t, px) <= max) return t;
      let lo = 0, hi = t.length;
      while (lo < hi) { const m = (lo + hi + 1) >> 1; if (width(t.slice(0, m) + ' …', px) <= max) lo = m; else hi = m - 1; }
      const cut = t.slice(0, lo); const sp = cut.lastIndexOf(' ');
      return (sp > lo * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,–-]+$/, '') + ' …';
    };
    const slug = t => t.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'dein-betrieb';
    let dirty = { title: false, desc: false };
    const suggest = () => {
      const n = f('seName').value.trim() || 'Dein Betrieb', sv = f('seService').value.trim() || 'Leistung', o = f('seTown').value, u = f('seUsp').value.trim();
      if (!dirty.title) f('seTitle').value = `${sv} in ${o} – ${n}`;
      if (!dirty.desc) f('seDesc').value = `${n}: ${sv} in ${o} und Umgebung.${u ? ' ' + u.replace(/\.$/, '') + '.' : ''} Jetzt unverbindlich Termin anfragen.`;
    };
    const meter = (key, px, el, lab, text) => {
      const w = width(text, px), r = w / LIMIT[key];
      el.style.transform = `scaleX(${Math.min(r, 1)})`;
      el.className = r > 1 ? 'long' : r < 0.45 ? 'short' : '';
      lab.textContent = r > 1 ? 'wird abgeschnitten' : r < 0.45 ? 'eher kurz' : 'passt';
      return r;
    };
    const ring = f('seRing'), checks = $$('#seChecks li');
    const render = () => {
      const n = f('seName').value.trim() || 'Dein Betrieb', sv = f('seService').value.trim(), o = f('seTown').value;
      const title = f('seTitle').value.replace(/\s+/g, ' ').trim(), desc = f('seDesc').value.replace(/\s+/g, ' ').trim();
      f('seSiteName').textContent = n; f('seFav').textContent = (n[0] || 'L').toUpperCase();
      f('seUrl').textContent = `https://www.${slug(n)}.de › ${slug(sv || 'leistungen')}`;
      f('sePrevTitle').textContent = fit(title || n, 20, LIMIT.title);
      f('sePrevDesc').textContent = fit(desc, 14, LIMIT.desc);
      const tr = meter('title', 20, f('seTitleM'), f('seTitleL'), title), dr = meter('desc', 14, f('seDescM'), f('seDescL'), desc);
      const low = t => t.toLowerCase();
      const res = {
        service: !!sv && low(title).includes(low(sv)),
        town: low(title).includes(low(o)),
        tlen: tr <= 1 && tr >= 0.45,
        dlen: dr <= 1 && dr >= 0.45,
        cta: /(jetzt|termin|anfrag|anruf|buch|reserv|kontakt|bestell)/i.test(desc)
      };
      let score = 0;
      checks.forEach(li => { const ok = res[li.dataset.k]; li.classList.toggle('ok', ok); if (ok) score++; });
      f('seScore').textContent = `${score}/5`;
      ring.style.strokeDashoffset = String(1 - score / 5);
      ring.style.stroke = score >= 4 ? '' : score >= 2 ? '#b7791f' : '#c53030';
    };
    ['seName', 'seService', 'seUsp'].forEach(id => f(id).addEventListener('input', () => { suggest(); render(); }));
    f('seTown').addEventListener('change', () => { suggest(); render(); });
    f('seTitle').addEventListener('input', () => { dirty.title = true; render(); });
    f('seDesc').addEventListener('input', () => { dirty.desc = true; render(); });
    f('seReset').addEventListener('click', () => { dirty = { title: false, desc: false }; suggest(); render(); });
    $('[data-chip="device"]').addEventListener('lf:chip', e => { serp.dataset.device = e.detail; });
    suggest(); render();
    // Tab-Wechsel: Messung nach dem Einblenden aktualisieren
    $('#tabB')?.addEventListener('click', () => requestAnimationFrame(render));
    $('#serpUse').addEventListener('click', () => prefillLead(f('seName').value.trim(), 'Local SEO', `Google-Vorschau: Titel „${f('seTitle').value.trim()}“. Bitte Sichtbarkeit verbessern. `));
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
