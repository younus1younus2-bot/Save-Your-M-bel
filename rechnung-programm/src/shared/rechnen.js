// Gemeinsame Rechen- und Formatierfunktionen (Browser und Server).
// Geldbeträge werden intern in ganzen Cent gerechnet, damit keine Rundungsfehler entstehen.

export const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const MONATE_KURZ = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
export const MONATE_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
export const nl2br = (v) => esc(v).replace(/\n/g, '<br>');

// Großbuchstaben ohne CSS: aus „ß“ wird „ẞ“ (gleiche Länge, sonst bricht die PDF-Erzeugung im Browser)
export const gross = (t) => String(t ?? '').replace(/ß/g, 'ẞ').toUpperCase();

// Eingaben mit Komma erlauben: "1.234,50" -> 1234.5
export function parseZahl(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  let s = String(v ?? '').trim().replace(/\s|€|%/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export const zuCent = (euro) => Math.round(parseZahl(euro) * 100);
export const zuEuro = (cent) => cent / 100;
export const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const euroFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
export const euro = (n) => euroFmt.format(Number(n) || 0);
export const betrag = (n) => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const zahl = (n, d = 2) => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: d });
export const prozent = (n) => `${(Number(n) || 0).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;

// ---------- Datum ----------
export function isoDatum(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
export const heute = () => isoDatum(new Date());
export function plusTage(iso, tage) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + Number(tage || 0));
  return isoDatum(d);
}
export function datum(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}
export function datumLang(iso, sprache = 'de') {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return sprache === 'en' ? `${d} ${MONATE_EN[m - 1]} ${y}` : `${d}. ${MONATE[m - 1]} ${y}`;
}
export const tageZwischen = (von, bis) => Math.round((new Date(`${bis}T12:00:00`) - new Date(`${von}T12:00:00`)) / 864e5);

// ---------- Berechnung eines Dokuments ----------
// Kleinunternehmer: Preise sind Endpreise, keine USt.
// Regelbesteuerung: Preise sind netto, USt. je Position.
export function berechne(doc) {
  const klein = doc.steuerModus !== 'regel';
  const rabatt = Math.min(100, Math.max(0, parseZahl(doc.rabattProzent)));
  const proSatz = new Map();
  let summePosC = 0;

  const positionen = (doc.positionen || []).map((p) => {
    const betragC = Math.round(parseZahl(p.menge) * zuCent(p.preis));
    summePosC += betragC;
    const satz = klein ? 0 : parseZahl(p.ustSatz ?? 19);
    proSatz.set(satz, (proSatz.get(satz) || 0) + betragC);
    return { ...p, betrag: zuEuro(betragC), betragC };
  });
  positionen.forEach((p) => {
    p.anteil = summePosC ? (p.betragC / summePosC) * 100 : 0;
  });

  const rabattC = Math.round((summePosC * rabatt) / 100);
  const nettoC = summePosC - rabattC;

  // Rabatt anteilig auf die Steuersätze verteilen, Rest auf den letzten Satz, damit die Summe exakt stimmt
  const saetze = [...proSatz.keys()].sort((a, b) => b - a);
  let verteilt = 0;
  const basen = saetze.map((satz, i) => {
    const basis = i === saetze.length - 1 ? nettoC - verteilt : Math.round((proSatz.get(satz) * (100 - rabatt)) / 100);
    verteilt += basis;
    return { satz, basisC: basis };
  });
  const steuern = klein
    ? []
    : basen.filter((b) => b.satz > 0).map((b) => {
        const betragC = Math.round((b.basisC * b.satz) / 100);
        return { satz: b.satz, basis: zuEuro(b.basisC), betrag: zuEuro(betragC), betragC };
      });
  const ustC = steuern.reduce((a, s) => a + s.betragC, 0);
  const bruttoC = nettoC + ustC;
  const anzahlungProzent = Math.min(100, Math.max(0, parseZahl(doc.anzahlungProzent)));
  const anzahlungC = Math.round((bruttoC * anzahlungProzent) / 100);

  return {
    positionen,
    summePos: zuEuro(summePosC),
    rabatt,
    rabattBetrag: zuEuro(rabattC),
    netto: zuEuro(nettoC),
    steuern,
    ust: zuEuro(ustC),
    brutto: zuEuro(bruttoC),
    anzahlungProzent,
    anzahlung: zuEuro(anzahlungC),
    rest: zuEuro(bruttoC - anzahlungC),
    klein,
    cent: { summePos: summePosC, rabatt: rabattC, netto: nettoC, ust: ustC, brutto: bruttoC }
  };
}

// Platzhalter in Texten ersetzen: {KUNDE} {NUMMER} {BETRAG} …
export function platzhalter(text, doc, settings) {
  const c = doc ? berechne(doc) : null;
  const map = {
    FIRMA: settings?.firma?.name || '',
    KUNDE: doc ? doc.kunde?.name || '' : '',
    NUMMER: doc ? doc.nummer || '' : '',
    BETRAG: c ? euro(c.brutto) : '',
    DATUM: doc ? datum(doc.datum) : '',
    FAELLIG: doc ? datum(doc.faelligAm) : '',
    GUELTIG: doc ? datum(doc.gueltigBis) : '',
    ZIEL: doc && doc.datum && doc.faelligAm ? tageZwischen(doc.datum, doc.faelligAm) : settings?.zahlungszielTage ?? '',
    JAHR: new Date().getFullYear()
  };
  return String(text || '').replace(/\{([A-Z]+)\}/g, (m, k) => (k in map ? map[k] : m));
}

// Tiefes Zusammenführen (Standardwerte + gespeicherte Werte); Arrays werden ersetzt
export function deepMerge(base, extra) {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return extra === undefined ? base : extra;
  const out = { ...base };
  for (const k of Object.keys(extra || {})) out[k] = k in base ? deepMerge(base[k], extra[k]) : extra[k];
  return out;
}

export function neueId() {
  const b = new Uint8Array(10);
  globalThis.crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// Einfache Ähnlichkeitsprüfung für Kunden (Dubletten-Warnung)
export const normName = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
export const normTel = (s) => String(s || '').replace(/\D/g, '').replace(/^0049|^49/, '0');
