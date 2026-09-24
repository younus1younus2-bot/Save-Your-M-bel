// Übersicht (Diagramme) und Buchhaltung
let charts = [];
function zerstoereCharts() {
  charts.forEach((c) => c.destroy());
  charts = [];
}

// Netto-Betrag einer Buchung (bei Kleinunternehmern = Brutto)
const nettoBuchung = (b) => r2(parseZahl(b.betrag) - parseZahl(b.ust));

function jahresZahlen(jahr) {
  const monate = Array.from({ length: 12 }, () => ({ umsatz: 0, kosten: 0 }));
  const kostenKat = {};
  const umsatzKat = {};
  let ustEin = 0;
  let vorsteuer = 0;
  S.buchungen
    .filter((b) => (b.datum || '').startsWith(String(jahr)))
    .forEach((b) => {
      const m = Number(b.datum.slice(5, 7)) - 1;
      const n = nettoBuchung(b);
      if (b.typ === 'einnahme') {
        monate[m].umsatz += n;
        umsatzKat[b.kategorie || 'Sonstiges'] = (umsatzKat[b.kategorie || 'Sonstiges'] || 0) + n;
        ustEin += parseZahl(b.ust);
      } else {
        monate[m].kosten += n;
        kostenKat[b.kategorie || 'Sonstiges'] = (kostenKat[b.kategorie || 'Sonstiges'] || 0) + n;
        vorsteuer += parseZahl(b.ust);
      }
    });
  const umsatz = r2(monate.reduce((a, m) => a + m.umsatz, 0));
  const kosten = r2(monate.reduce((a, m) => a + m.kosten, 0));
  return { monate, kostenKat, umsatzKat, umsatz, kosten, gewinn: r2(umsatz - kosten), ustEin: r2(ustEin), vorsteuer: r2(vorsteuer) };
}

function verfuegbareJahre() {
  const j = new Set([new Date().getFullYear()]);
  S.buchungen.forEach((b) => b.datum && j.add(Number(b.datum.slice(0, 4))));
  S.dokumente.forEach((d) => d.datum && j.add(Number(d.datum.slice(0, 4))));
  return [...j].sort((a, b) => b - a);
}

const CHART_FARBEN = ['#E53935', '#64748B', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#A8A29E', '#F97316'];
const farbe = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// ---------- Übersicht ----------
function viewDashboard() {
  zerstoereCharts();
  const jahre = verfuegbareJahre();
  const jahr = Number(merker.get('jahr')) || jahre[0];
  const z = jahresZahlen(jahr);
  const vorjahr = jahresZahlen(jahr - 1);
  const marge = z.umsatz ? (z.gewinn / z.umsatz) * 100 : 0;
  const offen = S.dokumente.filter((d) => d.typ === 'rechnung' && d.status === 'offen');
  const ueberf = offen.filter(istUeberfaellig);
  const angebote = S.dokumente.filter((d) => d.typ === 'angebot' && (d.datum || '').startsWith(String(jahr)));
  const angenommen = angebote.filter((d) => d.status === 'angenommen').length;
  const entschieden = angebote.filter((d) => ['angenommen', 'abgelehnt'].includes(d.status)).length;
  const quote = entschieden ? (angenommen / entschieden) * 100 : 0;
  // Trend zum Vorjahr; bei Kosten ist ein Anstieg schlecht
  const diff = (a, b, mehrIstGut = true) => {
    if (!b) return '<small>kein Vorjahreswert</small>';
    const gut = (a >= b) === mehrIstGut;
    return `<span class="trend ${gut ? 'trend-gut' : 'trend-schlecht'}">${a >= b ? '↑' : '↓'} ${prozent(Math.abs(((a - b) / b) * 100))}</span>`;
  };
  const stunde = new Date().getHours();
  const gruss = stunde < 11 ? 'Guten Morgen' : stunde < 18 ? 'Guten Tag' : 'Guten Abend';
  const heuteText = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const termineHeute = S.termine.filter((t) => t.datum === heute() && t.status !== 'abgesagt').length;

  const naechste = S.termine
    .filter((t) => t.datum >= heute())
    .sort((a, b) => (a.datum + (a.von || '')).localeCompare(b.datum + (b.von || '')))
    .slice(0, 6);

  // Kleinunternehmer-Grenzen (§ 19 UStG, seit 2025): Vorjahr max. 25.000 €, laufendes Jahr max. 100.000 €
  const klein = S.settings.steuer.modus === 'klein';
  const grenzeVJ = 25000;
  const grenzeLJ = 100000;

  $('#main').innerHTML = `
    <div class="seiten-kopf begruessung">
      <div>
        <h1>${gruss}${S.settings.firma.vorname ? `, ${esc(S.settings.firma.vorname)}` : ''}</h1>
        <p>${heuteText} · ${termineHeute ? `${termineHeute} Termin${termineHeute > 1 ? 'e' : ''} heute` : 'heute keine Termine'}${ueberf.length ? ` · <span class="rot">${ueberf.length} Rechnung${ueberf.length > 1 ? 'en' : ''} überfällig</span>` : ''}</p>
      </div>
      <select id="jahrWahl">${jahre.map((j) => `<option ${j === jahr ? 'selected' : ''}>${j}</option>`).join('')}</select>
    </div>
    ${schnellstartKarte()}
    <div class="kpi-reihe">
      <div class="kpi"><span>Umsatz ${jahr}${klein ? '' : ' (netto)'}</span><b>${euro(z.umsatz)}</b>${diff(z.umsatz, vorjahr.umsatz)}</div>
      <div class="kpi"><span>Kosten ${jahr}</span><b>${euro(z.kosten)}</b>${diff(z.kosten, vorjahr.kosten, false)}</div>
      <div class="kpi kpi-hervor"><span>Gewinn ${jahr}</span><b>${euro(z.gewinn)}</b><small>Gewinnmarge ${prozent(marge)}</small></div>
      <div class="kpi"><span>Offene Rechnungen</span><b>${euro(offen.reduce((a, d) => a + berechne(d).brutto, 0))}</b><small>${offen.length} offen${ueberf.length ? `, <span class="rot">${ueberf.length} überfällig</span>` : ''}</small></div>
      <div class="kpi"><span>Kostenvoranschläge ${jahr}</span><b>${angebote.length}</b><small>Annahmequote ${prozent(quote)}</small></div>
    </div>

    <div class="raster-dash">
      <div class="karte span-2"><h3>Umsatz, Kosten & Gewinn pro Monat</h3><div class="chart-box"><canvas id="c-monate"></canvas></div></div>
      <div class="karte"><h3>Kosten nach Kategorie</h3><div class="chart-box klein"><canvas id="c-kosten"></canvas></div><div id="l-kosten" class="anteile"></div></div>
      <div class="karte"><h3>Umsatz nach Leistung</h3><div class="chart-box klein"><canvas id="c-umsatz"></canvas></div><div id="l-umsatz" class="anteile"></div></div>
      <div class="karte">
        <h3>Nächste Termine</h3>
        ${naechste.length ? `<ul class="termin-liste">${naechste.map((t) => `<li><b>${datum(t.datum)}${t.von ? ` ${esc(t.von)}` : ''}</b> ${esc(t.titel || t.kundeName || '')}<br><small>${esc(mitarbeiterNamen(t))}</small></li>`).join('')}</ul>` : '<p class="leer">Keine anstehenden Termine.</p>'}
        <a href="#/kalender">Zum Kalender →</a>
      </div>
      <div class="karte">
        <h3>${klein ? 'Kleinunternehmer-Grenze' : 'Umsatzsteuer ' + jahr}</h3>
        ${klein
          ? `${grenzBalken(`Vorjahr ${jahr - 1}`, vorjahr.umsatz, grenzeVJ)}${grenzBalken(`Laufendes Jahr ${jahr}`, z.umsatz, grenzeLJ)}
             <p class="hilfe">Kleinunternehmer bleibt, wer im Vorjahr max. ${euro(grenzeVJ)} und im laufenden Jahr max. ${euro(grenzeLJ)} Umsatz hat. Wird ${euro(grenzeLJ)} im laufenden Jahr überschritten, gilt ab dem Umsatz, der die Grenze überschreitet, die Regelbesteuerung – dann unter Einstellungen → Steuer umstellen. Bitte mit Steuerberater abstimmen.</p>`
          : `<div class="summen-box"><div><span>Eingenommene USt.</span><b>${euro(z.ustEin)}</b></div><div><span>Vorsteuer aus Kosten</span><b>– ${euro(z.vorsteuer)}</b></div><div><span>Zahllast an Finanzamt</span><b>${euro(z.ustEin - z.vorsteuer)}</b></div></div>`}
      </div>
      ${ueberf.length ? `<div class="karte span-2"><h3 class="rot">Überfällige Rechnungen</h3><table class="tabelle">${ueberf.map((d) => `<tr class="klickbar" onclick="location.hash='#/dokument/${d.id}'"><td>${esc(d.nummer)}</td><td>${esc(d.kunde?.name || '')}</td><td>fällig ${datum(d.faelligAm)}</td><td class="c-num">${euro(berechne(d).brutto)}</td></tr>`).join('')}</table></div>` : ''}
    </div>`;

  if ($('#ss-weg'))
    $('#ss-weg').onclick = async () => {
      S.settings.schnellstartAus = true;
      await speichereEinstellungen();
      viewDashboard();
    };
  $('#jahrWahl').onchange = (e) => {
    merker.set('jahr', e.target.value);
    viewDashboard();
  };

  if (!window.Chart) return;
  Chart.defaults.font.family = "Aileron, 'Helvetica Neue', Arial, sans-serif";
  Chart.defaults.color = farbe('--text-3');
  Chart.defaults.borderColor = farbe('--rand');
  charts.push(
    new Chart($('#c-monate'), {
      data: {
        labels: MONATE_KURZ,
        datasets: [
          { type: 'bar', label: 'Umsatz', data: z.monate.map((m) => r2(m.umsatz)), backgroundColor: farbe('--text'), borderRadius: 6, maxBarThickness: 22 },
          { type: 'bar', label: 'Kosten', data: z.monate.map((m) => r2(m.kosten)), backgroundColor: farbe('--akzent'), borderRadius: 6, maxBarThickness: 22 },
          { type: 'line', label: 'Gewinn', data: z.monate.map((m, i) => (istZukunft(jahr, i) ? null : r2(m.umsatz - m.kosten))), borderColor: farbe('--gruen'), backgroundColor: farbe('--gruen'), tension: 0.35, borderWidth: 2.5, pointRadius: 3 }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { align: 'end', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3 } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${euro(ctx.parsed.y)}` } } },
        scales: { x: { grid: { display: false } }, y: { border: { display: false }, ticks: { callback: (v) => euro(v) } } }
      }
    })
  );
  donut('c-kosten', 'l-kosten', z.kostenKat);
  donut('c-umsatz', 'l-umsatz', z.umsatzKat);
}

// Monate in der Zukunft nicht als 0 € Gewinn zeichnen
function istZukunft(jahr, monatIndex) {
  const d = new Date();
  return jahr > d.getFullYear() || (jahr === d.getFullYear() && monatIndex > d.getMonth());
}

// Schnellstart: was noch eingerichtet werden sollte
function schnellstartKarte() {
  const s = S.settings;
  const f = s.firma;
  const schritte = [
    ['Firmendaten prüfen (Adresse, Telefon, E-Mail)', f.strasse && f.telefon && f.email, '#/einstellungen/firma'],
    ['Steuernummer und Bankverbindung eintragen', f.steuernummer && f.iban, '#/einstellungen/firma'],
    ['Rechnungsnummer prüfen (nächste Nummer)', s.nummernGeprueft, '#/einstellungen/nummern'],
    ['E-Mail-Versand einrichten', s.email.smtpAusEnv || (s.email.smtp.host && s.email.smtp.user), '#/einstellungen/email'],
    ['Preisliste anpassen', s.preiseGeprueft, '#/einstellungen/preise'],
    ['Mitarbeiter anlegen', S.mitarbeiter.length > 0, '#/mitarbeiter'],
    ['Ersten Kostenvoranschlag schreiben', S.dokumente.length > 0, '#/neu/angebot']
  ];
  const offen = schritte.filter(([, ok]) => !ok).length;
  if (!offen || s.schnellstartAus) return '';
  return `<div class="karte schnellstart">
    <div class="karte-kopf"><h3>Schnellstart – noch ${offen} von ${schritte.length} Schritten</h3><button class="btn-icon" id="ss-weg" title="Ausblenden">✕</button></div>
    <ol>${schritte.map(([text, ok, link]) => `<li class="${ok ? 'erledigt' : ''}"><a href="${link}">${esc(text)}${ok ? ' <span class="gruen">✓</span>' : ''}</a></li>`).join('')}</ol>
  </div>`;
}

function donut(canvasId, legendId, daten) {
  const eintraege = Object.entries(daten).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const summe = eintraege.reduce((a, [, v]) => a + v, 0);
  if (!eintraege.length) {
    $('#' + canvasId).parentElement.hidden = true;
    $('#' + legendId).innerHTML = '<p class="leer">Noch keine Daten.</p>';
    return;
  }
  charts.push(
    new Chart($('#' + canvasId), {
      type: 'doughnut',
      data: { labels: eintraege.map(([k]) => k), datasets: [{ data: eintraege.map(([, v]) => r2(v)), backgroundColor: CHART_FARBEN, borderColor: farbe('--flaeche'), borderWidth: 3 }] },
      options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${euro(ctx.parsed)} (${prozent((ctx.parsed / summe) * 100)})` } } } }
    })
  );
  $('#' + legendId).innerHTML = eintraege
    .map(([k, v], i) => `<div><i style="background:${CHART_FARBEN[i % CHART_FARBEN.length]}"></i><span>${esc(k)}</span><b>${prozent((v / summe) * 100)}</b><small>${euro(v)}</small></div>`)
    .join('');
}

function grenzBalken(label, wert, grenze) {
  const p = Math.min(100, (wert / grenze) * 100);
  const klasse = p >= 100 ? 'rot' : p >= 80 ? 'orange' : 'gruen';
  return `<div class="grenze"><div class="grenze-kopf"><span>${label}</span><b>${euro(wert)} / ${euro(grenze)}</b></div><div class="balken"><div class="balken-${klasse}" style="width:${p}%"></div></div><small>${prozent((wert / grenze) * 100)} ausgeschöpft</small></div>`;
}

// ---------- Buchhaltung ----------
function viewBuchhaltung() {
  const jahre = verfuegbareJahre();
  const jahr = Number(merker.get('jahr')) || jahre[0];
  const regel = S.settings.steuer.modus === 'regel';

  $('#main').innerHTML = `
    <div class="seiten-kopf">
      <h1>Buchhaltung</h1>
      <div class="btn-gruppe">
        <button class="btn btn-gruen" id="neuEin">+ Einnahme</button>
        <button class="btn btn-primaer" id="neuAus">+ Ausgabe</button>
        <button class="btn" id="csv">CSV-Export</button>
      </div>
    </div>
    <div class="filter-leiste">
      <select id="b-jahr">${jahre.map((j) => `<option ${j === jahr ? 'selected' : ''}>${j}</option>`).join('')}</select>
      <select id="b-monat"><option value="">Ganzes Jahr</option>${MONATE.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}">${m}</option>`).join('')}</select>
      <select id="b-typ"><option value="">Einnahmen & Ausgaben</option><option value="einnahme">Nur Einnahmen</option><option value="ausgabe">Nur Ausgaben</option></select>
      <input type="search" id="b-suche" placeholder="Suchen…">
    </div>
    <div class="raster-buch">
      <div class="karte"><table class="tabelle" id="b-tabelle"></table></div>
      <div class="karte" id="euer"></div>
    </div>
    <p class="hilfe">Bezahlte Rechnungen werden automatisch als Einnahme gebucht. Beträge werden brutto (so wie auf dem Beleg) eingegeben.</p>`;

  const filter = () => {
    const j = $('#b-jahr').value;
    const m = $('#b-monat').value;
    const t = $('#b-typ').value;
    const q = $('#b-suche').value.toLowerCase();
    return S.buchungen
      .filter((b) => (b.datum || '').startsWith(m ? `${j}-${m}` : j))
      .filter((b) => !t || b.typ === t)
      .filter((b) => !q || [b.beschreibung, b.kategorie, b.belegNr].join(' ').toLowerCase().includes(q))
      .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  };

  const zeichne = () => {
    if (!$('#b-tabelle')) return;
    merker.set('jahr', $('#b-jahr').value);
    const liste = filter();
    const ein = liste.filter((b) => b.typ === 'einnahme');
    const aus = liste.filter((b) => b.typ === 'ausgabe');
    const sum = (l, f) => r2(l.reduce((a, b) => a + f(b), 0));
    $('#b-tabelle').innerHTML = liste.length
      ? `<thead><tr><th>Datum</th><th>Beleg</th><th>Beschreibung</th><th>Kategorie</th>${regel ? '<th class="c-num">USt.</th>' : ''}<th class="c-num">Betrag</th></tr></thead>
        <tbody>${liste
          .map(
            (b) => `<tr class="klickbar" data-id="${b.id}"><td>${datum(b.datum)}</td><td>${esc(b.belegNr || '')}</td><td>${esc(b.beschreibung)}${b.dokumentId ? ' <span class="badge">automatisch</span>' : ''}</td><td>${esc(b.kategorie)}</td>
            ${regel ? `<td class="c-num">${euro(b.ust)}</td>` : ''}<td class="c-num ${b.typ === 'einnahme' ? 'gruen' : 'rot'}">${b.typ === 'einnahme' ? '+' : '–'} ${euro(b.betrag)}</td></tr>`
          )
          .join('')}</tbody>`
      : '<tbody><tr><td class="leer">Keine Buchungen im gewählten Zeitraum.</td></tr></tbody>';
    $$('#b-tabelle tr[data-id]').forEach((tr) => (tr.onclick = () => buchungDialog(S.buchungen.find((b) => b.id === tr.dataset.id), zeichne)));

    const einN = sum(ein, nettoBuchung);
    const ausN = sum(aus, nettoBuchung);
    const zeitraum = $('#b-monat').value ? `${MONATE[Number($('#b-monat').value) - 1]} ${$('#b-jahr').value}` : $('#b-jahr').value;
    $('#euer').innerHTML = `<h3>Einnahmen-Überschuss-Rechnung<br><small>${zeitraum}</small></h3>
      <div class="summen-box">
        <div><span>Betriebseinnahmen${regel ? ' (netto)' : ''}</span><b class="gruen">${euro(einN)}</b></div>
        <div><span>Betriebsausgaben${regel ? ' (netto)' : ''}</span><b class="rot">– ${euro(ausN)}</b></div>
        <div class="summe"><span>Gewinn / Verlust</span><b>${euro(einN - ausN)}</b></div>
        ${regel ? `<div><span>Vereinnahmte USt.</span><b>${euro(sum(ein, (b) => parseZahl(b.ust)))}</b></div><div><span>Gezahlte Vorsteuer</span><b>– ${euro(sum(aus, (b) => parseZahl(b.ust)))}</b></div><div class="summe"><span>USt.-Zahllast</span><b>${euro(sum(ein, (b) => parseZahl(b.ust)) - sum(aus, (b) => parseZahl(b.ust)))}</b></div>` : ''}
      </div>
      <h4>Ausgaben nach Kategorie</h4>
      <div class="anteile">${Object.entries(aus.reduce((m, b) => ((m[b.kategorie] = (m[b.kategorie] || 0) + nettoBuchung(b)), m), {}))
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `<div><span>${esc(k)}</span><b>${prozent(ausN ? (v / ausN) * 100 : 0)}</b><small>${euro(v)}</small></div>`)
        .join('') || '<p class="leer">–</p>'}</div>`;
  };

  ['b-jahr', 'b-monat', 'b-typ', 'b-suche'].forEach((id) => ($('#' + id).oninput = zeichne));
  $('#neuEin').onclick = () => buchungDialog({ typ: 'einnahme' }, zeichne);
  $('#neuAus').onclick = () => buchungDialog({ typ: 'ausgabe' }, zeichne);
  $('#csv').onclick = () => {
    const kopf = ['Datum', 'Typ', 'Beleg', 'Beschreibung', 'Kategorie', 'Brutto', 'USt', 'Netto'];
    const zeilen = filter().map((b) => [datum(b.datum), b.typ === 'einnahme' ? 'Einnahme' : 'Ausgabe', b.belegNr || '', b.beschreibung || '', b.kategorie || '', zahl(b.betrag), zahl(b.ust), zahl(nettoBuchung(b))]);
    const csv = [kopf, ...zeilen].map((z) => z.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `Buchhaltung_${$('#b-jahr').value}${$('#b-monat').value ? '-' + $('#b-monat').value : ''}.csv`);
  };
  zeichne();
}

function buchungDialog(b, fertig) {
  const regel = S.settings.steuer.modus === 'regel';
  const istEin = b.typ === 'einnahme';
  const kats = istEin ? S.settings.kategorienEinnahmen : S.settings.kategorienAusgaben;
  const satzStart = b.id && parseZahl(b.betrag) ? Math.round((parseZahl(b.ust) / (parseZahl(b.betrag) - parseZahl(b.ust) || 1)) * 100) : regel ? S.settings.steuer.satz : 0;
  const { el, close } = modal(`${b.id ? 'Buchung bearbeiten' : istEin ? 'Neue Einnahme' : 'Neue Ausgabe'}`, `
    <div class="formular">
      ${b.dokumentId ? '<p class="hinweis-box">Diese Buchung wurde automatisch aus einer bezahlten Rechnung erstellt. Änderungen bitte in der Rechnung vornehmen.</p>' : ''}
      <div class="raster-2">
        <label>Datum<input type="date" id="bu-datum" value="${esc(b.datum || heute())}"></label>
        <label>Beleg-Nr.<input id="bu-beleg" value="${esc(b.belegNr || '')}"></label>
        <label class="span-2">Beschreibung<input id="bu-beschr" value="${esc(b.beschreibung || '')}" placeholder="${istEin ? 'z. B. Barzahlung Umzug Müller' : 'z. B. Tankfüllung Transporter'}"></label>
        <label>Kategorie<input id="bu-kat" list="bu-kats" value="${esc(b.kategorie || kats[0] || '')}"><datalist id="bu-kats">${kats.map((k) => `<option value="${esc(k)}">`).join('')}</datalist></label>
        <label>Betrag brutto (€)<input id="bu-betrag" inputmode="decimal" value="${b.betrag ? esc(zahl(b.betrag)) : ''}"></label>
        ${regel ? `<label>Enthaltene USt.<select id="bu-satz">${[19, 7, 0].map((x) => `<option value="${x}" ${satzStart === x ? 'selected' : ''}>${x} %</option>`).join('')}</select></label><label>USt.-Betrag<input id="bu-ust" readonly></label>` : ''}
      </div>
      <div class="btn-gruppe rechts">
        ${b.id && !b.dokumentId ? '<button class="btn rot" id="bu-del">Löschen</button>' : ''}
        <button class="btn" data-close2>Abbrechen</button>
        <button class="btn btn-primaer" id="bu-ok" ${b.dokumentId ? 'disabled' : ''}>Speichern</button>
      </div>
    </div>`);
  const ustBerechnen = () => {
    if (!regel) return 0;
    const brutto = parseZahl($('#bu-betrag', el).value);
    const satz = Number($('#bu-satz', el).value);
    const ust = r2(brutto - brutto / (1 + satz / 100));
    $('#bu-ust', el).value = euro(ust);
    return ust;
  };
  if (regel) {
    $('#bu-betrag', el).oninput = ustBerechnen;
    $('#bu-satz', el).onchange = ustBerechnen;
    ustBerechnen();
  }
  $('[data-close2]', el).onclick = close;
  if ($('#bu-del', el))
    $('#bu-del', el).onclick = async () => {
      if (!(await bestaetigen('Buchung löschen?'))) return;
      await loesche('buchungen', b.id);
      close();
      fertig();
    };
  $('#bu-ok', el).onclick = async () => {
    const betrag = parseZahl($('#bu-betrag', el).value);
    if (!betrag) return toast('Bitte Betrag eingeben', 'fehler');
    await speichere('buchungen', {
      ...b,
      datum: $('#bu-datum', el).value,
      belegNr: $('#bu-beleg', el).value,
      beschreibung: $('#bu-beschr', el).value,
      kategorie: $('#bu-kat', el).value || 'Sonstiges',
      betrag,
      ust: ustBerechnen()
    });
    toast('Gespeichert');
    close();
    fertig();
  };
}

// ---------- Kunden ----------
function viewKunden() {
  $('#main').innerHTML = `
    <div class="seiten-kopf"><h1>Kunden</h1><button class="btn btn-primaer" id="k-neu">+ Neuer Kunde</button></div>
    <div class="filter-leiste"><input type="search" id="k-suche" placeholder="Suchen…"></div>
    <div class="karte"><table class="tabelle" id="k-tabelle"></table></div>`;
  const zeichne = () => {
    if (!$('#k-tabelle')) return;
    const q = $('#k-suche').value.toLowerCase();
    const liste = S.kunden
      .filter((k) => !q || [k.name, k.firma, k.ort, k.email, k.telefon, k.kundennummer].join(' ').toLowerCase().includes(q))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    $('#k-tabelle').innerHTML = liste.length
      ? `<thead><tr><th>Nr.</th><th>Name</th><th>Ort</th><th>Telefon</th><th>E-Mail</th><th class="c-num">Umsatz</th></tr></thead><tbody>${liste
          .map((k) => {
            const ums = S.dokumente.filter((d) => d.kundeId === k.id && d.typ === 'rechnung' && d.status !== 'storniert').reduce((a, d) => a + berechne(d).brutto, 0);
            return `<tr class="klickbar" data-id="${k.id}"><td>${esc(k.kundennummer || '')}</td><td><b>${esc(k.name)}</b>${k.firma ? `<br><small>${esc(k.firma)}</small>` : ''}</td><td>${esc([k.plz, k.ort].filter(Boolean).join(' '))}</td><td>${esc(k.telefon || '')}</td><td>${esc(k.email || '')}</td><td class="c-num">${euro(ums)}</td></tr>`;
          })
          .join('')}</tbody>`
      : '<tbody><tr><td class="leer">Noch keine Kunden.</td></tr></tbody>';
    $$('#k-tabelle tr[data-id]').forEach((tr) => (tr.onclick = () => kundeDialog(S.kunden.find((k) => k.id === tr.dataset.id), zeichne)));
  };
  $('#k-suche').oninput = zeichne;
  $('#k-neu').onclick = () => kundeDialog({}, zeichne);
  zeichne();
}

function kundeDialog(k, fertig) {
  const docs = k.id ? S.dokumente.filter((d) => d.kundeId === k.id).sort((a, b) => (b.datum || '').localeCompare(a.datum || '')) : [];
  const felder = [['name', 'Name *'], ['firma', 'Firma'], ['strasse', 'Straße & Nr.'], ['plz', 'PLZ'], ['ort', 'Ort'], ['telefon', 'Telefon'], ['email', 'E-Mail']];
  const { el, close } = modal(k.id ? k.name : 'Neuer Kunde', `
    <div class="formular">
      <div class="raster-2">${felder.map(([f, l]) => `<label class="${f === 'strasse' ? 'span-2' : ''}">${l}<input data-kf="${f}" value="${esc(k[f] || '')}"></label>`).join('')}
      <label class="span-2">Notiz<textarea data-kf="notiz" rows="2">${esc(k.notiz || '')}</textarea></label></div>
      ${docs.length ? `<h4>Dokumente</h4><table class="tabelle">${docs.map((d) => `<tr class="klickbar" data-doc="${d.id}"><td>${esc(d.nummer)}</td><td>${datum(d.datum)}</td><td>${statusBadge(d)}</td><td class="c-num">${euro(berechne(d).brutto)}</td></tr>`).join('')}</table>` : ''}
      <div class="btn-gruppe rechts">
        ${k.id ? '<button class="btn rot" id="k-del">Löschen</button><a class="btn" id="k-kv">+ Kostenvoranschlag</a><a class="btn" id="k-re">+ Rechnung</a>' : ''}
        <button class="btn btn-primaer" id="k-ok">Speichern</button>
      </div>
    </div>`);
  const werte = () => Object.fromEntries($$('[data-kf]', el).map((i) => [i.dataset.kf, i.value]));
  $$('[data-doc]', el).forEach((tr) => (tr.onclick = () => { close(); location.hash = `#/dokument/${tr.dataset.doc}`; }));
  $('#k-ok', el).onclick = async () => {
    const w = werte();
    if (!w.name) return toast('Bitte Namen eingeben', 'fehler');
    await speichere('kunden', { ...k, ...w, kundennummer: k.kundennummer || naechsteKundennummer() });
    toast('Gespeichert');
    close();
    fertig();
  };
  if (k.id) {
    $('#k-del', el).onclick = async () => {
      if (!(await bestaetigen(`${k.name} löschen? (Rechnungen bleiben erhalten)`))) return;
      await loesche('kunden', k.id);
      close();
      fertig();
    };
    const neuMit = (typ) => async () => {
      close();
      merker.set('vorKunde', k.id);
      location.hash = `#/neu/${typ}`;
    };
    $('#k-kv', el).onclick = neuMit('angebot');
    $('#k-re', el).onclick = neuMit('rechnung');
  }
}
