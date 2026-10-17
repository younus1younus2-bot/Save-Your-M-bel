<?php
// Gemeinsame Funktionen für Anfrageformular und Admin-Portal.
if (!defined('KAISER')) { http_response_code(403); exit; }

require __DIR__ . '/config.php';

/* Daten liegen in ../daten/*.php. Jede Datei beginnt mit einer PHP-Zeile, die sofort beendet
   (siehe SCHUTZ): selbst wenn der Webserver den Ordnerschutz (.htaccess) ignoriert, gibt ein
   Aufruf im Browser nichts preis. */
const DATEN_DIR = __DIR__ . '/../daten';
const SCHUTZ = "<?php exit; ?>\n";

function daten_pfad(string $name): string { return DATEN_DIR . '/' . $name . '.php'; }

function daten_lesen(string $name, $standard = []) {
    $p = daten_pfad($name);
    if (!is_file($p)) return $standard;
    $roh = file_get_contents($p);
    $json = substr($roh, strlen(SCHUTZ));
    $d = json_decode($json, true);
    return is_array($d) ? $d : $standard;
}

// Liest, ändert und schreibt eine Datei unter Sperre – sicher bei gleichzeitigen Anfragen.
function daten_aendern(string $name, callable $fn, $standard = []) {
    if (!is_dir(DATEN_DIR)) mkdir(DATEN_DIR, 0750, true);
    $fh = fopen(daten_pfad($name), 'c+');
    if (!$fh) throw new RuntimeException('Daten nicht beschreibbar');
    flock($fh, LOCK_EX);
    $roh = stream_get_contents($fh);
    $d = $roh ? json_decode(substr($roh, strlen(SCHUTZ)), true) : null;
    if (!is_array($d)) $d = $standard;
    $neu = $fn($d);
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, SCHUTZ . json_encode($neu, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    return $neu;
}

function h($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

function client_schluessel(): string {
    // IP nur gehasht und nur für die Begrenzung von Fehlversuchen/Spam (wird nicht dauerhaft gespeichert)
    return hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . GEHEIM);
}

// Einfache Begrenzung: höchstens $max Ereignisse je $sekunden pro Besucher
function begrenzt(string $art, int $max, int $sekunden, bool $zaehlen = true): bool {
    $k = client_schluessel();
    $jetzt = time();
    $gesperrt = false;
    daten_aendern('limits', function ($d) use ($art, $k, $max, $sekunden, $jetzt, $zaehlen, &$gesperrt) {
        foreach ($d as $schluessel => $zeiten) {   // Altes aufräumen
            $d[$schluessel] = array_values(array_filter($zeiten, fn($t) => $t > $jetzt - 86400));
            if (!$d[$schluessel]) unset($d[$schluessel]);
        }
        $id = "$art:$k";
        $liste = array_values(array_filter($d[$id] ?? [], fn($t) => $t > $jetzt - $sekunden));
        $gesperrt = count($liste) >= $max;
        if ($zaehlen && !$gesperrt) $liste[] = $jetzt;
        if ($liste) $d[$id] = $liste; else unset($d[$id]);
        return $d;
    });
    return $gesperrt;
}

function limit_zuruecksetzen(string $art): void {
    $id = "$art:" . client_schluessel();
    daten_aendern('limits', function ($d) use ($id) { unset($d[$id]); return $d; });
}

const STATUS = ['neu' => 'Neu', 'bearbeitung' => 'In Bearbeitung', 'erledigt' => 'Erledigt'];
