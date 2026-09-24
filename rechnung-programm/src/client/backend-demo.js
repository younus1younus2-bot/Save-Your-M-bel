// Test-Version: dieselbe Geschäftslogik wie der Server, aber mit Speicher im Browser und Beispieldaten
import DEFAULTS from '../shared/defaults.js';
import { erstelleLogik } from '../shared/logik.js';
import { erstelleRouten, fuehreAus } from '../shared/routen.js';
import { erstelleMemorySpeicher } from '../shared/speicher-memory.js';
import { heute, plusTage } from '../shared/rechnen.js';
import { pdfImBrowser } from './pdf-browser.js';
import { dauerMerker } from './ui.js';

const SCHLUESSEL = 'rechnung-programm-test-v3';
const CHEF = { id: 'demo', name: 'Hamam (Test)', email: 'test@beispiel.de', rolle: 'chef' };
const nurServer = () => Promise.reject(new Error('In der Test-Version nicht verfügbar – im eigenen Portal mit Server funktioniert das.'));

let store;
let L;
let routen;

function starte() {
  if (store) return;
  store = erstelleMemorySpeicher(dauerMerker.get(SCHLUESSEL) || {}, { beiAenderung: (z) => dauerMerker.set(SCHLUESSEL, z) });
  L = erstelleLogik(store);
  routen = erstelleRouten(L);
  if (!store.einstellungen()) beispieldaten();
}

// Beispieldaten über die echte Logik anlegen (damit Nummern, Buchungen und Aufträge stimmen)
function beispieldaten() {
  const ctx = { benutzer: { name: 'System', rolle: 'chef' } };
  const s = JSON.parse(JSON.stringify(window.DEMO_DEFAULTS || DEFAULTS));
  Object.assign(s.firma, { steuernummer: '5216/5001/8656', kontoinhaber: 'Hamam Al Hariri', iban: 'DE39 3705 0198 1959 4268 73', bic: 'COLSDE33XXX', bank: 'Sparkasse KölnBonn' });
  s.nummernGeprueft = true;
  s.preiseGeprueft = true;
  s.nummern.rechnung.naechste = 1;
  store.setzeEinstellungen(s);

  const jahr = new Date().getFullYear();
  const monatHeute = new Date().getMonth() + 1;
  const iso = (m, t) => `${jahr}-${String(m).padStart(2, '0')}-${String(t).padStart(2, '0')}`;
  const h = heute();

  const M = [
    ['Ali', '#3B82F6', 'Fahrer'],
    ['Marco', '#10B981', 'Helfer'],
    ['Kevin', '#F59E0B', 'Helfer']
  ].map(([name, farbe, rolle], i) => L.speichere(ctx, 'mitarbeiter', { name, farbe, rolle, telefon: `0170 000000${i + 1}`, email: `${name.toLowerCase()}@beispiel.de`, stundenlohn: 15 }));

  const K = [
    ['Familie Wagner', 'Lindenweg 4', '50667', 'Köln'],
    ['Sabine Koch', 'Ringstraße 12', '50823', 'Köln'],
    ['Thomas Becker', 'Am Markt 7', '53111', 'Bonn'],
    ['Julia Hoffmann', 'Gartenstraße 21', '51063', 'Köln'],
    ['Peter Schulz', 'Bahnhofstraße 3', '40210', 'Düsseldorf'],
    ['Nina Richter', 'Parkallee 15', '50935', 'Köln'],
    ['James Miller', 'Aachener Straße 88', '50674', 'Köln']
  ].map(([name, strasse, plz, ort], i) =>
    L.speichere(ctx, 'kunden', { name, strasse, plz, ort, firma: i === 4 ? 'Schulz Steuerberatung' : '', telefon: `0221 00000${i + 1}`, email: `${name.split(' ').pop().toLowerCase()}@beispiel.de`, sprache: i === 6 ? 'en' : 'de' })
  );

  const p = (beschreibung, preis, menge = 1, einheit = 'Pauschal') => ({ beschreibung, menge, einheit, preis });
  const muster = [
    () => [p('Anfahrt', 40), p('Transportpauschale (inkl. Fahrzeug & Logistik)', 500), p('Beladung', 200), p('Entladung', 200), p('Verpackungsmaterial', 40)],
    () => [p('Anfahrt', 40), p('Transportpauschale (inkl. Fahrzeug & Logistik)', 350), p('Beladung', 150), p('Entladung', 150)],
    () => [p('Anfahrt', 40), p('Transportpauschale (inkl. Fahrzeug & Logistik)', 1850), p('Entladung', 650), p('Beladung', 650), p('Verpackungsmaterial', 200)],
    () => [p('Anfahrt', 40), p('Entrümpelung inkl. Entsorgung', 45, 12, 'm³'), p('Verpackungsmaterial', 30)],
    () => [p('Anfahrt', 40), p('Transportpauschale (inkl. Fahrzeug & Logistik)', 900), p('Beladung', 400), p('Entladung', 400), p('Möbel-Demontage / Montage', 40, 4, 'Std.')]
  ];
  const kundeVon = (k) => ({ name: k.name, firma: k.firma, strasse: k.strasse, plz: k.plz, ort: k.ort, email: k.email, telefon: k.telefon, kundennummer: k.kundennummer });
  const dok = (typ, k, datum, positionen, extra = {}) =>
    L.speichere(ctx, 'dokumente', {
      typ,
      kundeId: k.id,
      kunde: kundeVon(k),
      datum,
      leistungsdatum: datum,
      positionen,
      steuerModus: 'klein',
      sprache: k.sprache,
      kategorie: 'Umzug',
      schlusstext: typ === 'rechnung' ? s.texte.rechnungSchluss : s.texte.angebotSchluss,
      feldWerte: { f_auszug: `${k.strasse}, ${k.plz} ${k.ort}` },
      ...extra
    });

  // Bezahlte Rechnungen der vergangenen Monate
  for (let m = 1; m < monatHeute; m++) {
    for (let i = 0; i < (m % 3 === 0 ? 3 : 2); i++) {
      const tag = 5 + i * 9;
      const idx = (m + i) % muster.length;
      const r = dok('rechnung', K[(m + i) % 6], iso(m, tag), muster[idx](), { kategorie: idx === 3 ? 'Entrümpelung' : 'Umzug', rabattProzent: i === 1 ? 5 : 0 });
      L.bezahlt(ctx, r.id, { datum: iso(m, Math.min(tag + 6, 28)) });
    }
  }
  // Ausgaben
  const ausgaben = [
    ['Kraftstoff', 'Tankfüllung Transporter', 180],
    ['Fahrzeug / Miete', 'Miete 7,5 t LKW', 420],
    ['Löhne / Aushilfen', 'Aushilfen Minijob', 540],
    ['Verpackungsmaterial', 'Kartons und Folie', 95],
    ['Versicherung', 'Betriebshaftpflicht', 60],
    ['Werbung', 'Online-Anzeigen', 80]
  ];
  for (let m = 1; m <= monatHeute; m++) {
    ausgaben.forEach(([kategorie, beschreibung, betrag], i) => {
      const d = iso(m, Math.min(3 + i * 3, 28));
      if (d > h) return;
      L.speichere(ctx, 'buchungen', { datum: d, typ: 'ausgabe', kategorie, beschreibung, betrag: Math.round(betrag * (1 + (((m * 7 + i * 3) % 5) - 2) / 10)), belegNr: `B-${m}-${i + 1}` });
    });
  }

  // Aufträge in allen Phasen des Boards
  const termin = (auftragId, k, tage, von, bis, titel, team, notiz = '', status = 'geplant') =>
    L.speichere(ctx, 'termine', {
      auftragId,
      datum: plusTage(h, tage),
      von,
      bis,
      titel,
      kundeName: k.name,
      kundeId: k.id,
      telefon: k.telefon,
      vonAdresse: `${k.strasse}, ${k.plz} ${k.ort}`,
      nachAdresse: 'Neue Straße 9, 50674 Köln',
      fahrzeug: team.length > 2 ? '7,5 t LKW' : '3,5 t Transporter',
      mitarbeiterIds: team.map((x) => x.id),
      notiz,
      status
    });

  L.speichere(ctx, 'auftraege', { titel: 'Anfrage Nina Richter – Umzug 2 Zimmer', kundeId: K[5].id, kundeName: K[5].name, status: 'anfrage', notiz: 'Rückruf erbeten, Wunschtermin Ende nächsten Monat' });
  const kv1 = dok('angebot', K[4], plusTage(h, -9), muster[4](), { anzahlungProzent: 30, betreff: 'Büroumzug' });
  L.versendet(ctx, kv1.id, {});
  const kv2 = dok('angebot', K[0], plusTage(h, -12), muster[2]());
  L.versendet(ctx, kv2.id, {});
  const r2 = L.umwandeln(ctx, kv2.id);
  termin(r2.auftragId, K[0], 2, '08:00', '16:00', 'Umzug 3-Zimmer-Wohnung', M, '4. OG ohne Aufzug, Halteverbot beantragt');
  const kv3 = dok('angebot', K[6], plusTage(h, -6), muster[0](), { sprache: 'en', schlusstext: s.texte.en.angebotSchluss });
  L.versendet(ctx, kv3.id, {});
  const kv3b = L.umwandeln(ctx, kv3.id);
  termin(kv3b.auftragId, K[6], -2, '09:00', '13:00', 'Umzug Miller', [M[1], M[2]], '', 'erledigt');
  const r4 = dok('rechnung', K[1], plusTage(h, -5), muster[0]());
  L.abschliessen(ctx, r4.id);
  const r5 = dok('rechnung', K[3], plusTage(h, -30), muster[1](), { faelligAm: plusTage(h, -16) });
  L.abschliessen(ctx, r5.id);
  dok('angebot', K[2], plusTage(h, -1), muster[1](), { leistungsdatum: plusTage(h, 12) });
  termin('', K[5], 5, '10:00', '11:00', 'Besichtigung Richter', [M[0]], 'Aufmaß für Kostenvoranschlag');

  L.speichere(ctx, 'aufgaben', { titel: 'Transporter zum TÜV bringen', faellig: plusTage(h, 3) });
  L.speichere(ctx, 'aufgaben', { titel: 'Halteverbot für Familie Wagner beantragen', faellig: h, kundeId: K[0].id });
  L.speichere(ctx, 'notizen', { kundeId: K[0].id, text: 'Anruf: Klavier kommt doch mit, bitte 1 Helfer mehr einplanen.' });
}

async function speichereDownload(blob, name) {
  const dl = window.claude?.use ? await window.claude.use('downloads').catch(() => null) : null;
  if (!dl) throw new Error('Herunterladen ist in dieser Ansicht nicht möglich.');
  try {
    await dl.save({ filename: name, data: blob });
  } catch (e) {
    if (e?.code === 'declined') return;
    if (e?.code === 'rejected_extension') throw new Error('Dieses Dateiformat kann die Test-Version nicht speichern.');
    throw new Error('Herunterladen ist in dieser Ansicht nicht möglich.');
  }
}

export default {
  art: 'demo',
  async api(methode, url, body) {
    starte();
    const { gefunden, ergebnis } = fuehreAus(routen, { benutzer: CHEF }, methode, url, body === undefined ? undefined : JSON.parse(JSON.stringify(body)));
    if (!gefunden) throw new Error('In der Test-Version nicht verfügbar.');
    return JSON.parse(JSON.stringify(ergebnis));
  },
  status: async () => ({ eingerichtet: true, benutzer: CHEF, pdfAufServer: false, mailEingerichtet: false }),
  anmelden: async () => ({ benutzer: CHEF }),
  einrichten: async () => ({ benutzer: CHEF }),
  abmelden: async () => ({}),
  dokumentPdf: (doc, settings) => pdfImBrowser(doc, settings),
  sammelPdf: nurServer,
  einsatzzettelPdf: (tag, html) => pdfImBrowser(null, null, html),
  mailDokument: () => Promise.reject(new Error('In der Test-Version werden keine E-Mails verschickt. Im eigenen Portal geht die Mail mit PDF direkt an den Kunden.')),
  mailTermin: nurServer,
  mailEinsatzzettel: nurServer,
  mailTest: nurServer,
  geoSuche: async () => [],
  geoStrecke: nurServer,
  sicherungHolen: async () => new Blob([JSON.stringify({ version: 2, ...store.exportiere() }, null, 2)], { type: 'application/json' }),
  sicherungMail: nurServer,
  wiederherstellen: async (d) => {
    starte();
    if (!d.sammlungen) throw new Error('Das ist keine gültige Sicherung.');
    store.ersetze(d);
    return { ok: true };
  },
  benutzer: { liste: async () => [CHEF], anlegen: nurServer, aendern: nurServer, passwort: nurServer },
  push: null,
  kannDownload: true,
  download: (blob, name) => speichereDownload(blob, name),
  // nur Test-Version: alles zurücksetzen
  zuruecksetzen(leer) {
    starte();
    store.ersetze({});
    if (leer) {
      const s = JSON.parse(JSON.stringify(window.DEMO_DEFAULTS || DEFAULTS));
      store.setzeEinstellungen(s);
    } else beispieldaten();
  }
};
