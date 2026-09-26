// Datenzustand im Browser und Zugriffe auf das Backend
import backend from 'backend';
import { toast } from './ui.js';

export const S = {
  settings: null,
  benutzer: null,
  status: {},
  kunden: [],
  dokumente: [],
  buchungen: [],
  mitarbeiter: [],
  termine: [],
  aufgaben: [],
  auftraege: [],
  notizen: [],
  fotoAnzahl: { auftrag: {}, termin: {}, aufgabe: {} }
};
const SAMMLUNGEN = ['kunden', 'dokumente', 'buchungen', 'mitarbeiter', 'termine', 'aufgaben', 'auftraege', 'notizen'];

export const api = (methode, url, body) => backend.api(methode, url, body);
export const istChef = () => S.benutzer?.rolle === 'chef';

export async function ladeAlles() {
  const d = await api('GET', '/api/daten');
  S.settings = d.settings;
  for (const c of SAMMLUNGEN) S[c] = d[c] || [];
  S.fotoAnzahl = { auftrag: {}, termin: {}, aufgabe: {}, ...(d.fotoAnzahl || {}) };
}

function ersetzeLokal(col, obj) {
  S[col] ||= [];
  const i = S[col].findIndex((x) => x.id === obj.id);
  if (i >= 0) S[col][i] = obj;
  else S[col].push(obj);
}

// Speichert neu oder vorhanden
export async function speichere(col, item) {
  const saved = item.id ? await api('PUT', `/api/${col}/${item.id}`, item) : await api('POST', `/api/${col}`, item);
  ersetzeLokal(col, saved);
  return saved;
}

// Löschen mit „Rückgängig“ statt vorheriger Rückfrage
export async function loescheMitRueckgaengig(col, id, text, danach = () => {}) {
  await api('DELETE', `/api/${col}/${id}`);
  S[col] = (S[col] || []).filter((x) => x.id !== id);
  danach();
  toast(text || 'Gelöscht', 'ok', {
    aktion: 'Rückgängig',
    beiAktion: async () => {
      try {
        const obj = await api('POST', `/api/${col}/${id}/wiederherstellen`);
        ersetzeLokal(col, obj);
        await ladeAlles();
        danach();
        toast('Wiederhergestellt');
      } catch (e) {
        toast(e.message, 'fehler');
      }
    }
  });
}

// Aktion an einem Dokument (abschließen, bezahlt, storno …); danach alle Daten neu laden
export async function dokumentAktion(id, aktion, body) {
  const r = await api('POST', `/api/dokumente/${id}/${aktion}`, body || {});
  await ladeAlles();
  return r;
}

export async function speichereEinstellungen() {
  S.settings = await api('PUT', '/api/einstellungen', S.settings);
}
