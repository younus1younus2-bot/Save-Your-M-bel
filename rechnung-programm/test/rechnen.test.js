import { test } from 'node:test';
import assert from 'node:assert/strict';
import { berechne, datumLang, gross, parseZahl, platzhalter, plusTage } from '../src/shared/rechnen.js';
import { renderDokument } from '../src/shared/vorlagen.js';
import DEFAULTS from '../src/shared/defaults.js';

const pos = (menge, preis, ustSatz = 19) => ({ beschreibung: 'x', menge, preis, ustSatz });

test('Kleinunternehmer: Summe ohne Umsatzsteuer', () => {
  const c = berechne({ steuerModus: 'klein', positionen: [pos(1, 40), pos(1, 500), pos(1, 200), pos(1, 200), pos(1, 40)] });
  assert.equal(c.brutto, 980);
  assert.equal(c.ust, 0);
  assert.equal(c.steuern.length, 0);
});

test('Rechnen in Cent: keine Rundungsfehler bei Kommazahlen', () => {
  const c = berechne({ steuerModus: 'klein', positionen: [pos(1, 0.1), pos(1, 0.2), pos(3, 0.1)] });
  assert.equal(c.brutto, 0.6);
  assert.equal(c.cent.brutto, 60);
});

test('Menge mit Komma und Preis als Text', () => {
  const c = berechne({ steuerModus: 'klein', positionen: [{ menge: '2,5', preis: '35,10' }] });
  assert.equal(c.brutto, 87.75);
});

test('Regelbesteuerung mit 19 % und 7 %', () => {
  const c = berechne({ steuerModus: 'regel', positionen: [pos(1, 400, 19), pos(20, 2.5, 7)] });
  assert.equal(c.netto, 450);
  assert.deepEqual(
    c.steuern.map((s) => [s.satz, s.betrag]),
    [
      [19, 76],
      [7, 3.5]
    ]
  );
  assert.equal(c.brutto, 529.5);
});

test('Rabatt wird anteilig auf die Steuersätze verteilt, Summen stimmen exakt', () => {
  const c = berechne({ steuerModus: 'regel', rabattProzent: 5, positionen: [pos(1, 100, 19), pos(1, 33.33, 7)] });
  const basis = c.steuern.reduce((a, s) => a + Math.round(s.basis * 100), 0);
  assert.equal(basis, c.cent.netto);
  assert.equal(c.cent.brutto, c.cent.netto + c.cent.ust);
});

test('Anzahlung und Restbetrag', () => {
  const c = berechne({ steuerModus: 'klein', anzahlungProzent: 30, positionen: [pos(1, 1000)] });
  assert.equal(c.anzahlung, 300);
  assert.equal(c.rest, 700);
});

test('Storno: negative Mengen ergeben negativen Betrag', () => {
  const c = berechne({ steuerModus: 'klein', positionen: [pos(-1, 500)] });
  assert.equal(c.brutto, -500);
});

test('parseZahl versteht deutsche Schreibweise', () => {
  assert.equal(parseZahl('1.234,50'), 1234.5);
  assert.equal(parseZahl('12 €'), 12);
  assert.equal(parseZahl(''), 0);
  assert.equal(parseZahl('abc'), 0);
});

test('Platzhalter werden ersetzt', () => {
  const doc = { nummer: 'HA04', datum: '2026-09-01', faelligAm: '2026-09-15', kunde: { name: 'Anna' }, positionen: [pos(1, 100)], steuerModus: 'klein' };
  assert.equal(platzhalter('Hallo {KUNDE}, {NUMMER} über {BETRAG}, Ziel {ZIEL} Tage, {UNBEKANNT}', doc, DEFAULTS).replace(/\u00a0/g, ' '), 'Hallo Anna, HA04 über 100,00 €, Ziel 14 Tage, {UNBEKANNT}');
});

test('Großbuchstaben mit ẞ statt SS (gleiche Länge)', () => {
  assert.equal(gross('Gemäß'), 'GEMÄẞ');
  assert.equal(gross('Gemäß').length, 'Gemäß'.length);
});

test('Datum: deutsch und englisch, Tage addieren über Monatsgrenze', () => {
  assert.equal(datumLang('2026-09-24'), '24. September 2026');
  assert.equal(datumLang('2026-09-24', 'en'), '24 September 2026');
  assert.equal(plusTage('2026-01-30', 3), '2026-02-02');
});

test('Vorlage: Entwurf zeigt Wasserzeichen, englische Rechnung englische Texte, HTML wird maskiert', () => {
  const doc = { typ: 'rechnung', status: 'entwurf', steuerModus: 'klein', kunde: { name: '<script>x</script>' }, positionen: [pos(1, 10)], datum: '2026-09-24' };
  const html = renderDokument(doc, DEFAULTS);
  assert.match(html, /ist-entwurf/);
  assert.doesNotMatch(html, /<script>x/);
  const en = renderDokument({ ...doc, sprache: 'en', gesperrt: true, status: 'offen', nummer: 'HA09' }, DEFAULTS);
  assert.match(en, /Invoice/);
  assert.match(en, /German small business regulation/i);
  assert.doesNotMatch(en, /ist-entwurf/);
});
