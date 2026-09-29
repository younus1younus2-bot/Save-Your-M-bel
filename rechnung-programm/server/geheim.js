// Verschlüsselung für gespeicherte Geheimnisse (z. B. SMTP-Passwort) mit AES-256-GCM.
// Der Schlüssel kommt aus PORTAL_SCHLUESSEL oder wird einmalig in data/.schluessel erzeugt.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function erstelleGeheim(datenOrdner) {
  let schluessel;
  if (process.env.PORTAL_SCHLUESSEL) {
    schluessel = crypto.createHash('sha256').update(process.env.PORTAL_SCHLUESSEL).digest();
  } else {
    const datei = path.join(datenOrdner, '.schluessel');
    if (!fs.existsSync(datei)) fs.writeFileSync(datei, crypto.randomBytes(32).toString('base64'), { mode: 0o600 });
    schluessel = Buffer.from(fs.readFileSync(datei, 'utf8').trim(), 'base64');
  }
  return {
    verschluessele(klartext) {
      if (!klartext || String(klartext).startsWith('enc:')) return klartext;
      const iv = crypto.randomBytes(12);
      const c = crypto.createCipheriv('aes-256-gcm', schluessel, iv);
      const daten = Buffer.concat([c.update(String(klartext), 'utf8'), c.final()]);
      return `enc:${Buffer.concat([iv, c.getAuthTag(), daten]).toString('base64')}`;
    },
    entschluessele(wert) {
      if (!wert || !String(wert).startsWith('enc:')) return wert || '';
      try {
        const roh = Buffer.from(String(wert).slice(4), 'base64');
        const d = crypto.createDecipheriv('aes-256-gcm', schluessel, roh.subarray(0, 12));
        d.setAuthTag(roh.subarray(12, 28));
        return Buffer.concat([d.update(roh.subarray(28)), d.final()]).toString('utf8');
      } catch {
        return '';
      }
    }
  };
}
