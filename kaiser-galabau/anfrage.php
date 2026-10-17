<?php
// Nimmt Anfragen aus dem Kontaktformular entgegen und speichert sie für das Admin-Portal.
define('KAISER', true);
require __DIR__ . '/admin/lib.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');
$antwort = function (int $code, array $daten) { http_response_code($code); echo json_encode($daten, JSON_UNESCAPED_UNICODE); exit; };

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') $antwort(405, ['ok' => false, 'fehler' => 'Nur POST erlaubt']);

$feld = fn(string $n, int $max = 200) => mb_substr(trim((string)($_POST[$n] ?? '')), 0, $max);

// Spam-Schutz 1: unsichtbares Feld, das nur Bots ausfüllen. 2: Formular schneller als 3 Sekunden abgeschickt.
$start = (int)($_POST['t'] ?? 0);
if ($feld('website') !== '' || ($start > 0 && (microtime(true) * 1000 - $start) < 3000)) {
    $antwort(200, ['ok' => true]); // Bot bekommt „ok“, gespeichert wird nichts
}
// Spam-Schutz 3: höchstens 5 Anfragen pro Stunde vom selben Anschluss
if (begrenzt('anfrage', 5, 3600)) $antwort(429, ['ok' => false, 'fehler' => 'Zu viele Anfragen. Bitte rufen Sie uns an.']);

$a = [
    'leistung' => $feld('leistung', 400),
    'name'     => $feld('name', 100),
    'telefon'  => $feld('telefon', 40),
    'email'    => $feld('email', 150),
    'ort'      => $feld('ort', 100),
    'groesse'  => $feld('groesse', 50),
    'zeitraum' => $feld('zeitraum', 50),
    'rueckruf' => $feld('rueckruf', 30),
    'nachricht'=> $feld('nachricht', 3000),
];
$fehler = [];
if ($a['name'] === '') $fehler[] = 'Name';
if (!preg_match('/^[0-9 +()\/\-]{5,40}$/', $a['telefon'])) $fehler[] = 'Telefon';
if ($a['email'] !== '' && !filter_var($a['email'], FILTER_VALIDATE_EMAIL)) $fehler[] = 'E-Mail';
if (empty($_POST['einwilligung'])) $fehler[] = 'Einwilligung';
if ($fehler) $antwort(422, ['ok' => false, 'fehler' => 'Bitte prüfen: ' . implode(', ', $fehler)]);

$eintrag = $a + ['id' => bin2hex(random_bytes(6)), 'zeit' => date('c'), 'status' => 'neu', 'notiz' => '', 'verlauf' => []];
try {
    daten_aendern('anfragen', function ($liste) use ($eintrag) { array_unshift($liste, $eintrag); return $liste; });
} catch (Throwable $e) {
    $antwort(500, ['ok' => false, 'fehler' => 'Speichern fehlgeschlagen']);
}

// Kurze Benachrichtigung per E-Mail (Fehler beim Versand verhindern die Anfrage nicht)
if (BENACHRICHTIGUNG_AN) {
    $host = preg_replace('/^www\.|:\d+$/', '', $_SERVER['HTTP_HOST'] ?? 'localhost');
    $link = (empty($_SERVER['HTTPS']) || $_SERVER['HTTPS'] === 'off' ? 'http' : 'https') . '://' . ($_SERVER['HTTP_HOST'] ?? $host) . '/admin/?id=' . $eintrag['id'];
    $text = "Neue Anfrage über die Website\n\n"
          . "Name: {$a['name']}\nTelefon: {$a['telefon']}\nE-Mail: " . ($a['email'] ?: '–') . "\n"
          . "Leistung: " . ($a['leistung'] ?: '–') . "\nOrt: " . ($a['ort'] ?: '–') . "\n\n"
          . "Nachricht:\n" . ($a['nachricht'] ?: '–') . "\n\nIm Admin-Portal öffnen: $link\n";
    $kopf = "From: Website <noreply@$host>\r\nContent-Type: text/plain; charset=UTF-8\r\n"
          . ($a['email'] ? 'Reply-To: ' . str_replace(["\r", "\n"], '', $a['email']) . "\r\n" : '');
    @mail(BENACHRICHTIGUNG_AN, '=?UTF-8?B?' . base64_encode('Neue Anfrage: ' . $a['name']) . '?=', $text, $kopf);
}

$antwort(200, ['ok' => true]);
