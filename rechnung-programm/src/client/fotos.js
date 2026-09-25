// Fotos an Kunden, Aufträgen und Terminen: hochladen (vom Handy), Vorschau, Großansicht mit Blättern
import { datum, esc } from '../shared/rechnen.js';
import { S, api, ladeAlles, loescheMitRueckgaengig } from './state.js';
import { $, $$, bildVerkleinern, modal, toast } from './ui.js';

const darfLoeschen = (f) => S.benutzer?.rolle === 'chef' || (f.erstelltVonId && f.erstelltVonId === S.benutzer?.id);
const abfrageText = (q) => new URLSearchParams(Object.entries(q).filter(([, v]) => v)).toString();

/**
 * Zeigt den Foto-Bereich in `container`.
 * abfrage: welche Fotos gezeigt werden ({ kundeId } | { auftragId } | { terminId })
 * hochladen: woran neue Fotos gehängt werden (gleiches Format) oder null = nur ansehen
 */
export function fotoBereich(container, { abfrage, hochladen = abfrage, leerText = 'Noch keine Fotos.', beiAenderung } = {}) {
  let fotos = [];
  container.innerHTML = `
    ${
      hochladen
        ? `<div class="foto-kopf">
            <input class="foto-beschreibung" placeholder="Beschreibung (optional), z. B. Klavier, 3. OG ohne Aufzug" aria-label="Beschreibung für neue Fotos" maxlength="300">
            <label class="btn btn-klein foto-knopf">📷 Fotos hinzufügen<input type="file" accept="image/*" multiple hidden></label>
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
    $('.foto-raster', container).innerHTML = fotos.length
      ? fotos
          .map(
            (f, i) => `<figure>
              <button type="button" class="foto-vorschau" data-i="${i}" aria-label="Foto ${i + 1} groß anzeigen${f.beschreibung ? `: ${esc(f.beschreibung)}` : ''}"><img src="${esc(f.vorschau || f.daten || '')}" alt="" loading="lazy"></button>
              <figcaption>${f.beschreibung ? `<b>${esc(f.beschreibung)}</b>` : ''}<small>${datum(f.erstellt)}${f.erstelltVon ? ` · ${esc(f.erstelltVon)}` : ''}</small></figcaption>
            </figure>`
          )
          .join('')
      : `<p class="hilfe">${esc(leerText)}</p>`;
    $$('[data-i]', container).forEach((b) => (b.onclick = () => grossansicht(fotos, Number(b.dataset.i), neuLaden)));
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
      const status = $('.foto-status', container);
      const beschreibung = $('.foto-beschreibung', container).value.trim();
      let ok = 0;
      for (const [i, datei] of dateien.entries()) {
        status.textContent = `Lädt Foto ${i + 1} von ${dateien.length}…`;
        try {
          const [daten, vorschau] = await Promise.all([bildVerkleinern(datei, 1600, 0.82), bildVerkleinern(datei, 420, 0.7)]);
          await api('POST', '/api/dateien', { ...hochladen, name: datei.name, beschreibung, typ: 'image/jpeg', daten, vorschau });
          ok += 1;
        } catch (e) {
          toast(`${datei.name}: ${e.message}`, 'fehler');
        }
      }
      status.textContent = '';
      $('.foto-beschreibung', container).value = '';
      if (ok) toast(ok === 1 ? 'Foto hinzugefügt' : `${ok} Fotos hinzugefügt`);
      neuLaden();
    };

  laden();
  return { neuLaden };
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
