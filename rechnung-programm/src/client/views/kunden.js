// Kunden: Liste und Detailseite mit Zeitleiste, Notizen und Fotos
import { berechne, datum, esc, euro } from '../../shared/rechnen.js';
import { S, api, loescheMitRueckgaengig, speichere } from '../state.js';
import { AUFTRAG_SPALTEN, adressVorschlaege, dublettenHinweis, main, statusBadge } from '../helfer.js';
import { $, $$, dauerMerker, merkeZuletzt, merker, modal, tipp, toast } from '../ui.js';
import { fotoBereich } from '../fotos.js';
import { docTitel } from '../helfer.js';

export function viewKunden() {
  const filter = dauerMerker.get('filter:kunden', { suche: '' });
  main().innerHTML = `
    <div class="seiten-kopf"><h1>Kunden</h1><button class="btn btn-primaer" id="k-neu" type="button">+ Neuer Kunde</button></div>
    <div class="filter-leiste"><input type="search" id="k-suche" placeholder="Suchen (Name, Ort, Telefon, E-Mail)…" value="${esc(filter.suche)}" aria-label="Suchen"></div>
    <div class="karte"><table class="tabelle" id="k-tabelle"></table></div>`;
  const zeichne = () => {
    if (!$('#k-tabelle')) return;
    dauerMerker.set('filter:kunden', filter);
    const q = filter.suche.toLowerCase();
    const liste = S.kunden
      .filter((k) => !q || [k.name, k.firma, k.ort, k.email, k.telefon, k.kundennummer].join(' ').toLowerCase().includes(q))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    $('#k-tabelle').innerHTML = liste.length
      ? `<thead><tr><th>Nr.</th><th>Name</th><th class="nur-breit">Ort</th><th>Telefon</th><th class="nur-breit">E-Mail</th><th class="c-num">Umsatz</th></tr></thead><tbody>${liste
          .map((k) => {
            const ums = S.dokumente.filter((d) => d.kundeId === k.id && d.typ === 'rechnung' && d.gesperrt && d.status !== 'storniert' && !d.storno).reduce((a, d) => a + berechne(d).brutto, 0);
            return `<tr class="klickbar" tabindex="0" data-id="${k.id}"><td>${esc(k.kundennummer || '')}</td><td><b>${esc(k.name)}</b>${k.firma ? `<br><small>${esc(k.firma)}</small>` : ''}</td><td class="nur-breit">${esc([k.plz, k.ort].filter(Boolean).join(' '))}</td><td>${esc(k.telefon || '')}</td><td class="nur-breit">${esc(k.email || '')}</td><td class="c-num">${euro(ums)}</td></tr>`;
          })
          .join('')}</tbody>`
      : '<tbody><tr><td class="leer">Keine Kunden gefunden.</td></tr></tbody>';
    $$('#k-tabelle tr[data-id]').forEach((tr) => (tr.onclick = () => (location.hash = `#/kunde/${tr.dataset.id}`)));
  };
  $('#k-suche').oninput = (e) => ((filter.suche = e.target.value), zeichne());
  $('#k-neu').onclick = () => kundeDialog({}, (k) => (location.hash = `#/kunde/${k.id}`));
  zeichne();
}

// Dialog für neuen Kunden (mit Dubletten-Warnung)
export function kundeDialog(k, fertig = () => {}) {
  const felder = [
    ['name', 'Name *'],
    ['firma', 'Firma'],
    ['strasse', 'Straße & Nr.'],
    ['plz', 'PLZ'],
    ['ort', 'Ort'],
    ['telefon', 'Telefon'],
    ['email', 'E-Mail']
  ];
  const { el, close } = modal(
    k.id ? k.name : 'Neuer Kunde',
    `
    <form class="formular" id="k-form">
      <div class="raster-2">${felder.map(([f, l]) => `<label class="${f === 'strasse' ? 'span-2' : ''}">${l}<input data-kf="${f}" value="${esc(k[f] || '')}" ${f === 'name' ? 'required' : ''} ${f === 'email' ? 'type="email"' : ''}></label>`).join('')}
      <label>Sprache für Dokumente<select data-kf="sprache"><option value="de">Deutsch</option><option value="en" ${k.sprache === 'en' ? 'selected' : ''}>Englisch</option></select></label></div>
      <div id="k-dubletten"></div>
      <div class="btn-gruppe rechts"><button class="btn btn-primaer" type="submit">Speichern</button></div>
    </form>`
  );
  const werte = () => Object.fromEntries($$('[data-kf]', el).map((i) => [i.dataset.kf, i.value]));
  const pruefe = () => {
    $('#k-dubletten', el).innerHTML = dublettenHinweis(werte(), k.id);
    $$('[data-dublette]', el).forEach((b) => (b.onclick = () => (close(), (location.hash = `#/kunde/${b.dataset.dublette}`))));
  };
  $$('[data-kf]', el).forEach((i) => i.addEventListener('input', pruefe));
  adressVorschlaege($('[data-kf="strasse"]', el), (a) => {
    $('[data-kf="strasse"]', el).value = a.strasse || $('[data-kf="strasse"]', el).value;
    $('[data-kf="plz"]', el).value = a.plz;
    $('[data-kf="ort"]', el).value = a.ort;
  });
  $('#k-form', el).onsubmit = async (e) => {
    e.preventDefault();
    try {
      const saved = await speichere('kunden', { ...k, ...werte() });
      toast('Gespeichert');
      close();
      fertig(saved);
    } catch (err) {
      toast(err.message, 'fehler');
    }
  };
}

export async function viewKunde(id) {
  const k = S.kunden.find((x) => x.id === id);
  if (!k) return (location.hash = '#/kunden');
  merkeZuletzt({ typ: 'kunde', id: k.id, titel: `Kunde ${k.name}` });
  const docs = S.dokumente.filter((d) => d.kundeId === id).sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  const termine = S.termine.filter((t) => t.kundeId === id).sort((a, b) => b.datum.localeCompare(a.datum));
  const auftraege = S.auftraege.filter((a) => a.kundeId === id);
  const umsatz = docs.filter((d) => d.typ === 'rechnung' && d.gesperrt && d.status !== 'storniert' && !d.storno).reduce((a, d) => a + berechne(d).brutto, 0);
  const offen = docs.filter((d) => d.typ === 'rechnung' && d.status === 'offen' && !d.storno).reduce((a, d) => a + berechne(d).brutto, 0);

  main().innerHTML = `
    <div class="seiten-kopf">
      <div><a href="#/kunden" class="zurueck">← Kunden</a><h1>${esc(k.name)} <span class="badge">${esc(k.kundennummer || '')}</span></h1><p>${esc(k.firma || '')}</p></div>
      <div class="btn-gruppe">
        <button class="btn" data-neu="angebot" type="button">+ Kostenvoranschlag</button>
        <button class="btn" data-neu="rechnung" type="button">+ Rechnung</button>
        <details class="mehr"><summary class="btn" aria-label="Weitere Aktionen">⋯</summary><div><button type="button" id="k-del" class="rot">Kunde löschen</button></div></details>
      </div>
    </div>
    <div class="kpi-reihe">
      <div class="kpi"><span>Umsatz gesamt</span><b>${euro(umsatz)}</b></div>
      <div class="kpi"><span>Offen</span><b>${euro(offen)}</b></div>
      <div class="kpi"><span>Dokumente</span><b>${docs.length}</b></div>
      <div class="kpi"><span>Termine</span><b>${termine.length}</b></div>
    </div>
    <div class="raster-kunde">
      <div>
        <form class="karte" id="k-daten">
          <div class="karte-kopf"><h3>Kontaktdaten</h3><span class="hilfe" id="k-status"></span></div>
          <div class="raster-2">
            ${[
              ['name', 'Name'],
              ['firma', 'Firma'],
              ['strasse', 'Straße & Nr.'],
              ['plz', 'PLZ'],
              ['ort', 'Ort'],
              ['telefon', 'Telefon'],
              ['email', 'E-Mail']
            ]
              .map(([f, l]) => `<label class="${f === 'strasse' ? 'span-2' : ''}">${l}<input data-kf="${f}" value="${esc(k[f] || '')}" ${f === 'email' ? 'type="email"' : ''}></label>`)
              .join('')}
            <label>Sprache für Dokumente<select data-kf="sprache"><option value="de">Deutsch</option><option value="en" ${k.sprache === 'en' ? 'selected' : ''}>Englisch</option></select></label>
          </div>
          <div class="btn-gruppe">${k.telefon ? `<a class="btn btn-klein" href="tel:${esc(k.telefon)}">Anrufen</a><a class="btn btn-klein" href="https://wa.me/${esc(String(k.telefon).replace(/\D/g, '').replace(/^0/, '49'))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}${k.email ? `<a class="btn btn-klein" href="mailto:${esc(k.email)}">E-Mail</a>` : ''}</div>
        </form>
        <div class="karte">
          <h3>Dokumente</h3>
          ${docs.length ? `<table class="tabelle">${docs.map((d) => `<tr class="klickbar" tabindex="0" data-doc="${d.id}"><td>${esc(docTitel(d))}</td><td>${datum(d.datum)}</td><td>${statusBadge(d)}</td><td class="c-num">${euro(berechne(d).brutto)}</td></tr>`).join('')}</table>` : '<p class="leer">Noch keine Dokumente.</p>'}
        </div>
        ${auftraege.length ? `<div class="karte"><h3>Aufträge</h3><ul class="termin-liste">${auftraege.map((a) => `<li><a href="#/auftraege" data-auftrag="${a.id}">${esc(a.titel)}</a> <span class="badge">${esc(AUFTRAG_SPALTEN.find(([s]) => s === a.status)?.[1] || a.status)}</span></li>`).join('')}</ul></div>` : ''}
        <div class="karte">
          <h3>Fotos</h3>
          <div id="k-fotos"></div>
        </div>
      </div>
      <div class="karte">
        <h3>Zeitleiste</h3>
        ${tipp('zeitleiste', 'Hier siehst du alles zu diesem Kunden: Anrufe, Notizen, Dokumente, Zahlungen und Termine.')}
        <form id="k-notiz-form" class="notiz-form"><textarea id="k-notiz" rows="2" placeholder="Notiz, z. B. „Anruf: will Termin verschieben“" aria-label="Neue Notiz"></textarea><button class="btn btn-primaer btn-klein" type="submit">Notiz speichern</button></form>
        <ul class="zeitleiste" id="k-zeitleiste"><li class="hilfe">Lädt…</li></ul>
      </div>
    </div>`;

  // Kontaktdaten automatisch speichern
  let timer;
  $$('#k-daten [data-kf]').forEach((i) =>
    i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', () => {
      clearTimeout(timer);
      $('#k-status').textContent = 'Ungespeichert…';
      timer = setTimeout(async () => {
        try {
          const neu = Object.fromEntries($$('#k-daten [data-kf]').map((x) => [x.dataset.kf, x.value]));
          Object.assign(k, await speichere('kunden', { ...k, ...neu }));
          $('#k-status').textContent = '✓ Gespeichert';
        } catch (e) {
          $('#k-status').textContent = e.message;
        }
      }, 900);
    })
  );
  adressVorschlaege($('#k-daten [data-kf="strasse"]'), (a) => {
    $('#k-daten [data-kf="strasse"]').value = a.strasse || $('#k-daten [data-kf="strasse"]').value;
    $('#k-daten [data-kf="plz"]').value = a.plz;
    $('#k-daten [data-kf="ort"]').value = a.ort;
    $('#k-daten [data-kf="ort"]').dispatchEvent(new Event('input'));
  });
  $('#k-daten').onsubmit = (e) => e.preventDefault();
  $$('[data-doc]').forEach((tr) => (tr.onclick = () => (location.hash = `#/dokument/${tr.dataset.doc}`)));
  $$('[data-neu]').forEach(
    (b) =>
      (b.onclick = () => {
        merker.set('vorKunde', k.id);
        location.hash = `#/neu/${b.dataset.neu}`;
      })
  );
  $('#k-del').onclick = async () => {
    await loescheMitRueckgaengig('kunden', k.id, `${k.name} gelöscht (Dokumente bleiben erhalten)`);
    location.hash = '#/kunden';
  };

  // Zeitleiste aus Protokoll, Notizen und Terminen
  async function zeichneZeitleiste() {
    let protokoll = [];
    try {
      protokoll = await api('GET', `/api/protokoll?kundeId=${k.id}&limit=300`);
    } catch {
      /* ohne Protokoll nur Notizen und Termine */
    }
    const notizen = S.notizen.filter((n) => n.kundeId === k.id);
    const eintraege = [
      ...protokoll.filter((p) => p.sammlung !== 'notizen').map((p) => ({ zeit: p.zeit, text: p.text, wer: p.benutzer, art: p.aktion })),
      ...notizen.map((n) => ({ zeit: n.erstellt, text: n.text, wer: n.erstelltVon, art: 'notiz', id: n.id })),
      ...termine.map((t) => ({ zeit: `${t.datum}T${t.von || '08:00'}:00`, text: `Termin: ${t.titel || 'Einsatz'} (${t.status || 'geplant'})`, art: 'termin' }))
    ].sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)));
    $('#k-zeitleiste').innerHTML = eintraege.length
      ? eintraege
          .map(
            (e) =>
              `<li class="zl-${esc(e.art)}"><div class="zl-zeit">${datum(String(e.zeit).slice(0, 10))}${String(e.zeit).length > 10 ? ` ${String(e.zeit).slice(11, 16)}` : ''}${e.wer ? ` · ${esc(e.wer)}` : ''}</div><div class="zl-text">${esc(e.text)}</div>${e.id ? `<button class="btn-icon" data-notiz-weg="${e.id}" type="button" aria-label="Notiz löschen">✕</button>` : ''}</li>`
          )
          .join('')
      : '<li class="leer">Noch keine Einträge.</li>';
    $$('[data-notiz-weg]').forEach((b) => (b.onclick = () => loescheMitRueckgaengig('notizen', b.dataset.notizWeg, 'Notiz gelöscht', zeichneZeitleiste)));
  }
  $('#k-notiz-form').onsubmit = async (e) => {
    e.preventDefault();
    const text = $('#k-notiz').value.trim();
    if (!text) return;
    try {
      await speichere('notizen', { kundeId: k.id, text });
      $('#k-notiz').value = '';
      zeichneZeitleiste();
    } catch (err) {
      toast(err.message, 'fehler');
    }
  };

  zeichneZeitleiste();
  fotoBereich($('#k-fotos'), {
    abfrage: { kundeId: k.id },
    leerText: 'Fotos von der Besichtigung, Schäden oder Übergabe – direkt vom Handy hochladen. Fotos an Aufträgen dieses Kunden erscheinen hier auch.',
    beiAenderung: zeichneZeitleiste
  });
}
