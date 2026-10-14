// Verbindung zur Website: Anfragen empfangen und Besucher zählen.
// Datenschutz: keine Cookies, keine IP-Adressen. Ein Besucher wird pro Tag über einen Hash aus IP, Browser und einem
// täglich wechselnden Zufallswert wiedererkannt; der Hash wird nach zwei Tagen gelöscht (wie bei Plausible/Umami).
import crypto from 'node:crypto';

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|monitor|curl|wget|python|axios/i;

// Woher kommt der Besuch? Eigene Links (?quelle=… / utm_source) haben Vorrang vor dem Referrer.
export function quelleErmitteln({ referrer = '', quelle = '', eigeneHosts = [] } = {}) {
  const q = String(quelle || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9äöüß._ -]/g, '')
    .slice(0, 40);
  if (q) {
    if (/^(gmb|google-?maps|maps|google-?business|gbp)$/.test(q)) return 'Google Maps';
    if (/^(google-?ads|adwords|gads|cpc)$/.test(q)) return 'Google Ads';
    return `Link: ${q}`;
  }
  let url;
  try {
    url = new URL(referrer);
  } catch {
    return 'Direkt';
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (!host || eigeneHosts.includes(host)) return 'Direkt';
  if (/(^|\.)google\./.test(host) && (url.pathname.startsWith('/maps') || host.startsWith('maps.'))) return 'Google Maps';
  if (host === 'maps.app.goo.gl' || host === 'goo.gl') return 'Google Maps';
  if (/(^|\.)google\./.test(host)) return 'Google Suche';
  if (/(^|\.)bing\.com$/.test(host)) return 'Bing';
  if (/(^|\.)(duckduckgo\.com|ecosia\.org|yahoo\.com|startpage\.com)$/.test(host)) return 'Andere Suchmaschine';
  if (/(^|\.)(facebook\.com|fb\.com|m\.facebook\.com|l\.facebook\.com)$/.test(host)) return 'Facebook';
  if (/(^|\.)instagram\.com$/.test(host) || host === 'l.instagram.com') return 'Instagram';
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(host)) return 'WhatsApp';
  if (/(^|\.)tiktok\.com$/.test(host)) return 'TikTok';
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return 'YouTube';
  if (/(^|\.)(kleinanzeigen\.de|ebay-kleinanzeigen\.de)$/.test(host)) return 'Kleinanzeigen';
  return `Website: ${host.slice(0, 40)}`;
}

export const geraetVon = (ua = '', breite = 0) => (/ipad|tablet/i.test(ua) ? 'Tablet' : /mobi|android|iphone/i.test(ua) || (breite && breite < 768) ? 'Handy' : 'Computer');

const seiteVon = (s) => {
  try {
    const p = new URL(s, 'https://x').pathname.replace(/\/index\.php$/, '/').replace(/\.php$/, '');
    return (p || '/').slice(0, 80);
  } catch {
    return '/';
  }
};

export function erstelleWebsite({ speicher, L, log = () => {} }) {
  const db = speicher.db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS web_besuche (tag TEXT, seite TEXT, quelle TEXT, geraet TEXT, aufrufe INTEGER DEFAULT 0, besucher INTEGER DEFAULT 0, PRIMARY KEY (tag, seite, quelle, geraet));
    CREATE TABLE IF NOT EXISTS web_besucher_tag (tag TEXT, hash TEXT, quelle TEXT, PRIMARY KEY (tag, hash));
    CREATE TABLE IF NOT EXISTS web_anfragen (tag TEXT, quelle TEXT, anzahl INTEGER DEFAULT 0, PRIMARY KEY (tag, quelle));
  `);
  const tagHeute = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });

  // ---------- Schlüssel für Anfragen vom Website-Server ----------
  function schluessel({ neu = false } = {}) {
    const s = speicher.einstellungen() || {};
    if (neu || !s.geheim?.websiteSchluessel) {
      const wert = crypto.randomBytes(24).toString('base64url');
      speicher.setzeEinstellungen({ ...s, geheim: { ...(s.geheim || {}), websiteSchluessel: wert } });
      return wert;
    }
    return s.geheim.websiteSchluessel;
  }
  const schluesselOk = (wert) => {
    const soll = Buffer.from(schluessel());
    const ist = Buffer.from(String(wert || ''));
    return ist.length === soll.length && crypto.timingSafeEqual(ist, soll);
  };

  // täglich wechselndes Salz: gestrige Hashes lassen sich nicht mit heutigen verknüpfen
  function salz(tag) {
    const s = speicher.einstellungen() || {};
    const g = s.geheim?.websiteSalz;
    if (g?.tag === tag) return g.wert;
    const wert = crypto.randomBytes(16).toString('hex');
    speicher.setzeEinstellungen({ ...s, geheim: { ...(s.geheim || {}), websiteSalz: { tag, wert } } });
    db.prepare('DELETE FROM web_besucher_tag WHERE tag < ?').run(tag);
    return wert;
  }

  const eigeneHosts = () => {
    try {
      return [new URL(L.einstellungen().website?.url || 'https://x.invalid').hostname.replace(/^www\./, '')];
    } catch {
      return [];
    }
  };

  // ---------- Besuch zählen ----------
  function besuch(daten, { ip = '', ua = '' } = {}) {
    if (!daten || typeof daten !== 'object' || BOT.test(ua)) return false;
    const tag = tagHeute();
    const seite = seiteVon(daten.seite);
    const hash = crypto
      .createHash('sha256')
      .update(`${salz(tag)}|${ip}|${ua}`)
      .digest('hex')
      .slice(0, 32);
    const bekannt = db.prepare('SELECT quelle FROM web_besucher_tag WHERE tag = ? AND hash = ?').get(tag, hash);
    // die Quelle zählt beim ersten Aufruf des Tages; weitere Seiten desselben Besuchers erben sie
    const quelle = bekannt?.quelle || quelleErmitteln({ referrer: daten.referrer, quelle: daten.quelle, eigeneHosts: eigeneHosts() });
    const geraet = geraetVon(ua, Number(daten.breite) || 0);
    if (!bekannt) db.prepare('INSERT INTO web_besucher_tag (tag, hash, quelle) VALUES (?, ?, ?)').run(tag, hash, quelle);
    db.prepare(
      `INSERT INTO web_besuche (tag, seite, quelle, geraet, aufrufe, besucher) VALUES (?, ?, ?, ?, 1, ?)
       ON CONFLICT (tag, seite, quelle, geraet) DO UPDATE SET aufrufe = aufrufe + 1, besucher = besucher + excluded.besucher`
    ).run(tag, seite, quelle, geraet, bekannt ? 0 : 1);
    return true;
  }

  // ---------- Anfrage von der Website ----------
  // Die Website schickt die ursprüngliche Herkunft des Besuchers mit (quelle = ?quelle=…, quelle_referrer = Referrer)
  function anfrage(daten) {
    const quelle = quelleErmitteln({ quelle: daten?.quelle, referrer: daten?.quelle_referrer, eigeneHosts: eigeneHosts() });
    const ergebnis = L.webAnfrage({ ...daten, quelle, eingang: '' });
    db.prepare('INSERT INTO web_anfragen (tag, quelle, anzahl) VALUES (?, ?, 1) ON CONFLICT (tag, quelle) DO UPDATE SET anzahl = anzahl + 1').run(tagHeute(), quelle);
    return ergebnis;
  }

  // ---------- Auswertung ----------
  function statistik(tage = 30) {
    tage = Math.min(Math.max(Number(tage) || 30, 1), 400);
    const ab = new Date(Date.now() - (tage - 1) * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
    const verlauf = db.prepare('SELECT tag, SUM(aufrufe) aufrufe, SUM(besucher) besucher FROM web_besuche WHERE tag >= ? GROUP BY tag').all(ab);
    const anfragenTag = db.prepare('SELECT tag, SUM(anzahl) anzahl FROM web_anfragen WHERE tag >= ? GROUP BY tag').all(ab);
    const tageListe = [];
    for (let i = tage - 1; i >= 0; i--) {
      const t = new Date(Date.now() - i * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
      const v = verlauf.find((x) => x.tag === t);
      tageListe.push({ tag: t, aufrufe: v?.aufrufe || 0, besucher: v?.besucher || 0, anfragen: anfragenTag.find((x) => x.tag === t)?.anzahl || 0 });
    }
    const anfragenQuelle = Object.fromEntries(
      db
        .prepare('SELECT quelle, SUM(anzahl) n FROM web_anfragen WHERE tag >= ? GROUP BY quelle')
        .all(ab)
        .map((r) => [r.quelle, r.n])
    );
    const quellen = db
      .prepare('SELECT quelle, SUM(besucher) besucher, SUM(aufrufe) aufrufe FROM web_besuche WHERE tag >= ? GROUP BY quelle ORDER BY besucher DESC')
      .all(ab)
      .map((r) => ({ ...r, anfragen: anfragenQuelle[r.quelle] || 0 }));
    for (const [q, n] of Object.entries(anfragenQuelle)) if (!quellen.some((r) => r.quelle === q)) quellen.push({ quelle: q, besucher: 0, aufrufe: 0, anfragen: n });
    const seiten = db.prepare('SELECT seite, SUM(aufrufe) aufrufe, SUM(besucher) besucher FROM web_besuche WHERE tag >= ? GROUP BY seite ORDER BY aufrufe DESC LIMIT 20').all(ab);
    const geraete = db.prepare('SELECT geraet, SUM(besucher) besucher FROM web_besuche WHERE tag >= ? GROUP BY geraet ORDER BY besucher DESC').all(ab);
    const summe = (k) => tageListe.reduce((s, t) => s + t[k], 0);
    const heute = tageListe.at(-1);
    return {
      tage: tageListe,
      quellen,
      seiten,
      geraete,
      summen: { besucher: summe('besucher'), aufrufe: summe('aufrufe'), anfragen: summe('anfragen'), heuteBesucher: heute.besucher, heuteAnfragen: heute.anfragen }
    };
  }

  log('Website-Verbindung bereit');
  return { schluessel, schluesselOk, besuch, anfrage, statistik };
}
