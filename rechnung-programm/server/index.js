// Rechnung-Programm – Server
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { erstelleLogik } from '../src/shared/logik.js';
import { erstelleRouten, fuehreAus } from '../src/shared/routen.js';
import { dateiname, einsatzText, renderDokument, renderEinsatzzettel } from '../src/shared/vorlagen.js';
import { erinnerungen } from '../src/shared/erinnerungen.js';
import { datum, heute, platzhalter } from '../src/shared/rechnen.js';
import { erstelleSqliteSpeicher, uebernehmeAlteDaten } from './speicher-sqlite.js';
import { erstelleGeheim } from './geheim.js';
import { erstelleAuth } from './auth.js';
import { erstelleMail } from './mail.js';
import { erstellePdf } from './pdf.js';
import { erstelleSicherung } from './sicherung.js';
import { erstellePush } from './push.js';
import { adressSuche, strecke } from './geo.js';

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (fs.existsSync(path.join(WURZEL, '.env'))) process.loadEnvFile(path.join(WURZEL, '.env'));

const log = (...a) => console.log(new Date().toISOString(), ...a);

export async function starteServer({ port = process.env.PORT || 3000, datenOrdner = process.env.PORTAL_DATEN || path.join(WURZEL, 'data'), leise = false } = {}) {
  const logge = leise ? () => {} : log;
  fs.mkdirSync(datenOrdner, { recursive: true });
  const speicher = erstelleSqliteSpeicher(path.join(datenOrdner, 'portal.sqlite'));
  if (uebernehmeAlteDaten(speicher, path.join(datenOrdner, 'db.json'))) logge('Daten aus db.json übernommen');

  const geheim = erstelleGeheim(datenOrdner);
  const L = erstelleLogik(speicher, { umgebung: { verschluessele: geheim.verschluessele } });
  const routen = erstelleRouten(L);
  const auth = erstelleAuth(speicher.db);
  const mail = erstelleMail({ einstellungen: L.einstellungen, entschluessele: geheim.entschluessele });
  const pdf = erstellePdf(path.join(WURZEL, 'public'));
  const sicherung = erstelleSicherung({ speicher, datenOrdner, mail, einstellungen: L.einstellungen, log: logge });
  const push = erstellePush({ speicher, log: logge });

  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

  // Protokoll jeder Anfrage (ohne Inhalte)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.path.startsWith('/api') || res.statusCode >= 400) logge(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
    });
    next();
  });

  // Sicherheits-Header
  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        "connect-src 'self'",
        "worker-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    });
    if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000');
    next();
  });

  app.get('/health', (req, res) => {
    try {
      speicher.db.prepare('SELECT 1').get();
      res.json({ ok: true, zeit: new Date().toISOString() });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  app.use(express.static(path.join(WURZEL, 'public'), { index: 'index.html', maxAge: '1h', setHeaders: (res, p) => p.endsWith('sw.js') && res.set('Cache-Control', 'no-cache') }));
  app.get('/lib/chart.js', (req, res) => res.sendFile(path.join(WURZEL, 'node_modules/chart.js/dist/chart.umd.min.js')));
  app.get('/lib/html2pdf.js', (req, res) => res.sendFile(path.join(WURZEL, 'node_modules/html2pdf.js/dist/html2pdf.bundle.min.js')));

  app.use('/api', express.json({ limit: '8mb' }));

  // Schutz gegen Anfragen von fremden Seiten: schreibende Anfragen brauchen den Kopf X-Portal
  app.use('/api', (req, res, next) => {
    if (req.method !== 'GET' && req.get('X-Portal') !== '1') return res.status(403).json({ error: 'Anfrage abgelehnt' });
    next();
  });

  const cookie = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map((c) => c.trim().split('=').map(decodeURIComponent)).filter((x) => x[0]))['sitzung'];
  const setzeCookie = (req, res, token, maxAlter) =>
    res.set('Set-Cookie', `sitzung=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAlter}${req.secure ? '; Secure' : ''}`);
  const async = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // ---------- Anmeldung ----------
  app.get('/api/status', async (req, res) => {
    const benutzer = auth.ausSitzung(cookie(req));
    res.json({ eingerichtet: auth.anzahl() > 0, benutzer, pdfAufServer: await pdf.pruefe(), mailEingerichtet: mail.eingerichtet() });
  });

  app.post(
    '/api/einrichtung',
    async(async (req, res) => {
      if (auth.anzahl() > 0) return res.status(409).json({ error: 'Das Portal ist bereits eingerichtet.' });
      const b = await auth.anlegen({ ...req.body, rolle: 'chef' });
      const s = await auth.anmelden(req.body.email, req.body.passwort, req.ip);
      setzeCookie(req, res, s.token, s.maxAlter);
      logge(`Einrichtung: Chef-Zugang ${b.email} angelegt`);
      res.json({ benutzer: s.benutzer });
    })
  );

  app.post(
    '/api/anmelden',
    async(async (req, res) => {
      const s = await auth.anmelden(req.body?.email, req.body?.passwort, req.ip);
      setzeCookie(req, res, s.token, s.maxAlter);
      res.json({ benutzer: s.benutzer });
    })
  );

  app.post('/api/abmelden', (req, res) => {
    auth.abmelden(cookie(req));
    setzeCookie(req, res, '', 0);
    res.json({ ok: true });
  });

  // Ab hier nur angemeldet
  app.use('/api', (req, res, next) => {
    req.benutzer = auth.ausSitzung(cookie(req));
    if (!req.benutzer) return res.status(401).json({ error: 'Bitte anmelden' });
    next();
  });
  const nurChef = (req, res, next) => (req.benutzer.rolle === 'chef' ? next() : res.status(403).json({ error: 'Dafür fehlt die Berechtigung' }));
  const ctx = (req) => ({ benutzer: req.benutzer });

  app.get('/api/ich', (req, res) => res.json({ benutzer: req.benutzer }));

  // ---------- Benutzerverwaltung ----------
  app.get('/api/benutzer', nurChef, (req, res) => res.json(auth.liste()));
  app.post('/api/benutzer', nurChef, async(async (req, res) => res.json(await auth.anlegen(req.body || {}))));
  app.put('/api/benutzer/:id', nurChef, async(async (req, res) => res.json(await auth.aendern(req.params.id, req.body || {}))));
  app.put(
    '/api/ich/passwort',
    async(async (req, res) => {
      const b = speicher.db.prepare('SELECT email FROM benutzer WHERE id = ?').get(req.benutzer.id);
      await auth.anmelden(b.email, req.body?.alt, req.ip).then((s) => auth.abmelden(s.token));
      await auth.aendern(req.benutzer.id, { passwort: req.body?.neu });
      const s = await auth.anmelden(b.email, req.body.neu, req.ip);
      setzeCookie(req, res, s.token, s.maxAlter);
      res.json({ ok: true });
    })
  );

  // ---------- PDF ----------
  const dokument = (req, id) => L.hole('dokumente', id);
  const pdfAntwort = (res, puffer, name) => res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${encodeURIComponent(name)}"` }).send(puffer);

  app.get(
    '/api/pdf/dokument/:id',
    nurChef,
    async(async (req, res) => {
      if (!(await pdf.pruefe())) return res.status(501).json({ error: 'PDF auf dem Server nicht verfügbar' });
      const d = dokument(req, req.params.id);
      pdfAntwort(res, await pdf.erzeuge(renderDokument(d, L.einstellungen())), dateiname(d));
    })
  );
  app.post(
    '/api/pdf/sammel',
    nurChef,
    async(async (req, res) => {
      if (!(await pdf.pruefe())) return res.status(501).json({ error: 'PDF auf dem Server nicht verfügbar' });
      const ids = (req.body?.ids || []).slice(0, 100);
      const s = L.einstellungen();
      pdfAntwort(res, await pdf.erzeuge(ids.map((id) => renderDokument(dokument(req, id), s))), `Sammel-PDF_${heute()}.pdf`);
    })
  );
  app.get(
    '/api/pdf/einsatzzettel',
    nurChef,
    async(async (req, res) => {
      if (!(await pdf.pruefe())) return res.status(501).json({ error: 'PDF auf dem Server nicht verfügbar' });
      const tag = /^\d{4}-\d{2}-\d{2}$/.test(req.query.datum) ? req.query.datum : heute();
      const d = L.daten(ctx(req));
      const termine = d.termine.filter((t) => t.datum === tag && t.status !== 'abgesagt');
      pdfAntwort(res, await pdf.erzeuge(renderEinsatzzettel(tag, termine, L.einstellungen(), d.mitarbeiter)), `Einsatzzettel_${tag}.pdf`);
    })
  );

  // ---------- E-Mail ----------
  app.post('/api/mail/test', nurChef, async(async (req, res) => (await mail.test(), res.json({ ok: true }))));

  app.post(
    '/api/dokumente/:id/mail',
    nurChef,
    async(async (req, res) => {
      const { an, cc, betreff, text, mitPdf = true, pdfBase64, art } = req.body || {};
      if (!an || !betreff) return res.status(400).json({ error: 'Empfänger und Betreff fehlen' });
      let d = dokument(req, req.params.id);
      // Rechnungen werden beim Versand festgeschrieben, damit die Nummer im PDF steht
      if (d.typ === 'rechnung' && !d.gesperrt) d = L.abschliessen(ctx(req), d.id);
      const s = L.einstellungen();
      const anhaenge = [];
      if (mitPdf) {
        if (await pdf.pruefe()) anhaenge.push({ filename: dateiname(d), content: await pdf.erzeuge(renderDokument(d, s)), contentType: 'application/pdf' });
        else if (pdfBase64) anhaenge.push({ filename: dateiname(d), content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' });
        else return res.status(400).json({ error: 'PDF fehlt' });
      }
      await mail.senden({ an, cc, betreff: platzhalter(betreff, d, s), text: platzhalter(text, d, s), anhaenge });
      res.json(L.versendet(ctx(req), d.id, { an, art }));
    })
  );

  const teamAdressen = (termine) => {
    const ids = new Set(termine.flatMap((t) => t.mitarbeiterIds || []));
    return L.daten({ benutzer: { rolle: 'chef' } })
      .mitarbeiter.filter((m) => ids.has(m.id) && m.email)
      .map((m) => m.email);
  };

  app.post(
    '/api/termine/:id/mail',
    nurChef,
    async(async (req, res) => {
      const t = L.hole('termine', req.params.id);
      const an = teamAdressen([t]);
      if (!an.length) return res.status(400).json({ error: 'Die ausgewählten Mitarbeiter haben keine E-Mail-Adresse hinterlegt.' });
      const d = L.daten(ctx(req));
      await mail.senden({ an: an.join(', '), betreff: `Einsatz am ${datum(t.datum)}${t.von ? ` um ${t.von}` : ''}: ${t.titel || t.kundeName || 'Termin'}`, text: `Hallo,\n\n${einsatzText(t.datum, [t], d.mitarbeiter)}\n\nViele Grüße\n${L.einstellungen().firma.name}` });
      res.json({ ok: true, anzahl: an.length });
    })
  );

  app.post(
    '/api/einsatzzettel/mail',
    nurChef,
    async(async (req, res) => {
      const tag = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.datum) ? req.body.datum : heute();
      const d = L.daten(ctx(req));
      const termine = d.termine.filter((t) => t.datum === tag && t.status !== 'abgesagt');
      const an = teamAdressen(termine);
      if (!an.length) return res.status(400).json({ error: 'Für diesen Tag ist kein Mitarbeiter mit E-Mail-Adresse eingeplant.' });
      const anhaenge = (await pdf.pruefe()) ? [{ filename: `Einsatzzettel_${tag}.pdf`, content: await pdf.erzeuge(renderEinsatzzettel(tag, termine, L.einstellungen(), d.mitarbeiter)) }] : [];
      await mail.senden({ an: an.join(', '), betreff: `Einsatzzettel ${datum(tag)}`, text: `${einsatzText(tag, termine, d.mitarbeiter)}\n\nViele Grüße\n${L.einstellungen().firma.name}`, anhaenge });
      res.json({ ok: true, anzahl: an.length });
    })
  );

  // ---------- Sicherung ----------
  app.get('/api/sicherung', nurChef, (req, res) => {
    res.set('Content-Disposition', `attachment; filename="rechnung-programm-sicherung-${heute()}.json"`);
    res.json(sicherung.alsJson());
  });
  app.post('/api/sicherung/mail', nurChef, async(async (req, res) => res.json({ ok: await sicherung.perMail() })));
  app.post(
    '/api/sicherung/wiederherstellen',
    nurChef,
    express.json({ limit: '200mb' }),
    async(async (req, res) => {
      const d = req.body || {};
      sicherung.lokal();
      if (d.sammlungen) speicher.ersetze(d);
      else if (d.settings) {
        // Sicherung aus der ersten Version (db.json-Format)
        const sammlungen = {};
        for (const col of ['kunden', 'dokumente', 'buchungen', 'mitarbeiter', 'termine']) sammlungen[col] = Object.fromEntries((d[col] || []).map((x) => [x.id, x]));
        speicher.ersetze({ sammlungen, einstellungen: d.settings });
      } else return res.status(400).json({ error: 'Das ist keine gültige Sicherung.' });
      logge(`Sicherung wiederhergestellt von ${req.benutzer.name}`);
      res.json({ ok: true });
    })
  );

  // ---------- Adressen & Strecke ----------
  app.get('/api/geo/suche', nurChef, async(async (req, res) => res.json(await adressSuche(String(req.query.q || '')))));
  app.get('/api/geo/strecke', nurChef, async(async (req, res) => res.json(await strecke(String(req.query.von || ''), String(req.query.nach || '')))));

  // ---------- Push ----------
  app.get('/api/push/schluessel', (req, res) => res.json({ schluessel: push.oeffentlicherSchluessel() }));
  app.post('/api/push/abo', (req, res) => (push.abonnieren(req.benutzer.id, req.body), res.json({ ok: true })));
  app.delete('/api/push/abo', (req, res) => (push.abbestellen(req.body?.endpoint), res.json({ ok: true })));

  // Mitarbeiter bei neuen oder geänderten Einsätzen benachrichtigen
  function meldeTermin(t, neu) {
    const nutzer = auth.liste().filter((b) => b.aktiv && b.mitarbeiterId && (t.mitarbeiterIds || []).includes(b.mitarbeiterId));
    push
      .senden(
        nutzer.map((b) => b.id),
        { titel: neu ? 'Neuer Einsatz' : 'Einsatz geändert', text: `${datum(t.datum)}${t.von ? ` ${t.von} Uhr` : ''}: ${t.titel || t.kundeName || 'Termin'}`, url: '/#/kalender' }
      )
      .catch(() => {});
  }

  // ---------- Gemeinsame Routen (Daten, Dokumente, Aktionen) ----------
  app.all(
    '/api/*',
    async(async (req, res) => {
      const { gefunden, ergebnis } = fuehreAus(routen, ctx(req), req.method, req.originalUrl, req.body);
      if (!gefunden) return res.status(404).json({ error: 'Nicht gefunden' });
      if (/^\/api\/termine(\/[\w-]+)?$/.test(req.path) && ['POST', 'PUT'].includes(req.method) && req.benutzer.rolle === 'chef') meldeTermin(ergebnis, req.method === 'POST');
      res.json(ergebnis);
    })
  );

  // Fehler verständlich zurückgeben
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || (err.type === 'entity.too.large' ? 413 : 500);
    if (status >= 500) logge(`Fehler bei ${req.method} ${req.path}:`, err.stack || err.message);
    res.status(status).json({ error: status >= 500 && !err.status ? 'Interner Fehler. Bitte später erneut versuchen.' : err.message });
  });

  // ---------- Regelmäßige Aufgaben ----------
  sicherung.starte();
  let letzteZusammenfassung = '';
  const morgens = setInterval(() => {
    const jetzt = new Date();
    if (jetzt.getHours() !== 7 || letzteZusammenfassung === heute()) return;
    letzteZusammenfassung = heute();
    const d = L.daten({ benutzer: { rolle: 'chef' } });
    const liste = erinnerungen(d, L.einstellungen());
    const termineHeute = d.termine.filter((t) => t.datum === heute() && t.status !== 'abgesagt').length;
    if (!termineHeute && !liste.length) return;
    const chefs = auth.liste().filter((b) => b.aktiv && b.rolle === 'chef');
    push.senden(chefs.map((b) => b.id), { titel: 'Guten Morgen', text: `Heute ${termineHeute} Termin(e), ${liste.length} Punkt(e) zu erledigen`, url: '/#/dashboard' }).catch(() => {});
  }, 10 * 60 * 1000);
  morgens.unref();

  const server = await new Promise((resolve) => {
    const s = app.listen(port, () => resolve(s));
  });
  logge(`Rechnung-Programm läuft: http://localhost:${server.address().port}`);
  if (!auth.anzahl()) logge('Noch kein Zugang eingerichtet – beim ersten Öffnen im Browser wird der Chef-Zugang angelegt.');

  return {
    server,
    port: server.address().port,
    async stop() {
      clearInterval(morgens);
      await new Promise((r) => server.close(r));
      await pdf.schliessen();
      speicher.db.close();
    }
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  starteServer().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
