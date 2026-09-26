// Kalender (Monat, Woche, Tag, Liste) mit Drag & Drop, Termine, Einsatzzettel, Mitarbeiter
import backend from 'backend';
import { MONATE, datum, datumLang, esc, heute, isoDatum, parseZahl, plusTage, zahl } from '../../shared/rechnen.js';
import { einsatzText, renderEinsatzzettel } from '../../shared/vorlagen.js';
import { S, istChef, loescheMitRueckgaengig, speichere } from '../state.js';
import { CHART_FARBEN, adresseVon, adressVorschlaege, main, mitarbeiterNamen, navigationsLink, terminFarbe } from '../helfer.js';
import { $, $$, dauerMerker, modal, skaliereVorschau, tipp, toast } from '../ui.js';
import { fotoBereich, fotoZahl } from '../fotos.js';

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const kal = { tag: heute(), filter: '', ansicht: dauerMerker.get('kalender-ansicht', 'monat') };

const wochenStart = (iso) => {
  const d = new Date(`${iso}T12:00:00`);
  return plusTage(iso, -((d.getDay() + 6) % 7));
};

export function viewKalender() {
  const chef = istChef();
  main().innerHTML = `
    <div class="seiten-kopf">
      <h1>${chef ? 'Kalender' : 'Meine Einsätze'}</h1>
      ${chef ? `<div class="btn-gruppe"><button class="btn btn-primaer" id="t-neu" type="button">+ Termin</button><button class="btn" id="t-zettel" type="button">Einsatzzettel</button><button class="btn" id="t-ics" type="button" title="Für Handy- oder Outlook-Kalender">.ics</button></div>` : ''}
    </div>
    ${chef ? tipp('kalender', 'Tipp: Termine lassen sich mit der Maus auf einen anderen Tag ziehen. In der Tagesansicht ziehst du sie zu einem anderen Mitarbeiter.') : ''}
    <div class="filter-leiste">
      <div class="btn-gruppe kal-nav"><button class="btn" id="k-zurueck" type="button" aria-label="Zurück">‹</button><button class="btn" id="k-heute" type="button">Heute</button><button class="btn" id="k-vor" type="button" aria-label="Weiter">›</button></div>
      <h2 id="k-titel" class="kal-titel"></h2>
      ${chef ? `<select id="k-filter" aria-label="Mitarbeiter"><option value="">Alle Mitarbeiter</option>${S.mitarbeiter.map((m) => `<option value="${m.id}" ${kal.filter === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>` : ''}
      <div class="segment" role="tablist">${[
        ['monat', 'Monat'],
        ['woche', 'Woche'],
        ['tag', 'Tag'],
        ['liste', 'Liste']
      ]
        .map(([k, l]) => `<button type="button" role="tab" data-ansicht="${k}" class="${kal.ansicht === k ? 'aktiv' : ''}" aria-selected="${kal.ansicht === k}">${l}</button>`)
        .join('')}</div>
    </div>
    ${chef ? `<div class="mitarbeiter-legende">${S.mitarbeiter.map((m) => `<span><i style="background:${esc(m.farbe)}"></i>${esc(m.name)}</span>`).join('')}${S.mitarbeiter.length ? '' : '<a href="#/mitarbeiter">Mitarbeiter anlegen →</a>'}</div>` : ''}
    <div class="karte" id="kal"></div>`;

  const sichtbar = () => S.termine.filter((t) => !kal.filter || (t.mitarbeiterIds || []).includes(kal.filter));
  const chip = (t) =>
    `<div class="kal-termin ${t.status === 'erledigt' ? 'erledigt' : ''} ${t.status === 'abgesagt' ? 'abgesagt' : ''}" data-t="${t.id}" ${chef ? 'draggable="true"' : ''} tabindex="0" style="--f:${esc(terminFarbe(t))}" title="${esc(`${t.titel || ''} – ${mitarbeiterNamen(t)}`)}">${t.von ? `<b>${esc(t.von)}</b> ` : ''}${esc(t.titel || t.kundeName || 'Termin')}${S.fotoAnzahl.termin[t.id] ? ' 📷' : ''}</div>`;
  const karte = (t) => `<div class="kal-karte karte-klick" data-t="${t.id}" ${chef ? 'draggable="true"' : ''} tabindex="0" style="--f:${esc(terminFarbe(t))}">
      <div class="kal-karte-zeit">${esc([t.von, t.bis].filter(Boolean).join(' – ') || 'ganztägig')}${t.status !== 'geplant' ? ` · ${esc(t.status)}` : ''}</div>
      <b>${esc(t.titel || t.kundeName || 'Termin')}</b>
      <small>${esc(t.vonAdresse || '')}${t.nachAdresse ? ` → ${esc(t.nachAdresse)}` : ''}</small>
      <small>${esc(mitarbeiterNamen(t) || 'Noch kein Team')} ${fotoZahl(S.fotoAnzahl.termin[t.id])}</small>
    </div>`;

  const zeichne = () => {
    if (!$('#kal')) return;
    const termine = sichtbar().sort((a, b) => (a.von || '').localeCompare(b.von || ''));
    const d = new Date(`${kal.tag}T12:00:00`);
    const h = heute();
    if (kal.ansicht === 'monat') {
      $('#k-titel').textContent = `${MONATE[d.getMonth()]} ${d.getFullYear()}`;
      const start = wochenStart(isoDatum(new Date(d.getFullYear(), d.getMonth(), 1)));
      const tage = Array.from({ length: 42 }, (_, i) => plusTage(start, i));
      $('#kal').innerHTML = `<div class="kal-raster">${WOCHENTAGE.map((w) => `<div class="kal-wt">${w}</div>`).join('')}${tage
        .map((iso) => {
          const tt = termine.filter((t) => t.datum === iso);
          return `<div class="kal-tag ${Number(iso.slice(5, 7)) !== d.getMonth() + 1 ? 'fremd' : ''} ${iso === h ? 'heute' : ''}" data-tag="${iso}" data-drop="${iso}">
            <span class="kal-nr">${Number(iso.slice(8))}</span>${tt.map(chip).join('')}</div>`;
        })
        .join('')}</div>`;
    } else if (kal.ansicht === 'woche') {
      const start = wochenStart(kal.tag);
      const tage = Array.from({ length: 7 }, (_, i) => plusTage(start, i));
      $('#k-titel').textContent = `${datum(tage[0])} – ${datum(tage[6])}`;
      $('#kal').innerHTML = `<div class="kal-woche">${tage
        .map(
          (iso, i) => `<div class="kal-spalte ${iso === h ? 'heute' : ''}" data-drop="${iso}">
            <div class="kal-spalte-kopf" data-tag="${iso}"><span>${WOCHENTAGE[i]}</span><b>${Number(iso.slice(8))}.</b></div>
            ${
              termine
                .filter((t) => t.datum === iso)
                .map(karte)
                .join('') || '<div class="kal-leer">frei</div>'
            }
          </div>`
        )
        .join('')}</div>`;
    } else if (kal.ansicht === 'tag') {
      $('#k-titel').textContent = datumLang(kal.tag);
      const tt = termine.filter((t) => t.datum === kal.tag);
      const spalten = chef
        ? [...S.mitarbeiter.filter((m) => !kal.filter || m.id === kal.filter).map((m) => [m.id, m.name, m.farbe]), ['', 'Ohne Team', '#9696A0']]
        : [['', 'Meine Einsätze', '#E53935']];
      $('#kal').innerHTML = `<div class="kal-woche kal-tagesansicht" style="--spalten:${spalten.length}">${spalten
        .map(([mid, name, f]) => {
          const liste = chef ? tt.filter((t) => (mid ? (t.mitarbeiterIds || []).includes(mid) : !(t.mitarbeiterIds || []).length)) : tt;
          return `<div class="kal-spalte" data-drop-mitarbeiter="${mid}">
            <div class="kal-spalte-kopf"><i class="punkt" style="background:${esc(f)}"></i><b>${esc(name)}</b><small>${liste.length ? `${liste.length} Einsatz${liste.length > 1 ? 'e' : ''}` : 'frei'}</small></div>
            ${liste.map(karte).join('') || '<div class="kal-leer">frei</div>'}
          </div>`;
        })
        .join('')}</div>`;
    } else {
      const monat = kal.tag.slice(0, 7);
      $('#k-titel').textContent = `${MONATE[d.getMonth()]} ${d.getFullYear()}`;
      const liste = (chef ? termine.filter((t) => t.datum.startsWith(monat)) : termine.filter((t) => t.datum >= plusTage(h, -1))).sort((a, b) =>
        (a.datum + (a.von || '')).localeCompare(b.datum + (b.von || ''))
      );
      $('#kal').innerHTML = liste.length
        ? `<table class="tabelle">${liste
            .map(
              (
                t
              ) => `<tr class="klickbar" tabindex="0" data-t="${t.id}"><td><i class="punkt" style="background:${esc(terminFarbe(t))}"></i> <b>${datum(t.datum)}</b><br><small>${esc([t.von, t.bis].filter(Boolean).join(' – '))}</small></td>
              <td><b>${esc(t.titel || '')}</b><br><small>${esc(t.kundeName || '')} ${esc(t.telefon || '')}</small></td>
              <td class="nur-breit"><small>${esc(t.vonAdresse || '')}${t.nachAdresse ? ` → ${esc(t.nachAdresse)}` : ''}</small></td><td>${esc(mitarbeiterNamen(t))}</td></tr>`
            )
            .join('')}</table>`
        : '<p class="leer">Keine Termine.</p>';
    }

    $$('#kal [data-t]').forEach(
      (el) =>
        (el.onclick = (e) => (
          e.stopPropagation(),
          terminDialog(
            S.termine.find((t) => t.id === el.dataset.t),
            zeichne
          )
        ))
    );
    $$('#kal [data-tag]').forEach(
      (el) =>
        (el.onclick = (e) => {
          if (e.target.closest('[data-t]')) return;
          if (kal.ansicht === 'monat' && chef) terminDialog({ datum: el.dataset.tag, mitarbeiterIds: kal.filter ? [kal.filter] : [] }, zeichne);
          if (kal.ansicht === 'woche') {
            kal.tag = el.dataset.tag;
            $('[data-ansicht="tag"]').click();
          }
        })
    );
    if (chef) dragUndDrop(zeichne);
  };

  const blaettern = (richtung) => {
    const schritte = { monat: 0, woche: 7, tag: 1, liste: 0 }[kal.ansicht];
    if (schritte) kal.tag = plusTage(kal.tag, richtung * schritte);
    else {
      const d = new Date(`${kal.tag}T12:00:00`);
      kal.tag = isoDatum(new Date(d.getFullYear(), d.getMonth() + richtung, 1));
    }
    zeichne();
  };
  $('#k-zurueck').onclick = () => blaettern(-1);
  $('#k-vor').onclick = () => blaettern(1);
  $('#k-heute').onclick = () => ((kal.tag = heute()), zeichne());
  $$('[data-ansicht]').forEach(
    (b) =>
      (b.onclick = () => {
        kal.ansicht = b.dataset.ansicht;
        dauerMerker.set('kalender-ansicht', kal.ansicht);
        $$('[data-ansicht]').forEach((x) => (x.classList.toggle('aktiv', x === b), x.setAttribute('aria-selected', x === b)));
        zeichne();
      })
  );
  if (chef) {
    $('#k-filter').onchange = (e) => ((kal.filter = e.target.value), zeichne());
    $('#t-neu').onclick = () => terminDialog({ datum: kal.ansicht === 'monat' ? heute() : kal.tag, mitarbeiterIds: kal.filter ? [kal.filter] : [] }, zeichne);
    $('#t-zettel').onclick = () => einsatzzettelDialog(kal.ansicht === 'monat' ? heute() : kal.tag);
    $('#t-ics').onclick = () => {
      const name = kal.filter ? S.mitarbeiter.find((m) => m.id === kal.filter)?.name : 'Alle';
      Promise.resolve(backend.download(new Blob([icsExport(sichtbar())], { type: 'text/calendar;charset=utf-8' }), `Termine_${name}.ics`)).catch((e) => toast(e.message, 'fehler'));
    };
  }
  zeichne();
}

// Termine per Maus verschieben: auf einen Tag (Datum) oder zu einem Mitarbeiter (Tagesansicht)
function dragUndDrop(neuZeichnen) {
  let gezogen = null;
  $$('#kal [draggable="true"]').forEach((el) => {
    el.addEventListener('dragstart', (e) => {
      gezogen = el.dataset.t;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', gezogen);
      el.classList.add('zieht');
    });
    el.addEventListener('dragend', () => el.classList.remove('zieht'));
  });
  $$('#kal [data-drop], #kal [data-drop-mitarbeiter]').forEach((ziel) => {
    ziel.addEventListener('dragover', (e) => (e.preventDefault(), ziel.classList.add('drop-ziel')));
    ziel.addEventListener('dragleave', () => ziel.classList.remove('drop-ziel'));
    ziel.addEventListener('drop', async (e) => {
      e.preventDefault();
      ziel.classList.remove('drop-ziel');
      const t = S.termine.find((x) => x.id === (gezogen || e.dataTransfer.getData('text/plain')));
      if (!t) return;
      const neu = { ...t };
      if (ziel.dataset.drop) {
        if (t.datum === ziel.dataset.drop) return;
        neu.datum = ziel.dataset.drop;
      } else {
        const nach = ziel.dataset.dropMitarbeiter;
        const von = e.dataTransfer.getData('von-mitarbeiter') || $(`[data-t="${t.id}"]`)?.closest('[data-drop-mitarbeiter]')?.dataset.dropMitarbeiter || '';
        const ids = (t.mitarbeiterIds || []).filter((x) => x !== von);
        neu.mitarbeiterIds = nach ? [...new Set([...ids, nach])] : [];
      }
      try {
        await speichere('termine', neu);
        toast(ziel.dataset.drop ? `Verschoben auf ${datum(neu.datum)}` : 'Team geändert', 'ok', {
          aktion: 'Rückgängig',
          beiAktion: async () => (await speichere('termine', t), neuZeichnen())
        });
        neuZeichnen();
      } catch (err) {
        toast(err.message, 'fehler');
      }
    });
  });
}

export function icsExport(termine) {
  const f = (d, t) => `${d.replace(/-/g, '')}T${(t || '08:00').replace(':', '')}00`;
  const e = (v) =>
    String(v || '')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/[,;]/g, (m) => `\\${m}`);
  const zeilen = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rechnung-Programm//DE', 'CALSCALE:GREGORIAN'];
  termine.forEach((t) => {
    zeilen.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@rechnung-programm`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART:${f(t.datum, t.von)}`,
      `DTEND:${f(t.datum, t.bis || t.von || '17:00')}`,
      `SUMMARY:${e(t.titel || 'Termin')}`,
      `LOCATION:${e(t.vonAdresse)}`,
      `DESCRIPTION:${e(einsatzText(t.datum, [t], S.mitarbeiter))}`,
      'END:VEVENT'
    );
  });
  zeilen.push('END:VCALENDAR');
  return zeilen.join('\r\n');
}

// ---------- Einsatzzettel ----------
export function einsatzzettelDialog(tag) {
  const termine = () => S.termine.filter((t) => t.datum === tag && t.status !== 'abgesagt');
  const html = () => renderEinsatzzettel(tag, termine(), S.settings, S.mitarbeiter);
  const text = () => einsatzText(tag, termine(), S.mitarbeiter);
  const { el } = modal(
    `Einsatzzettel ${datum(tag)}`,
    `
    <div class="btn-gruppe">
      <input type="date" id="ez-tag" value="${tag}" aria-label="Tag">
      <button class="btn" id="ez-pdf" type="button">PDF</button>
      <button class="btn" id="ez-kopie" type="button">Text kopieren</button>
      <a class="btn" id="ez-wa" target="_blank" rel="noopener">WhatsApp</a>
      <button class="btn btn-primaer" id="ez-mail" type="button">✉ An das Team</button>
    </div>
    <p class="hilfe">„WhatsApp“ öffnet den Text zum Weiterleiten an deine Team-Gruppe. „An das Team“ schickt jedem eingeplanten Mitarbeiter eine E-Mail.</p>
    <div class="vorschau-rahmen"><div id="ez-vorschau" class="vorschau-skaliert"></div></div>`,
    { breit: true }
  );
  const zeichne = () => {
    $('#ez-vorschau', el).innerHTML = html();
    skaliereVorschau($('#ez-vorschau', el));
    $('#ez-wa', el).href = `https://wa.me/?text=${encodeURIComponent(text())}`;
  };
  $('#ez-tag', el).onchange = (e) => {
    tag = e.target.value || heute();
    el.querySelector('h3').textContent = `Einsatzzettel ${datum(tag)}`;
    zeichne();
  };
  $('#ez-pdf', el).onclick = async () => {
    try {
      toast('PDF wird erstellt…');
      await backend.download(await backend.einsatzzettelPdf(tag, html()), `Einsatzzettel_${tag}.pdf`);
    } catch (e) {
      toast(e.message, 'fehler');
    }
  };
  $('#ez-kopie', el).onclick = async () => {
    try {
      await navigator.clipboard.writeText(text());
      toast('Text kopiert');
    } catch {
      toast('Kopieren nicht möglich – bitte den Text im PDF verwenden.', 'fehler');
    }
  };
  $('#ez-mail', el).onclick = async () => {
    try {
      const r = await backend.mailEinsatzzettel(tag);
      toast(`E-Mail an ${r.anzahl} Mitarbeiter gesendet`);
    } catch (e) {
      toast(e.message, 'fehler');
    }
  };
  zeichne();
}

// ---------- Termin-Dialog ----------
export function terminDialog(t, fertig = () => {}) {
  if (!istChef()) return terminAnsichtMitarbeiter(t, fertig);
  const { el, close } = modal(
    t.id ? 'Termin bearbeiten' : 'Neuer Termin',
    `
    <form class="formular" id="t-form">
      <div class="raster-3">
        <label>Datum<input type="date" id="t-datum" required value="${esc(t.datum || heute())}"></label>
        <label>Von<input type="time" id="t-von" value="${esc(t.von || '08:00')}"></label>
        <label>Bis<input type="time" id="t-bis" value="${esc(t.bis || '')}"></label>
      </div>
      <div class="raster-2">
        <label class="span-2">Titel<input id="t-titel" value="${esc(t.titel || '')}" placeholder="z. B. Umzug 3-Zimmer-Wohnung"></label>
        <label>Kunde<input id="t-kunde" list="t-kunden" value="${esc(t.kundeName || '')}"><datalist id="t-kunden">${S.kunden.map((k) => `<option value="${esc(k.name)}">`).join('')}</datalist></label>
        <label>Telefon Kunde<input id="t-tel" value="${esc(t.telefon || '')}"></label>
        <label class="span-2">Auszugsadresse / Einsatzort<input id="t-vonadr" value="${esc(t.vonAdresse || '')}"></label>
        <label class="span-2">Einzugsadresse<input id="t-nachadr" value="${esc(t.nachAdresse || '')}"></label>
        <label>Fahrzeug<input id="t-fahrzeug" value="${esc(t.fahrzeug || '')}" placeholder="z. B. 7,5 t LKW"></label>
        <label>Status<select id="t-status">${['geplant', 'bestätigt', 'erledigt', 'abgesagt'].map((s) => `<option ${t.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label class="span-2">Auftrag<select id="t-auftrag"><option value="">– kein Auftrag –</option>${S.auftraege
          .filter((a) => !['bezahlt', 'abgesagt'].includes(a.status) || a.id === t.auftragId)
          .map((a) => `<option value="${a.id}" ${a.id === t.auftragId ? 'selected' : ''}>${esc(a.titel)}</option>`)
          .join('')}</select></label>
      </div>
      <div class="label">Mitarbeiter</div>
      <div class="mitarbeiter-wahl">${S.mitarbeiter.length ? S.mitarbeiter.map((m) => `<label class="chip"><input type="checkbox" value="${m.id}" ${(t.mitarbeiterIds || []).includes(m.id) ? 'checked' : ''}><i style="background:${esc(m.farbe)}"></i>${esc(m.name)}</label>`).join('') : '<span class="hilfe">Noch keine Mitarbeiter – unter „Mitarbeiter“ anlegen.</span>'}</div>
      <div id="t-konflikt"></div>
      <label>Hinweise für das Team<textarea id="t-notiz" rows="3" placeholder="z. B. 4. OG ohne Aufzug, Klavier, Halteverbot beantragt">${esc(t.notiz || '')}</textarea></label>
      <div class="label">Fotos für das Team</div>
      ${t.id ? '<div id="t-fotos"></div>' : '<button class="btn btn-klein" type="button" id="t-foto-neu">📷 Speichern und Fotos hinzufügen</button>'}
      ${t.dokumentId ? `<p><a href="#/dokument/${esc(t.dokumentId)}" data-schliessen>Zugehöriges Dokument öffnen →</a></p>` : ''}
      <div class="btn-gruppe rechts">
        ${t.id ? '<button class="btn rot" id="t-del" type="button">Löschen</button>' : ''}
        ${t.vonAdresse ? `<a class="btn" href="${navigationsLink(t.vonAdresse)}" target="_blank" rel="noopener">Navigation</a>` : ''}
        <button class="btn" id="t-mail" type="button" title="Termin per E-Mail an die ausgewählten Mitarbeiter">✉ Team informieren</button>
        <button class="btn btn-primaer" type="submit">Speichern</button>
      </div>
    </form>`
  );
  if ($('#t-fotos', el)) fotoBereich($('#t-fotos', el), { abfrage: { terminId: t.id }, leerText: 'Noch keine Fotos. Fotos am Auftrag erscheinen hier automatisch.', beiAenderung: fertig });
  adressVorschlaege($('#t-vonadr', el), (a) => ($('#t-vonadr', el).value = a.text));
  adressVorschlaege($('#t-nachadr', el), (a) => ($('#t-nachadr', el).value = a.text));

  const werte = () => {
    const kundeName = $('#t-kunde', el).value;
    const k = S.kunden.find((x) => x.name === kundeName);
    return {
      ...t,
      datum: $('#t-datum', el).value,
      von: $('#t-von', el).value,
      bis: $('#t-bis', el).value,
      titel: $('#t-titel', el).value,
      kundeName,
      kundeId: k ? k.id : t.kundeId || '',
      telefon: $('#t-tel', el).value || k?.telefon || '',
      vonAdresse: $('#t-vonadr', el).value,
      nachAdresse: $('#t-nachadr', el).value,
      fahrzeug: $('#t-fahrzeug', el).value,
      status: $('#t-status', el).value,
      auftragId: $('#t-auftrag', el).value,
      mitarbeiterIds: $$('.mitarbeiter-wahl input:checked', el).map((i) => i.value),
      notiz: $('#t-notiz', el).value
    };
  };
  // Warnung bei Doppelbelegung von Mitarbeitern oder Fahrzeug am selben Tag
  const pruefeKonflikt = () => {
    const w = werte();
    const andere = S.termine.filter((x) => x.id !== t.id && x.datum === w.datum && x.status !== 'abgesagt');
    const doppelt = w.mitarbeiterIds.filter((mid) => andere.some((x) => (x.mitarbeiterIds || []).includes(mid))).map((mid) => S.mitarbeiter.find((m) => m.id === mid)?.name);
    const fahrzeug = w.fahrzeug && andere.find((x) => x.fahrzeug && x.fahrzeug.toLowerCase() === w.fahrzeug.toLowerCase());
    $('#t-konflikt', el).innerHTML =
      doppelt.length || fahrzeug
        ? `<div class="hinweis-box">Achtung: ${doppelt.length ? `${esc(doppelt.join(', '))} ${doppelt.length > 1 ? 'sind' : 'ist'} an diesem Tag schon eingeplant.` : ''} ${fahrzeug ? `Fahrzeug „${esc(w.fahrzeug)}“ ist schon für „${esc(fahrzeug.titel || '')}“ vergeben.` : ''}</div>`
        : '';
  };
  ['#t-datum', '#t-fahrzeug'].forEach((s) => $(s, el).addEventListener('input', pruefeKonflikt));
  $$('.mitarbeiter-wahl input', el).forEach((i) => i.addEventListener('change', pruefeKonflikt));
  pruefeKonflikt();
  $('#t-kunde', el).onchange = () => {
    const k = S.kunden.find((x) => x.name === $('#t-kunde', el).value);
    if (!k) return;
    if (!$('#t-tel', el).value) $('#t-tel', el).value = k.telefon || '';
    if (!$('#t-vonadr', el).value) $('#t-vonadr', el).value = adresseVon(k);
  };
  $$('[data-schliessen]', el).forEach((a) => (a.onclick = close));
  if ($('#t-foto-neu', el))
    $('#t-foto-neu', el).onclick = async () => {
      if (!$('#t-form', el).reportValidity()) return;
      try {
        const gespeichert = await speichere('termine', werte());
        close();
        fertig();
        terminDialog(gespeichert, fertig);
      } catch (err) {
        toast(err.message, 'fehler');
      }
    };
  $('#t-form', el).onsubmit = async (e) => {
    e.preventDefault();
    try {
      Object.assign(t, await speichere('termine', werte()));
      toast('Termin gespeichert');
      close();
      fertig();
    } catch (err) {
      toast(err.message, 'fehler');
    }
  };
  if (t.id)
    $('#t-del', el).onclick = async () => {
      close();
      await loescheMitRueckgaengig('termine', t.id, 'Termin gelöscht', fertig);
    };
  $('#t-mail', el).onclick = async () => {
    try {
      Object.assign(t, await speichere('termine', werte()));
      const r = await backend.mailTermin(t.id);
      toast(`E-Mail an ${r.anzahl} Mitarbeiter gesendet`);
      close();
      fertig();
    } catch (err) {
      toast(err.message, 'fehler');
    }
  };
}

// Mitarbeiter sehen ihre Einsätze, können navigieren und „erledigt“ melden
function terminAnsichtMitarbeiter(t, fertig) {
  const { el, close } = modal(
    t.titel || 'Einsatz',
    `
    <div class="einsatz-details">
      <p><b>${datumLang(t.datum)}</b>${t.von ? `, ${esc(t.von)}${t.bis ? ` – ${esc(t.bis)}` : ''} Uhr` : ''}</p>
      ${t.kundeName ? `<p>Kunde: <b>${esc(t.kundeName)}</b>${t.telefon ? ` · <a href="tel:${esc(t.telefon)}">${esc(t.telefon)}</a>` : ''}</p>` : ''}
      ${t.vonAdresse ? `<p>Von: ${esc(t.vonAdresse)} <a class="btn btn-klein" href="${navigationsLink(t.vonAdresse)}" target="_blank" rel="noopener">Navigation</a></p>` : ''}
      ${t.nachAdresse ? `<p>Nach: ${esc(t.nachAdresse)} <a class="btn btn-klein" href="${navigationsLink(t.nachAdresse)}" target="_blank" rel="noopener">Navigation</a></p>` : ''}
      ${mitarbeiterNamen(t) ? `<p>Team: ${esc(mitarbeiterNamen(t))}</p>` : ''}
      ${t.fahrzeug ? `<p>Fahrzeug: ${esc(t.fahrzeug)}</p>` : ''}
      ${t.notiz ? `<div class="hinweis-box">${esc(t.notiz)}</div>` : ''}
      <p>Status: <b>${esc(t.status || 'geplant')}</b></p>
    </div>
    <h4>Fotos</h4>
    <div id="t-fotos"></div>
    <div class="btn-gruppe rechts">${t.status !== 'erledigt' ? '<button class="btn btn-gruen" id="t-erledigt" type="button">Als erledigt melden</button>' : ''}</div>`
  );
  fotoBereich($('#t-fotos', el), { abfrage: { terminId: t.id }, leerText: 'Keine Fotos zu diesem Einsatz. Du kannst selbst Fotos hinzufügen, z. B. vor und nach dem Umzug.', beiAenderung: fertig });
  if ($('#t-erledigt', el))
    $('#t-erledigt', el).onclick = async () => {
      try {
        await speichere('termine', { ...t, status: 'erledigt' });
        toast('Danke! Als erledigt gemeldet');
        close();
        fertig();
      } catch (err) {
        toast(err.message, 'fehler');
      }
    };
}

// ---------- Mitarbeiter ----------
export function viewMitarbeiter() {
  main().innerHTML = `
    <div class="seiten-kopf"><h1>Mitarbeiter</h1><button class="btn btn-primaer" id="m-neu" type="button">+ Mitarbeiter</button></div>
    ${tipp('mitarbeiter', 'Tipp: Unter Einstellungen → Zugänge bekommt jeder Mitarbeiter einen eigenen Login und sieht dann nur seine Einsätze.')}
    <div class="karte"><table class="tabelle" id="m-tabelle"></table></div>`;
  const zeichne = () => {
    if (!$('#m-tabelle')) return;
    const h = heute();
    const jahr = String(new Date().getFullYear());
    $('#m-tabelle').innerHTML = S.mitarbeiter.length
      ? `<thead><tr><th>Name</th><th>Telefon</th><th class="nur-breit">E-Mail</th><th>Nächster Einsatz</th><th class="c-num">Einsätze ${jahr}</th></tr></thead><tbody>${S.mitarbeiter
          .map((m) => {
            const seine = S.termine.filter((t) => (t.mitarbeiterIds || []).includes(m.id));
            const naechster = seine.filter((t) => t.datum >= h).sort((a, b) => a.datum.localeCompare(b.datum))[0];
            const anzahl = seine.filter((t) => t.datum.startsWith(jahr) && t.status !== 'abgesagt').length;
            return `<tr class="klickbar" tabindex="0" data-id="${m.id}"><td><i class="punkt" style="background:${esc(m.farbe)}"></i> <b>${esc(m.name)}</b>${m.rolle ? `<br><small>${esc(m.rolle)}</small>` : ''}</td><td>${esc(m.telefon || '')}</td><td class="nur-breit">${esc(m.email || '')}</td><td>${naechster ? `${datum(naechster.datum)} – ${esc(naechster.titel || '')}` : '–'}</td><td class="c-num">${anzahl}</td></tr>`;
          })
          .join('')}</tbody>`
      : '<tbody><tr><td class="leer">Noch keine Mitarbeiter angelegt.</td></tr></tbody>';
    $$('#m-tabelle tr[data-id]').forEach(
      (tr) =>
        (tr.onclick = () =>
          mitarbeiterDialog(
            S.mitarbeiter.find((m) => m.id === tr.dataset.id),
            zeichne
          ))
    );
  };
  $('#m-neu').onclick = () => mitarbeiterDialog({ farbe: CHART_FARBEN[S.mitarbeiter.length % CHART_FARBEN.length] }, zeichne);
  zeichne();
}

function mitarbeiterDialog(m, fertig) {
  const { el, close } = modal(
    m.id ? m.name : 'Neuer Mitarbeiter',
    `
    <form class="formular" id="ma-form"><div class="raster-2">
      <label>Name *<input id="ma-name" required value="${esc(m.name || '')}"></label>
      <label>Farbe im Kalender<input type="color" id="ma-farbe" value="${esc(m.farbe || '#E53935')}"></label>
      <label>Telefon<input id="ma-tel" value="${esc(m.telefon || '')}"></label>
      <label>E-Mail (für Einsatz-Infos)<input id="ma-mail" type="email" value="${esc(m.email || '')}"></label>
      <label>Funktion<input id="ma-rolle" value="${esc(m.rolle || '')}" placeholder="z. B. Fahrer, Helfer"></label>
      <label>Stundenlohn (€)<input id="ma-lohn" inputmode="decimal" value="${m.stundenlohn ? esc(zahl(m.stundenlohn)) : ''}"></label>
    </div>
    <div class="btn-gruppe rechts">${m.id ? '<button class="btn rot" id="ma-del" type="button">Löschen</button>' : ''}<button class="btn btn-primaer" type="submit">Speichern</button></div></form>`
  );
  $('#ma-form', el).onsubmit = async (e) => {
    e.preventDefault();
    try {
      await speichere('mitarbeiter', {
        ...m,
        name: $('#ma-name', el).value.trim(),
        farbe: $('#ma-farbe', el).value,
        telefon: $('#ma-tel', el).value,
        email: $('#ma-mail', el).value,
        rolle: $('#ma-rolle', el).value,
        stundenlohn: parseZahl($('#ma-lohn', el).value)
      });
      close();
      fertig();
    } catch (err) {
      toast(err.message, 'fehler');
    }
  };
  if (m.id)
    $('#ma-del', el).onclick = async () => {
      close();
      await loescheMitRueckgaengig('mitarbeiter', m.id, `${m.name} gelöscht`, fertig);
    };
}
