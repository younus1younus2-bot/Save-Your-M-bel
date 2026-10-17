<?php
// Zugang zum Admin-Portal anlegen oder Passwort zurücksetzen.
// Aufruf:  php tools/zugang.php <benutzername> "<Anzeigename>" [passwort]
// Ohne Passwort wird ein sicheres erzeugt und einmal angezeigt.
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
define('KAISER', true);
require __DIR__ . '/../admin/lib.php';

[$_, $name, $anzeige, $pw] = $argv + [null, null, null, null];
if (!$name || !$anzeige) { fwrite(STDERR, "Aufruf: php tools/zugang.php <benutzername> \"<Anzeigename>\" [passwort]\n"); exit(1); }
$name = strtolower($name);
if (!$pw) {
    $woerter = ['Ahorn','Birke','Buche','Eiche','Esche','Linde','Ulme','Weide','Kiefer','Tanne','Fichte','Eibe','Hasel','Holunder','Flieder','Rose','Tulpe','Lilie','Nelke','Aster','Dahlie','Iris','Lavendel','Salbei','Thymian','Minze','Farn','Moos','Efeu','Hortensie','Kastanie','Magnolie','Kirsche','Apfel','Birne','Pflaume','Quitte','Mispel','Zeder','Laerche','Wacholder','Ginster','Heide','Klee','Kamille','Mohn','Malve','Phlox','Primel','Sonnenhut','Krokus','Narzisse','Ringelblume','Vergissmeinnicht','Akelei','Fingerhut','Rittersporn','Pfingstrose','Storchschnabel','Funkie','Gras','Kiesel','Granit','Basalt','Sandstein','Schiefer','Lehm','Humus','Quelle','Bach','Teich','Hecke','Pergola','Laube','Spaten','Rechen','Schaufel','Gießkanne','Schubkarre','Gartenzaun','Mauer','Treppe','Terrasse','Rasen','Beet','Wiese','Hain','Lichtung','Garten','Sommer','Herbst','Winter','Fruehling','Regen','Sonne','Wolke','Morgen','Abend','Tau','Knospe'];
    $w = fn() => $woerter[random_int(0, count($woerter) - 1)];
    $pw = $w() . '-' . $w() . '-' . $w() . '-' . random_int(100, 999);
}
if (mb_strlen($pw) < 10) { fwrite(STDERR, "Passwort zu kurz (mind. 10 Zeichen)\n"); exit(1); }
daten_aendern('benutzer', function ($d) use ($name, $anzeige, $pw) {
    $d[$name] = ['name' => $anzeige, 'hash' => password_hash($pw, PASSWORD_DEFAULT)];
    return $d;
});
echo "Zugang gespeichert:\n  Benutzername: $name\n  Passwort:     $pw\n";
