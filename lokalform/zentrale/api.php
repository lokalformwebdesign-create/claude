<?php
/**
 * Lokalform-Zentrale – JSON-API.
 * Öffentlich: action=lead, action=appointment (Spiegelung der Website-Formulare).
 * Geschützt (Sitzung + CSRF): me, data, save, delete, settings, logout.
 */
declare(strict_types=1);
require __DIR__ . '/lib.php';

lf_headers(true);
$action = (string)($_GET['action'] ?? '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = [];
if ($method === 'POST') {
    $raw = file_get_contents('php://input', false, null, 0, 200000);
    $body = json_decode((string)$raw, true);
    if (!is_array($body)) lf_json(['ok' => false, 'error' => 'Ungültige Anfrage.'], 400);
}

const LEAD_STATUS = ['Neu', 'In Bearbeitung', 'Angebot', 'Gewonnen', 'Verloren'];
const APPT_STATUS = ['Gebucht', 'Bestätigt', 'Erledigt', 'Abgesagt'];
const INV_STATUS = ['Entwurf', 'Offen', 'Bezahlt', 'Storniert'];
const EXP_CATS = ['Software', 'Hardware', 'Hosting', 'Werbung', 'Büro', 'Fahrt', 'Weiterbildung', 'Sonstiges'];

/* ---------- Validierung je Sammlung ---------- */
function clean_item(string $col, array $in, ?array $old): array
{
    $now = date('c');
    $base = ['id' => $old['id'] ?? '', 'created' => $old['created'] ?? $now, 'updated' => $now];
    switch ($col) {
        case 'leads':
            return $base + [
                'company' => lf_str($in['company'] ?? '', 120), 'name' => lf_str($in['name'] ?? '', 120),
                'email' => lf_email($in['email'] ?? ''), 'phone' => lf_str($in['phone'] ?? '', 60),
                'service' => lf_str($in['service'] ?? '', 120), 'budget' => lf_str($in['budget'] ?? '', 60),
                'message' => lf_str($in['message'] ?? '', 4000), 'note' => lf_str($in['note'] ?? '', 4000),
                'status' => lf_enum($in['status'] ?? '', LEAD_STATUS, 'Neu'),
                'source' => lf_enum($in['source'] ?? ($old['source'] ?? 'Manuell'), ['Website', 'Manuell'], 'Manuell'),
            ];
        case 'appointments':
            return $base + [
                'service' => lf_str($in['service'] ?? '', 120), 'date' => lf_date($in['date'] ?? ''), 'time' => lf_time($in['time'] ?? ''),
                'name' => lf_str($in['name'] ?? '', 120), 'company' => lf_str($in['company'] ?? '', 120),
                'email' => lf_email($in['email'] ?? ''), 'phone' => lf_str($in['phone'] ?? '', 60),
                'note' => lf_str($in['note'] ?? '', 2000), 'status' => lf_enum($in['status'] ?? '', APPT_STATUS, 'Gebucht'),
                'source' => lf_enum($in['source'] ?? ($old['source'] ?? 'Manuell'), ['Website', 'Manuell'], 'Manuell'),
            ];
        case 'customers':
            return $base + [
                'company' => lf_str($in['company'] ?? '', 120), 'name' => lf_str($in['name'] ?? '', 120),
                'email' => lf_email($in['email'] ?? ''), 'phone' => lf_str($in['phone'] ?? '', 60),
                'street' => lf_str($in['street'] ?? '', 160), 'zip' => lf_str($in['zip'] ?? '', 10), 'city' => lf_str($in['city'] ?? '', 80),
                'note' => lf_str($in['note'] ?? '', 4000),
            ];
        case 'invoices':
            $items = [];
            foreach (array_slice((array)($in['items'] ?? []), 0, 50) as $it) {
                if (!is_array($it)) continue;
                $text = lf_str($it['text'] ?? '', 300);
                if ($text === '') continue;
                $items[] = ['text' => $text, 'qty' => lf_num($it['qty'] ?? 1, 0, 100000), 'price' => lf_num($it['price'] ?? 0, -1e7, 1e7)];
            }
            return $base + [
                'number' => $old['number'] ?? '', 'customerId' => lf_str($in['customerId'] ?? '', 40),
                'recipient' => lf_str($in['recipient'] ?? '', 600), 'date' => lf_date($in['date'] ?? '') ?: date('Y-m-d'),
                'due' => lf_date($in['due'] ?? ''), 'service' => lf_str($in['service'] ?? '', 200), 'items' => $items,
                'small' => !empty($in['small']), 'vat' => in_array((int)($in['vat'] ?? 19), [0, 7, 19], true) ? (int)$in['vat'] : 19,
                'status' => lf_enum($in['status'] ?? '', INV_STATUS, 'Entwurf'), 'paidDate' => lf_date($in['paidDate'] ?? ''),
                'note' => lf_str($in['note'] ?? '', 1000),
            ];
        case 'expenses':
            return $base + [
                'date' => lf_date($in['date'] ?? '') ?: date('Y-m-d'), 'text' => lf_str($in['text'] ?? '', 200),
                'category' => lf_enum($in['category'] ?? '', EXP_CATS, 'Sonstiges'), 'amount' => lf_num($in['amount'] ?? 0, 0, 1e7),
                'note' => lf_str($in['note'] ?? '', 1000),
            ];
    }
    lf_json(['ok' => false, 'error' => 'Unbekannter Bereich.'], 400);
}

$prefix = ['leads' => 'ANF', 'appointments' => 'TER', 'customers' => 'KD', 'invoices' => 'RE', 'expenses' => 'AUS'];

try {
    /* ---------- Öffentliche Spiegelung der Website-Formulare ---------- */
    if ($action === 'lead' || $action === 'appointment') {
        if ($method !== 'POST') lf_json(['ok' => false, 'error' => 'Nicht erlaubt.'], 405);
        if (lf_str($body['website'] ?? '', 200) !== '') lf_json(['ok' => true, 'reference' => 'OK']); // Honeypot
        if (empty($body['consent'])) lf_json(['ok' => false, 'error' => 'Bitte die Datenschutzhinweise bestätigen.'], 400);
        if (!lf_rate('public', 12, 3600)) lf_json(['ok' => false, 'error' => 'Zu viele Anfragen. Bitte später erneut versuchen.'], 429);
        $col = $action === 'lead' ? 'leads' : 'appointments';
        $item = clean_item($col, $body + ['source' => 'Website', 'status' => $col === 'leads' ? 'Neu' : 'Gebucht'], null);
        $item['source'] = 'Website';
        if ($item['name'] === '' || $item['email'] === '') lf_json(['ok' => false, 'error' => 'Name und gültige E-Mail-Adresse sind erforderlich.'], 400);
        if ($col === 'appointments' && ($item['date'] === '' || $item['time'] === '')) lf_json(['ok' => false, 'error' => 'Datum und Uhrzeit fehlen.'], 400);
        $item['id'] = lf_id($prefix[$col]);
        lf_locked(function () use ($col, $item) { $s = lf_store(); array_unshift($s[$col], $item); lf_write('store', $s); });
        lf_json(['ok' => true, 'reference' => $item['id']]);
    }

    /* ---------- Ab hier nur mit Anmeldung ---------- */
    lf_session();
    if (!lf_logged_in()) lf_json(['ok' => false, 'error' => 'Nicht angemeldet.', 'login' => true], 401);
    if ($action === 'me') lf_json(['ok' => true, 'user' => lf_config()['user'], 'csrf' => lf_csrf()]);
    if ($method === 'POST' && !lf_csrf_ok($_SERVER['HTTP_X_CSRF'] ?? null)) lf_json(['ok' => false, 'error' => 'Sitzung abgelaufen. Bitte Seite neu laden.'], 403);

    switch ($action) {
        case 'data':
            $s = lf_store(); unset($s['seq']);
            lf_json(['ok' => true, 'data' => $s]);

        case 'save':
            $col = (string)($body['collection'] ?? '');
            if (!isset($prefix[$col])) lf_json(['ok' => false, 'error' => 'Unbekannter Bereich.'], 400);
            $in = is_array($body['item'] ?? null) ? $body['item'] : [];
            $saved = lf_locked(function () use ($col, $in, $prefix) {
                $s = lf_store();
                $idx = null;
                foreach ($s[$col] as $i => $x) if (($x['id'] ?? '') !== '' && ($x['id'] ?? '') === ($in['id'] ?? null)) { $idx = $i; break; }
                $old = $idx === null ? null : $s[$col][$idx];
                $item = clean_item($col, $in, $old);
                if ($idx === null) {
                    $item['id'] = lf_id($prefix[$col]);
                    if ($col === 'invoices') {
                        $y = substr($item['date'], 0, 4);
                        $n = (int)($s['seq']['invoice'][$y] ?? 0) + 1;
                        $s['seq']['invoice'][$y] = $n;
                        $item['number'] = sprintf('RE-%s-%03d', $y, $n);
                    }
                    array_unshift($s[$col], $item);
                } else {
                    $s[$col][$idx] = $item;
                }
                lf_write('store', $s);
                return $item;
            });
            lf_json(['ok' => true, 'item' => $saved]);

        case 'delete':
            $col = (string)($body['collection'] ?? ''); $id = (string)($body['id'] ?? '');
            if (!isset($prefix[$col])) lf_json(['ok' => false, 'error' => 'Unbekannter Bereich.'], 400);
            lf_locked(function () use ($col, $id) {
                $s = lf_store();
                $s[$col] = array_values(array_filter($s[$col], fn($x) => ($x['id'] ?? '') !== $id));
                lf_write('store', $s);
            });
            lf_json(['ok' => true]);

        case 'settings':
            $in = is_array($body['settings'] ?? null) ? $body['settings'] : [];
            $set = [
                'name' => lf_str($in['name'] ?? '', 120), 'company' => lf_str($in['company'] ?? '', 120),
                'street' => lf_str($in['street'] ?? '', 160), 'zip' => lf_str($in['zip'] ?? '', 10), 'city' => lf_str($in['city'] ?? '', 80),
                'email' => lf_email($in['email'] ?? ''), 'phone' => lf_str($in['phone'] ?? '', 60),
                'taxNumber' => lf_str($in['taxNumber'] ?? '', 40), 'vatId' => lf_str($in['vatId'] ?? '', 20),
                'bank' => lf_str($in['bank'] ?? '', 80), 'iban' => lf_str($in['iban'] ?? '', 40), 'bic' => lf_str($in['bic'] ?? '', 15),
                'kleinunternehmer' => !empty($in['kleinunternehmer']), 'footer' => lf_str($in['footer'] ?? '', 500),
            ];
            lf_locked(function () use ($set) { $s = lf_store(); $s['settings'] = $set; lf_write('store', $s); });
            lf_json(['ok' => true, 'settings' => $set]);

        case 'logout':
            $_SESSION = [];
            session_destroy();
            lf_json(['ok' => true]);
    }
    lf_json(['ok' => false, 'error' => 'Nicht gefunden.'], 404);
} catch (Throwable $e) {
    lf_json(['ok' => false, 'error' => $e instanceof RuntimeException ? $e->getMessage() : 'Interner Fehler.'], 500);
}
