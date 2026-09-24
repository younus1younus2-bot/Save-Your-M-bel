// Oberflächen-Bausteine: Auswahl, Meldungen, Dialoge, Merker, Hilfetipps
import { esc } from '../shared/rechnen.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Kleiner Speicher für Ansichts-Einstellungen; funktioniert auch, wenn der Browser Speicher blockiert
function sicherSpeicher(art) {
  const mem = {};
  return {
    get(k, standard = null) {
      try {
        const v = window[art].getItem(k);
        return v === null ? standard : JSON.parse(v);
      } catch {
        return k in mem ? mem[k] : standard;
      }
    },
    set(k, v) {
      try {
        window[art].setItem(k, JSON.stringify(v));
      } catch {
        mem[k] = v;
      }
    },
    del(k) {
      try {
        window[art].removeItem(k);
      } catch {
        delete mem[k];
      }
    }
  };
}
export const merker = sicherSpeicher('sessionStorage'); // nur für diese Sitzung
export const dauerMerker = sicherSpeicher('localStorage'); // bleibt im Browser gespeichert

// Meldung unten rechts, optional mit Aktion (z. B. „Rückgängig“)
export function toast(msg, typ = 'ok', { aktion, beiAktion, dauer } = {}) {
  const el = document.createElement('div');
  el.className = `toast toast-${typ}`;
  el.setAttribute('role', typ === 'fehler' ? 'alert' : 'status');
  el.innerHTML = `<span>${esc(msg)}</span>${aktion ? `<button type="button" class="toast-aktion">${esc(aktion)}</button>` : ''}`;
  const weg = () => el.remove();
  if (aktion) {
    el.querySelector('.toast-aktion').onclick = () => {
      weg();
      beiAktion?.();
    };
  }
  $('#toasts').appendChild(el);
  setTimeout(weg, dauer || (aktion ? 7000 : typ === 'fehler' ? 7000 : 3500));
}

// Dialogfenster: Esc schließt, Fokus bleibt im Dialog, danach zurück zum auslösenden Element
let dialogZaehler = 0;
export function modal(titel, inhaltHtml, { breit = false, beimSchliessen } = {}) {
  const vorher = document.activeElement;
  const id = `dlg-${++dialogZaehler}`;
  const wrap = document.createElement('div');
  wrap.className = 'modal-bg';
  wrap.innerHTML = `<div class="modal ${breit ? 'modal-breit' : ''}" role="dialog" aria-modal="true" aria-labelledby="${id}">
    <div class="modal-kopf"><h3 id="${id}">${esc(titel)}</h3><button class="btn-icon" data-close type="button" aria-label="Schließen">✕</button></div>
    <div class="modal-inhalt">${inhaltHtml}</div></div>`;
  const close = () => {
    if (!wrap.isConnected) return;
    wrap.remove();
    document.removeEventListener('keydown', tasten, true);
    if (vorher && vorher.focus) vorher.focus();
    beimSchliessen?.();
  };
  const fokussierbar = () => $$('button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])', wrap).filter((e) => !e.disabled && e.offsetParent !== null);
  function tasten(e) {
    if (!wrap.isConnected) return;
    const oben = $$('.modal-bg').pop();
    if (oben !== wrap) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === 'Tab') {
      const f = fokussierbar();
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) (e.preventDefault(), f[f.length - 1].focus());
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) (e.preventDefault(), f[0].focus());
    }
  }
  document.addEventListener('keydown', tasten, true);
  wrap.addEventListener('mousedown', (e) => e.target === wrap && close());
  $('[data-close]', wrap).onclick = close;
  document.body.appendChild(wrap);
  const erstes = fokussierbar().find((e) => !e.matches('[data-close]'));
  setTimeout(() => (erstes || $('[data-close]', wrap)).focus(), 0);
  return { el: $('.modal', wrap), close };
}

export function bestaetigen(text, { ok = 'Ja, weiter', abbrechen = 'Abbrechen', gefahr = false } = {}) {
  return new Promise((resolve) => {
    let antwort = false;
    const { el, close } = modal('Bitte bestätigen', `<p class="frage">${esc(text)}</p>
      <div class="btn-gruppe rechts"><button class="btn" data-nein type="button">${esc(abbrechen)}</button><button class="btn ${gefahr ? 'btn-gefahr' : 'btn-primaer'}" data-ja type="button">${esc(ok)}</button></div>`,
      { beimSchliessen: () => resolve(antwort) });
    $('[data-nein]', el).onclick = close;
    $('[data-ja]', el).onclick = () => {
      antwort = true;
      close();
    };
    setTimeout(() => $('[data-ja]', el).focus(), 0);
  });
}

// Einfache Eingabe (Text oder Datum) als Dialog
export function abfrage(titel, label, { typ = 'text', wert = '', ok = 'Speichern', mehrzeilig = false } = {}) {
  return new Promise((resolve) => {
    let ergebnis = null;
    const feld = mehrzeilig ? `<textarea id="abf-wert" rows="3">${esc(wert)}</textarea>` : `<input id="abf-wert" type="${typ}" value="${esc(wert)}">`;
    const { el, close } = modal(titel, `<form id="abf-form"><label>${esc(label)}${feld}</label>
      <div class="btn-gruppe rechts"><button class="btn" type="button" data-nein>Abbrechen</button><button class="btn btn-primaer" type="submit">${esc(ok)}</button></div></form>`,
      { beimSchliessen: () => resolve(ergebnis) });
    $('[data-nein]', el).onclick = close;
    $('#abf-form', el).onsubmit = (e) => {
      e.preventDefault();
      ergebnis = $('#abf-wert', el).value;
      close();
    };
  });
}

export function autoHoehe(el) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

// A4-Vorschau an die verfügbare Breite anpassen
export function skaliereVorschau(el) {
  const rahmen = el.parentElement;
  const passen = () => {
    const breite = rahmen.clientWidth - 32;
    const faktor = Math.min(1, breite / (el.offsetWidth || 1));
    el.style.transform = `scale(${faktor})`;
    el.style.height = `${el.scrollHeight}px`;
    rahmen.style.height = `${el.scrollHeight * faktor + 32}px`;
  };
  passen();
  if (!el._beobachter) {
    el._beobachter = new ResizeObserver(passen);
    el._beobachter.observe(rahmen);
  }
}

// Hilfetipp beim ersten Benutzen; einmal weggeklickt, erscheint er nicht wieder
export function tipp(schluessel, text) {
  if (dauerMerker.get(`tipp:${schluessel}`)) return '';
  return `<div class="tipp" data-tipp="${esc(schluessel)}"><span class="tipp-icon" aria-hidden="true">💡</span><span>${text}</span><button class="btn-icon" data-tipp-weg type="button" aria-label="Tipp ausblenden">✕</button></div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tipp-weg]');
  if (!b) return;
  const box = b.closest('[data-tipp]');
  dauerMerker.set(`tipp:${box.dataset.tipp}`, true);
  box.remove();
});

// Klickbare Tabellenzeilen auch per Tastatur (Enter/Leertaste) bedienbar
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('tr.klickbar, .karte-klick')) {
    e.preventDefault();
    e.target.click();
  }
});

// Zuletzt geöffnete Einträge (für die Übersicht)
export function merkeZuletzt(eintrag) {
  const liste = dauerMerker.get('zuletzt', []).filter((x) => !(x.typ === eintrag.typ && x.id === eintrag.id));
  liste.unshift({ ...eintrag, zeit: Date.now() });
  dauerMerker.set('zuletzt', liste.slice(0, 8));
}

export function blobZuBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Bild verkleinern (Fotos vom Handy) und als data-URL liefern
export function bildVerkleinern(datei, maxKante = 1600, qualitaet = 0.82) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const f = Math.min(1, maxKante / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * f);
        c.height = Math.round(img.height * f);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', qualitaet));
      };
      img.onerror = reject;
      img.src = r.result;
    };
    r.onerror = reject;
    r.readAsDataURL(datei);
  });
}

// Aus einem hochgeladenen Logo eine helle Variante für dunkle Flächen erzeugen
export function logoVarianten(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const faktor = Math.min(1, 900 / Math.max(img.width, img.height));
      const w = Math.round(img.width * faktor);
      const h = Math.round(img.height * faktor);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const q = ctx.getImageData(0, 0, w, h).data;
      const normal = ctx.createImageData(w, h);
      const hell = ctx.createImageData(w, h);
      for (let i = 0; i < q.length; i += 4) {
        const [r, g, b, a] = [q[i], q[i + 1], q[i + 2], q[i + 3]];
        if (Math.max(r, g, b) - Math.min(r, g, b) > 60) {
          normal.data.set([r, g, b, a], i);
          hell.data.set([r, g, b, a], i);
        } else {
          const alpha = Math.round(Math.min(255, Math.max(0, (255 - (r * 0.299 + g * 0.587 + b * 0.114)) * 1.2)) * (a / 255));
          if (alpha < 12) continue;
          normal.data.set([r, g, b, alpha], i);
          hell.data.set([255, 255, 255, alpha], i);
        }
      }
      const zuUrl = (daten) => (ctx.clearRect(0, 0, w, h), ctx.putImageData(daten, 0, 0), canvas.toDataURL('image/png'));
      resolve({ normal: zuUrl(normal), hell: zuUrl(hell) });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Zeitangabe „vor 3 Sek.“
export function vorZeit(ms) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 5) return 'gerade eben';
  if (s < 60) return `vor ${s} Sek.`;
  if (s < 3600) return `vor ${Math.round(s / 60)} Min.`;
  return `vor ${Math.round(s / 3600)} Std.`;
}
