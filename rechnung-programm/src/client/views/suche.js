// Schnellsuche und Befehle (Strg + K)
import { berechne, datum, esc, euro, normName } from '../../shared/rechnen.js';
import { S, istChef } from '../state.js';
import { docTitel } from '../helfer.js';
import { $, $$, modal } from '../ui.js';

const BEFEHLE = [
  ['Neue Rechnung', '#/neu/rechnung', 'rechnung neu erstellen'],
  ['Neuer Kostenvoranschlag', '#/neu/angebot', 'kv angebot neu'],
  ['Übersicht', '#/dashboard', 'dashboard start'],
  ['Aufträge (Board)', '#/auftraege', 'board auftrag'],
  ['Kalender', '#/kalender', 'termine'],
  ['Buchhaltung', '#/buchhaltung', 'ausgaben einnahmen'],
  ['Kunden', '#/kunden', 'kunde'],
  ['Aufgaben', '#/aufgaben', 'todo erinnerung'],
  ['Einstellungen', '#/einstellungen', 'settings'],
  ['Papierkorb', '#/einstellungen/papierkorb', 'gelöscht wiederherstellen']
];

export function oeffneSuche() {
  if ($('.suche-modal')) return;
  const { el, close } = modal(
    'Suchen',
    `<input id="s-eingabe" class="suche-feld" placeholder="Kunde, Rechnungsnummer, Telefon, Straße oder Befehl…" aria-label="Suchen" autocomplete="off"><ul class="suche-treffer" id="s-treffer" role="listbox"></ul><p class="hilfe">↑ ↓ auswählen · Enter öffnen · Esc schließen</p>`
  );
  el.classList.add('suche-modal');
  let treffer = [];
  let aktiv = 0;

  const suche = (q) => {
    const n = normName(q);
    const tel = q.replace(/\D/g, '');
    const passt = (...felder) =>
      felder.some((f) => normName(f).includes(n)) ||
      (tel.length > 3 &&
        felder.some((f) =>
          String(f || '')
            .replace(/\D/g, '')
            .includes(tel)
        ));
    if (!istChef())
      return S.termine
        .filter((t) => !n || passt(t.titel, t.kundeName, t.vonAdresse))
        .slice(0, 8)
        .map((t) => ({ titel: `${datum(t.datum)} ${t.titel || ''}`, info: t.kundeName || '', link: '#/kalender' }));
    const befehle = BEFEHLE.filter(([t, , w]) => !n || normName(t + w).includes(n)).map(([t, link]) => ({ titel: t, info: 'Befehl', link }));
    if (!n) return befehle.slice(0, 6);
    return [
      ...S.kunden
        .filter((k) => passt(k.name, k.firma, k.telefon, k.email, k.strasse, k.ort, k.kundennummer))
        .slice(0, 6)
        .map((k) => ({ titel: k.name, info: `Kunde · ${[k.ort, k.telefon].filter(Boolean).join(' · ')}`, link: `#/kunde/${k.id}` })),
      ...S.dokumente
        .filter((d) => passt(d.nummer, d.kunde?.name, d.kunde?.firma, d.betreff))
        .slice(0, 8)
        .map((d) => ({ titel: `${docTitel(d)} – ${d.kunde?.name || ''}`, info: `${datum(d.datum)} · ${euro(berechne(d).brutto)}`, link: `#/dokument/${d.id}` })),
      ...S.auftraege
        .filter((a) => passt(a.titel, a.kundeName))
        .slice(0, 4)
        .map((a) => ({ titel: a.titel, info: 'Auftrag', link: '#/auftraege' })),
      ...S.termine
        .filter((t) => passt(t.titel, t.kundeName, t.vonAdresse, t.nachAdresse))
        .slice(0, 4)
        .map((t) => ({ titel: `${datum(t.datum)} ${t.titel || ''}`, info: `Termin · ${t.kundeName || ''}`, link: '#/kalender' })),
      ...befehle.slice(0, 3)
    ];
  };
  const zeichne = () => {
    $('#s-treffer', el).innerHTML = treffer.length
      ? treffer.map((t, i) => `<li role="option" aria-selected="${i === aktiv}" class="${i === aktiv ? 'aktiv' : ''}" data-i="${i}"><b>${esc(t.titel)}</b><small>${esc(t.info)}</small></li>`).join('')
      : '<li class="leer">Nichts gefunden.</li>';
    $$('[data-i]', el).forEach((li) => (li.onclick = () => oeffne(Number(li.dataset.i))));
  };
  const oeffne = (i) => {
    const t = treffer[i];
    if (!t) return;
    close();
    location.hash = t.link;
  };
  const eingabe = $('#s-eingabe', el);
  eingabe.addEventListener('input', () => {
    treffer = suche(eingabe.value.trim());
    aktiv = 0;
    zeichne();
  });
  eingabe.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') (e.preventDefault(), (aktiv = Math.min(treffer.length - 1, aktiv + 1)), zeichne());
    else if (e.key === 'ArrowUp') (e.preventDefault(), (aktiv = Math.max(0, aktiv - 1)), zeichne());
    else if (e.key === 'Enter') (e.preventDefault(), oeffne(aktiv));
  });
  treffer = suche('');
  zeichne();
  setTimeout(() => eingabe.focus(), 0);
}
