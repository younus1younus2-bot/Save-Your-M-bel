// Erledigt: abgeschlossene Aufträge – bezahlt oder abgesagt
import { berechne, datum, esc, euro, heute } from '../../shared/rechnen.js';
import { S, api } from '../state.js';
import { main } from '../helfer.js';
import { $, $$, dauerMerker, toast } from '../ui.js';
import { auftragDialog } from './auftraege.js';

const rechnungenVon = (a) => S.dokumente.filter((d) => d.auftragId === a.id && d.typ === 'rechnung' && !d.storno && d.status !== 'storniert');
const betragVon = (a) => rechnungenVon(a).reduce((x, d) => x + berechne(d).brutto, 0);
const bezahltAm = (a) =>
  rechnungenVon(a)
    .map((d) => d.bezahltAm || '')
    .sort()
    .pop() || (a.geaendert || '').slice(0, 10);
const nameVon = (a) => a.kundeName || a.titel.split(' – ')[0];
const leistungVon = (a) => a.leistung || (a.titel.includes(' – ') ? a.titel.split(' – ').pop() : a.titel === a.kundeName ? '–' : a.titel);

export function viewErledigt() {
  const f = { reiter: 'bezahlt', suche: '', jahr: heute().slice(0, 4), ...dauerMerker.get('filter:erledigt', {}) };
  const jahreVon = (liste, fn) => [...new Set(liste.map((a) => fn(a).slice(0, 4)).filter(Boolean))].sort().reverse();

  main().innerHTML = `
    <div class="seiten-kopf"><h1>Erledigt</h1></div>
    <p class="hilfe seiten-hilfe">Hier stehen alle abgeschlossenen Aufträge: Kunden, die bezahlt haben – und Anfragen, die abgesagt wurden. Neue Anfragen findest du unter „Anfragen“, laufende unter „Aufträge“.</p>
    <div class="anfragen-zahlen" id="er-zahlen"></div>
    <nav class="tabs" id="er-reiter" aria-label="Erledigt filtern"></nav>
    <div class="filter-leiste">
      <input type="search" id="er-suche" placeholder="Suchen (Kunde, Leistung, Rechnungsnummer)…" value="${esc(f.suche)}" aria-label="Suchen">
      <select id="er-jahr" aria-label="Jahr"></select>
    </div>
    <div class="karte"><table class="tabelle" id="er-tabelle"></table></div>`;

  const zeichne = () => {
    if (!$('#er-tabelle')) return;
    dauerMerker.set('filter:erledigt', f);
    const bezahlt = S.auftraege.filter((a) => a.status === 'bezahlt');
    const abgesagt = S.auftraege.filter((a) => a.status === 'abgesagt');
    const datumFn = f.reiter === 'bezahlt' ? bezahltAm : (a) => (a.eingang || a.erstellt || '').slice(0, 10);
    const basis = f.reiter === 'bezahlt' ? bezahlt : abgesagt;
    const jahre = jahreVon(basis, datumFn);
    if (f.jahr && !jahre.includes(f.jahr)) jahre.unshift(f.jahr);
    $('#er-jahr').innerHTML = `<option value="">Alle Jahre</option>${jahre.map((j) => `<option ${j === f.jahr ? 'selected' : ''}>${j}</option>`).join('')}`;

    const imJahr = (a) => !f.jahr || datumFn(a).startsWith(f.jahr);
    const bezahltJahr = bezahlt.filter((a) => !f.jahr || bezahltAm(a).startsWith(f.jahr));
    $('#er-zahlen').innerHTML = [
      [`Bezahlte Aufträge ${f.jahr || 'gesamt'}`, bezahltJahr.length, 'gruen'],
      [`Umsatz bezahlt ${f.jahr || 'gesamt'}`, euro(bezahltJahr.reduce((x, a) => x + betragVon(a), 0)), ''],
      ['Kunden', new Set(bezahltJahr.map((a) => a.kundeId || nameVon(a))).size, ''],
      ['Abgesagt', abgesagt.filter((a) => !f.jahr || (a.eingang || a.erstellt || '').startsWith(f.jahr)).length, '']
    ]
      .map(([t, w, c]) => `<div class="anfragen-zahl ${c}"><b>${w}</b><span>${esc(t)}</span></div>`)
      .join('');

    $('#er-reiter').innerHTML = [
      ['bezahlt', 'Bezahlt', bezahlt.length],
      ['abgesagt', 'Abgesagt', abgesagt.length]
    ]
      .map(([k, t, n]) => `<a href="#/erledigt" data-reiter="${k}" class="${k === f.reiter ? 'aktiv' : ''}">${t} <small>${n}</small></a>`)
      .join('');
    $$('[data-reiter]').forEach(
      (el) =>
        (el.onclick = (e) => {
          e.preventDefault();
          f.reiter = el.dataset.reiter;
          zeichne();
        })
    );

    const q = f.suche.toLowerCase();
    const liste = basis
      .filter(imJahr)
      .filter((a) => !q || [a.titel, a.kundeName, leistungVon(a), ...rechnungenVon(a).map((d) => d.nummer)].join(' ').toLowerCase().includes(q))
      .sort((x, y) => datumFn(y).localeCompare(datumFn(x)));

    if (f.reiter === 'bezahlt') {
      const summe = liste.reduce((x, a) => x + betragVon(a), 0);
      $('#er-tabelle').innerHTML = liste.length
        ? `<thead><tr><th>Kunde</th><th>Leistung</th><th>Rechnung</th><th>Bezahlt am</th><th class="rechts">Betrag</th></tr></thead>
          <tbody>${liste
            .map(
              (a) => `<tr class="klickbar" tabindex="0" data-a="${a.id}">
              <td>${a.kundeId ? `<a href="#/kunde/${a.kundeId}" data-kunde>${esc(nameVon(a))}</a>` : esc(nameVon(a))}</td>
              <td>${esc(leistungVon(a))}</td>
              <td>${
                rechnungenVon(a)
                  .map((d) => `<a href="#/dokument/${d.id}" data-kunde>${esc(d.nummer || 'Entwurf')}</a>`)
                  .join(', ') || '–'
              }</td>
              <td>${bezahltAm(a) ? datum(bezahltAm(a)) : '–'}</td>
              <td class="rechts"><b>${euro(betragVon(a))}</b></td>
            </tr>`
            )
            .join('')}</tbody>
          <tfoot><tr><td colspan="4"><b>${liste.length} Aufträge</b></td><td class="rechts"><b>${euro(summe)}</b></td></tr></tfoot>`
        : '<tbody><tr><td class="leer">Noch keine bezahlten Aufträge in diesem Zeitraum.</td></tr></tbody>';
    } else {
      $('#er-tabelle').innerHTML = liste.length
        ? `<thead><tr><th>Name</th><th>Leistung</th><th>Eingang</th><th></th></tr></thead>
          <tbody>${liste
            .map(
              (a) => `<tr class="klickbar" tabindex="0" data-a="${a.id}">
              <td>${esc(nameVon(a))}</td>
              <td>${esc(leistungVon(a))}</td>
              <td>${datumFn(a) ? datum(datumFn(a)) : '–'}</td>
              <td class="rechts"><button class="btn btn-klein" type="button" data-oeffnen="${a.id}">Wieder öffnen</button></td>
            </tr>`
            )
            .join('')}</tbody>`
        : '<tbody><tr><td class="leer">Keine abgesagten Anfragen in diesem Zeitraum.</td></tr></tbody>';
    }

    $$('#er-tabelle [data-a]').forEach((tr) => {
      tr.onclick = async (e) => {
        if (e.target.closest('[data-kunde]')) return;
        const a = S.auftraege.find((x) => x.id === tr.dataset.a);
        if (e.target.closest('[data-oeffnen]')) {
          try {
            Object.assign(a, await api('POST', `/api/auftraege/${a.id}/status`, { status: 'anfrage' }));
            toast(`„${nameVon(a)}“ steht wieder unter „Anfragen“`);
            zeichne();
          } catch (err) {
            toast(err.message, 'fehler');
          }
          return;
        }
        auftragDialog(a, zeichne);
      };
    });
  };

  $('#er-suche').oninput = (e) => {
    f.suche = e.target.value;
    zeichne();
  };
  $('#er-jahr').onchange = (e) => {
    f.jahr = e.target.value;
    zeichne();
  };
  zeichne();
}
