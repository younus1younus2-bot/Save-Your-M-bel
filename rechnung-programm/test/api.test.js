import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { starteServer } from '../server/index.js';

// kleiner HTTP-Client mit Cookie
function client(basis) {
  let cookie = '';
  return async (methode, url, body, { kopf = { 'X-Portal': '1' } } = {}) => {
    const r = await fetch(basis + url, {
      method: methode,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...kopf, cookie },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    const typ = r.headers.get('content-type') || '';
    return { status: r.status, kopf: r.headers, daten: typ.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
  };
}

describe('Server', () => {
  let server;
  let smtp;
  let smtpPort;
  let chef;
  const mails = [];
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-test-'));

  before(async () => {
    smtp = new SMTPServer({
      authOptional: true,
      disabledCommands: ['STARTTLS'],
      onAuth: (auth, session, cb) => cb(null, { user: auth.username }),
      onData: (stream, session, cb) => simpleParser(stream).then((m) => (mails.push(m), cb()), cb)
    });
    await new Promise((r) => smtp.listen(0, '127.0.0.1', r));
    smtpPort = smtp.server.address().port;
    server = await starteServer({ port: 0, datenOrdner: ordner, leise: true });
    chef = client(`http://localhost:${server.port}`);
  });
  after(async () => {
    await server.stop();
    await new Promise((r) => smtp.close(r));
    fs.rmSync(ordner, { recursive: true, force: true });
  });

  test('Ohne Anmeldung kein Zugriff, Status zeigt „nicht eingerichtet“', async () => {
    assert.equal((await chef('GET', '/api/daten')).status, 401);
    assert.equal((await chef('GET', '/api/status')).daten.eingerichtet, false);
  });

  test('Einrichtung legt Chef-Zugang an, danach keine zweite Einrichtung', async () => {
    assert.equal((await chef('POST', '/api/einrichtung', { name: 'Hamam', email: 'chef@test.de', passwort: 'kurz' })).status, 400);
    const r = await chef('POST', '/api/einrichtung', { name: 'Hamam', email: 'chef@test.de', passwort: 'sehrgeheim123' });
    assert.equal(r.status, 200);
    assert.equal(r.daten.benutzer.rolle, 'chef');
    assert.equal((await chef('POST', '/api/einrichtung', { name: 'X', email: 'x@test.de', passwort: 'sehrgeheim123' })).status, 409);
  });

  test('Sicherheits-Header und Schutz gegen fremde Seiten (CSRF)', async () => {
    const r = await chef('GET', '/health');
    assert.equal(r.status, 200);
    assert.match(r.kopf.get('content-security-policy'), /script-src 'self'/);
    assert.equal(r.kopf.get('x-frame-options'), 'DENY');
    assert.equal((await chef('POST', '/api/kunden', { name: 'X' }, { kopf: {} })).status, 403);
  });

  test('Sperre nach 5 Fehlversuchen', async () => {
    const fremd = client(`http://localhost:${server.port}`);
    for (let i = 0; i < 5; i++) assert.equal((await fremd('POST', '/api/anmelden', { email: 'chef@test.de', passwort: 'falsch' })).status, 401);
    const r = await fremd('POST', '/api/anmelden', { email: 'chef@test.de', passwort: 'sehrgeheim123' });
    assert.equal(r.status, 429);
  });

  test('Rechnung: anlegen, abschließen, PDF vom Server', async (t) => {
    const k = (await chef('POST', '/api/kunden', { name: 'Anna Schmidt', email: 'anna@test.de' })).daten;
    const r = (await chef('POST', '/api/dokumente', { typ: 'rechnung', kundeId: k.id, kunde: k, positionen: [{ beschreibung: 'Anfahrt', menge: 1, preis: 40 }] })).daten;
    const f = (await chef('POST', `/api/dokumente/${r.id}/abschliessen`)).daten;
    assert.equal(f.nummer, 'HA04');
    assert.equal((await chef('PUT', `/api/dokumente/${r.id}`, { positionen: [] })).daten.positionen.length, 1);
    const pdf = await chef('GET', `/api/pdf/dokument/${r.id}`);
    if (pdf.status === 501) return t.skip('Playwright/Chromium nicht installiert');
    assert.equal(pdf.status, 200);
    assert.equal(pdf.daten.subarray(0, 5).toString(), '%PDF-');
  });

  test('E-Mail mit PDF-Anhang wird wirklich versendet (Test-Mailserver)', async () => {
    const e = await chef('PUT', '/api/einstellungen', { email: { smtp: { host: '127.0.0.1', port: smtpPort, user: 'test', pass: 'geheimes-passwort', from: 'info@test.de' } } });
    assert.equal(e.daten.email.smtp.pass, '********');
    assert.ok(!fs.readFileSync(path.join(ordner, 'portal.sqlite')).includes('geheimes-passwort'), 'Passwort darf nicht im Klartext gespeichert sein');
    const d = (await chef('GET', '/api/daten')).daten;
    const r = d.dokumente[0];
    const status = (await chef('GET', '/api/status')).daten;
    const body = { an: 'anna@test.de', betreff: 'Ihre Rechnung {NUMMER}', text: 'Guten Tag {KUNDE}', mitPdf: true };
    if (!status.pdfAufServer) body.pdfBase64 = Buffer.from('%PDF-1.4 test').toString('base64');
    const s = await chef('POST', `/api/dokumente/${r.id}/mail`, body);
    assert.equal(s.status, 200, JSON.stringify(s.daten));
    assert.equal(mails.length, 1);
    assert.equal(mails[0].subject, 'Ihre Rechnung HA04');
    assert.equal(mails[0].text.trim(), 'Guten Tag Anna Schmidt');
    assert.equal(mails[0].attachments.length, 1);
    assert.match(mails[0].attachments[0].filename, /^Rechnung_HA04_Anna_Schmidt\.pdf$/);
    assert.equal(mails[0].attachments[0].content.subarray(0, 5).toString(), '%PDF-');
    assert.match(s.daten.verlauf.at(-1).text, /anna@test\.de/);
  });

  test('Mitarbeiter-Zugang sieht nur eigene Einsätze', async () => {
    const m = (await chef('POST', '/api/mitarbeiter', { name: 'Ali' })).daten;
    await chef('POST', '/api/termine', { datum: '2026-10-01', titel: 'Seiner', mitarbeiterIds: [m.id] });
    await chef('POST', '/api/termine', { datum: '2026-10-01', titel: 'Fremd' });
    assert.equal((await chef('POST', '/api/benutzer', { name: 'Ali', email: 'ali@test.de', passwort: 'aliali12345', rolle: 'mitarbeiter', mitarbeiterId: m.id })).status, 200);
    const ali = client(`http://localhost:${server.port}`);
    assert.equal((await ali('POST', '/api/anmelden', { email: 'ali@test.de', passwort: 'aliali12345' })).status, 200);
    const d = (await ali('GET', '/api/daten')).daten;
    assert.deepEqual(
      d.termine.map((t) => t.titel),
      ['Seiner']
    );
    assert.equal(d.dokumente.length, 0);
    assert.equal((await ali('GET', '/api/benutzer')).status, 403);
    assert.equal((await ali('POST', '/api/kunden', { name: 'x' })).status, 403);
    assert.equal((await ali('GET', '/api/sicherung')).status, 403);
  });

  test('Fotos über HTTP: Chef lädt hoch, Mitarbeiter sieht sie beim eigenen Einsatz', async () => {
    const bild = `data:image/jpeg;base64,${Buffer.from('bild').toString('base64')}`;
    const a = (await chef('POST', '/api/auftraege', { titel: 'Umzug mit Fotos' })).daten;
    const m = (await chef('GET', '/api/daten')).daten.mitarbeiter.find((x) => x.name === 'Ali');
    const t = (await chef('POST', '/api/termine', { datum: '2026-10-05', auftragId: a.id, mitarbeiterIds: [m.id] })).daten;
    const f = await chef('POST', '/api/dateien', { auftragId: a.id, typ: 'image/jpeg', daten: bild, vorschau: bild });
    assert.equal(f.status, 200);
    const ali = client(`http://localhost:${server.port}`);
    await ali('POST', '/api/anmelden', { email: 'ali@test.de', passwort: 'aliali12345' });
    const liste = await ali('GET', `/api/dateien?terminId=${t.id}`);
    assert.equal(liste.status, 200);
    assert.equal(liste.daten.length, 1);
    assert.equal((await ali('GET', `/api/dateien/${f.daten.id}`)).daten.daten, bild);
    assert.equal((await ali('DELETE', `/api/dateien/${f.daten.id}`)).status, 403);
    assert.equal((await ali('GET', '/api/daten')).daten.fotoAnzahl.termin[t.id], 1);
  });

  test('Excel und Word: alle Rechnungen, KVs, Einnahmen und Ausgaben', async () => {
    await chef('POST', '/api/dokumente', { typ: 'angebot', kunde: { name: 'KV Kundin' }, positionen: [{ beschreibung: 'Umzug', menge: 1, preis: 800 }] });
    const aus = (await chef('POST', '/api/buchungen', { datum: '2026-09-10', typ: 'ausgabe', betrag: 120, kategorie: 'Tanken', beschreibung: 'Diesel', notiz: 'Shell Köln' })).daten;
    const pdf = `data:application/pdf;base64,${Buffer.from('%PDF-1.4 Beleg').toString('base64')}`;
    assert.equal((await chef('POST', '/api/dateien', { buchungId: aus.id, typ: 'application/pdf', name: 'Kassenbon.pdf', daten: pdf })).status, 200);
    const r = (await chef('GET', '/api/daten')).daten.dokumente.find((d) => d.nummer === 'HA04');
    await chef('POST', `/api/dokumente/${r.id}/bezahlt`, { datum: '2026-09-12' });

    const x = await chef('GET', '/api/berichte/excel');
    assert.equal(x.status, 200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(x.daten);
    assert.deepEqual(
      wb.worksheets.map((w) => w.name),
      ['Umsatz je Monat', 'Rechnungen', 'Kostenvoranschläge', 'Einnahmen & Ausgaben']
    );
    const monat = wb.getWorksheet('Umsatz je Monat').getRow(2).values;
    assert.equal(monat[2], 'September');
    assert.equal(monat[3], 40);
    assert.equal(monat[4], 120);
    assert.equal(monat[5], -80);
    assert.equal(wb.getWorksheet('Rechnungen').getRow(2).getCell(1).value, 'HA04');
    assert.equal(wb.getWorksheet('Kostenvoranschläge').getRow(2).getCell(3).value, 'KV Kundin');
    const ea = wb.getWorksheet('Einnahmen & Ausgaben');
    const zeile = [...Array(ea.rowCount).keys()].map((i) => ea.getRow(i + 1)).find((r) => r.getCell(4).value === 'Diesel');
    assert.equal(zeile.getCell(9).value, 'Shell Köln');
    const link = zeile.getCell(10).value;
    assert.match(link.hyperlink, /^\.\.\/Ablage\/Belege\/2026\/2026-09\/2026-09-10 Ausgabe Diesel 120,00 EUR \(\w+\)\.pdf$/);
    // Beleg liegt als echte Datei in der Ablage, sortiert nach Datum
    await server.berichte.aktualisiere({ erzwingen: true });
    const datei = path.join(ordner, 'ablage', decodeURI(link.hyperlink.replace('../Ablage/', '')));
    assert.equal(fs.readFileSync(datei, 'utf8'), '%PDF-1.4 Beleg');
  });

  test('Ablage: Rechnungen, KVs und Fotos als PDF-Dateien', async (t) => {
    const aus = (await chef('GET', '/api/daten')).daten.buchungen.find((b) => b.beschreibung === 'Diesel');
    const jpg = `data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAIAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAT/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABAb/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCUABUP/9k=`;
    assert.equal((await chef('POST', '/api/dateien', { buchungId: aus.id, typ: 'image/jpeg', beschreibung: 'Kassenbon', daten: jpg, vorschau: jpg })).status, 200);
    await chef('GET', '/api/berichte/excel');
    await server.berichte.aktualisiere({ erzwingen: true });
    const alle = [];
    const lies = (dir) =>
      fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? lies(path.join(dir, e.name)) : alle.push(path.relative(path.join(ordner, 'ablage'), path.join(dir, e.name)))));
    lies(path.join(ordner, 'ablage'));
    const foto = alle.find((f) => f.includes('Kassenbon'));
    assert.match(foto, /^Belege\/2026\/2026-09\/2026-09-10 Ausgabe Diesel 120,00 EUR - Kassenbon \(\w+\)\.pdf$/);
    assert.equal(
      fs
        .readFileSync(path.join(ordner, 'ablage', foto))
        .subarray(0, 5)
        .toString(),
      '%PDF-'
    );
    if (!(await chef('GET', '/api/status')).daten.pdfAufServer) return t.skip('Chromium nicht installiert – Rechnungs-PDFs nicht geprüft');
    const rechnung = alle.find((f) => /^Rechnungen\/.*Rechnung HA04 Anna Schmidt/.test(f));
    assert.ok(rechnung, alle.join('\n'));
    assert.equal(
      fs
        .readFileSync(path.join(ordner, 'ablage', rechnung))
        .subarray(0, 5)
        .toString(),
      '%PDF-'
    );
    assert.ok(
      alle.some((f) => /^Kostenvoranschläge\/.*KV Kundin/.test(f)),
      'KV fehlt'
    );

    const w = await chef('GET', '/api/berichte/word');
    assert.equal(w.status, 200);
    const xml = await (await JSZip.loadAsync(w.daten)).file('word/document.xml').async('string');
    for (const text of ['HA04', 'Anna Schmidt', 'KV Kundin', 'Diesel', 'Umsatz je Monat']) assert.ok(xml.includes(text), text);

    const ali = client(`http://localhost:${server.port}`);
    await ali('POST', '/api/anmelden', { email: 'ali@test.de', passwort: 'aliali12345' });
    assert.equal((await ali('GET', '/api/berichte/excel')).status, 403);
    for (const f of ['Save-Your-Moebel-Umsaetze.xlsx', 'Save-Your-Moebel-Uebersicht.docx']) assert.ok(fs.existsSync(path.join(ordner, 'berichte', f)), f);
  });

  test('Letzter Chef kann nicht herabgestuft werden', async () => {
    const liste = (await chef('GET', '/api/benutzer')).daten;
    const c = liste.find((b) => b.rolle === 'chef');
    assert.equal((await chef('PUT', `/api/benutzer/${c.id}`, { rolle: 'mitarbeiter' })).status, 409);
  });

  test('Sicherung herunterladen und wiederherstellen', async () => {
    const s = await chef('GET', '/api/sicherung');
    assert.equal(s.status, 200);
    assert.equal(s.daten.einstellungen.email.smtp.pass, '');
    const anzahl = Object.keys(s.daten.sammlungen.kunden).length;
    await chef('POST', '/api/kunden', { name: 'Wird verworfen' });
    assert.equal((await chef('POST', '/api/sicherung/wiederherstellen', s.daten)).status, 200);
    assert.equal((await chef('GET', '/api/daten')).daten.kunden.length, anzahl);
    assert.equal((await chef('POST', '/api/sicherung/wiederherstellen', { unsinn: true })).status, 400);
    assert.ok(fs.readdirSync(path.join(ordner, 'backups')).length >= 1);
  });

  test('Unbekannte Route und Fehlerformat', async () => {
    const r = await chef('GET', '/api/gibt-es-nicht/1/2/3');
    assert.equal(r.status, 404);
    assert.ok(r.daten.error);
  });
});

test('Alte Daten aus db.json werden beim ersten Start übernommen', async () => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-alt-'));
  fs.writeFileSync(
    path.join(ordner, 'db.json'),
    JSON.stringify({
      settings: { firma: { name: 'Alt GmbH' } },
      kunden: [{ id: 'k1', name: 'Altkunde' }],
      dokumente: [{ id: 'd1', typ: 'rechnung', nummer: 'RE-1', status: 'bezahlt', kunde: { name: 'Altkunde' }, positionen: [] }]
    })
  );
  const s = await starteServer({ port: 0, datenOrdner: ordner, leise: true });
  try {
    const api = client(`http://localhost:${s.port}`);
    await api('POST', '/api/einrichtung', { name: 'C', email: 'c@test.de', passwort: 'sehrgeheim123' });
    const d = (await api('GET', '/api/daten')).daten;
    assert.equal(d.settings.firma.name, 'Alt GmbH');
    assert.equal(d.kunden[0].name, 'Altkunde');
    assert.equal(d.dokumente[0].gesperrt, true);
    assert.ok(fs.existsSync(path.join(ordner, 'db.json.uebernommen')));
  } finally {
    await s.stop();
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});

test('Nach einer Änderung wird sofort gesichert (aktuell.sqlite, Berichte, Merker für OneDrive)', async () => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-sofort-'));
  const s = await starteServer({ port: 0, datenOrdner: ordner, leise: true, sofortNach: 50 });
  try {
    const api = client(`http://localhost:${s.port}`);
    await api('POST', '/api/einrichtung', { name: 'C', email: 'c@test.de', passwort: 'sehrgeheim123' });
    const merker = path.join(ordner, '.geaendert');
    await new Promise((r) => setTimeout(r, 400));
    const vorher = fs.existsSync(merker) ? fs.statSync(merker).mtimeMs : 0;
    await api('POST', '/api/kunden', { name: 'Sofort Gesichert' });
    for (let i = 0; i < 40 && !(fs.existsSync(merker) && fs.statSync(merker).mtimeMs > vorher); i++) await new Promise((r) => setTimeout(r, 100));
    assert.ok(fs.existsSync(merker), 'Merker .geaendert fehlt');
    assert.ok(fs.readFileSync(path.join(ordner, 'backups', 'aktuell.sqlite')).includes('Sofort Gesichert'));
    assert.ok(fs.existsSync(path.join(ordner, 'berichte', 'Save-Your-Moebel-Umsaetze.xlsx')));
  } finally {
    await s.stop();
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});

test('Website: Anfrage mit Schlüssel wird Auftrag, Besuche werden ohne Cookies gezählt', async () => {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-web-'));
  const s = await starteServer({ port: 0, datenOrdner: ordner, leise: true });
  const basis = `http://localhost:${s.port}`;
  try {
    const api = client(basis);
    await api('POST', '/api/einrichtung', { name: 'C', email: 'c@test.de', passwort: 'sehrgeheim123' });
    await api('PUT', '/api/einstellungen', { website: { url: 'https://www.saveyourmobel.de' } });
    const { schluessel } = (await api('GET', '/api/website/schluessel')).daten;
    assert.ok(schluessel.length > 20);

    const anfrage = {
      anfrage_nr: 'SYM-2026-0007',
      service_type: 'privatumzug',
      kunde_name: 'Familie Yilmaz',
      kunde_telefon: '0171 1234567',
      kunde_email: 'yilmaz@test.de',
      wunschtermin: '2026-11-14',
      von_strasse: 'Hauptstr. 1',
      von_plz: '50667',
      von_stadt: 'Köln',
      von_etage: '3',
      von_aufzug: '0',
      nach_stadt: 'Bonn',
      inventar: [{ name: 'Doppelbett', qty: 1, volume: 2.5 }],
      extras: ['abbau', 'halteverbot'],
      quelle: 'google-maps'
    };
    const senden = (body, schl) =>
      fetch(`${basis}/api/oeffentlich/anfrage`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Website-Schluessel': schl }, body: JSON.stringify(body) });
    assert.equal((await senden(anfrage, 'falsch')).status, 401);
    const r = await senden(anfrage, schluessel);
    assert.equal(r.status, 200, await r.clone().text());
    const d = (await api('GET', '/api/daten')).daten;
    const auftrag = d.auftraege.find((a) => a.anfrageNr === 'SYM-2026-0007');
    assert.equal(auftrag.titel, 'Familie Yilmaz – Privatumzug');
    assert.equal(auftrag.status, 'anfrage');
    assert.equal(auftrag.datum, '2026-11-14');
    assert.match(auftrag.notiz, /Von: Hauptstr\. 1, 50667 Köln \(3\. OG, ohne Aufzug\)/);
    assert.match(auftrag.notiz, /1× Doppelbett/);
    assert.match(auftrag.notiz, /Möbel-Abbau, Halteverbotszone/);
    assert.match(auftrag.notiz, /Gefunden über: Google Maps/);
    assert.equal(d.kunden.find((k) => k.id === auftrag.kundeId).ort, 'Köln');
    // gleicher Kunde wird wiedererkannt
    await senden({ ...anfrage, anfrage_nr: 'SYM-2026-0008', kunde_telefon: '+49 171 1234567' }, schluessel);
    assert.equal((await api('GET', '/api/daten')).daten.kunden.filter((k) => k.name === 'Familie Yilmaz').length, 1);

    // Besuche: als text/plain wie navigator.sendBeacon, ohne Cookie
    const besuch = (body, ua = 'Mozilla/5.0 (iPhone; Mobile)') =>
      fetch(`${basis}/api/oeffentlich/besuch`, { method: 'POST', headers: { 'Content-Type': 'text/plain', 'User-Agent': ua }, body: JSON.stringify(body) });
    const b1 = await besuch({ seite: '/index.php', referrer: 'https://www.google.com/maps/place/xyz' });
    assert.equal(b1.status, 204);
    assert.equal(b1.headers.get('access-control-allow-origin'), '*');
    assert.equal(b1.headers.get('set-cookie'), null);
    await besuch({ seite: '/privatumzug.php', referrer: 'https://www.saveyourmobel.de/' });
    await besuch({ seite: '/', referrer: 'https://www.google.de/' }, 'Mozilla/5.0 (Windows NT 10.0)');
    await besuch({ seite: '/', quelle: 'flyer' }, 'Mozilla/5.0 (Macintosh)');
    await besuch({ seite: '/' }, 'Googlebot/2.1');
    const st = (await api('GET', '/api/website/statistik?tage=7')).daten;
    assert.equal(st.summen.besucher, 3);
    assert.equal(st.summen.aufrufe, 4);
    assert.equal(st.summen.anfragen, 2);
    const q = Object.fromEntries(st.quellen.map((x) => [x.quelle, x]));
    assert.equal(q['Google Maps'].besucher, 1);
    assert.equal(q['Google Maps'].aufrufe, 2, 'zweite Seite desselben Besuchers erbt die Quelle');
    assert.equal(q['Google Maps'].anfragen, 2);
    assert.equal(q['Google Suche'].besucher, 1);
    assert.equal(q['Link: flyer'].besucher, 1);
    assert.deepEqual(st.seiten.map((x) => x.seite).sort(), ['/', '/privatumzug']);
    assert.equal(st.tage.length, 7);
    assert.ok(!fs.readFileSync(path.join(ordner, 'portal.sqlite')).includes('iPhone'), 'kein Browser-Kennzeichen gespeichert');
  } finally {
    await s.stop();
    fs.rmSync(ordner, { recursive: true, force: true });
  }
});
