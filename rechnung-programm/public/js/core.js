// Grundfunktionen: API, Zustand, Formatierung, Berechnung, Rechnungsvorlage
const S = {
  settings: null,
  kunden: [],
  dokumente: [],
  buchungen: [],
  mitarbeiter: [],
  termine: []
};

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`);
  return data;
}

async function ladeAlles() {
  const [settings, kunden, dokumente, buchungen, mitarbeiter, termine] = await Promise.all([
    api('GET', '/api/settings'),
    api('GET', '/api/kunden'),
    api('GET', '/api/dokumente'),
    api('GET', '/api/buchungen'),
    api('GET', '/api/mitarbeiter'),
    api('GET', '/api/termine')
  ]);
  Object.assign(S, { settings, kunden, dokumente, buchungen, mitarbeiter, termine });
}

// Speichert ein Objekt (neu oder vorhanden) und aktualisiert den lokalen Zustand
async function speichere(col, item) {
  const saved = item.id ? await api('PUT', `/api/${col}/${item.id}`, item) : await api('POST', `/api/${col}`, item);
  const list = S[col];
  const i = list.findIndex((x) => x.id === saved.id);
  if (i >= 0) list[i] = saved;
  else list.push(saved);
  return saved;
}

async function loesche(col, id) {
  await api('DELETE', `/api/${col}/${id}`);
  S[col] = S[col].filter((x) => x.id !== id);
}

async function speichereEinstellungen() {
  S.settings = await api('PUT', '/api/settings', S.settings);
}

// ---------- Helfer ----------
// Kleiner Zwischenspeicher für Ansichts-Einstellungen (funktioniert auch, wenn der Browser Speicher blockiert)
const merker = (() => {
  const mem = {};
  return {
    get(k) { try { return sessionStorage.getItem(k); } catch { return mem[k] ?? null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { mem[k] = String(v); } },
    del(k) { try { sessionStorage.removeItem(k); } catch { delete mem[k]; } }
  };
})();

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
const nl2br = (v) => esc(v).replace(/\n/g, '<br>');

const euroFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const euro = (n) => euroFmt.format(Number(n) || 0);
const zahl = (n, d = 2) => (Number(n) || 0).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: d });
const prozent = (n) => `${(Number(n) || 0).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Eingaben mit Komma erlauben: "1.234,50" -> 1234.5
function parseZahl(v) {
  if (typeof v === 'number') return v;
  let s = String(v || '').trim().replace(/\s|€|%/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

const heute = () => isoDatum(new Date());
function isoDatum(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
function plusTage(iso, tage) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + Number(tage || 0));
  return isoDatum(d);
}
function datum(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}
const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONATE_KURZ = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function toast(msg, typ = 'ok') {
  const el = document.createElement('div');
  el.className = `toast toast-${typ}`;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), typ === 'fehler' ? 7000 : 3500);
}

// Einfaches Dialogfenster
function modal(titel, inhaltHtml, { breit = false, beimSchliessen } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'modal-bg';
  wrap.innerHTML = `<div class="modal ${breit ? 'modal-breit' : ''}">
    <div class="modal-kopf"><h3>${esc(titel)}</h3><button class="btn-icon" data-close title="Schließen">✕</button></div>
    <div class="modal-inhalt">${inhaltHtml}</div></div>`;
  const close = () => {
    if (!wrap.isConnected) return;
    wrap.remove();
    if (beimSchliessen) beimSchliessen();
  };
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
  $('[data-close]', wrap).onclick = close;
  document.body.appendChild(wrap);
  return { el: $('.modal', wrap), close };
}

// Rückfrage als eigener Dialog (Browser-Popups sind nicht überall erlaubt)
function bestaetigen(text, { ok = 'Ja, weiter', abbrechen = 'Abbrechen' } = {}) {
  return new Promise((resolve) => {
    let antwort = false;
    const { el, close } = modal('Bitte bestätigen', `<p class="frage">${esc(text)}</p>
      <div class="btn-gruppe rechts"><button class="btn" data-nein>${esc(abbrechen)}</button><button class="btn btn-primaer" data-ja>${esc(ok)}</button></div>`,
      { beimSchliessen: () => resolve(antwort) });
    $('[data-nein]', el).onclick = close;
    $('[data-ja]', el).onclick = () => { antwort = true; close(); };
    $('[data-ja]', el).focus();
  });
}

// ---------- Berechnung ----------
// Kleinunternehmer: Preise sind Endpreise, keine USt.
// Regelbesteuerung: Preise sind Netto, USt je Position.
function berechne(doc) {
  const klein = doc.steuerModus === 'klein';
  const rabatt = parseZahl(doc.rabattProzent);
  const faktor = 1 - rabatt / 100;
  let summePos = 0;
  const proSatz = {};
  const positionen = (doc.positionen || []).map((p) => {
    const betrag = r2(parseZahl(p.menge) * parseZahl(p.preis));
    summePos += betrag;
    const satz = klein ? 0 : parseZahl(p.ustSatz ?? 19);
    proSatz[satz] = (proSatz[satz] || 0) + betrag;
    return { ...p, betrag };
  });
  summePos = r2(summePos);
  positionen.forEach((p) => { p.anteil = summePos ? (p.betrag / summePos) * 100 : 0; });
  const rabattBetrag = r2(summePos - summePos * faktor);
  const netto = r2(summePos - rabattBetrag);
  const steuern = klein
    ? []
    : Object.keys(proSatz)
        .map(Number)
        .filter((s) => s > 0)
        .sort((a, b) => b - a)
        .map((satz) => {
          const basis = r2(proSatz[satz] * faktor);
          return { satz, basis, betrag: r2((basis * satz) / 100) };
        });
  const ust = r2(steuern.reduce((a, s) => a + s.betrag, 0));
  const brutto = r2(netto + ust);
  const anzahlungProzent = parseZahl(doc.anzahlungProzent);
  const anzahlung = r2((brutto * anzahlungProzent) / 100);
  return { positionen, summePos, rabatt, rabattBetrag, netto, steuern, ust, brutto, anzahlungProzent, anzahlung, rest: r2(brutto - anzahlung), klein };
}

// Platzhalter in Texten ersetzen
function platzhalter(text, doc) {
  const s = S.settings;
  const c = doc ? berechne(doc) : null;
  const map = {
    FIRMA: s.firma.name,
    KUNDE: doc ? doc.kunde?.name || '' : '',
    NUMMER: doc ? doc.nummer || '' : '',
    BETRAG: c ? euro(c.brutto) : '',
    DATUM: doc ? datum(doc.datum) : '',
    FAELLIG: doc ? datum(doc.faelligAm) : '',
    GUELTIG: doc ? datum(doc.gueltigBis) : '',
    ZIEL: doc && doc.datum && doc.faelligAm ? Math.round((new Date(doc.faelligAm) - new Date(doc.datum)) / 864e5) : s.zahlungszielTage,
    JAHR: new Date().getFullYear()
  };
  return String(text || '').replace(/\{([A-Z]+)\}/g, (m, k) => (k in map ? map[k] : m));
}

// ---------- Rechnungs-/Angebotsvorlage (A4) ----------
function renderDokument(doc) {
  const s = S.settings;
  const f = s.firma;
  const c = berechne(doc);
  const istRechnung = doc.typ === 'rechnung';
  const titel = doc.titel || (istRechnung ? 'Rechnung' : 'Kostenvoranschlag');
  const k = doc.kunde || {};
  const zeigeUst = !c.klein;
  const zeigeAnteil = !!doc.zeigeAnteil;
  const farbe = s.design.farbe || '#E53935';
  const akzent = s.design.akzent || '#1F1F1F';

  const absenderZeile = [f.name, f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')].filter(Boolean).join(' · ');

  const infos = [
    [istRechnung ? 'Rechnungsnr.' : 'Angebotsnr.', doc.nummer],
    ['Datum', datum(doc.datum)],
    doc.leistungsdatum ? [istRechnung ? 'Leistungsdatum' : 'Umzugstermin', datum(doc.leistungsdatum)] : null,
    k.kundennummer ? ['Kundennr.', k.kundennummer] : null,
    istRechnung && doc.faelligAm ? ['Fällig am', datum(doc.faelligAm)] : null,
    !istRechnung && doc.gueltigBis ? ['Gültig bis', datum(doc.gueltigBis)] : null
  ].filter(Boolean);

  const felder = [
    ...(s.eigeneFelder || [])
      .filter((ef) => ef.fuer === 'beide' || ef.fuer === doc.typ)
      .map((ef) => [ef.label, (doc.feldWerte || {})[ef.id]]),
    ...(doc.extraFelder || []).map((x) => [x.label, x.wert])
  ].filter(([l, v]) => l && v);

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
  if (c.rabatt || zeigeUst) summen.push(['Zwischensumme', euro(c.summePos)]);
  if (c.rabatt) summen.push([`Rabatt (${prozent(c.rabatt)})`, `– ${euro(c.rabattBetrag)}`]);
  if (zeigeUst) {
    if (c.rabatt) summen.push(['Nettobetrag', euro(c.netto)]);
    c.steuern.forEach((st) => summen.push([`zzgl. ${zahl(st.satz)} % USt. auf ${euro(st.basis)}`, euro(st.betrag)]));
  }
  const gesamtLabel = zeigeUst ? 'Gesamtbetrag (brutto)' : 'Gesamtbetrag';

  const anzahlung = c.anzahlungProzent
    ? `<div class="d-anzahlung">
        <div><span>${istRechnung ? 'Anzahlung' : 'Anzahlung bei Auftrag'} (${prozent(c.anzahlungProzent)})</span><b>${euro(c.anzahlung)}</b></div>
        <div><span>${istRechnung ? 'Restbetrag' : 'Restbetrag nach Umzug'}</span><b>${euro(c.rest)}</b></div>
      </div>`
    : '';

  const steuerHinweis = c.klein
    ? 'Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).'
    : '';

  const fuss = [
    [f.name, f.inhaber ? `Inhaber: ${f.inhaber}` : '', f.strasse, [f.plz, f.ort].filter(Boolean).join(' ')],
    [f.telefon ? `Tel.: ${f.telefon}` : '', f.email, f.web],
    [f.bank, f.iban ? `IBAN: ${f.iban}` : '', f.bic ? `BIC: ${f.bic}` : ''],
    [f.steuernummer ? `Steuernr.: ${f.steuernummer}` : '', f.ustId ? `USt-IdNr.: ${f.ustId}` : '']
  ]
    .map((col) => col.filter(Boolean))
    .filter((col) => col.length)
    .map((col) => `<div>${col.map(esc).join('<br>')}</div>`)
    .join('');

  return `<div class="doc-page" style="--d-farbe:${esc(farbe)};--d-akzent:${esc(akzent)};--d-schrift:'${esc(s.design.schrift || 'Montserrat')}'">
    <div class="d-band"></div>
    <header class="d-kopf">
      <div class="d-logo">${f.logo ? `<img src="${esc(f.logo)}" alt="Logo">` : `<div class="d-firmenname">${esc(f.name)}</div>`}</div>
      <div class="d-titel-box">
        <div class="d-titel">${esc(titel.toUpperCase())}</div>
        <div class="d-nummer">${esc(doc.nummer || '')}</div>
      </div>
    </header>
    <section class="d-adressen">
      <div class="d-empfaenger">
        <div class="d-absender">${esc(absenderZeile)}</div>
        <div class="d-label">${istRechnung ? 'Rechnung an' : 'Kostenvoranschlag für'}</div>
        <div class="d-kunde">
          ${k.firma ? `<b>${esc(k.firma)}</b><br>` : ''}
          ${k.name ? `${k.firma ? '' : '<b>'}${esc(k.name)}${k.firma ? '' : '</b>'}<br>` : ''}
          ${esc(k.strasse || '')}${k.strasse ? '<br>' : ''}
          ${esc([k.plz, k.ort].filter(Boolean).join(' '))}
        </div>
      </div>
      <table class="d-infos">${infos.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')}</table>
    </section>
    ${felder.length ? `<section class="d-felder">${felder.map(([l, v]) => `<div><span>${esc(l)}</span>${nl2br(v)}</div>`).join('')}</section>` : ''}
    ${doc.betreff ? `<h2 class="d-betreff">${esc(doc.betreff)}</h2>` : ''}
    <p class="d-text">${k.name ? `Guten Tag ${esc(k.anrede || k.name)},` : 'Sehr geehrte Damen und Herren,'}<br>${nl2br(platzhalter(doc.einleitung, doc))}</p>
    <table class="d-positionen">
      <thead><tr>
        <th class="c-nr">Pos.</th><th class="c-beschr">Beschreibung</th><th class="c-num">Menge</th><th class="c-num">Einzelpreis</th>
        ${zeigeUst ? '<th class="c-num">USt.</th>' : ''}${zeigeAnteil ? '<th class="c-num">Anteil</th>' : ''}<th class="c-num">Gesamt</th>
      </tr></thead>
      <tbody>${rows || `<tr><td colspan="7" class="d-leer">Noch keine Positionen</td></tr>`}</tbody>
    </table>
    <div class="d-summen-wrap">
      <table class="d-summen">
        ${summen.map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v)}</td></tr>`).join('')}
        <tr class="d-gesamt"><td>${gesamtLabel}</td><td>${euro(c.brutto)}</td></tr>
      </table>
    </div>
    ${anzahlung}
    ${steuerHinweis ? `<p class="d-hinweis">${esc(steuerHinweis)}</p>` : ''}
    <p class="d-text">${nl2br(platzhalter(doc.schlusstext, doc))}</p>
    ${f.iban && istRechnung ? `<div class="d-bank"><b>Bankverbindung:</b> ${esc(f.bank)} · IBAN ${esc(f.iban)}${f.bic ? ` · BIC ${esc(f.bic)}` : ''} · Verwendungszweck: ${esc(doc.nummer)}</div>` : ''}
    <footer class="d-fuss">${fuss}</footer>
  </div>`;
}

// PDF aus der Vorlage erzeugen (im Browser, mit html2pdf.js)
async function dokumentPdf(doc) {
  const holder = document.createElement('div');
  holder.className = 'pdf-holder';
  holder.innerHTML = renderDokument(doc);
  // knapp unter A4-Höhe, sonst entsteht durch Rundung eine leere Zusatzseite
  holder.firstElementChild.style.minHeight = '294mm';
  document.body.appendChild(holder);
  try {
    const worker = html2pdf()
      .set({
        margin: 0,
        filename: dateiname(doc),
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.d-summen-wrap', '.d-anzahlung'] }
      })
      .from(holder.firstElementChild);
    return await worker.outputPdf('blob');
  } finally {
    holder.remove();
  }
}

function dateiname(doc) {
  const art = doc.typ === 'rechnung' ? 'Rechnung' : 'Kostenvoranschlag';
  const kunde = (doc.kunde?.name || '').replace(/[^\wäöüÄÖÜß-]+/g, '_');
  return `${art}_${(doc.nummer || 'Entwurf').replace(/[^\w-]+/g, '_')}${kunde ? `_${kunde}` : ''}.pdf`;
}

function blobZuBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function drucken(html) {
  const area = $('#druckbereich');
  area.innerHTML = html;
  document.body.classList.add('druckt');
  window.print();
  document.body.classList.remove('druckt');
  area.innerHTML = '';
}

// A4-Vorschau an die verfügbare Breite anpassen
function skaliereVorschau(el) {
  const rahmen = el.parentElement;
  const passen = () => {
    const breite = rahmen.clientWidth - 32;
    const faktor = Math.min(1, breite / el.offsetWidth);
    el.style.transform = `scale(${faktor})`;
    el.style.height = `${el.scrollHeight}px`;
    rahmen.style.height = `${el.scrollHeight * faktor + 32}px`;
  };
  passen();
  if (!el._beobachter) {
    el._beobachter = new ResizeObserver(passen);
    el._beobachter.observe(rahmen);
  }
}
