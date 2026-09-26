// Einstieg: Anmeldung, Navigation, Tastenkürzel
import backend from 'backend';
import { esc } from '../shared/rechnen.js';
import { S, istChef, ladeAlles } from './state.js';
import { $, $$, dauerMerker, modal, toast } from './ui.js';
import { registriereServiceWorker } from './pwa.js';
import { zeigeLogin } from './views/login.js';
import { viewDashboard, viewBuchhaltung, buchungDialog, zerstoereCharts } from './views/finanzen.js';
import { viewDokument, viewDokumentListe } from './views/dokumente.js';
import { viewKalender, viewMitarbeiter, terminDialog } from './views/kalender.js';
import { viewKunden, viewKunde, kundeDialog } from './views/kunden.js';
import { viewAuftraege, auftragDialog } from './views/auftraege.js';
import { viewWebsite } from './views/website.js';
import { viewAufgaben } from './views/aufgaben.js';
import { viewEinstellungen } from './views/einstellungen.js';
import { oeffneSuche } from './views/suche.js';

const ROUTEN = [
  [/^#\/dashboard$/, () => viewDashboard(), 'dashboard', 'chef'],
  [/^#\/auftraege$/, () => viewAuftraege(), 'auftraege', 'chef'],
  [/^#\/rechnungen$/, () => viewDokumentListe('rechnung'), 'rechnungen', 'chef'],
  [/^#\/angebote$/, () => viewDokumentListe('angebot'), 'angebote', 'chef'],
  [/^#\/neu\/(rechnung|angebot)$/, (m) => viewDokument(null, m[1]), (m) => (m[1] === 'rechnung' ? 'rechnungen' : 'angebote'), 'chef'],
  [/^#\/dokument\/([\w-]+)$/, (m) => viewDokument(m[1]), (m) => (S.dokumente.find((d) => d.id === m[1])?.typ === 'angebot' ? 'angebote' : 'rechnungen'), 'chef'],
  [/^#\/kunden$/, () => viewKunden(), 'kunden', 'chef'],
  [/^#\/kunde\/([\w-]+)$/, (m) => viewKunde(m[1]), 'kunden', 'chef'],
  [/^#\/buchhaltung$/, () => viewBuchhaltung(), 'buchhaltung', 'chef'],
  [/^#\/website$/, () => viewWebsite(), 'website', 'chef'],
  [/^#\/kalender$/, () => viewKalender(), 'kalender', 'alle'],
  [/^#\/mitarbeiter$/, () => viewMitarbeiter(), 'mitarbeiter', 'chef'],
  [/^#\/aufgaben$/, () => viewAufgaben(), 'aufgaben', 'chef'],
  [/^#\/einstellungen(?:\/(\w+))?$/, (m) => viewEinstellungen(m[1]), 'einstellungen', 'alle']
];

let routetGerade = false;
let nochmal = false;
// behalteDialoge: nur die Seite neu zeichnen, offene Fenster (z. B. nach dem Hochladen eines Fotos) bleiben offen
async function route({ behalteDialoge = false } = {}) {
  if (routetGerade) {
    nochmal = true;
    return;
  }
  routetGerade = true;
  try {
    // offene Änderungen im Editor zuerst speichern
    if (window.verlassen) {
      const v = window.verlassen;
      window.verlassen = null;
      await v();
    }
    window.editorSpeichern = null;
    window.onbeforeunload = null;
    zerstoereCharts();
    if (!behalteDialoge) $$('.modal-bg').forEach((m) => m.remove());
    const start = istChef() ? '#/dashboard' : '#/kalender';
    const hash = location.hash || start;
    for (const [re, fn, nav, rolle] of ROUTEN) {
      const m = hash.match(re);
      if (!m) continue;
      if (rolle === 'chef' && !istChef()) break;
      const aktiv = typeof nav === 'function' ? nav(m) : nav;
      $$('[data-nav]').forEach((a) => {
        a.classList.toggle('aktiv', a.dataset.nav === aktiv);
        if (a.dataset.nav === aktiv) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
      document.body.classList.remove('menu-offen');
      window.scrollTo(0, 0);
      fn(m);
      $('#main').focus({ preventScroll: true });
      return;
    }
    location.hash = start;
  } finally {
    routetGerade = false;
    if (nochmal) {
      nochmal = false;
      route();
    }
  }
}

// Hell / Dunkel / Automatisch (pro Browser gemerkt)
const THEMEN = { system: 'Automatisch', light: 'Hell', dark: 'Dunkel' };
function setzeThema(thema) {
  if (thema === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', thema);
  $('#thema-knopf span').textContent = `Design: ${THEMEN[thema]}`;
  dauerMerker.set('thema', thema);
}

function tastenkuerzel() {
  document.addEventListener('keydown', (e) => {
    const inFeld = e.target.closest?.('input, textarea, select, [contenteditable]');
    const strg = e.ctrlKey || e.metaKey;
    if (strg && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      oeffneSuche();
    } else if (strg && e.key.toLowerCase() === 's') {
      if (window.editorSpeichern) {
        e.preventDefault();
        window.editorSpeichern();
      }
    } else if (!inFeld && !strg && !e.altKey && !$('.modal-bg')) {
      if (e.key === 'n' && istChef()) {
        e.preventDefault();
        if (location.hash === '#/angebote') location.hash = '#/neu/angebot';
        else if (location.hash === '#/rechnungen') location.hash = '#/neu/rechnung';
        else $('.neu-menu').open = true;
      } else if (e.key === '/') {
        e.preventDefault();
        oeffneSuche();
      } else if (e.key === '?') {
        modal(
          'Tastenkürzel',
          `<table class="tabelle kuerzel">${[
            ['Strg + K oder /', 'Suchen und Befehle'],
            ['N', 'Neues Dokument (in Listen) bzw. Menü „Neu erstellen“'],
            ['Strg + S', 'Im Editor sofort speichern'],
            ['Esc', 'Dialog schließen'],
            ['?', 'Diese Übersicht']
          ]
            .map(([k, t]) => `<tr><td><kbd>${esc(k)}</kbd></td><td>${esc(t)}</td></tr>`)
            .join('')}</table>`
        );
      }
    }
  });
}

function demoLeiste() {
  const box = document.createElement('div');
  box.className = 'demo-box';
  box.innerHTML = `<b>Test-Version</b><span>Beispieldaten. Änderungen bleiben nur in diesem Browser gespeichert.</span>
    <button class="btn btn-klein" id="demo-reset" type="button">Beispieldaten neu laden</button>
    <button class="btn btn-klein" id="demo-leer" type="button">Mit leerem Portal starten</button>`;
  $('.seitenleiste').insertBefore(box, $('.seitenleiste-fuss'));
  const neu = async (leer) => {
    backend.zuruecksetzen(leer);
    await ladeAlles();
    location.hash = '#/dashboard';
    route();
    toast(leer ? 'Leeres Portal gestartet' : 'Beispieldaten neu geladen');
  };
  $('#demo-reset').onclick = () => neu(false);
  $('#demo-leer').onclick = () => neu(true);
}

async function start() {
  // unerwartete Fehler sichtbar machen statt still zu verschlucken
  window.addEventListener('error', (e) => e.message && !String(e.message).includes('ResizeObserver') && toast(`Unerwarteter Fehler: ${e.message}`, 'fehler'));
  window.addEventListener('unhandledrejection', (e) => toast(`Unerwarteter Fehler: ${e.reason?.message || e.reason}`, 'fehler'));
  window.addEventListener('abgemeldet', () => location.reload());

  try {
    const status = await backend.status();
    S.status = status;
    S.benutzer = status.benutzer || (await zeigeLogin({ einrichten: !status.eingerichtet }));
    await ladeAlles();
  } catch (e) {
    $('#main').innerHTML = `<div class="karte"><h2>Server nicht erreichbar</h2><p>${esc(e.message)}</p><p>Bitte mit <code>npm start</code> starten.</p></div>`;
    return;
  }

  document.body.classList.toggle('rolle-mitarbeiter', !istChef());
  const logo = S.settings.firma?.logoHell;
  if (logo) $('.marke').innerHTML = `<img src="${esc(logo)}" alt="${esc(S.settings.firma.name)}" class="marke-logo">`;
  $('#benutzer-name').textContent = S.benutzer?.name || '';

  // Menü „Neu erstellen“
  const neuMenu = $('.neu-menu');
  const neuZeichnen = () => route({ behalteDialoge: true });
  neuMenu.addEventListener('click', (e) => {
    const ziel = e.target.closest('a, [data-schnell]');
    if (!ziel) return;
    neuMenu.open = false;
    document.body.classList.remove('menu-offen');
    const art = ziel.dataset.schnell;
    if (art === 'termin') terminDialog({ datum: new Date().toISOString().slice(0, 10) }, neuZeichnen);
    if (art === 'einnahme' || art === 'ausgabe') buchungDialog({ typ: art }, neuZeichnen);
    if (art === 'kunde') kundeDialog({}, (k) => (location.hash = `#/kunde/${k.id}`));
    if (art === 'auftrag') auftragDialog({ status: 'anfrage' }, neuZeichnen);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.neu-menu')) neuMenu.open = false;
    if (!e.target.closest('details.mehr')) $$('details.mehr[open]').forEach((d) => d.removeAttribute('open'));
  });

  setzeThema(THEMEN[dauerMerker.get('thema')] ? dauerMerker.get('thema') : 'system');
  $('#thema-knopf').onclick = () => {
    const liste = Object.keys(THEMEN);
    setzeThema(liste[(liste.indexOf(document.documentElement.getAttribute('data-theme') || 'system') + 1) % liste.length]);
    route();
  };
  $('#abmelden').onclick = async () => {
    await backend.abmelden();
    location.hash = '';
    location.reload();
  };
  $$('[data-suche]').forEach((b) => (b.onclick = () => oeffneSuche()));
  $('#menu-btn').onclick = () => document.body.classList.toggle('menu-offen');
  if (backend.art === 'demo') demoLeiste();
  else $('#abmelden').hidden = false;

  tastenkuerzel();
  window.addEventListener('hashchange', route);
  route();
  registriereServiceWorker();
}

start();
