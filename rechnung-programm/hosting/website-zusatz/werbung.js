/* Save Your Möbel – Werbe-Pixel (OpenAI) nur nach Einwilligung.
   Ohne „Akzeptieren“ wird nichts geladen und nichts übertragen (DSGVO / § 25 TDDDG). */
(function () {
  'use strict';
  var skript = document.currentScript;
  var PIXEL = skript && skript.getAttribute('data-pixel');
  var SCHLUESSEL = 'sym_werbung';
  if (!PIXEL) return;

  function lies() { try { return localStorage.getItem(SCHLUESSEL); } catch (e) { return null; } }
  function merke(w) { try { localStorage.setItem(SCHLUESSEL, w); } catch (e) { /* egal */ } }

  function ladePixel() {
    if (window.oaiq) return;
    !function (w, d, s, u) { if (w.oaiq) return; var q = function () { q.q.push(arguments); }; q.q = []; w.oaiq = q; var j = d.createElement(s); j.async = 1; j.src = u; var f = d.getElementsByTagName(s)[0]; f.parentNode.insertBefore(j, f); }(window, document, 'script', 'https://bzrcdn.openai.com/sdk/oaiq.min.js');
    window.oaiq('init', { pixelId: PIXEL, debug: false });
  }

  // Für die Datenschutz-Seite: Einwilligung ändern
  window.SYM_werbung_aendern = function () {
    try { localStorage.removeItem(SCHLUESSEL); } catch (e) { /* egal */ }
    location.reload();
  };

  function zeigeHinweis() {
    var box = document.createElement('div');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Einwilligung Werbe-Messung');
    box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:560px;margin:0 auto;background:#fff;color:#1e1e24;border-radius:18px;padding:18px 18px 16px;box-shadow:0 20px 50px -10px rgba(0,0,0,.35);font:15px/1.5 Montserrat,system-ui,sans-serif;border:1px solid #e7e7eb';
    box.innerHTML = '<b style="display:block;font-size:16px;margin-bottom:6px">Dürfen wir Werbung messen?</b>' +
      '<span>Wir möchten ein Werbe-Pixel von OpenAI nutzen, um zu sehen, ob unsere Anzeigen funktionieren. Dabei werden z.&nbsp;B. Seitenaufrufe und Geräteinformationen an OpenAI (USA) übertragen. Ohne Ihre Zustimmung wird nichts geladen. ' +
      '<a href="/datenschutz.php" style="color:#e53935">Mehr dazu</a></span>' +
      '<div style="display:flex;gap:10px;margin-top:14px">' +
      '<button type="button" data-w="nein" style="flex:1;padding:12px;border-radius:999px;border:2px solid #1e1e24;background:#fff;color:#1e1e24;font:700 15px Montserrat,system-ui,sans-serif;cursor:pointer">Ablehnen</button>' +
      '<button type="button" data-w="ja" style="flex:1;padding:12px;border-radius:999px;border:2px solid #1e1e24;background:#1e1e24;color:#fff;font:700 15px Montserrat,system-ui,sans-serif;cursor:pointer">Akzeptieren</button></div>';
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-w]');
      if (!b) return;
      merke(b.getAttribute('data-w'));
      box.remove();
      if (b.getAttribute('data-w') === 'ja') ladePixel();
    });
    document.body.appendChild(box);
  }

  var wahl = lies();
  if (wahl === 'ja') ladePixel();
  else if (wahl !== 'nein') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', zeigeHinweis);
    else zeigeHinweis();
  }
})();
