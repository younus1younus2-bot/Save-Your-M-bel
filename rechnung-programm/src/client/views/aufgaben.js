// Aufgaben und automatische Erinnerungen
import { datum, esc, heute, plusTage } from '../../shared/rechnen.js';
import { erinnerungen } from '../../shared/erinnerungen.js';
import { S, ladeAlles, loescheMitRueckgaengig, speichere } from '../state.js';
import { main } from '../helfer.js';
import { fotoBereich } from '../fotos.js';
import { $, $$, modal, toast } from '../ui.js';

export function viewAufgaben() {
  main().innerHTML = `
    <div class="seiten-kopf"><h1>Aufgaben</h1></div>
    <div class="raster-dash">
      <div class="karte">
        <h3>Eigene Aufgaben</h3>
        <form id="a-form" class="aufgabe-form">
          <input id="a-titel" placeholder="Neue Aufgabe, z. B. Transporter zum TÜV" aria-label="Neue Aufgabe" required>
          <input id="a-faellig" type="date" value="${plusTage(heute(), 1)}" aria-label="Fällig am">
          <select id="a-kunde" aria-label="Kunde"><option value="">ohne Kunde</option>${S.kunden.map((k) => `<option value="${k.id}">${esc(k.name)}</option>`).join('')}</select>
          <button class="btn btn-primaer" type="submit">Hinzufügen</button>
        </form>
        <ul class="aufgaben-liste" id="a-liste"></ul>
      </div>
      <div class="karte">
        <h3>Automatische Erinnerungen</h3>
        <p class="hilfe">Erstellt das Portal selbst aus deinen Daten: überfällige Rechnungen, Kostenvoranschläge ohne Antwort, Einsätze ohne Team, Termine morgen.</p>
        <ul class="todo-liste" id="a-auto"></ul>
      </div>
    </div>`;

  const zeichne = () => {
    if (!$('#a-liste')) return;
    const h = heute();
    const liste = S.aufgaben.slice().sort((a, b) => Number(a.erledigt) - Number(b.erledigt) || (a.faellig || '9999').localeCompare(b.faellig || '9999'));
    $('#a-liste').innerHTML = liste.length
      ? liste
          .map((a) => {
            const k = S.kunden.find((x) => x.id === a.kundeId);
            return `<li class="${a.erledigt ? 'erledigt' : ''} ${!a.erledigt && a.faellig && a.faellig < h ? 'ueberfaellig' : ''}">
              <label class="checkbox"><input type="checkbox" data-erledigt="${a.id}" ${a.erledigt ? 'checked' : ''}> <span>${esc(a.titel)}</span></label>
              <small>${a.faellig ? (a.faellig === h ? 'heute' : datum(a.faellig)) : ''}${k ? ` · <a href="#/kunde/${k.id}">${esc(k.name)}</a>` : ''}${a.notiz ? ' · 📝' : ''}</small>
              <button class="btn-icon" data-fotos="${a.id}" type="button" aria-label="Details und Dateien zur Aufgabe" title="Details, Fotos & Dateien">📎${S.fotoAnzahl.aufgabe[a.id] ? `<small>${S.fotoAnzahl.aufgabe[a.id]}</small>` : ''}</button>
              <button class="btn-icon" data-weg="${a.id}" type="button" aria-label="Aufgabe löschen">✕</button></li>`;
          })
          .join('')
      : '<li class="leer">Keine Aufgaben.</li>';
    $$('[data-erledigt]').forEach(
      (cb) =>
        (cb.onchange = async () => {
          const a = S.aufgaben.find((x) => x.id === cb.dataset.erledigt);
          try {
            await speichere('aufgaben', { ...a, erledigt: cb.checked });
            zeichne();
          } catch (e) {
            toast(e.message, 'fehler');
          }
        })
    );
    $$('[data-weg]').forEach((b) => (b.onclick = () => loescheMitRueckgaengig('aufgaben', b.dataset.weg, 'Aufgabe gelöscht', zeichne)));
    $$('[data-fotos]').forEach(
      (b) =>
        (b.onclick = () =>
          aufgabeDialog(
            S.aufgaben.find((x) => x.id === b.dataset.fotos),
            zeichne
          ))
    );
    const auto = erinnerungen(S, S.settings).filter((e) => e.art !== 'aufgabe');
    $('#a-auto').innerHTML = auto.length ? auto.map((e) => `<li class="todo-${e.art}"><a href="${e.link}">${esc(e.text)}</a></li>`).join('') : '<li class="leer">Nichts zu tun 🎉</li>';
  };
  $('#a-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await speichere('aufgaben', { titel: $('#a-titel').value, faellig: $('#a-faellig').value, kundeId: $('#a-kunde').value });
      $('#a-titel').value = '';
      zeichne();
    } catch (err) {
      toast(err.message, 'fehler');
    }
  };
  zeichne();
}

// Aufgabe bearbeiten: Details schreiben, Fotos und Dateien anhängen
function aufgabeDialog(a, fertig) {
  if (!a) return;
  const { el, close } = modal(
    'Aufgabe',
    `<form class="formular" id="af-form">
      <div class="raster-2">
        <label class="span-2">Aufgabe<input id="af-titel" required value="${esc(a.titel)}"></label>
        <label>Fällig am<input id="af-faellig" type="date" value="${esc(a.faellig || '')}"></label>
        <label>Kunde<select id="af-kunde"><option value="">ohne Kunde</option>${S.kunden.map((k) => `<option value="${k.id}" ${k.id === a.kundeId ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label>
        <label class="span-2">Details<textarea id="af-notiz" rows="4" placeholder="z. B. Termin bei der Werkstatt am Montag, Kosten ca. 120 €">${esc(a.notiz || '')}</textarea></label>
      </div>
      <h4>Fotos & Dateien</h4><div id="af-fotos"></div>
      <div class="btn-gruppe rechts"><button class="btn btn-primaer" type="submit">Speichern</button></div>
    </form>`
  );
  fotoBereich($('#af-fotos', el), {
    abfrage: { aufgabeId: a.id },
    leerText: 'Noch nichts angehängt – z. B. Foto vom Schaden, Quittung oder PDF.',
    beiAenderung: async () => (await ladeAlles(), fertig())
  });
  $('#af-form', el).onsubmit = async (e) => {
    e.preventDefault();
    try {
      await speichere('aufgaben', { ...a, titel: $('#af-titel', el).value, faellig: $('#af-faellig', el).value, kundeId: $('#af-kunde', el).value, notiz: $('#af-notiz', el).value });
      toast('Gespeichert');
      close();
      fertig();
    } catch (err) {
      toast(err.message, 'fehler');
    }
  };
}
