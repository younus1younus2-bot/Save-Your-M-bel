<?php
// Einstellungen für Anfrageformular und Admin-Portal
if (!defined('KAISER')) { http_response_code(403); exit; }

// An diese Adresse geht bei jeder neuen Anfrage eine kurze Benachrichtigung (leer = keine E-Mail)
const BENACHRICHTIGUNG_AN = 'kaiser.gartenbau@outlook.de';
const FIRMA = 'Kaiser Garten- & Landschaftsbau';

// Anmeldung im Portal bleibt so lange gültig (Sekunden) – danach neu anmelden
const SITZUNG_DAUER = 12 * 3600;

// Zufälliger Schlüssel (wird beim ersten Aufruf automatisch in daten/ angelegt)
define('GEHEIM', (function () {
    $p = __DIR__ . '/../daten/geheim.php';
    if (!is_file($p)) {
        if (!is_dir(dirname($p))) mkdir(dirname($p), 0750, true);
        file_put_contents($p, "<?php exit; ?>\n" . bin2hex(random_bytes(32)));
    }
    return trim(substr(file_get_contents($p), strlen("<?php exit; ?>\n")));
})());
