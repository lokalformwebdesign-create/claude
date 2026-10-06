<?php
/**
 * Lokalform-Zentrale – Einstieg: Einrichtung, Anmeldung, App.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

lf_headers(false);
header('Content-Type: text/html; charset=utf-8');
lf_session();

$msg = ''; $err = '';
$post = $_SERVER['REQUEST_METHOD'] === 'POST';
$act = (string)($_POST['act'] ?? '');

if (!is_dir(LF_DATA) || !is_writable(LF_DATA)) {
    $err = 'Der Ordner „zentrale/data“ ist nicht beschreibbar. Bitte im STRATO-Dateimanager Schreibrechte setzen (z. B. 755).';
}

if ($post && !$err && !lf_csrf_ok($_POST['csrf'] ?? null)) {
    $err = 'Das Formular ist abgelaufen. Bitte erneut versuchen.';
    $post = false;
}

$config = $err ? null : lf_config();

/* ---------- Einrichtung (nur solange kein Zugang existiert) ---------- */
if (!$err && $config === null) {
    $setup = lf_read('setup', []);
    if ($post && $act === 'sendcode') {
        if (!lf_rate('setupmail', 3, 3600)) {
            $err = 'Es wurden bereits mehrere Codes angefordert. Bitte in einer Stunde erneut versuchen.';
        } else {
            $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            $code = '';
            for ($i = 0; $i < 8; $i++) $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            lf_write('setup', ['hash' => password_hash($code, PASSWORD_DEFAULT), 'exp' => time() + 1800]);
            $sent = @mail(LF_OWNER_EMAIL, 'Lokalform Zentrale - Einrichtungscode',
                "Dein Einrichtungscode für die Lokalform-Zentrale:\n\n    $code\n\nDer Code ist 30 Minuten gültig.\nWenn du das nicht angefordert hast, ignoriere diese E-Mail.\n",
                "From: Lokalform Zentrale <" . LF_OWNER_EMAIL . ">\r\nContent-Type: text/plain; charset=UTF-8");
            if ($sent) {
                @unlink(lf_path('EINRICHTUNGSCODE'));
                $msg = 'Der Einrichtungscode wurde an ' . LF_OWNER_EMAIL . ' gesendet. Er ist 30 Minuten gültig.';
            } else {
                file_put_contents(lf_path('EINRICHTUNGSCODE'), LF_GUARD . "Einrichtungscode: $code (30 Minuten gültig)\n");
                $msg = 'Die E-Mail konnte nicht gesendet werden. Den Code findest du im STRATO-Dateimanager in der Datei zentrale/data/EINRICHTUNGSCODE.php.';
            }
        }
    } elseif ($post && $act === 'setup') {
        $code = strtoupper(preg_replace('/\s+/', '', (string)($_POST['code'] ?? '')));
        $user = lf_str($_POST['user'] ?? '', 60);
        $pw = (string)($_POST['pw'] ?? '');
        if (!lf_rate('setup', 8, 900)) $err = 'Zu viele Versuche. Bitte 15 Minuten warten.';
        elseif (empty($setup['hash']) || time() > (int)($setup['exp'] ?? 0) || !password_verify($code, (string)$setup['hash'])) $err = 'Der Einrichtungscode ist falsch oder abgelaufen.';
        elseif (!preg_match('/^[A-Za-z0-9._-]{3,60}$/', $user)) $err = 'Benutzername: 3–60 Zeichen, nur Buchstaben, Zahlen, Punkt, Bindestrich, Unterstrich.';
        elseif (mb_strlen($pw) < 10) $err = 'Das Passwort braucht mindestens 10 Zeichen.';
        elseif ($pw !== (string)($_POST['pw2'] ?? '')) $err = 'Die Passwörter stimmen nicht überein.';
        else {
            lf_write('config', ['user' => $user, 'hash' => password_hash($pw, PASSWORD_DEFAULT), 'created' => date('c')]);
            @unlink(lf_path('setup')); @unlink(lf_path('EINRICHTUNGSCODE'));
            session_regenerate_id(true);
            $_SESSION['uid'] = $user;
            header('Location: ' . lf_base_path(), true, 303);
            exit;
        }
    }
}

/* ---------- Anmeldung ---------- */
if (!$err && $config !== null && $post && $act === 'login') {
    $user = lf_str($_POST['user'] ?? '', 60);
    $pw = (string)($_POST['pw'] ?? '');
    if (!lf_rate('login', 5, 900, false)) {
        $err = 'Zu viele Fehlversuche. Bitte 15 Minuten warten.';
    } elseif (hash_equals((string)$config['user'], $user) && password_verify($pw, (string)$config['hash'])) {
        lf_rate_reset('login');
        if (password_needs_rehash((string)$config['hash'], PASSWORD_DEFAULT)) { $config['hash'] = password_hash($pw, PASSWORD_DEFAULT); lf_write('config', $config); }
        session_regenerate_id(true);
        $_SESSION['uid'] = $config['user'];
        header('Location: ' . lf_base_path(), true, 303);
        exit;
    } else {
        lf_rate('login', 5, 900);
        usleep(400000);
        $err = 'Benutzername oder Passwort ist falsch.';
    }
}

/* ---------- Angemeldet: App ausliefern ---------- */
if (!$err && lf_logged_in()) {
    readfile(__DIR__ . '/app.html');
    exit;
}

$csrf = lf_csrf();
$seal = '<svg class="z-seal" viewBox="82 82 916 916" aria-hidden="true"><circle cx="540" cy="540" r="452" fill="none" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke"/><g fill="currentColor"><path d="M387 390H439V558H540V605H387Z"/><path d="M545 390H697V433H603V461H690V515H603V605H545Z"/></g><line x1="348" y1="699" x2="732" y2="699" stroke="currentColor" stroke-width="1.6" vector-effect="non-scaling-stroke"/><text x="360" y="766" textLength="362" lengthAdjust="spacing" font-family="Arial,Helvetica,sans-serif" font-size="40" fill="currentColor">LOKALFORM</text></svg>';
$isSetup = $config === null;
?><!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#000000">
<title><?= $isSetup ? 'Zentrale einrichten' : 'Anmelden' ?> · Lokalform</title>
<link rel="icon" href="../assets/favicon.svg">
<script src="theme.js?v=1"></script>
<link rel="stylesheet" href="zentrale.css?v=3">
</head>
<body class="z-auth">
<main class="z-auth-card">
  <?= $seal ?>
  <h1><?= $isSetup ? 'Zentrale einrichten' : 'Zentrale' ?></h1>
  <p class="z-muted"><?= $isSetup ? 'Lege einmalig deinen Zugang an. Zur Sicherheit brauchst du dafür einen Code, den wir an ' . lf_e(LF_OWNER_EMAIL) . ' senden.' : 'Anfragen, Termine, Kunden und Rechnungen von Lokalform.' ?></p>
  <?php if ($err): ?><div class="z-alert err" role="alert"><?= lf_e($err) ?></div><?php endif; ?>
  <?php if ($msg): ?><div class="z-alert ok" role="status"><?= lf_e($msg) ?></div><?php endif; ?>
  <?php if ($isSetup && is_dir(LF_DATA) && is_writable(LF_DATA)): ?>
    <form method="post" class="z-form">
      <input type="hidden" name="csrf" value="<?= lf_e($csrf) ?>"><input type="hidden" name="act" value="sendcode">
      <button class="z-btn ghost" type="submit">1. Einrichtungscode senden</button>
    </form>
    <form method="post" class="z-form" autocomplete="off">
      <input type="hidden" name="csrf" value="<?= lf_e($csrf) ?>"><input type="hidden" name="act" value="setup">
      <label>2. Einrichtungscode<input name="code" required inputmode="text" autocapitalize="characters" spellcheck="false" maxlength="12"></label>
      <label>Benutzername<input name="user" required autocomplete="username" maxlength="60"></label>
      <label>Passwort (mind. 10 Zeichen)<input name="pw" type="password" required minlength="10" autocomplete="new-password"></label>
      <label>Passwort wiederholen<input name="pw2" type="password" required minlength="10" autocomplete="new-password"></label>
      <button class="z-btn" type="submit">Zugang anlegen</button>
    </form>
  <?php elseif (!$isSetup): ?>
    <form method="post" class="z-form">
      <input type="hidden" name="csrf" value="<?= lf_e($csrf) ?>"><input type="hidden" name="act" value="login">
      <label>Benutzername<input name="user" required autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="60" autofocus></label>
      <label>Passwort<input name="pw" type="password" required autocomplete="current-password"></label>
      <button class="z-btn" type="submit">Sicher anmelden</button>
    </form>
  <?php endif; ?>
  <nav class="z-auth-links"><a href="../">← Zur Website</a><a href="../impressum.html">Impressum</a><a href="../datenschutz.html">Datenschutz</a></nav>
</main>
</body>
</html>
