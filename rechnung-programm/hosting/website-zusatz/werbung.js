/* Save Your Möbel – Cookie- & Einwilligungs-Banner (DSGVO, § 25 TDDDG)
   - Nichts Einwilligungspflichtiges lädt vor der Zustimmung
   - „Alle ablehnen“ gleichwertig zu „Alle akzeptieren“, keine vorausgewählten Häkchen
   - Einstellungen je Kategorie, jederzeit widerrufbar (Cookie-Knopf unten links)
   - Auswahl wird mit Zeitpunkt und Version gespeichert, nach 12 Monaten neu gefragt */
(function () {
  'use strict';
  var skript = document.currentScript;
  var PIXEL = (skript && skript.getAttribute('data-pixel')) || '';
  var VERSION = 2;  // erhöhen, wenn neue Dienste dazukommen – dann wird neu gefragt
  var SCHLUESSEL = 'sym_einwilligung';
  var GUELTIG_TAGE = 365;

  var KATEGORIEN = [
    { id: 'notwendig', name: 'Notwendig', immer: true,
      text: 'Damit die Website funktioniert, z. B. das Anfrageformular und das Speichern Ihrer Auswahl in diesem Fenster. Es werden keine Cookies zu Werbezwecken gesetzt.',
      dienste: [['Einwilligungs-Speicher', 'Save Your Möbel', 'Speichert Ihre Auswahl im Browser (localStorage)', '12 Monate', 'Nein']] },
    { id: 'marketing', name: 'Marketing', aus: !PIXEL,
      text: 'Hilft uns zu messen, ob unsere Werbeanzeigen funktionieren (z. B. ob Besucher über eine Anzeige eine Anfrage senden).',
      dienste: [['Werbe-Pixel (oaiq)', 'OpenAI Ireland Ltd. / OpenAI, L.L.C. (USA)', 'Messung von Werbeanzeigen, inkl. Meldung einer abgeschickten Anfrage; übertragen werden u. a. aufgerufene Seiten, Zeitpunkt, IP-Adresse, Geräte- und Browserdaten', 'laut Anbieter', 'Ja, USA möglich']] },
    { id: 'medien', name: 'Externe Medien',
      text: 'Zeigt Inhalte anderer Anbieter direkt an, z. B. die Google-Karte auf der Kontaktseite. Ohne Zustimmung laden Sie die Karte erst per Klick.',
      dienste: [['Google Maps', 'Google Ireland Ltd. / Google LLC (USA)', 'Anzeige der Karte und Wegbeschreibung; übertragen werden u. a. IP-Adresse und Geräteinformationen', 'laut Anbieter', 'Ja, USA möglich']] }
  ];

  // ---------- Speicher ----------
  function lies() {
    try {
      var d = JSON.parse(localStorage.getItem(SCHLUESSEL) || 'null');
      if (!d || d.v !== VERSION) return null;
      if (Date.now() - new Date(d.zeit).getTime() > GUELTIG_TAGE * 864e5) return null;
      return d;
    } catch (e) { return null; }
  }
  function speichere(wahl) {
    var d = { v: VERSION, zeit: new Date().toISOString(), notwendig: true, marketing: !!wahl.marketing, medien: !!wahl.medien };
    try { localStorage.setItem(SCHLUESSEL, JSON.stringify(d)); localStorage.removeItem('sym_werbung'); } catch (e) { /* egal */ }
    return d;
  }

  // ---------- Dienste starten ----------
  function ladePixel() {
    if (!PIXEL || window.oaiq) return;
    !function (w, d, s, u) { if (w.oaiq) return; var q = function () { q.q.push(arguments); }; q.q = []; w.oaiq = q; var j = d.createElement(s); j.async = 1; j.src = u; var f = d.getElementsByTagName(s)[0]; f.parentNode.insertBefore(j, f); }(window, document, 'script', 'https://bzrcdn.openai.com/sdk/oaiq.min.js');
    window.oaiq('init', { pixelId: PIXEL, debug: false });
  }
  // Danke-Seite nach einer Anfrage: Abschluss an OpenAI melden (nur mit Marketing-Einwilligung, je Anfrage nur einmal)
  function messeAnfrage() {
    if (!window.oaiq || !/\/danke\.php$/.test(location.pathname)) return;
    var nr = new URLSearchParams(location.search).get('nr') || 'ohne-nr';
    var gemeldet = [];
    try { gemeldet = JSON.parse(localStorage.getItem('sym_gemeldet') || '[]'); } catch (e) { gemeldet = []; }
    if (gemeldet.indexOf(nr) !== -1) return;
    window.oaiq('measure', 'registration_completed', { type: 'customer_action' });
    gemeldet.push(nr);
    try { localStorage.setItem('sym_gemeldet', JSON.stringify(gemeldet.slice(-50))); } catch (e) { /* egal */ }
  }
  function ladeMedien() {
    document.querySelectorAll('[data-karte-laden], #karte-laden').forEach(function (k) { k.click(); });
  }
  function anwenden(d) {
    if (!d) return;
    if (d.marketing) { ladePixel(); messeAnfrage(); }
    if (d.medien) ladeMedien();
  }

  // ---------- Aussehen ----------
  var css = '' +
    '.sym-cb{position:fixed;inset:auto 0 0 0;z-index:10000;display:flex;justify-content:center;padding:14px;pointer-events:none;font:15px/1.55 Montserrat,system-ui,-apple-system,"Segoe UI",sans-serif;color:#1e1e24}' +
    '.sym-cb-box{pointer-events:auto;width:100%;max-width:640px;max-height:min(88vh,760px);overflow:auto;background:#fff;border-radius:24px;box-shadow:0 30px 80px -20px rgba(0,0,0,.45),0 0 0 1px rgba(0,0,0,.06);animation:sym-cb-rein .55s cubic-bezier(.2,.7,.2,1) both}' +
    '@keyframes sym-cb-rein{from{opacity:0;transform:translateY(40px) scale(.97)}}' +
    '.sym-cb-kopf{display:flex;gap:14px;align-items:center;padding:22px 24px 0}' +
    '.sym-cb-keks{flex-shrink:0;width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,#ff6b63,#c62828);box-shadow:0 10px 24px -10px rgba(229,57,53,.8);animation:sym-cb-wackel 2.6s ease-in-out infinite}' +
    '@keyframes sym-cb-wackel{0%,80%,100%{transform:rotate(0)}85%{transform:rotate(-10deg)}90%{transform:rotate(8deg)}95%{transform:rotate(-4deg)}}' +
    '.sym-cb-keks svg{width:30px;height:30px}' +
    '.sym-cb h2{margin:0;font-size:19px;font-weight:800;letter-spacing:-.01em}' +
    '.sym-cb-unter{margin:2px 0 0;font-size:13px;color:#8d8d98}' +
    '.sym-cb-text{padding:14px 24px 0;margin:0;color:#4a4a55;font-size:14.5px}' +
    '.sym-cb-text a,.sym-cb-links a{color:#e53935;font-weight:700}' +
    '.sym-cb-knoepfe{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:18px 24px 6px}' +
    '.sym-cb-k{appearance:none;border:2px solid #1e1e24;border-radius:999px;padding:13px 16px;font:700 15px Montserrat,system-ui,sans-serif;cursor:pointer;transition:transform .2s,background .2s,color .2s;background:#1e1e24;color:#fff}' +
    '.sym-cb-k:hover{transform:translateY(-2px)}.sym-cb-k:focus-visible{outline:3px solid rgba(229,57,53,.5);outline-offset:2px}' +
    '.sym-cb-k.leise{background:#fff;color:#1e1e24;grid-column:1/-1}' +
    '.sym-cb-links{display:flex;flex-wrap:wrap;gap:6px 16px;justify-content:center;padding:6px 24px 18px;font-size:13px}' +
    '.sym-cb-kat{margin:14px 24px 0;border:1px solid #ececf0;border-radius:16px;overflow:hidden}' +
    '.sym-cb-kat-kopf{display:flex;align-items:center;gap:12px;padding:14px 16px;background:#fafafb}' +
    '.sym-cb-kat-kopf b{flex:1;font-size:15px}' +
    '.sym-cb-kat p{margin:0;padding:10px 16px 0;font-size:13.5px;color:#5b5b66}' +
    '.sym-cb-kat details{padding:6px 16px 14px;font-size:13px}.sym-cb-kat summary{cursor:pointer;color:#e53935;font-weight:700;padding:4px 0}' +
    '.sym-cb-kat table{width:100%;border-collapse:collapse;margin-top:6px}.sym-cb-kat td{padding:4px 6px;border-top:1px solid #f0f0f3;vertical-align:top}.sym-cb-kat td:first-child{color:#8d8d98;width:38%}' +
    '.sym-cb-schalter{position:relative;width:48px;height:28px;flex-shrink:0}' +
    '.sym-cb-schalter input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;z-index:1}' +
    '.sym-cb-schalter i{position:absolute;inset:0;border-radius:28px;background:#d6d6dc;transition:background .25s}' +
    '.sym-cb-schalter i::after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25);transition:transform .3s cubic-bezier(.3,1.4,.5,1)}' +
    '.sym-cb-schalter input:checked+i{background:#e53935}.sym-cb-schalter input:checked+i::after{transform:translateX(20px)}' +
    '.sym-cb-schalter input:disabled+i{background:#f19c99;opacity:.8}.sym-cb-schalter input:focus-visible+i{outline:3px solid rgba(229,57,53,.45);outline-offset:2px}' +
    '.sym-cb-immer{font-size:12px;font-weight:700;color:#16a34a;background:#dcfce7;border-radius:999px;padding:3px 10px}' +
    '.sym-cb-wieder{position:fixed;left:14px;bottom:14px;z-index:9990;width:46px;height:46px;border-radius:50%;border:0;cursor:pointer;display:grid;place-items:center;background:#1e1e24;color:#fff;box-shadow:0 10px 24px -8px rgba(0,0,0,.5);transition:transform .25s}' +
    '.sym-cb-wieder:hover{transform:scale(1.08) rotate(-12deg)}.sym-cb-wieder svg{width:24px;height:24px}' +
    'body.hat-leiste .sym-cb-wieder{bottom:92px}' +
    '@media (min-width:721px){body.hat-leiste .sym-cb-wieder{bottom:14px}}' +
    '@media (max-width:520px){.sym-cb{padding:8px}.sym-cb-box{border-radius:20px}.sym-cb-kopf{padding:18px 18px 0}.sym-cb-text{padding:12px 18px 0}.sym-cb-knoepfe{padding:16px 18px 4px}.sym-cb-kat{margin:12px 18px 0}.sym-cb-links{padding:6px 18px 16px}.sym-cb-k{padding:12px 10px;font-size:14px}}' +
    '@media (prefers-reduced-motion:reduce){.sym-cb-box,.sym-cb-keks{animation:none}}';
  var KEKS = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.5A9 9 0 1 1 11.5 3a3 3 0 0 0 3.5 3.5 3 3 0 0 0 3.5 3.5 3 3 0 0 0 2.5 2.5z"/><circle cx="8.5" cy="9.5" r="1" fill="#fff"/><circle cx="9" cy="15" r="1" fill="#fff"/><circle cx="14.5" cy="15.5" r="1" fill="#fff"/><circle cx="12.5" cy="11.5" r=".6" fill="#fff"/></svg>';

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function baue(aktuell, mitEinstellungen) {
    alt();
    var wurzel = document.createElement('div');
    wurzel.className = 'sym-cb';
    wurzel.setAttribute('role', 'dialog');
    wurzel.setAttribute('aria-modal', 'false');
    wurzel.setAttribute('aria-labelledby', 'sym-cb-titel');
    var kats = KATEGORIEN.filter(function (k) { return !k.aus; });
    var einstellungen = kats.map(function (k) {
      var an = k.immer || (aktuell && aktuell[k.id]);
      return '<div class="sym-cb-kat"><div class="sym-cb-kat-kopf"><b>' + esc(k.name) + '</b>' +
        (k.immer ? '<span class="sym-cb-immer">Immer aktiv</span>' : '') +
        '<label class="sym-cb-schalter" title="' + esc(k.name) + '"><input type="checkbox" data-kat="' + k.id + '"' + (an ? ' checked' : '') + (k.immer ? ' disabled' : '') + ' aria-label="' + esc(k.name) + '"><i></i></label></div>' +
        '<p>' + esc(k.text) + '</p><details><summary>Details anzeigen</summary><table>' +
        k.dienste.map(function (d) {
          return '<tr><td>Dienst</td><td><b>' + esc(d[0]) + '</b></td></tr><tr><td>Anbieter</td><td>' + esc(d[1]) + '</td></tr><tr><td>Zweck</td><td>' + esc(d[2]) + '</td></tr><tr><td>Speicherdauer</td><td>' + esc(d[3]) + '</td></tr><tr><td>Übermittlung in Drittland</td><td>' + esc(d[4]) + '</td></tr>';
        }).join('') + '</table></details></div>';
    }).join('');
    wurzel.innerHTML = '<div class="sym-cb-box">' +
      '<div class="sym-cb-kopf"><div class="sym-cb-keks">' + KEKS + '</div><div><h2 id="sym-cb-titel">Ihre Privatsphäre ist uns wichtig</h2><p class="sym-cb-unter">Save Your Möbel · Cookie-Einstellungen</p></div></div>' +
      '<p class="sym-cb-text">Wir verwenden notwendige Technik, damit unsere Website funktioniert. Mit Ihrer Zustimmung nutzen wir außerdem Dienste für <b>Werbe-Messung</b> und <b>externe Medien</b> (z. B. Google Maps). Dabei können Daten an Anbieter in den USA übertragen werden, wo ein geringeres Datenschutzniveau bestehen kann. Ihre Zustimmung ist freiwillig, für die Nutzung der Website nicht nötig und jederzeit über den Keks-Knopf unten links widerrufbar. Mehr in unserer <a href="/datenschutz.php">Datenschutzerklärung</a>.</p>' +
      '<div class="sym-cb-einst"' + (mitEinstellungen ? '' : ' hidden') + '>' + einstellungen + '</div>' +
      '<div class="sym-cb-knoepfe">' +
      '<button type="button" class="sym-cb-k" data-a="nein">Alle ablehnen</button>' +
      '<button type="button" class="sym-cb-k" data-a="ja">Alle akzeptieren</button>' +
      '<button type="button" class="sym-cb-k leise" data-a="' + (mitEinstellungen ? 'auswahl' : 'einst') + '">' + (mitEinstellungen ? 'Auswahl speichern' : 'Einstellungen') + '</button></div>' +
      '<div class="sym-cb-links"><a href="/datenschutz.php">Datenschutz</a><a href="/impressum.php">Impressum</a></div></div>';
    wurzel.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]');
      if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'einst') {
        wurzel.querySelector('.sym-cb-einst').hidden = false;
        b.setAttribute('data-a', 'auswahl');
        b.textContent = 'Auswahl speichern';
        return;
      }
      var wahl = { marketing: a === 'ja', medien: a === 'ja' };
      if (a === 'auswahl') wurzel.querySelectorAll('[data-kat]').forEach(function (x) { wahl[x.getAttribute('data-kat')] = x.checked; });
      var vorher = lies();
      var d = speichere(wahl);
      wurzel.remove();
      knopf();
      // Zurückgenommene Zustimmung: Seite neu laden, damit geladene Dienste wirklich weg sind
      if (vorher && ((vorher.marketing && !d.marketing) || (vorher.medien && !d.medien))) location.reload();
      else anwenden(d);
    });
    document.body.appendChild(wurzel);
    var erster = wurzel.querySelector('[data-a="nein"]');
    if (erster) erster.focus({ preventScroll: true });
  }
  function alt() {
    var a = document.querySelector('.sym-cb');
    if (a) a.remove();
  }
  function knopf() {
    if (document.querySelector('.sym-cb-wieder')) return;
    var k = document.createElement('button');
    k.type = 'button';
    k.className = 'sym-cb-wieder';
    k.setAttribute('aria-label', 'Cookie-Einstellungen öffnen');
    k.title = 'Cookie-Einstellungen';
    k.innerHTML = KEKS;
    k.addEventListener('click', function () { baue(lies(), true); });
    document.body.appendChild(k);
  }

  // Für Links/Knöpfe auf der Datenschutz-Seite
  window.SYM_cookie_einstellungen = function () { baue(lies(), true); };
  window.SYM_werbung_aendern = window.SYM_cookie_einstellungen;

  function start() {
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    var d = lies();
    if (d) { anwenden(d); knopf(); } else baue(null, false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
