// Kalender, Termine und Mitarbeiter
const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function mitarbeiterNamen(t) {
  return (t.mitarbeiterIds || [])
    .map((id) => S.mitarbeiter.find((m) => m.id === id)?.name)
    .filter(Boolean)
    .join(', ');
}

function terminFarbe(t) {
  const m = S.mitarbeiter.find((x) => x.id === (t.mitarbeiterIds || [])[0]);
  return m?.farbe || '#E53935';
}

const kal = { jahr: new Date().getFullYear(), monat: new Date().getMonth(), filter: '', ansicht: 'monat' };

function viewKalender() {
  $('#main').innerHTML = `
    <div class="seiten-kopf">
      <h1>Kalender</h1>
      <div class="btn-gruppe">
        <button class="btn btn-primaer" id="t-neu">+ Termin</button>
        <button class="btn" id="t-ics" title="Für Handy-/Outlook-Kalender">Kalender-Datei (.ics)</button>
      </div>
    </div>
    <div class="filter-leiste">
      <button class="btn" id="k-zurueck">‹</button>
      <button class="btn" id="k-heute">Heute</button>
      <button class="btn" id="k-vor">›</button>
      <h2 id="k-titel" class="kal-titel"></h2>
      <select id="k-filter"><option value="">Alle Mitarbeiter</option>${S.mitarbeiter.map((m) => `<option value="${m.id}" ${kal.filter === m.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>
      <select id="k-ansicht"><option value="monat">Monat</option><option value="liste" ${kal.ansicht === 'liste' ? 'selected' : ''}>Liste</option></select>
    </div>
    <div class="mitarbeiter-legende">${S.mitarbeiter.map((m) => `<span><i style="background:${esc(m.farbe)}"></i>${esc(m.name)}</span>`).join('')}${S.mitarbeiter.length ? '' : '<a href="#/mitarbeiter">Mitarbeiter anlegen →</a>'}</div>
    <div class="karte" id="kal"></div>`;

  const sichtbar = () => S.termine.filter((t) => !kal.filter || (t.mitarbeiterIds || []).includes(kal.filter));

  const zeichne = () => {
    if (!$('#kal')) return;
    $('#k-titel').textContent = `${MONATE[kal.monat]} ${kal.jahr}`;
    const termine = sichtbar();
    if (kal.ansicht === 'liste') {
      const prefix = `${kal.jahr}-${String(kal.monat + 1).padStart(2, '0')}`;
      const liste = termine.filter((t) => t.datum.startsWith(prefix)).sort((a, b) => (a.datum + (a.von || '')).localeCompare(b.datum + (b.von || '')));
      $('#kal').innerHTML = liste.length
        ? `<table class="tabelle">${liste
            .map(
              (t) => `<tr class="klickbar" data-t="${t.id}"><td><i class="punkt" style="background:${esc(terminFarbe(t))}"></i> <b>${datum(t.datum)}</b><br><small>${esc([t.von, t.bis].filter(Boolean).join(' – '))}</small></td>
              <td><b>${esc(t.titel || '')}</b><br><small>${esc(t.kundeName || '')} ${esc(t.telefon || '')}</small></td>
              <td><small>${esc(t.vonAdresse || '')}${t.nachAdresse ? ` → ${esc(t.nachAdresse)}` : ''}</small></td><td>${esc(mitarbeiterNamen(t))}</td></tr>`
            )
            .join('')}</table>`
        : '<p class="leer">Keine Termine in diesem Monat.</p>';
    } else {
      const erster = new Date(kal.jahr, kal.monat, 1);
      const start = new Date(erster);
      start.setDate(1 - ((erster.getDay() + 6) % 7));
      const tage = [];
      for (let i = 0; i < 42; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        tage.push(d);
      }
      const h = heute();
      $('#kal').innerHTML = `<div class="kal-raster">${WOCHENTAGE.map((w) => `<div class="kal-wt">${w}</div>`).join('')}${tage
        .map((d) => {
          const iso = isoDatum(d);
          const tt = termine.filter((t) => t.datum === iso).sort((a, b) => (a.von || '').localeCompare(b.von || ''));
          return `<div class="kal-tag ${d.getMonth() !== kal.monat ? 'fremd' : ''} ${iso === h ? 'heute' : ''}" data-tag="${iso}">
            <span class="kal-nr">${d.getDate()}</span>
            ${tt.map((t) => `<div class="kal-termin" data-t="${t.id}" style="--f:${esc(terminFarbe(t))}" title="${esc(`${t.titel || ''} – ${mitarbeiterNamen(t)}`)}">${t.von ? `<b>${esc(t.von)}</b> ` : ''}${esc(t.titel || t.kundeName || 'Termin')}</div>`).join('')}
          </div>`;
        })
        .join('')}</div>`;
      $$('.kal-tag').forEach((el) => (el.onclick = (e) => { if (!e.target.closest('[data-t]')) terminDialog({ datum: el.dataset.tag, mitarbeiterIds: kal.filter ? [kal.filter] : [] }, zeichne); }));
    }
    $$('#kal [data-t]').forEach((el) => (el.onclick = () => terminDialog(S.termine.find((t) => t.id === el.dataset.t), zeichne)));
  };

  const monatPlus = (n) => {
    kal.monat += n;
    if (kal.monat < 0) { kal.monat = 11; kal.jahr -= 1; }
    if (kal.monat > 11) { kal.monat = 0; kal.jahr += 1; }
    zeichne();
  };
  $('#k-zurueck').onclick = () => monatPlus(-1);
  $('#k-vor').onclick = () => monatPlus(1);
  $('#k-heute').onclick = () => { kal.jahr = new Date().getFullYear(); kal.monat = new Date().getMonth(); zeichne(); };
  $('#k-filter').onchange = (e) => { kal.filter = e.target.value; zeichne(); };
  $('#k-ansicht').onchange = (e) => { kal.ansicht = e.target.value; zeichne(); };
  $('#t-neu').onclick = () => terminDialog({ datum: heute(), mitarbeiterIds: kal.filter ? [kal.filter] : [] }, zeichne);
  $('#t-ics').onclick = () => {
    const name = kal.filter ? S.mitarbeiter.find((m) => m.id === kal.filter)?.name : 'Alle';
    download(new Blob([icsExport(sichtbar())], { type: 'text/calendar;charset=utf-8' }), `Termine_${name}.ics`);
  };
  zeichne();
}

function icsExport(termine) {
  const f = (d, t) => `${d.replace(/-/g, '')}T${(t || '08:00').replace(':', '')}00`;
  const e = (v) => String(v || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => `\\${m}`);
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
      `DESCRIPTION:${e(terminText(t))}`,
      'END:VEVENT'
    );
  });
  zeilen.push('END:VCALENDAR');
  return zeilen.join('\r\n');
}

function terminText(t) {
  return [
    `${datum(t.datum)}${t.von ? `, ${t.von}` : ''}${t.bis ? ` – ${t.bis} Uhr` : t.von ? ' Uhr' : ''}`,
    t.kundeName ? `Kunde: ${t.kundeName}${t.telefon ? ` (Tel. ${t.telefon})` : ''}` : '',
    t.vonAdresse ? `Von: ${t.vonAdresse}` : '',
    t.nachAdresse ? `Nach: ${t.nachAdresse}` : '',
    t.fahrzeug ? `Fahrzeug: ${t.fahrzeug}` : '',
    mitarbeiterNamen(t) ? `Team: ${mitarbeiterNamen(t)}` : '',
    t.notiz ? `Hinweise: ${t.notiz}` : ''
  ]
    .filter(Boolean)
    .join('\n');
}

function terminDialog(t, fertig = () => {}) {
  const { el, close } = modal(t.id ? 'Termin bearbeiten' : 'Neuer Termin', `
    <div class="formular">
      <div class="raster-3">
        <label>Datum<input type="date" id="t-datum" value="${esc(t.datum || heute())}"></label>
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
      </div>
      <div class="label">Mitarbeiter</div>
      <div class="mitarbeiter-wahl">${S.mitarbeiter.length
        ? S.mitarbeiter.map((m) => `<label class="chip"><input type="checkbox" value="${m.id}" ${(t.mitarbeiterIds || []).includes(m.id) ? 'checked' : ''}><i style="background:${esc(m.farbe)}"></i>${esc(m.name)}</label>`).join('')
        : '<span class="hilfe">Noch keine Mitarbeiter – unter „Mitarbeiter“ anlegen.</span>'}</div>
      <label>Hinweise für das Team<textarea id="t-notiz" rows="3" placeholder="z. B. 4. OG ohne Aufzug, Klavier, Halteverbot beantragt">${esc(t.notiz || '')}</textarea></label>
      ${t.dokumentId ? `<p><a href="#/dokument/${esc(t.dokumentId)}" id="t-doklink">Zugehöriges Dokument öffnen →</a></p>` : ''}
      <div class="btn-gruppe rechts">
        ${t.id ? '<button class="btn rot" id="t-del">Löschen</button>' : ''}
        <button class="btn" id="t-mail" title="Termin per E-Mail an die ausgewählten Mitarbeiter">✉ Team informieren</button>
        <button class="btn btn-primaer" id="t-ok">Speichern</button>
      </div>
    </div>`);

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
      mitarbeiterIds: $$('.mitarbeiter-wahl input:checked', el).map((i) => i.value),
      notiz: $('#t-notiz', el).value
    };
  };
  $('#t-kunde', el).onchange = () => {
    const k = S.kunden.find((x) => x.name === $('#t-kunde', el).value);
    if (k) {
      if (!$('#t-tel', el).value) $('#t-tel', el).value = k.telefon || '';
      if (!$('#t-vonadr', el).value) $('#t-vonadr', el).value = [k.strasse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    }
  };
  if ($('#t-doklink', el)) $('#t-doklink', el).onclick = close;
  $('#t-ok', el).onclick = async () => {
    const w = werte();
    if (!w.datum) return toast('Bitte Datum wählen', 'fehler');
    Object.assign(t, await speichere('termine', w));
    toast('Termin gespeichert');
    close();
    fertig();
  };
  if (t.id)
    $('#t-del', el).onclick = async () => {
      if (!bestaetigen('Termin löschen?')) return;
      await loesche('termine', t.id);
      close();
      fertig();
    };
  $('#t-mail', el).onclick = async () => {
    const w = werte();
    const empfaenger = w.mitarbeiterIds.map((id) => S.mitarbeiter.find((m) => m.id === id)?.email).filter(Boolean);
    if (!empfaenger.length) return toast('Die ausgewählten Mitarbeiter haben keine E-Mail-Adresse hinterlegt.', 'fehler');
    try {
      const saved = await speichere('termine', w);
      Object.assign(t, saved);
      await api('POST', '/api-mail', {
        an: empfaenger.join(', '),
        betreff: `Einsatz am ${datum(w.datum)}${w.von ? ` um ${w.von}` : ''}: ${w.titel || w.kundeName || 'Termin'}`,
        text: `Hallo,\n\nhier die Infos zum nächsten Einsatz:\n\n${terminText(saved)}\n\nViele Grüße\n${S.settings.firma.name}`
      });
      toast(`E-Mail an ${empfaenger.length} Mitarbeiter gesendet`);
      close();
      fertig();
    } catch (err) {
      toast(err.message, 'fehler');
    }
  };
}

// ---------- Mitarbeiter ----------
function viewMitarbeiter() {
  $('#main').innerHTML = `
    <div class="seiten-kopf"><h1>Mitarbeiter</h1><button class="btn btn-primaer" id="m-neu">+ Mitarbeiter</button></div>
    <div class="karte"><table class="tabelle" id="m-tabelle"></table></div>`;
  const zeichne = () => {
    if (!$('#m-tabelle')) return;
    const h = heute();
    $('#m-tabelle').innerHTML = S.mitarbeiter.length
      ? `<thead><tr><th>Name</th><th>Telefon</th><th>E-Mail</th><th>Nächster Einsatz</th><th class="c-num">Einsätze ${new Date().getFullYear()}</th></tr></thead><tbody>${S.mitarbeiter
          .map((m) => {
            const seine = S.termine.filter((t) => (t.mitarbeiterIds || []).includes(m.id));
            const naechster = seine.filter((t) => t.datum >= h).sort((a, b) => a.datum.localeCompare(b.datum))[0];
            const anzahl = seine.filter((t) => t.datum.startsWith(String(new Date().getFullYear())) && t.status !== 'abgesagt').length;
            return `<tr class="klickbar" data-id="${m.id}"><td><i class="punkt" style="background:${esc(m.farbe)}"></i> <b>${esc(m.name)}</b></td><td>${esc(m.telefon || '')}</td><td>${esc(m.email || '')}</td><td>${naechster ? `${datum(naechster.datum)} – ${esc(naechster.titel || '')}` : '–'}</td><td class="c-num">${anzahl}</td></tr>`;
          })
          .join('')}</tbody>`
      : '<tbody><tr><td class="leer">Noch keine Mitarbeiter angelegt.</td></tr></tbody>';
    $$('#m-tabelle tr[data-id]').forEach((tr) => (tr.onclick = () => mitarbeiterDialog(S.mitarbeiter.find((m) => m.id === tr.dataset.id), zeichne)));
  };
  $('#m-neu').onclick = () => mitarbeiterDialog({ farbe: CHART_FARBEN[S.mitarbeiter.length % CHART_FARBEN.length] }, zeichne);
  zeichne();
}

function mitarbeiterDialog(m, fertig) {
  const { el, close } = modal(m.id ? m.name : 'Neuer Mitarbeiter', `
    <div class="formular"><div class="raster-2">
      <label>Name *<input id="ma-name" value="${esc(m.name || '')}"></label>
      <label>Farbe im Kalender<input type="color" id="ma-farbe" value="${esc(m.farbe || '#E53935')}"></label>
      <label>Telefon<input id="ma-tel" value="${esc(m.telefon || '')}"></label>
      <label>E-Mail (für Einsatz-Infos)<input id="ma-mail" type="email" value="${esc(m.email || '')}"></label>
      <label>Funktion<input id="ma-rolle" value="${esc(m.rolle || '')}" placeholder="z. B. Fahrer, Helfer"></label>
      <label>Stundenlohn (€)<input id="ma-lohn" inputmode="decimal" value="${m.stundenlohn ? esc(zahl(m.stundenlohn)) : ''}"></label>
    </div>
    <div class="btn-gruppe rechts">${m.id ? '<button class="btn rot" id="ma-del">Löschen</button>' : ''}<button class="btn btn-primaer" id="ma-ok">Speichern</button></div></div>`);
  $('#ma-ok', el).onclick = async () => {
    const name = $('#ma-name', el).value.trim();
    if (!name) return toast('Bitte Namen eingeben', 'fehler');
    await speichere('mitarbeiter', { ...m, name, farbe: $('#ma-farbe', el).value, telefon: $('#ma-tel', el).value, email: $('#ma-mail', el).value, rolle: $('#ma-rolle', el).value, stundenlohn: parseZahl($('#ma-lohn', el).value) });
    close();
    fertig();
  };
  if (m.id)
    $('#ma-del', el).onclick = async () => {
      if (!bestaetigen(`${m.name} löschen?`)) return;
      await loesche('mitarbeiter', m.id);
      close();
      fertig();
    };
}
