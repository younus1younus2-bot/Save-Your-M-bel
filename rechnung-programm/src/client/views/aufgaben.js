// Aufgaben und automatische Erinnerungen
import { datum, esc, heute, plusTage } from '../../shared/rechnen.js';
import { erinnerungen } from '../../shared/erinnerungen.js';
import { S, loescheMitRueckgaengig, speichere } from '../state.js';
import { main } from '../helfer.js';
import { $, $$, toast } from '../ui.js';

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
              <small>${a.faellig ? (a.faellig === h ? 'heute' : datum(a.faellig)) : ''}${k ? ` · <a href="#/kunde/${k.id}">${esc(k.name)}</a>` : ''}</small>
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
