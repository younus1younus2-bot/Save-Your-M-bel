// Test-Version: ersetzt den Server durch einen Speicher im Browser und bringt Beispieldaten mit.
// Wird von scripts/build-demo.js nach core.js eingebunden und überschreibt api(), download() und drucken().
const DEMO_KEY = 'rechnung-programm-test-v2';
const DEMO_COLS = ['kunden', 'dokumente', 'buchungen', 'mitarbeiter', 'termine'];

function demoMerge(base, extra) {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return extra === undefined ? base : extra;
  const out = { ...base };
  for (const k of Object.keys(extra || {})) out[k] = k in base ? demoMerge(base[k], extra[k]) : extra[k];
  return out;
}
const demoId = () => Math.random().toString(16).slice(2, 10) + Date.now().toString(16).slice(-6);
const kopie = (x) => JSON.parse(JSON.stringify(x));

let demoDb = null;

function demoLaden() {
  try {
    const roh = localStorage.getItem(DEMO_KEY);
    if (roh) return JSON.parse(roh);
  } catch {
    /* Speicher blockiert – dann nur für diese Sitzung */
  }
  return null;
}
function demoSpeichern() {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(demoDb));
  } catch {
    /* ohne Browserspeicher gehen Änderungen beim Neuladen verloren */
  }
}

// ---------- Beispieldaten ----------
function demoBeispieldaten() {
  const settings = kopie(window.DEMO_DEFAULTS);
  Object.assign(settings.firma, {
    steuernummer: '5216/5001/8656',
    kontoinhaber: 'Hamam Al Hariri',
    iban: 'DE39 3705 0198 1959 4268 73',
    bic: 'COLSDE33XXX',
    bank: 'Sparkasse KölnBonn'
  });
  settings.nummernGeprueft = true;
  settings.preiseGeprueft = true;
  const db = { settings, kunden: [], dokumente: [], buchungen: [], mitarbeiter: [], termine: [] };
  const jetzt = new Date();
  const jahr = jetzt.getFullYear();
  const monatHeute = jetzt.getMonth() + 1;
  const iso = (m, t) => `${jahr}-${String(m).padStart(2, '0')}-${String(t).padStart(2, '0')}`;

  db.mitarbeiter = [
    { name: 'Ali', farbe: '#1E88E5', telefon: '0170 0000001', email: 'ali@beispiel.de', rolle: 'Fahrer', stundenlohn: 16 },
    { name: 'Marco', farbe: '#43A047', telefon: '0170 0000002', email: 'marco@beispiel.de', rolle: 'Helfer', stundenlohn: 14 },
    { name: 'Kevin', farbe: '#FB8C00', telefon: '0170 0000003', email: 'kevin@beispiel.de', rolle: 'Helfer', stundenlohn: 14 }
  ].map((m) => ({ ...m, id: demoId() }));

  db.kunden = [
    ['Familie Wagner', 'Lindenweg 4', '50667', 'Köln'],
    ['Sabine Koch', 'Ringstraße 12', '50823', 'Köln'],
    ['Thomas Becker', 'Am Markt 7', '53111', 'Bonn'],
    ['Julia Hoffmann', 'Gartenstraße 21', '51063', 'Köln'],
    ['Peter Schulz', 'Bahnhofstraße 3', '40210', 'Düsseldorf'],
    ['Nina Richter', 'Parkallee 15', '50935', 'Köln']
  ].map(([name, strasse, plz, ort], i) => ({
    id: demoId(),
    kundennummer: `K${1001 + i}`,
    name,
    firma: i === 4 ? 'Schulz Steuerberatung' : '',
    strasse,
    plz,
    ort,
    telefon: `0221 00000${i + 1}`,
    email: `${name.split(' ').pop().toLowerCase()}@beispiel.de`
  }));

  const p = (beschreibung, preis, menge = 1, einheit = 'Pauschal') => ({ beschreibung, menge, einheit, preis, ustSatz: 19 });
  const pos = {
    anfahrt: () => p('Anfahrt', 40),
    transport: (x) => p('Transportpauschale (inkl. Fahrzeug & Logistik)', x),
    beladung: (x) => p('Beladung', x),
    entladung: (x) => p('Entladung', x),
    verpackung: (x) => p('Verpackungsmaterial', x),
    montage: (h) => p('Möbel-Demontage / Montage', 40, h, 'Std.'),
    entr: (m3) => p('Entrümpelung inkl. Entsorgung', 45, m3, 'm³')
  };

  let reNr = 1;
  let kvNr = 1;
  const nr = (cfg, n) => cfg.prefix.replace('{JAHR}', jahr) + String(n).padStart(cfg.stellen || 1, '0');
  const doc = (typ, kunde, datumIso, positionen, extra = {}) => {
    const s = settings;
    const d = {
      id: demoId(),
      typ,
      nummer: typ === 'rechnung' ? nr(s.nummern.rechnung, reNr++) : nr(s.nummern.angebot, kvNr++),
      status: 'offen',
      datum: datumIso,
      leistungsdatum: datumIso,
      faelligAm: plusTage(datumIso, s.zahlungszielTage),
      gueltigBis: plusTage(datumIso, s.angebotGueltigTage),
      kundeId: kunde.id,
      kunde: { name: kunde.name, firma: kunde.firma, strasse: kunde.strasse, plz: kunde.plz, ort: kunde.ort, email: kunde.email, telefon: kunde.telefon, kundennummer: kunde.kundennummer },
      betreff: '',
      einleitung: typ === 'rechnung' ? s.texte.rechnungEinleitung : s.texte.angebotEinleitung,
      schlusstext: typ === 'rechnung' ? s.texte.rechnungSchluss : s.texte.angebotSchluss,
      positionen,
      rabattProzent: 0,
      anzahlungProzent: 0,
      zeigeAnteil: false,
      steuerModus: 'klein',
      kategorie: 'Umzug',
      feldWerte: { f_auszug: `${kunde.strasse}, ${kunde.plz} ${kunde.ort}` },
      extraFelder: [],
      verlauf: [],
      ...extra
    };
    db.dokumente.push(d);
    if (d.typ === 'rechnung' && d.status === 'bezahlt') {
      const c = berechne(d);
      db.buchungen.push({ id: demoId(), datum: d.bezahltAm, typ: 'einnahme', kategorie: d.kategorie, beschreibung: `Rechnung ${d.nummer} – ${d.kunde.firma || d.kunde.name}`, betrag: c.brutto, ust: 0, belegNr: d.nummer, dokumentId: d.id });
    }
    return d;
  };

  const K = db.kunden;
  const muster = [
    () => [pos.anfahrt(), pos.transport(500), pos.beladung(200), pos.entladung(200), pos.verpackung(40)],
    () => [pos.anfahrt(), pos.transport(350), pos.beladung(150), pos.entladung(150)],
    () => [pos.anfahrt(), pos.transport(1850), pos.entladung(650), pos.beladung(650), pos.verpackung(200)],
    () => [pos.anfahrt(), pos.entr(12), pos.verpackung(30)],
    () => [pos.anfahrt(), pos.transport(900), pos.beladung(400), pos.entladung(400), pos.montage(4), pos.verpackung(80)]
  ];

  // Rechnungen der vergangenen Monate (bezahlt)
  for (let m = 1; m < monatHeute; m++) {
    const anzahl = 1 + (m % 3 === 0 ? 2 : 1);
    for (let i = 0; i < anzahl; i++) {
      const tag = 5 + i * 9;
      const idx = (m + i) % muster.length;
      doc('rechnung', K[(m + i) % K.length], iso(m, tag), muster[idx](), {
        status: 'bezahlt',
        bezahltAm: iso(m, Math.min(tag + 6, 28)),
        kategorie: idx === 3 ? 'Entrümpelung' : 'Umzug',
        rabattProzent: i === 1 ? 5 : 0
      });
    }
  }
  // Aktueller Monat: eine offene, eine überfällige Rechnung
  const heuteIso = heute();
  doc('rechnung', K[5], plusTage(heuteIso, -12), muster[4](), { status: 'bezahlt', bezahltAm: plusTage(heuteIso, -4) });
  doc('rechnung', K[1], plusTage(heuteIso, -5), muster[0](), { status: 'offen' });
  doc('rechnung', K[3], plusTage(heuteIso, -30), muster[1](), { status: 'offen', faelligAm: plusTage(heuteIso, -16) });

  // Kostenvoranschläge
  doc('angebot', K[0], plusTage(heuteIso, -40), muster[2](), { status: 'angenommen' });
  doc('angebot', K[2], plusTage(heuteIso, -25), muster[4](), { status: 'abgelehnt' });
  doc('angebot', K[4], plusTage(heuteIso, -3), muster[4](), { status: 'offen', anzahlungProzent: 30, betreff: 'Kostenvoranschlag Büroumzug' });
  doc('angebot', K[5], plusTage(heuteIso, -1), muster[0](), { status: 'entwurf', leistungsdatum: plusTage(heuteIso, 12) });

  // Ausgaben
  const ausgaben = [
    ['Kraftstoff', 'Tankfüllung Transporter', 180],
    ['Fahrzeug / Miete', 'Miete 7,5 t LKW', 420],
    ['Löhne / Aushilfen', 'Aushilfen Minijob', 540],
    ['Verpackungsmaterial', 'Kartons und Folie', 95],
    ['Versicherung', 'Betriebshaftpflicht', 60],
    ['Werbung', 'Online-Anzeigen', 80],
    ['Büro / Telefon', 'Handyvertrag', 35]
  ];
  for (let m = 1; m <= monatHeute; m++) {
    ausgaben.forEach(([kategorie, beschreibung, betrag], i) => {
      if (m === monatHeute && i > 3) return;
      const schwankung = 1 + (((m * 7 + i * 3) % 5) - 2) / 10;
      db.buchungen.push({ id: demoId(), datum: iso(m, Math.min(3 + i * 3, 28)), typ: 'ausgabe', kategorie, beschreibung, betrag: r2(betrag * schwankung), ust: 0, belegNr: `B-${m}-${i + 1}` });
    });
  }

  // Termine
  const M = db.mitarbeiter;
  const termin = (tage, von, bis, titel, k, team, notiz = '', fahrzeug = '3,5 t Transporter') =>
    db.termine.push({
      id: demoId(),
      datum: plusTage(heuteIso, tage),
      von,
      bis,
      titel,
      kundeName: k.name,
      kundeId: k.id,
      telefon: k.telefon,
      vonAdresse: `${k.strasse}, ${k.plz} ${k.ort}`,
      nachAdresse: 'Neue Straße 9, 50674 Köln',
      fahrzeug,
      status: tage < 0 ? 'erledigt' : 'geplant',
      mitarbeiterIds: team.map((m) => m.id),
      notiz
    });
  termin(-6, '08:00', '14:00', 'Umzug 2-Zimmer-Wohnung', K[1], [M[0], M[1]]);
  termin(-2, '09:00', '12:00', 'Entrümpelung Keller', K[3], [M[1], M[2]]);
  termin(1, '08:00', '16:00', 'Umzug 3-Zimmer-Wohnung', K[0], [M[0], M[1], M[2]], '4. OG ohne Aufzug, Halteverbot beantragt', '7,5 t LKW');
  termin(3, '10:00', '13:00', 'Besichtigung Büroumzug', K[4], [M[0]], 'Aufmaß für Kostenvoranschlag');
  termin(6, '07:30', '15:00', 'Büroumzug Schulz', K[4], [M[0], M[1], M[2]], '12 Arbeitsplätze, Aktenschränke', '7,5 t LKW');
  termin(12, '08:00', '13:00', 'Umzug 1-Zimmer-Wohnung', K[5], [M[1], M[2]], 'Klavier!');

  settings.nummern.rechnung.naechste = reNr;
  settings.nummern.angebot.naechste = kvNr;
  return db;
}

function demoLeer() {
  return { settings: demoBeispieldaten().settings, kunden: [], dokumente: [], buchungen: [], mitarbeiter: [], termine: [] };
}

// ---------- Ersatz für den Server ----------
async function api(method, url, body) {
  if (!demoDb) {
    demoDb = demoLaden() || demoBeispieldaten();
    demoDb.settings = demoMerge(window.DEMO_DEFAULTS, demoDb.settings || {});
    DEMO_COLS.forEach((c) => (demoDb[c] = demoDb[c] || []));
    demoSpeichern();
  }
  const teile = url.split('/').filter(Boolean);
  const antwort = (x) => kopie(x);

  if (url === '/api/settings') {
    if (method === 'PUT') {
      demoDb.settings = demoMerge(window.DEMO_DEFAULTS, body || {});
      demoSpeichern();
    }
    return antwort(demoDb.settings);
  }
  if (teile[0] === 'api' && teile[1] === 'nummer') {
    const cfg = demoDb.settings.nummern[teile[2]];
    const nummer = cfg.prefix.replace('{JAHR}', String(new Date().getFullYear())) + String(cfg.naechste).padStart(cfg.stellen || 1, '0');
    cfg.naechste += 1;
    demoSpeichern();
    return { nummer };
  }
  if (url.startsWith('/api-mail')) {
    throw new Error('In der Test-Version werden keine E-Mails verschickt. Im eigenen Portal mit Server geht die Mail mit PDF direkt an den Kunden.');
  }
  if (url === '/api-restore') {
    demoDb = { settings: demoMerge(window.DEMO_DEFAULTS, body.settings) };
    DEMO_COLS.forEach((c) => (demoDb[c] = Array.isArray(body[c]) ? body[c] : []));
    demoSpeichern();
    return { ok: true };
  }
  if (teile[0] === 'api' && DEMO_COLS.includes(teile[1])) {
    const list = demoDb[teile[1]];
    const id = teile[2];
    if (method === 'GET') return antwort(list);
    if (method === 'POST') {
      const item = { ...body, id: demoId(), erstellt: new Date().toISOString() };
      list.push(item);
      demoSpeichern();
      return antwort(item);
    }
    const i = list.findIndex((x) => x.id === id);
    if (i < 0) throw new Error('Nicht gefunden');
    if (method === 'PUT') {
      list[i] = { ...list[i], ...body, id, geaendert: new Date().toISOString() };
      demoSpeichern();
      return antwort(list[i]);
    }
    if (method === 'DELETE') {
      list.splice(i, 1);
      demoSpeichern();
      return { ok: true };
    }
  }
  throw new Error(`Unbekannte Anfrage: ${method} ${url}`);
}

// Dateien über die Download-Freigabe der Test-Seite anbieten (der Browser fragt vorher nach)
const demoDownloads = window.claude?.use ? window.claude.use('downloads').catch(() => null) : Promise.resolve(null);
async function download(blob, name) {
  const dl = await demoDownloads;
  if (!dl) return toast(`„${name}“ wurde erstellt. Herunterladen ist in dieser Ansicht nicht möglich.`);
  try {
    await dl.save({ filename: name, data: blob });
  } catch (e) {
    if (e?.code === 'declined') return;
    if (e?.code === 'rejected_extension') return toast('Dieses Dateiformat kann die Test-Version nicht speichern. Im eigenen Portal geht es.', 'fehler');
    if (e?.code === 'rate_limited') return toast('Bitte kurz warten und noch einmal versuchen.', 'fehler');
    toast('Herunterladen ist in dieser Ansicht nicht möglich.', 'fehler');
  }
}
function drucken() {
  toast('Drucken geht nur im eigenen Portal. Die Vorschau rechts zeigt genau das Druckbild.');
}

// Hinweisleiste und Zurücksetzen
(function demoLeiste() {
  const box = document.createElement('div');
  box.className = 'demo-box';
  box.innerHTML = `<b>Test-Version</b><span>Beispieldaten. Deine Änderungen bleiben nur in diesem Browser gespeichert.</span>
    <button class="btn btn-klein" id="demo-reset">Beispieldaten neu laden</button>
    <button class="btn btn-klein" id="demo-leer">Mit leerem Portal starten</button>`;
  document.querySelector('.seitenleiste').insertBefore(box, document.querySelector('#thema-knopf'));
  const neu = async (daten, text) => {
    if (!(await bestaetigen(text, { ok: 'Ja, zurücksetzen' }))) return;
    demoDb = daten;
    demoSpeichern();
    await ladeAlles();
    location.hash = '#/dashboard';
    route();
    toast('Fertig');
  };
  box.querySelector('#demo-reset').onclick = () => neu(demoBeispieldaten(), 'Alle Änderungen werden verworfen und die Beispieldaten neu geladen.');
  box.querySelector('#demo-leer').onclick = () => neu(demoLeer(), 'Alle Daten werden gelöscht. Du startest mit einem leeren Portal.');
  document.addEventListener('click', (e) => {
    if (e.target.closest('a[href="/api-backup"]')) {
      e.preventDefault();
      download(new Blob([JSON.stringify(demoDb, null, 2)], { type: 'application/json' }), `rechnung-programm-sicherung-${heute()}.json`);
    }
  });
})();
