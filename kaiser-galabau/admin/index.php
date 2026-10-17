<?php
// Admin-Portal: Anfragen ansehen, bearbeiten, Status setzen. Zugänge stehen in daten/benutzer.php.
define('KAISER', true);
require __DIR__ . '/lib.php';

$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_name('kaiser_admin');
session_set_cookie_params(['lifetime' => 0, 'path' => rtrim(dirname($_SERVER['SCRIPT_NAME']), '/') . '/',
    'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
session_start();

header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$benutzer = daten_lesen('benutzer');
$ich = $_SESSION['benutzer'] ?? null;
if ($ich && (!isset($benutzer[$ich]) || time() - ($_SESSION['aktiv'] ?? 0) > SITZUNG_DAUER)) { $_SESSION = []; $ich = null; }
if ($ich) $_SESSION['aktiv'] = time();
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));

$meldung = $_SESSION['meldung'] ?? null; unset($_SESSION['meldung']);
$weiter = function (string $ziel = './', ?string $text = null) { if ($text) $_SESSION['meldung'] = $text; header('Location: ' . $ziel); exit; };
$post = ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST';
if ($post && !hash_equals($_SESSION['csrf'], (string)($_POST['csrf'] ?? ''))) { http_response_code(400); exit('Sitzung abgelaufen – bitte Seite neu laden.'); }

// ---------- Anmelden / Abmelden ----------
$login_fehler = '';
if (!$ich) {
    if ($post && ($_POST['aktion'] ?? '') === 'login') {
        if (begrenzt('login', 5, 900, false)) {
            $login_fehler = 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.';
        } else {
            $name = strtolower(trim((string)($_POST['benutzer'] ?? '')));
            if (isset($benutzer[$name]) && password_verify((string)($_POST['passwort'] ?? ''), $benutzer[$name]['hash'])) {
                limit_zuruecksetzen('login');
                session_regenerate_id(true);
                $_SESSION['benutzer'] = $name; $_SESSION['aktiv'] = time(); $_SESSION['csrf'] = bin2hex(random_bytes(16));
                $weiter('./');
            }
            begrenzt('login', 5, 900, true);
            $login_fehler = 'Benutzername oder Passwort falsch.';
        }
    }
    seite('Anmelden', function () use ($login_fehler, $benutzer) { ?>
      <form method="post" class="login card">
        <img src="../img/logo.png" alt="Kaiser Garten- &amp; Landschaftsbau" class="login__logo">
        <h1>Admin-Portal</h1>
        <?php if (!$benutzer): ?><p class="hinweis hinweis--fehler">Es sind noch keine Zugänge angelegt (daten/benutzer.php fehlt).</p><?php endif; ?>
        <?php if ($login_fehler): ?><p class="hinweis hinweis--fehler"><?= h($login_fehler) ?></p><?php endif; ?>
        <input type="hidden" name="csrf" value="<?= h($_SESSION['csrf']) ?>"><input type="hidden" name="aktion" value="login">
        <label for="benutzer">Benutzername</label><input id="benutzer" name="benutzer" autocomplete="username" autocapitalize="none" required autofocus>
        <label for="passwort">Passwort</label><input id="passwort" name="passwort" type="password" autocomplete="current-password" required>
        <button class="btn">Anmelden</button>
      </form>
    <?php }, false);
    exit;
}

// ---------- Aktionen (angemeldet) ----------
if ($post) {
    $aktion = $_POST['aktion'] ?? '';
    $id = (string)($_POST['id'] ?? '');
    $wer = $benutzer[$ich]['name'];
    if ($aktion === 'logout') { $_SESSION = []; session_destroy(); $weiter('./'); }
    if ($aktion === 'passwort') {
        $neu = (string)($_POST['neu'] ?? '');
        if (!password_verify((string)($_POST['alt'] ?? ''), $benutzer[$ich]['hash'])) $weiter('?seite=passwort', 'Das aktuelle Passwort ist falsch.');
        if (mb_strlen($neu) < 10) $weiter('?seite=passwort', 'Das neue Passwort muss mindestens 10 Zeichen haben.');
        if ($neu !== ($_POST['neu2'] ?? '')) $weiter('?seite=passwort', 'Die beiden neuen Passwörter stimmen nicht überein.');
        daten_aendern('benutzer', function ($d) use ($ich, $neu) { $d[$ich]['hash'] = password_hash($neu, PASSWORD_DEFAULT); return $d; });
        $weiter('./', 'Passwort geändert.');
    }
    if (in_array($aktion, ['status', 'notiz', 'loeschen'], true)) {
        daten_aendern('anfragen', function ($liste) use ($aktion, $id, $wer) {
            foreach ($liste as $i => &$a) {
                if ($a['id'] !== $id) continue;
                if ($aktion === 'loeschen') { array_splice($liste, $i, 1); return $liste; }
                if ($aktion === 'status' && isset(STATUS[$_POST['status'] ?? ''])) {
                    $a['status'] = $_POST['status'];
                    $a['verlauf'][] = ['zeit' => date('c'), 'wer' => $wer, 'text' => 'Status: ' . STATUS[$a['status']]];
                }
                if ($aktion === 'notiz') {
                    $a['notiz'] = mb_substr(trim((string)($_POST['notiz'] ?? '')), 0, 5000);
                    $a['verlauf'][] = ['zeit' => date('c'), 'wer' => $wer, 'text' => 'Notiz gespeichert'];
                }
            }
            return $liste;
        });
        if ($aktion === 'loeschen') $weiter('./', 'Anfrage gelöscht.');
        $weiter('?id=' . urlencode($id), $aktion === 'status' ? 'Status geändert.' : 'Notiz gespeichert.');
    }
    $weiter('./');
}

$anfragen = daten_lesen('anfragen');
$datum = fn($iso) => date('d.m.Y, H:i', strtotime($iso)) . ' Uhr';
$tel = fn($t) => preg_replace('/[^0-9+]/', '', $t);
$wa = function ($t) { $n = preg_replace('/\D/', '', $t); if (str_starts_with($n, '00')) $n = substr($n, 2); elseif (str_starts_with($n, '0')) $n = '49' . substr($n, 1); return $n; };

// ---------- Passwort ändern ----------
if (($_GET['seite'] ?? '') === 'passwort') {
    seite('Passwort ändern', function () use ($meldung) { ?>
      <p><a href="./" class="zurueck">← Zur Übersicht</a></p>
      <form method="post" class="card schmal">
        <h1>Passwort ändern</h1>
        <?php if ($meldung): ?><p class="hinweis hinweis--fehler"><?= h($meldung) ?></p><?php endif; ?>
        <input type="hidden" name="csrf" value="<?= h($_SESSION['csrf']) ?>"><input type="hidden" name="aktion" value="passwort">
        <label for="alt">Aktuelles Passwort</label><input id="alt" name="alt" type="password" autocomplete="current-password" required>
        <label for="neu">Neues Passwort (mind. 10 Zeichen)</label><input id="neu" name="neu" type="password" autocomplete="new-password" minlength="10" required>
        <label for="neu2">Neues Passwort wiederholen</label><input id="neu2" name="neu2" type="password" autocomplete="new-password" minlength="10" required>
        <button class="btn">Speichern</button>
      </form>
    <?php });
    exit;
}

// ---------- Einzelne Anfrage ----------
if (isset($_GET['id'])) {
    $a = null;
    foreach ($anfragen as $x) if ($x['id'] === $_GET['id']) $a = $x;
    if (!$a) $weiter('./', 'Diese Anfrage gibt es nicht mehr.');
    seite('Anfrage von ' . $a['name'], function () use ($a, $meldung, $datum, $tel, $wa) {
        $zeilen = ['Leistung' => $a['leistung'], 'Telefon' => $a['telefon'], 'E-Mail' => $a['email'], 'Ort / PLZ' => $a['ort'],
                   'Gartengröße' => $a['groesse'], 'Zeitraum' => $a['zeitraum'], 'Rückruf' => $a['rueckruf'], 'Eingegangen' => $datum($a['zeit'])]; ?>
      <p><a href="./" class="zurueck">← Zur Übersicht</a></p>
      <?php if ($meldung): ?><p class="hinweis"><?= h($meldung) ?></p><?php endif; ?>
      <div class="detail">
        <div class="card">
          <div class="detail__kopf"><h1><?= h($a['name']) ?></h1><span class="status status--<?= h($a['status']) ?>"><?= h(STATUS[$a['status']] ?? $a['status']) ?></span></div>
          <div class="aktionen">
            <a class="btn" href="tel:<?= h($tel($a['telefon'])) ?>">Anrufen</a>
            <a class="btn btn--hell" href="https://wa.me/<?= h($wa($a['telefon'])) ?>" target="_blank" rel="noopener">WhatsApp</a>
            <?php if ($a['email']): ?><a class="btn btn--hell" href="mailto:<?= h($a['email']) ?>?subject=<?= rawurlencode('Ihre Anfrage bei ' . FIRMA) ?>">E-Mail</a><?php endif; ?>
          </div>
          <dl class="felder">
            <?php foreach ($zeilen as $k => $v): ?><dt><?= h($k) ?></dt><dd><?= $v !== '' ? h($v) : '–' ?></dd><?php endforeach; ?>
          </dl>
          <h2>Nachricht</h2>
          <p class="nachricht"><?= $a['nachricht'] !== '' ? nl2br(h($a['nachricht'])) : '–' ?></p>
        </div>
        <div class="seite">
          <form method="post" class="card">
            <h2>Status</h2>
            <input type="hidden" name="csrf" value="<?= h($_SESSION['csrf']) ?>"><input type="hidden" name="aktion" value="status"><input type="hidden" name="id" value="<?= h($a['id']) ?>">
            <div class="status-wahl">
              <?php foreach (STATUS as $k => $v): ?><button name="status" value="<?= h($k) ?>" class="status status--<?= h($k) ?><?= $a['status'] === $k ? ' ist-aktiv' : '' ?>"><?= h($v) ?></button><?php endforeach; ?>
            </div>
          </form>
          <form method="post" class="card">
            <h2>Notiz</h2>
            <input type="hidden" name="csrf" value="<?= h($_SESSION['csrf']) ?>"><input type="hidden" name="aktion" value="notiz"><input type="hidden" name="id" value="<?= h($a['id']) ?>">
            <label for="notiz" class="sr-only">Notiz</label>
            <textarea id="notiz" name="notiz" rows="5" placeholder="z. B. Termin vor Ort am …, Angebot geschickt am …"><?= h($a['notiz']) ?></textarea>
            <button class="btn">Notiz speichern</button>
          </form>
          <?php if (!empty($a['verlauf'])): ?>
          <div class="card"><h2>Verlauf</h2><ul class="verlauf">
            <?php foreach (array_reverse($a['verlauf']) as $v): ?><li><b><?= h($v['text']) ?></b><span><?= h($v['wer']) ?> · <?= h($datum($v['zeit'])) ?></span></li><?php endforeach; ?>
          </ul></div>
          <?php endif; ?>
          <details class="card loeschen">
            <summary>Anfrage löschen</summary>
            <form method="post">
              <p>Die Anfrage wird endgültig gelöscht und kann nicht wiederhergestellt werden.</p>
              <input type="hidden" name="csrf" value="<?= h($_SESSION['csrf']) ?>"><input type="hidden" name="aktion" value="loeschen"><input type="hidden" name="id" value="<?= h($a['id']) ?>">
              <button class="btn btn--rot">Endgültig löschen</button>
            </form>
          </details>
        </div>
      </div>
    <?php });
    exit;
}

// ---------- Übersicht ----------
$filter = $_GET['status'] ?? 'offen';
$suche = trim((string)($_GET['q'] ?? ''));
$anzahl = array_fill_keys(array_keys(STATUS), 0);
foreach ($anfragen as $x) $anzahl[$x['status']] = ($anzahl[$x['status']] ?? 0) + 1;
$liste = array_filter($anfragen, function ($x) use ($filter, $suche) {
    if ($filter === 'offen' && $x['status'] === 'erledigt') return false;
    if (isset(STATUS[$filter]) && $x['status'] !== $filter) return false;
    if ($suche !== '') {
        $heu = mb_strtolower(implode(' ', [$x['name'], $x['telefon'], $x['email'], $x['ort'], $x['leistung'], $x['nachricht'], $x['notiz']]));
        if (!str_contains($heu, mb_strtolower($suche))) return false;
    }
    return true;
});
seite('Anfragen', function () use ($liste, $anzahl, $filter, $suche, $meldung, $datum, $tel) {
    $tabs = ['offen' => 'Offen', 'neu' => 'Neu', 'bearbeitung' => 'In Bearbeitung', 'erledigt' => 'Erledigt', 'alle' => 'Alle'];
    $zahl = ['offen' => $anzahl['neu'] + $anzahl['bearbeitung'], 'alle' => array_sum($anzahl)] + $anzahl; ?>
    <?php if ($meldung): ?><p class="hinweis"><?= h($meldung) ?></p><?php endif; ?>
    <div class="kacheln">
      <a href="?status=neu" class="kachel"><b><?= $anzahl['neu'] ?></b><span>Neue Anfragen</span></a>
      <a href="?status=bearbeitung" class="kachel"><b><?= $anzahl['bearbeitung'] ?></b><span>In Bearbeitung</span></a>
      <a href="?status=erledigt" class="kachel"><b><?= $anzahl['erledigt'] ?></b><span>Erledigt</span></a>
    </div>
    <form class="werkzeuge" method="get">
      <nav class="tabs"><?php foreach ($tabs as $k => $v): ?><a href="?status=<?= $k ?><?= $suche !== '' ? '&q=' . rawurlencode($suche) : '' ?>"<?= $filter === $k ? ' class="ist-aktiv"' : '' ?>><?= $v ?> <small><?= $zahl[$k] ?></small></a><?php endforeach; ?></nav>
      <input type="hidden" name="status" value="<?= h($filter) ?>">
      <label for="q" class="sr-only">Suchen</label>
      <input id="q" name="q" type="search" value="<?= h($suche) ?>" placeholder="Name, Telefon, Ort suchen …">
    </form>
    <?php if (!$liste): ?>
      <div class="card leer"><b>Keine Anfragen<?= $suche !== '' ? ' für „' . h($suche) . '“' : '' ?></b><span>Neue Anfragen aus dem Kontaktformular erscheinen hier automatisch.</span></div>
    <?php else: ?>
      <ul class="liste">
        <?php foreach ($liste as $a): ?>
        <li class="eintrag eintrag--<?= h($a['status']) ?>">
          <a href="?id=<?= h($a['id']) ?>" class="eintrag__link">
            <span class="eintrag__name"><?= h($a['name']) ?></span>
            <span class="eintrag__info"><?= h($a['leistung'] ?: 'Keine Leistung gewählt') ?><?= $a['ort'] ? ' · ' . h($a['ort']) : '' ?></span>
            <span class="eintrag__zeit"><?= h($datum($a['zeit'])) ?></span>
          </a>
          <span class="status status--<?= h($a['status']) ?>"><?= h(STATUS[$a['status']] ?? '') ?></span>
          <a class="eintrag__tel" href="tel:<?= h($tel($a['telefon'])) ?>" aria-label="<?= h($a['name']) ?> anrufen"><?= h($a['telefon']) ?></a>
        </li>
        <?php endforeach; ?>
      </ul>
    <?php endif; ?>
<?php });

// ---------- Seitengerüst ----------
function seite(string $titel, callable $inhalt, bool $angemeldet = true): void {
    global $benutzer, $ich; ?>
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title><?= h($titel) ?> – Admin <?= h(FIRMA) ?></title>
  <link rel="icon" href="../img/favicon.png">
  <link rel="stylesheet" href="admin.css">
</head>
<body<?= $angemeldet ? '' : ' class="ist-login"' ?>>
<?php if ($angemeldet): ?>
  <header class="kopf">
    <a href="./" class="kopf__logo"><img src="../img/logo-weiss.png" alt="Kaiser"><span>Anfragen</span></a>
    <div class="kopf__rechts">
      <span class="kopf__wer"><?= h($benutzer[$ich]['name']) ?></span>
      <a href="?seite=passwort">Passwort</a>
      <form method="post"><input type="hidden" name="csrf" value="<?= h($_SESSION['csrf']) ?>"><button name="aktion" value="logout">Abmelden</button></form>
    </div>
  </header>
<?php endif; ?>
  <main class="inhalt"><?php $inhalt(); ?></main>
</body>
</html>
<?php }
