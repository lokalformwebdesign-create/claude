/* Lokalform-Zentrale – gespeicherte Tag/Nacht-Wahl vor dem ersten Zeichnen anwenden */
try { var t = localStorage.getItem('lf-theme'); if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t; } catch (e) { /* ohne Speicher: Gerät entscheidet */ }
