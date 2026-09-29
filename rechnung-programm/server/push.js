// Push-Benachrichtigungen aufs Handy (Web Push). Schlüssel werden einmalig erzeugt und in den Einstellungen gespeichert.
import webpush from 'web-push';

export function erstellePush({ speicher, log }) {
  const db = speicher.db;
  function schluessel() {
    const s = speicher.einstellungen() || {};
    if (!s.geheim?.vapid) {
      const vapid = webpush.generateVAPIDKeys();
      speicher.setzeEinstellungen({ ...s, geheim: { ...(s.geheim || {}), vapid } });
      return vapid;
    }
    return s.geheim.vapid;
  }
  const k = schluessel();
  webpush.setVapidDetails(`mailto:${process.env.PUSH_KONTAKT || 'info@example.com'}`, k.publicKey, k.privateKey);

  return {
    oeffentlicherSchluessel: () => schluessel().publicKey,
    abonnieren(benutzerId, abo) {
      if (!abo?.endpoint || !/^https:\/\//.test(abo.endpoint)) throw Object.assign(new Error('Ungültiges Abo'), { status: 400 });
      db.prepare('INSERT INTO push_abos (endpoint, benutzer_id, daten) VALUES (?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET benutzer_id = excluded.benutzer_id, daten = excluded.daten').run(
        abo.endpoint,
        benutzerId,
        JSON.stringify(abo)
      );
    },
    abbestellen: (endpoint) => db.prepare('DELETE FROM push_abos WHERE endpoint = ?').run(String(endpoint || '')),
    // an bestimmte Benutzer senden
    async senden(benutzerIds, nachricht) {
      if (!benutzerIds.length) return 0;
      const abos = db.prepare(`SELECT * FROM push_abos WHERE benutzer_id IN (${benutzerIds.map(() => '?').join(',')})`).all(...benutzerIds);
      let n = 0;
      await Promise.all(
        abos.map(async (a) => {
          try {
            await webpush.sendNotification(JSON.parse(a.daten), JSON.stringify(nachricht), { TTL: 6 * 3600 });
            n += 1;
          } catch (e) {
            if (e.statusCode === 404 || e.statusCode === 410) db.prepare('DELETE FROM push_abos WHERE endpoint = ?').run(a.endpoint);
            else log(`Push fehlgeschlagen: ${e.message}`);
          }
        })
      );
      return n;
    }
  };
}
