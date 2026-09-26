// Datensicherung: täglich eine Kopie in data/backups (30 Tage) und auf Wunsch per E-Mail nach außen
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export function erstelleSicherung({ speicher, datenOrdner, mail, einstellungen, log }) {
  const ordner = path.join(datenOrdner, 'backups');
  fs.mkdirSync(ordner, { recursive: true });
  const heute = () => new Date().toISOString().slice(0, 10);

  function lokal() {
    const ziel = path.join(ordner, `portal-${heute()}.sqlite`);
    if (!fs.existsSync(ziel)) speicher.sichereNach(ziel);
    const dateien = fs
      .readdirSync(ordner)
      .filter((f) => f.startsWith('portal-'))
      .sort();
    while (dateien.length > 30) fs.unlinkSync(path.join(ordner, dateien.shift()));
    return ziel;
  }

  // Immer aktueller Stand nach jeder Änderung (wird überschrieben; die Tageskopien bleiben erhalten)
  function aktuell() {
    const ziel = path.join(ordner, 'aktuell.sqlite');
    speicher.sichereNach(`${ziel}.tmp`);
    fs.renameSync(`${ziel}.tmp`, ziel);
    return ziel;
  }

  // Sicherung als JSON (ohne Passwörter), gepackt
  function alsJson() {
    const daten = speicher.exportiere();
    if (daten.einstellungen?.email?.smtp) daten.einstellungen.email.smtp.pass = '';
    if (daten.einstellungen) delete daten.einstellungen.geheim;
    return { version: 2, erstellt: new Date().toISOString(), ...daten };
  }

  async function perMail() {
    const an = einstellungen().sicherung?.email;
    if (!an || !mail.eingerichtet()) return false;
    const gz = zlib.gzipSync(JSON.stringify(alsJson()));
    await mail.senden({
      an,
      betreff: `Datensicherung Rechnung-Programm ${heute()}`,
      text: 'Automatische tägliche Datensicherung. Die Datei im Anhang kann unter Einstellungen → Datensicherung wiederhergestellt werden.',
      anhaenge: [{ filename: `sicherung-${heute()}.json.gz`, content: gz, contentType: 'application/gzip' }]
    });
    return true;
  }

  let letzteMail = '';
  async function taeglich() {
    try {
      lokal();
      const s = einstellungen().sicherung || {};
      if (s.email && letzteMail !== heute() && new Date().getHours() >= Number(s.uhrzeit ?? 2)) {
        letzteMail = heute();
        if (await perMail()) log(`Sicherung per E-Mail an ${s.email} gesendet`);
      }
    } catch (e) {
      log(`Sicherung fehlgeschlagen: ${e.message}`);
    }
  }

  return { lokal, aktuell, alsJson, perMail, starte: () => (taeglich(), setInterval(taeglich, 30 * 60 * 1000).unref()) };
}
