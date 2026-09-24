// Gemeinsame Helfer für mehrere Ansichten
import backend from 'backend';
import { esc, heute, normName, normTel, plusTage } from '../shared/rechnen.js';
import { S } from './state.js';
import { $ } from './ui.js';

export const STATUS = {
  rechnung: { entwurf: 'Entwurf', offen: 'Offen', bezahlt: 'Bezahlt', storniert: 'Storniert', storno: 'Storno' },
  angebot: { entwurf: 'Entwurf', offen: 'Versendet', angenommen: 'Angenommen', abgelehnt: 'Abgelehnt' }
};
export const TYP_NAME = { rechnung: 'Rechnungen', angebot: 'Kostenvoranschläge' };
export const AUFTRAG_SPALTEN = [
  ['anfrage', 'Anfrage'],
  ['kv_versendet', 'KV verschickt'],
  ['zusage', 'Zusage'],
  ['termin', 'Termin geplant'],
  ['erledigt', 'Erledigt'],
  ['rechnung', 'Rechnung offen'],
  ['bezahlt', 'Bezahlt']
];
export const CHART_FARBEN = ['#E53935', '#64748B', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#A8A29E', '#F97316'];
export const farbe = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const istUeberfaellig = (d) => d.typ === 'rechnung' && d.status === 'offen' && !d.storno && d.faelligAm && d.faelligAm < heute();

export function statusBadge(d) {
  if (istUeberfaellig(d)) return '<span class="badge badge-rot">Überfällig</span>';
  if (d.typ === 'rechnung' && d.status === 'entwurf') return '<span class="badge">Entwurf</span>';
  return `<span class="badge badge-${esc(d.status)}">${esc(STATUS[d.typ]?.[d.status] || d.status)}</span>`;
}

export const docTitel = (d) => (d.storno ? 'Stornorechnung' : d.typ === 'rechnung' ? 'Rechnung' : 'Kostenvoranschlag') + (d.nummer ? ` ${d.nummer}` : ' (Entwurf)');

export function mitarbeiterNamen(t) {
  return (t.mitarbeiterIds || [])
    .map((id) => S.mitarbeiter.find((m) => m.id === id)?.name)
    .filter(Boolean)
    .join(', ');
}
export function terminFarbe(t) {
  return S.mitarbeiter.find((x) => x.id === (t.mitarbeiterIds || [])[0])?.farbe || '#E53935';
}

export const kundeVon = (k) => ({ name: k.name || '', firma: k.firma || '', strasse: k.strasse || '', plz: k.plz || '', ort: k.ort || '', email: k.email || '', telefon: k.telefon || '', kundennummer: k.kundennummer || '' });
export const adresseVon = (k) => [k.strasse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');

export function neuesDokument(typ, vorlage = {}) {
  const s = S.settings;
  const d = heute();
  const sprache = vorlage.sprache || 'de';
  return {
    typ,
    status: 'entwurf',
    datum: d,
    leistungsdatum: typ === 'rechnung' ? d : '', // Pflichtangabe auf Rechnungen (§ 14 UStG)
    faelligAm: plusTage(d, s.zahlungszielTage),
    gueltigBis: plusTage(d, s.angebotGueltigTage),
    kundeId: '',
    kunde: kundeVon({}),
    betreff: '',
    einleitung: typ === 'rechnung' ? s.texte.rechnungEinleitung : s.texte.angebotEinleitung,
    schlusstext: standardSchluss(typ, sprache),
    positionen: [{ beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0, ustSatz: s.steuer.satz }],
    rabattProzent: 0,
    anzahlungProzent: 0,
    zeigeAnteil: false,
    steuerModus: s.steuer.modus,
    sprache,
    kategorie: 'Umzug',
    feldWerte: {},
    extraFelder: [],
    ...vorlage
  };
}

export function standardSchluss(typ, sprache) {
  const t = S.settings.texte;
  if (sprache === 'en') return typ === 'rechnung' ? t.en.rechnungSchluss : t.en.angebotSchluss;
  return typ === 'rechnung' ? t.rechnungSchluss : t.angebotSchluss;
}

// Mögliche Doppelte zu einem Kunden finden (gleicher Name, gleiche Telefonnummer oder E-Mail)
export function aehnlicheKunden(k, eigeneId) {
  const n = normName(k.name);
  const tel = normTel(k.telefon);
  const mail = String(k.email || '').trim().toLowerCase();
  if (!n && !tel && !mail) return [];
  return S.kunden.filter(
    (x) => x.id !== eigeneId && ((n.length > 3 && normName(x.name) === n) || (tel.length > 5 && normTel(x.telefon) === tel) || (mail && String(x.email || '').toLowerCase() === mail))
  );
}

export function dublettenHinweis(k, eigeneId) {
  const treffer = aehnlicheKunden(k, eigeneId);
  if (!treffer.length) return '';
  return `<div class="hinweis-box dublette">Diesen Kunden gibt es vielleicht schon: ${treffer
    .slice(0, 3)
    .map((x) => `<button type="button" class="link-knopf" data-dublette="${x.id}">${esc(x.name)}${x.strasse ? ` (${esc(x.strasse)})` : ''}</button>`)
    .join(', ')}</div>`;
}

// Adressfeld mit Vorschlägen (OpenStreetMap) – liefert beim Auswählen die Adresse zurück
export function adressVorschlaege(input, beiAuswahl) {
  if (!input || backend.art === 'demo') return;
  const liste = document.createElement('div');
  liste.className = 'vorschlaege';
  liste.setAttribute('role', 'listbox');
  liste.hidden = true;
  input.parentElement.classList.add('mit-vorschlaegen');
  input.insertAdjacentElement('afterend', liste);
  input.setAttribute('autocomplete', 'off');
  let timer;
  let treffer = [];
  let aktiv = -1;
  const zeige = () => {
    liste.innerHTML = treffer.map((t, i) => `<div role="option" class="${i === aktiv ? 'aktiv' : ''}" data-i="${i}">${esc(t.text)}</div>`).join('');
    liste.hidden = !treffer.length;
  };
  const waehle = (i) => {
    const t = treffer[i];
    if (!t) return;
    liste.hidden = true;
    treffer = [];
    beiAuswahl(t);
  };
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 4) return ((treffer = []), zeige());
    timer = setTimeout(async () => {
      try {
        treffer = await backend.geoSuche(q);
        aktiv = -1;
        if (document.activeElement === input) zeige();
      } catch {
        treffer = [];
        zeige();
      }
    }, 350);
  });
  input.addEventListener('keydown', (e) => {
    if (liste.hidden) return;
    if (e.key === 'ArrowDown') (e.preventDefault(), (aktiv = Math.min(treffer.length - 1, aktiv + 1)), zeige());
    else if (e.key === 'ArrowUp') (e.preventDefault(), (aktiv = Math.max(0, aktiv - 1)), zeige());
    else if (e.key === 'Enter' && aktiv >= 0) (e.preventDefault(), waehle(aktiv));
    else if (e.key === 'Escape') (e.stopPropagation(), (liste.hidden = true));
  });
  liste.addEventListener('mousedown', (e) => {
    const o = e.target.closest('[data-i]');
    if (o) (e.preventDefault(), waehle(Number(o.dataset.i)));
  });
  input.addEventListener('blur', () => setTimeout(() => (liste.hidden = true), 150));
}

// Google-Maps-Link für Navigation
export const navigationsLink = (adresse) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`;

export function leereAnsicht(text, link, linkText) {
  return `<div class="leer">${esc(text)}${link ? ` <a href="${link}">${esc(linkText)}</a>` : ''}</div>`;
}

export const main = () => $('#main');
