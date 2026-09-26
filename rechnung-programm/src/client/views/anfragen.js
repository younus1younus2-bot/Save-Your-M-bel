// Anfragen: Posteingang für neue Kundenanfragen (Website, Telefon, alte Website-Datenbank)
import { datum, esc, heute, plusTage } from '../../shared/rechnen.js';
import { S, api, ladeAlles, speichere } from '../state.js';
import { main, navigationsLink } from '../helfer.js';
import { $, $$, dauerMerker, merker, modal, tipp, toast } from '../ui.js';
import { auftragDialog } from './auftraege.js';
import { terminDialog } from './kalender.js';
import { anfragenAusDatei } from '../../shared/anfragen-import.js';

const REITER = {
  offen: ['Neu & offen', (a) => a.status === 'anfrage'],
  kv: ['KV verschickt', (a) => a.status === 'kv_versendet'],
  gewonnen: ['Gewonnen', (a) => ['zusage', 'termin', 'erledigt', 'rechnung', 'bezahlt'].includes(a.status)],
  abgesagt: ['Abgesagt', (a) => a.status === 'abgesagt'],
  alle: ['Alle', () => true]
};

const eingang = (a) => a.eingang || a.erstellt || '';
const istNeu = (a) => a.status === 'anfrage' && a.quelle === 'website' && !a.gesehen;
export const neueAnfragen = () => S.auftraege.filter(istNeu).length;

// „heute 14:20“, „gestern 09:10“, sonst Datum
function wann(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tag = d.toLocaleDateString('sv-SE');
  const zeit = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (tag === heute()) return `heute ${zeit}`;
  if (tag === plusTage(heute(), -1)) return `gestern ${zeit}`;
  return datum(tag);
}

const kundeVon = (a) => S.kunden.find((k) => k.id === a.kundeId) || {};
const telefonVon = (a) => a.telefon || kundeVon(a).telefon || '';
const mailVon = (a) => a.email || kundeVon(a).email || '';
// 0171 … → 49171 … für WhatsApp
function waNummer(tel) {
  let n = String(tel || '').replace(/[^\d+]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  else if (n.startsWith('00')) n = n.slice(2);
  else if (n.startsWith('0')) n = `49${n.slice(1)}`;
  return n.length >= 8 ? n : '';
}
const leistungVon = (a) => a.leistung || (a.titel.includes(' – ') ? a.titel.split(' – ').pop() : '');
const nameVon = (a) => a.kundeName || a.titel.split(' – ')[0];

// Aktualisiert die kleine Zahl neben „Anfragen“ in der Navigation
export function anfragenZahl() {
  const n = neueAnfragen();
  $$('[data-anfragen-zahl]').forEach((el) => {
    el.textContent = n > 99 ? '99+' : String(n);
    el.hidden = !n;
  });
}

async function alsGesehen(a) {
  if (a.gesehen || a.quelle !== 'website') return a;
  try {
    Object.assign(a, await speichere('auftraege', { ...a, gesehen: true }));
  } catch {
    /* nicht schlimm */
  }
  anfragenZahl();
  return a;
}

async function setzeStatus(a, status, fertig) {
  const alt = a.status;
  try {
    Object.assign(a, await api('POST', `/api/auftraege/${a.id}/status`, { status }), { gesehen: true });
    fertig();
    toast(status === 'abgesagt' ? `„${nameVon(a)}“ abgesagt` : `„${nameVon(a)}“ wieder offen`, 'ok', {
      aktion: 'Rückgängig',
      beiAktion: async () => (Object.assign(a, await api('POST', `/api/auftraege/${a.id}/status`, { status: alt })), fertig())
    });
  } catch (e) {
    toast(e.message, 'fehler');
  }
}

function kvErstellen(a) {
  merker.set('vorAuftrag', a.id);
  if (a.kundeId) merker.set('vorKunde', a.kundeId);
  location.hash = '#/neu/angebot';
}

function besichtigung(a, fertig) {
  const k = kundeVon(a);
  terminDialog(
    {
      datum: heute(),
      titel: `Besichtigung ${nameVon(a)}`,
      auftragId: a.id,
      kundeId: a.kundeId,
      kundeName: a.kundeName,
      telefon: telefonVon(a),
      vonAdresse: a.vonAdresse || [k.strasse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    },
    async () => (await ladeAlles(), fertig())
  );
}

function kontaktKnoepfe(a, klein = true) {
  const tel = telefonVon(a);
  const wa = waNummer(tel);
  const mail = mailVon(a);
  const k = klein ? 'btn btn-klein' : 'btn';
  const gruss = `Hallo ${nameVon(a)}, hier ist ${S.settings.firma?.name || 'Save Your Möbel'}. Danke für Ihre Anfrage${leistungVon(a) ? ` (${leistungVon(a)})` : ''}!`;
  return [
    tel && `<a class="${k}" href="tel:${esc(tel.replace(/[^\d+]/g, ''))}" data-kontakt>📞 Anrufen</a>`,
    wa && `<a class="${k} btn-wa" href="https://wa.me/${wa}?text=${encodeURIComponent(gruss)}" target="_blank" rel="noopener" data-kontakt>💬 WhatsApp</a>`,
    mail && `<a class="${k}" href="mailto:${esc(mail)}?subject=${encodeURIComponent(`Ihre Anfrage${leistungVon(a) ? `: ${leistungVon(a)}` : ''}`)}" data-kontakt>✉️ E-Mail</a>`
  ]
    .filter(Boolean)
    .join('');
}

export function viewAnfragen() {
  const f = { reiter: 'offen', suche: '', leistung: '', ...dauerMerker.get('filter:anfragen', {}) };
  if (!REITER[f.reiter]) f.reiter = 'offen';

  main().innerHTML = `
    <div class="seiten-kopf">
      <h1>Anfragen</h1>
      <div class="btn-gruppe">
        <button class="btn" id="an-import" type="button">Alte Anfragen importieren</button>
        <button class="btn btn-primaer" id="an-neu" type="button">+ Anfrage eintragen</button>
      </div>
    </div>
    ${tipp('anfragen', 'Hier landen alle Anfragen von deiner Website automatisch. Ruf direkt an oder schreib per WhatsApp, plane eine Besichtigung oder schick mit einem Klick einen Kostenvoranschlag. Telefonische Anfragen trägst du mit „+ Anfrage eintragen“ ein.')}
    <div class="anfragen-zahlen" id="an-zahlen"></div>
    <nav class="tabs" id="an-reiter" aria-label="Anfragen filtern"></nav>
    <div class="filter-leiste">
      <input type="search" id="an-suche" placeholder="Suchen (Name, Telefon, Ort, Nummer)…" value="${esc(f.suche)}" aria-label="Suchen">
      <select id="an-leistung" aria-label="Leistung"></select>
    </div>
    <div class="anfragen-liste" id="an-liste"></div>`;

  const zeichne = () => {
    if (!$('#an-liste')) return;
    dauerMerker.set('filter:anfragen', f);
    anfragenZahl();
    const alle = S.auftraege;
    const grenze = plusTage(heute(), -90);
    const letzte = alle.filter((a) => eingang(a).slice(0, 10) >= grenze);
    const gewonnen = letzte.filter(REITER.gewonnen[1]).length;
    const entschieden = letzte.filter((a) => a.status !== 'anfrage').length;
    const woche = alle.filter((a) => a.quelle === 'website' && eingang(a).slice(0, 10) >= plusTage(heute(), -6)).length;
    $('#an-zahlen').innerHTML = [
      ['Neu (ungelesen)', neueAnfragen(), 'rot'],
      ['Offen', alle.filter(REITER.offen[1]).length, ''],
      ['Website, letzte 7 Tage', woche, ''],
      ['Gewonnen (90 Tage)', entschieden ? `${Math.round((gewonnen / entschieden) * 100)} %` : '–', 'gruen']
    ]
      .map(([t, w, c]) => `<div class="anfragen-zahl ${c}"><b>${w}</b><span>${t}</span></div>`)
      .join('');

    $('#an-reiter').innerHTML = Object.entries(REITER)
      .map(([k, [t, fn]]) => `<a href="#/anfragen" data-reiter="${k}" class="${k === f.reiter ? 'aktiv' : ''}">${t} <small>${alle.filter(fn).length}</small></a>`)
      .join('');
    $$('[data-reiter]').forEach(
      (el) =>
        (el.onclick = (e) => {
          e.preventDefault();
          f.reiter = el.dataset.reiter;
          zeichne();
        })
    );

    const leistungen = [...new Set(alle.map(leistungVon).filter(Boolean))].sort();
    $('#an-leistung').innerHTML = `<option value="">Alle Leistungen</option>${leistungen.map((l) => `<option ${l === f.leistung ? 'selected' : ''}>${esc(l)}</option>`).join('')}`;

    const q = f.suche.toLowerCase();
    const liste = alle
      .filter(REITER[f.reiter][1])
      .filter((a) => !f.leistung || leistungVon(a) === f.leistung)
      .filter((a) => !q || [a.titel, a.kundeName, telefonVon(a), mailVon(a), a.vonAdresse, a.nachAdresse, a.anfrageNr, a.notiz].join(' ').toLowerCase().includes(q))
      .sort((x, y) => Number(istNeu(y)) - Number(istNeu(x)) || eingang(y).localeCompare(eingang(x)));

    $('#an-liste').innerHTML =
      liste
        .map((a, i) => {
          const leistung = leistungVon(a);
          const route = [a.vonAdresse, a.nachAdresse].filter(Boolean).map(esc).join(' <span class="pfeil">→</span> ');
          return `<article class="anfrage-karte ${istNeu(a) ? 'neu' : ''} status-${esc(a.status)}" data-a="${a.id}" style="animation-delay:${Math.min(i, 12) * 35}ms" tabindex="0">
            <div class="anfrage-kopf">
              <div>
                <b class="anfrage-name">${istNeu(a) ? '<span class="neu-punkt" title="Neu"></span>' : ''}${esc(nameVon(a))}</b>
                <div class="anfrage-meta">
                  ${leistung ? `<span class="badge badge-leistung">${esc(leistung)}</span>` : ''}
                  ${a.status === 'abgesagt' ? '<span class="badge badge-abgelehnt">Abgesagt</span>' : ''}
                  ${a.quelle === 'website' ? `<span title="Über die Website${a.webQuelle ? ` – gefunden über ${esc(a.webQuelle)}` : ''}">🌐 ${esc(a.webQuelle || 'Website')}</span>` : '<span>☎️ eingetragen</span>'}
                </div>
              </div>
              <small class="anfrage-zeit">${esc(wann(eingang(a)))}</small>
            </div>
            <div class="anfrage-infos">
              ${a.datum ? `<span>📅 Wunschtermin <b>${datum(a.datum)}</b></span>` : ''}
              ${route ? `<span>📍 ${route}</span>` : ''}
              ${telefonVon(a) ? `<span>📞 ${esc(telefonVon(a))}</span>` : ''}
            </div>
            <div class="anfrage-aktionen">
              ${kontaktKnoepfe(a)}
              <span class="abstand"></span>
              ${
                a.status === 'abgesagt'
                  ? '<button class="btn btn-klein" type="button" data-aktion="oeffnen">Wieder öffnen</button>'
                  : `<button class="btn btn-klein" type="button" data-aktion="besichtigung">Besichtigung</button>
                     <button class="btn btn-klein btn-primaer" type="button" data-aktion="kv">Kostenvoranschlag</button>
                     ${a.status === 'anfrage' ? '<button class="btn btn-klein btn-leise" type="button" data-aktion="absagen" title="Anfrage absagen">Absagen</button>' : ''}`
              }
            </div>
          </article>`;
        })
        .join('') ||
      `<div class="karte leer-karte"><div class="leer-symbol">📭</div><p>${f.reiter === 'offen' ? 'Keine offenen Anfragen. Neue Anfragen von der Website erscheinen hier automatisch.' : 'Hier ist nichts.'}</p></div>`;

    $$('.anfrage-karte').forEach((el) => {
      const a = S.auftraege.find((x) => x.id === el.dataset.a);
      el.onclick = async (e) => {
        if (e.target.closest('[data-kontakt]')) return alsGesehen(a).then(zeichne);
        const aktion = e.target.closest('[data-aktion]')?.dataset.aktion;
        if (aktion === 'kv') return (await alsGesehen(a), kvErstellen(a));
        if (aktion === 'besichtigung') return (await alsGesehen(a), besichtigung(a, zeichne));
        if (aktion === 'absagen') return setzeStatus(a, 'abgesagt', zeichne);
        if (aktion === 'oeffnen') return setzeStatus(a, 'anfrage', zeichne);
        if (e.target.closest('a, button')) return;
        detail(a, zeichne);
      };
      el.onkeydown = (e) => e.key === 'Enter' && e.target === el && detail(a, zeichne);
    });
  };

  $('#an-suche').oninput = (e) => {
    f.suche = e.target.value;
    zeichne();
  };
  $('#an-leistung').onchange = (e) => {
    f.leistung = e.target.value;
    zeichne();
  };
  $('#an-neu').onclick = () => auftragDialog({ status: 'anfrage' }, zeichne);
  $('#an-import').onclick = () => importDialog(zeichne);
  zeichne();
}

// Alle Angaben einer Anfrage
async function detail(a, fertig) {
  await alsGesehen(a);
  fertig();
  const k = kundeVon(a);
  const { el, close } = modal(
    nameVon(a),
    `
    <div class="anfrage-detail">
      <div class="anfrage-meta">${leistungVon(a) ? `<span class="badge badge-leistung">${esc(leistungVon(a))}</span>` : ''}${a.anfrageNr ? `<span>Nr. ${esc(a.anfrageNr)}</span>` : ''}<span>Eingang ${esc(wann(eingang(a)))}</span></div>
      <div class="btn-gruppe">${kontaktKnoepfe(a, false)}</div>
      <dl class="anfrage-daten">
        ${telefonVon(a) ? `<dt>Telefon</dt><dd>${esc(telefonVon(a))}</dd>` : ''}
        ${mailVon(a) ? `<dt>E-Mail</dt><dd>${esc(mailVon(a))}</dd>` : ''}
        ${a.wunschKontakt ? `<dt>Kontakt per</dt><dd>${esc(a.wunschKontakt)}</dd>` : ''}
        ${a.datum ? `<dt>Wunschtermin</dt><dd>${datum(a.datum)}</dd>` : ''}
        ${a.vonAdresse ? `<dt>Von</dt><dd><a href="${navigationsLink(a.vonAdresse)}" target="_blank" rel="noopener">${esc(a.vonAdresse)} ↗</a></dd>` : ''}
        ${a.nachAdresse ? `<dt>Nach</dt><dd><a href="${navigationsLink(a.nachAdresse)}" target="_blank" rel="noopener">${esc(a.nachAdresse)} ↗</a></dd>` : ''}
        ${a.webQuelle ? `<dt>Gefunden über</dt><dd>${esc(a.webQuelle)}</dd>` : ''}
      </dl>
      ${a.notiz ? `<h4>Alle Angaben</h4><pre class="anfrage-notiz">${esc(a.notiz)}</pre>` : ''}
      <div class="btn-gruppe rechts">
        ${k.id ? `<a class="btn" href="#/kunde/${k.id}" data-zu>Kunde öffnen</a>` : ''}
        <button class="btn" type="button" data-d="bearbeiten">Bearbeiten</button>
        ${a.status !== 'abgesagt' ? '<button class="btn" type="button" data-d="besichtigung">Besichtigung planen</button><button class="btn btn-primaer" type="button" data-d="kv">Kostenvoranschlag erstellen</button>' : '<button class="btn" type="button" data-d="oeffnen">Wieder öffnen</button>'}
      </div>
    </div>`,
    { breit: true }
  );
  $$('[data-zu]', el).forEach((x) => (x.onclick = close));
  $$('[data-d]', el).forEach(
    (b) =>
      (b.onclick = () => {
        close();
        const d = b.dataset.d;
        if (d === 'kv') kvErstellen(a);
        if (d === 'besichtigung') besichtigung(a, fertig);
        if (d === 'bearbeiten') auftragDialog(a, fertig);
        if (d === 'oeffnen') setzeStatus(a, 'anfrage', fertig);
      })
  );
}

function importDialog(fertig) {
  const { el, close } = modal(
    'Alte Anfragen importieren',
    `<div class="formular">
      <p>So holst du die Anfragen aus deiner alten Website-Datenbank:</p>
      <ol class="hilfe-liste">
        <li>Plesk → <b>Datenbanken</b> → <b>phpMyAdmin</b></li>
        <li>Links die Tabelle <b>anfragen</b> anklicken → oben <b>Exportieren</b></li>
        <li>Format <b>CSV</b> oder <b>JSON</b> wählen → <b>Exportieren</b></li>
        <li>Die Datei hier auswählen</li>
      </ol>
      <label>Datei (CSV oder JSON)<input type="file" id="imp-datei" accept=".csv,.json,.txt,text/csv,application/json"></label>
      <p class="hilfe" id="imp-info">Bereits übernommene Anfragen werden erkannt und nicht doppelt angelegt.</p>
      <div class="btn-gruppe rechts"><button class="btn btn-primaer" type="button" id="imp-los" disabled>Importieren</button></div>
    </div>`
  );
  let zeilen = [];
  $('#imp-datei', el).onchange = async (e) => {
    const datei = e.target.files[0];
    if (!datei) return;
    try {
      zeilen = anfragenAusDatei(await datei.text()).filter((z) => z.kunde_name || z.kunde_telefon);
      $('#imp-info', el).textContent = zeilen.length ? `${zeilen.length} Anfragen gefunden.` : 'In der Datei wurden keine Anfragen gefunden.';
      $('#imp-los', el).disabled = !zeilen.length;
    } catch (err) {
      $('#imp-info', el).textContent = `Die Datei konnte nicht gelesen werden: ${err.message}`;
    }
  };
  $('#imp-los', el).onclick = async () => {
    $('#imp-los', el).disabled = true;
    try {
      const r = await api('POST', '/api/anfragen/import', { anfragen: zeilen });
      await ladeAlles();
      close();
      fertig();
      toast(`${r.neu} Anfragen übernommen${r.doppelt ? `, ${r.doppelt} waren schon da` : ''}${r.fehler.length ? `, ${r.fehler.length} fehlerhaft` : ''}`);
    } catch (err) {
      toast(err.message, 'fehler');
      $('#imp-los', el).disabled = false;
    }
  };
}
