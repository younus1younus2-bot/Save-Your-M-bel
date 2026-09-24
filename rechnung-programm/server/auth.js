// Benutzer, Anmeldung und Sitzungen
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const SITZUNG_TAGE = 30;
const MAX_FEHLVERSUCHE = 5;
const SPERRE_MIN = 15;

export async function hashePasswort(passwort) {
  const salz = crypto.randomBytes(16);
  const hash = await scrypt(passwort, salz, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salz.toString('base64')}$${hash.toString('base64')}`;
}

export async function pruefePasswort(passwort, gespeichert) {
  const [, salz, hash] = String(gespeichert).split('$');
  if (!salz || !hash) return false;
  const soll = Buffer.from(hash, 'base64');
  const ist = await scrypt(passwort, Buffer.from(salz, 'base64'), soll.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(soll, ist);
}

export function pruefePasswortRegeln(passwort) {
  if (typeof passwort !== 'string' || passwort.length < 10) return 'Das Passwort muss mindestens 10 Zeichen lang sein.';
  if (passwort.length > 200) return 'Das Passwort ist zu lang.';
  return '';
}

export function erstelleAuth(db) {
  const fehlversuche = new Map(); // Schlüssel: IP + E-Mail

  const zuBenutzer = (r) => r && { id: r.id, name: r.name, email: r.email, rolle: r.rolle, mitarbeiterId: r.mitarbeiter_id || '', aktiv: !!r.aktiv, erstellt: r.erstellt };

  function aufraeumen() {
    db.prepare('DELETE FROM sitzungen WHERE ablauf < ?').run(Date.now());
    const grenze = Date.now() - SPERRE_MIN * 60000;
    for (const [k, v] of fehlversuche) if (v.letzter < grenze) fehlversuche.delete(k);
  }
  setInterval(aufraeumen, 60 * 60 * 1000).unref();

  return {
    anzahl: () => db.prepare('SELECT COUNT(*) AS n FROM benutzer').get().n,
    liste: () => db.prepare('SELECT * FROM benutzer ORDER BY name').all().map(zuBenutzer),
    hole: (id) => zuBenutzer(db.prepare('SELECT * FROM benutzer WHERE id = ?').get(id)),

    async anlegen({ name, email, passwort, rolle = 'mitarbeiter', mitarbeiterId = '' }) {
      if (!name?.trim() || !email?.trim()) throw Object.assign(new Error('Name und E-Mail sind Pflicht.'), { status: 400 });
      if (!['chef', 'mitarbeiter'].includes(rolle)) throw Object.assign(new Error('Unbekannte Rolle.'), { status: 400 });
      const regel = pruefePasswortRegeln(passwort);
      if (regel) throw Object.assign(new Error(regel), { status: 400 });
      if (db.prepare('SELECT 1 FROM benutzer WHERE email = ?').get(email.trim())) throw Object.assign(new Error('Diese E-Mail wird schon verwendet.'), { status: 409 });
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO benutzer (id, name, email, rolle, mitarbeiter_id, hash, aktiv, erstellt) VALUES (?, ?, ?, ?, ?, ?, 1, ?)').run(
        id,
        name.trim(),
        email.trim(),
        rolle,
        mitarbeiterId || null,
        await hashePasswort(passwort),
        new Date().toISOString()
      );
      return zuBenutzer(db.prepare('SELECT * FROM benutzer WHERE id = ?').get(id));
    },

    async aendern(id, { name, email, rolle, mitarbeiterId, aktiv, passwort }) {
      const alt = db.prepare('SELECT * FROM benutzer WHERE id = ?').get(id);
      if (!alt) throw Object.assign(new Error('Benutzer nicht gefunden.'), { status: 404 });
      const neuRolle = rolle ?? alt.rolle;
      const neuAktiv = aktiv === undefined ? alt.aktiv : aktiv ? 1 : 0;
      // Es muss immer mindestens ein aktiver Chef bleiben
      if (alt.rolle === 'chef' && (neuRolle !== 'chef' || !neuAktiv)) {
        const chefs = db.prepare("SELECT COUNT(*) AS n FROM benutzer WHERE rolle = 'chef' AND aktiv = 1").get().n;
        if (chefs <= 1) throw Object.assign(new Error('Es muss mindestens einen aktiven Chef-Zugang geben.'), { status: 409 });
      }
      let hash = alt.hash;
      if (passwort) {
        const regel = pruefePasswortRegeln(passwort);
        if (regel) throw Object.assign(new Error(regel), { status: 400 });
        hash = await hashePasswort(passwort);
        db.prepare('DELETE FROM sitzungen WHERE benutzer_id = ?').run(id);
      }
      db.prepare('UPDATE benutzer SET name = ?, email = ?, rolle = ?, mitarbeiter_id = ?, aktiv = ?, hash = ? WHERE id = ?').run(
        name?.trim() || alt.name,
        email?.trim() || alt.email,
        neuRolle,
        mitarbeiterId === undefined ? alt.mitarbeiter_id : mitarbeiterId || null,
        neuAktiv,
        hash,
        id
      );
      if (!neuAktiv) db.prepare('DELETE FROM sitzungen WHERE benutzer_id = ?').run(id);
      return zuBenutzer(db.prepare('SELECT * FROM benutzer WHERE id = ?').get(id));
    },

    async anmelden(email, passwort, ip) {
      const schluessel = `${ip}|${String(email).toLowerCase()}`;
      const f = fehlversuche.get(schluessel);
      if (f && f.anzahl >= MAX_FEHLVERSUCHE && Date.now() - f.letzter < SPERRE_MIN * 60000) {
        throw Object.assign(new Error(`Zu viele Fehlversuche. Bitte in ${SPERRE_MIN} Minuten erneut versuchen.`), { status: 429 });
      }
      const r = db.prepare('SELECT * FROM benutzer WHERE email = ?').get(String(email || '').trim());
      // gleiche Rechenzeit, auch wenn es den Benutzer nicht gibt
      const ok = r ? await pruefePasswort(String(passwort || ''), r.hash) : (await hashePasswort('x'), false);
      if (!ok || !r.aktiv) {
        fehlversuche.set(schluessel, { anzahl: (f?.anzahl || 0) + 1, letzter: Date.now() });
        throw Object.assign(new Error('E-Mail oder Passwort ist falsch.'), { status: 401 });
      }
      fehlversuche.delete(schluessel);
      const token = crypto.randomBytes(32).toString('base64url');
      db.prepare('INSERT INTO sitzungen (token, benutzer_id, ablauf) VALUES (?, ?, ?)').run(token, r.id, Date.now() + SITZUNG_TAGE * 864e5);
      return { token, benutzer: zuBenutzer(r), maxAlter: SITZUNG_TAGE * 86400 };
    },

    abmelden: (token) => db.prepare('DELETE FROM sitzungen WHERE token = ?').run(String(token || '')),

    ausSitzung(token) {
      if (!token) return null;
      const r = db
        .prepare('SELECT b.* FROM sitzungen s JOIN benutzer b ON b.id = s.benutzer_id WHERE s.token = ? AND s.ablauf > ? AND b.aktiv = 1')
        .get(String(token), Date.now());
      return zuBenutzer(r);
    }
  };
}
