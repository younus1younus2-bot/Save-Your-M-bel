// Navigation (Hash-Router) und Start
const ROUTEN = [
  [/^#\/dashboard$/, () => viewDashboard(), 'dashboard'],
  [/^#\/rechnungen$/, () => viewDokumentListe('rechnung'), 'rechnungen'],
  [/^#\/angebote$/, () => viewDokumentListe('angebot'), 'angebote'],
  [/^#\/neu\/(rechnung|angebot)$/, (m) => viewDokument(null, m[1]), (m) => (m[1] === 'rechnung' ? 'rechnungen' : 'angebote')],
  [/^#\/dokument\/(\w+)$/, (m) => viewDokument(m[1]), (m) => (S.dokumente.find((d) => d.id === m[1])?.typ === 'angebot' ? 'angebote' : 'rechnungen')],
  [/^#\/kunden$/, () => viewKunden(), 'kunden'],
  [/^#\/buchhaltung$/, () => viewBuchhaltung(), 'buchhaltung'],
  [/^#\/kalender$/, () => viewKalender(), 'kalender'],
  [/^#\/mitarbeiter$/, () => viewMitarbeiter(), 'mitarbeiter'],
  [/^#\/einstellungen(?:\/(\w+))?$/, (m) => viewEinstellungen(m[1]), 'einstellungen']
];

let letzterHash = '';
function route() {
  if (window.verlassenPruefen && !window.verlassenPruefen()) {
    const ziel = location.hash;
    history.replaceState(null, '', letzterHash);
    bestaetigen('Es gibt ungespeicherte Änderungen. Trotzdem verlassen?', { ok: 'Verlassen ohne Speichern' }).then((ja) => {
      if (!ja) return;
      window.verlassenPruefen = null;
      location.hash = ziel;
    });
    return;
  }
  window.verlassenPruefen = null;
  window.onbeforeunload = null;
  zerstoereCharts();
  const hash = location.hash || '#/dashboard';
  for (const [re, fn, nav] of ROUTEN) {
    const m = hash.match(re);
    if (m) {
      letzterHash = hash;
      const aktiv = typeof nav === 'function' ? nav(m) : nav;
      $$('.nav a').forEach((a) => a.classList.toggle('aktiv', a.dataset.nav === aktiv));
      document.body.classList.remove('menu-offen');
      window.scrollTo(0, 0);
      fn(m);
      return;
    }
  }
  location.hash = '#/dashboard';
}

(async function start() {
  try {
    await ladeAlles();
  } catch (e) {
    $('#main').innerHTML = `<div class="karte"><h2>Server nicht erreichbar</h2><p>${esc(e.message)}</p><p>Bitte mit <code>npm start</code> starten.</p></div>`;
    return;
  }
  $('#menu-btn').onclick = () => document.body.classList.toggle('menu-offen');
  window.addEventListener('hashchange', route);
  route();
})();
