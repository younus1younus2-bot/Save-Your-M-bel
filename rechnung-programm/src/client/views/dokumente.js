// Rechnungen & Kostenvoranschläge: Liste (mit Mehrfachauswahl) und Editor (mit automatischem Speichern)
import backend from 'backend';
import { berechne, datum, esc, euro, heute, parseZahl, platzhalter, plusTage, prozent, zahl } from '../../shared/rechnen.js';
import { dateiname, renderDokument } from '../../shared/vorlagen.js';
import { S, api, dokumentAktion, ladeAlles, loescheMitRueckgaengig, speichere, speichereEinstellungen } from '../state.js';
import { STATUS, TYP_NAME, adressVorschlaege, docTitel, dublettenHinweis, istUeberfaellig, kundeVon, main, neuesDokument, standardSchluss, statusBadge } from '../helfer.js';
import { $, $$, abfrage, autoHoehe, bestaetigen, dauerMerker, merkeZuletzt, merker, modal, skaliereVorschau, tipp, toast, vorZeit } from '../ui.js';
import { terminDialog } from './kalender.js';

// ---------- Liste ----------
export function viewDokumentListe(typ) {
  const filter = dauerMerker.get(`filter:${typ}`, { suche: '', status: '', jahr: '' });
  const jahre = [...new Set(S.dokumente.filter((d) => d.typ === typ).map((d) => (d.datum || '').slice(0, 4)))].sort().reverse();
  const auswahl = new Set();
  main().innerHTML = `
    <div class="seiten-kopf">
      <h1>${TYP_NAME[typ]}</h1>
      <a class="btn btn-primaer" href="#/neu/${typ}" title="Tastenkürzel: N">+ ${typ === 'rechnung' ? 'Neue Rechnung' : 'Neuer Kostenvoranschlag'}</a>
    </div>
    ${tipp(`liste-${typ}`, typ === 'rechnung' ? 'Tipp: Mit den Kästchen links wählst du mehrere Rechnungen aus und markierst sie z. B. gemeinsam als bezahlt.' : 'Tipp: Ein angenommener Kostenvoranschlag wird im Editor mit einem Klick zur Rechnung.')}
    <div class="filter-leiste">
      <input type="search" id="f-suche" placeholder="Suchen (Kunde, Nummer, Betreff)…" value="${esc(filter.suche)}" aria-label="Suchen">
      <select id="f-status" aria-label="Status"><option value="">Alle Status</option>${Object.entries(STATUS[typ])
        .map(([k, v]) => `<option value="${k}" ${filter.status === k ? 'selected' : ''}>${v}</option>`)
        .join('')}${typ === 'rechnung' ? `<option value="ueberfaellig" ${filter.status === 'ueberfaellig' ? 'selected' : ''}>Überfällig</option>` : ''}</select>
      <select id="f-jahr" aria-label="Jahr"><option value="">Alle Jahre</option>${jahre.map((j) => `<option ${filter.jahr === j ? 'selected' : ''}>${j}</option>`).join('')}</select>
    </div>
    <div class="karte"><table class="tabelle" id="doc-tabelle"></table></div>
    <div class="auswahl-leiste" id="auswahl-leiste" hidden></div>`;

  const gefiltert = () => {
    const q = filter.suche.toLowerCase();
    return S.dokumente
      .filter((d) => d.typ === typ)
      .filter((d) => !q || [d.nummer, d.kunde?.name, d.kunde?.firma, d.betreff].join(' ').toLowerCase().includes(q))
      .filter((d) => !filter.status || (filter.status === 'ueberfaellig' ? istUeberfaellig(d) : d.status === filter.status))
      .filter((d) => !filter.jahr || (d.datum || '').startsWith(filter.jahr))
      .sort((a, b) => (b.datum || '').localeCompare(a.datum || '') || (b.nummer || '').localeCompare(a.nummer || ''));
  };

  const zeichneAuswahl = () => {
    const leiste = $('#auswahl-leiste');
    leiste.hidden = !auswahl.size;
    if (!auswahl.size) return;
    const docs = [...auswahl].map((id) => S.dokumente.find((d) => d.id === id)).filter(Boolean);
    const offen = docs.filter((d) => d.typ === 'rechnung' && ['offen', 'entwurf'].includes(d.status) && !d.storno);
    const ueberf = docs.filter(istUeberfaellig);
    const entwuerfe = docs.filter((d) => !d.gesperrt);
    leiste.innerHTML = `<b>${auswahl.size} ausgewählt</b>
      ${typ === 'rechnung' && offen.length ? `<button class="btn btn-gruen" data-sammel="bezahlt">Als bezahlt markieren (${offen.length})</button>` : ''}
      ${ueberf.length ? `<button class="btn" data-sammel="erinnerung">Zahlungserinnerung senden (${ueberf.length})</button>` : ''}
      <button class="btn" data-sammel="pdf">Sammel-PDF</button>
      ${entwuerfe.length ? `<button class="btn" data-sammel="loeschen">${typ === 'rechnung' ? 'Entwürfe' : ''} löschen (${entwuerfe.length})</button>` : ''}
      <button class="btn-icon" data-sammel="weg" aria-label="Auswahl aufheben">✕</button>`;
  };

  const zeichne = () => {
    dauerMerker.set(`filter:${typ}`, filter);
    const liste = gefiltert();
    const summe = liste.filter((d) => d.status !== 'storniert' && !d.storno).reduce((a, d) => a + berechne(d).brutto, 0);
    $('#doc-tabelle').innerHTML = liste.length
      ? `<thead><tr><th class="c-check"><input type="checkbox" id="alle-waehlen" aria-label="Alle auswählen"></th><th>Nummer</th><th>Datum</th><th>Kunde</th><th class="nur-breit">Betreff</th><th>Status</th><th class="c-num">Betrag</th></tr></thead>
        <tbody>${liste
          .map(
            (d) => `<tr class="klickbar" tabindex="0" data-id="${d.id}">
              <td class="c-check"><input type="checkbox" data-waehle="${d.id}" ${auswahl.has(d.id) ? 'checked' : ''} aria-label="Auswählen"></td>
              <td><b>${esc(d.nummer || 'Entwurf')}</b>${d.sprache === 'en' ? ' <span class="badge">EN</span>' : ''}</td><td>${datum(d.datum)}</td>
              <td>${esc(d.kunde?.firma || d.kunde?.name || '–')}</td><td class="nur-breit">${esc(d.betreff || '')}</td>
              <td>${statusBadge(d)}</td><td class="c-num">${euro(berechne(d).brutto)}</td></tr>`
          )
          .join('')}</tbody>
        <tfoot><tr><td></td><td colspan="5">${liste.length} Dokument(e)</td><td class="c-num"><b>${euro(summe)}</b></td></tr></tfoot>`
      : `<tbody><tr><td class="leer">Keine Treffer. <a href="#/neu/${typ}">Jetzt erstellen</a></td></tr></tbody>`;
    $$('#doc-tabelle tr[data-id]').forEach((tr) => {
      tr.onclick = (e) => {
        if (e.target.closest('.c-check')) return;
        location.hash = `#/dokument/${tr.dataset.id}`;
      };
    });
    $$('[data-waehle]').forEach((cb) => (cb.onchange = () => (cb.checked ? auswahl.add(cb.dataset.waehle) : auswahl.delete(cb.dataset.waehle), zeichneAuswahl())));
    if ($('#alle-waehlen'))
      $('#alle-waehlen').onchange = (e) => {
        liste.forEach((d) => (e.target.checked ? auswahl.add(d.id) : auswahl.delete(d.id)));
        zeichne();
        zeichneAuswahl();
      };
  };

  $('#f-suche').oninput = (e) => ((filter.suche = e.target.value), zeichne());
  $('#f-status').onchange = (e) => ((filter.status = e.target.value), zeichne());
  $('#f-jahr').onchange = (e) => ((filter.jahr = e.target.value), zeichne());

  $('#auswahl-leiste').onclick = async (e) => {
    const art = e.target.closest('[data-sammel]')?.dataset.sammel;
    if (!art) return;
    const ids = [...auswahl];
    try {
      if (art === 'weg') auswahl.clear();
      else if (art === 'bezahlt') {
        const am = await abfrage('Zahlungen erfassen', 'Bezahlt am', { typ: 'date', wert: heute() });
        if (!am) return;
        const r = await api('POST', '/api/sammel/bezahlt', { ids: ids.filter((id) => S.dokumente.find((d) => d.id === id)?.typ === 'rechnung'), datum: am });
        await ladeAlles();
        toast(`${r.ok.length} als bezahlt markiert${r.fehler.length ? `, ${r.fehler.length} übersprungen` : ''}`);
        auswahl.clear();
      } else if (art === 'pdf') {
        toast('Sammel-PDF wird erstellt…');
        await backend.download(await backend.sammelPdf(ids), `${TYP_NAME[typ]}_${heute()}.pdf`);
      } else if (art === 'erinnerung') {
        const docs = ids.map((id) => S.dokumente.find((d) => d.id === id)).filter(istUeberfaellig);
        const ohneMail = docs.filter((d) => !d.kunde?.email);
        if (
          !(await bestaetigen(`${docs.length - ohneMail.length} Zahlungserinnerung(en) per E-Mail senden?${ohneMail.length ? ` ${ohneMail.length} Kunde(n) ohne E-Mail werden übersprungen.` : ''}`, {
            ok: 'Senden'
          }))
        )
          return;
        let n = 0;
        for (const d of docs.filter((x) => x.kunde?.email)) {
          const v = S.settings.email.vorlagen.erinnerung;
          await backend.mailDokument(d, S.settings, { an: d.kunde.email, betreff: v.betreff, text: v.text, mitPdf: true, art: 'Zahlungserinnerung' });
          n += 1;
        }
        await ladeAlles();
        toast(`${n} Zahlungserinnerung(en) gesendet`);
        auswahl.clear();
      } else if (art === 'loeschen') {
        const entwuerfe = ids.map((id) => S.dokumente.find((d) => d.id === id)).filter((d) => d && !d.gesperrt);
        if (!(await bestaetigen(`${entwuerfe.length} Entwurf/Entwürfe in den Papierkorb legen?`, { ok: 'Löschen', gefahr: true }))) return;
        for (const d of entwuerfe) await api('DELETE', `/api/dokumente/${d.id}`);
        await ladeAlles();
        toast(`${entwuerfe.length} gelöscht – wiederherstellen unter Einstellungen → Papierkorb`);
        auswahl.clear();
      }
    } catch (err) {
      toast(err.message, 'fehler');
    }
    zeichne();
    zeichneAuswahl();
  };
  zeichne();
}

// ---------- Editor ----------
export function viewDokument(id, neuTyp) {
  let doc;
  if (id) {
    const orig = S.dokumente.find((d) => d.id === id);
    if (!orig) return (location.hash = '#/dashboard');
    doc = JSON.parse(JSON.stringify(orig));
    merkeZuletzt({ typ: 'dokument', id: doc.id, titel: `${docTitel(doc)} – ${doc.kunde?.name || ''}` });
  } else {
    doc = neuesDokument(neuTyp);
    const vorKunde = S.kunden.find((k) => k.id === merker.get('vorKunde'));
    const vorAuftrag = S.auftraege.find((a) => a.id === merker.get('vorAuftrag'));
    merker.del('vorKunde');
    merker.del('vorAuftrag');
    const k = vorKunde || S.kunden.find((x) => x.id === vorAuftrag?.kundeId);
    if (k) Object.assign(doc, { kundeId: k.id, kunde: kundeVon(k), sprache: k.sprache || 'de', schlusstext: standardSchluss(doc.typ, k.sprache || 'de') });
    if (vorAuftrag) doc.auftragId = vorAuftrag.id;
  }
  const s = S.settings;
  const istR = doc.typ === 'rechnung';
  const gesperrt = !!doc.gesperrt;
  const zu = gesperrt ? 'disabled' : '';
  let zuletztGespeichert = doc.geaendert ? Date.parse(doc.geaendert) : 0;
  let speicherTimer = null;
  let speichertGerade = null;
  let offeneAenderung = false;
  let letztesTextfeld = null;

  const eigeneFelder = s.eigeneFelder.filter((f) => f.fuer === 'beide' || f.fuer === doc.typ);
  const hatStrecke = eigeneFelder.some((f) => f.id === 'f_auszug') && eigeneFelder.some((f) => f.id === 'f_einzug');
  const storniertDurch = doc.storniertDurch && S.dokumente.find((d) => d.id === doc.storniertDurch);
  const bezug = doc.bezugId && S.dokumente.find((d) => d.id === doc.bezugId);

  main().innerHTML = `
    <div class="seiten-kopf editor-kopf">
      <div>
        <a href="#/${istR ? 'rechnungen' : 'angebote'}" class="zurueck">← ${TYP_NAME[doc.typ]}</a>
        <h1>${id ? esc(docTitel(doc)) : istR ? 'Neue Rechnung' : 'Neuer Kostenvoranschlag'} ${id ? statusBadge(doc) : ''}</h1>
        <div class="speicherstatus" id="speicherstatus" aria-live="polite"></div>
      </div>
      <div class="btn-gruppe" id="aktionen"></div>
    </div>
    ${gesperrt ? `<div class="hinweis-box gesperrt-box">🔒 Abgeschlossen am ${datum(doc.festgeschriebenAm)} – die Rechnung kann nicht mehr geändert werden (GoBD). Korrekturen über <b>Stornieren</b>; danach eine neue Rechnung erstellen.${storniertDurch ? ` Storniert durch <a href="#/dokument/${storniertDurch.id}">${esc(storniertDurch.nummer)}</a>.` : ''}${bezug ? ` Storno zu <a href="#/dokument/${bezug.id}">${esc(bezug.nummer)}</a>.` : ''}</div>` : ''}
    ${!gesperrt && istR ? tipp('entwurf', 'Entwürfe werden automatisch gespeichert. Die Rechnungsnummer wird erst beim <b>Abschließen</b> oder Versenden vergeben – so entstehen keine Lücken.') : ''}
    <div class="editor-layout">
      <div class="editor-form">
        <fieldset class="karte" ${zu}>
          <h3>Kunde</h3>
          <div class="raster-2">
            <label class="span-2">Kunde auswählen
              <select id="kundeWahl"><option value="">– neuer / einmaliger Kunde –</option>${S.kunden
                .slice()
                .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                .map((k) => `<option value="${k.id}" ${k.id === doc.kundeId ? 'selected' : ''}>${esc(k.name)}${k.firma ? ` (${esc(k.firma)})` : ''}</option>`)
                .join('')}</select>
            </label>
            <label>Name<input data-k="name" value="${esc(doc.kunde.name)}" autocomplete="off"></label>
            <label>Firma (optional)<input data-k="firma" value="${esc(doc.kunde.firma)}"></label>
            <label class="span-2">Straße & Nr.<input data-k="strasse" value="${esc(doc.kunde.strasse)}" placeholder="Tippen für Adressvorschläge"></label>
            <label>PLZ<input data-k="plz" value="${esc(doc.kunde.plz)}"></label>
            <label>Ort<input data-k="ort" value="${esc(doc.kunde.ort)}"></label>
            <label>E-Mail<input data-k="email" type="email" value="${esc(doc.kunde.email)}"></label>
            <label>Telefon<input data-k="telefon" value="${esc(doc.kunde.telefon)}"></label>
          </div>
          <div id="dubletten"></div>
          <label class="checkbox"><input type="checkbox" id="kundeSpeichern" ${doc.kundeId ? 'disabled' : 'checked'}> Kunde in Kundenliste speichern</label>
        </fieldset>

        <fieldset class="karte" ${zu}>
          <h3>Angaben</h3>
          <div class="raster-2">
            <label>Nummer<input data-f="nummer" value="${esc(doc.nummer || '')}" placeholder="${istR ? 'wird beim Abschließen vergeben' : 'wird automatisch vergeben'}"></label>
            ${
              istR
                ? `<div class="feld-anzeige"><span>Status</span>${statusBadge(doc)}</div>`
                : `<label>Status<select data-f="status">${Object.entries(STATUS.angebot)
                    .map(([k, v]) => `<option value="${k}" ${doc.status === k ? 'selected' : ''}>${v}</option>`)
                    .join('')}</select></label>`
            }
            <label>${istR ? 'Rechnungsdatum' : 'Datum'}<input type="date" data-f="datum" value="${esc(doc.datum)}"></label>
            <label>${istR ? 'Leistungsdatum / Umzugstag' : 'Geplanter Umzugstermin'}<input type="date" data-f="leistungsdatum" value="${esc(doc.leistungsdatum)}"></label>
            ${istR ? `<label>Fällig am<input type="date" data-f="faelligAm" value="${esc(doc.faelligAm)}"></label>` : `<label>Gültig bis<input type="date" data-f="gueltigBis" value="${esc(doc.gueltigBis)}"></label>`}
            <label>Kategorie (für Auswertung)<select data-f="kategorie">${s.kategorienEinnahmen.map((k) => `<option ${doc.kategorie === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
            <label class="span-2">Überschrift / Betreff (optional)<input data-f="betreff" value="${esc(doc.betreff)}" placeholder="z. B. Umzug am 03.10."></label>
            <label class="span-2">Titel auf dem Dokument<input data-f="titel" value="${esc(doc.titel || '')}" placeholder="${doc.storno ? 'Stornorechnung' : istR ? 'Rechnung' : 'Kostenvoranschlag'}"></label>
          </div>
          <h4>Zusätzliche Felder</h4>
          <div class="raster-2" id="eigeneFelder">
            ${eigeneFelder.map((f) => `<label>${esc(f.label)}<input data-fw="${esc(f.id)}" value="${esc((doc.feldWerte || {})[f.id] || '')}" ${['f_auszug', 'f_einzug'].includes(f.id) ? 'placeholder="Tippen für Adressvorschläge"' : ''}></label>`).join('')}
          </div>
          ${hatStrecke ? `<div class="strecke"><button type="button" class="btn btn-klein" id="streckeBtn">Entfernung berechnen</button><span id="streckeErgebnis" class="hilfe"></span></div>` : ''}
          <div id="extraFelder"></div>
          <button class="btn btn-klein" id="feldPlus" type="button">+ Feld hinzufügen</button>
          <span class="hilfe">Feste Felder für alle Dokumente: Einstellungen → Eigene Felder</span>
        </fieldset>

        <fieldset class="karte" ${zu}>
          <div class="karte-kopf">
            <h3>Positionen</h3>
            <div class="btn-gruppe">
              <select id="vorlageWahl" aria-label="Umzugs-Vorlage einfügen"><option value="">Vorlage einfügen…</option>${(s.umzugsvorlagen || []).map((v, i) => `<option value="${i}">${esc(v.name)}</option>`).join('')}</select>
              <select id="artikelWahl" aria-label="Aus Preisliste einfügen"><option value="">+ aus Preisliste…</option>${s.artikel.map((a, i) => `<option value="${i}">${esc(a.beschreibung)} – ${euro(a.preis)}/${esc(a.einheit)}</option>`).join('')}</select>
              <button class="btn btn-klein" id="posPlus" type="button">+ Position</button>
            </div>
          </div>
          <div id="positionen"></div>
          <datalist id="einheiten">${s.einheiten.map((e) => `<option value="${esc(e)}">`).join('')}</datalist>
        </fieldset>

        <fieldset class="karte" ${zu}>
          <h3>Steuer, Sprache & Prozente</h3>
          <div class="raster-2">
            <label>Besteuerung
              <select data-f="steuerModus">
                <option value="klein" ${doc.steuerModus === 'klein' ? 'selected' : ''}>Kleinunternehmer (§ 19 UStG)</option>
                <option value="regel" ${doc.steuerModus === 'regel' ? 'selected' : ''}>Mit Umsatzsteuer</option>
              </select>
            </label>
            <label>Sprache des Dokuments
              <select data-f="sprache"><option value="de" ${doc.sprache !== 'en' ? 'selected' : ''}>Deutsch</option><option value="en" ${doc.sprache === 'en' ? 'selected' : ''}>Englisch</option></select>
            </label>
            <label>Rabatt in %<input data-f="rabattProzent" inputmode="decimal" value="${esc(zahl(doc.rabattProzent))}"></label>
            <label>Anzahlung in %<input data-f="anzahlungProzent" inputmode="decimal" value="${esc(zahl(doc.anzahlungProzent))}"></label>
          </div>
          <label class="checkbox"><input type="checkbox" data-f="zeigeAnteil" ${doc.zeigeAnteil ? 'checked' : ''}> Prozent-Anteil jeder Position am Gesamtbetrag anzeigen</label>
          <div id="summenBox" class="summen-box"></div>
        </fieldset>

        <div class="karte">
          <div class="karte-kopf"><h3>Texte</h3>${gesperrt ? '' : textbausteinMenue()}</div>
          <fieldset ${zu} class="ohne-rahmen">
            <label>Einleitung<textarea data-f="einleitung" rows="2">${esc(doc.einleitung)}</textarea></label>
            <label>Schlusstext<textarea data-f="schlusstext" rows="3">${esc(doc.schlusstext)}</textarea></label>
            <span class="hilfe">Platzhalter: {KUNDE} {NUMMER} {BETRAG} {DATUM} {FAELLIG} {GUELTIG} {ZIEL} {FIRMA}</span>
          </fieldset>
          <label>Interne Notiz (nicht auf dem Dokument)<textarea data-f="notiz" rows="2">${esc(doc.notiz || '')}</textarea></label>
        </div>
        ${doc.verlauf?.length ? `<div class="karte"><h3>Verlauf</h3><ul class="verlauf">${doc.verlauf.map((v) => `<li><span>${datum(v.datum)}</span> ${esc(v.text)}</li>`).join('')}</ul></div>` : ''}
      </div>
      <div class="editor-vorschau">
        <div class="vorschau-rahmen"><div id="vorschau" class="vorschau-skaliert"></div></div>
      </div>
    </div>`;

  // ---------- Aktionen ----------
  const knopf = (a, text, klasse = '') => `<button class="btn ${klasse}" data-a="${a}" type="button">${text}</button>`;
  const mehr = [];
  const leiste = [];
  if (!gesperrt && istR) leiste.push(knopf('abschliessen', 'Abschließen', 'btn-primaer'));
  leiste.push(knopf('pdf', 'PDF'));
  leiste.push(knopf('mail', '✉ Senden'));
  if (istR && gesperrt && doc.status === 'offen' && !doc.storno) leiste.push(knopf('bezahlt', 'Bezahlt', 'btn-gruen'));
  if (!istR) leiste.push(knopf('umwandeln', '→ Rechnung', 'btn-gruen'));
  mehr.push('<button data-a="drucken" type="button">Drucken</button>');
  if (istUeberfaellig(doc)) mehr.push('<button data-a="erinnerung" type="button">Zahlungserinnerung senden</button>');
  if (!istR && doc.status === 'entwurf') mehr.push('<button data-a="versendet" type="button">Als versendet markieren</button>');
  if (istR && doc.status === 'bezahlt') mehr.push('<button data-a="unbezahlt" type="button">Zahlung zurücknehmen</button>');
  mehr.push('<button data-a="termin" type="button">Termin im Kalender anlegen</button>');
  mehr.push('<button data-a="vorlage" type="button">Positionen als Vorlage speichern</button>');
  mehr.push('<button data-a="kopie" type="button">Duplizieren</button>');
  if (istR && gesperrt && !['storniert', 'storno'].includes(doc.status)) mehr.push('<button data-a="storno" type="button" class="rot">Stornieren</button>');
  if (id && !gesperrt) mehr.push('<button data-a="loeschen" type="button" class="rot">Löschen</button>');
  $('#aktionen').innerHTML = `${leiste.join('')}<details class="mehr"><summary class="btn" aria-label="Weitere Aktionen">⋯</summary><div>${mehr.join('')}</div></details>`;

  // ---------- Speichern (automatisch) ----------
  const statusText = () => {
    const el = $('#speicherstatus');
    if (!el) return;
    if (gesperrt) el.textContent = '';
    else if (speichertGerade) el.textContent = 'Speichert…';
    else if (offeneAenderung) el.textContent = 'Ungespeicherte Änderungen';
    else el.textContent = zuletztGespeichert ? `✓ Gespeichert ${vorZeit(zuletztGespeichert)}` : 'Wird beim ersten Eintrag automatisch gespeichert';
  };
  const statusUhr = setInterval(() => (document.body.contains($('#speicherstatus')) ? statusText() : clearInterval(statusUhr)), 5000);

  async function speichern() {
    clearTimeout(speicherTimer);
    if (speichertGerade) await speichertGerade;
    if (!offeneAenderung && doc.id) return doc;
    speichertGerade = (async () => {
      offeneAenderung = false;
      statusText();
      if (!doc.kundeId && $('#kundeSpeichern')?.checked && doc.kunde.name) {
        const k = await speichere('kunden', { ...doc.kunde, sprache: doc.sprache });
        doc.kundeId = k.id;
        doc.kunde.kundennummer = k.kundennummer;
        const sel = $('#kundeWahl');
        sel.insertAdjacentHTML('beforeend', `<option value="${k.id}">${esc(k.name)}</option>`);
        sel.value = k.id;
        $('#kundeSpeichern').disabled = true;
      }
      const neu = !doc.id;
      const saved = await speichere('dokumente', doc);
      Object.assign(doc, { id: saved.id, nummer: saved.nummer, auftragId: saved.auftragId, geaendert: saved.geaendert });
      if (neu) {
        history.replaceState(null, '', `#/dokument/${saved.id}`);
        if (!istR) $('[data-f="nummer"]').value = saved.nummer || '';
      }
      zuletztGespeichert = Date.now();
    })();
    try {
      await speichertGerade;
    } catch (e) {
      offeneAenderung = true;
      toast(e.message, 'fehler');
      throw e;
    } finally {
      speichertGerade = null;
      statusText();
    }
    return doc;
  }
  const planeSpeichern = () => {
    if (gesperrt) return;
    offeneAenderung = true;
    statusText();
    clearTimeout(speicherTimer);
    speicherTimer = setTimeout(() => speichern().catch(() => {}), 1200);
  };

  let rafGeplant = false;
  const aktualisiere = () => {
    if (rafGeplant) return;
    rafGeplant = true;
    requestAnimationFrame(() => {
      rafGeplant = false;
      zeichneSummen();
    });
  };
  const aenderung = () => {
    aktualisiere();
    planeSpeichern();
  };

  // ---------- Felder ----------
  $$('[data-f]').forEach((el) => {
    el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'date' ? 'change' : 'input', () => {
      const f = el.dataset.f;
      doc[f] = el.type === 'checkbox' ? el.checked : ['rabattProzent', 'anzahlungProzent'].includes(f) ? parseZahl(el.value) : el.value;
      if (f === 'datum') {
        const feld = istR ? 'faelligAm' : 'gueltigBis';
        doc[feld] = plusTage(doc.datum, istR ? s.zahlungszielTage : s.angebotGueltigTage);
        $(`[data-f="${feld}"]`).value = doc[feld];
      }
      if (f === 'sprache') {
        const andere = el.value === 'en' ? 'de' : 'en';
        if (!doc.schlusstext || doc.schlusstext === standardSchluss(doc.typ, andere)) {
          doc.schlusstext = standardSchluss(doc.typ, el.value);
          $('[data-f="schlusstext"]').value = doc.schlusstext;
        }
      }
      if (f === 'steuerModus') zeichnePositionen();
      if (f === 'notiz' && gesperrt) {
        clearTimeout(speicherTimer);
        speicherTimer = setTimeout(() => api('PUT', `/api/dokumente/${doc.id}`, { notiz: doc.notiz }).then(() => toast('Notiz gespeichert')), 1000);
        return;
      }
      aenderung();
    });
    if (el.tagName === 'TEXTAREA') el.addEventListener('focus', () => (letztesTextfeld = el));
  });
  $$('[data-k]').forEach((el) =>
    el.addEventListener('input', () => {
      doc.kunde[el.dataset.k] = el.value;
      zeigeDubletten();
      aenderung();
    })
  );
  $$('[data-fw]').forEach((el) =>
    el.addEventListener('input', () => {
      doc.feldWerte = doc.feldWerte || {};
      doc.feldWerte[el.dataset.fw] = el.value;
      aenderung();
    })
  );

  // Adressvorschläge
  adressVorschlaege($('[data-k="strasse"]'), (a) => {
    Object.assign(doc.kunde, { strasse: a.strasse || doc.kunde.strasse, plz: a.plz, ort: a.ort });
    ['strasse', 'plz', 'ort'].forEach((k) => ($(`[data-k="${k}"]`).value = doc.kunde[k] || ''));
    aenderung();
  });
  ['f_auszug', 'f_einzug'].forEach((fid) =>
    adressVorschlaege($(`[data-fw="${fid}"]`), (a) => {
      doc.feldWerte = { ...(doc.feldWerte || {}), [fid]: a.text };
      $(`[data-fw="${fid}"]`).value = a.text;
      aenderung();
    })
  );

  // Dubletten
  function zeigeDubletten() {
    const box = $('#dubletten');
    if (!box) return;
    box.innerHTML = doc.kundeId ? '' : dublettenHinweis(doc.kunde);
    $$('[data-dublette]', box).forEach((b) => (b.onclick = () => waehleKunde(b.dataset.dublette)));
  }
  function waehleKunde(kid) {
    const k = S.kunden.find((x) => x.id === kid);
    doc.kundeId = k ? k.id : '';
    doc.kunde = k ? kundeVon(k) : kundeVon({});
    if (k?.sprache && k.sprache !== doc.sprache) {
      doc.sprache = k.sprache;
      $('[data-f="sprache"]').value = k.sprache;
      doc.schlusstext = standardSchluss(doc.typ, k.sprache);
      $('[data-f="schlusstext"]').value = doc.schlusstext;
    }
    $$('[data-k]').forEach((el) => (el.value = doc.kunde[el.dataset.k] || ''));
    $('#kundeWahl').value = doc.kundeId;
    $('#kundeSpeichern').disabled = !!k;
    zeigeDubletten();
    aenderung();
  }
  $('#kundeWahl').onchange = (e) => waehleKunde(e.target.value);
  zeigeDubletten();

  // Strecke berechnen
  if ($('#streckeBtn'))
    $('#streckeBtn').onclick = async () => {
      const von = doc.feldWerte?.f_auszug;
      const nach = doc.feldWerte?.f_einzug;
      if (!von || !nach) return toast('Bitte Auszugs- und Einzugsadresse eintragen.', 'fehler');
      $('#streckeErgebnis').textContent = 'Wird berechnet…';
      try {
        const r = await backend.geoStrecke(von, nach);
        const preis = Math.round(r.km * (s.preisProKm || 0) * 100) / 100;
        $('#streckeErgebnis').innerHTML =
          `<b>${zahl(r.km, 1)} km</b> · ca. ${r.minuten} Min. Fahrt ${!gesperrt && s.preisProKm ? `<button type="button" class="btn btn-klein" id="streckePos">Fahrtkosten hinzufügen (${euro(preis)})</button>` : ''}`;
        if ($('#streckePos'))
          $('#streckePos').onclick = () => {
            doc.positionen.push({ beschreibung: `Fahrtkosten (${zahl(r.km, 1)} km Auszug → Einzug)`, menge: r.km, einheit: 'km', preis: s.preisProKm, ustSatz: s.steuer.satz });
            zeichnePositionen();
            aenderung();
          };
      } catch (e) {
        $('#streckeErgebnis').textContent = e.message;
      }
    };

  // Zusätzliche Felder nur für dieses Dokument
  const zeichneExtra = () => {
    doc.extraFelder = doc.extraFelder || [];
    $('#extraFelder').innerHTML = doc.extraFelder
      .map(
        (x, i) =>
          `<div class="extra-feld"><input data-xl="${i}" placeholder="Bezeichnung (z. B. Etage)" value="${esc(x.label)}" aria-label="Bezeichnung"><input data-xw="${i}" placeholder="Wert" value="${esc(x.wert)}" aria-label="Wert"><button class="btn-icon" data-xd="${i}" type="button" aria-label="Feld entfernen">✕</button></div>`
      )
      .join('');
    $$('[data-xl]').forEach((el) => (el.oninput = () => ((doc.extraFelder[el.dataset.xl].label = el.value), aenderung())));
    $$('[data-xw]').forEach((el) => (el.oninput = () => ((doc.extraFelder[el.dataset.xw].wert = el.value), aenderung())));
    $$('[data-xd]').forEach((el) => (el.onclick = () => (doc.extraFelder.splice(el.dataset.xd, 1), zeichneExtra(), aenderung())));
  };
  $('#feldPlus').onclick = () => {
    doc.extraFelder = doc.extraFelder || [];
    doc.extraFelder.push({ label: '', wert: '' });
    zeichneExtra();
    $$('[data-xl]').pop().focus();
  };
  zeichneExtra();

  // ---------- Positionen ----------
  function zeichnePositionen() {
    const regel = doc.steuerModus === 'regel';
    $('#positionen').innerHTML = `<table class="pos-tabelle">
      <thead><tr><th></th><th>Beschreibung</th><th>Menge</th><th>Einheit</th><th>${regel ? 'Netto-Preis' : 'Preis'}</th>${regel ? '<th>USt.</th>' : ''}<th class="c-num">Gesamt</th><th></th></tr></thead>
      <tbody>${doc.positionen
        .map(
          (p, i) => `<tr data-i="${i}">
          <td class="pos-griff"><button class="btn-icon" data-hoch="${i}" type="button" aria-label="Nach oben">▲</button><button class="btn-icon" data-runter="${i}" type="button" aria-label="Nach unten">▼</button></td>
          <td><textarea data-p="beschreibung" rows="1" placeholder="z. B. Beladung" aria-label="Beschreibung">${esc(p.beschreibung)}</textarea></td>
          <td><input data-p="menge" inputmode="decimal" value="${esc(zahl(p.menge, 3))}" class="schmal" aria-label="Menge"></td>
          <td><input data-p="einheit" list="einheiten" value="${esc(p.einheit)}" class="schmal" aria-label="Einheit"></td>
          <td><input data-p="preis" inputmode="decimal" value="${esc(zahl(p.preis))}" class="schmal" aria-label="Preis"></td>
          ${regel ? `<td><select data-p="ustSatz" aria-label="Umsatzsteuer">${[19, 7, 0].map((x) => `<option value="${x}" ${Number(p.ustSatz ?? 19) === x ? 'selected' : ''}>${x} %</option>`).join('')}</select></td>` : ''}
          <td class="c-num pos-summe"></td>
          <td><button class="btn-icon" data-del="${i}" type="button" aria-label="Position löschen">✕</button></td>
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
      if (el.tagName === 'TEXTAREA') {
        autoHoehe(el);
        el.addEventListener('focus', () => (letztesTextfeld = el));
      }
    });
    $$('#positionen [data-del]').forEach((b) => (b.onclick = () => (doc.positionen.splice(Number(b.dataset.del), 1), zeichnePositionen(), aenderung())));
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
  const nurLeer = () => doc.positionen.every((p) => !p.beschreibung && !parseZahl(p.preis));
  $('#posPlus').onclick = () => {
    doc.positionen.push({ beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0, ustSatz: s.steuer.satz });
    zeichnePositionen();
    $$('#positionen textarea').pop().focus();
    aenderung();
  };
  $('#artikelWahl').onchange = (e) => {
    const a = s.artikel[e.target.value];
    if (!a) return;
    if (nurLeer()) doc.positionen = [];
    doc.positionen.push({ beschreibung: a.beschreibung, menge: 1, einheit: a.einheit, preis: a.preis, ustSatz: s.steuer.satz });
    e.target.value = '';
    zeichnePositionen();
    aenderung();
  };
  $('#vorlageWahl').onchange = (e) => {
    const v = s.umzugsvorlagen?.[e.target.value];
    if (!v) return;
    if (nurLeer()) doc.positionen = [];
    doc.positionen.push(...v.positionen.map((p) => ({ ...p, ustSatz: s.steuer.satz })));
    e.target.value = '';
    zeichnePositionen();
    aenderung();
    toast(`Vorlage „${v.name}“ eingefügt – Preise kannst du anpassen`);
  };

  // Textbausteine an der Cursorposition einfügen
  $$('[data-baustein]').forEach((b) =>
    b.addEventListener('click', () => {
      const text = s.textbausteine[Number(b.dataset.baustein)];
      const feld = letztesTextfeld && document.body.contains(letztesTextfeld) ? letztesTextfeld : $('[data-f="schlusstext"]');
      const pos = feld.selectionStart ?? feld.value.length;
      const vor = feld.value.slice(0, pos);
      feld.value = `${vor}${vor && !/\s$/.test(vor) ? ' ' : ''}${text}${feld.value.slice(feld.selectionEnd ?? pos)}`;
      feld.dispatchEvent(new Event('input'));
      feld.focus();
      b.closest('details').open = false;
    })
  );

  function zeichneSummen() {
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
    $('#vorschau').innerHTML = renderDokument(doc, s);
    skaliereVorschau($('#vorschau'));
  }

  zeichnePositionen();
  statusText();

  // ---------- Aktionen ausführen ----------
  $('#aktionen').onclick = async (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    e.target.closest('details')?.removeAttribute('open');
    try {
      if (!gesperrt && (offeneAenderung || !doc.id) && a !== 'drucken') await speichern();
      if (a === 'abschliessen') {
        if (!(await bestaetigen('Rechnung abschließen? Danach bekommt sie ihre Nummer und kann nicht mehr geändert werden (nur noch storniert).', { ok: 'Abschließen' }))) return;
        const r = await dokumentAktion(doc.id, 'abschliessen');
        toast(`Rechnung ${r.nummer} abgeschlossen`);
        viewDokument(doc.id);
      } else if (a === 'pdf') {
        toast('PDF wird erstellt…');
        const aktuell = S.dokumente.find((d) => d.id === doc.id) || doc;
        await backend.download(await backend.dokumentPdf(aktuell, s), dateiname(aktuell));
      } else if (a === 'drucken') {
        drucken(renderDokument(doc, s));
      } else if (a === 'mail' || a === 'erinnerung') {
        if (istR && !gesperrt && !(await bestaetigen('Beim Versenden wird die Rechnung abgeschlossen und bekommt ihre Nummer. Danach sind keine Änderungen mehr möglich.', { ok: 'Weiter' }))) return;
        mailDialog(S.dokumente.find((d) => d.id === doc.id) || doc, a === 'erinnerung' ? 'erinnerung' : doc.typ);
      } else if (a === 'versendet') {
        await dokumentAktion(doc.id, 'versendet');
        toast('Als versendet markiert');
        viewDokument(doc.id);
      } else if (a === 'bezahlt') {
        const am = await abfrage('Zahlung erfassen', 'Bezahlt am', { typ: 'date', wert: heute() });
        if (!am) return;
        await dokumentAktion(doc.id, 'bezahlt', { datum: am });
        toast('Als bezahlt markiert und in der Buchhaltung gebucht');
        viewDokument(doc.id);
      } else if (a === 'unbezahlt') {
        await dokumentAktion(doc.id, 'zahlung-zuruecknehmen');
        toast('Zahlung zurückgenommen');
        viewDokument(doc.id);
      } else if (a === 'storno') {
        const grund = await abfrage('Rechnung stornieren', 'Grund (steht in der Notiz der Stornorechnung)', { ok: 'Stornieren' });
        if (grund === null) return;
        const r = await dokumentAktion(doc.id, 'storno', { grund });
        toast(`Stornorechnung ${r.storno.nummer} erstellt`);
        location.hash = `#/dokument/${r.storno.id}`;
      } else if (a === 'umwandeln') {
        const r = await dokumentAktion(doc.id, 'umwandeln');
        toast('Rechnungsentwurf erstellt – prüfen und abschließen');
        location.hash = `#/dokument/${r.id}`;
      } else if (a === 'kopie') {
        const r = await dokumentAktion(doc.id, 'duplizieren');
        toast('Kopie als Entwurf erstellt');
        location.hash = `#/dokument/${r.id}`;
      } else if (a === 'vorlage') {
        const name = await abfrage('Als Vorlage speichern', 'Name der Vorlage', { wert: doc.betreff || '', ok: 'Speichern' });
        if (!name) return;
        S.settings.umzugsvorlagen = [
          ...(S.settings.umzugsvorlagen || []),
          { name, positionen: doc.positionen.map(({ beschreibung, menge, einheit, preis }) => ({ beschreibung, menge, einheit, preis })) }
        ];
        await speichereEinstellungen();
        toast(`Vorlage „${name}“ gespeichert`);
      } else if (a === 'termin') {
        terminDialog({
          datum: doc.leistungsdatum || heute(),
          titel: `${doc.kategorie || 'Umzug'} ${doc.kunde.name || ''}`.trim(),
          kundeId: doc.kundeId,
          kundeName: doc.kunde.name,
          telefon: doc.kunde.telefon,
          vonAdresse: doc.feldWerte?.f_auszug || '',
          nachAdresse: doc.feldWerte?.f_einzug || '',
          auftragId: doc.auftragId,
          dokumentId: doc.id
        });
      } else if (a === 'loeschen') {
        await loescheMitRueckgaengig('dokumente', doc.id, `${docTitel(doc)} gelöscht`);
        location.hash = istR ? '#/rechnungen' : '#/angebote';
      }
    } catch (err) {
      toast(err.message, 'fehler');
    }
  };

  // Strg+S speichert sofort
  window.editorSpeichern = () => (gesperrt ? null : speichern().then(() => toast('Gespeichert')));
  // Beim Verlassen noch offene Änderungen speichern
  window.verlassen = async () => {
    if (!gesperrt && offeneAenderung) await speichern().catch(() => {});
    clearInterval(statusUhr);
  };
  window.onbeforeunload = () => (offeneAenderung ? true : undefined);
}

function textbausteinMenue() {
  const b = S.settings.textbausteine || [];
  if (!b.length) return '';
  return `<details class="mehr baustein-menue"><summary class="btn btn-klein">Textbaustein einfügen</summary><div>${b.map((t, i) => `<button type="button" data-baustein="${i}">${esc(t)}</button>`).join('')}</div></details>`;
}

export function drucken(html) {
  const area = $('#druckbereich');
  area.innerHTML = html;
  document.body.classList.add('druckt');
  window.print();
  document.body.classList.remove('druckt');
  area.innerHTML = '';
}

// ---------- E-Mail-Dialog ----------
export function mailDialog(doc, vorlageName) {
  const s = S.settings;
  const vorlagen = s.email.vorlagen;
  const v = vorlagen[vorlageName] || vorlagen[doc.typ];
  const namen = { rechnung: 'Rechnung', angebot: 'Kostenvoranschlag', erinnerung: 'Zahlungserinnerung' };
  const { el, close } = modal(
    'Per E-Mail senden',
    `
    <form class="formular" id="m-form">
      <label>An<input id="m-an" type="email" required value="${esc(doc.kunde?.email || '')}" placeholder="kunde@beispiel.de"></label>
      <label>CC (optional)<input id="m-cc" type="email"></label>
      <label>Vorlage<select id="m-vorlage">${Object.keys(vorlagen)
        .map((k) => `<option value="${k}" ${k === vorlageName ? 'selected' : ''}>${namen[k] || k}</option>`)
        .join('')}</select></label>
      <label>Betreff<input id="m-betreff" value="${esc(platzhalter(v.betreff, doc, s))}"></label>
      <label>Nachricht<textarea id="m-text" rows="9">${esc(platzhalter(v.text, doc, s))}</textarea></label>
      <label class="checkbox"><input type="checkbox" id="m-pdf" checked> ${esc(dateiname(doc))} als PDF anhängen</label>
      <div class="btn-gruppe rechts"><button class="btn" type="button" data-abbruch>Abbrechen</button><button class="btn btn-primaer" type="submit" id="m-senden">Senden</button></div>
    </form>`
  );
  $('[data-abbruch]', el).onclick = close;
  $('#m-vorlage', el).onchange = (e) => {
    const nv = vorlagen[e.target.value];
    $('#m-betreff', el).value = platzhalter(nv.betreff, doc, s);
    $('#m-text', el).value = platzhalter(nv.text, doc, s);
  };
  $('#m-form', el).onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('#m-senden', el);
    const an = $('#m-an', el).value.trim();
    btn.disabled = true;
    btn.textContent = 'Wird gesendet…';
    try {
      await backend.mailDokument(doc, s, {
        an,
        cc: $('#m-cc', el).value.trim(),
        betreff: $('#m-betreff', el).value,
        text: $('#m-text', el).value,
        mitPdf: $('#m-pdf', el).checked,
        art: namen[$('#m-vorlage', el).value]
      });
      if (!doc.kunde?.email && doc.kundeId) {
        const k = S.kunden.find((x) => x.id === doc.kundeId);
        if (k && !k.email) await speichere('kunden', { ...k, email: an });
      }
      await ladeAlles();
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
