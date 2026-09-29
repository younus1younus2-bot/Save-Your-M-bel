// SQLite-Speicher (in Node eingebaut, keine Zusatzinstallation). Gleiche Schnittstelle wie der Memory-Speicher.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const VERSION = 1;
const sicheresFeld = (f) => /^[A-Za-z]\w{0,40}$/.test(f);

export function erstelleSqliteSpeicher(datei) {
  fs.mkdirSync(path.dirname(datei), { recursive: true });
  const db = new DatabaseSync(datei);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  migriere(db);

  const q = {
    alle: db.prepare('SELECT daten FROM eintraege WHERE sammlung = ? AND geloescht IS NULL'),
    alleMit: db.prepare('SELECT daten FROM eintraege WHERE sammlung = ?'),
    hole: db.prepare('SELECT daten FROM eintraege WHERE sammlung = ? AND id = ?'),
    schreibe: db.prepare(
      `INSERT INTO eintraege (sammlung, id, daten, geloescht, geaendert) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(sammlung, id) DO UPDATE SET daten = excluded.daten, geloescht = excluded.geloescht, geaendert = excluded.geaendert`
    ),
    einstellungen: db.prepare("SELECT wert FROM einstellungen WHERE schluessel = 'settings'"),
    setzeEinstellungen: db.prepare("INSERT INTO einstellungen (schluessel, wert) VALUES ('settings', ?) ON CONFLICT(schluessel) DO UPDATE SET wert = excluded.wert"),
    protokolliere: db.prepare('INSERT INTO protokoll (zeit, benutzer, aktion, sammlung, objekt_id, kunde_id, text) VALUES (?, ?, ?, ?, ?, ?, ?)')
  };
  let tiefe = 0;

  const speicher = {
    db,
    alle: (col, { mitGeloeschten = false } = {}) => (mitGeloeschten ? q.alleMit : q.alle).all(col).map((r) => JSON.parse(r.daten)),
    hole: (col, id) => {
      const r = q.hole.get(col, id);
      return r ? JSON.parse(r.daten) : null;
    },
    schreibe: (col, obj) => q.schreibe.run(col, obj.id, JSON.stringify(obj), obj.geloescht || null, new Date().toISOString()),
    // Einträge mit bestimmten Feldwerten finden, große Felder (z. B. Bilddaten) weglassen
    finde(col, bedingungen = {}, { ohne = [] } = {}) {
      const felder = Object.keys(bedingungen).filter(sicheresFeld);
      const auswahl = ohne.filter(sicheresFeld).length
        ? `json_remove(daten, ${ohne
            .filter(sicheresFeld)
            .map((f) => `'$.${f}'`)
            .join(', ')})`
        : 'daten';
      const sql = `SELECT ${auswahl} AS daten FROM eintraege WHERE sammlung = ? AND geloescht IS NULL ${felder.map((f) => `AND json_extract(daten, '$.${f}') = ?`).join(' ')}`;
      return db
        .prepare(sql)
        .all(col, ...felder.map((f) => bedingungen[f]))
        .map((r) => JSON.parse(r.daten));
    },
    // Anzahl je Feldwert, z. B. Fotos je Auftrag
    zaehle(col, feld) {
      if (!sicheresFeld(feld)) return {};
      const zeilen = db.prepare(`SELECT json_extract(daten, '$.${feld}') AS wert, COUNT(*) AS n FROM eintraege WHERE sammlung = ? AND geloescht IS NULL GROUP BY wert`).all(col);
      return Object.fromEntries(zeilen.filter((z) => z.wert).map((z) => [z.wert, z.n]));
    },
    einstellungen: () => {
      const r = q.einstellungen.get();
      return r ? JSON.parse(r.wert) : null;
    },
    setzeEinstellungen: (s) => q.setzeEinstellungen.run(JSON.stringify(s)),
    protokolliere: (e) => q.protokolliere.run(e.zeit, e.benutzer || '', e.aktion || '', e.sammlung || '', e.objektId || '', e.kundeId || '', e.text || ''),
    protokoll({ kundeId, objektId, limit = 200 } = {}) {
      const bed = [];
      const werte = [];
      if (kundeId) (bed.push('kunde_id = ?'), werte.push(kundeId));
      if (objektId) (bed.push('objekt_id = ?'), werte.push(objektId));
      const sql = `SELECT id, zeit, benutzer, aktion, sammlung, objekt_id AS objektId, kunde_id AS kundeId, text FROM protokoll ${bed.length ? `WHERE ${bed.join(' AND ')}` : ''} ORDER BY id DESC LIMIT ?`;
      return db.prepare(sql).all(...werte, Math.min(Number(limit) || 200, 2000));
    },
    // Alles oder nichts (verschachtelt über Savepoints)
    transaktion(fn) {
      const name = `sp${tiefe}`;
      db.exec(tiefe === 0 ? 'BEGIN IMMEDIATE' : `SAVEPOINT ${name}`);
      tiefe += 1;
      try {
        const r = fn();
        tiefe -= 1;
        db.exec(tiefe === 0 ? 'COMMIT' : `RELEASE ${name}`);
        return r;
      } catch (e) {
        tiefe -= 1;
        db.exec(tiefe === 0 ? 'ROLLBACK' : `ROLLBACK TO ${name}; RELEASE ${name}`);
        throw e;
      }
    },
    exportiere() {
      const sammlungen = {};
      for (const r of db.prepare('SELECT sammlung, id, daten FROM eintraege').all()) (sammlungen[r.sammlung] ||= {})[r.id] = JSON.parse(r.daten);
      return { sammlungen, einstellungen: speicher.einstellungen(), protokoll: db.prepare('SELECT * FROM protokoll ORDER BY id').all() };
    },
    ersetze(z) {
      speicher.transaktion(() => {
        db.exec('DELETE FROM eintraege');
        for (const [col, eintraege] of Object.entries(z.sammlungen || {})) for (const obj of Object.values(eintraege)) speicher.schreibe(col, obj);
        if (z.einstellungen) speicher.setzeEinstellungen(z.einstellungen);
      });
    },
    // Konsistente Kopie der Datenbank (auch während des Betriebs)
    sichereNach(ziel) {
      if (fs.existsSync(ziel)) fs.unlinkSync(ziel);
      db.exec(`VACUUM INTO '${ziel.replace(/'/g, "''")}'`);
    }
  };
  return speicher;
}

function migriere(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS meta (schluessel TEXT PRIMARY KEY, wert TEXT)`);
  const v = Number(db.prepare("SELECT wert FROM meta WHERE schluessel = 'version'").get()?.wert || 0);
  if (v < 1) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS eintraege (
        sammlung TEXT NOT NULL, id TEXT NOT NULL, daten TEXT NOT NULL, geloescht TEXT, geaendert TEXT,
        PRIMARY KEY (sammlung, id)
      );
      CREATE INDEX IF NOT EXISTS eintraege_sammlung ON eintraege (sammlung, geloescht);
      CREATE TABLE IF NOT EXISTS einstellungen (schluessel TEXT PRIMARY KEY, wert TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS protokoll (
        id INTEGER PRIMARY KEY AUTOINCREMENT, zeit TEXT NOT NULL, benutzer TEXT, aktion TEXT, sammlung TEXT,
        objekt_id TEXT, kunde_id TEXT, text TEXT
      );
      CREATE INDEX IF NOT EXISTS protokoll_kunde ON protokoll (kunde_id);
      CREATE INDEX IF NOT EXISTS protokoll_objekt ON protokoll (objekt_id);
      CREATE TABLE IF NOT EXISTS benutzer (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, rolle TEXT NOT NULL,
        mitarbeiter_id TEXT, hash TEXT NOT NULL, aktiv INTEGER NOT NULL DEFAULT 1, erstellt TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS sitzungen (token TEXT PRIMARY KEY, benutzer_id TEXT NOT NULL, ablauf INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS push_abos (endpoint TEXT PRIMARY KEY, benutzer_id TEXT NOT NULL, daten TEXT NOT NULL);
    `);
  }
  db.prepare("INSERT INTO meta (schluessel, wert) VALUES ('version', ?) ON CONFLICT(schluessel) DO UPDATE SET wert = excluded.wert").run(String(VERSION));
}

// Alte Daten aus data/db.json (erste Version) einmalig übernehmen
export function uebernehmeAlteDaten(speicher, jsonDatei) {
  if (!fs.existsSync(jsonDatei)) return false;
  const leer = !speicher.db.prepare('SELECT 1 FROM eintraege LIMIT 1').get() && !speicher.einstellungen();
  if (!leer) return false;
  const alt = JSON.parse(fs.readFileSync(jsonDatei, 'utf8'));
  speicher.transaktion(() => {
    if (alt.settings) speicher.setzeEinstellungen(alt.settings);
    for (const col of ['kunden', 'dokumente', 'buchungen', 'mitarbeiter', 'termine']) {
      for (const obj of alt[col] || []) {
        // früher abgeschlossene Rechnungen gelten als festgeschrieben
        if (col === 'dokumente' && obj.typ === 'rechnung' && obj.status && obj.status !== 'entwurf') obj.gesperrt = true;
        speicher.schreibe(col, obj);
      }
    }
  });
  fs.renameSync(jsonDatei, `${jsonDatei}.uebernommen`);
  return true;
}
