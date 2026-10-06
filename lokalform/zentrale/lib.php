<?php
/**
 * Lokalform-Zentrale – gemeinsame Funktionen.
 * Speicherung als JSON in data/*.php; jede Datei beginnt mit einem PHP-Exit,
 * damit sie auch ohne .htaccess-Schutz nie ausgeliefert wird.
 */
declare(strict_types=1);

const LF_OWNER_EMAIL = 'webdesign@lokalform.de';
const LF_DATA = __DIR__ . '/data';
const LF_GUARD = "<?php http_response_code(404); exit; ?>\n";
const LF_IDLE = 7200; // Sitzung läuft nach 2 Stunden Inaktivität ab

function lf_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || (($_SERVER['SERVER_PORT'] ?? '') === '443');
}

function lf_base_path(): string
{
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/zentrale/index.php')), '/');
    return $dir . '/';
}

function lf_headers(bool $json): void
{
    header('X-Frame-Options: DENY');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: same-origin');
    header('X-Robots-Tag: noindex, nofollow');
    header('Cache-Control: no-store');
    header("Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if ($json) header('Content-Type: application/json; charset=utf-8');
}

function lf_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('LFZENTRALE');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => lf_base_path(),
        'secure' => lf_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    ini_set('session.use_strict_mode', '1');
    session_start();
    $now = time();
    if (isset($_SESSION['seen']) && $now - (int)$_SESSION['seen'] > LF_IDLE) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    $_SESSION['seen'] = $now;
}

/* ---------- Speicher ---------- */

function lf_path(string $name): string
{
    return LF_DATA . '/' . preg_replace('/[^A-Za-z0-9_-]/', '', $name) . '.php';
}

function lf_read(string $name, $default = null)
{
    $file = lf_path($name);
    if (!is_file($file)) return $default;
    $raw = (string)file_get_contents($file);
    if (strncmp($raw, LF_GUARD, strlen(LF_GUARD)) === 0) $raw = substr($raw, strlen(LF_GUARD));
    $data = json_decode($raw, true);
    return $data === null ? $default : $data;
}

function lf_write(string $name, $data): void
{
    $file = lf_path($name);
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false) throw new RuntimeException('Daten konnten nicht gespeichert werden.');
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($tmp, LF_GUARD . $json, LOCK_EX) === false) throw new RuntimeException('Speichern fehlgeschlagen: Ordner zentrale/data ist nicht beschreibbar.');
    if (is_file($file)) @copy($file, LF_DATA . '/' . basename($file, '.php') . '.bak.php');
    if (!rename($tmp, $file)) { @unlink($tmp); throw new RuntimeException('Speichern fehlgeschlagen.'); }
}

/** Führt $fn unter exklusiver Sperre aus (verhindert gleichzeitige Schreibkonflikte). */
function lf_locked(callable $fn)
{
    $h = fopen(LF_DATA . '/.lock', 'c');
    if (!$h) throw new RuntimeException('Sperre konnte nicht gesetzt werden.');
    flock($h, LOCK_EX);
    try { return $fn(); } finally { flock($h, LOCK_UN); fclose($h); }
}

function lf_store(): array
{
    $s = lf_read('store', []);
    foreach (['leads', 'appointments', 'customers', 'invoices', 'expenses'] as $k) if (!isset($s[$k]) || !is_array($s[$k])) $s[$k] = [];
    if (!isset($s['settings']) || !is_array($s['settings'])) $s['settings'] = [
        'name' => 'Nevio Turturro', 'company' => 'Lokalform', 'street' => 'Niederwehberg 1', 'zip' => '58507', 'city' => 'Lüdenscheid',
        'email' => LF_OWNER_EMAIL, 'phone' => '0160 5959013', 'taxNumber' => '', 'vatId' => '', 'bank' => '', 'iban' => '', 'bic' => '',
        'kleinunternehmer' => true, 'footer' => '',
    ];
    if (!isset($s['seq']) || !is_array($s['seq'])) $s['seq'] = [];
    return $s;
}

function lf_config(): ?array
{
    $c = lf_read('config');
    return is_array($c) && !empty($c['user']) && !empty($c['hash']) ? $c : null;
}

function lf_secret(): string
{
    $s = lf_read('secret');
    if (!is_string($s) || strlen($s) < 32) { $s = bin2hex(random_bytes(32)); lf_write('secret', $s); }
    return $s;
}

/* ---------- Sicherheit ---------- */

function lf_csrf(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function lf_csrf_ok(?string $token): bool
{
    return is_string($token) && !empty($_SESSION['csrf']) && hash_equals($_SESSION['csrf'], $token);
}

function lf_logged_in(): bool
{
    return !empty($_SESSION['uid']) && lf_config() !== null && hash_equals((string)lf_config()['user'], (string)$_SESSION['uid']);
}

/** Gekürzter, nicht rückrechenbarer IP-Schlüssel (nur für Missbrauchsschutz, 24 h). */
function lf_ip_key(): string
{
    return substr(hash_hmac('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? ''), lf_secret()), 0, 20);
}

/** true = erlaubt. Zählt Versuche je Bereich und IP-Schlüssel im Zeitfenster. */
function lf_rate(string $bucket, int $max, int $window, bool $count = true): bool
{
    return lf_locked(function () use ($bucket, $max, $window, $count) {
        $now = time();
        $r = lf_read('rate', []);
        foreach ($r as $k => $list) {
            $r[$k] = array_values(array_filter((array)$list, fn($t) => $now - (int)$t < 86400));
            if (!$r[$k]) unset($r[$k]);
        }
        $key = $bucket . ':' . lf_ip_key();
        $recent = array_filter($r[$key] ?? [], fn($t) => $now - (int)$t < $window);
        $ok = count($recent) < $max;
        if ($count) $r[$key] = array_merge($r[$key] ?? [], [$now]);
        lf_write('rate', $r);
        return $ok;
    });
}

function lf_rate_reset(string $bucket): void
{
    lf_locked(function () use ($bucket) {
        $r = lf_read('rate', []);
        unset($r[$bucket . ':' . lf_ip_key()]);
        lf_write('rate', $r);
    });
}

/* ---------- Eingaben ---------- */

function lf_str($v, int $max): string
{
    $s = is_scalar($v) ? (string)$v : '';
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s) ?? '';
    $s = trim($s);
    return mb_substr($s, 0, $max);
}

function lf_email($v): string
{
    $s = lf_str($v, 160);
    return ($s === '' || filter_var($s, FILTER_VALIDATE_EMAIL)) ? $s : '';
}

function lf_date($v): string
{
    $s = lf_str($v, 10);
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) && checkdate((int)substr($s, 5, 2), (int)substr($s, 8, 2), (int)substr($s, 0, 4)) ? $s : '';
}

function lf_time($v): string
{
    $s = lf_str($v, 5);
    return preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $s) ? $s : '';
}

function lf_num($v, float $min = -1e9, float $max = 1e9): float
{
    if (is_string($v)) {
        $v = str_replace(' ', '', $v);
        if (strpos($v, ',') !== false) $v = str_replace(['.', ','], ['', '.'], $v); // 1.234,50 → 1234.50
    }
    $n = is_numeric($v) ? (float)$v : 0.0;
    return round(max($min, min($max, $n)), 2);
}

function lf_enum($v, array $allowed, string $default): string
{
    $s = lf_str($v, 40);
    return in_array($s, $allowed, true) ? $s : $default;
}

function lf_id(string $prefix): string
{
    return $prefix . '-' . strtoupper(base_convert((string)time(), 10, 36)) . '-' . strtoupper(bin2hex(random_bytes(3)));
}

function lf_json($data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function lf_e(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
