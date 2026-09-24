// Rechnungen & Kostenvoranschläge: Liste, Editor, E-Mail
const STATUS = {
  rechnung: { entwurf: 'Entwurf', offen: 'Offen', bezahlt: 'Bezahlt', storniert: 'Storniert' },
  angebot: { entwurf: 'Entwurf', offen: 'Versendet', angenommen: 'Angenommen', abgelehnt: 'Abgelehnt' }
};
const TYP_NAME = { rechnung: 'Rechnungen', angebot: 'Kostenvoranschläge' };

function istUeberfaellig(d) {
  return d.typ === 'rechnung' && d.status === 'offen' && d.faelligAm && d.faelligAm < heute();
}

function statusBadge(d) {
  if (istUeberfaellig(d)) return '<span class="badge badge-rot">Überfällig</span>';
  return `<span class="badge badge-${esc(d.status)}">${esc(STATUS[d.typ][d.status] || d.status)}</span>`;
}

// ---------- Liste ----------
function viewDokumentListe(typ) {
  const jahre = [...new Set(S.dokumente.filter((d) => d.typ === typ).map((d) => (d.datum || '').slice(0, 4)))].sort().reverse();
  $('#main').innerHTML = `
    <div class="seiten-kopf">
      <h1>${TYP_NAME[typ]}</h1>
      <a class="btn btn-primaer" href="#/neu/${typ}">+ ${typ === 'rechnung' ? 'Neue Rechnung' : 'Neuer Kostenvoranschlag'}</a>
    </div>
    <div class="filter-leiste">
      <input type="search" id="f-suche" placeholder="Suchen (Kunde, Nummer, Betreff)…">
      <select id="f-status"><option value="">Alle Status</option>${Object.entries(STATUS[typ]).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}${typ === 'rechnung' ? '<option value="ueberfaellig">Überfällig</option>' : ''}</select>
      <select id="f-jahr"><option value="">Alle Jahre</option>${jahre.map((j) => `<option>${j}</option>`).join('')}</select>
    </div>
    <div class="karte"><table class="tabelle" id="doc-tabelle"></table></div>`;

  const zeichne = () => {
    const q = $('#f-suche').value.toLowerCase();
    const st = $('#f-status').value;
    const jahr = $('#f-jahr').value;
    const liste = S.dokumente
      .filter((d) => d.typ === typ)
      .filter((d) => !q || [d.nummer, d.kunde?.name, d.kunde?.firma, d.betreff].join(' ').toLowerCase().includes(q))
      .filter((d) => !st || (st === 'ueberfaellig' ? istUeberfaellig(d) : d.status === st))
      .filter((d) => !jahr || (d.datum || '').startsWith(jahr))
      .sort((a, b) => (b.datum || '').localeCompare(a.datum || '') || (b.nummer || '').localeCompare(a.nummer || ''));
    const summe = liste.reduce((a, d) => a + berechne(d).brutto, 0);
    $('#doc-tabelle').innerHTML = liste.length
      ? `<thead><tr><th>Nummer</th><th>Datum</th><th>Kunde</th><th>Betreff</th><th>Status</th><th class="c-num">Betrag</th></tr></thead>
        <tbody>${liste
          .map(
            (d) => `<tr class="klickbar" data-id="${d.id}">
              <td><b>${esc(d.nummer)}</b></td><td>${datum(d.datum)}</td>
              <td>${esc(d.kunde?.firma || d.kunde?.name || '–')}</td><td>${esc(d.betreff || '')}</td>
              <td>${statusBadge(d)}</td><td class="c-num">${euro(berechne(d).brutto)}</td></tr>`
          )
          .join('')}</tbody>
        <tfoot><tr><td colspan="5">${liste.length} Dokument(e)</td><td class="c-num"><b>${euro(summe)}</b></td></tr></tfoot>`
      : `<tbody><tr><td class="leer">Noch nichts vorhanden. <a href="#/neu/${typ}">Jetzt erstellen</a></td></tr></tbody>`;
    $$('#doc-tabelle tr[data-id]').forEach((tr) => (tr.onclick = () => (location.hash = `#/dokument/${tr.dataset.id}`)));
  };
  ['f-suche', 'f-status', 'f-jahr'].forEach((id) => ($('#' + id).oninput = zeichne));
  zeichne();
}

// ---------- Neues Dokument ----------
function neuesDokument(typ, vorlage = {}) {
  const s = S.settings;
  const d = heute();
  return {
    typ,
    nummer: '',
    status: 'entwurf',
    datum: d,
    leistungsdatum: typ === 'rechnung' ? d : '', // Pflichtangabe auf Rechnungen (§ 14 UStG)
    faelligAm: plusTage(d, s.zahlungszielTage),
    gueltigBis: plusTage(d, s.angebotGueltigTage),
    kundeId: '',
    kunde: { name: '', firma: '', strasse: '', plz: '', ort: '', email: '', telefon: '' },
    betreff: '',
    einleitung: typ === 'rechnung' ? s.texte.rechnungEinleitung : s.texte.angebotEinleitung,
    schlusstext: typ === 'rechnung' ? s.texte.rechnungSchluss : s.texte.angebotSchluss,
    positionen: [{ beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0, ustSatz: s.steuer.satz }],
    rabattProzent: 0,
    anzahlungProzent: 0,
    zeigeAnteil: false,
    steuerModus: s.steuer.modus,
    kategorie: 'Umzug',
    feldWerte: {},
    extraFelder: [],
    verlauf: [],
    ...vorlage
  };
}

// ---------- Editor ----------
async function viewDokument(id, neuTyp) {
  let doc;
  if (id) {
    const orig = S.dokumente.find((d) => d.id === id);
    if (!orig) return (location.hash = '#/dashboard');
    doc = JSON.parse(JSON.stringify(orig));
  } else {
    doc = neuesDokument(neuTyp);
    const vorKunde = S.kunden.find((k) => k.id === merker.get('vorKunde'));
    merker.del('vorKunde');
    if (vorKunde) {
      const { name, firma, strasse, plz, ort, email, telefon, kundennummer } = vorKunde;
      doc.kundeId = vorKunde.id;
      doc.kunde = { name, firma, strasse, plz, ort, email, telefon, kundennummer };
    }
  }
  const s = S.settings;
  const istR = doc.typ === 'rechnung';
  let geaendert = false;

  const eigeneFelder = s.eigeneFelder.filter((f) => f.fuer === 'beide' || f.fuer === doc.typ);

  $('#main').innerHTML = `
    <div class="seiten-kopf">
      <div>
        <a href="#/${istR ? 'rechnungen' : 'angebote'}" class="zurueck">← ${TYP_NAME[doc.typ]}</a>
        <h1>${id ? `${istR ? 'Rechnung' : 'Kostenvoranschlag'} ${esc(doc.nummer)}` : istR ? 'Neue Rechnung' : 'Neuer Kostenvoranschlag'} ${id ? statusBadge(doc) : ''}</h1>
      </div>
      <div class="btn-gruppe" id="aktionen"></div>
    </div>
    <div class="editor-layout">
      <div class="editor-form">
        <div class="karte">
          <h3>Kunde</h3>
          <div class="raster-2">
            <label class="span-2">Kunde auswählen
              <select id="kundeWahl"><option value="">– neuer / einmaliger Kunde –</option>${S.kunden
                .slice()
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map((k) => `<option value="${k.id}" ${k.id === doc.kundeId ? 'selected' : ''}>${esc(k.name)}${k.firma ? ` (${esc(k.firma)})` : ''}</option>`)
                .join('')}</select>
            </label>
            <label>Name<input data-k="name" value="${esc(doc.kunde.name)}"></label>
            <label>Firma (optional)<input data-k="firma" value="${esc(doc.kunde.firma)}"></label>
            <label class="span-2">Straße & Nr.<input data-k="strasse" value="${esc(doc.kunde.strasse)}"></label>
            <label>PLZ<input data-k="plz" value="${esc(doc.kunde.plz)}"></label>
            <label>Ort<input data-k="ort" value="${esc(doc.kunde.ort)}"></label>
            <label>E-Mail<input data-k="email" type="email" value="${esc(doc.kunde.email)}"></label>
            <label>Telefon<input data-k="telefon" value="${esc(doc.kunde.telefon)}"></label>
          </div>
          <label class="checkbox"><input type="checkbox" id="kundeSpeichern" ${doc.kundeId ? 'disabled' : 'checked'}> Kunde in Kundenliste speichern</label>
        </div>

        <div class="karte">
          <h3>Angaben</h3>
          <div class="raster-2">
            <label>Nummer<input data-f="nummer" value="${esc(doc.nummer)}" placeholder="wird beim Speichern vergeben"></label>
            <label>Status<select data-f="status">${Object.entries(STATUS[doc.typ]).map(([k, v]) => `<option value="${k}" ${doc.status === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
            <label>${istR ? 'Rechnungsdatum' : 'Datum'}<input type="date" data-f="datum" value="${esc(doc.datum)}"></label>
            <label>${istR ? 'Leistungsdatum / Umzugstag' : 'Geplanter Umzugstermin'}<input type="date" data-f="leistungsdatum" value="${esc(doc.leistungsdatum)}"></label>
            ${istR
              ? `<label>Fällig am<input type="date" data-f="faelligAm" value="${esc(doc.faelligAm)}"></label>`
              : `<label>Gültig bis<input type="date" data-f="gueltigBis" value="${esc(doc.gueltigBis)}"></label>`}
            <label>Kategorie (für Auswertung)<select data-f="kategorie">${s.kategorienEinnahmen.map((k) => `<option ${doc.kategorie === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
            <label class="span-2">Überschrift / Betreff (optional)<input data-f="betreff" value="${esc(doc.betreff)}" placeholder="z. B. Umzug am 03.10."></label>
            <label class="span-2">Titel auf dem Dokument<input data-f="titel" value="${esc(doc.titel || '')}" placeholder="${istR ? 'Rechnung' : 'Kostenvoranschlag'}"></label>
          </div>
          <h4>Zusätzliche Felder</h4>
          <div class="raster-2" id="eigeneFelder">
            ${eigeneFelder.map((f) => `<label>${esc(f.label)}<input data-fw="${esc(f.id)}" value="${esc((doc.feldWerte || {})[f.id] || '')}"></label>`).join('')}
          </div>
          <div id="extraFelder"></div>
          <button class="btn btn-klein" id="feldPlus">+ Feld hinzufügen</button>
          <span class="hilfe">Feste Felder für alle Dokumente: Einstellungen → Eigene Felder</span>
        </div>

        <div class="karte">
          <div class="karte-kopf">
            <h3>Positionen</h3>
            <div class="btn-gruppe">
              <select id="artikelWahl"><option value="">+ aus Preisliste…</option>${s.artikel.map((a, i) => `<option value="${i}">${esc(a.beschreibung)} – ${euro(a.preis)}/${esc(a.einheit)}</option>`).join('')}</select>
              <button class="btn btn-klein" id="posPlus">+ Position</button>
            </div>
          </div>
          <div id="positionen"></div>
          <datalist id="einheiten">${s.einheiten.map((e) => `<option value="${esc(e)}">`).join('')}</datalist>
        </div>

        <div class="karte">
          <h3>Steuer, Rabatt & Anzahlung</h3>
          <div class="raster-3">
            <label>Besteuerung
              <select data-f="steuerModus">
                <option value="klein" ${doc.steuerModus === 'klein' ? 'selected' : ''}>Kleinunternehmer (§ 19 UStG)</option>
                <option value="regel" ${doc.steuerModus === 'regel' ? 'selected' : ''}>Mit Umsatzsteuer</option>
              </select>
            </label>
            <label>Rabatt in %<input data-f="rabattProzent" inputmode="decimal" value="${esc(zahl(doc.rabattProzent))}"></label>
            <label>Anzahlung in %<input data-f="anzahlungProzent" inputmode="decimal" value="${esc(zahl(doc.anzahlungProzent))}"></label>
          </div>
          <label class="checkbox"><input type="checkbox" data-f="zeigeAnteil" ${doc.zeigeAnteil ? 'checked' : ''}> Prozent-Anteil jeder Position am Gesamtbetrag anzeigen</label>
          <div id="summenBox" class="summen-box"></div>
        </div>

        <div class="karte">
          <h3>Texte</h3>
          <label>Einleitung<textarea data-f="einleitung" rows="3">${esc(doc.einleitung)}</textarea></label>
          <label>Schlusstext<textarea data-f="schlusstext" rows="3">${esc(doc.schlusstext)}</textarea></label>
          <span class="hilfe">Platzhalter: {KUNDE} {NUMMER} {BETRAG} {DATUM} {FAELLIG} {GUELTIG} {ZIEL} {FIRMA}</span>
          <label>Interne Notiz (nicht auf dem Dokument)<textarea data-f="notiz" rows="2">${esc(doc.notiz || '')}</textarea></label>
        </div>
        ${doc.verlauf && doc.verlauf.length ? `<div class="karte"><h3>Verlauf</h3><ul class="verlauf">${doc.verlauf.map((v) => `<li><span>${datum(v.datum)}</span> ${esc(v.text)}</li>`).join('')}</ul></div>` : ''}
      </div>
      <div class="editor-vorschau">
        <div class="vorschau-rahmen"><div id="vorschau" class="vorschau-skaliert"></div></div>
      </div>
    </div>`;

  // --- Aktionen ---
  const aktionen = [];
  aktionen.push('<button class="btn btn-primaer" data-a="speichern">Speichern</button>');
  aktionen.push('<button class="btn" data-a="pdf">PDF</button>');
  aktionen.push('<button class="btn" data-a="drucken">Drucken</button>');
  aktionen.push('<button class="btn" data-a="mail">✉ Per E-Mail senden</button>');
  if (istR && doc.status !== 'bezahlt') aktionen.push('<button class="btn btn-gruen" data-a="bezahlt">Als bezahlt markieren</button>');
  if (istR && doc.status === 'bezahlt') aktionen.push('<button class="btn" data-a="unbezahlt">Zahlung zurücknehmen</button>');
  if (istR && istUeberfaellig(doc)) aktionen.push('<button class="btn" data-a="erinnerung">Zahlungserinnerung</button>');
  if (!istR) aktionen.push('<button class="btn btn-gruen" data-a="umwandeln">→ In Rechnung umwandeln</button>');
  aktionen.push(`<details class="mehr"><summary class="btn">⋯</summary><div>
    <button data-a="termin">Termin im Kalender anlegen</button>
    <button data-a="kopie">Duplizieren</button>
    ${id ? '<button data-a="loeschen" class="rot">Löschen</button>' : ''}</div></details>`);
  $('#aktionen').innerHTML = aktionen.join('');

  // --- Bindungen ---
  const aenderung = () => {
    geaendert = true;
    aktualisiere();
  };

  $$('[data-f]').forEach((el) => {
    el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date' ? 'change' : 'input', () => {
      const f = el.dataset.f;
      doc[f] = el.type === 'checkbox' ? el.checked : ['rabattProzent', 'anzahlungProzent'].includes(f) ? parseZahl(el.value) : el.value;
      if (f === 'datum') {
        const tage = istR ? s.zahlungszielTage : s.angebotGueltigTage;
        const feld = istR ? 'faelligAm' : 'gueltigBis';
        doc[feld] = plusTage(doc.datum, tage);
        $(`[data-f="${feld}"]`).value = doc[feld];
      }
      if (f === 'steuerModus') zeichnePositionen();
      aenderung();
    });
  });
  $$('[data-k]').forEach((el) => el.addEventListener('input', () => { doc.kunde[el.dataset.k] = el.value; aenderung(); }));
  $$('[data-fw]').forEach((el) => el.addEventListener('input', () => { doc.feldWerte = doc.feldWerte || {}; doc.feldWerte[el.dataset.fw] = el.value; aenderung(); }));

  $('#kundeWahl').onchange = (e) => {
    const k = S.kunden.find((x) => x.id === e.target.value);
    doc.kundeId = k ? k.id : '';
    doc.kunde = k
      ? { name: k.name, firma: k.firma, strasse: k.strasse, plz: k.plz, ort: k.ort, email: k.email, telefon: k.telefon, kundennummer: k.kundennummer }
      : { name: '', firma: '', strasse: '', plz: '', ort: '', email: '', telefon: '' };
    $$('[data-k]').forEach((el) => (el.value = doc.kunde[el.dataset.k] || ''));
    $('#kundeSpeichern').disabled = !!k;
    aenderung();
  };

  // Zusätzliche Felder nur für dieses Dokument
  const zeichneExtra = () => {
    doc.extraFelder = doc.extraFelder || [];
    $('#extraFelder').innerHTML = doc.extraFelder
      .map((x, i) => `<div class="extra-feld"><input data-xl="${i}" placeholder="Bezeichnung (z. B. Etage)" value="${esc(x.label)}"><input data-xw="${i}" placeholder="Wert" value="${esc(x.wert)}"><button class="btn-icon" data-xd="${i}" title="Entfernen">✕</button></div>`)
      .join('');
    $$('[data-xl]').forEach((el) => (el.oninput = () => { doc.extraFelder[el.dataset.xl].label = el.value; aenderung(); }));
    $$('[data-xw]').forEach((el) => (el.oninput = () => { doc.extraFelder[el.dataset.xw].wert = el.value; aenderung(); }));
    $$('[data-xd]').forEach((el) => (el.onclick = () => { doc.extraFelder.splice(el.dataset.xd, 1); zeichneExtra(); aenderung(); }));
  };
  $('#feldPlus').onclick = () => { doc.extraFelder = doc.extraFelder || []; doc.extraFelder.push({ label: '', wert: '' }); zeichneExtra(); };
  zeichneExtra();

  // Positionen
  function zeichnePositionen() {
    const regel = doc.steuerModus === 'regel';
    $('#positionen').innerHTML = `<table class="pos-tabelle">
      <thead><tr><th></th><th>Beschreibung</th><th>Menge</th><th>Einheit</th><th>${regel ? 'Netto-Preis' : 'Preis'}</th>${regel ? '<th>USt.</th>' : ''}<th class="c-num">Gesamt</th><th></th></tr></thead>
      <tbody>${doc.positionen
        .map(
          (p, i) => `<tr data-i="${i}">
          <td class="pos-griff"><button class="btn-icon" data-hoch="${i}" title="nach oben">▲</button><button class="btn-icon" data-runter="${i}" title="nach unten">▼</button></td>
          <td><textarea data-p="beschreibung" rows="1" placeholder="z. B. Umzugshelfer">${esc(p.beschreibung)}</textarea></td>
          <td><input data-p="menge" inputmode="decimal" value="${esc(zahl(p.menge, 3))}" class="schmal"></td>
          <td><input data-p="einheit" list="einheiten" value="${esc(p.einheit)}" class="schmal"></td>
          <td><input data-p="preis" inputmode="decimal" value="${esc(zahl(p.preis))}" class="schmal"></td>
          ${regel ? `<td><select data-p="ustSatz">${[19, 7, 0].map((x) => `<option value="${x}" ${Number(p.ustSatz ?? 19) === x ? 'selected' : ''}>${x} %</option>`).join('')}</select></td>` : ''}
          <td class="c-num pos-summe"></td>
          <td><button class="btn-icon" data-del="${i}" title="Position löschen">✕</button></td>
        </tr>`
        )
        .join('')}</tbody></table>`;
    $$('#positionen [data-p]').forEach((el) => {
      const i = Number(el.closest('tr').dataset.i);
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => {
        const k = el.dataset.p;
        doc.positionen[i][k] = ['menge', 'preis', 'ustSatz'].includes(k) ? parseZahl(el.value) : el.value;
        if (el.tagName === 'TEXTAREA') autoHoehe(el);
        aenderung();
      });
      if (el.tagName === 'TEXTAREA') autoHoehe(el);
    });
    $$('#positionen [data-del]').forEach((b) => (b.onclick = () => { doc.positionen.splice(Number(b.dataset.del), 1); zeichnePositionen(); aenderung(); }));
    $$('#positionen [data-hoch]').forEach((b) => (b.onclick = () => verschiebe(Number(b.dataset.hoch), -1)));
    $$('#positionen [data-runter]').forEach((b) => (b.onclick = () => verschiebe(Number(b.dataset.runter), 1)));
    aktualisiere();
  }
  function verschiebe(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= doc.positionen.length) return;
    [doc.positionen[i], doc.positionen[j]] = [doc.positionen[j], doc.positionen[i]];
    zeichnePositionen();
    aenderung();
  }
  $('#posPlus').onclick = () => {
    doc.positionen.push({ beschreibung: '', menge: 1, einheit: 'Std.', preis: 0, ustSatz: s.steuer.satz });
    zeichnePositionen();
    $$('#positionen textarea').pop().focus();
    aenderung();
  };
  $('#artikelWahl').onchange = (e) => {
    const a = s.artikel[e.target.value];
    if (!a) return;
    doc.positionen.push({ beschreibung: a.beschreibung, menge: 1, einheit: a.einheit, preis: a.preis, ustSatz: s.steuer.satz });
    e.target.value = '';
    zeichnePositionen();
    aenderung();
  };

  function aktualisiere() {
    const c = berechne(doc);
    $$('#positionen tr[data-i]').forEach((tr) => {
      const p = c.positionen[Number(tr.dataset.i)];
      $('.pos-summe', tr).textContent = p ? euro(p.betrag) : '';
    });
    const zeilen = [['Summe Positionen', euro(c.summePos)]];
    if (c.rabatt) zeilen.push([`Rabatt ${prozent(c.rabatt)}`, `– ${euro(c.rabattBetrag)}`]);
    if (!c.klein) {
      zeilen.push(['Netto', euro(c.netto)]);
      c.steuern.forEach((st) => zeilen.push([`USt. ${zahl(st.satz)} %`, euro(st.betrag)]));
    }
    zeilen.push([c.klein ? 'Gesamt' : 'Gesamt brutto', euro(c.brutto)]);
    if (c.anzahlungProzent) {
      zeilen.push([`Anzahlung ${prozent(c.anzahlungProzent)}`, euro(c.anzahlung)]);
      zeilen.push(['Restbetrag', euro(c.rest)]);
    }
    $('#summenBox').innerHTML = zeilen.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('');
    $('#vorschau').innerHTML = renderDokument(doc);
    skaliereVorschau($('#vorschau'));
  }

  zeichnePositionen();

  // --- Speichern ---
  async function speichern({ still = false } = {}) {
    if (!doc.nummer) doc.nummer = (await api('POST', `/api/nummer/${doc.typ}`)).nummer;
    const doppelt = S.dokumente.find((d) => d.typ === doc.typ && d.nummer === doc.nummer && d.id !== doc.id);
    if (doppelt) throw new Error(`Die Nummer ${doc.nummer} ist schon vergeben. Bitte eine andere Nummer eintragen.`);
    if (doc.typ === 'rechnung' && !doc.leistungsdatum) toast('Tipp: Auf Rechnungen muss das Leistungsdatum stehen (§ 14 UStG).', 'fehler');
    if (!doc.kundeId && $('#kundeSpeichern').checked && doc.kunde.name) {
      const k = await speichere('kunden', { ...doc.kunde, kundennummer: naechsteKundennummer() });
      doc.kundeId = k.id;
      doc.kunde.kundennummer = k.kundennummer;
    }
    const saved = await speichere('dokumente', doc);
    Object.assign(doc, saved);
    if (doc.typ === 'rechnung') await synchronisiereBuchung(saved);
    geaendert = false;
    if (!still) toast('Gespeichert');
    if (!id) {
      history.replaceState(null, '', `#/dokument/${saved.id}`);
      return viewDokument(saved.id);
    }
    return saved;
  }

  $('#aktionen').onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    try {
      if (a === 'speichern') {
        await speichern();
        viewDokument(doc.id);
      } else if (a === 'pdf') {
        if (geaendert || !doc.id) await speichern({ still: true });
        toast('PDF wird erstellt…');
        download(await dokumentPdf(doc), dateiname(doc));
      } else if (a === 'drucken') {
        drucken(renderDokument(doc));
      } else if (a === 'mail' || a === 'erinnerung') {
        if (geaendert || !doc.id) await speichern({ still: true });
        mailDialog(doc, a === 'erinnerung' ? 'erinnerung' : doc.typ);
      } else if (a === 'bezahlt') {
        const am = await datumAbfragen('Zahlung erfasst', 'Bezahlt am');
        if (!am) return;
        doc.bezahltAm = am;
        doc.status = 'bezahlt';
        doc.verlauf = [...(doc.verlauf || []), { datum: heute(), text: `Als bezahlt markiert (${datum(am)})` }];
        await speichern();
        viewDokument(doc.id);
      } else if (a === 'unbezahlt') {
        doc.status = 'offen';
        doc.bezahltAm = '';
        await speichern();
        viewDokument(doc.id);
      } else if (a === 'umwandeln') {
        if (geaendert || !doc.id) await speichern({ still: true });
        const r = neuesDokument('rechnung', {
          kundeId: doc.kundeId,
          kunde: { ...doc.kunde },
          leistungsdatum: doc.leistungsdatum,
          betreff: doc.betreff.replace(/Kostenvoranschlag/gi, 'Rechnung'),
          positionen: JSON.parse(JSON.stringify(doc.positionen)),
          rabattProzent: doc.rabattProzent,
          steuerModus: doc.steuerModus,
          kategorie: doc.kategorie,
          feldWerte: { ...(doc.feldWerte || {}) },
          extraFelder: JSON.parse(JSON.stringify(doc.extraFelder || [])),
          ausAngebot: doc.nummer
        });
        r.nummer = (await api('POST', '/api/nummer/rechnung')).nummer;
        const saved = await speichere('dokumente', r);
        doc.status = 'angenommen';
        doc.verlauf = [...(doc.verlauf || []), { datum: heute(), text: `In Rechnung ${saved.nummer} umgewandelt` }];
        await speichere('dokumente', doc);
        toast(`Rechnung ${saved.nummer} erstellt`);
        location.hash = `#/dokument/${saved.id}`;
      } else if (a === 'kopie') {
        const kopie = { ...JSON.parse(JSON.stringify(doc)), id: undefined, nummer: '', status: 'entwurf', datum: heute(), bezahltAm: '', verlauf: [] };
        delete kopie.id;
        const saved = await speichere('dokumente', { ...kopie, nummer: (await api('POST', `/api/nummer/${doc.typ}`)).nummer });
        location.hash = `#/dokument/${saved.id}`;
      } else if (a === 'termin') {
        if (geaendert || !doc.id) await speichern({ still: true });
        terminDialog({
          datum: doc.leistungsdatum || heute(),
          titel: `${doc.kategorie || 'Umzug'} ${doc.kunde.name || ''}`.trim(),
          kundeId: doc.kundeId,
          kundeName: doc.kunde.name,
          telefon: doc.kunde.telefon,
          vonAdresse: (doc.feldWerte || {}).f_auszug || '',
          nachAdresse: (doc.feldWerte || {}).f_einzug || '',
          dokumentId: doc.id
        });
      } else if (a === 'loeschen') {
        if (!(await bestaetigen(`${doc.nummer} wirklich löschen?`))) return;
        await loesche('dokumente', doc.id);
        for (const b of S.buchungen.filter((x) => x.dokumentId === doc.id)) await loesche('buchungen', b.id);
        location.hash = istR ? '#/rechnungen' : '#/angebote';
      }
    } catch (err) {
      toast(err.message, 'fehler');
    }
  };

  window.onbeforeunload = () => (geaendert ? true : undefined);
  window.verlassenPruefen = () => !geaendert;
}

function datumAbfragen(titel, label) {
  return new Promise((resolve) => {
    let wert = null;
    const { el, close } = modal(titel, `<label>${esc(label)}<input type="date" id="da-datum" value="${heute()}"></label>
      <div class="btn-gruppe rechts"><button class="btn" data-nein>Abbrechen</button><button class="btn btn-gruen" data-ja>Speichern</button></div>`,
      { beimSchliessen: () => resolve(wert) });
    $('[data-nein]', el).onclick = close;
    $('[data-ja]', el).onclick = () => { wert = $('#da-datum', el).value || heute(); close(); };
  });
}

function autoHoehe(el) {
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

function naechsteKundennummer() {
  const max = S.kunden.reduce((m, k) => Math.max(m, parseInt(String(k.kundennummer || '').replace(/\D/g, ''), 10) || 0), 1000);
  return `K${max + 1}`;
}

// Bezahlte Rechnung automatisch als Einnahme in der Buchhaltung verbuchen
async function synchronisiereBuchung(doc) {
  const vorhanden = S.buchungen.find((b) => b.dokumentId === doc.id);
  if (doc.status !== 'bezahlt') {
    if (vorhanden) await loesche('buchungen', vorhanden.id);
    return;
  }
  const c = berechne(doc);
  await speichere('buchungen', {
    ...(vorhanden || {}),
    datum: doc.bezahltAm || heute(),
    typ: 'einnahme',
    kategorie: doc.kategorie || 'Umzug',
    beschreibung: `Rechnung ${doc.nummer} – ${doc.kunde?.firma || doc.kunde?.name || ''}`,
    betrag: c.brutto,
    ust: c.ust,
    belegNr: doc.nummer,
    dokumentId: doc.id
  });
}

// ---------- E-Mail-Dialog ----------
function mailDialog(doc, vorlageName) {
  const v = S.settings.email.vorlagen[vorlageName] || S.settings.email.vorlagen[doc.typ];
  const { el, close } = modal('Per E-Mail senden', `
    <div class="formular">
      <label>An<input id="m-an" type="email" value="${esc(doc.kunde?.email || '')}" placeholder="kunde@beispiel.de"></label>
      <label>CC (optional)<input id="m-cc" type="email"></label>
      <label>Vorlage<select id="m-vorlage">${Object.keys(S.settings.email.vorlagen).map((k) => `<option value="${k}" ${k === vorlageName ? 'selected' : ''}>${{ rechnung: 'Rechnung', angebot: 'Kostenvoranschlag', erinnerung: 'Zahlungserinnerung' }[k] || k}</option>`).join('')}</select></label>
      <label>Betreff<input id="m-betreff" value="${esc(platzhalter(v.betreff, doc))}"></label>
      <label>Nachricht<textarea id="m-text" rows="9">${esc(platzhalter(v.text, doc))}</textarea></label>
      <label class="checkbox"><input type="checkbox" id="m-pdf" checked> ${esc(dateiname(doc))} als PDF anhängen</label>
      <div class="btn-gruppe rechts"><button class="btn" data-close2>Abbrechen</button><button class="btn btn-primaer" id="m-senden">Senden</button></div>
    </div>`);
  $('[data-close2]', el).onclick = close;
  $('#m-vorlage', el).onchange = (e) => {
    const nv = S.settings.email.vorlagen[e.target.value];
    $('#m-betreff', el).value = platzhalter(nv.betreff, doc);
    $('#m-text', el).value = platzhalter(nv.text, doc);
  };
  $('#m-senden', el).onclick = async (e) => {
    const btn = e.target;
    const an = $('#m-an', el).value.trim();
    if (!an) return toast('Bitte E-Mail-Adresse eingeben', 'fehler');
    btn.disabled = true;
    btn.textContent = 'Wird gesendet…';
    try {
      let anhang;
      if ($('#m-pdf', el).checked) anhang = { name: dateiname(doc), base64: await blobZuBase64(await dokumentPdf(doc)) };
      await api('POST', '/api-mail', { an, cc: $('#m-cc', el).value.trim(), betreff: $('#m-betreff', el).value, text: $('#m-text', el).value, anhang });
      doc.verlauf = [...(doc.verlauf || []), { datum: heute(), text: `Per E-Mail an ${an} gesendet (${$('#m-vorlage', el).selectedOptions[0].textContent})` }];
      if (doc.status === 'entwurf') doc.status = 'offen';
      if (!doc.kunde.email) doc.kunde.email = an;
      await speichere('dokumente', doc);
      toast('E-Mail gesendet');
      close();
      viewDokument(doc.id);
    } catch (err) {
      toast(err.message, 'fehler');
      btn.disabled = false;
      btn.textContent = 'Senden';
    }
  };
}
