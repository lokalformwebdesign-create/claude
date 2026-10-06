"""Baut die neu gestaltete Lokalform-Website aus dem Original-Mirror.

- index.html: komplett neues Markup (index_body.html) + Original-<head> (SEO/Schema)
- alle anderen Seiten: Inhalt + Skripte bleiben, Style/Header/Footer werden ersetzt
"""
import re, sys, pathlib

SRC = pathlib.Path(sys.argv[1])   # Original-Mirror
OUT = pathlib.Path(sys.argv[2])   # Ziel (Repo)
HERE = pathlib.Path(__file__).parent

HEAD_EXTRA = (
    '<meta name="theme-color" content="#000000">\n'
    '<meta property="og:locale" content="de_DE">\n'
    '<link rel="stylesheet" href="assets/lf.css?v=2">\n'
    '<script>document.documentElement.classList.add("js");'
    'try{if(window.self!==window.top)document.documentElement.classList.add("in-frame")}catch(e){document.documentElement.classList.add("in-frame")}</script>\n'
)

HOME_NAV = [("#top", "Übersicht"), ("#arbeiten", "Arbeiten"), ("#labor", "Ausprobieren"), ("#leistungen", "Leistungen"), ("#prozess", "Ablauf"),
            ("#preise", "Preise"), ("#seo", "Sichtbarkeit"), ("#region", "Region"), ("#anfrage", "Anfrage")]
PAGES = [("webdesign-luedenscheid.html", "Lüdenscheid"), ("preise.html", "Alle Preise"), ("referenzen.html", "Referenzen"),
         ("wissen.html", "Wissen"), ("termine.html", "Termin buchen")]


def seal(cls="", label="Lokalform Logo"):
    """LF-Monogramm (Kreis, LF, Linie, LOKALFORM) – Farbe über currentColor."""
    return (f'<svg class="lf-seal {cls}" viewBox="82 82 916 916" role="img" aria-label="{label}">'
            '<circle class="s-ring" cx="540" cy="540" r="452" pathLength="1" fill="none" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke"/>'
            '<g class="s-lf" fill="currentColor"><path d="M387 390H439V558H540V605H387Z"/><path d="M545 390H697V433H603V461H690V515H603V605H545Z"/></g>'
            '<line class="s-line" x1="348" y1="699" x2="732" y2="699" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke"/>'
            '<text class="s-word" x="360" y="766" textLength="362" lengthAdjust="spacing" font-family="Arial,Helvetica,sans-serif" font-size="40" fill="currentColor">LOKALFORM</text>'
            '</svg>')


def nav_links(items, current, prefix=""):
    out = []
    for href, label in items:
        full = prefix + href if href.startswith("#") else href
        active = ' class="is-active" aria-current="page"' if href == current else ""
        out.append(f'<a href="{full}"{active}>{label}</a>')
    return "".join(out)


def shell(page):
    home = page == "index.html"
    prefix = "" if home else "index.html"
    studio = nav_links(HOME_NAV, None, prefix)
    pages = nav_links(PAGES, page)
    studio_attr = ' data-spy' if home else ''
    pages_attr = '' if home else ' data-spy'
    if home:
        cta = '<button type="button" class="lf-btn light" data-stage="termine.html" data-title="Termin buchen">Termin buchen <span class="ar" aria-hidden="true">↗</span></button>'
        top_cta = '<button type="button" class="lf-btn light" data-stage="termine.html" data-title="Termin buchen">Termin<span class="lf-hide-xs">&nbsp;buchen</span></button>'
    else:
        cta = '<a class="lf-btn light" href="termine.html">Termin buchen <span class="ar" aria-hidden="true">↗</span></a>'
        top_cta = '<a class="lf-btn light" href="termine.html">Termin<span class="lf-hide-xs">&nbsp;buchen</span></a>'
    brand_href = "#top" if home else "index.html"
    return f'''<a class="lf-skip" href="#main">Zum Inhalt</a>
<div class="lf-progress" aria-hidden="true"></div>
<aside class="lf-side" aria-label="Hauptnavigation">
  <a class="lf-brand" href="{brand_href}" aria-label="Lokalform – Startseite"><i></i>LOKALFORM</a>
  <div class="lf-group"><span>Studio</span><nav class="lf-nav"{studio_attr}><i class="lf-pill" aria-hidden="true"></i>{studio}</nav></div>
  <div class="lf-group"><span>Seiten</span><nav class="lf-nav"{pages_attr}><i class="lf-pill" aria-hidden="true"></i>{pages}</nav></div>
  <div class="lf-side-foot">
    <div class="lf-status"><b aria-hidden="true"></b>Neue Projekte möglich</div>
    {cta}
    <p><a href="mailto:webdesign@lokalform.de">webdesign@lokalform.de</a></p>
  </div>
</aside>
<header class="lf-top">
  <a class="lf-brand" href="{brand_href}" aria-label="Lokalform – Startseite"><i></i>LOKALFORM</a>
  <div class="lf-top-actions">{top_cta}<button type="button" class="lf-burger" aria-expanded="false" aria-controls="lfSheet" aria-label="Menü öffnen"><span></span></button></div>
</header>
<div class="lf-sheet" id="lfSheet">
  <div class="lf-group"><span>Studio</span><nav class="lf-nav" aria-label="Studio">{studio}</nav></div>
  <div class="lf-group"><span>Seiten</span><nav class="lf-nav" aria-label="Seiten">{pages}</nav></div>
  {cta}
  <a class="lf-sheet-mail" href="mailto:webdesign@lokalform.de">webdesign@lokalform.de</a>
</div>
'''


def footer(page):
    home = page == "index.html"
    p = "" if home else "index.html"
    termin = ('<button type="button" data-stage="termine.html" data-title="Termin buchen">Termin buchen</button>'
              if home else '<a href="termine.html">Termin buchen</a>')
    return f'''<footer class="lf-foot">
  <div class="lf-wrap">
    <div class="lf-foot-grid">
      <div><a class="lf-foot-seal" href="{p or '#'}top" aria-label="Lokalform – nach oben">{seal("", "Lokalform")}</a><p>Individuelles Webdesign, digitale Systeme und Local SEO für Unternehmen in Lüdenscheid, im Märkischen Kreis und darüber hinaus.</p>
        <address class="lf-nap"><strong>Lokalform</strong><br>Niederwehberg 1<br>58507 Lüdenscheid<br><a href="tel:+491605959013">0160 5959013</a><br><a href="mailto:webdesign@lokalform.de">webdesign@lokalform.de</a></address></div>
      <div><p class="lf-foot-h">Leistungen</p><nav aria-label="Leistungen"><a href="webdesign-luedenscheid.html">Webdesign Lüdenscheid</a><a href="website-start.html">Website Start</a><a href="website-business.html">Website Business</a><a href="website-individuell.html">Individuell</a><a href="local-seo.html">Local SEO</a></nav></div>
      <div><p class="lf-foot-h">Studio</p><nav aria-label="Studio"><a href="{p}#arbeiten">Arbeiten</a><a href="preise.html">Preise</a><a href="referenzen.html">Referenzen</a><a href="wissen.html">Wissen</a>{termin}</nav></div>
      <div><p class="lf-foot-h">Rechtlich</p><nav aria-label="Rechtliches"><a href="impressum.html">Impressum</a><a href="datenschutz.html">Datenschutz</a><a href="cookies.html">Cookies</a><a href="agb.html">AGB</a><a href="widerruf.html">Widerruf</a><a href="mailto:webdesign@lokalform.de">webdesign@lokalform.de</a></nav></div>
    </div>
    <div class="lf-wordmark" data-r aria-hidden="true"><span><i></i>LOKALFORM</span></div>
    <div class="lf-foot-bottom"><span>© <span data-year></span> Lokalform</span><span>Webdesign · Systeme · Local SEO</span></div>
  </div>
</footer>
'''


def head_of(html):
    head = html[: html.find("</head>")]
    head = re.sub(r"<style>.*?</style>", "", head, flags=re.S)
    head = re.sub(r'<meta name="theme-color"[^>]*>', "", head)
    return head + HEAD_EXTRA + "</head>\n"


TEMPLATE = {}
for f in ["website-start", "website-business", "website-individuell", "care-20", "growth-40", "preise", "referenzen", "termine"]:
    TEMPLATE[f + ".html"] = "t-product"
for f in ["local-seo", "webdesign-dienstleister", "webdesign-handwerker", "webdesign-kleine-unternehmen", "webdesign-kosten",
          "website-checkliste", "website-erstellen-lassen", "website-relaunch", "wissen"]:
    TEMPLATE[f + ".html"] = "t-article"
TEMPLATE["webdesign-luedenscheid.html"] = "t-local"
for f in ["agb", "cookies", "datenschutz", "widerruf", "impressum"]:
    TEMPLATE[f + ".html"] = "t-legal"


LH = {"PERF": "95", "A11Y": "98", "BP": "96", "SEO": "100"}
if len(sys.argv) > 3:
    import json
    cats = json.load(open(sys.argv[3]))["categories"]
    LH = {"PERF": cats["performance"], "A11Y": cats["accessibility"], "BP": cats["best-practices"], "SEO": cats["seo"]}
    LH = {k: str(round(v["score"] * 100)) for k, v in LH.items()}

TOWNS = ["Lüdenscheid", "Altena", "Balve", "Halver", "Hemer", "Herscheid", "Iserlohn", "Kierspe", "Meinerzhagen", "Menden (Sauerland)",
         "Nachrodt-Wiblingwerde", "Neuenrade", "Plettenberg", "Schalksmühle", "Werdohl"]


def jsonld_index():
    import json
    org = "https://lokalform.de/#organization"
    biz = {
        "@type": "ProfessionalService", "@id": "https://lokalform.de/#service", "name": "Lokalform",
        "alternateName": "Lokalform Webdesign", "url": "https://lokalform.de/",
        "description": "Individuelles Webdesign, digitale Systeme und Local SEO für Unternehmen in Lüdenscheid und im Märkischen Kreis.",
        "image": "https://lokalform.de/assets/og-image.png", "logo": "https://lokalform.de/assets/icon-512.png",
        "email": "webdesign@lokalform.de", "telephone": "+49 160 5959013", "priceRange": "ab 400 €",
        "address": {"@type": "PostalAddress", "streetAddress": "Niederwehberg 1", "postalCode": "58507",
                    "addressLocality": "Lüdenscheid", "addressRegion": "Nordrhein-Westfalen", "addressCountry": "DE"},
        "areaServed": [{"@type": "City", "name": t} for t in TOWNS] + [{"@type": "AdministrativeArea", "name": "Märkischer Kreis"}],
        "provider": {"@id": org}, "founder": {"@type": "Person", "name": "Nevio Turturro"},
        "knowsAbout": ["Webdesign", "Local SEO", "Responsive Webdesign", "Terminbuchung", "Suchmaschinenoptimierung"],
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Leistungen", "itemListElement": [
            {"@type": "Offer", "name": n, "url": "https://lokalform.de/" + u,
             "priceSpecification": {"@type": "PriceSpecification", "minPrice": pr, "priceCurrency": "EUR", **({"unitText": "Monat"} if m else {})}}
            for n, u, pr, m in [("Website Start", "website-start.html", 400, False), ("Website Business", "website-business.html", 600, False),
                                ("Care Betreuung", "care-20.html", 20, True), ("Growth Betreuung", "growth-40.html", 40, True)]]},
    }
    faq = [("Ist jede Website individuell?", "Ja. Struktur, Typografie, Bildsprache, Seitenrhythmus und Funktionen werden passend zum Unternehmen entwickelt. Die drei Demo-Websites zeigen bewusst völlig verschiedene Ansätze."),
           ("Kann ich später Funktionen ergänzen?", "Ja. Terminbuchung, Landingpages, Formulare, Kundenbereiche, Adminfunktionen und weitere Inhalte können ergänzt werden."),
           ("Wie funktionieren Care und Growth?", "Care für 20 €/Monat deckt die grundlegende laufende Betreuung ab. Growth für 40 €/Monat ergänzt priorisierte Änderungen sowie Local-SEO- und Content-Hinweise."),
           ("Kann ich Rechnungen und Anfragen verwalten?", "Die Lokalform-Zentrale enthält Anfragen, Termine, Kunden, Rechnungen, Ausgaben und eine Steuerübersicht. Für den echten Mehrgerätebetrieb wird sie beim Livegang an ein geschütztes Backend angebunden.")]
    graph = [
        {"@type": "Organization", "@id": org, "name": "Lokalform", "url": "https://lokalform.de/",
         "logo": {"@type": "ImageObject", "url": "https://lokalform.de/assets/icon-512.png", "width": 512, "height": 512},
         "email": "webdesign@lokalform.de", "telephone": "+49 160 5959013",
         "address": biz["address"]},
        {"@type": "WebSite", "@id": "https://lokalform.de/#website", "url": "https://lokalform.de/", "name": "Lokalform",
         "alternateName": "Lokalform Webdesign", "publisher": {"@id": org}, "inLanguage": "de-DE"},
        biz,
        {"@type": "WebPage", "@id": "https://lokalform.de/#webpage", "url": "https://lokalform.de/",
         "name": "Lokalform – Webdesign in Lüdenscheid für Unternehmen", "isPartOf": {"@id": "https://lokalform.de/#website"},
         "about": {"@id": "https://lokalform.de/#service"}, "inLanguage": "de-DE",
         "primaryImageOfPage": {"@type": "ImageObject", "url": "https://lokalform.de/assets/og-image.png"}},
        {"@type": "FAQPage", "@id": "https://lokalform.de/#faq", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
    ]
    return '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False, separators=(",", ":")) + "</script>"


def build_index():
    src = (SRC / "index.html").read_text()
    src = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda m: jsonld_index(), src, count=1, flags=re.S)
    body = (HERE / "index_body.html").read_text()
    for k, v in LH.items():
        body = body.replace("{" + k + "}", v)
    body = body.replace("{{SHELL}}", shell("index.html")).replace("{{FOOT}}", footer("index.html")).replace("{{SEAL}}", seal("lf-stamp-seal"))
    return head_of(src) + body


def build_sub(name, tpl):
    html = (SRC / name).read_text()
    head = head_of(html)
    body = html[html.find("<body"):]
    body = re.sub(r"<body[^>]*>", f'<body class="{tpl}">', body, count=1)
    # alte Shell-Teile entfernen
    body = re.sub(r'<a class="skip"[^>]*>.*?</a>', "", body, count=1, flags=re.S)
    body = re.sub(r'<div class="progress"></div>', "", body, count=1)
    body = re.sub(r"<header\b.*?</header>", "", body, count=1, flags=re.S)
    body = re.sub(r"<footer\b.*?</footer>", "{{FOOT}}", body, count=1, flags=re.S)
    # Überarbeitete Rechtstexte ersetzen den alten Inhalt
    legal = HERE / "legal" / name
    if legal.exists():
        body = re.sub(r"<main\b.*?</main>", lambda m: legal.read_text().strip(), body, count=1, flags=re.S)
    # Breadcrumbs der Ratgeber-Seiten in die Shell-Optik
    body = body.replace('<div class="wrap crumbs">', '<div class="wrap lf-crumbs">')
    # main braucht id für Skip-Link
    if 'id="main"' not in body:
        body = body.replace("<main>", '<main id="main">', 1)
    body = re.sub(r'(<body class="[^"]*">)', lambda m: m.group(1) + "\n" + shell(name), body, count=1)
    body = body.replace("{{FOOT}}", footer(name))
    body = body.replace("</body>", '<script src="assets/lf.js" defer></script>\n</body>', 1)
    return head + body


def main():
    (OUT / "index.html").write_text(build_index())
    for name, tpl in TEMPLATE.items():
        (OUT / name).write_text(build_sub(name, tpl))
    import datetime
    today = datetime.date.today().isoformat()
    sm = (HERE / "sitemap.xml").read_text()
    rob = (HERE / "robots.txt").read_text()
    if "/zentrale/" not in rob:
        rob = rob.replace("Disallow: /alt/", "Disallow: /alt/\nDisallow: /zentrale/")
    (OUT / "robots.txt").write_text(rob)
    (OUT / "sitemap.xml").write_text(re.sub(r"<lastmod>[^<]*</lastmod>", f"<lastmod>{today}</lastmod>", sm))
    print("ok", 1 + len(TEMPLATE), "Seiten + sitemap.xml", LH)


main()
