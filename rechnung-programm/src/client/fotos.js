// Fotos und Dateien (PDF) an Kunden, Aufträgen, Terminen, Aufgaben, Dokumenten, Buchungen und Mitarbeitern:
// hochladen (vom Handy), Vorschau, Großansicht mit Blättern, PDFs öffnen
import { datum, esc } from '../shared/rechnen.js';
import backend from 'backend';
import { S, api, ladeAlles, loescheMitRueckgaengig } from './state.js';
import { $, $$, bildVerkleinern, modal, toast } from './ui.js';

const darfLoeschen = (f) => S.benutzer?.rolle === 'chef' || (f.erstelltVonId && f.erstelltVonId === S.benutzer?.id);
const abfrageText = (q) => new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString();
const istPdf = (f) => f.typ === 'application/pdf';
const MAX_PDF = 5 * 1024 * 1024;
const alsDataUrl = (datei) =>
  new Promise((ok, fehler) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = () => fehler(new Error('Datei konnte nicht gelesen werden'));
    r.readAsDataURL(datei);
  });

// PDF öffnen: ganze Datei laden und herunterladen/anzeigen
async function oeffnePdf(f) {
  try {
    const voll = f.daten ? f : await api('GET', `/api/dateien/${f.id}`);
    // ohne fetch(data:…), das die Sicherheitsregeln (CSP) der Seite nicht erlauben
    const binaer = atob(voll.daten.slice(voll.daten.indexOf(',') + 1));
    const bytes = Uint8Array.from(binaer, (z) => z.charCodeAt(0));
    await backend.download(new Blob([bytes], { type: 'application/pdf' }), f.name || 'Dokument.pdf');
  } catch (e) {
    toast(e.message, 'fehler');
  }
}

/**
 * Zeigt den Foto-Bereich in `container`.
 * abfrage: welche Fotos gezeigt werden ({ kundeId } | { auftragId } | { terminId })
 * hochladen: woran neue Fotos gehängt werden (gleiches Format) oder null = nur ansehen
 */
export function fotoBereich(container, { abfrage, hochladen = abfrage, leerText = 'Noch keine Fotos oder Dateien.', beiAenderung } = {}) {
  let fotos = [];
  container.innerHTML = `
    ${
      hochladen
        ? `<div class="foto-kopf">
            <input class="foto-beschreibung" placeholder="Beschreibung (optional)" aria-label="Beschreibung für neue Fotos und Dateien" maxlength="300">
            <label class="btn btn-klein foto-knopf">📎 Foto / Datei hinzufügen<input type="file" accept="image/*,application/pdf,.pdf" multiple hidden></label>
          </div>`
        : ''
    }
    <div class="foto-status hilfe" aria-live="polite"></div>
    <div class="foto-raster"><p class="hilfe">Lädt…</p></div>`;

  async function laden() {
    try {
      fotos = await api('GET', `/api/dateien?${abfrageText(abfrage)}`);
    } catch (e) {
      $('.foto-raster', container).innerHTML = `<p class="hilfe">${esc(e.message)}</p>`;
      return;
    }
    zeichne();
  }

  function zeichne() {
    if (!container.isConnected) return;
    const bilder = fotos.filter((f) => !istPdf(f));
    $('.foto-raster', container).innerHTML = fotos.length
      ? fotos
          .map((f) => {
            const unter = `<figcaption>${f.beschreibung ? `<b>${esc(f.beschreibung)}</b>` : ''}<small>${datum(f.erstellt)}${f.erstelltVon ? ` · ${esc(f.erstelltVon)}` : ''}</small></figcaption>`;
            if (istPdf(f))
              return `<figure>
              <button type="button" class="foto-vorschau datei-kachel" data-pdf="${esc(f.id)}" aria-label="PDF öffnen: ${esc(f.name || f.beschreibung || 'Dokument')}"><span aria-hidden="true">📄</span><small>${esc(f.name || 'PDF')}</small></button>
              ${unter}${darfLoeschen(f) ? `<button type="button" class="link-knopf rot" data-weg="${esc(f.id)}">Löschen</button>` : ''}
            </figure>`;
            const i = bilder.indexOf(f);
            return `<figure>
              <button type="button" class="foto-vorschau" data-i="${i}" aria-label="Foto ${i + 1} groß anzeigen${f.beschreibung ? `: ${esc(f.beschreibung)}` : ''}"><img src="${esc(f.vorschau || f.daten || '')}" alt="" loading="lazy"></button>
              ${unter}
            </figure>`;
          })
          .join('')
      : `<p class="hilfe">${esc(leerText)}</p>`;
    $$('[data-i]', container).forEach((b) => (b.onclick = () => grossansicht(bilder, Number(b.dataset.i), neuLaden)));
    $$('[data-pdf]', container).forEach((b) => (b.onclick = () => oeffnePdf(fotos.find((f) => f.id === b.dataset.pdf))));
    $$('[data-weg]', container).forEach((b) => (b.onclick = () => loescheMitRueckgaengig('dateien', b.dataset.weg, 'Datei gelöscht', neuLaden).catch((e) => toast(e.message, 'fehler'))));
  }

  async function neuLaden() {
    await laden();
    await ladeAlles().catch(() => {});
    beiAenderung?.();
  }

  const eingabe = $('input[type="file"]', container);
  if (eingabe)
    eingabe.onchange = async () => {
      const dateien = [...eingabe.files];
      eingabe.value = '';
      if (!dateien.length) return;
      await ladeHoch(dateien, hochladen, $('.foto-beschreibung', container).value.trim(), $('.foto-status', container));
      $('.foto-beschreibung', container).value = '';
      neuLaden();
    };

  laden();
  return { neuLaden };
}

const istPdfDatei = (datei) => datei.type === 'application/pdf' || /\.pdf$/i.test(datei.name);

// Dateien hochladen (Bilder werden verkleinert, PDFs bleiben unverändert); gibt die Anzahl erfolgreicher zurück
async function ladeHoch(dateien, ziel, beschreibung, status) {
  let ok = 0;
  for (const [i, datei] of dateien.entries()) {
    if (status) status.textContent = `Lädt ${i + 1} von ${dateien.length}…`;
    try {
      if (istPdfDatei(datei)) {
        if (datei.size > MAX_PDF) throw new Error('Die Datei ist zu groß (höchstens 5 MB)');
        const daten = (await alsDataUrl(datei)).replace(/^data:[^;,]*/, 'data:application/pdf');
        await api('POST', '/api/dateien', { ...ziel, name: datei.name, beschreibung, typ: 'application/pdf', daten });
      } else {
        const [daten, vorschau] = await Promise.all([bildVerkleinern(datei, 1600, 0.82), bildVerkleinern(datei, 420, 0.7)]);
        await api('POST', '/api/dateien', { ...ziel, name: datei.name, beschreibung, typ: 'image/jpeg', daten, vorschau });
      }
      ok += 1;
    } catch (e) {
      toast(`${datei.name}: ${e.message}`, 'fehler');
    }
  }
  if (status) status.textContent = '';
  if (ok) toast(ok === 1 ? 'Datei hinzugefügt' : `${ok} Dateien hinzugefügt`);
  return ok;
}

/**
 * Für neue Einträge (noch ohne ID): Fotos/Dateien schon auswählen, hochgeladen wird nach dem Speichern.
 * Rückgabe: { hochladen(ziel) } – z. B. hochladen({ buchungId: gespeichert.id })
 */
export function dateiVormerken(container, { leerText = 'Noch nichts ausgewählt – wird beim Speichern hochgeladen.' } = {}) {
  let gewaehlt = [];
  container.innerHTML = `
    <div class="foto-kopf">
      <input class="foto-beschreibung" placeholder="Beschreibung (optional)" aria-label="Beschreibung für neue Fotos und Dateien" maxlength="300">
      <label class="btn btn-klein foto-knopf">📎 Foto / Datei auswählen<input type="file" accept="image/*,application/pdf,.pdf" multiple hidden></label>
    </div>
    <div class="foto-status hilfe" aria-live="polite"></div>
    <ul class="datei-vormerk"></ul>`;
  const zeichne = () => {
    $('.datei-vormerk', container).innerHTML = gewaehlt.length
      ? gewaehlt
          .map((d, i) => `<li><span>${istPdfDatei(d) ? '📄' : '🖼️'} ${esc(d.name)}</span><button type="button" class="btn-icon" data-raus="${i}" aria-label="${esc(d.name)} entfernen">✕</button></li>`)
          .join('')
      : `<li class="hilfe">${esc(leerText)}</li>`;
    $$('[data-raus]', container).forEach((b) => (b.onclick = () => (gewaehlt.splice(Number(b.dataset.raus), 1), zeichne())));
  };
  const eingabe = $('input[type="file"]', container);
  eingabe.onchange = () => {
    gewaehlt = [...gewaehlt, ...eingabe.files];
    eingabe.value = '';
    zeichne();
  };
  zeichne();
  return {
    get anzahl() {
      return gewaehlt.length;
    },
    async hochladen(ziel) {
      if (!gewaehlt.length) return 0;
      const n = await ladeHoch(gewaehlt, ziel, $('.foto-beschreibung', container).value.trim(), $('.foto-status', container));
      gewaehlt = [];
      await ladeAlles().catch(() => {});
      return n;
    }
  };
}

// Großansicht: großes Bild laden, mit Pfeilen oder Wischen blättern
export function grossansicht(fotos, start, nachAenderung) {
  let i = start;
  const { el, close } = modal(
    'Foto',
    `<div class="foto-gross-rahmen"><img class="foto-gross" alt=""><button type="button" class="foto-pfeil links" aria-label="Vorheriges Foto">‹</button><button type="button" class="foto-pfeil rechts" aria-label="Nächstes Foto">›</button></div>
    <div class="foto-info"><div><b class="foto-titel"></b><small class="foto-meta"></small></div><div class="btn-gruppe"><span class="foto-zaehler hilfe"></span><button type="button" class="btn btn-klein rot foto-weg">Löschen</button></div></div>`,
    { breit: true }
  );
  const img = $('.foto-gross', el);
  const zeige = async () => {
    const f = fotos[i];
    img.src = f.vorschau || f.daten || '';
    $('.foto-titel', el).textContent = f.beschreibung || f.name || 'Foto';
    $('.foto-meta', el).textContent = ` ${datum(f.erstellt)}${f.erstelltVon ? ` · ${f.erstelltVon}` : ''}`;
    $('.foto-zaehler', el).textContent = `${i + 1} / ${fotos.length}`;
    $('.foto-weg', el).hidden = !darfLoeschen(f);
    $$('.foto-pfeil', el).forEach((b) => (b.hidden = fotos.length < 2));
    try {
      const voll = f.daten ? f : await api('GET', `/api/dateien/${f.id}`);
      f.daten = voll.daten;
      if (fotos[i] === f) img.src = voll.daten;
    } catch {
      /* Vorschaubild bleibt sichtbar */
    }
  };
  const blaettern = (r) => {
    i = (i + r + fotos.length) % fotos.length;
    zeige();
  };
  $('.links', el).onclick = () => blaettern(-1);
  $('.rechts', el).onclick = () => blaettern(1);
  const tasten = (e) => {
    if (!el.isConnected) return document.removeEventListener('keydown', tasten);
    if (e.key === 'ArrowLeft') blaettern(-1);
    if (e.key === 'ArrowRight') blaettern(1);
  };
  document.addEventListener('keydown', tasten);
  let startX = null;
  img.addEventListener('touchstart', (e) => (startX = e.touches[0].clientX), { passive: true });
  img.addEventListener('touchend', (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) blaettern(dx < 0 ? 1 : -1);
    startX = null;
  });
  $('.foto-weg', el).onclick = async () => {
    const f = fotos[i];
    close();
    try {
      await loescheMitRueckgaengig('dateien', f.id, 'Foto gelöscht', () => nachAenderung?.());
    } catch (e) {
      toast(e.message, 'fehler');
    }
  };
  zeige();
}

// Kleines Kamera-Symbol mit Anzahl (für Karten im Board und Kalender)
export const fotoZahl = (n) => (n ? `<span class="foto-zahl" title="${n} Foto${n > 1 ? 's' : ''}">📷 ${n}</span>` : '');
