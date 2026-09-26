// Übersicht (Diagramme, Erinnerungen) und Buchhaltung
import backend from 'backend';
import { MONATE, MONATE_KURZ, berechne, datum, esc, euro, heute, parseZahl, prozent, r2, zahl } from '../../shared/rechnen.js';
import { erinnerungen } from '../../shared/erinnerungen.js';
import { S, ladeAlles, loescheMitRueckgaengig, speichere, speichereEinstellungen } from '../state.js';
import { CHART_FARBEN, farbe, istUeberfaellig, main, mitarbeiterNamen } from '../helfer.js';
import { $, $$, dauerMerker, merker, modal, tipp, toast } from '../ui.js';
import { dateiVormerken, fotoBereich } from '../fotos.js';

let charts = [];
export function zerstoereCharts() {
  charts.forEach((c) => c.destroy());
  charts = [];
}

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
      const kat = b.kategorie || 'Sonstiges';
      if (b.typ === 'einnahme') {
        monate[m].umsatz += n;
        umsatzKat[kat] = (umsatzKat[kat] || 0) + n;
        ustEin += parseZahl(b.ust);
      } else {
        monate[m].kosten += n;
        kostenKat[kat] = (kostenKat[kat] || 0) + n;
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

const istZukunft = (jahr, monatIndex) => {
  const d = new Date();
  return jahr > d.getFullYear() || (jahr === d.getFullYear() && monatIndex > d.getMonth());
};

// ---------- Übersicht ----------
export function viewDashboard() {
  zerstoereCharts();
  const jahre = verfuegbareJahre();
  const jahr = Number(merker.get('jahr')) || jahre[0];
  const z = jahresZahlen(jahr);
  const vorjahr = jahresZahlen(jahr - 1);
  const marge = z.umsatz ? (z.gewinn / z.umsatz) * 100 : 0;
  const offen = S.dokumente.filter((d) => d.typ === 'rechnung' && d.status === 'offen' && !d.storno);
  const ueberf = offen.filter(istUeberfaellig);
  const angebote = S.dokumente.filter((d) => d.typ === 'angebot' && (d.datum || '').startsWith(String(jahr)));
  const angenommen = angebote.filter((d) => d.status === 'angenommen').length;
  const entschieden = angebote.filter((d) => ['angenommen', 'abgelehnt'].includes(d.status)).length;
  const quote = entschieden ? (angenommen / entschieden) * 100 : 0;
  const zuTun = erinnerungen(S, S.settings);
  const zuletzt = dauerMerker
    .get('zuletzt', [])
    .filter((x) => (x.typ === 'dokument' ? S.dokumente : S.kunden).some((d) => d.id === x.id))
    .slice(0, 5);
  const offeneAuftraege = S.auftraege.filter((a) => !['bezahlt', 'abgesagt'].includes(a.status)).length;

  const diff = (a, b, mehrIstGut = true) => {
    if (!b) return '<small>kein Vorjahreswert</small>';
    const gut = a >= b === mehrIstGut;
    return `<span class="trend ${gut ? 'trend-gut' : 'trend-schlecht'}">${a >= b ? '↑' : '↓'} ${prozent(Math.abs(((a - b) / b) * 100))}</span>`;
  };
  const stunde = new Date().getHours();
  const gruss = stunde < 11 ? 'Guten Morgen' : stunde < 18 ? 'Guten Tag' : 'Guten Abend';
  const heuteText = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const termineHeute = S.termine.filter((t) => t.datum === heute() && t.status !== 'abgesagt');
  const naechste = S.termine
    .filter((t) => t.datum >= heute() && t.status !== 'abgesagt')
    .sort((a, b) => (a.datum + (a.von || '')).localeCompare(b.datum + (b.von || '')))
    .slice(0, 5);
  const klein = S.settings.steuer.modus === 'klein';
  const vorname = S.settings.firma.vorname || S.benutzer?.name?.split(' ')[0] || '';

  main().innerHTML = `
    <div class="seiten-kopf begruessung">
      <div>
        <h1>${gruss}${vorname ? `, ${esc(vorname)}` : ''}</h1>
        <p>${heuteText} · ${termineHeute.length ? `${termineHeute.length} Termin${termineHeute.length > 1 ? 'e' : ''} heute` : 'heute keine Termine'}${ueberf.length ? ` · <span class="rot">${ueberf.length} Rechnung${ueberf.length > 1 ? 'en' : ''} überfällig</span>` : ''}</p>
      </div>
      <select id="jahrWahl" aria-label="Jahr">${jahre.map((j) => `<option ${j === jahr ? 'selected' : ''}>${j}</option>`).join('')}</select>
    </div>
    ${schnellstartKarte()}
    <div class="kpi-reihe">
      <div class="kpi"><span>Umsatz ${jahr}${klein ? '' : ' (netto)'}</span><b>${euro(z.umsatz)}</b>${diff(z.umsatz, vorjahr.umsatz)}</div>
      <div class="kpi"><span>Kosten ${jahr}</span><b>${euro(z.kosten)}</b>${diff(z.kosten, vorjahr.kosten, false)}</div>
      <div class="kpi kpi-hervor"><span>Gewinn ${jahr}</span><b>${euro(z.gewinn)}</b><small>Gewinnmarge ${prozent(marge)}</small></div>
      <a class="kpi kpi-link" href="#/rechnungen"><span>Offene Rechnungen</span><b>${euro(offen.reduce((a, d) => a + berechne(d).brutto, 0))}</b><small>${offen.length} offen${ueberf.length ? `, <span class="rot">${ueberf.length} überfällig</span>` : ''}</small></a>
      <a class="kpi kpi-link" href="#/auftraege"><span>Laufende Aufträge</span><b>${offeneAuftraege}</b><small>Annahmequote KV ${prozent(quote)}</small></a>
    </div>

    <div class="raster-dash">
      <div class="karte">
        <div class="karte-kopf"><h3>Heute zu erledigen</h3><a href="#/aufgaben" class="btn btn-klein">Alle Aufgaben</a></div>
        ${
          zuTun.length
            ? `<ul class="todo-liste">${zuTun
                .slice(0, 7)
                .map((e) => `<li class="todo-${e.art}"><a href="${e.link}">${esc(e.text)}</a></li>`)
                .join('')}</ul>${zuTun.length > 7 ? `<p class="hilfe">+ ${zuTun.length - 7} weitere</p>` : ''}`
            : '<p class="leer">Alles erledigt 🎉</p>'
        }
      </div>
      <div class="karte">
        <div class="karte-kopf"><h3>Nächste Termine</h3><a href="#/kalender" class="btn btn-klein">Kalender</a></div>
        ${naechste.length ? `<ul class="termin-liste">${naechste.map((t) => `<li><b>${t.datum === heute() ? 'Heute' : datum(t.datum)}${t.von ? ` ${esc(t.von)}` : ''}</b> ${esc(t.titel || t.kundeName || '')}<br><small>${esc(mitarbeiterNamen(t) || 'Noch kein Team')}</small></li>`).join('')}</ul>` : '<p class="leer">Keine anstehenden Termine.</p>'}
      </div>
      <div class="karte span-2"><h3>Umsatz, Kosten & Gewinn pro Monat</h3><div class="chart-box"><canvas id="c-monate" aria-label="Diagramm Umsatz, Kosten und Gewinn pro Monat"></canvas></div></div>
      <div class="karte"><h3>Kosten nach Kategorie</h3><div class="chart-box klein"><canvas id="c-kosten"></canvas></div><div id="l-kosten" class="anteile"></div></div>
      <div class="karte"><h3>Umsatz nach Leistung</h3><div class="chart-box klein"><canvas id="c-umsatz"></canvas></div><div id="l-umsatz" class="anteile"></div></div>
      <div class="karte">
        <h3>${klein ? 'Kleinunternehmer-Grenze' : `Umsatzsteuer ${jahr}`}</h3>
        ${
          klein
            ? `${grenzBalken(`Vorjahr ${jahr - 1}`, vorjahr.umsatz, 25000)}${grenzBalken(`Laufendes Jahr ${jahr}`, z.umsatz, 100000)}
             <p class="hilfe">Kleinunternehmer bleibt, wer im Vorjahr max. 25.000 € und im laufenden Jahr max. 100.000 € Umsatz hat. Wird die Grenze überschritten, unter Einstellungen → Steuer umstellen – bitte mit dem Steuerberater abstimmen.</p>`
            : `<div class="summen-box"><div><span>Eingenommene USt.</span><b>${euro(z.ustEin)}</b></div><div><span>Vorsteuer aus Kosten</span><b>– ${euro(z.vorsteuer)}</b></div><div><span>Zahllast an Finanzamt</span><b>${euro(z.ustEin - z.vorsteuer)}</b></div></div>`
        }
      </div>
      <div class="karte">
        <h3>Zuletzt geöffnet</h3>
        ${zuletzt.length ? `<ul class="termin-liste">${zuletzt.map((x) => `<li><a href="#/${x.typ === 'dokument' ? 'dokument' : 'kunde'}/${x.id}">${esc(x.titel)}</a></li>`).join('')}</ul>` : '<p class="leer">Hier erscheinen die zuletzt geöffneten Dokumente und Kunden.</p>'}
      </div>
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
    new window.Chart($('#c-monate'), {
      data: {
        labels: MONATE_KURZ,
        datasets: [
          { type: 'bar', label: 'Umsatz', data: z.monate.map((m) => r2(m.umsatz)), backgroundColor: farbe('--text'), borderRadius: 6, maxBarThickness: 22 },
          { type: 'bar', label: 'Kosten', data: z.monate.map((m) => r2(m.kosten)), backgroundColor: farbe('--akzent'), borderRadius: 6, maxBarThickness: 22 },
          {
            type: 'line',
            label: 'Gewinn',
            data: z.monate.map((m, i) => (istZukunft(jahr, i) ? null : r2(m.umsatz - m.kosten))),
            borderColor: farbe('--gruen'),
            backgroundColor: farbe('--gruen'),
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: 3
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { align: 'end', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3 } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${euro(ctx.parsed.y)}` } }
        },
        scales: { x: { grid: { display: false } }, y: { border: { display: false }, ticks: { callback: (v) => euro(v) } } }
      }
    })
  );
  donut('c-kosten', 'l-kosten', z.kostenKat);
  donut('c-umsatz', 'l-umsatz', z.umsatzKat);
}

function schnellstartKarte() {
  const s = S.settings;
  const f = s.firma;
  const schritte = [
    ['Firmendaten prüfen (Adresse, Telefon, E-Mail)', f.strasse && f.telefon && f.email, '#/einstellungen/firma'],
    ['Steuernummer und Bankverbindung eintragen', f.steuernummer && f.iban, '#/einstellungen/firma'],
    ['Rechnungsnummer prüfen (nächste Nummer)', s.nummernGeprueft, '#/einstellungen/nummern'],
    ['E-Mail-Versand einrichten', S.status.mailEingerichtet || (s.email.smtp.host && s.email.smtp.user), '#/einstellungen/email'],
    ['Preisliste anpassen', s.preiseGeprueft, '#/einstellungen/preise'],
    ['Mitarbeiter anlegen', S.mitarbeiter.length > 0, '#/mitarbeiter'],
    ['Ersten Kostenvoranschlag schreiben', S.dokumente.length > 0, '#/neu/angebot']
  ];
  const offen = schritte.filter(([, ok]) => !ok).length;
  if (!offen || s.schnellstartAus) return '';
  return `<div class="karte schnellstart">
    <div class="karte-kopf"><h3>Schnellstart – noch ${offen} von ${schritte.length} Schritten</h3><button class="btn-icon" id="ss-weg" type="button" aria-label="Schnellstart ausblenden">✕</button></div>
    <ol>${schritte.map(([text, ok, link]) => `<li class="${ok ? 'erledigt' : ''}"><a href="${link}">${esc(text)}${ok ? ' <span class="gruen">✓</span>' : ''}</a></li>`).join('')}</ol>
  </div>`;
}

function donut(canvasId, legendId, daten) {
  const eintraege = Object.entries(daten)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const summe = eintraege.reduce((a, [, v]) => a + v, 0);
  if (!eintraege.length) {
    $(`#${canvasId}`).parentElement.hidden = true;
    $(`#${legendId}`).innerHTML = '<p class="leer">Noch keine Daten.</p>';
    return;
  }
  charts.push(
    new window.Chart($(`#${canvasId}`), {
      type: 'doughnut',
      data: { labels: eintraege.map(([k]) => k), datasets: [{ data: eintraege.map(([, v]) => r2(v)), backgroundColor: CHART_FARBEN, borderColor: farbe('--flaeche'), borderWidth: 3 }] },
      options: {
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${euro(ctx.parsed)} (${prozent((ctx.parsed / summe) * 100)})` } } }
      }
    })
  );
  $(`#${legendId}`).innerHTML = eintraege
    .map(([k, v], i) => `<div><i style="background:${CHART_FARBEN[i % CHART_FARBEN.length]}"></i><span>${esc(k)}</span><b>${prozent((v / summe) * 100)}</b><small>${euro(v)}</small></div>`)
    .join('');
}

function grenzBalken(label, wert, grenze) {
  const p = Math.min(100, (wert / grenze) * 100);
  const klasse = p >= 100 ? 'rot' : p >= 80 ? 'orange' : 'gruen';
  return `<div class="grenze"><div class="grenze-kopf"><span>${label}</span><b>${euro(wert)} / ${euro(grenze)}</b></div><div class="balken"><div class="balken-${klasse}" style="width:${p}%"></div></div><small>${prozent((wert / grenze) * 100)} ausgeschöpft</small></div>`;
}

// ---------- Buchhaltung ----------
export function viewBuchhaltung() {
  const jahre = verfuegbareJahre();
  const filter = dauerMerker.get('filter:buchhaltung', { jahr: String(jahre[0]), monat: '', typ: '', suche: '' });
  if (!jahre.map(String).includes(filter.jahr)) filter.jahr = String(jahre[0]);
  const regel = S.settings.steuer.modus === 'regel';

  main().innerHTML = `
    <div class="seiten-kopf">
      <h1>Buchhaltung</h1>
      <div class="btn-gruppe">
        <button class="btn btn-gruen" id="neuEin" type="button">+ Einnahme</button>
        <button class="btn btn-primaer" id="neuAus" type="button">+ Ausgabe</button>
        <button class="btn" id="csv" type="button">CSV-Export</button>
        <button class="btn" id="excel" type="button" title="Alle Umsätze, Rechnungen, KVs, Einnahmen und Ausgaben">Excel</button>
        <button class="btn" id="word" type="button" title="Übersicht mit allen Rechnungen, KVs, Einnahmen und Ausgaben">Word</button>
      </div>
    </div>
    ${tipp('buchhaltung', 'Bezahlte Rechnungen werden automatisch als Einnahme gebucht. Beträge gibst du brutto ein, so wie sie auf dem Beleg stehen.')}
    <div class="filter-leiste">
      <select id="b-jahr" aria-label="Jahr">${jahre.map((j) => `<option ${String(j) === filter.jahr ? 'selected' : ''}>${j}</option>`).join('')}</select>
      <select id="b-monat" aria-label="Monat"><option value="">Ganzes Jahr</option>${MONATE.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}" ${filter.monat === String(i + 1).padStart(2, '0') ? 'selected' : ''}>${m}</option>`).join('')}</select>
      <select id="b-typ" aria-label="Art"><option value="">Einnahmen & Ausgaben</option><option value="einnahme" ${filter.typ === 'einnahme' ? 'selected' : ''}>Nur Einnahmen</option><option value="ausgabe" ${filter.typ === 'ausgabe' ? 'selected' : ''}>Nur Ausgaben</option></select>
      <input type="search" id="b-suche" placeholder="Suchen…" value="${esc(filter.suche)}" aria-label="Suchen">
    </div>
    <div class="raster-buch">
      <div class="karte"><table class="tabelle" id="b-tabelle"></table></div>
      <div class="karte" id="euer"></div>
    </div>`;

  const liste = () =>
    S.buchungen
      .filter((b) => (b.datum || '').startsWith(filter.monat ? `${filter.jahr}-${filter.monat}` : filter.jahr))
      .filter((b) => !filter.typ || b.typ === filter.typ)
      .filter((b) => !filter.suche || [b.beschreibung, b.kategorie, b.belegNr].join(' ').toLowerCase().includes(filter.suche.toLowerCase()))
      .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));

  const zeichne = () => {
    if (!$('#b-tabelle')) return;
    dauerMerker.set('filter:buchhaltung', filter);
    const l = liste();
    const ein = l.filter((b) => b.typ === 'einnahme');
    const aus = l.filter((b) => b.typ === 'ausgabe');
    const sum = (x, f) => r2(x.reduce((a, b) => a + f(b), 0));
    $('#b-tabelle').innerHTML = l.length
      ? `<thead><tr><th>Datum</th><th class="nur-breit">Beleg</th><th>Beschreibung</th><th class="nur-breit">Kategorie</th>${regel ? '<th class="c-num">USt.</th>' : ''}<th class="c-num">Betrag</th></tr></thead>
        <tbody>${l
          .map(
            (
              b
            ) => `<tr class="klickbar" tabindex="0" data-id="${b.id}"><td>${datum(b.datum)}</td><td class="nur-breit">${esc(b.belegNr || '')}</td><td>${esc(b.beschreibung)}${b.dokumentId ? ' <span class="badge">automatisch</span>' : ''}</td><td class="nur-breit">${esc(b.kategorie)}</td>
            ${regel ? `<td class="c-num">${euro(b.ust)}</td>` : ''}<td class="c-num ${b.typ === 'einnahme' ? 'gruen' : 'rot'}">${b.typ === 'einnahme' ? '+' : '–'} ${euro(Math.abs(b.betrag))}${b.betrag < 0 ? ' (Erstattung)' : ''}</td></tr>`
          )
          .join('')}</tbody>`
      : '<tbody><tr><td class="leer">Keine Buchungen im gewählten Zeitraum.</td></tr></tbody>';
    $$('#b-tabelle tr[data-id]').forEach(
      (tr) =>
        (tr.onclick = () =>
          buchungDialog(
            S.buchungen.find((b) => b.id === tr.dataset.id),
            zeichne
          ))
    );

    const einN = sum(ein, nettoBuchung);
    const ausN = sum(aus, nettoBuchung);
    const zeitraum = filter.monat ? `${MONATE[Number(filter.monat) - 1]} ${filter.jahr}` : filter.jahr;
    const ustEin = sum(ein, (b) => parseZahl(b.ust));
    const vst = sum(aus, (b) => parseZahl(b.ust));
    $('#euer').innerHTML = `<h3>Einnahmen-Überschuss-Rechnung<br><small>${zeitraum}</small></h3>
      <div class="summen-box">
        <div><span>Betriebseinnahmen${regel ? ' (netto)' : ''}</span><b class="gruen">${euro(einN)}</b></div>
        <div><span>Betriebsausgaben${regel ? ' (netto)' : ''}</span><b class="rot">– ${euro(ausN)}</b></div>
        <div class="summe"><span>Gewinn / Verlust</span><b>${euro(einN - ausN)}</b></div>
        ${regel ? `<div><span>Vereinnahmte USt.</span><b>${euro(ustEin)}</b></div><div><span>Gezahlte Vorsteuer</span><b>– ${euro(vst)}</b></div><div class="summe"><span>USt.-Zahllast</span><b>${euro(ustEin - vst)}</b></div>` : ''}
      </div>
      <h4>Ausgaben nach Kategorie</h4>
      <div class="anteile">${
        Object.entries(aus.reduce((m, b) => ((m[b.kategorie] = (m[b.kategorie] || 0) + nettoBuchung(b)), m), {}))
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `<div><span>${esc(k)}</span><b>${prozent(ausN ? (v / ausN) * 100 : 0)}</b><small>${euro(v)}</small></div>`)
          .join('') || '<p class="leer">–</p>'
      }</div>`;
  };

  $('#b-jahr').onchange = (e) => ((filter.jahr = e.target.value), zeichne());
  $('#b-monat').onchange = (e) => ((filter.monat = e.target.value), zeichne());
  $('#b-typ').onchange = (e) => ((filter.typ = e.target.value), zeichne());
  $('#b-suche').oninput = (e) => ((filter.suche = e.target.value), zeichne());
  $('#neuEin').onclick = () => buchungDialog({ typ: 'einnahme' }, zeichne);
  $('#neuAus').onclick = () => buchungDialog({ typ: 'ausgabe' }, zeichne);
  $('#csv').onclick = async () => {
    const kopf = ['Datum', 'Typ', 'Beleg', 'Beschreibung', 'Kategorie', 'Brutto', 'USt', 'Netto'];
    const zeilen = liste().map((b) => [
      datum(b.datum),
      b.typ === 'einnahme' ? 'Einnahme' : 'Ausgabe',
      b.belegNr || '',
      b.beschreibung || '',
      b.kategorie || '',
      zahl(b.betrag),
      zahl(b.ust),
      zahl(nettoBuchung(b))
    ]);
    const csv = [kopf, ...zeilen].map((zz) => zz.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    try {
      await backend.download(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), `Buchhaltung_${filter.jahr}${filter.monat ? `-${filter.monat}` : ''}.csv`);
    } catch (e) {
      toast(e.message, 'fehler');
    }
  };
  for (const [id, art, name] of [
    ['excel', 'excel', 'Save-Your-Moebel-Umsaetze.xlsx'],
    ['word', 'word', 'Save-Your-Moebel-Uebersicht.docx']
  ]) {
    $(`#${id}`).onclick = async () => {
      try {
        await backend.download(await backend.berichtHolen(art), name);
      } catch (e) {
        toast(e.message, 'fehler');
      }
    };
  }
  zeichne();
}

export function buchungDialog(b, fertig = () => {}) {
  const regel = S.settings.steuer.modus === 'regel';
  const istEin = b.typ === 'einnahme';
  const kats = istEin ? S.settings.kategorienEinnahmen : S.settings.kategorienAusgaben;
  const satzStart = b.id && parseZahl(b.betrag) ? Math.round((parseZahl(b.ust) / (parseZahl(b.betrag) - parseZahl(b.ust) || 1)) * 100) : regel ? S.settings.steuer.satz : 0;
  const auto = !!b.dokumentId;
  const { el, close } = modal(
    b.id ? 'Buchung' : istEin ? 'Neue Einnahme' : 'Neue Ausgabe',
    `
    <form class="formular" id="bu-form">
      ${auto ? '<p class="hinweis-box">Diese Buchung wurde automatisch aus einer Rechnung erstellt. Änderungen bitte in der Rechnung vornehmen (z. B. Zahlung zurücknehmen).</p>' : ''}
      <fieldset class="ohne-rahmen" ${auto ? 'disabled' : ''}>
      <div class="raster-2">
        <label>Datum<input type="date" id="bu-datum" required value="${esc(b.datum || heute())}"></label>
        <label>Beleg-Nr.<input id="bu-beleg" value="${esc(b.belegNr || '')}"></label>
        <label class="span-2">Beschreibung<input id="bu-beschr" value="${esc(b.beschreibung || '')}" placeholder="${istEin ? 'z. B. Barzahlung Umzug Müller' : 'z. B. Tankfüllung Transporter'}"></label>
        <label>Kategorie<input id="bu-kat" list="bu-kats" value="${esc(b.kategorie || kats[0] || '')}"><datalist id="bu-kats">${kats.map((k) => `<option value="${esc(k)}">`).join('')}</datalist></label>
        <label>Betrag brutto (€)<input id="bu-betrag" inputmode="decimal" required value="${b.betrag ? esc(zahl(b.betrag)) : ''}"></label>
        ${regel ? `<label>Enthaltene USt.<select id="bu-satz">${[19, 7, 0].map((x) => `<option value="${x}" ${satzStart === x ? 'selected' : ''}>${x} %</option>`).join('')}</select></label><label>USt.-Betrag<input id="bu-ust" readonly></label>` : ''}
        <label class="span-2">Details<textarea id="bu-notiz" rows="3" placeholder="z. B. Tankstelle, wofür, wer hat bezahlt">${esc(b.notiz || '')}</textarea></label>
      </div>
      </fieldset>
      ${auto ? '' : `<h4>Beleg: Fotos & Dateien</h4><div id="bu-fotos"></div>`}
      <div class="btn-gruppe rechts">
        ${b.id && !auto ? '<button class="btn rot" id="bu-del" type="button">Löschen</button>' : ''}
        ${auto ? `<a class="btn" href="#/dokument/${esc(b.dokumentId)}" data-zu>Zur Rechnung</a>` : '<button class="btn btn-primaer" type="submit">Speichern</button>'}
      </div>
    </form>`
  );
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
  if ($('[data-zu]', el)) $('[data-zu]', el).onclick = close;
  if ($('#bu-del', el))
    $('#bu-del', el).onclick = async () => {
      close();
      await loescheMitRueckgaengig('buchungen', b.id, 'Buchung gelöscht', fertig);
    };
  const werte = () => ({
    ...b,
    datum: $('#bu-datum', el).value,
    belegNr: $('#bu-beleg', el).value,
    beschreibung: $('#bu-beschr', el).value,
    kategorie: $('#bu-kat', el).value || 'Sonstiges',
    betrag: parseZahl($('#bu-betrag', el).value),
    ust: ustBerechnen(),
    notiz: $('#bu-notiz', el).value
  });
  const vorgemerkt = !auto && !b.id ? dateiVormerken($('#bu-fotos', el), { leerText: 'Noch kein Beleg ausgewählt – z. B. Kassenbon fotografieren oder PDF anhängen.' }) : null;
  if (!auto && b.id) fotoBereich($('#bu-fotos', el), { abfrage: { buchungId: b.id }, leerText: 'Noch kein Beleg – Kassenbon fotografieren oder PDF-Rechnung anhängen.', beiAenderung: fertig });
  $('#bu-form', el).onsubmit = async (e) => {
    e.preventDefault();
    if (auto) return;
    try {
      const gespeichert = await speichere('buchungen', werte());
      await vorgemerkt?.hochladen({ buchungId: gespeichert.id });
      toast('Gespeichert');
      close();
      fertig();
    } catch (err) {
      toast(err.message, 'fehler');
    }
  };
}

export async function neuLaden() {
  await ladeAlles();
}
