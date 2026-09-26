// Anbindung an den eigenen Server
import { blobZuBase64 } from './ui.js';
import { pdfImBrowser } from './pdf-browser.js';

async function api(methode, url, body) {
  const res = await fetch(url, {
    method: methode,
    credentials: 'same-origin',
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), 'X-Portal': '1' },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  if (res.status === 401 && !url.startsWith('/api/anmelden') && !url.startsWith('/api/status')) {
    window.dispatchEvent(new CustomEvent('abgemeldet'));
  }
  const daten = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(daten.error || `Fehler ${res.status}`), { status: res.status });
  return daten;
}

async function holeDatei(url, optionen = {}) {
  const res = await fetch(url, { credentials: 'same-origin', ...optionen, headers: { 'X-Portal': '1', ...(optionen.headers || {}) } });
  if (!res.ok) throw Object.assign(new Error((await res.json().catch(() => ({}))).error || `Fehler ${res.status}`), { status: res.status });
  return res.blob();
}

export default {
  art: 'server',
  api,
  status: () => api('GET', '/api/status'),
  anmelden: (email, passwort) => api('POST', '/api/anmelden', { email, passwort }),
  einrichten: (daten) => api('POST', '/api/einrichtung', daten),
  abmelden: () => api('POST', '/api/abmelden', {}),

  // PDF vom Server (echtes PDF); ohne Playwright erzeugt der Browser es selbst
  async dokumentPdf(doc, settings) {
    try {
      return await holeDatei(`/api/pdf/dokument/${doc.id}`);
    } catch (e) {
      if (e.status !== 501) throw e;
      return pdfImBrowser(doc, settings);
    }
  },
  async sammelPdf(ids) {
    return holeDatei('/api/pdf/sammel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
  },
  async einsatzzettelPdf(tag, html) {
    try {
      return await holeDatei(`/api/pdf/einsatzzettel?datum=${tag}`);
    } catch (e) {
      if (e.status !== 501) throw e;
      return pdfImBrowser(null, null, html);
    }
  },
  async mailDokument(doc, settings, daten) {
    const body = { ...daten };
    if (daten.mitPdf && !(await this.status()).pdfAufServer) body.pdfBase64 = await blobZuBase64(await pdfImBrowser(doc, settings));
    return api('POST', `/api/dokumente/${doc.id}/mail`, body);
  },
  mailTermin: (id) => api('POST', `/api/termine/${id}/mail`, {}),
  mailEinsatzzettel: (tag) => api('POST', '/api/einsatzzettel/mail', { datum: tag }),
  mailTest: () => api('POST', '/api/mail/test', {}),
  geoSuche: (q) => api('GET', `/api/geo/suche?q=${encodeURIComponent(q)}`),
  geoStrecke: (von, nach) => api('GET', `/api/geo/strecke?von=${encodeURIComponent(von)}&nach=${encodeURIComponent(nach)}`),
  sicherungUrl: '/api/sicherung',
  sicherungHolen: () => holeDatei('/api/sicherung'),
  berichtHolen: (art) => holeDatei(`/api/berichte/${art}`),
  sicherungMail: () => api('POST', '/api/sicherung/mail', {}),
  wiederherstellen: (daten) => api('POST', '/api/sicherung/wiederherstellen', daten),
  benutzer: {
    liste: () => api('GET', '/api/benutzer'),
    anlegen: (d) => api('POST', '/api/benutzer', d),
    aendern: (id, d) => api('PUT', `/api/benutzer/${id}`, d),
    passwort: (alt, neu) => api('PUT', '/api/ich/passwort', { alt, neu })
  },
  push: {
    schluessel: () => api('GET', '/api/push/schluessel'),
    abonnieren: (abo) => api('POST', '/api/push/abo', abo),
    abbestellen: (endpoint) => api('DELETE', '/api/push/abo', { endpoint })
  },
  kannDownload: true,
  download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
};
