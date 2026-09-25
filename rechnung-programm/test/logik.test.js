import { test } from 'node:test';
import assert from 'node:assert/strict';
import { erstelleMemorySpeicher } from '../src/shared/speicher-memory.js';
import { erstelleLogik } from '../src/shared/logik.js';
import { erstelleRouten, fuehreAus } from '../src/shared/routen.js';
import { erinnerungen } from '../src/shared/erinnerungen.js';
import { heute, plusTage } from '../src/shared/rechnen.js';

function umgebung() {
  const store = erstelleMemorySpeicher();
  const L = erstelleLogik(store);
  const R = erstelleRouten(L);
  const chef = { benutzer: { name: 'Chef', rolle: 'chef' } };
  const api = (m, u, b, ctx = chef) => fuehreAus(R, ctx, m, u, b).ergebnis;
  return { store, L, api, chef };
}
const rechnung = (api, extra = {}) => api('POST', '/api/dokumente', { typ: 'rechnung', kunde: { name: 'Anna' }, positionen: [{ beschreibung: 'Umzug', menge: 1, preis: 500 }], ...extra });

test('Rechnungsnummer erst beim Abschließen, gelöschte Entwürfe erzeugen keine Lücke', () => {
  const { api } = umgebung();
  const a = rechnung(api);
  assert.equal(a.nummer, '');
  assert.equal(a.status, 'entwurf');
  const b = rechnung(api);
  api('DELETE', `/api/dokumente/${b.id}`);
  assert.equal(api('POST', `/api/dokumente/${a.id}/abschliessen`).nummer, 'HA04');
  const c = rechnung(api);
  assert.equal(api('POST', `/api/dokumente/${c.id}/abschliessen`).nummer, 'HA05');
});

test('Abgeschlossene Rechnung: keine Änderung, kein Löschen, Notiz erlaubt', () => {
  const { api, store } = umgebung();
  const r = rechnung(api);
  api('POST', `/api/dokumente/${r.id}/abschliessen`);
  api('PUT', `/api/dokumente/${r.id}`, { positionen: [], notiz: 'Kunde ruft zurück' });
  const nachher = store.hole('dokumente', r.id);
  assert.equal(nachher.positionen.length, 1);
  assert.equal(nachher.notiz, 'Kunde ruft zurück');
  assert.throws(() => api('DELETE', `/api/dokumente/${r.id}`), /stornieren/);
});

test('Geschützte Felder lassen sich nicht von außen setzen', () => {
  const { api } = umgebung();
  const r = rechnung(api, { gesperrt: true, status: 'bezahlt', nummer: '', summen: { brutto: 1 } });
  assert.equal(r.gesperrt, undefined);
  assert.equal(r.status, 'entwurf');
  assert.equal(r.summen.brutto, 50000);
});

test('Doppelte Nummer wird abgelehnt', () => {
  const { api } = umgebung();
  const a = rechnung(api, { nummer: 'X1' });
  api('POST', `/api/dokumente/${a.id}/abschliessen`);
  assert.throws(() => rechnung(api, { nummer: 'X1' }), /schon vergeben/);
});

test('Bezahlt: Status und Buchung in einem Schritt, Zurücknehmen entfernt die Buchung', () => {
  const { api, store } = umgebung();
  const r = rechnung(api);
  const b = api('POST', `/api/dokumente/${r.id}/bezahlt`, { datum: '2026-09-20' });
  assert.equal(b.status, 'bezahlt');
  assert.equal(b.gesperrt, true);
  assert.deepEqual(
    store.alle('buchungen').map((x) => [x.betrag, x.datum]),
    [[500, '2026-09-20']]
  );
  api('POST', `/api/dokumente/${r.id}/zahlung-zuruecknehmen`);
  assert.equal(store.alle('buchungen').length, 0);
});

test('Storno einer bezahlten Rechnung: Stornorechnung mit negativem Betrag und Erstattungsbuchung', () => {
  const { api, store } = umgebung();
  const r = rechnung(api);
  api('POST', `/api/dokumente/${r.id}/bezahlt`, {});
  const { original, storno } = api('POST', `/api/dokumente/${r.id}/storno`, { grund: 'Absage' });
  assert.equal(original.status, 'storniert');
  assert.equal(storno.summen.brutto, -50000);
  assert.equal(storno.bezugNummer, original.nummer);
  assert.equal(storno.gesperrt, true);
  assert.deepEqual(
    store
      .alle('buchungen')
      .map((b) => b.betrag)
      .sort(),
    [-500, 500]
  );
  assert.throws(() => api('POST', `/api/dokumente/${r.id}/storno`, {}), /bereits storniert/);
});

test('Transaktion: bei einem Fehler bleibt alles unverändert', () => {
  const { api, store } = umgebung();
  const r = rechnung(api, { kunde: { name: '' } });
  const vorher = JSON.stringify(store.exportiere());
  assert.throws(() => api('POST', `/api/dokumente/${r.id}/bezahlt`, {}), /Kunden/);
  assert.equal(JSON.stringify(store.exportiere()), vorher);
});

test('Eingabeprüfung mit verständlicher Meldung', () => {
  const { api } = umgebung();
  assert.throws(() => api('POST', '/api/kunden', { name: '' }), /Name: Bitte einen Namen eingeben/);
  assert.throws(() => api('POST', '/api/kunden', { name: 'A', email: 'kaputt' }), /E-Mail/);
  assert.throws(() => api('POST', '/api/termine', { titel: 'ohne Datum' }), /Datum/);
  assert.throws(() => api('POST', '/api/unbekannt', {}), /Unbekannter Bereich/);
});

test('Papierkorb: löschen und wiederherstellen', () => {
  const { api, L, chef } = umgebung();
  const k = api('POST', '/api/kunden', { name: 'Test' });
  api('DELETE', `/api/kunden/${k.id}`);
  assert.equal(L.daten(chef).kunden.length, 0);
  assert.equal(L.papierkorb(chef).length, 1);
  api('POST', `/api/kunden/${k.id}/wiederherstellen`);
  assert.equal(L.daten(chef).kunden.length, 1);
});

test('Auftrag wandert automatisch durch die Phasen', () => {
  const { api, store } = umgebung();
  const kv = api('POST', '/api/dokumente', { typ: 'angebot', kunde: { name: 'Anna' }, positionen: [{ beschreibung: 'x', menge: 1, preis: 100 }] });
  const status = () => store.hole('auftraege', kv.auftragId).status;
  assert.equal(status(), 'anfrage');
  api('POST', `/api/dokumente/${kv.id}/versendet`, {});
  assert.equal(status(), 'kv_versendet');
  const r = api('POST', `/api/dokumente/${kv.id}/umwandeln`);
  assert.equal(status(), 'zusage');
  api('POST', '/api/termine', { datum: plusTage(heute(), 3), auftragId: kv.auftragId });
  assert.equal(status(), 'termin');
  api('POST', `/api/dokumente/${r.id}/abschliessen`);
  assert.equal(status(), 'rechnung');
  api('POST', `/api/dokumente/${r.id}/bezahlt`, {});
  assert.equal(status(), 'bezahlt');
});

test('Rollen: Mitarbeiter sieht nur eigene Termine und darf nur den Status ändern', () => {
  const { api, L } = umgebung();
  const m = api('POST', '/api/mitarbeiter', { name: 'Ali' });
  const t1 = api('POST', '/api/termine', { datum: heute(), titel: 'Seiner', mitarbeiterIds: [m.id] });
  api('POST', '/api/termine', { datum: heute(), titel: 'Fremd' });
  const ma = { benutzer: { name: 'Ali', rolle: 'mitarbeiter', mitarbeiterId: m.id } };
  const d = L.daten(ma);
  assert.deepEqual(
    d.termine.map((t) => t.titel),
    ['Seiner']
  );
  assert.equal(d.dokumente.length, 0);
  assert.equal(d.settings.email, undefined);
  const neu = api('PUT', `/api/termine/${t1.id}`, { status: 'erledigt', titel: 'geändert' }, ma);
  assert.equal(neu.status, 'erledigt');
  assert.equal(neu.titel, 'Seiner');
  assert.throws(() => api('POST', '/api/kunden', { name: 'x' }, ma), /Berechtigung/);
  assert.throws(() => api('GET', '/api/protokoll', undefined, ma), /Berechtigung/);
});

test('SMTP-Passwort wird nie nach außen gegeben', () => {
  const { api } = umgebung();
  const s = api('PUT', '/api/einstellungen', { email: { smtp: { host: 'h', user: 'u', pass: 'geheim' } } });
  assert.equal(s.email.smtp.pass, '********');
  const s2 = api('PUT', '/api/einstellungen', { ...s, firma: { ...s.firma, name: 'Neu' } });
  assert.equal(s2.email.smtp.pass, '********');
});

test('Erinnerungen: überfällige Rechnung, KV ohne Antwort, Einsatz ohne Team', () => {
  const { api, L, chef } = umgebung();
  const r = rechnung(api, { datum: plusTage(heute(), -40), faelligAm: plusTage(heute(), -10) });
  api('POST', `/api/dokumente/${r.id}/abschliessen`);
  const kv = api('POST', '/api/dokumente', { typ: 'angebot', kunde: { name: 'B' }, datum: plusTage(heute(), -10), positionen: [] });
  api('POST', `/api/dokumente/${kv.id}/versendet`, {});
  api('POST', '/api/termine', { datum: plusTage(heute(), 2), titel: 'Umzug' });
  const arten = erinnerungen(L.daten(chef), L.einstellungen()).map((e) => e.art);
  assert.ok(arten.includes('ueberfaellig'));
  assert.ok(arten.includes('team'));
  // der KV wurde gerade eben versendet, daher noch kein Nachfassen
  assert.ok(!arten.includes('nachfassen'));
});

test('Fotos: Mitarbeiter sehen nur Fotos ihrer Einsätze, laden nur dort hoch und löschen nur eigene', () => {
  const { api, L, chef } = umgebung();
  const bild = `data:image/jpeg;base64,${'A'.repeat(500)}`;
  const k = api('POST', '/api/kunden', { name: 'Anna' });
  const a = api('POST', '/api/auftraege', { titel: 'Umzug Anna', kundeId: k.id });
  const ali = api('POST', '/api/mitarbeiter', { name: 'Ali' });
  const tom = api('POST', '/api/mitarbeiter', { name: 'Tom' });
  const t = api('POST', '/api/termine', { datum: heute(), auftragId: a.id, mitarbeiterIds: [ali.id] });
  const ctxAli = { benutzer: { id: 'u-ali', name: 'Ali', rolle: 'mitarbeiter', mitarbeiterId: ali.id } };
  const ctxTom = { benutzer: { id: 'u-tom', name: 'Tom', rolle: 'mitarbeiter', mitarbeiterId: tom.id } };

  const f = api('POST', '/api/dateien', { auftragId: a.id, typ: 'image/jpeg', daten: bild, vorschau: bild, beschreibung: 'Klavier' });
  assert.equal(f.daten, undefined, 'Liste/Antwort ohne großes Bild');
  assert.equal(f.kundeId, k.id, 'Kunde wird vom Auftrag übernommen');

  assert.deepEqual(
    api('GET', `/api/dateien?terminId=${t.id}`, undefined, ctxAli).map((x) => x.beschreibung),
    ['Klavier']
  );
  assert.ok(api('GET', `/api/dateien/${f.id}`, undefined, ctxAli).daten.startsWith('data:image/'));
  assert.equal(api('GET', `/api/dateien?terminId=${t.id}`, undefined, ctxTom).length, 0);
  assert.throws(() => api('GET', `/api/dateien/${f.id}`, undefined, ctxTom), /Berechtigung/);
  assert.throws(() => api('POST', '/api/dateien', { terminId: t.id, typ: 'image/jpeg', daten: bild }, ctxTom), /eigenen Einsätzen/);

  const eigenes = api('POST', '/api/dateien', { terminId: t.id, typ: 'image/jpeg', daten: bild }, ctxAli);
  assert.equal(eigenes.auftragId, a.id);
  assert.throws(() => api('DELETE', `/api/dateien/${f.id}`, undefined, ctxAli), /nicht löschen/);
  assert.ok(api('DELETE', `/api/dateien/${eigenes.id}`, undefined, ctxAli).ok);
  api('POST', `/api/dateien/${eigenes.id}/wiederherstellen`, undefined, ctxAli);

  assert.equal(L.daten(chef).fotoAnzahl.auftrag[a.id], 2);
  assert.equal(L.daten(ctxAli).fotoAnzahl.termin[t.id], 2);
  assert.equal(api('GET', `/api/dateien?kundeId=${k.id}`).length, 2);
  assert.throws(() => api('POST', '/api/dateien', { typ: 'image/jpeg', daten: bild }), /Kunden, Auftrag oder Termin/);
  assert.throws(() => api('POST', '/api/dateien', { auftragId: a.id, typ: 'text/html', daten: bild }), /Nur Bilder/);
});
