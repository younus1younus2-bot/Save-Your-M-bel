<?php
// Wird vor jeder PHP-Seite ausgeführt: In der Vorschau eine Hinweis-Leiste einblenden und nicht zwischenspeichern.
(function () {
    // Die Seiten sollen nichts vom Versionsordner merken: Pfade so setzen, als läge die Version direkt im Webroot
    $ver = $_SERVER['SYM_VER'] ?? $_SERVER['REDIRECT_SYM_VER'] ?? '';
    if (preg_match('/^[a-z0-9-]{1,40}$/', $ver)) {
        $praefix = '/_v/' . $ver;
        $_SERVER['DOCUMENT_ROOT'] = '/var/www/versionen' . $praefix;
        foreach (['SCRIPT_NAME', 'PHP_SELF'] as $k) {
            if (isset($_SERVER[$k]) && strncmp($_SERVER[$k], $praefix . '/', strlen($praefix) + 1) === 0) {
                $_SERVER[$k] = substr($_SERVER[$k], strlen($praefix));
            }
        }
    }
    $v = $_SERVER['SYM_VORSCHAU'] ?? $_SERVER['REDIRECT_SYM_VORSCHAU'] ?? '';
    if ($v === '' || !preg_match('/^[a-z0-9-]{1,40}$/', $v)) return;
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex');
    ob_start(function ($html) use ($v) {
        if (stripos($html, '</body>') === false) return $html;
        $leiste = '<div style="position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:2147483000;display:flex;gap:14px;align-items:center;'
            . 'background:#111;color:#fff;font:600 14px/1.4 system-ui,-apple-system,sans-serif;padding:11px 18px;border-radius:999px;box-shadow:0 12px 34px rgba(0,0,0,.45);white-space:nowrap">'
            . '<span>&#128065; Vorschau: <b>' . htmlspecialchars($v) . '</b> &ndash; nur für Sie sichtbar</span>'
            . '<a href="/?vorschau=aus" style="color:#ff8a80;text-decoration:underline">beenden</a></div>';
        return substr_replace($html, $leiste, strripos($html, '</body>'), 0);
    });
})();
