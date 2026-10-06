/* Lokalform-Zentrale – Anfragen, Termine, Kunden, Rechnungen, Ausgaben, Steuer */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = n => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
  const iso = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };
  const today = () => iso(new Date());
  const addDays = (s, n) => { const d = new Date((s || today()) + 'T12:00'); d.setDate(d.getDate() + n); return iso(d); };
  const dDE = s => s ? new Date(s.length === 10 ? s + 'T12:00' : s).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
  const dLong = s => new Date(s + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  const num = v => { if (typeof v === 'number') return v; let s = String(v || '').replace(/\s/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const n = parseFloat(s); return isFinite(n) ? n : 0; };
  const fmtNum = n => (Number(n) || 0).toLocaleString('de-DE', { maximumFractionDigits: 2 });
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const slugStatus = s => 's-' + String(s || '').toLowerCase().replace(/\s+/g, '-');
  const badge = s => `<span class="z-badge ${esc(slugStatus(s))}">${esc(s)}</span>`;
  const okMail = s => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(s || '');

  const LEAD_STATUS = ['Neu', 'In Bearbeitung', 'Angebot', 'Gewonnen', 'Verloren'];
  const APPT_STATUS = ['Gebucht', 'Bestätigt', 'Erledigt', 'Abgesagt'];
  const INV_STATUS = ['Entwurf', 'Offen', 'Bezahlt', 'Storniert'];
  const EXP_CATS = ['Software', 'Hardware', 'Hosting', 'Werbung', 'Büro', 'Fahrt', 'Weiterbildung', 'Sonstiges'];
  const SERVICES = { 'website-start': 'Website Start', 'website-business': 'Website Business', 'website-individuell': 'Individuelle Website / System', 'care-20': 'Care', 'growth-40': 'Growth', 'seo': 'SEO / Sichtbarkeit' };
  const svc = v => SERVICES[v] || v || '–';

  /* ======================= Daten ======================= */
  const DB = { leads: [], appointments: [], customers: [], invoices: [], expenses: [], settings: {} };
  let csrf = '', demo = false;

  const Demo = {
    key: 'lfz_demo_v1',
    load() {
      try { const s = JSON.parse(localStorage.getItem(this.key) || 'null'); if (s) return s; } catch { /* leer */ }
      return this.seed();
    },
    save(s) { try { localStorage.setItem(this.key, JSON.stringify(s)); } catch { /* ohne Speicher weiter */ } },
    seed() {
      const t = today(), y = t.slice(0, 4), id = p => p + '-DEMO-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      const k1 = id('KD'), k2 = id('KD');
      return {
        leads: [
          { id: id('ANF'), created: addDays(t, 0) + 'T09:12:00', company: 'Nordwerk GmbH', name: 'Jana Beispiel', email: 'jana@nordwerk.example', phone: '02351 000000', service: 'Website Business · ab 600 €', budget: '600–1.000 €', message: 'Wir brauchen eine neue Website mit Leistungsseiten für Dach und Solar.', status: 'Neu', note: '', source: 'Website' },
          { id: id('ANF'), created: addDays(t, -2) + 'T15:40:00', company: 'Café am Sternplatz', name: 'Tom Muster', email: 'tom@cafe.example', phone: '', service: 'Website Start · ab 400 €', budget: '400–600 €', message: 'Speisekarte und Tischreservierung wären toll.', status: 'In Bearbeitung', note: 'Rückruf am Donnerstag.', source: 'Website' },
          { id: id('ANF'), created: addDays(t, -6) + 'T11:05:00', company: 'Salon Beispiel', name: 'Lena Probe', email: 'lena@salon.example', phone: '', service: 'Individuelles Websystem', budget: 'Noch offen', message: 'Online-Terminbuchung für drei Mitarbeiterinnen.', status: 'Angebot', note: 'Angebot verschickt.', source: 'Website' },
          { id: id('ANF'), created: addDays(t, -21) + 'T10:00:00', company: 'Praxis Muster', name: 'Dr. Erika Test', email: 'praxis@muster.example', phone: '', service: 'Local SEO', budget: '600–1.000 €', message: 'Bessere Sichtbarkeit in Lüdenscheid.', status: 'Gewonnen', note: '', source: 'Manuell' }
        ],
        appointments: [
          { id: id('TER'), created: t, service: 'website-business', date: addDays(t, 1), time: '11:00', name: 'Jana Beispiel', company: 'Nordwerk GmbH', email: 'jana@nordwerk.example', phone: '', note: 'Erstgespräch', status: 'Gebucht', source: 'Website' },
          { id: id('TER'), created: t, service: 'website-start', date: addDays(t, 3), time: '14:00', name: 'Tom Muster', company: 'Café am Sternplatz', email: 'tom@cafe.example', phone: '', note: '', status: 'Bestätigt', source: 'Website' },
          { id: id('TER'), created: t, service: 'seo', date: addDays(t, -4), time: '09:00', name: 'Dr. Erika Test', company: 'Praxis Muster', email: 'praxis@muster.example', phone: '', note: '', status: 'Erledigt', source: 'Manuell' }
        ],
        customers: [
          { id: k1, created: t, company: 'Praxis Muster', name: 'Dr. Erika Test', email: 'praxis@muster.example', phone: '', street: 'Beispielweg 1', zip: '58507', city: 'Lüdenscheid', note: 'Growth-Betreuung' },
          { id: k2, created: t, company: 'Bäckerei Probe', name: 'Max Probe', email: 'max@baeckerei.example', phone: '', street: 'Musterstraße 5', zip: '58762', city: 'Altena', note: '' }
        ],
        invoices: [
          { id: id('RE'), number: `RE-${y}-001`, created: t, customerId: k1, recipient: 'Praxis Muster\nDr. Erika Test\nBeispielweg 1\n58507 Lüdenscheid', date: addDays(t, -30), due: addDays(t, -16), service: 'Website Business, Umsetzung', items: [{ text: 'Website Business', qty: 1, price: 600 }, { text: 'Local-SEO-Grundlagen', qty: 1, price: 150 }], small: true, vat: 19, status: 'Bezahlt', paidDate: addDays(t, -20), note: '' },
          { id: id('RE'), number: `RE-${y}-002`, created: t, customerId: k2, recipient: 'Bäckerei Probe\nMax Probe\nMusterstraße 5\n58762 Altena', date: addDays(t, -3), due: addDays(t, 11), service: 'Care-Betreuung, laufender Monat', items: [{ text: 'Care-Betreuung', qty: 1, price: 20 }], small: true, vat: 19, status: 'Offen', paidDate: '', note: '' }
        ],
        expenses: [
          { id: id('AUS'), created: t, date: addDays(t, -12), text: 'Webhosting', category: 'Hosting', amount: 9.0, note: '' },
          { id: id('AUS'), created: t, date: addDays(t, -40), text: 'Design-Software', category: 'Software', amount: 24.99, note: '' }
        ],
        settings: { name: 'Nevio Turturro', company: 'Lokalform', street: 'Niederwehberg 1', zip: '58507', city: 'Lüdenscheid', email: 'webdesign@lokalform.de', phone: '0160 5959013', taxNumber: '', vatId: '', bank: '', iban: '', bic: '', kleinunternehmer: true, footer: '' },
        seq: {}
      };
    },
    handle(action, body) {
      const s = this.load();
      const prefix = { leads: 'ANF', appointments: 'TER', customers: 'KD', invoices: 'RE', expenses: 'AUS' };
      if (action === 'data') { this.save(s); const { seq, ...data } = s; return { ok: true, data: JSON.parse(JSON.stringify(data)) }; }
      if (action === 'save') {
        const col = body.collection, item = { ...body.item, updated: new Date().toISOString() };
        const i = s[col].findIndex(x => x.id && x.id === item.id);
        if (i < 0) {
          item.id = prefix[col] + '-DEMO-' + Math.random().toString(36).slice(2, 7).toUpperCase(); item.created = new Date().toISOString();
          if (col === 'invoices') { const y = (item.date || today()).slice(0, 4); s.seq[y] = (s.seq[y] || s.invoices.filter(x => (x.number || '').includes(y)).length) + 1; item.number = `RE-${y}-${String(s.seq[y]).padStart(3, '0')}`; }
          s[col].unshift(item);
        } else { item.number = s[col][i].number; item.created = s[col][i].created; s[col][i] = item; }
        this.save(s); return { ok: true, item: JSON.parse(JSON.stringify(item)) };
      }
      if (action === 'delete') { s[body.collection] = s[body.collection].filter(x => x.id !== body.id); this.save(s); return { ok: true }; }
      if (action === 'settings') { s.settings = body.settings; this.save(s); return { ok: true, settings: body.settings }; }
      if (action === 'logout') { try { localStorage.removeItem(this.key); } catch { /* egal */ } return { ok: true }; }
      return { ok: false, error: 'Nicht verfügbar.' };
    }
  };

  const api = async (action, body) => {
    if (demo) return Demo.handle(action, body);
    const r = await fetch('api.php?action=' + action, {
      method: body ? 'POST' : 'GET', credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF': csrf } : { 'Accept': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    let j; try { j = await r.json(); } catch { throw new Error('Der Server antwortet nicht. Bitte später erneut versuchen.'); }
    if (r.status === 401) { location.href = './'; throw new Error('Bitte erneut anmelden.'); }
    if (!r.ok || !j.ok) throw new Error(j.error || 'Aktion fehlgeschlagen.');
    return j;
  };

  /* ======================= Berechnungen ======================= */
  const invTotals = inv => {
    const net = (inv.items || []).reduce((a, it) => a + num(it.qty) * num(it.price), 0);
    const rate = inv.small ? 0 : Number(inv.vat) || 0;
    const vat = Math.round(net * rate) / 100;
    return { net, vat, rate, total: net + vat };
  };
  const invState = inv => inv.status === 'Offen' && inv.due && inv.due < today() ? 'Überfällig' : inv.status;
  const upcoming = a => a.date >= today() && a.status !== 'Abgesagt';
  const year = s => (s || '').slice(0, 4);

  /* ======================= Oberfläche ======================= */
  const view = $('#zView');
  const ui = { leadFilter: 'Alle', leadQ: '', apptFilter: 'Kommend', custQ: '', invFilter: 'Alle', expYear: today().slice(0, 4), taxYear: today().slice(0, 4) };
  const VIEWS = {
    uebersicht: { title: 'Übersicht', kicker: 'Heute', render: renderOverview },
    anfragen: { title: 'Anfragen', kicker: 'Eingang', render: renderLeads, add: () => openLead(null) },
    termine: { title: 'Termine', kicker: 'Kalender', render: renderAppts, add: () => openAppt(null) },
    kunden: { title: 'Kunden', kicker: 'Kontakte', render: renderCustomers, add: () => openCustomer(null) },
    rechnungen: { title: 'Rechnungen', kicker: 'Abrechnung', render: renderInvoices, add: () => openInvoice(null), extra: '<button type="button" class="z-btn ghost" data-act="sender">Absenderdaten</button>' },
    ausgaben: { title: 'Ausgaben', kicker: 'Belege', render: renderExpenses, add: () => openExpense(null) },
    steuer: { title: 'Steuer', kicker: 'Überblick', render: renderTax }
  };
  let current = 'uebersicht';

  function route() {
    const key = (location.hash || '#uebersicht').slice(1);
    current = VIEWS[key] ? key : 'uebersicht';
    const v = VIEWS[current];
    $('#zTitle').textContent = v.title; $('#zTopTitle').textContent = v.title; $('#zKicker').textContent = v.kicker;
    document.title = v.title + ' · Zentrale · Lokalform';
    $('#zActions').innerHTML = (v.extra || '') + (v.add ? '<button type="button" class="z-btn" data-act="add">+ Neu</button>' : '');
    $('#zTopAdd').hidden = !v.add;
    $$('[data-view]').forEach(a => a.classList.toggle('active', a.dataset.view === current));
    const link = $(`#zNav a[data-view="${current}"]`), pill = $('.z-pill');
    if (link && pill) pill.style.transform = `translateY(${link.offsetTop}px)`;
    setMore(false);
    render();
  }
  function render() {
    view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
    VIEWS[current].render();
    counts();
  }
  function counts() {
    const c = { leads: DB.leads.filter(l => l.status === 'Neu').length, appointments: DB.appointments.filter(a => upcoming(a) && a.status === 'Gebucht').length, invoices: DB.invoices.filter(i => invState(i) === 'Überfällig').length };
    $$('[data-count]').forEach(el => { const n = c[el.dataset.count]; el.textContent = n ? String(n) : ''; });
  }
  const empty = t => `<div class="z-empty">${esc(t)}</div>`;
  const chips = (list, active, name, countFn) => `<div class="z-chips" role="group" aria-label="Filter">${list.map(x => `<button type="button" data-chip="${esc(name)}" data-v="${esc(x)}" class="${x === active ? 'active' : ''}" aria-pressed="${x === active}">${esc(x)}${countFn ? `<em>${countFn(x)}</em>` : ''}</button>`).join('')}</div>`;

  /* ---------- Übersicht ---------- */
  function renderOverview() {
    const y = today().slice(0, 4), wk = addDays(today(), 7);
    const newLeads = DB.leads.filter(l => l.status === 'Neu').length;
    const next = DB.appointments.filter(a => upcoming(a) && a.date <= wk).length;
    const open = DB.invoices.filter(i => i.status === 'Offen').reduce((a, i) => a + invTotals(i).total, 0);
    const income = DB.invoices.filter(i => i.status === 'Bezahlt' && year(i.paidDate || i.date) === y).reduce((a, i) => a + invTotals(i).total, 0);
    const leads = DB.leads.slice().sort((a, b) => (b.created || '').localeCompare(a.created || '')).slice(0, 5);
    const appts = DB.appointments.filter(upcoming).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 5);
    view.innerHTML = `
      <div class="z-kpis">
        <a class="z-kpi" href="#anfragen"><small>Neue Anfragen</small><strong>${newLeads}</strong></a>
        <a class="z-kpi" href="#termine"><small>Termine · 7 Tage</small><strong>${next}</strong></a>
        <a class="z-kpi" href="#rechnungen"><small>Offene Rechnungen</small><strong>${esc(eur(open))}</strong></a>
        <a class="z-kpi" href="#steuer"><small>Einnahmen ${esc(y)}</small><strong>${esc(eur(income))}</strong></a>
      </div>
      <div class="z-grid2">
        <section class="z-panel"><h2>Neueste Anfragen <a href="#anfragen">Alle</a></h2><ul class="z-list">${leads.map(leadRow).join('') || '<li>' + empty('Noch keine Anfragen. Sie erscheinen hier, sobald jemand das Formular auf der Website absendet.') + '</li>'}</ul></section>
        <section class="z-panel"><h2>Nächste Termine <a href="#termine">Alle</a></h2><ul class="z-list">${appts.map(apptRow).join('') || '<li>' + empty('Keine anstehenden Termine.') + '</li>'}</ul></section>
      </div>`;
  }
  const leadRow = l => `<li><button type="button" class="z-row" data-open="lead" data-id="${esc(l.id)}"><div><b>${esc(l.company || l.name || 'Ohne Namen')}</b><span>${esc([l.company ? l.name : '', l.service, dDE(l.created)].filter(Boolean).join(' · '))}</span></div><div class="r">${badge(l.status)}</div></button></li>`;
  const apptRow = a => `<li><button type="button" class="z-row" data-open="appt" data-id="${esc(a.id)}"><div><b>${esc(dLong(a.date))} · ${esc(a.time)}</b><span>${esc([a.name, a.company, svc(a.service)].filter(Boolean).join(' · '))}</span></div><div class="r">${badge(a.status)}</div></button></li>`;

  /* ---------- Anfragen ---------- */
  function renderLeads() {
    view.innerHTML = `<div class="z-toolbar"><input class="z-search" type="search" placeholder="Suchen: Name, Firma, E-Mail …" aria-label="Anfragen durchsuchen" id="zLeadQ" value="${esc(ui.leadQ)}">${chips(['Alle', ...LEAD_STATUS], ui.leadFilter, 'lead', s => s === 'Alle' ? DB.leads.length : DB.leads.filter(l => l.status === s).length)}</div><section class="z-panel"><ul class="z-list" id="zLeadList"></ul></section>`;
    const list = () => {
      const q = ui.leadQ.toLowerCase();
      const rows = DB.leads.filter(l => (ui.leadFilter === 'Alle' || l.status === ui.leadFilter) && (!q || [l.company, l.name, l.email, l.message, l.phone].join(' ').toLowerCase().includes(q)))
        .sort((a, b) => (b.created || '').localeCompare(a.created || ''));
      $('#zLeadList').innerHTML = rows.map(leadRow).join('') || '<li>' + empty(q || ui.leadFilter !== 'Alle' ? 'Keine Anfragen für diesen Filter.' : 'Noch keine Anfragen. Neue Anfragen von der Website erscheinen automatisch hier.') + '</li>';
    };
    $('#zLeadQ').addEventListener('input', e => { ui.leadQ = e.target.value; list(); });
    list();
  }

  /* ---------- Termine ---------- */
  function renderAppts() {
    view.innerHTML = `<div class="z-toolbar">${chips(['Kommend', 'Vergangen', 'Alle'], ui.apptFilter, 'appt')}</div><div id="zApptList"></div>`;
    let rows = DB.appointments.slice();
    if (ui.apptFilter === 'Kommend') rows = rows.filter(a => a.date >= today());
    if (ui.apptFilter === 'Vergangen') rows = rows.filter(a => a.date < today());
    rows.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    if (ui.apptFilter === 'Vergangen') rows.reverse();
    const groups = {};
    rows.forEach(a => (groups[a.date] = groups[a.date] || []).push(a));
    $('#zApptList').innerHTML = Object.keys(groups).map(d => `<div class="z-section-title">${esc(dLong(d))}${d === today() ? ' · heute' : ''}</div><section class="z-panel"><ul class="z-list">${groups[d].map(a => `<li><button type="button" class="z-row" data-open="appt" data-id="${esc(a.id)}"><div><b>${esc(a.time)} · ${esc(a.name || 'Ohne Namen')}</b><span>${esc([a.company, svc(a.service)].filter(Boolean).join(' · '))}</span></div><div class="r">${badge(a.status)}</div></button></li>`).join('')}</ul></section>`).join('')
      || `<section class="z-panel">${empty(ui.apptFilter === 'Kommend' ? 'Keine anstehenden Termine. Buchungen über die Website erscheinen automatisch hier.' : 'Keine Termine.')}</section>`;
  }

  /* ---------- Kunden ---------- */
  function renderCustomers() {
    view.innerHTML = `<div class="z-toolbar"><input class="z-search" type="search" placeholder="Kunden suchen …" aria-label="Kunden durchsuchen" id="zCustQ" value="${esc(ui.custQ)}"></div><section class="z-panel"><ul class="z-list" id="zCustList"></ul></section>`;
    const list = () => {
      const q = ui.custQ.toLowerCase();
      const rows = DB.customers.filter(c => !q || [c.company, c.name, c.email, c.city].join(' ').toLowerCase().includes(q)).sort((a, b) => (a.company || a.name).localeCompare(b.company || b.name, 'de'));
      $('#zCustList').innerHTML = rows.map(c => {
        const n = DB.invoices.filter(i => i.customerId === c.id).length;
        return `<li><button type="button" class="z-row" data-open="customer" data-id="${esc(c.id)}"><div><b>${esc(c.company || c.name || 'Ohne Namen')}</b><span>${esc([c.company ? c.name : '', c.city, c.email].filter(Boolean).join(' · '))}</span></div><div class="r"><span>${n} ${n === 1 ? 'Rechnung' : 'Rechnungen'}</span></div></button></li>`;
      }).join('') || '<li>' + empty(q ? 'Kein Kunde gefunden.' : 'Noch keine Kunden. Lege einen an oder übernimm eine Anfrage als Kunde.') + '</li>';
    };
    $('#zCustQ').addEventListener('input', e => { ui.custQ = e.target.value; list(); });
    list();
  }

  /* ---------- Rechnungen ---------- */
  function renderInvoices() {
    const states = ['Alle', 'Entwurf', 'Offen', 'Überfällig', 'Bezahlt', 'Storniert'];
    const rows = DB.invoices.filter(i => ui.invFilter === 'Alle' || invState(i) === ui.invFilter || (ui.invFilter === 'Offen' && invState(i) === 'Überfällig'))
      .sort((a, b) => (b.date + b.number).localeCompare(a.date + a.number));
    view.innerHTML = `<div class="z-toolbar">${chips(states, ui.invFilter, 'inv', s => s === 'Alle' ? DB.invoices.length : DB.invoices.filter(i => invState(i) === s || (s === 'Offen' && invState(i) === 'Überfällig')).length)}</div>
      <section class="z-panel"><ul class="z-list">${rows.map(i => `<li><button type="button" class="z-row" data-open="invoice" data-id="${esc(i.id)}"><div><b>${esc(i.number || 'Entwurf')} · ${esc((i.recipient || '').split('\n')[0] || 'Ohne Empfänger')}</b><span>${esc(dDE(i.date))}${i.due ? ' · fällig ' + esc(dDE(i.due)) : ''}</span></div><div class="r"><span class="amt">${esc(eur(invTotals(i).total))}</span>${badge(invState(i))}</div></button></li>`).join('') || '<li>' + empty('Keine Rechnungen für diesen Filter.') + '</li>'}</ul></section>
      ${!DB.settings.taxNumber && !DB.settings.vatId ? '<p class="z-note">Tipp: Hinterlege unter „Absenderdaten“ deine Steuernummer und Bankverbindung – beides gehört auf jede Rechnung.</p>' : ''}`;
  }

  /* ---------- Ausgaben ---------- */
  function renderExpenses() {
    const years = [...new Set([today().slice(0, 4), ...DB.expenses.map(e => year(e.date))])].sort().reverse();
    const rows = DB.expenses.filter(e => year(e.date) === ui.expYear).sort((a, b) => b.date.localeCompare(a.date));
    const sum = rows.reduce((a, e) => a + num(e.amount), 0);
    view.innerHTML = `<div class="z-toolbar">${chips(years, ui.expYear, 'expyear')}</div>
      <div class="z-kpis" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="z-kpi"><small>Ausgaben ${esc(ui.expYear)}</small><strong>${esc(eur(sum))}</strong></div><div class="z-kpi"><small>Belege</small><strong>${rows.length}</strong></div></div>
      <section class="z-panel"><ul class="z-list">${rows.map(e => `<li><button type="button" class="z-row" data-open="expense" data-id="${esc(e.id)}"><div><b>${esc(e.text || 'Ohne Beschreibung')}</b><span>${esc(dDE(e.date))} · ${esc(e.category)}</span></div><div class="r"><span class="amt">${esc(eur(e.amount))}</span></div></button></li>`).join('') || '<li>' + empty('Keine Ausgaben in diesem Jahr.') + '</li>'}</ul></section>`;
  }

  /* ---------- Steuer ---------- */
  function renderTax() {
    const years = [...new Set([today().slice(0, 4), ...DB.invoices.map(i => year(i.paidDate || i.date)), ...DB.expenses.map(e => year(e.date))])].filter(Boolean).sort().reverse();
    const Y = ui.taxYear, prev = String(Number(Y) - 1);
    const paid = y => DB.invoices.filter(i => i.status === 'Bezahlt' && year(i.paidDate || i.date) === y);
    const revenue = y => paid(y).reduce((a, i) => a + invTotals(i).net, 0);
    const income = y => paid(y).reduce((a, i) => a + invTotals(i).total, 0);
    const vat = y => paid(y).reduce((a, i) => a + invTotals(i).vat, 0);
    const spend = y => DB.expenses.filter(e => year(e.date) === y).reduce((a, e) => a + num(e.amount), 0);
    const q = (y, n) => {
      const inQ = d => year(d) === y && Math.ceil(Number((d || '').slice(5, 7)) / 3) === n;
      const inc = DB.invoices.filter(i => i.status === 'Bezahlt' && inQ(i.paidDate || i.date)).reduce((a, i) => a + invTotals(i).total, 0);
      const out = DB.expenses.filter(e => inQ(e.date)).reduce((a, e) => a + num(e.amount), 0);
      return { inc, out };
    };
    const openSum = DB.invoices.filter(i => i.status === 'Offen').reduce((a, i) => a + invTotals(i).total, 0);
    const bar = (v, max) => { const r = Math.min(v / max, 1); return `<div class="z-bar"><i class="${r > .9 ? 'bad' : r > .7 ? 'warn' : ''}" style="transform:scaleX(${r.toFixed(3)})"></i></div>`; };
    view.innerHTML = `<div class="z-toolbar">${chips(years, Y, 'taxyear')}</div>
      <div class="z-kpis">
        <div class="z-kpi"><small>Einnahmen ${esc(Y)}</small><strong>${esc(eur(income(Y)))}</strong></div>
        <div class="z-kpi"><small>Ausgaben ${esc(Y)}</small><strong>${esc(eur(spend(Y)))}</strong></div>
        <div class="z-kpi"><small>Überschuss</small><strong>${esc(eur(income(Y) - spend(Y)))}</strong></div>
        <div class="z-kpi"><small>Offene Forderungen</small><strong>${esc(eur(openSum))}</strong></div>
      </div>
      <div class="z-grid2">
        <section class="z-panel"><h2>Quartale ${esc(Y)}</h2><div class="z-table-wrap"><table class="z-table"><thead><tr><th>Quartal</th><th class="n">Einnahmen</th><th class="n">Ausgaben</th><th class="n">Ergebnis</th></tr></thead><tbody>${[1, 2, 3, 4].map(n => { const r = q(Y, n); return `<tr><td>Q${n}</td><td class="n">${esc(eur(r.inc))}</td><td class="n">${esc(eur(r.out))}</td><td class="n">${esc(eur(r.inc - r.out))}</td></tr>`; }).join('')}</tbody></table></div></section>
        <section class="z-panel"><h2>Kleinunternehmerregelung (§ 19 UStG)</h2><div style="padding:16px;display:grid;gap:14px">
          <div><div style="display:flex;justify-content:space-between;gap:10px;font-size:14px;margin-bottom:6px"><span>Umsatz ${esc(prev)} · Grenze 25.000 €</span><b>${esc(eur(revenue(prev)))}</b></div>${bar(revenue(prev), 25000)}</div>
          <div><div style="display:flex;justify-content:space-between;gap:10px;font-size:14px;margin-bottom:6px"><span>Umsatz ${esc(Y)} · Grenze 100.000 €</span><b>${esc(eur(revenue(Y)))}</b></div>${bar(revenue(Y), 100000)}</div>
          <div style="font-size:14px">Ausgewiesene Umsatzsteuer ${esc(Y)}: <b>${esc(eur(vat(Y)))}</b></div>
        </div></section>
      </div>
      <p class="z-note">Berechnet aus bezahlten Rechnungen (nach Zahlungsdatum) und erfassten Ausgaben. Dient zur Orientierung und ersetzt keine Steuerberatung, EÜR oder ELSTER-Meldung.</p>`;
  }

  /* ======================= Formulare ======================= */
  const field = (f, v) => {
    const id = 'f_' + f.k, full = f.full ? ' full' : '';
    const val = v ?? '';
    if (f.type === 'select') return `<label class="z-field${full}" for="${id}">${esc(f.label)}<select id="${id}" name="${esc(f.k)}">${f.options.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(ov)}"${String(ov) === String(val) ? ' selected' : ''}>${esc(ol)}</option>`; }).join('')}</select></label>`;
    if (f.type === 'textarea') return `<label class="z-field${full}" for="${id}">${esc(f.label)}<textarea id="${id}" name="${esc(f.k)}" maxlength="${f.max || 4000}" ${f.rows ? `rows="${f.rows}"` : ''}>${esc(val)}</textarea></label>`;
    if (f.type === 'check') return `<label class="z-check${full}" for="${id}" style="grid-column:1/-1"><input type="checkbox" id="${id}" name="${esc(f.k)}"${val ? ' checked' : ''}> ${esc(f.label)}</label>`;
    const extra = f.type === 'money' ? 'inputmode="decimal" autocomplete="off"' : f.type === 'email' ? 'inputmode="email" autocomplete="off"' : f.type === 'tel' ? 'inputmode="tel" autocomplete="off"' : 'autocomplete="off"';
    const type = f.type === 'money' ? 'text' : (f.type || 'text');
    const shown = f.type === 'money' ? (val === '' ? '' : fmtNum(val)) : val;
    return `<label class="z-field${full}" for="${id}">${esc(f.label)}<input id="${id}" name="${esc(f.k)}" type="${esc(type)}" value="${esc(shown)}" ${extra} ${f.req ? 'required' : ''} maxlength="${f.max || 200}"></label>`;
  };
  const readForm = (form, fields) => {
    const out = {};
    fields.forEach(f => {
      const el = form.elements[f.k]; if (!el) return;
      out[f.k] = f.type === 'check' ? el.checked : f.type === 'money' ? num(el.value) : el.value.trim();
    });
    return out;
  };
  const contactActions = x => {
    const a = [];
    if (okMail(x.email)) a.push(`<a class="z-btn ghost sm" href="mailto:${esc(x.email)}?subject=${esc(encodeURIComponent('Deine Anfrage bei Lokalform'))}">E-Mail schreiben</a>`);
    if ((x.phone || '').replace(/[^\d+]/g, '').length > 4) a.push(`<a class="z-btn ghost sm" href="tel:${esc(x.phone.replace(/[^\d+]/g, ''))}">Anrufen</a>`);
    return a.length ? `<div class="z-actions" style="margin:0 0 12px">${a.join('')}</div>` : '';
  };

  async function save(col, item, msg) {
    try {
      const r = await api('save', { collection: col, item });
      const i = DB[col].findIndex(x => x.id === r.item.id);
      if (i < 0) DB[col].unshift(r.item); else DB[col][i] = r.item;
      toast(msg || 'Gespeichert');
      return r.item;
    } catch (e) { toast(e.message, true); return null; }
  }
  async function remove(col, id, label) {
    if (!(await confirmBox(`${label} wirklich löschen? Das lässt sich nicht rückgängig machen.`))) return false;
    try { await api('delete', { collection: col, id }); DB[col] = DB[col].filter(x => x.id !== id); toast('Gelöscht'); return true; }
    catch (e) { toast(e.message, true); return false; }
  }
  function formDrawer({ title, col, item, fields, before = '', after = '', label, extraButtons = '', onSaved, onMount, transform }) {
    const isNew = !item;
    const html = `${before}<form id="zForm" novalidate><div class="z-fields">${fields.map(f => field(f, item ? item[f.k] : f.def)).join('')}</div>${after}
      <div class="z-actions"><button class="z-btn" type="submit">Speichern</button>${extraButtons}${isNew ? '' : '<button class="z-btn ghost" type="button" data-del>Löschen</button>'}</div></form>`;
    openDrawer(title, html);
    const form = $('#zForm');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const miss = fields.find(f => f.req && !form.elements[f.k].value.trim());
      if (miss) { toast(`Bitte „${miss.label}“ ausfüllen.`, true); form.elements[miss.k].focus(); return; }
      let data = { ...(item || {}), ...readForm(form, fields) };
      if (transform) data = transform(data, form);
      const btn = form.querySelector('[type=submit]'); btn.disabled = true;
      const saved = await save(col, data);
      btn.disabled = false;
      if (saved) { if (onSaved) onSaved(saved); else { closeDrawer(); render(); } }
    });
    form.querySelector('[data-del]')?.addEventListener('click', async () => { if (await remove(col, item.id, label)) { closeDrawer(); render(); } });
    if (onMount) onMount(form);
  }

  /* ---------- Anfrage ---------- */
  function openLead(id) {
    const l = id ? DB.leads.find(x => x.id === id) : null;
    const fields = [
      { k: 'status', label: 'Status', type: 'select', options: LEAD_STATUS, def: 'Neu' },
      { k: 'company', label: 'Unternehmen', max: 120 }, { k: 'name', label: 'Name', max: 120, req: true },
      { k: 'email', label: 'E-Mail', type: 'email', max: 160 }, { k: 'phone', label: 'Telefon', type: 'tel', max: 60 },
      { k: 'service', label: 'Leistung', max: 120 }, { k: 'budget', label: 'Budget', max: 60 },
      { k: 'message', label: 'Nachricht', type: 'textarea', full: true, max: 4000 },
      { k: 'note', label: 'Interne Notiz', type: 'textarea', full: true, max: 4000, rows: 3 }
    ];
    const before = l ? `<div class="z-detail"><dl><dt>Eingang</dt><dd>${esc(dDE(l.created))}${l.created && l.created.length > 10 ? ', ' + esc(new Date(l.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })) + ' Uhr' : ''}</dd><dt>Quelle</dt><dd>${esc(l.source || 'Website')}</dd><dt>Referenz</dt><dd>${esc(l.id)}</dd></dl></div>${contactActions(l)}` : '';
    formDrawer({
      title: l ? (l.company || l.name || 'Anfrage') : 'Neue Anfrage', col: 'leads', item: l, fields, before, label: 'Diese Anfrage',
      extraButtons: l ? '<button class="z-btn ghost" type="button" data-tocust>Als Kunde übernehmen</button>' : '',
      onMount: form => form.querySelector('[data-tocust]')?.addEventListener('click', async () => {
        const c = await save('customers', { company: l.company, name: l.name, email: l.email, phone: l.phone, note: `Aus Anfrage ${l.id}` }, 'Kunde angelegt');
        if (c) { if (l.status === 'Neu' || l.status === 'In Bearbeitung' || l.status === 'Angebot') await save('leads', { ...l, status: 'Gewonnen' }, 'Kunde angelegt'); closeDrawer(); location.hash = '#kunden'; setTimeout(() => openCustomer(c.id), 120); }
      })
    });
  }

  /* ---------- Termin ---------- */
  function openAppt(id) {
    const a = id ? DB.appointments.find(x => x.id === id) : null;
    const svcOptions = [['', '–'], ...Object.entries(SERVICES)];
    if (a && a.service && !SERVICES[a.service]) svcOptions.push([a.service, a.service]);
    const fields = [
      { k: 'status', label: 'Status', type: 'select', options: APPT_STATUS, def: 'Bestätigt' },
      { k: 'service', label: 'Thema', type: 'select', options: svcOptions },
      { k: 'date', label: 'Datum', type: 'date', req: true, def: today() }, { k: 'time', label: 'Uhrzeit', type: 'time', req: true, def: '10:00' },
      { k: 'name', label: 'Name', req: true, max: 120 }, { k: 'company', label: 'Unternehmen', max: 120 },
      { k: 'email', label: 'E-Mail', type: 'email', max: 160 }, { k: 'phone', label: 'Telefon', type: 'tel', max: 60 },
      { k: 'note', label: 'Notiz', type: 'textarea', full: true, max: 2000, rows: 3 }
    ];
    formDrawer({ title: a ? `${dDE(a.date)} · ${a.time}` : 'Neuer Termin', col: 'appointments', item: a, fields, before: a ? contactActions(a) : '', label: 'Dieser Termin' });
  }

  /* ---------- Kunde ---------- */
  function openCustomer(id) {
    const c = id ? DB.customers.find(x => x.id === id) : null;
    const fields = [
      { k: 'company', label: 'Unternehmen', max: 120 }, { k: 'name', label: 'Ansprechpartner', max: 120 },
      { k: 'email', label: 'E-Mail', type: 'email', max: 160 }, { k: 'phone', label: 'Telefon', type: 'tel', max: 60 },
      { k: 'street', label: 'Straße und Nr.', full: true, max: 160 }, { k: 'zip', label: 'PLZ', max: 10 }, { k: 'city', label: 'Ort', max: 80 },
      { k: 'note', label: 'Notiz', type: 'textarea', full: true, max: 4000, rows: 3 }
    ];
    const inv = c ? DB.invoices.filter(i => i.customerId === c.id) : [];
    const after = c ? `<div class="z-section-title">Rechnungen</div><section class="z-panel"><ul class="z-list">${inv.map(i => `<li><button type="button" class="z-row" data-open="invoice" data-id="${esc(i.id)}"><div><b>${esc(i.number)}</b><span>${esc(dDE(i.date))}</span></div><div class="r"><span class="amt">${esc(eur(invTotals(i).total))}</span>${badge(invState(i))}</div></button></li>`).join('') || '<li>' + empty('Noch keine Rechnungen.') + '</li>'}</ul></section>` : '';
    formDrawer({
      title: c ? (c.company || c.name) : 'Neuer Kunde', col: 'customers', item: c, fields, before: c ? contactActions(c) : '', after, label: 'Dieser Kunde',
      extraButtons: c ? '<button class="z-btn ghost" type="button" data-newinv>Rechnung erstellen</button>' : '',
      transform: d => { if (!d.company && !d.name) d.name = 'Ohne Namen'; return d; },
      onMount: form => form.querySelector('[data-newinv]')?.addEventListener('click', () => { closeDrawer(); location.hash = '#rechnungen'; setTimeout(() => openInvoice(null, c.id), 380); })
    });
  }
  const addressOf = c => [c.company, c.name, c.street, [c.zip, c.city].filter(Boolean).join(' ')].filter(Boolean).join('\n');

  /* ---------- Rechnung ---------- */
  function openInvoice(id, customerId) {
    const inv = id ? DB.invoices.find(x => x.id === id) : null;
    const cust = customerId ? DB.customers.find(c => c.id === customerId) : null;
    const base = inv || { customerId: cust?.id || '', recipient: cust ? addressOf(cust) : '', date: today(), due: addDays(today(), 14), service: '', items: [{ text: '', qty: 1, price: 0 }], small: DB.settings.kleinunternehmer !== false, vat: 19, status: 'Entwurf', paidDate: '', note: '' };
    const custOpts = [['', 'Kunde wählen …'], ...DB.customers.map(c => [c.id, c.company || c.name])];
    const fields = [
      { k: 'customerId', label: 'Kunde', type: 'select', options: custOpts, full: true },
      { k: 'recipient', label: 'Empfänger (Anschrift)', type: 'textarea', full: true, max: 600, rows: 4 },
      { k: 'date', label: 'Rechnungsdatum', type: 'date' }, { k: 'due', label: 'Fällig am', type: 'date' },
      { k: 'service', label: 'Leistung / Leistungszeitraum', full: true, max: 200 },
      { k: 'status', label: 'Status', type: 'select', options: INV_STATUS }, { k: 'paidDate', label: 'Bezahlt am', type: 'date' },
      { k: 'small', label: 'Kleinunternehmer – keine Umsatzsteuer (§ 19 UStG)', type: 'check' },
      { k: 'vat', label: 'Umsatzsteuer', type: 'select', options: [[19, '19 %'], [7, '7 %'], [0, '0 %']] },
      { k: 'note', label: 'Hinweis auf der Rechnung', type: 'textarea', full: true, max: 1000, rows: 2 }
    ];
    const itemRow = (it = {}) => `<div class="z-item"><input name="it_text" placeholder="Leistung" aria-label="Leistung" value="${esc(it.text || '')}" maxlength="300"><input name="it_qty" inputmode="decimal" aria-label="Menge" value="${esc(fmtNum(it.qty ?? 1))}"><input name="it_price" inputmode="decimal" aria-label="Einzelpreis in Euro" placeholder="Preis €" value="${esc(it.price ? fmtNum(it.price) : '')}"><button type="button" class="z-icon-btn" data-delitem aria-label="Position entfernen">×</button></div>`;
    const after = `<div class="z-section-title">Positionen</div><div class="z-items" id="zItems">${(base.items.length ? base.items : [{}]).map(itemRow).join('')}</div>
      <button type="button" class="z-btn ghost sm" id="zAddItem" style="margin-top:8px">+ Position</button>
      <div class="z-sum" id="zSum"></div>`;
    const before = `<div class="z-detail"><dl><dt>Nummer</dt><dd>${esc(inv?.number || 'wird beim Speichern vergeben')}</dd></dl></div>`;
    const collect = form => $$('.z-item', form).map(r => ({ text: r.querySelector('[name=it_text]').value.trim(), qty: num(r.querySelector('[name=it_qty]').value), price: num(r.querySelector('[name=it_price]').value) })).filter(it => it.text);
    formDrawer({
      title: inv ? inv.number : 'Neue Rechnung', col: 'invoices', item: inv ? inv : null, fields: fields.map(f => ({ ...f, def: base[f.k] })), before, after, label: 'Diese Rechnung',
      extraButtons: '<button class="z-btn ghost" type="button" data-print>Drucken / PDF</button>',
      transform: (d, form) => { d.items = collect(form); d.small = form.elements.small.checked; d.vat = Number(form.elements.vat.value); if (d.status === 'Bezahlt' && !d.paidDate) d.paidDate = today(); return d; },
      onSaved: saved => { render(); openInvoice(saved.id); },
      onMount: form => {
        const items = $('#zItems', form);
        const sync = () => {
          form.elements.vat.closest('.z-field').hidden = form.elements.small.checked;
          form.elements.paidDate.closest('.z-field').hidden = form.elements.status.value !== 'Bezahlt';
          renderSum();
        };
        function renderSum() {
          const t = invTotals({ items: collect(form), small: form.elements.small.checked, vat: Number(form.elements.vat.value) });
          $('#zSum', form).innerHTML = `<div><span>Netto</span><span>${esc(eur(t.net))}</span></div>${form.elements.small.checked ? '<div><span>Umsatzsteuer</span><span>entfällt (§ 19 UStG)</span></div>' : `<div><span>Umsatzsteuer ${t.rate} %</span><span>${esc(eur(t.vat))}</span></div>`}<div><span>Gesamt</span><span>${esc(eur(t.total))}</span></div>`;
        }
        form.addEventListener('input', e => { if (e.target.name?.startsWith('it_')) renderSum(); });
        form.addEventListener('change', sync);
        form.elements.customerId.addEventListener('change', e => { const c = DB.customers.find(x => x.id === e.target.value); if (c) form.elements.recipient.value = addressOf(c); });
        $('#zAddItem', form).addEventListener('click', () => { items.insertAdjacentHTML('beforeend', itemRow()); items.lastElementChild.querySelector('input').focus(); });
        items.addEventListener('click', e => { const b = e.target.closest('[data-delitem]'); if (!b) return; if ($$('.z-item', items).length > 1) b.closest('.z-item').remove(); else b.closest('.z-item').querySelectorAll('input').forEach((i, n) => (i.value = n === 1 ? '1' : '')); renderSum(); });
        form.querySelector('[data-print]').addEventListener('click', async () => {
          let d = { ...(inv || {}), ...readForm(form, fields) };
          d.items = collect(form); d.small = form.elements.small.checked; d.vat = Number(form.elements.vat.value);
          if (!d.items.length) { toast('Bitte mindestens eine Position eintragen.', true); return; }
          const saved = await save('invoices', d, 'Gespeichert – Druckansicht wird geöffnet');
          if (saved) { render(); printInvoice(saved); openInvoice(saved.id); }
        });
        sync();
      }
    });
  }
  function printInvoice(inv) {
    const s = DB.settings || {}, t = invTotals(inv);
    const seal = $('.z-side-brand .z-seal')?.outerHTML || '';
    $('#zPrint').innerHTML = `
      <div class="inv-head"><div><b>${esc(s.company || 'Lokalform')}</b>${[s.name, s.street, [s.zip, s.city].filter(Boolean).join(' ')].filter(Boolean).map(x => '<br>' + esc(x)).join('')}</div>${seal}</div>
      <div class="inv-from">${esc([s.company || s.name, s.street, [s.zip, s.city].filter(Boolean).join(' ')].filter(Boolean).join(' · '))}</div>
      <div style="display:flex;justify-content:space-between;gap:20px"><div class="inv-to">${esc(inv.recipient || '')}</div>
      <div class="inv-meta">Rechnungsnummer: <b>${esc(inv.number)}</b><br>Rechnungsdatum: ${esc(dDE(inv.date))}<br>${inv.service ? 'Leistung: ' + esc(inv.service) + '<br>' : ''}${inv.due ? 'Zahlbar bis: ' + esc(dDE(inv.due)) : ''}</div></div>
      <div class="inv-title">Rechnung</div>
      <table class="inv-table"><thead><tr><th>Pos.</th><th>Leistung</th><th class="n">Menge</th><th class="n">Einzelpreis</th><th class="n">Betrag</th></tr></thead><tbody>
      ${inv.items.map((it, n) => `<tr><td>${n + 1}</td><td>${esc(it.text)}</td><td class="n">${esc(fmtNum(it.qty))}</td><td class="n">${esc(eur(it.price))}</td><td class="n">${esc(eur(num(it.qty) * num(it.price)))}</td></tr>`).join('')}</tbody></table>
      <div class="inv-total"><div><span>Netto</span><span>${esc(eur(t.net))}</span></div>${inv.small ? '' : `<div><span>USt. ${t.rate} %</span><span>${esc(eur(t.vat))}</span></div>`}<div><span>Gesamtbetrag</span><span>${esc(eur(t.total))}</span></div></div>
      ${inv.small ? '<p>Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</p>' : ''}
      ${inv.note ? `<p>${esc(inv.note)}</p>` : ''}
      ${s.footer ? `<p>${esc(s.footer)}</p>` : ''}
      <div class="inv-foot"><div>${[s.company || 'Lokalform', s.name, s.street, [s.zip, s.city].filter(Boolean).join(' ')].filter(Boolean).map(esc).join('<br>')}</div><div>${s.email ? 'E-Mail: ' + esc(s.email) + '<br>' : ''}${s.phone ? 'Telefon: ' + esc(s.phone) + '<br>' : ''}${s.taxNumber ? 'Steuernummer: ' + esc(s.taxNumber) + '<br>' : ''}${s.vatId ? 'USt-IdNr.: ' + esc(s.vatId) : ''}</div><div>${s.bank ? esc(s.bank) + '<br>' : ''}${s.iban ? 'IBAN: ' + esc(s.iban) + '<br>' : ''}${s.bic ? 'BIC: ' + esc(s.bic) : ''}</div></div>`;
    document.body.classList.add('z-printing');
    const done = () => { document.body.classList.remove('z-printing'); removeEventListener('afterprint', done); };
    addEventListener('afterprint', done);
    setTimeout(() => { try { window.print(); } catch { /* Druck nicht verfügbar */ } setTimeout(done, 1000); }, 50);
  }
  function openSender() {
    const s = DB.settings || {};
    const fields = [
      { k: 'company', label: 'Firma', max: 120 }, { k: 'name', label: 'Inhaber', max: 120 },
      { k: 'street', label: 'Straße und Nr.', full: true, max: 160 }, { k: 'zip', label: 'PLZ', max: 10 }, { k: 'city', label: 'Ort', max: 80 },
      { k: 'email', label: 'E-Mail', type: 'email', max: 160 }, { k: 'phone', label: 'Telefon', type: 'tel', max: 60 },
      { k: 'taxNumber', label: 'Steuernummer', max: 40 }, { k: 'vatId', label: 'USt-IdNr. (falls vorhanden)', max: 20 },
      { k: 'bank', label: 'Bank', max: 80 }, { k: 'iban', label: 'IBAN', max: 40 }, { k: 'bic', label: 'BIC', max: 15 },
      { k: 'kleinunternehmer', label: 'Neue Rechnungen als Kleinunternehmer (§ 19 UStG) anlegen', type: 'check' },
      { k: 'footer', label: 'Zusatztext auf jeder Rechnung', type: 'textarea', full: true, max: 500, rows: 2 }
    ];
    openDrawer('Absenderdaten', `<form id="zForm" novalidate><div class="z-fields">${fields.map(f => field(f, s[f.k])).join('')}</div><div class="z-actions"><button class="z-btn" type="submit">Speichern</button></div></form>`);
    $('#zForm').addEventListener('submit', async e => {
      e.preventDefault();
      try { const r = await api('settings', { settings: readForm(e.target, fields) }); DB.settings = r.settings; toast('Absenderdaten gespeichert'); closeDrawer(); render(); }
      catch (err) { toast(err.message, true); }
    });
  }

  /* ---------- Ausgabe ---------- */
  function openExpense(id) {
    const x = id ? DB.expenses.find(e => e.id === id) : null;
    const fields = [
      { k: 'date', label: 'Datum', type: 'date', def: today(), req: true }, { k: 'amount', label: 'Betrag (brutto, €)', type: 'money', req: true },
      { k: 'text', label: 'Beschreibung', full: true, max: 200, req: true }, { k: 'category', label: 'Kategorie', type: 'select', options: EXP_CATS, def: 'Sonstiges' },
      { k: 'note', label: 'Notiz', type: 'textarea', full: true, max: 1000, rows: 2 }
    ];
    formDrawer({ title: x ? x.text : 'Neue Ausgabe', col: 'expenses', item: x, fields, label: 'Diese Ausgabe', onSaved: s => { ui.expYear = year(s.date); closeDrawer(); render(); } });
  }

  /* ======================= Drawer, Bestätigung, Hinweise ======================= */
  const drawer = $('#zDrawer');
  let opener = null;
  function openDrawer(title, html) {
    if (!drawer.classList.contains('open')) opener = document.activeElement;
    $('#zDrawerTitle').textContent = title;
    $('#zDrawerBody').innerHTML = html;
    $('#zDrawerBody').scrollTop = 0;
    drawer.removeAttribute('inert'); drawer.setAttribute('aria-hidden', 'false'); drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => (matchMedia('(pointer:fine)').matches ? $('#zDrawerBody input, #zDrawerBody select, #zDrawerBody textarea') : $('.z-drawer-card [data-act=close]'))?.focus({ preventScroll: true }), 80);
  }
  function closeDrawer() {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); drawer.setAttribute('inert', '');
    document.body.style.overflow = '';
    opener?.focus?.({ preventScroll: true });
  }
  function confirmBox(text) {
    return new Promise(res => {
      const box = $('#zConfirm'); $('#zConfirmText').textContent = text; box.hidden = false;
      const prev = document.activeElement;
      $('[data-confirm=no]', box).focus();
      const done = v => { box.hidden = true; box.removeEventListener('click', onClick); removeEventListener('keydown', onKey, true); prev?.focus?.(); res(v); };
      const onClick = e => { const b = e.target.closest('[data-confirm]'); if (b) done(b.dataset.confirm === 'yes'); else if (e.target === box) done(false); };
      const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } };
      box.addEventListener('click', onClick); addEventListener('keydown', onKey, true);
    });
  }
  let toastTimer;
  function toast(msg, err) {
    const t = $('#zToast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), err ? 4200 : 2200);
  }
  function setMore(open) {
    const m = $('#zMore'), b = $('[data-act=more]'); if (!m) return;
    m.hidden = !open; b?.setAttribute('aria-expanded', String(open));
    if (open) $('a,button', m)?.focus();
  }

  /* ======================= Ereignisse ======================= */
  document.addEventListener('click', async e => {
    const open = e.target.closest('[data-open]');
    if (open) { const f = { lead: openLead, appt: openAppt, customer: openCustomer, invoice: openInvoice, expense: openExpense }[open.dataset.open]; if (f) f(open.dataset.id); return; }
    const chip = e.target.closest('[data-chip]');
    if (chip) { const k = { lead: 'leadFilter', appt: 'apptFilter', inv: 'invFilter', expyear: 'expYear', taxyear: 'taxYear' }[chip.dataset.chip]; ui[k] = chip.dataset.v; render(); return; }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) { if (e.target.closest('#zMore a')) setMore(false); else if (e.target.id === 'zMore') setMore(false); return; }
    if (act === 'add') VIEWS[current].add?.();
    if (act === 'sender') openSender();
    if (act === 'close') closeDrawer();
    if (act === 'more') setMore($('#zMore').hidden);
    if (act === 'logout') { try { await api('logout', {}); } catch { /* trotzdem weiter */ } location.href = demo ? location.pathname : './'; }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#zMore').hidden) setMore(false); else closeDrawer(); } });
  addEventListener('hashchange', () => { closeDrawer(); route(); window.scrollTo(0, 0); });
  addEventListener('resize', () => { const link = $(`#zNav a[data-view="${current}"]`), pill = $('.z-pill'); if (link && pill) pill.style.transform = `translateY(${link.offsetTop}px)`; });

  /* ======================= Tag / Nacht ======================= */
  const darkMq = matchMedia('(prefers-color-scheme: dark)');
  const theme = () => document.documentElement.dataset.theme || (darkMq.matches ? 'dark' : 'light');
  const syncTheme = () => $$('[data-theme-toggle]').forEach(b => b.setAttribute('aria-checked', String(theme() === 'dark')));
  const setTheme = t => {
    const root = document.documentElement;
    root.classList.add('z-theming'); root.dataset.theme = t;
    try { localStorage.setItem('lf-theme', t); } catch { /* nur für diese Sitzung */ }
    syncTheme();
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('z-theming')));
  };
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-theme-toggle]'); if (!btn) return;
    const next = theme() === 'dark' ? 'light' : 'dark';
    if (!document.startViewTransition || reduce()) { setTheme(next); return; }
    const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(() => setTheme(next)).ready.then(() => document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.77,0,.175,1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
  });
  darkMq.addEventListener?.('change', syncTheme);
  syncTheme();

  /* ======================= Start ======================= */
  async function boot() {
    try {
      const r = await fetch('api.php?action=me', { credentials: 'same-origin', headers: { 'Accept': 'application/json' } });
      if (!(r.headers.get('content-type') || '').includes('json')) throw new Error('kein Server');
      const j = await r.json();
      if (r.status === 401) { location.href = './'; return; }
      if (!j.ok) throw new Error(j.error);
      csrf = j.csrf;
    } catch (err) {
      if (/(^|\.)lokalform\.de$/.test(location.hostname)) { view.innerHTML = '<div class="z-alert err">Die Zentrale ist gerade nicht erreichbar. Bitte Seite neu laden.</div>'; return; }
      demo = true; $('#zDemo').hidden = false;
    }
    try { const j = await api('data'); Object.assign(DB, j.data); }
    catch (err) { view.innerHTML = `<div class="z-alert err">${esc(err.message)}</div>`; return; }
    const pill = $('.z-pill'); if (pill) { pill.style.transition = 'none'; route(); requestAnimationFrame(() => requestAnimationFrame(() => (pill.style.transition = ''))); } else route();
    // Neue Anfragen von der Website ohne Neuladen anzeigen
    if (!demo) setInterval(async () => {
      if (document.hidden || drawer.classList.contains('open')) return;
      try { const j = await api('data'); const before = DB.leads.length + DB.appointments.length; Object.assign(DB, j.data); if (DB.leads.length + DB.appointments.length !== before) { render(); toast('Neue Einträge eingegangen'); } } catch { /* nächster Versuch */ }
    }, 60000);
  }
  boot();
})();
