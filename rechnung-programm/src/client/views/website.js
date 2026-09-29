// Website: Besucher-Statistik (ohne Cookies), Herkunft der Besucher, Tracking-Links und Verbindung zur Website
import { datum, esc, prozent } from '../../shared/rechnen.js';
import { S, api, speichereEinstellungen } from '../state.js';
import { farbe, main } from '../helfer.js';
import { $, bestaetigen, dauerMerker, tipp, toast } from '../ui.js';
import { neuesChart } from './finanzen.js';

const SYMBOL = {
  'Google Maps': '📍',
  'Google Suche': '🔎',
  'Google Ads': '📣',
  Bing: '🔎',
  'Andere Suchmaschine': '🔎',
  Facebook: '👥',
  Instagram: '📸',
  WhatsApp: '💬',
  TikTok: '🎵',
  YouTube: '▶️',
  Kleinanzeigen: '🏷️',
  Direkt: '⌨️'
};
const symbol = (q) => SYMBOL[q] || (q.startsWith('Link:') ? '🔗' : q.startsWith('Website:') ? '🌐' : '•');

// Vorschläge für eigene Links: so sieht man, was wirklich Kunden bringt
const LINK_VORLAGEN = [
  ['google-maps', 'Google Unternehmensprofil (Maps)'],
  ['google-ads', 'Google Ads'],
  ['instagram', 'Instagram-Profil'],
  ['facebook', 'Facebook-Seite'],
  ['whatsapp', 'WhatsApp-Status / Signatur'],
  ['flyer', 'Flyer'],
  ['visitenkarte', 'Visitenkarte'],
  ['lkw', 'LKW-Beschriftung (QR-Code)'],
  ['kleinanzeigen', 'Kleinanzeigen']
];
const slug = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

export async function viewWebsite() {
  const tage = Number(dauerMerker.get('website:tage', 30)) || 30;
  main().innerHTML = `<div class="seiten-kopf"><h1>Website</h1></div><p class="hilfe">Lädt…</p>`;
  let st;
  try {
    st = await api('GET', `/api/website/statistik?tage=${tage}`);
  } catch (e) {
    main().innerHTML = `<div class="seiten-kopf"><h1>Website</h1></div><div class="karte"><p>${esc(e.message)}</p></div>`;
    return;
  }
  const s = st.summen;
  const quote = s.besucher ? (s.anfragen / s.besucher) * 100 : 0;
  const maxQuelle = Math.max(1, ...st.quellen.map((q) => q.besucher));
  const url = (S.settings.website?.url || '').replace(/\/+$/, '');
  const leer = !s.besucher && !s.anfragen;

  main().innerHTML = `
    <div class="seiten-kopf">
      <div><h1>Website</h1><p class="hilfe">Besucher, Herkunft und Anfragen – ohne Cookies, ohne IP-Speicherung</p></div>
      <select id="w-tage" aria-label="Zeitraum">${[
        [7, 'Letzte 7 Tage'],
        [30, 'Letzte 30 Tage'],
        [90, 'Letzte 90 Tage'],
        [365, 'Letztes Jahr']
      ]
        .map(([n, t]) => `<option value="${n}" ${n === tage ? 'selected' : ''}>${t}</option>`)
        .join('')}</select>
    </div>
    ${leer ? '<div class="hinweis-box">Noch keine Besuche gezählt. Richte unten unter <b>„Verbindung zur Website“</b> die Website ein – danach erscheinen hier Besucher und Anfragen.</div>' : tipp('website', 'Trage bei Google Maps, Instagram usw. die Links aus „Eigene Links“ ein – dann siehst du genau, welche Werbung Anfragen bringt.')}
    <div class="kpi-reihe">
      <div class="kpi"><span>Besucher</span><b>${s.besucher.toLocaleString('de-DE')}</b><small>heute ${s.heuteBesucher}</small></div>
      <div class="kpi"><span>Seitenaufrufe</span><b>${s.aufrufe.toLocaleString('de-DE')}</b><small>${s.besucher ? (s.aufrufe / s.besucher).toFixed(1).replace('.', ',') : '0'} Seiten je Besucher</small></div>
      <div class="kpi kpi-hervor"><span>Anfragen über die Website</span><b>${s.anfragen}</b><small>heute ${s.heuteAnfragen} · <a href="#/auftraege">zu den Aufträgen</a></small></div>
      <div class="kpi"><span>Anfrage-Quote</span><b>${prozent(quote)}</b><small>Besucher, die angefragt haben</small></div>
    </div>

    <div class="raster-dash">
      <div class="karte span-2"><h3>Besucher und Anfragen pro Tag</h3><div class="chart-box"><canvas id="c-besuche" aria-label="Diagramm Besucher und Anfragen pro Tag"></canvas></div></div>

      <div class="karte span-2">
        <h3>Woher kommen die Besucher?</h3>
        ${
          st.quellen.length
            ? `<table class="tabelle quellen-tabelle"><thead><tr><th>Quelle</th><th>Besucher</th><th class="nur-breit"></th><th>Anfragen</th><th>Quote</th></tr></thead><tbody>${st.quellen
                .map(
                  (q) => `<tr><td>${symbol(q.quelle)} ${esc(q.quelle)}</td><td>${q.besucher}</td>
                  <td class="nur-breit"><div class="balken"><i style="width:${Math.round((q.besucher / maxQuelle) * 100)}%"></i></div></td>
                  <td>${q.anfragen ? `<b>${q.anfragen}</b>` : '–'}</td><td>${q.besucher ? prozent((q.anfragen / q.besucher) * 100) : '–'}</td></tr>`
                )
                .join('')}</tbody></table>`
            : '<p class="leer">Noch keine Daten.</p>'
        }
      </div>

      <div class="karte">
        <h3>Beliebteste Seiten</h3>
        ${st.seiten.length ? `<table class="tabelle"><thead><tr><th>Seite</th><th>Aufrufe</th><th>Besucher</th></tr></thead><tbody>${st.seiten.map((x) => `<tr><td>${esc(x.seite === '/' ? 'Startseite' : x.seite)}</td><td>${x.aufrufe}</td><td>${x.besucher}</td></tr>`).join('')}</tbody></table>` : '<p class="leer">Noch keine Daten.</p>'}
      </div>
      <div class="karte">
        <h3>Geräte</h3>
        ${st.geraete.length ? `<div class="anteile">${st.geraete.map((g) => `<div><span>${g.geraet === 'Handy' ? '📱' : g.geraet === 'Tablet' ? '📲' : '💻'} ${esc(g.geraet)}</span><b>${prozent((g.besucher / Math.max(1, s.besucher)) * 100)}</b><small>${g.besucher}</small></div>`).join('')}</div>` : '<p class="leer">Noch keine Daten.</p>'}
      </div>

      <div class="karte span-2">
        <h3>Eigene Links</h3>
        <p class="hilfe">Jeder Link zeigt auf deine Website, wird aber hier getrennt gezählt. Für Google Maps: im Google-Unternehmensprofil unter „Website“ den Maps-Link eintragen.</p>
        ${url ? '' : '<p class="hinweis-box">Bitte zuerst unten die Adresse deiner Website eintragen.</p>'}
        <div class="link-bauer">
          <select id="w-vorlage" aria-label="Wofür ist der Link?"><option value="">Eigener Name …</option>${LINK_VORLAGEN.map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('')}</select>
          <input id="w-name" placeholder="z. B. flyer-sommer" aria-label="Name des Links">
          <input id="w-link" readonly aria-label="Fertiger Link">
          <button class="btn btn-primaer" id="w-kopieren" type="button">Kopieren</button>
        </div>
      </div>

      <div class="karte span-2" id="verbindung">
        <h3>Verbindung zur Website</h3>
        <div class="raster-2">
          <label>Adresse deiner Website<input id="w-url" placeholder="https://www.saveyourmobel.de" value="${esc(url)}"></label>
          <label class="checkbox" style="align-self:end"><input type="checkbox" id="w-mail" ${S.settings.website?.anfrageMail !== false ? 'checked' : ''}> Bei neuer Website-Anfrage zusätzlich E-Mail an mich</label>
        </div>
        <div class="btn-gruppe"><button class="btn" id="w-speichern" type="button">Speichern</button></div>
        <h4>Diese Werte gehören in die Website (Datei <code>includes/portal.php</code>)</h4>
        <div class="summen-box">
          <div><span>Portal-Adresse</span><b><code id="w-portal">${esc(location.origin)}</code></b></div>
          <div><span>Website-Schlüssel</span><b><code id="w-schluessel">••••••••••••</code></b></div>
        </div>
        <div class="btn-gruppe">
          <button class="btn btn-klein" id="w-zeigen" type="button">Schlüssel anzeigen</button>
          <button class="btn btn-klein" id="w-schl-kopieren" type="button">Schlüssel kopieren</button>
          <button class="btn btn-klein rot" id="w-neu" type="button">Neuen Schlüssel erzeugen</button>
        </div>
        <p class="hilfe">Der Schlüssel sorgt dafür, dass nur deine Website Anfragen ins Portal schicken kann. Nicht weitergeben. Nach „Neuen Schlüssel erzeugen“ muss er auch in der Website geändert werden.</p>
      </div>
    </div>`;

  $('#w-tage').onchange = (e) => {
    dauerMerker.set('website:tage', e.target.value);
    viewWebsite();
  };

  // Diagramm
  if (window.Chart) {
    neuesChart($('#c-besuche'), {
      data: {
        labels: st.tage.map((t) => datum(t.tag).slice(0, 6)),
        datasets: [
          {
            type: 'line',
            label: 'Besucher',
            data: st.tage.map((t) => t.besucher),
            borderColor: farbe('--text'),
            backgroundColor: farbe('--text'),
            tension: 0.3,
            pointRadius: tage > 31 ? 0 : 3,
            yAxisID: 'y'
          },
          { type: 'bar', label: 'Anfragen', data: st.tage.map((t) => t.anfragen), backgroundColor: farbe('--akzent'), borderRadius: 4, maxBarThickness: 14, yAxisID: 'y1' }
        ]
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, y1: { beginAtZero: true, position: 'right', grid: { display: false }, ticks: { precision: 0 } } }
      }
    });
  }

  // Link-Generator
  const linkZeigen = () => {
    const name = slug($('#w-name').value);
    $('#w-link').value = url && name ? `${url}/?quelle=${name}` : '';
  };
  $('#w-vorlage').onchange = (e) => {
    $('#w-name').value = e.target.value;
    linkZeigen();
  };
  $('#w-name').oninput = linkZeigen;
  $('#w-kopieren').onclick = async () => {
    if (!$('#w-link').value) return toast(url ? 'Bitte einen Namen eingeben' : 'Bitte zuerst die Adresse der Website eintragen', 'fehler');
    await navigator.clipboard?.writeText($('#w-link').value).catch(() => {});
    $('#w-link').select();
    toast('Link kopiert');
  };

  // Einstellungen
  $('#w-speichern').onclick = async () => {
    let neu = $('#w-url').value.trim();
    if (neu && !/^https?:\/\//.test(neu)) neu = `https://${neu}`;
    S.settings.website = { ...(S.settings.website || {}), url: neu.replace(/\/+$/, ''), anfrageMail: $('#w-mail').checked };
    try {
      await speichereEinstellungen();
      toast('Gespeichert');
      viewWebsite();
    } catch (e) {
      toast(e.message, 'fehler');
    }
  };
  let schluessel = '';
  const holeSchluessel = async (neu = false) => (schluessel = (await api(neu ? 'POST' : 'GET', '/api/website/schluessel', neu ? {} : undefined)).schluessel);
  $('#w-zeigen').onclick = async () => {
    try {
      $('#w-schluessel').textContent = schluessel || (await holeSchluessel());
    } catch (e) {
      toast(e.message, 'fehler');
    }
  };
  $('#w-schl-kopieren').onclick = async () => {
    try {
      await navigator.clipboard.writeText(schluessel || (await holeSchluessel()));
      toast('Schlüssel kopiert');
    } catch (e) {
      toast(e.message, 'fehler');
    }
  };
  $('#w-neu').onclick = async () => {
    if (!(await bestaetigen('Neuen Schlüssel erzeugen? Die Website kann dann erst wieder Anfragen senden, wenn der neue Schlüssel dort eingetragen ist.', { ok: 'Neu erzeugen', gefahr: true })))
      return;
    try {
      $('#w-schluessel').textContent = await holeSchluessel(true);
      toast('Neuer Schlüssel erzeugt – bitte auch in der Website eintragen');
    } catch (e) {
      toast(e.message, 'fehler');
    }
  };
}
