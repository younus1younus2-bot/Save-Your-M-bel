// Berichte zum Öffnen ohne Portal: Excel (Umsätze, Rechnungen, KVs, Einnahmen/Ausgaben) und Word (Übersicht).
// Liegen immer aktuell in data/berichte/ und werden von dort z. B. nach OneDrive hochgeladen.
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { AlignmentType, Document, HeadingLevel, Packer, PageOrientation, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { berechne, parseZahl } from '../src/shared/rechnen.js';

export const DATEI_EXCEL = 'Save-Your-Moebel-Umsaetze.xlsx';
export const DATEI_WORD = 'Save-Your-Moebel-Uebersicht.docx';
export const ORDNER_ABLAGE = 'ablage';

const STATUS = {
  rechnung: { entwurf: 'Entwurf', offen: 'Offen', bezahlt: 'Bezahlt', storniert: 'Storniert', storno: 'Storno' },
  angebot: { entwurf: 'Entwurf', offen: 'Versendet', angenommen: 'Angenommen', abgelehnt: 'Abgelehnt' }
};
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const ROT = 'E53935';
const r2 = (n) => Math.round(n * 100) / 100;
const alsDatum = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || '') ? new Date(`${s}T12:00:00Z`) : null);
const deDatum = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || '') ? s.split('-').reverse().join('.') : '');
const euro = (n) => `${r2(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

// Alle Zahlen einmal aufbereiten (Beträge in Euro)
// belege: { buchungId: ['Belege/2026/2026-09/….jpg', …] } – Pfade in der Ablage
export function aufbereiten(daten, { belege = {} } = {}) {
  const summen = (d) => {
    const c = d.gesperrt && d.summen ? d.summen : berechne(d).cent;
    return { netto: c.netto / 100, ust: c.ust / 100, brutto: c.brutto / 100 };
  };
  const dok = (d) => ({
    nummer: d.nummer || '(Entwurf)',
    datum: d.datum || '',
    kunde: d.kunde?.firma || d.kunde?.name || '',
    betreff: d.betreff || d.titel || '',
    status: STATUS[d.typ]?.[d.status] || d.status || '',
    faellig: d.faelligAm || '',
    bezahlt: d.bezahltAm || '',
    gueltig: d.gueltigBis || '',
    offen: d.typ === 'rechnung' && d.status === 'offen' && !d.storno,
    ...summen(d)
  });
  const nachDatum = (a, b) => (b.datum || '').localeCompare(a.datum || '');
  const rechnungen = daten.dokumente
    .filter((d) => d.typ === 'rechnung')
    .map(dok)
    .sort(nachDatum);
  const angebote = daten.dokumente
    .filter((d) => d.typ === 'angebot')
    .map(dok)
    .sort(nachDatum);
  const buchungen = daten.buchungen
    .map((b) => {
      const brutto = parseZahl(b.betrag);
      const ust = parseZahl(b.ust);
      const dateien = belege[b.id] || [];
      return {
        belegDatei: dateien[0] || '',
        belegAnzahl: dateien.length,
        details: b.notiz || '',
        datum: b.datum || '',
        typ: b.typ === 'einnahme' ? 'Einnahme' : 'Ausgabe',
        beleg: b.belegNr || '',
        beschreibung: b.beschreibung || '',
        kategorie: b.kategorie || '',
        brutto,
        ust,
        netto: r2(brutto - ust)
      };
    })
    .sort(nachDatum);

  // Umsatz je Monat (aus den Buchungen = tatsächlich eingenommen/ausgegeben)
  const monate = new Map();
  for (const b of buchungen) {
    const schluessel = b.datum.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(schluessel)) continue;
    const m = monate.get(schluessel) || { einnahmen: 0, ausgaben: 0, ustEin: 0, ustAus: 0 };
    if (b.typ === 'Einnahme') ((m.einnahmen += b.netto), (m.ustEin += b.ust));
    else ((m.ausgaben += b.netto), (m.ustAus += b.ust));
    monate.set(schluessel, m);
  }
  const monatsliste = [...monate.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([k, m]) => ({ jahr: k.slice(0, 4), monat: MONATE[Number(k.slice(5, 7)) - 1], ...m, gewinn: r2(m.einnahmen - m.ausgaben) }));
  const jahre = new Map();
  for (const m of monatsliste) {
    const j = jahre.get(m.jahr) || { jahr: m.jahr, einnahmen: 0, ausgaben: 0, gewinn: 0 };
    j.einnahmen += m.einnahmen;
    j.ausgaben += m.ausgaben;
    j.gewinn += m.gewinn;
    jahre.set(m.jahr, j);
  }
  const offen = rechnungen.filter((r) => r.offen);
  return {
    firma: daten.settings?.firma?.name || 'Save Your Möbel',
    rechnungen,
    angebote,
    buchungen,
    monate: monatsliste,
    jahre: [...jahre.values()],
    offen: { anzahl: offen.length, summe: offen.reduce((s, r) => s + r.brutto, 0) }
  };
}

// ---------- Excel ----------
export async function excel(daten, optionen = {}) {
  const a = aufbereiten(daten, optionen);
  const wb = new ExcelJS.Workbook();
  wb.creator = a.firma;
  wb.created = new Date();
  const EURO = '#,##0.00 "€";[Red]-#,##0.00 "€"';

  function blatt(name, spalten, zeilen, summenSpalten = []) {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = spalten.map(([header, key, width, art]) => ({ header, key, width, style: art === 'euro' ? { numFmt: EURO } : art === 'datum' ? { numFmt: 'dd.mm.yyyy' } : {} }));
    const kopf = ws.getRow(1);
    kopf.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    kopf.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${ROT}` } };
    const wert = (z, key, art) => {
      if (art === 'datum') return alsDatum(z[key]);
      // Link auf die Belegdatei im Ordner „Ablage“ (liegt in OneDrive neben „Berichte“)
      if (art === 'beleg') return z.belegDatei ? { text: `${path.basename(z.belegDatei)}${z.belegAnzahl > 1 ? ` (+${z.belegAnzahl - 1})` : ''}`, hyperlink: `../Ablage/${z.belegDatei}` } : '';
      return z[key];
    };
    for (const z of zeilen) ws.addRow(Object.fromEntries(spalten.map(([, key, , art]) => [key, wert(z, key, art)])));
    ws.getColumn(spalten.findIndex((s) => s[3] === 'beleg') + 1 || spalten.length).font = spalten.some((s) => s[3] === 'beleg') ? { color: { argb: 'FF1D4ED8' }, underline: true } : undefined;
    if (zeilen.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: spalten.length } };
    if (summenSpalten.length && zeilen.length) {
      const summe = ws.addRow({ [spalten[0][1]]: 'Summe' });
      summe.font = { bold: true };
      for (const key of summenSpalten) {
        const spalte = ws.getColumn(key);
        const buchstabe = spalte.letter;
        summe.getCell(key).value = { formula: `SUBTOTAL(9,${buchstabe}2:${buchstabe}${zeilen.length + 1})` };
      }
    }
    return ws;
  }

  blatt(
    'Umsatz je Monat',
    [
      ['Jahr', 'jahr', 8],
      ['Monat', 'monat', 12],
      ['Einnahmen (netto)', 'einnahmen', 18, 'euro'],
      ['Ausgaben (netto)', 'ausgaben', 18, 'euro'],
      ['Gewinn', 'gewinn', 16, 'euro'],
      ['USt. eingenommen', 'ustEin', 17, 'euro'],
      ['Vorsteuer', 'ustAus', 14, 'euro']
    ],
    a.monate,
    ['einnahmen', 'ausgaben', 'gewinn', 'ustEin', 'ustAus']
  );
  blatt(
    'Rechnungen',
    [
      ['Nummer', 'nummer', 12],
      ['Datum', 'datum', 12, 'datum'],
      ['Kunde', 'kunde', 28],
      ['Betreff', 'betreff', 30],
      ['Netto', 'netto', 14, 'euro'],
      ['USt.', 'ust', 12, 'euro'],
      ['Brutto', 'brutto', 14, 'euro'],
      ['Status', 'status', 12],
      ['Fällig am', 'faellig', 12, 'datum'],
      ['Bezahlt am', 'bezahlt', 12, 'datum']
    ],
    a.rechnungen,
    ['netto', 'ust', 'brutto']
  );
  blatt(
    'Kostenvoranschläge',
    [
      ['Nummer', 'nummer', 12],
      ['Datum', 'datum', 12, 'datum'],
      ['Kunde', 'kunde', 28],
      ['Betreff', 'betreff', 30],
      ['Netto', 'netto', 14, 'euro'],
      ['Brutto', 'brutto', 14, 'euro'],
      ['Status', 'status', 12],
      ['Gültig bis', 'gueltig', 12, 'datum']
    ],
    a.angebote,
    ['netto', 'brutto']
  );
  blatt(
    'Einnahmen & Ausgaben',
    [
      ['Datum', 'datum', 12, 'datum'],
      ['Art', 'typ', 10],
      ['Beleg', 'beleg', 12],
      ['Beschreibung', 'beschreibung', 40],
      ['Kategorie', 'kategorie', 18],
      ['Brutto', 'brutto', 14, 'euro'],
      ['USt.', 'ust', 12, 'euro'],
      ['Netto', 'netto', 14, 'euro'],
      ['Details', 'details', 30],
      ['Belegdatei (Foto/PDF)', 'belegDatei', 42, 'beleg']
    ],
    a.buchungen.map((b) => (b.typ === 'Ausgabe' ? { ...b, brutto: -b.brutto, ust: -b.ust, netto: -b.netto } : b)),
    ['brutto', 'ust', 'netto']
  );
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------- Word ----------
export async function word(daten, stand = new Date(), optionen = {}) {
  const a = aufbereiten(daten, optionen);
  const zelle = (text, { kopf = false, rechts = false } = {}) =>
    new TableCell({
      shading: kopf ? { type: ShadingType.CLEAR, fill: ROT, color: 'auto' } : undefined,
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children: [
        new Paragraph({ alignment: rechts ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text: String(text ?? ''), bold: kopf, color: kopf ? 'FFFFFF' : undefined, size: 18 })] })
      ]
    });
  const tabelle = (kopf, zeilen, rechtsAb = 99) =>
    zeilen.length
      ? new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: kopf.map((k, i) => zelle(k, { kopf: true, rechts: i >= rechtsAb })) }),
            ...zeilen.map((z) => new TableRow({ children: z.map((v, i) => zelle(v, { rechts: i >= rechtsAb })) }))
          ]
        })
      : new Paragraph({ children: [new TextRun({ text: 'Noch keine Einträge.', italics: true })] });
  const ueberschrift = (text) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 120 }, children: [new TextRun({ text, color: ROT })] });
  const absatz = (text) => new Paragraph({ spacing: { after: 120 }, children: [new TextRun(text)] });

  const jahr = String(stand.getFullYear());
  const diesesJahr = a.jahre.find((j) => j.jahr === jahr) || { einnahmen: 0, ausgaben: 0, gewinn: 0 };
  const kvOffen = a.angebote.filter((k) => k.status === 'Versendet');

  const doc = new Document({
    creator: a.firma,
    title: `${a.firma} – Übersicht`,
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
    sections: [
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: `${a.firma} – Übersicht`, color: ROT })] }),
          absatz(`Stand: ${stand.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' })} · wird vom Portal automatisch aktualisiert`),

          ueberschrift(`Zusammenfassung ${jahr}`),
          tabelle(
            ['', 'Betrag'],
            [
              ['Einnahmen (netto)', euro(diesesJahr.einnahmen)],
              ['Ausgaben (netto)', euro(diesesJahr.ausgaben)],
              ['Gewinn', euro(diesesJahr.gewinn)],
              [`Offene Rechnungen (${a.offen.anzahl})`, euro(a.offen.summe)],
              [`Versendete Kostenvoranschläge ohne Antwort (${kvOffen.length})`, euro(kvOffen.reduce((s, k) => s + k.brutto, 0))]
            ],
            1
          ),

          ueberschrift('Umsatz je Jahr'),
          tabelle(
            ['Jahr', 'Einnahmen (netto)', 'Ausgaben (netto)', 'Gewinn'],
            a.jahre.map((j) => [j.jahr, euro(j.einnahmen), euro(j.ausgaben), euro(j.gewinn)]),
            1
          ),

          ueberschrift('Umsatz je Monat'),
          tabelle(
            ['Monat', 'Einnahmen (netto)', 'Ausgaben (netto)', 'Gewinn'],
            a.monate.map((m) => [`${m.monat} ${m.jahr}`, euro(m.einnahmen), euro(m.ausgaben), euro(m.gewinn)]),
            1
          ),

          ueberschrift(`Rechnungen (${a.rechnungen.length})`),
          tabelle(
            ['Nummer', 'Datum', 'Kunde', 'Betreff', 'Status', 'Bezahlt am', 'Netto', 'Brutto'],
            a.rechnungen.map((r) => [r.nummer, deDatum(r.datum), r.kunde, r.betreff, r.status, deDatum(r.bezahlt), euro(r.netto), euro(r.brutto)]),
            6
          ),

          ueberschrift(`Kostenvoranschläge (${a.angebote.length})`),
          tabelle(
            ['Nummer', 'Datum', 'Kunde', 'Betreff', 'Status', 'Gültig bis', 'Brutto'],
            a.angebote.map((k) => [k.nummer, deDatum(k.datum), k.kunde, k.betreff, k.status, deDatum(k.gueltig), euro(k.brutto)]),
            6
          ),

          ueberschrift(`Einnahmen & Ausgaben (${a.buchungen.length})`),
          tabelle(
            ['Datum', 'Art', 'Beleg', 'Beschreibung', 'Kategorie', 'Brutto', 'USt.', 'Belegdatei'],
            a.buchungen.map((b) => [
              deDatum(b.datum),
              b.typ,
              b.beleg,
              b.beschreibung,
              b.kategorie,
              euro(b.typ === 'Ausgabe' ? -b.brutto : b.brutto),
              euro(b.typ === 'Ausgabe' ? -b.ust : b.ust),
              b.belegAnzahl ? `✓ ${b.belegAnzahl}` : '–'
            ]),
            5
          )
        ]
      }
    ]
  });
  return Packer.toBuffer(doc);
}

const sicher = (t) =>
  String(t || '')
    .replace(/[\\/:*?"<>|\t\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 70);
const betragText = (n) => `${r2(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;

// Ablage: jede Datei aus dem Portal als echte Datei, sortiert nach Bereich und Datum
//   Belege/2026/2026-09/2026-09-26 Ausgabe Diesel 85,00 EUR (ab12cd).jpg
//   Fotos & Dateien/Aufträge/2026-09/2026-09-26 Umzug Wagner - Klavier (ef34gh).jpg
export function ablagePfad(f, hole) {
  // Bilder werden in der Ablage als PDF gespeichert (WebP bleibt, weil es sich nicht einbetten lässt)
  const endung = f.typ === 'image/webp' ? 'webp' : 'pdf';
  const kurz = String(f.id)
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 6);
  const buchung = f.buchungId ? hole('buchungen', f.buchungId) : null;
  if (buchung) {
    const tag = /^\d{4}-\d{2}-\d{2}$/.test(buchung.datum || '') ? buchung.datum : String(f.erstellt || '').slice(0, 10);
    const text = [
      tag,
      buchung.typ === 'einnahme' ? 'Einnahme' : 'Ausgabe',
      sicher(buchung.beschreibung || buchung.kategorie),
      betragText(parseZahl(buchung.betrag)),
      f.beschreibung ? `- ${sicher(f.beschreibung)}` : ''
    ]
      .filter(Boolean)
      .join(' ');
    return path.join('Belege', tag.slice(0, 4), tag.slice(0, 7), `${text} (${kurz}).${endung}`);
  }
  const tag = String(f.erstellt || '').slice(0, 10) || 'ohne-datum';
  const bezug = (() => {
    if (f.dokumentId) {
      const d = hole('dokumente', f.dokumentId);
      return ['Rechnungen & KVs', d && [d.nummer || (d.typ === 'angebot' ? 'KV-Entwurf' : 'Entwurf'), d.kunde?.firma || d.kunde?.name].filter(Boolean).join(' ')];
    }
    if (f.aufgabeId) return ['Aufgaben', hole('aufgaben', f.aufgabeId)?.titel];
    if (f.mitarbeiterId) return ['Mitarbeiter', hole('mitarbeiter', f.mitarbeiterId)?.name];
    if (f.terminId && !f.auftragId) {
      const t = hole('termine', f.terminId);
      return ['Termine', t && [t.datum, t.titel || t.kundeName].filter(Boolean).join(' ')];
    }
    if (f.auftragId) return ['Aufträge', hole('auftraege', f.auftragId)?.titel];
    return ['Kunden', hole('kunden', f.kundeId)?.name];
  })();
  const text = [tag, sicher(bezug[1]), f.beschreibung || f.name ? `- ${sicher(f.beschreibung || String(f.name).replace(/\.[^.]+$/, ''))}` : ''].filter(Boolean).join(' ');
  return path.join('Fotos & Dateien', bezug[0], tag.slice(0, 7), `${text} (${kurz}).${endung}`);
}

// Hält data/berichte/ aktuell: neu erzeugen, sobald sich Rechnungen, KVs oder Buchungen geändert haben
// Rechnungen und KVs in der Ablage:
//   Rechnungen/2026/2026-09/2026-09-26 Rechnung HA04 Anna Schmidt (ab12cd).pdf
//   Kostenvoranschläge/2026/2026-09/2026-09-22 KV12 Familie Yilmaz (ef34gh).pdf
export function dokumentPfad(d) {
  const tag = /^\d{4}-\d{2}-\d{2}$/.test(d.datum || '') ? d.datum : String(d.erstellt || '').slice(0, 10) || 'ohne-datum';
  const kurz = String(d.id)
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 6);
  const art = d.typ === 'angebot' ? 'Kostenvoranschläge' : 'Rechnungen';
  const bezeichnung = d.typ === 'angebot' ? d.nummer || 'KV-Entwurf' : `${d.storno ? 'Stornorechnung' : 'Rechnung'} ${d.nummer || 'Entwurf'}`;
  const text = [tag, sicher(bezeichnung), sicher(d.kunde?.firma || d.kunde?.name)].filter(Boolean).join(' ');
  return path.join(art, tag.slice(0, 4), tag.slice(0, 7), `${text} (${kurz}).pdf`);
}

// Foto als einseitiges A4-PDF (Bild eingepasst, Beschreibung oben)
export async function bildAlsPdf(dataUrl, typ, titel = '') {
  const pdf = await PDFDocument.create();
  // eigene Kopie: pdf-lib liest sonst am geteilten Speicher von Buffer vorbei
  const bytes = new Uint8Array(Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64'));
  const bild = typ === 'image/png' ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  const [breite, hoehe] = [595.28, 841.89];
  const rand = 36;
  const seite = pdf.addPage([breite, hoehe]);
  let oben = hoehe - rand;
  if (titel) {
    const schrift = await pdf.embedFont(StandardFonts.Helvetica);
    const text = titel.replace(/[^\x20-\x7E\xA0-\xFF€]/g, '').slice(0, 90);
    seite.drawText(text, { x: rand, y: oben - 12, size: 12, font: schrift, color: rgb(0.2, 0.2, 0.2) });
    oben -= 28;
  }
  const faktor = Math.min((breite - 2 * rand) / bild.width, (oben - rand) / bild.height, 1.5);
  const w = bild.width * faktor;
  const h = bild.height * faktor;
  seite.drawImage(bild, { x: (breite - w) / 2, y: oben - h, width: w, height: h });
  return Buffer.from(await pdf.save());
}

// Hält data/berichte/ (Excel, Word) und data/ablage/ (alles als PDF) aktuell
export function erstelleBerichte({ L, speicher, datenOrdner, log, pdf = null, render = null }) {
  const ordner = path.join(datenOrdner, 'berichte');
  const ablage = path.join(datenOrdner, ORDNER_ABLAGE);
  const standDatei = path.join(ablage, '.stand.json');
  let letzterStand = '';
  let laeuft = null;
  let pdfHinweis = false;
  const chefDaten = () => L.daten({ benutzer: { rolle: 'chef' } });
  const dateiListe = () => (speicher ? speicher.finde('dateien', {}, { ohne: ['daten', 'vorschau'] }) : []);
  const unix = (rel) => rel.split(path.sep).join('/');

  // Was in der Ablage liegen soll: Anhänge und (wenn PDF auf dem Server möglich) Rechnungen/KVs
  function plan(d = chefDaten(), liste = dateiListe()) {
    const eintraege = [];
    const belege = {};
    if (!speicher) return { eintraege, belege };
    for (const f of liste) {
      const rel = ablagePfad(f, speicher.hole);
      eintraege.push({ rel, stempel: f.id, datei: f });
      if (f.buchungId) (belege[f.buchungId] ||= []).push(unix(rel));
    }
    const einst = JSON.stringify(d.settings || {}).length;
    for (const doc of d.dokumente) eintraege.push({ rel: dokumentPfad(doc), stempel: `${doc.geaendert || doc.erstellt}|${doc.status}|${einst}`, dokument: doc });
    return { eintraege, belege };
  }

  async function schreibeAblage({ eintraege }) {
    if (!speicher) return;
    let stand = {};
    try {
      stand = JSON.parse(fs.readFileSync(standDatei, 'utf8'));
    } catch {
      /* noch keine Ablage */
    }
    const pdfMoeglich = pdf && render && (await pdf.pruefe());
    if (!pdfMoeglich && !pdfHinweis && eintraege.some((e) => e.dokument)) {
      pdfHinweis = true;
      log('Ablage: Rechnungen/KVs als PDF brauchen Chromium auf dem Server (im Docker-Container enthalten).');
    }
    const soll = new Set();
    for (const e of eintraege) {
      if (e.dokument && !pdfMoeglich) continue;
      soll.add(e.rel);
      const ziel = path.join(ablage, e.rel);
      if (stand[e.rel] === e.stempel && fs.existsSync(ziel)) continue;
      try {
        let inhalt;
        if (e.dokument) inhalt = await pdf.erzeuge(render(e.dokument, L.einstellungen()));
        else {
          const ganz = speicher.hole('dateien', e.datei.id);
          if (!ganz?.daten) continue;
          inhalt = ['application/pdf', 'image/webp'].includes(ganz.typ)
            ? Buffer.from(ganz.daten.slice(ganz.daten.indexOf(',') + 1), 'base64')
            : await bildAlsPdf(ganz.daten, ganz.typ, ganz.beschreibung || '');
        }
        fs.mkdirSync(path.dirname(ziel), { recursive: true });
        fs.writeFileSync(`${ziel}.tmp`, inhalt);
        fs.renameSync(`${ziel}.tmp`, ziel);
        stand[e.rel] = e.stempel;
      } catch (err) {
        log(`Ablage: ${e.rel} konnte nicht erstellt werden: ${err.message}`);
      }
    }
    // gelöschte oder umbenannte Dateien entfernen
    const aufraeumen = (dir) => {
      if (!fs.existsSync(dir)) return;
      for (const x of fs.readdirSync(dir, { withFileTypes: true })) {
        const voll = path.join(dir, x.name);
        const rel = path.relative(ablage, voll);
        if (x.isDirectory()) {
          aufraeumen(voll);
          if (!fs.readdirSync(voll).length) fs.rmdirSync(voll);
        } else if (voll !== standDatei && !soll.has(rel)) {
          fs.unlinkSync(voll);
          delete stand[rel];
        }
      }
    };
    aufraeumen(ablage);
    for (const rel of Object.keys(stand)) if (!soll.has(rel)) delete stand[rel];
    fs.mkdirSync(ablage, { recursive: true });
    fs.writeFileSync(standDatei, JSON.stringify(stand));
  }

  async function schreibe(name, inhalt) {
    const ziel = path.join(ordner, name);
    fs.writeFileSync(`${ziel}.tmp`, inhalt);
    fs.renameSync(`${ziel}.tmp`, ziel);
  }

  async function aktualisiereJetzt({ erzwingen = false } = {}) {
    try {
      const d = chefDaten();
      const liste = dateiListe();
      const stand = JSON.stringify([
        d.dokumente.map((x) => [x.id, x.geaendert, x.status]),
        d.buchungen.map((x) => [x.id, x.geaendert]),
        [d.aufgaben, d.auftraege, d.termine, d.mitarbeiter, d.kunden].map((l) => l.map((x) => [x.id, x.geaendert])),
        liste.map((f) => [f.id, f.beschreibung]),
        JSON.stringify(d.settings || {}).length
      ]);
      if (!erzwingen && stand === letzterStand && fs.existsSync(path.join(ordner, DATEI_WORD))) return false;
      const p = plan(d, liste);
      await schreibeAblage(p);
      fs.mkdirSync(ordner, { recursive: true });
      await schreibe(DATEI_EXCEL, await excel(d, { belege: p.belege }));
      await schreibe(DATEI_WORD, await word(d, new Date(), { belege: p.belege }));
      letzterStand = stand;
      return true;
    } catch (e) {
      log(`Berichte konnten nicht erstellt werden: ${e.message}`);
      return false;
    }
  }

  // nie zwei Läufe gleichzeitig: ein weiterer Aufruf wartet und läuft danach mit dem neuesten Stand
  async function aktualisiere(optionen) {
    while (laeuft) await laeuft.catch(() => {});
    laeuft = aktualisiereJetzt(optionen);
    try {
      return await laeuft;
    } finally {
      laeuft = null;
    }
  }

  return {
    ordner,
    ablage,
    aktualisiere,
    excel: () => excel(chefDaten(), { belege: plan().belege }),
    word: () => word(chefDaten(), new Date(), { belege: plan().belege }),
    starte: () => (aktualisiere(), setInterval(aktualisiere, 10 * 60 * 1000).unref())
  };
}
