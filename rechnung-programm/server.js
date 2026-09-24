// Rechnung-Programm – kleiner Server: speichert Daten in data/db.json und verschickt E-Mails.
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const COLLECTIONS = ['kunden', 'dokumente', 'buchungen', 'mitarbeiter', 'termine'];

// ---------- Standard-Einstellungen ----------
const DEFAULT_SETTINGS = {
  firma: {
    name: 'Save Your Möbel',
    inhaber: '',
    strasse: '',
    plz: '',
    ort: '',
    telefon: '',
    email: '',
    web: 'www.saveyourmobel.de',
    steuernummer: '',
    ustId: '',
    bank: '',
    iban: '',
    bic: '',
    logo: ''
  },
  steuer: {
    modus: 'klein', // 'klein' = Kleinunternehmer §19 UStG, 'regel' = mit Umsatzsteuer
    satz: 19
  },
  design: {
    farbe: '#E53935',
    akzent: '#1F1F1F',
    schrift: 'Montserrat'
  },
  nummern: {
    rechnung: { prefix: 'RE-{JAHR}-', naechste: 1, stellen: 3 },
    angebot: { prefix: 'KV-{JAHR}-', naechste: 1, stellen: 3 }
  },
  zahlungszielTage: 14,
  angebotGueltigTage: 30,
  texte: {
    rechnungEinleitung: 'vielen Dank für Ihren Auftrag. Wir stellen Ihnen folgende Leistungen in Rechnung:',
    rechnungSchluss: 'Bitte überweisen Sie den Betrag innerhalb von {ZIEL} Tagen unter Angabe der Rechnungsnummer.\nVielen Dank für Ihr Vertrauen!',
    angebotEinleitung: 'vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgenden Kostenvoranschlag:',
    angebotSchluss: 'Dieser Kostenvoranschlag ist gültig bis {GUELTIG}. Wir freuen uns auf Ihren Auftrag!'
  },
  eigeneFelder: [
    { id: 'f_auszug', label: 'Auszugsadresse', fuer: 'beide' },
    { id: 'f_einzug', label: 'Einzugsadresse', fuer: 'beide' }
  ],
  einheiten: ['Pauschal', 'Std.', 'Stk.', 'm³', 'km', 'Tag', 'Helfer'],
  kategorienAusgaben: ['Fahrzeug / Miete', 'Kraftstoff', 'Löhne / Aushilfen', 'Verpackungsmaterial', 'Versicherung', 'Werbung', 'Büro / Telefon', 'Werkzeug', 'Sonstiges'],
  kategorienEinnahmen: ['Umzug', 'Entrümpelung', 'Montage', 'Sonstiges'],
  artikel: [
    { beschreibung: 'Umzugshelfer', einheit: 'Std.', preis: 35 },
    { beschreibung: 'Umzugswagen 3,5 t inkl. Fahrer', einheit: 'Std.', preis: 60 },
    { beschreibung: 'Anfahrt', einheit: 'Pauschal', preis: 50 },
    { beschreibung: 'Möbel-Demontage / Montage', einheit: 'Std.', preis: 40 },
    { beschreibung: 'Umzugskartons', einheit: 'Stk.', preis: 2.5 }
  ],
  email: {
    vorlagen: {
      rechnung: {
        betreff: 'Ihre Rechnung {NUMMER} – {FIRMA}',
        text: 'Guten Tag {KUNDE},\n\nanbei erhalten Sie Ihre Rechnung {NUMMER} über {BETRAG}.\nBitte überweisen Sie den Betrag bis zum {FAELLIG}.\n\nMit freundlichen Grüßen\n{FIRMA}'
      },
      angebot: {
        betreff: 'Ihr Kostenvoranschlag {NUMMER} – {FIRMA}',
        text: 'Guten Tag {KUNDE},\n\nvielen Dank für Ihre Anfrage. Anbei erhalten Sie unseren Kostenvoranschlag {NUMMER} über {BETRAG}.\nBei Fragen sind wir gerne für Sie da.\n\nMit freundlichen Grüßen\n{FIRMA}'
      },
      erinnerung: {
        betreff: 'Zahlungserinnerung zu Rechnung {NUMMER}',
        text: 'Guten Tag {KUNDE},\n\nsicher ist es Ihrer Aufmerksamkeit entgangen: Die Rechnung {NUMMER} über {BETRAG} war am {FAELLIG} fällig.\nBitte überweisen Sie den offenen Betrag in den nächsten Tagen.\n\nMit freundlichen Grüßen\n{FIRMA}'
      }
    },
    smtp: { host: '', port: 587, user: '', pass: '', from: '' },
    bcc: ''
  }
};

// ---------- Datenbank (JSON-Datei) ----------
function deepMerge(base, extra) {
  if (Array.isArray(base) || typeof base !== 'object' || base === null) return extra === undefined ? base : extra;
  const out = { ...base };
  for (const k of Object.keys(extra || {})) {
    out[k] = k in base ? deepMerge(base[k], extra[k]) : extra[k];
  }
  return out;
}

function loadDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  let db = {};
  if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  db.settings = deepMerge(DEFAULT_SETTINGS, db.settings || {});
  for (const c of COLLECTIONS) db[c] = db[c] || [];
  return db;
}

let db = loadDb();

function saveDb() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

// tägliche Sicherung (eine Datei pro Tag, max. 30)
function backup() {
  const dir = path.join(DATA_DIR, 'backups');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `db-${new Date().toISOString().slice(0, 10)}.json`);
  if (!fs.existsSync(file) && fs.existsSync(DB_FILE)) fs.copyFileSync(DB_FILE, file);
  const files = fs.readdirSync(dir).sort();
  while (files.length > 30) fs.unlinkSync(path.join(dir, files.shift()));
}

const newId = () => crypto.randomBytes(8).toString('hex');

// ---------- App ----------
const app = express();
app.use(express.json({ limit: '25mb' }));

// Passwortschutz (HTTP Basic Auth)
const PASSWORT = process.env.PORTAL_PASSWORT || '';
app.use((req, res, next) => {
  if (!PASSWORT) return next();
  const header = req.headers.authorization || '';
  const [, encoded] = header.split(' ');
  const pass = encoded ? Buffer.from(encoded, 'base64').toString().split(':').slice(1).join(':') : '';
  const a = Buffer.from(pass);
  const b = Buffer.from(PASSWORT);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  res.set('WWW-Authenticate', 'Basic realm="Rechnung-Programm"');
  res.status(401).send('Passwort erforderlich');
});

app.use(express.static(path.join(__dirname, 'public')));
// Bibliotheken lokal ausliefern (funktioniert auch ohne Internet)
app.get('/lib/chart.js', (req, res) => res.sendFile(path.join(__dirname, 'node_modules/chart.js/dist/chart.umd.min.js')));
app.get('/lib/html2pdf.js', (req, res) => res.sendFile(path.join(__dirname, 'node_modules/html2pdf.js/dist/html2pdf.bundle.min.js')));

// SMTP-Passwort nie an den Browser schicken
function publicSettings() {
  const s = JSON.parse(JSON.stringify(db.settings));
  s.email.smtp.pass = s.email.smtp.pass ? '********' : '';
  s.email.smtpAusEnv = Boolean(process.env.SMTP_HOST);
  return s;
}

app.get('/api/settings', (req, res) => res.json(publicSettings()));

app.put('/api/settings', (req, res) => {
  const neu = req.body || {};
  if (neu.email && neu.email.smtp && neu.email.smtp.pass === '********') {
    neu.email.smtp.pass = db.settings.email.smtp.pass;
  }
  db.settings = deepMerge(DEFAULT_SETTINGS, neu);
  saveDb();
  res.json(publicSettings());
});

// Nächste Dokumentnummer vergeben (zählt hoch)
app.post('/api/nummer/:typ', (req, res) => {
  const cfg = db.settings.nummern[req.params.typ];
  if (!cfg) return res.status(400).json({ error: 'Unbekannter Typ' });
  const jahr = String(new Date().getFullYear());
  const nummer = cfg.prefix.replace('{JAHR}', jahr) + String(cfg.naechste).padStart(cfg.stellen || 1, '0');
  cfg.naechste += 1;
  saveDb();
  res.json({ nummer });
});

// Allgemeine CRUD-Routen für alle Sammlungen
app.param('col', (req, res, next, col) => {
  if (!COLLECTIONS.includes(col)) return res.status(404).json({ error: 'Unbekannt' });
  next();
});

app.get('/api/:col', (req, res) => res.json(db[req.params.col]));

app.post('/api/:col', (req, res) => {
  const item = { ...req.body, id: newId(), erstellt: new Date().toISOString() };
  db[req.params.col].push(item);
  saveDb();
  res.json(item);
});

app.put('/api/:col/:id', (req, res) => {
  const list = db[req.params.col];
  const i = list.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Nicht gefunden' });
  list[i] = { ...list[i], ...req.body, id: list[i].id, geaendert: new Date().toISOString() };
  saveDb();
  res.json(list[i]);
});

app.delete('/api/:col/:id', (req, res) => {
  const list = db[req.params.col];
  const i = list.findIndex((x) => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Nicht gefunden' });
  list.splice(i, 1);
  saveDb();
  res.json({ ok: true });
});

// Komplette Datensicherung herunterladen / wiederherstellen
app.get('/api-backup', (req, res) => {
  const copy = JSON.parse(JSON.stringify(db));
  copy.settings.email.smtp.pass = '';
  res.set('Content-Disposition', `attachment; filename="rechnung-programm-sicherung-${new Date().toISOString().slice(0, 10)}.json`);
  res.json(copy);
});

app.post('/api-restore', (req, res) => {
  const data = req.body;
  if (!data || !data.settings) return res.status(400).json({ error: 'Ungültige Sicherung' });
  backup();
  const pass = db.settings.email.smtp.pass;
  db = { settings: deepMerge(DEFAULT_SETTINGS, data.settings) };
  if (!db.settings.email.smtp.pass) db.settings.email.smtp.pass = pass;
  for (const c of COLLECTIONS) db[c] = Array.isArray(data[c]) ? data[c] : [];
  saveDb();
  res.json({ ok: true });
});

// ---------- E-Mail-Versand ----------
function smtpConfig() {
  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM || process.env.SMTP_USER
    };
  }
  const s = db.settings.email.smtp;
  return { ...s, from: s.from || s.user };
}

function transporter() {
  const c = smtpConfig();
  if (!c.host || !c.user) throw new Error('E-Mail ist noch nicht eingerichtet (Einstellungen → E-Mail).');
  return {
    from: c.from,
    t: nodemailer.createTransport({
      host: c.host,
      port: Number(c.port),
      secure: Number(c.port) === 465,
      auth: { user: c.user, pass: c.pass }
    })
  };
}

app.post('/api-mail/test', async (req, res) => {
  try {
    const { t } = transporter();
    await t.verify();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api-mail', async (req, res) => {
  const { an, cc, betreff, text, anhang } = req.body || {};
  if (!an || !betreff) return res.status(400).json({ error: 'Empfänger und Betreff fehlen' });
  try {
    const { t, from } = transporter();
    const firma = db.settings.firma.name;
    const info = await t.sendMail({
      from: firma ? `"${firma.replace(/"/g, '')}" <${from}>` : from,
      to: an,
      cc: cc || undefined,
      bcc: db.settings.email.bcc || undefined,
      replyTo: db.settings.firma.email || undefined,
      subject: betreff,
      text,
      attachments: anhang
        ? [{ filename: anhang.name, content: Buffer.from(anhang.base64, 'base64'), contentType: 'application/pdf' }]
        : []
    });
    res.json({ ok: true, id: info.messageId });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

backup();
setInterval(backup, 6 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Rechnung-Programm läuft: http://localhost:${PORT}`);
  if (!PASSWORT) console.log('Hinweis: Kein PORTAL_PASSWORT gesetzt – das Portal ist ungeschützt.');
});
