// Rechnungs-/Angebotsvorlagen (A4) und Einsatzzettel – wird im Browser (Vorschau) und auf dem Server (PDF) genutzt.
import { berechne, betrag, datum, datumLang, esc, euro, gross, nl2br, platzhalter, prozent, zahl } from './rechnen.js';

const TEXTE = {
  de: {
    rechnung: 'Rechnung',
    angebot: 'Kostenvoranschlag',
    storno: 'Stornorechnung',
    rechnungsnummer: 'Rechnungsnummer',
    nummer: 'Nummer',
    datum: 'Datum',
    leistungsdatum: 'Leistungsdatum',
    umzugstermin: 'Umzugstermin',
    kundennummer: 'Kundennummer',
    gueltigBis: 'Gültig bis',
    faellig: 'Fällig am',
    pos: 'Pos.',
    beschreibung: 'Beschreibung',
    menge: 'Menge',
    einzelpreis: 'Einzelpreis',
    ust: 'USt.',
    anteil: 'Anteil',
    betragEuro: 'Betrag (€)',
    gesamt: 'Gesamt',
    zwischensumme: 'Zwischensumme',
    rabatt: 'Rabatt',
    netto: 'Nettobetrag',
    zzglUst: (s) => `zzgl. ${s} % USt.`,
    gesamtbetrag: 'Gesamtbetrag',
    brutto: ' (brutto)',
    anzahlung: 'Anzahlung',
    anzahlungAuftrag: 'Anzahlung bei Auftrag',
    rest: 'Restbetrag',
    restUmzug: 'Restbetrag nach Umzug',
    name: 'Name',
    vorname: 'Vorname',
    adresse: 'Adresse',
    plz: 'PLZ',
    stadt: 'Stadt',
    steuernummer: 'Steuernummer',
    kontoinhaber: 'Kontoinhaber',
    bank: 'Bank',
    anrede: (n) => `Guten Tag ${n},`,
    anredeAllgemein: 'Sehr geehrte Damen und Herren,',
    leer: 'Noch keine Positionen',
    entwurf: 'ENTWURF',
    stornoText: (nr, d) => `Storno zur Rechnung ${nr} vom ${d}.`,
    rechnungAn: 'RECHNUNG AN',
    angebotFuer: 'KOSTENVORANSCHLAG FÜR',
    bankverbindung: 'Bankverbindung',
    verwendungszweck: 'Verwendungszweck',
    inhaber: 'Inhaber',
    tel: 'Tel.'
  },
  en: {
    rechnung: 'Invoice',
    angebot: 'Cost estimate',
    storno: 'Cancellation invoice',
    rechnungsnummer: 'Invoice no.',
    nummer: 'Number',
    datum: 'Date',
    leistungsdatum: 'Service date',
    umzugstermin: 'Moving date',
    kundennummer: 'Customer no.',
    gueltigBis: 'Valid until',
    faellig: 'Due date',
    pos: 'Item',
    beschreibung: 'Description',
    menge: 'Qty',
    einzelpreis: 'Unit price',
    ust: 'VAT',
    anteil: 'Share',
    betragEuro: 'Amount (€)',
    gesamt: 'Total',
    zwischensumme: 'Subtotal',
    rabatt: 'Discount',
    netto: 'Net amount',
    zzglUst: (s) => `plus ${s} % VAT`,
    gesamtbetrag: 'Total amount',
    brutto: ' (gross)',
    anzahlung: 'Deposit',
    anzahlungAuftrag: 'Deposit on order',
    rest: 'Balance',
    restUmzug: 'Balance after the move',
    name: 'Surname',
    vorname: 'First name',
    adresse: 'Address',
    plz: 'Postcode',
    stadt: 'City',
    steuernummer: 'Tax number',
    kontoinhaber: 'Account holder',
    bank: 'Bank',
    anrede: (n) => `Dear ${n},`,
    anredeAllgemein: 'Dear Sir or Madam,',
    leer: 'No items yet',
    entwurf: 'DRAFT',
    stornoText: (nr, d) => `Cancellation of invoice ${nr} dated ${d}.`,
    rechnungAn: 'INVOICE TO',
    angebotFuer: 'ESTIMATE FOR',
    bankverbindung: 'Bank details',
    verwendungszweck: 'Reference',
    inhaber: 'Owner',
    tel: 'Phone'
  }
};

export const sprachTexte = (sprache) => TEXTE[sprache] || TEXTE.de;
const inhaberName = (f) => [f.vorname, f.nachname].filter(Boolean).join(' ') || f.inhaber || '';

// Text des Kleinunternehmer-Hinweises in der Sprache des Dokuments
export function kleinunternehmerText(settings, sprache) {
  if (sprache === 'en') return settings.texte?.en?.kleinunternehmer || 'No VAT is charged in accordance with § 19 UStG';
  return settings.texte?.kleinunternehmer || 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet';
}

export function dokumentTitel(doc, sprache = doc.sprache) {
  const t = sprachTexte(sprache);
  if (doc.titel) return doc.titel;
  if (doc.storno) return t.storno;
  return doc.typ === 'rechnung' ? t.rechnung : t.angebot;
}

function zusatzFelder(doc, settings) {
  return [
    ...(settings.eigeneFelder || []).filter((ef) => ef.fuer === 'beide' || ef.fuer === doc.typ).map((ef) => [ef.label, (doc.feldWerte || {})[ef.id]]),
    ...(doc.extraFelder || []).map((x) => [x.label, x.wert])
  ].filter(([l, v]) => l && v);
}

const istEntwurf = (doc) => doc.typ === 'rechnung' && !doc.gesperrt && doc.status === 'entwurf';

export function renderDokument(doc, settings) {
  return settings.design?.vorlage === 'modern' ? renderModern(doc, settings) : renderSaveYourMoebel(doc, settings);
}

// Vorlage im Stil der Canva-Rechnung: dunkler Kopf mit Logo, schlichte Tabelle, Inhaber- und Bankdaten unten
export function renderSaveYourMoebel(doc, settings) {
  const s = settings;
  const f = s.firma;
  const sprache = doc.sprache || 'de';
  const t = sprachTexte(sprache);
  const c = berechne(doc);
  const istR = doc.typ === 'rechnung';
  const k = doc.kunde || {};
  const entwurf = istEntwurf(doc);
  const zeigeMenge = c.positionen.some((p) => Math.abs(Number(p.menge)) !== 1);
  const zeigeUst = !c.klein;
  const zeigeAnteil = !!doc.zeigeAnteil;
  const logo = f.logoHell || f.logo;
  const dl = (iso) => datumLang(iso, sprache);

  const meta = [
    [istR ? t.rechnungsnummer : t.nummer, entwurf && !doc.nummer ? t.entwurf : doc.nummer],
    [t.datum, dl(doc.datum)],
    doc.leistungsdatum ? [istR ? t.leistungsdatum : t.umzugstermin, dl(doc.leistungsdatum)] : null,
    k.kundennummer ? [t.kundennummer, k.kundennummer] : null,
    !istR && doc.gueltigBis ? [t.gueltigBis, dl(doc.gueltigBis)] : null
  ].filter((x) => x && x[1]);

  const felder = zusatzFelder(doc, s);
  const spalten = 3 + (zeigeMenge ? 2 : 0) + (zeigeUst ? 1 : 0) + (zeigeAnteil ? 1 : 0);
  const rows = c.positionen
    .map(
      (p, i) => `<tr>
        <td class="s-pos">${i + 1}</td>
        <td>${nl2br(p.beschreibung)}</td>
        ${zeigeMenge ? `<td class="s-num">${zahl(p.menge, 3)} ${esc(p.einheit || '')}</td><td class="s-num">${betrag(p.preis)}</td>` : ''}
        ${zeigeUst ? `<td class="s-num">${zahl(p.ustSatz ?? 19)} %</td>` : ''}
        ${zeigeAnteil ? `<td class="s-num">${prozent(p.anteil)}</td>` : ''}
        <td class="s-num">${betrag(p.betrag)}</td>
      </tr>`
    )
    .join('');

  const vorZeilen = [];
  if (c.rabatt || zeigeUst) vorZeilen.push([t.zwischensumme, `${betrag(c.summePos)} €`]);
  if (c.rabatt) vorZeilen.push([`${t.rabatt} (${prozent(c.rabatt)})`, `– ${betrag(c.rabattBetrag)} €`]);
  if (zeigeUst) {
    if (c.rabatt) vorZeilen.push([t.netto, `${betrag(c.netto)} €`]);
    c.steuern.forEach((st) => vorZeilen.push([t.zzglUst(zahl(st.satz)), `${betrag(st.betrag)} €`]));
  }
  const nachZeilen = c.anzahlungProzent
    ? [
        [`${istR ? t.anzahlung : t.anzahlungAuftrag} (${prozent(c.anzahlungProzent)})`, `${betrag(c.anzahlung)} €`],
        [istR ? t.rest : t.restUmzug, `${betrag(c.rest)} €`]
      ]
    : [];

  const steuerZeile = c.klein ? kleinunternehmerText(s, sprache) : [f.ustId ? `USt-IdNr.: ${f.ustId}` : '', f.steuernummer ? `${t.steuernummer}: ${f.steuernummer}` : ''].filter(Boolean).join(' · ');

  const links = [
    f.nachname ? `${t.name}: ${f.nachname}` : '',
    f.vorname ? `${t.vorname}: ${f.vorname}` : '',
    f.strasse ? `${t.adresse}: ${f.strasse}` : '',
    f.plz ? `${t.plz}: ${f.plz}` : '',
    f.ort ? `${t.stadt}: ${f.ort}` : '',
    f.steuernummer ? `${t.steuernummer}: ${f.steuernummer}` : ''
  ].filter(Boolean);
  const rechts = [
    f.kontoinhaber ? `${t.kontoinhaber}: ${f.kontoinhaber}` : '',
    f.iban ? `IBAN: ${f.iban}` : '',
    f.bic ? `BIC: ${f.bic}` : '',
    f.bank ? `${t.bank}: ${f.bank}` : '',
    f.ustId ? `USt-IdNr.: ${f.ustId}` : ''
  ].filter(Boolean);

  const einleitung = doc.storno ? t.stornoText(doc.bezugNummer || '', datumLang(doc.bezugDatum, sprache)) : doc.einleitung ? platzhalter(doc.einleitung, doc, s) : '';

  return `<div class="doc-page v-syf${entwurf ? ' ist-entwurf' : ''}" data-entwurf="${esc(t.entwurf)}" style="--d-farbe:${esc(s.design?.farbe || '#E53935')};--d-kopf:${esc(s.design?.kopf || '#2B2B2B')};--d-schrift:'${esc(s.design?.schrift || 'Aileron')}'">
    <header class="s-kopf">
      <div class="s-logo">${logo ? `<img src="${esc(logo)}" alt="${esc(f.name)}">` : `<span>${esc(gross(f.name))}</span>`}</div>
      <div class="s-kontakt">${[f.email, [f.strasse, f.ort].filter(Boolean).join(', '), f.telefon, f.web && !f.email ? f.web : ''].filter(Boolean).map(esc).join('<br>')}</div>
    </header>
    <div class="s-inhalt">
      <section class="s-adressen">
        <div class="s-kunde">
          <div class="s-titel">${esc(dokumentTitel(doc, sprache))}</div>
          ${k.firma ? `<b>${esc(k.firma)}</b><br>` : ''}${k.name ? `<b>${esc(k.name)}</b><br>` : ''}
          ${esc([k.strasse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean).join(', '))}
        </div>
        <div class="s-meta">${meta.map(([l, v]) => `<div>${esc(l)}: ${esc(v)}</div>`).join('')}</div>
      </section>
      ${felder.length ? `<section class="s-felder">${felder.map(([l, v]) => `<div><span>${esc(l)}</span>${nl2br(v)}</div>`).join('')}</section>` : ''}
      ${doc.betreff ? `<h2 class="s-betreff">${esc(doc.betreff)}</h2>` : ''}
      ${einleitung ? `<p class="s-text">${k.name && !doc.storno ? `${esc(t.anrede(k.name))}<br>` : ''}${nl2br(einleitung)}</p>` : ''}
      <table class="s-tabelle">
        <thead><tr><th class="s-pos">${t.pos}</th><th>${t.beschreibung}</th>${zeigeMenge ? `<th class="s-num">${t.menge}</th><th class="s-num">${t.einzelpreis}</th>` : ''}${zeigeUst ? `<th class="s-num">${t.ust}</th>` : ''}${zeigeAnteil ? `<th class="s-num">${t.anteil}</th>` : ''}<th class="s-num">${t.betragEuro}</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="${spalten}" class="s-leer">${t.leer}</td></tr>`}</tbody>
      </table>
      <div class="s-summen">
        ${vorZeilen.map(([l, v]) => `<div class="s-zeile"><span>${esc(l)}</span><span>${esc(v)}</span></div>`).join('')}
        <div class="s-gesamt"><span>${t.gesamtbetrag}${zeigeUst ? t.brutto : ''}:</span><span>${betrag(c.brutto)} €</span></div>
        ${nachZeilen.map(([l, v]) => `<div class="s-zeile"><span>${esc(l)}</span><span>${esc(v)}</span></div>`).join('')}
        ${doc.schlusstext && !doc.storno ? `<div class="s-schluss">${nl2br(platzhalter(doc.schlusstext, doc, s))}</div>` : ''}
      </div>
    </div>
    <footer class="s-fuss">
      ${steuerZeile ? `<div class="s-steuer">${esc(gross(steuerZeile))}</div>` : ''}
      <div class="s-spalten"><div>${links.map(esc).join('<br>')}</div><div>${rechts.map(esc).join('<br>')}</div></div>
    </footer>
  </div>`;
}

// Alternative Vorlage (farbiger Streifen, Infobox)
export function renderModern(doc, settings) {
  const s = settings;
  const f = s.firma;
  const sprache = doc.sprache || 'de';
  const t = sprachTexte(sprache);
  const c = berechne(doc);
  const istR = doc.typ === 'rechnung';
  const k = doc.kunde || {};
  const entwurf = istEntwurf(doc);
  const zeigeUst = !c.klein;
  const zeigeAnteil = !!doc.zeigeAnteil;
  const d = sprache === 'en' ? (iso) => datumLang(iso, 'en') : datum;

  const absenderZeile = [f.name, f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(' · ');
  const infos = [
    [istR ? t.rechnungsnummer : t.nummer, entwurf && !doc.nummer ? t.entwurf : doc.nummer],
    [t.datum, d(doc.datum)],
    doc.leistungsdatum ? [istR ? t.leistungsdatum : t.umzugstermin, d(doc.leistungsdatum)] : null,
    k.kundennummer ? [t.kundennummer, k.kundennummer] : null,
    istR && doc.faelligAm && !doc.storno ? [t.faellig, d(doc.faelligAm)] : null,
    !istR && doc.gueltigBis ? [t.gueltigBis, d(doc.gueltigBis)] : null
  ].filter((x) => x && x[1]);
  const felder = zusatzFelder(doc, s);

  const rows = c.positionen
    .map(
      (p, i) => `<tr>
        <td class="c-nr">${i + 1}</td>
        <td class="c-beschr">${nl2br(p.beschreibung)}</td>
        <td class="c-num">${zahl(p.menge, 3)} ${esc(p.einheit || '')}</td>
        <td class="c-num">${euro(p.preis)}</td>
        ${zeigeUst ? `<td class="c-num">${zahl(p.ustSatz ?? 19)} %</td>` : ''}
        ${zeigeAnteil ? `<td class="c-num">${prozent(p.anteil)}</td>` : ''}
        <td class="c-num c-summe">${euro(p.betrag)}</td>
      </tr>`
    )
    .join('');

  const summen = [];
  if (c.rabatt || zeigeUst) summen.push([t.zwischensumme, euro(c.summePos)]);
  if (c.rabatt) summen.push([`${t.rabatt} (${prozent(c.rabatt)})`, `– ${euro(c.rabattBetrag)}`]);
  if (zeigeUst) {
    if (c.rabatt) summen.push([t.netto, euro(c.netto)]);
    c.steuern.forEach((st) => summen.push([`${t.zzglUst(zahl(st.satz))} (${euro(st.basis)})`, euro(st.betrag)]));
  }
  const anzahlung = c.anzahlungProzent
    ? `<div class="d-anzahlung">
        <div><span>${istR ? t.anzahlung : t.anzahlungAuftrag} (${prozent(c.anzahlungProzent)})</span><b>${euro(c.anzahlung)}</b></div>
        <div><span>${istR ? t.rest : t.restUmzug}</span><b>${euro(c.rest)}</b></div>
      </div>`
    : '';
  const fuss = [
    [f.name, inhaberName(f) ? `${t.inhaber}: ${inhaberName(f)}` : '', f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')],
    [f.telefon ? `${t.tel}: ${f.telefon}` : '', f.email, f.web],
    [f.bank, f.iban ? `IBAN: ${f.iban}` : '', f.bic ? `BIC: ${f.bic}` : ''],
    [f.steuernummer ? `${t.steuernummer}: ${f.steuernummer}` : '', f.ustId ? `USt-IdNr.: ${f.ustId}` : '']
  ]
    .map((col) => col.filter(Boolean))
    .filter((col) => col.length)
    .map((col) => `<div>${col.map(esc).join('<br>')}</div>`)
    .join('');
  const einleitung = doc.storno ? t.stornoText(doc.bezugNummer || '', d(doc.bezugDatum)) : platzhalter(doc.einleitung, doc, s);

  return `<div class="doc-page${entwurf ? ' ist-entwurf' : ''}" data-entwurf="${esc(t.entwurf)}" style="--d-farbe:${esc(s.design?.farbe || '#E53935')};--d-akzent:${esc(s.design?.akzent || '#1F1F1F')};--d-schrift:'${esc(s.design?.schrift || 'Montserrat')}'">
    <div class="d-band"></div>
    <header class="d-kopf">
      <div class="d-logo">${f.logo ? `<img src="${esc(f.logo)}" alt="Logo">` : `<div class="d-firmenname">${esc(f.name)}</div>`}</div>
      <div class="d-titel-box">
        <div class="d-titel">${esc(gross(dokumentTitel(doc, sprache)))}</div>
        <div class="d-nummer">${esc(doc.nummer || (entwurf ? t.entwurf : ''))}</div>
      </div>
    </header>
    <section class="d-adressen">
      <div class="d-empfaenger">
        <div class="d-absender">${esc(absenderZeile)}</div>
        <div class="d-label">${istR ? t.rechnungAn : t.angebotFuer}</div>
        <div class="d-kunde">
          ${k.firma ? `<b>${esc(k.firma)}</b><br>` : ''}
          ${k.name ? `${k.firma ? '' : '<b>'}${esc(k.name)}${k.firma ? '' : '</b>'}<br>` : ''}
          ${esc(k.strasse || '')}${k.strasse ? '<br>' : ''}
          ${esc([k.plz, k.ort].filter(Boolean).join(' '))}
        </div>
      </div>
      <table class="d-infos">${infos.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
    </section>
    ${felder.length ? `<section class="d-felder">${felder.map(([l, v]) => `<div><span>${esc(gross(l))}</span>${nl2br(v)}</div>`).join('')}</section>` : ''}
    ${doc.betreff ? `<h2 class="d-betreff">${esc(doc.betreff)}</h2>` : ''}
    <p class="d-text">${doc.storno ? '' : `${k.name ? esc(t.anrede(k.name)) : t.anredeAllgemein}<br>`}${nl2br(einleitung)}</p>
    <table class="d-positionen">
      <thead><tr>
        <th class="c-nr">${gross(t.pos)}</th><th class="c-beschr">${gross(t.beschreibung)}</th><th class="c-num">${gross(t.menge)}</th><th class="c-num">${gross(t.einzelpreis)}</th>
        ${zeigeUst ? `<th class="c-num">${gross(t.ust)}</th>` : ''}${zeigeAnteil ? `<th class="c-num">${gross(t.anteil)}</th>` : ''}<th class="c-num">${gross(t.gesamt)}</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="7" class="d-leer">${t.leer}</td></tr>`}</tbody>
    </table>
    <div class="d-summen-wrap">
      <table class="d-summen">
        ${summen.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')}
        <tr class="d-gesamt"><td>${t.gesamtbetrag}${zeigeUst ? t.brutto : ''}</td><td>${euro(c.brutto)}</td></tr>
      </table>
    </div>
    ${anzahlung}
    ${c.klein ? `<p class="d-hinweis">${esc(kleinunternehmerText(s, sprache))}</p>` : ''}
    ${doc.storno ? '' : `<p class="d-text">${nl2br(platzhalter(doc.schlusstext, doc, s))}</p>`}
    ${f.iban && istR && !doc.storno ? `<div class="d-bank"><b>${t.bankverbindung}:</b> ${esc(f.bank)} · IBAN ${esc(f.iban)}${f.bic ? ` · BIC ${esc(f.bic)}` : ''} · ${t.verwendungszweck}: ${esc(doc.nummer)}</div>` : ''}
    <footer class="d-fuss">${fuss}</footer>
  </div>`;
}

// Einsatzzettel für einen Tag (alle Termine mit Adressen, Team, Hinweisen)
export function renderEinsatzzettel(tag, termine, settings, mitarbeiter) {
  const f = settings.firma;
  const name = (id) => mitarbeiter.find((m) => m.id === id)?.name || '';
  const karten = termine
    .slice()
    .sort((a, b) => (a.von || '').localeCompare(b.von || ''))
    .map(
      (t) => `<section class="e-termin">
        <div class="e-zeit">${esc(t.von || '')}${t.bis ? `<small>bis ${esc(t.bis)}</small>` : ''}</div>
        <div class="e-inhalt">
          <h2>${esc(t.titel || 'Einsatz')}</h2>
          <table>
            ${[
              ['Kunde', [t.kundeName, t.telefon ? `Tel. ${t.telefon}` : ''].filter(Boolean).join(' · ')],
              ['Von', t.vonAdresse],
              ['Nach', t.nachAdresse],
              ['Team', (t.mitarbeiterIds || []).map(name).filter(Boolean).join(', ')],
              ['Fahrzeug', t.fahrzeug],
              ['Hinweise', t.notiz]
            ]
              .filter(([, v]) => v)
              .map(([l, v]) => `<tr><th>${l}</th><td>${nl2br(v)}</td></tr>`)
              .join('')}
          </table>
        </div>
      </section>`
    )
    .join('');
  return `<div class="doc-page v-einsatz" style="--d-kopf:${esc(settings.design?.kopf || '#2B2B2B')};--d-farbe:${esc(settings.design?.farbe || '#E53935')}">
    <header class="e-kopf">
      <div>${f.logoHell ? `<img src="${esc(f.logoHell)}" alt="">` : `<b>${esc(f.name)}</b>`}</div>
      <div class="e-titel"><small>Einsatzzettel</small>${esc(datumLang(tag))}</div>
    </header>
    <div class="e-liste">${karten || '<p class="e-leer">Keine Termine an diesem Tag.</p>'}</div>
  </div>`;
}

// Kurzfassung als Text (für WhatsApp oder E-Mail an das Team)
export function einsatzText(tag, termine, mitarbeiter) {
  const name = (id) => mitarbeiter.find((m) => m.id === id)?.name || '';
  const zeilen = [`Einsätze am ${datum(tag)}`, ''];
  termine
    .slice()
    .sort((a, b) => (a.von || '').localeCompare(b.von || ''))
    .forEach((t) => {
      zeilen.push(`${t.von ? `${t.von} Uhr – ` : ''}${t.titel || 'Einsatz'}`);
      if (t.kundeName) zeilen.push(`Kunde: ${t.kundeName}${t.telefon ? ` (${t.telefon})` : ''}`);
      if (t.vonAdresse) zeilen.push(`Von: ${t.vonAdresse}`);
      if (t.nachAdresse) zeilen.push(`Nach: ${t.nachAdresse}`);
      const team = (t.mitarbeiterIds || []).map(name).filter(Boolean).join(', ');
      if (team) zeilen.push(`Team: ${team}`);
      if (t.fahrzeug) zeilen.push(`Fahrzeug: ${t.fahrzeug}`);
      if (t.notiz) zeilen.push(`Hinweise: ${t.notiz}`);
      zeilen.push('');
    });
  return zeilen.join('\n').trim();
}

export function dateiname(doc) {
  const art = doc.storno ? 'Stornorechnung' : doc.typ === 'rechnung' ? 'Rechnung' : 'Kostenvoranschlag';
  const kunde = (doc.kunde?.name || '').replace(/[^\wäöüÄÖÜß-]+/g, '_');
  return `${art}_${(doc.nummer || 'Entwurf').replace(/[^\w-]+/g, '_')}${kunde ? `_${kunde}` : ''}.pdf`;
}

// ---------- Übergabe-Protokoll (Zustand vor und nach dem Umzug) ----------
export const ZUSTAND_TEXT = {
  einwandfrei: 'Einwandfrei',
  gebrauchsspuren: 'Gebrauchsspuren',
  vorschaden: 'Vorschaden',
  'neuer-schaden': 'Neuer Schaden',
  '': 'Nicht angegeben'
};
export const PHASE_TEXT = { vorher: 'Vor dem Umzug', nachher: 'Nach dem Umzug' };
const zeitpunkt = (iso) => (iso ? new Date(iso).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const fotoNr = (f) => `${f.phase === 'nachher' ? 'N' : 'V'}${f.nr || '?'}`;
const norm = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/[^a-zäöüß0-9]+/g, ' ')
    .trim();

export function uebergabeDateiname(u) {
  return `Uebergabe-Protokoll_${(u.kundeName || 'Kunde').replace(/[^\wäöüÄÖÜß-]+/g, '_')}_${u.datum || ''}.pdf`.replace('_.pdf', '.pdf');
}

export function renderUebergabe({ uebergabe: u, fotos, unterschriften }, settings) {
  const f = settings.firma || {};
  const agbText = settings.uebergabe?.agbText || '';
  const agbLink = settings.uebergabe?.agbLink || '';
  const sig = (phase, wer) => unterschriften.find((x) => x.phase === phase && x.unterschrift === wer);
  const zeileFoto = (x) => {
    const ki = x.ki;
    const schaeden = [...(ki?.schaeden || [])];
    return `<figure class="u-foto">
      <div class="u-bild">${x.daten || x.vorschau ? `<img src="${esc(x.daten || x.vorschau)}" alt="">` : ''}<span class="u-nr">${fotoNr(x)}</span></div>
      <figcaption>
        <b>${esc([x.raum, x.gegenstand].filter(Boolean).join(' · ') || 'Ohne Beschriftung')}</b>
        <span class="u-zustand z-${esc(x.zustand || 'leer')}">${esc(ZUSTAND_TEXT[x.zustand || ''] || '')}</span>
        ${x.beschreibung ? `<p>${esc(x.beschreibung)}</p>` : ''}
        ${schaeden.length ? `<p class="u-schaeden">Sichtbar: ${schaeden.map(esc).join('; ')}</p>` : ''}
        ${ki?.verpackung ? `<p>Schutz: ${esc(ki.verpackung)}</p>` : ''}
        <small>${esc(zeitpunkt(x.erstellt))}${x.erstelltVon ? ` · ${esc(x.erstelltVon)}` : ''}${ki ? ' · Beschriftung mit Bilderkennung erstellt und geprüft' : ''}${x.sha256 ? ` · Prüfsumme ${esc(x.sha256.slice(0, 16))}…` : ''}</small>
      </figcaption>
    </figure>`;
  };
  const block = (phase) => {
    const p = u[phase] || {};
    const liste = fotos.filter((x) => x.phase === phase);
    const s = p.unterschrieben;
    const kunde = sig(phase, 'kunde');
    const mitarbeiter = sig(phase, 'mitarbeiter');
    return `<section class="u-phase">
      <h2><span>${phase === 'vorher' ? 'A' : 'B'}</span>${PHASE_TEXT[phase]} <small>${liste.length} Foto${liste.length === 1 ? '' : 's'}</small></h2>
      ${p.notiz ? `<p class="u-notiz"><b>Notiz:</b> ${nl2br(p.notiz)}</p>` : ''}
      ${liste.length ? `<div class="u-raster">${liste.map(zeileFoto).join('')}</div>` : '<p class="u-leer">Keine Fotos.</p>'}
      ${
        phase === 'nachher' && s
          ? `<div class="u-ergebnis ${s.schaeden === 'gemeldet' ? 'schaden' : 'ok'}">${
              s.schaeden === 'gemeldet' ? `<b>Vom Kunden gemeldete Schäden:</b><br>${nl2br(s.schadenText)}` : '<b>Der Kunde bestätigt: Es wurden keine neuen Schäden festgestellt.</b>'
            }</div>`
          : ''
      }
      <div class="u-unterschrift">
        <p class="u-erklaerung">${
          phase === 'vorher'
            ? `Der Kunde bestätigt, dass die oben dokumentierten Fotos den Zustand der Möbel und Gegenstände <b>vor dem Umzug</b> richtig wiedergeben, und akzeptiert die Allgemeinen Geschäftsbedingungen von ${esc(f.name || 'uns')}${agbLink ? ` (${esc(agbLink)})` : agbText ? ' (siehe Anhang)' : ''}.`
            : `Der Kunde bestätigt, dass die oben dokumentierten Fotos den Zustand der Möbel und Gegenstände <b>nach dem Umzug</b> richtig wiedergeben${s?.schaeden === 'gemeldet' ? ' und hat die genannten Schäden gemeldet' : ' und dass keine neuen Schäden festgestellt wurden'}.`
        }</p>
        ${
          s
            ? `<div class="u-sig-reihe">
                <div><div class="u-sig">${kunde?.daten ? `<img src="${esc(kunde.daten)}" alt="">` : ''}</div><span>${esc(s.kundeName)} (Kunde)</span></div>
                <div><div class="u-sig">${mitarbeiter?.daten ? `<img src="${esc(mitarbeiter.daten)}" alt="">` : ''}</div><span>${esc(s.mitarbeiterName)} (${esc(f.name || 'Mitarbeiter')})</span></div>
              </div>
              <p class="u-zeit">Unterschrieben am ${esc(zeitpunkt(s.am))}${phase === 'vorher' && s.agbAkzeptiert ? ' · AGB akzeptiert' : ''}</p>`
            : '<p class="u-offen">Noch nicht unterschrieben.</p>'
        }
      </div>
    </section>`;
  };
  // Gegenüberstellung: gleicher Gegenstand vorher und nachher
  const paare = [];
  for (const v of fotos.filter((x) => x.phase === 'vorher' && x.gegenstand)) {
    const n = fotos.find((x) => x.phase === 'nachher' && norm(x.gegenstand) === norm(v.gegenstand) && !paare.some((p) => p.n === x));
    if (n) paare.push({ v, n });
  }
  const tabelleKopf = [
    ['Kunde', [u.kundeName, u.telefon, u.email].filter(Boolean).join(' · ')],
    ['Leistung', u.leistung],
    ['Datum', u.datum ? datum(u.datum) : ''],
    ['Von', u.vonAdresse],
    ['Nach', u.nachAdresse]
  ].filter(([, v]) => v);
  return `<div class="doc-page v-uebergabe" style="--d-kopf:${esc(settings.design?.kopf || '#2B2B2B')};--d-farbe:${esc(settings.design?.farbe || '#E53935')}">
    <header class="e-kopf">
      <div>${f.logoHell ? `<img src="${esc(f.logoHell)}" alt="">` : `<b>${esc(f.name || '')}</b>`}</div>
      <div class="e-titel"><small>Übergabe-Protokoll</small>Zustand vor &amp; nach dem Umzug</div>
    </header>
    <div class="u-inhalt">
      <table class="u-daten">${tabelleKopf.map(([l, v]) => `<tr><th>${l}</th><td>${esc(v)}</td></tr>`).join('')}</table>
      <p class="u-intro">Dieses Protokoll dokumentiert mit nummerierten Fotos den Zustand der Möbel und Gegenstände vor dem Umzug (A, Fotos V1, V2 …) und nach dem Umzug (B, Fotos N1, N2 …). Beide Teile werden vom Kunden und von einem Mitarbeiter von ${esc(f.name || 'uns')} unterschrieben. Jedes Foto trägt Aufnahmezeit und Prüfsumme; nach der Unterschrift kann es nicht mehr verändert oder gelöscht werden.</p>
      ${block('vorher')}
      ${block('nachher')}
      ${
        paare.length
          ? `<section class="u-phase u-vergleich"><h2><span>C</span>Gegenüberstellung</h2>
              <table><thead><tr><th>Gegenstand</th><th>Vorher</th><th>Nachher</th></tr></thead><tbody>${paare
                .map(({ v, n }) => `<tr><td>${esc(v.gegenstand)}</td><td>${fotoNr(v)} – ${esc(ZUSTAND_TEXT[v.zustand || ''])}</td><td>${fotoNr(n)} – ${esc(ZUSTAND_TEXT[n.zustand || ''])}</td></tr>`)
                .join('')}</tbody></table></section>`
          : ''
      }
      <p class="u-hinweis">Hinweis: Äußerlich erkennbare Schäden sind spätestens am Tag nach der Ablieferung, äußerlich nicht erkennbare Schäden innerhalb von 14 Tagen nach der Ablieferung schriftlich anzuzeigen (§ 451f HGB).</p>
      ${agbText ? `<section class="u-agb"><h2>Anhang: Allgemeine Geschäftsbedingungen</h2><div>${nl2br(agbText)}</div></section>` : ''}
      <p class="u-fuss">${esc(f.name || '')}${f.strasse ? ` · ${esc(f.strasse)}` : ''}${f.plz || f.ort ? ` · ${esc([f.plz, f.ort].filter(Boolean).join(' '))}` : ''}${f.telefon ? ` · Tel. ${esc(f.telefon)}` : ''} · Protokoll-Nr. ${esc(String(u.id).slice(0, 8).toUpperCase())} · erstellt ${esc(zeitpunkt(new Date().toISOString()))}</p>
    </div>
  </div>`;
}
