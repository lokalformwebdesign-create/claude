# Lokalform – Redesign „Zentrale“

Neue Gestaltung von lokalform.de im Stil des Adminbereichs: schwarze Seitenleiste,
graue Arbeitsfläche, weiße Panels, Status-Badges – mit Animationen und voller Handy-Bedienung.

## Hochladen (Strato)

Den **Inhalt** dieses Ordners in das Hauptverzeichnis des Webspace hochladen und vorhandene Dateien überschreiben.

Neu:
- `assets/lf.css` – Designsystem für alle Seiten
- `assets/lf.js` – Navigation, Scroll-Animationen, Handy-Menü
- `assets/lf-home.js` – Startseite (Zentrale-Vorschau, Konfigurator, Demo-Vorschau, Anfrage)

Geändert: alle `*.html` im Hauptordner.

Unverändert und **nicht löschen**: `api.php`, `login.php`, Adminbereich, `assets/og-image.png`,
`assets/icon-*.png`, `demos/` und alle anderen Dateien auf dem Server.

Formular (`/api.php?action=lead`) und Terminbuchung (`/api.php?action=appointment`) nutzen
weiterhin dieselben Schnittstellen wie vorher.

## Hinweise
- Keine externen Schriften oder Bibliotheken: nur Systemschriften, kein Google Fonts (DSGVO).
- Mit „Bewegung reduzieren“ im Betriebssystem werden die Bewegungen auf ruhige Überblendungen reduziert.
- Die Zentrale-Vorschau auf der Startseite zeigt ausdrücklich fiktive Beispieldaten.
