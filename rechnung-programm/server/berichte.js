// Berichte zum Öffnen ohne Portal: Excel (Umsätze, Rechnungen, KVs, Einnahmen/Ausgaben) und Word (Übersicht).
// Liegen immer aktuell in data/berichte/ und werden von dort z. B. nach OneDrive hochgeladen.
import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { AlignmentType, Document, HeadingLevel, Packer, PageOrientation, Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType } from 'docx';
import { berechne, parseZahl } from '../src/shared/rechnen.js';

export const DATEI_EXCEL = 'Save-Your-Moebel-Umsaetze.xlsx';
export const DATEI_WORD = 'Save-Your-Moebel-Uebersicht.docx';

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
export function aufbereiten(daten) {
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
      return {
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
export async function excel(daten) {
  const a = aufbereiten(daten);
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
    for (const z of zeilen) ws.addRow(Object.fromEntries(spalten.map(([, key, , art]) => [key, art === 'datum' ? alsDatum(z[key]) : z[key]])));
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
      ['Netto', 'netto', 14, 'euro']
    ],
    a.buchungen.map((b) => (b.typ === 'Ausgabe' ? { ...b, brutto: -b.brutto, ust: -b.ust, netto: -b.netto } : b)),
    ['brutto', 'ust', 'netto']
  );
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------- Word ----------
export async function word(daten, stand = new Date()) {
  const a = aufbereiten(daten);
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
            ['Datum', 'Art', 'Beleg', 'Beschreibung', 'Kategorie', 'Brutto', 'USt.'],
            a.buchungen.map((b) => [deDatum(b.datum), b.typ, b.beleg, b.beschreibung, b.kategorie, euro(b.typ === 'Ausgabe' ? -b.brutto : b.brutto), euro(b.typ === 'Ausgabe' ? -b.ust : b.ust)]),
            5
          )
        ]
      }
    ]
  });
  return Packer.toBuffer(doc);
}

// Hält data/berichte/ aktuell: neu erzeugen, sobald sich Rechnungen, KVs oder Buchungen geändert haben
export function erstelleBerichte({ L, datenOrdner, log }) {
  const ordner = path.join(datenOrdner, 'berichte');
  let letzterStand = '';
  const chefDaten = () => L.daten({ benutzer: { rolle: 'chef' } });

  async function schreibe(name, inhalt) {
    const ziel = path.join(ordner, name);
    fs.writeFileSync(`${ziel}.tmp`, inhalt);
    fs.renameSync(`${ziel}.tmp`, ziel);
  }

  async function aktualisiere({ erzwingen = false } = {}) {
    try {
      const d = chefDaten();
      const stand = JSON.stringify([d.dokumente.map((x) => [x.id, x.geaendert, x.status]), d.buchungen.map((x) => [x.id, x.geaendert]), d.settings?.firma?.name]);
      if (!erzwingen && stand === letzterStand && fs.existsSync(path.join(ordner, DATEI_WORD))) return false;
      fs.mkdirSync(ordner, { recursive: true });
      await schreibe(DATEI_EXCEL, await excel(d));
      await schreibe(DATEI_WORD, await word(d));
      letzterStand = stand;
      return true;
    } catch (e) {
      log(`Berichte konnten nicht erstellt werden: ${e.message}`);
      return false;
    }
  }

  return {
    ordner,
    aktualisiere,
    excel: () => excel(chefDaten()),
    word: () => word(chefDaten()),
    starte: () => (aktualisiere(), setInterval(aktualisiere, 10 * 60 * 1000).unref())
  };
}
