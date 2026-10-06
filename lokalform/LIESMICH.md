# Lokalform – Redesign „Zentrale“

Neue Gestaltung von lokalform.de in edlem Schwarz-Weiß: weiße Flächen, tiefes Schwarz, Haarlinien,
Bodoni Moda für Überschriften – mit Tag-/Nachtansicht, Animationen und voller Handy-Bedienung.

## Hochladen (Strato)

Den **Inhalt** dieses Ordners in das Hauptverzeichnis des Webspace hochladen und vorhandene Dateien überschreiben.

Neu:
- `zentrale/` – dein Verwaltungsbereich (Anfragen, Termine, Kunden, Rechnungen, Ausgaben, Steuer)
- `robots.txt` – zusätzlich `Disallow: /zentrale/`
- `assets/fonts/` – Schriften Bodoni Moda und Hanken Grotesk (selbst gehostet, OFL-Lizenz, kein Google-Server)
- `assets/lf.css` – Designsystem für alle Seiten (Schwarz-Weiß)
- `assets/lf.js` – Navigation, Scroll-Animationen, Handy-Menü
- `assets/lf-home.js` – Startseite (Zentrale-Vorschau, Konfigurator, Demo-Vorschau, Anfrage)

Geändert: alle `*.html` im Hauptordner und `sitemap.xml` (aktuelle Daten).

Unverändert und **nicht löschen**: `api.php`, `login.php`, Adminbereich, `assets/og-image.png`,
`assets/icon-*.png`, `demos/` und alle anderen Dateien auf dem Server.

Formular (`/api.php?action=lead`) und Terminbuchung (`/api.php?action=appointment`) nutzen
weiterhin dieselben Schnittstellen wie vorher.

## Hinweise
- Tag-/Nachtansicht: folgt automatisch der Einstellung des Geräts; der Schalter „Nachtansicht“ (Seitenleiste, Handy-Menü, Footer, Zentrale) überschreibt das und merkt sich die Wahl im Browser.
- Keine externen Schriften oder Bibliotheken: nur Systemschriften, kein Google Fonts (DSGVO).
- Mit „Bewegung reduzieren“ im Betriebssystem werden die Bewegungen auf ruhige Überblendungen reduziert.
- Die Zentrale-Vorschau auf der Startseite zeigt ausdrücklich fiktive Beispieldaten.

## SEO in diesem Stand
- Startseite: strukturierte Daten mit Adresse, Telefon, Einzugsgebiet (15 Orte im Märkischen Kreis),
  Angeboten mit Preisen und FAQ (schema.org `ProfessionalService`, `OfferCatalog`, `FAQPage`).
- Jede Seite: Name, Adresse und Telefon im Footer, identisch mit dem Impressum. Das ist wichtig für Local SEO.
- `og:locale` auf allen Seiten, korrekte Überschriften-Reihenfolge, neue Region-Sektion mit internen Links.
- Lighthouse (Mobil, lokal gemessen): Performance 93–96, Barrierefreiheit 100, Best Practices 96, SEO 100.

Nach dem Hochladen:
1. In der Google Search Console die `sitemap.xml` erneut einreichen und die Startseite zur Indexierung anfragen.
2. Das Google-Unternehmensprofil mit exakt derselben Adresse und Telefonnummer pflegen.
3. Kunden aktiv um Google-Bewertungen bitten.

## Zentrale einrichten (einmalig, ca. 3 Minuten)
1. Den Ordner `zentrale/` komplett hochladen – inklusive `zentrale/data/` mit der Datei `.htaccess`.
   Der Ordner `zentrale/data` muss beschreibbar sein (Strato-Standard, sonst Rechte auf 755 setzen).
2. **Direkt nach dem Hochladen** https://lokalform.de/zentrale/ öffnen.
3. „Einrichtungscode senden“ tippen. Der Code kommt an webdesign@lokalform.de.
   Falls keine E-Mail ankommt: Der Code steht dann im Strato-Dateimanager in `zentrale/data/EINRICHTUNGSCODE.php`.
4. Code, Benutzername und Passwort (mind. 10 Zeichen) eintragen – fertig.

Danach meldest du dich unter https://lokalform.de/zentrale/ an.

- Neue Anfragen und Terminbuchungen von der Website landen automatisch in der Zentrale
  (und weiterhin auch in deinem bisherigen System unter `admin.php`, das unverändert bleibt).
- **Passwort vergessen:** Im Dateimanager `zentrale/data/config.php` löschen und Schritt 2–4 wiederholen.
  Alle Daten bleiben erhalten.
- **Sicherung:** Alle Daten liegen in `zentrale/data/store.php`. Die Strato-Datensicherung umfasst diesen Ordner.
- Vor der ersten Rechnung unter Rechnungen → „Absenderdaten“ deine **Steuernummer** und Bankverbindung eintragen.

## Rechtstexte
Impressum, Datenschutz, Cookies, AGB und Widerruf sind überarbeitet (Stand 06.10.2026) und beschreiben genau,
was diese Website tut (keine Tracker, keine externen Schriften, Formulare, Terminbuchung, Zentrale).
Das ist eine sorgfältige Vorlage, aber keine Rechtsberatung. Für echten Abmahnschutz die Texte einmal von
einer Anwältin/einem Anwalt oder einem Rechtstexte-Dienst mit Update-Service prüfen lassen.
Offene Entscheidung: Arbeitest du nur mit Unternehmen (B2B), kann die Widerrufsbelehrung entfallen.
