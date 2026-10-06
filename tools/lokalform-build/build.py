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
    '<link rel="stylesheet" href="assets/lf.css?v=2">\n'
    '<script>document.documentElement.classList.add("js");'
    'try{if(window.self!==window.top)document.documentElement.classList.add("in-frame")}catch(e){document.documentElement.classList.add("in-frame")}</script>\n'
)

HOME_NAV = [("#top", "Übersicht"), ("#arbeiten", "Arbeiten"), ("#leistungen", "Leistungen"), ("#prozess", "Ablauf"),
            ("#preise", "Preise"), ("#seo", "Sichtbarkeit"), ("#anfrage", "Anfrage")]
PAGES = [("webdesign-luedenscheid.html", "Lüdenscheid"), ("preise.html", "Alle Preise"), ("referenzen.html", "Referenzen"),
         ("wissen.html", "Wissen"), ("termine.html", "Termin buchen")]


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
      <div><a class="lf-brand" href="{p or '#'}top" aria-label="Lokalform – nach oben"><i></i>LOKALFORM</a><p>Individuelles Webdesign, digitale Systeme und Local SEO für Unternehmen in Lüdenscheid, im Märkischen Kreis und darüber hinaus.</p></div>
      <div><h4>Leistungen</h4><nav aria-label="Leistungen"><a href="webdesign-luedenscheid.html">Webdesign Lüdenscheid</a><a href="website-start.html">Website Start</a><a href="website-business.html">Website Business</a><a href="website-individuell.html">Individuell</a><a href="local-seo.html">Local SEO</a></nav></div>
      <div><h4>Studio</h4><nav aria-label="Studio"><a href="{p}#arbeiten">Arbeiten</a><a href="preise.html">Preise</a><a href="referenzen.html">Referenzen</a><a href="wissen.html">Wissen</a>{termin}</nav></div>
      <div><h4>Rechtlich</h4><nav aria-label="Rechtliches"><a href="impressum.html">Impressum</a><a href="datenschutz.html">Datenschutz</a><a href="cookies.html">Cookies</a><a href="agb.html">AGB</a><a href="widerruf.html">Widerruf</a><a href="mailto:webdesign@lokalform.de">webdesign@lokalform.de</a></nav></div>
    </div>
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


def build_index():
    src = (SRC / "index.html").read_text()
    body = (HERE / "index_body.html").read_text()
    body = body.replace("{{SHELL}}", shell("index.html")).replace("{{FOOT}}", footer("index.html"))
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
    print("ok", 1 + len(TEMPLATE), "Seiten")


main()
