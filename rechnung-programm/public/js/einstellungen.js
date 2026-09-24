// Einstellungen
const getPfad = (obj, pfad) => pfad.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
function setPfad(obj, pfad, wert) {
  const teile = pfad.split('.');
  const letzter = teile.pop();
  teile.reduce((o, k) => (o[k] = o[k] || {}), obj)[letzter] = wert;
}

const EINST_TABS = {
  firma: 'Firma',
  steuer: 'Steuer',
  design: 'Rechnungsdesign',
  nummern: 'Nummern & Fristen',
  texte: 'Texte',
  felder: 'Eigene Felder',
  preise: 'Preisliste',
  kategorien: 'Kategorien',
  email: 'E-Mail',
  sicherung: 'Datensicherung'
};

function viewEinstellungen(tab = 'firma') {
  const s = S.settings;
  const feld = (pfad, label, attrs = '') => `<label>${label}<input data-s="${pfad}" value="${esc(getPfad(s, pfad) ?? '')}" ${attrs}></label>`;
  const bereich = (inhalt) => `<div class="karte">${inhalt}<div class="btn-gruppe rechts"><button class="btn btn-primaer" id="e-speichern">Speichern</button></div></div>`;

  const tabs = {
    firma: () =>
      bereich(`<h3>Firmendaten (erscheinen auf Rechnungen)</h3>
      <div class="raster-2">
        ${feld('firma.name', 'Firmenname')}${feld('firma.inhaber', 'Inhaber/in')}
        ${feld('firma.strasse', 'Straße & Nr.')}<div class="raster-2 innen">${feld('firma.plz', 'PLZ')}${feld('firma.ort', 'Ort')}</div>
        ${feld('firma.telefon', 'Telefon')}${feld('firma.email', 'E-Mail')}
        ${feld('firma.web', 'Webseite')}${feld('firma.steuernummer', 'Steuernummer')}
        ${feld('firma.ustId', 'USt-IdNr. (falls vorhanden)')}${feld('firma.bank', 'Bank')}
        ${feld('firma.iban', 'IBAN')}${feld('firma.bic', 'BIC')}
      </div>
      <h4>Logo</h4>
      <div class="logo-feld">${s.firma.logo ? `<img src="${esc(s.firma.logo)}" alt="Logo">` : '<span class="hilfe">Kein Logo – es wird der Firmenname angezeigt.</span>'}
        <input type="file" id="e-logo" accept="image/*">${s.firma.logo ? '<button class="btn btn-klein" id="e-logo-weg">Logo entfernen</button>' : ''}</div>`),

    steuer: () =>
      bereich(`<h3>Besteuerung</h3>
      <label class="radio-karte"><input type="radio" name="modus" value="klein" ${s.steuer.modus === 'klein' ? 'checked' : ''}>
        <div><b>Kleinunternehmer (§ 19 UStG)</b><br>Keine Umsatzsteuer auf Rechnungen. Auf jeder Rechnung steht automatisch der Hinweis „Gemäß § 19 UStG wird keine Umsatzsteuer berechnet“. Preise = Endpreise.</div></label>
      <label class="radio-karte"><input type="radio" name="modus" value="regel" ${s.steuer.modus === 'regel' ? 'checked' : ''}>
        <div><b>Regelbesteuerung (mit Umsatzsteuer)</b><br>Preise werden netto eingegeben, Umsatzsteuer wird je Position (19 % / 7 %) aufgeschlagen. Die Buchhaltung zeigt Vorsteuer und Zahllast.</div></label>
      <div class="raster-3">${feld('steuer.satz', 'Standard-Steuersatz in %', 'inputmode="decimal"')}</div>
      <p class="hinweis-box">Bereits erstellte Rechnungen behalten ihre Besteuerung. Die Umstellung gilt für alle neuen Dokumente. Tipp: Den Zeitpunkt des Wechsels mit dem Steuerberater abstimmen.</p>`),

    design: () =>
      bereich(`<h3>Aussehen von Rechnung & Kostenvoranschlag</h3>
      <div class="raster-3">
        <label>Hauptfarbe<input type="color" data-s="design.farbe" value="${esc(s.design.farbe)}"></label>
        <label>Textfarbe Überschriften<input type="color" data-s="design.akzent" value="${esc(s.design.akzent)}"></label>
        <label>Schriftart<select data-s="design.schrift">${['Montserrat', 'Open Sans', 'Lato', 'Poppins', 'Roboto', 'Arial'].map((f) => `<option ${s.design.schrift === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
      </div>
      <p class="hilfe">Du kannst deine Canva-Vorlage noch genauer nachbauen lassen: Die Vorlage steckt in <code>public/js/core.js</code> (Funktion <code>renderDokument</code>) und <code>public/css/dokument.css</code>.</p>
      <div class="vorschau-rahmen klein"><div id="e-vorschau" class="vorschau-skaliert"></div></div>`),

    nummern: () =>
      bereich(`<h3>Nummernkreise</h3>
      <p class="hilfe">{JAHR} wird durch das aktuelle Jahr ersetzt. Beispiel: RE-{JAHR}- → RE-${new Date().getFullYear()}-001</p>
      <div class="raster-3">
        ${feld('nummern.rechnung.prefix', 'Rechnungen: Präfix')}${feld('nummern.rechnung.naechste', 'Nächste Nummer', 'type="number" min="1"')}${feld('nummern.rechnung.stellen', 'Stellen', 'type="number" min="1" max="8"')}
        ${feld('nummern.angebot.prefix', 'Kostenvoranschläge: Präfix')}${feld('nummern.angebot.naechste', 'Nächste Nummer', 'type="number" min="1"')}${feld('nummern.angebot.stellen', 'Stellen', 'type="number" min="1" max="8"')}
      </div>
      <h3>Fristen</h3>
      <div class="raster-3">${feld('zahlungszielTage', 'Zahlungsziel (Tage)', 'type="number" min="0"')}${feld('angebotGueltigTage', 'Kostenvoranschlag gültig (Tage)', 'type="number" min="0"')}</div>`),

    texte: () =>
      bereich(`<h3>Standardtexte</h3>
      ${[['texte.rechnungEinleitung', 'Rechnung – Einleitung'], ['texte.rechnungSchluss', 'Rechnung – Schlusstext'], ['texte.angebotEinleitung', 'Kostenvoranschlag – Einleitung'], ['texte.angebotSchluss', 'Kostenvoranschlag – Schlusstext']]
        .map(([p, l]) => `<label>${l}<textarea data-s="${p}" rows="3">${esc(getPfad(s, p))}</textarea></label>`)
        .join('')}
      <p class="hilfe">Platzhalter: {KUNDE} {NUMMER} {BETRAG} {DATUM} {FAELLIG} {GUELTIG} {ZIEL} {FIRMA}</p>`),

    felder: () =>
      bereich(`<h3>Eigene Felder</h3>
      <p class="hilfe">Diese Felder erscheinen in jedem neuen Dokument zum Ausfüllen (z. B. Auszugs-/Einzugsadresse, Etage, Volumen in m³). Leere Felder werden nicht gedruckt. Einzelne Zusatzfelder kannst du auch direkt im Dokument hinzufügen.</p>
      <div id="e-felder"></div><button class="btn btn-klein" id="e-feld-plus">+ Feld</button>`),

    preise: () =>
      bereich(`<h3>Preisliste (Artikel & Leistungen)</h3>
      <p class="hilfe">Schnell in Rechnungen einfügbar. Preis kann im Dokument jederzeit angepasst werden.</p>
      <div id="e-artikel"></div><button class="btn btn-klein" id="e-artikel-plus">+ Artikel</button>
      <h4>Einheiten</h4>${listenEditor('einheiten')}`),

    kategorien: () =>
      bereich(`<h3>Kategorien für die Buchhaltung</h3>
      <div class="raster-2"><div><h4>Einnahmen</h4>${listenEditor('kategorienEinnahmen')}</div><div><h4>Ausgaben</h4>${listenEditor('kategorienAusgaben')}</div></div>`),

    email: () =>
      bereich(`<h3>E-Mail-Versand (SMTP)</h3>
      ${s.email.smtpAusEnv ? '<p class="hinweis-box">Die Zugangsdaten sind in der Datei <code>.env</code> hinterlegt und haben Vorrang.</p>' : ''}
      <p class="hilfe">Damit Mails von deiner eigenen Adresse kommen, trage hier die Daten deines E-Mail-Anbieters ein (IONOS: smtp.ionos.de, Port 587 · Strato: smtp.strato.de, Port 465 · Gmail: smtp.gmail.com, Port 587 mit App-Passwort · Outlook: smtp.office365.com, Port 587).</p>
      <div class="raster-2">
        ${feld('email.smtp.host', 'SMTP-Server')}${feld('email.smtp.port', 'Port', 'type="number"')}
        ${feld('email.smtp.user', 'Benutzername (meist die E-Mail-Adresse)')}${feld('email.smtp.pass', 'Passwort', 'type="password" autocomplete="new-password"')}
        ${feld('email.smtp.from', 'Absender-Adresse (leer = Benutzername)')}${feld('email.bcc', 'Kopie aller Mails an (BCC, optional)')}
      </div>
      <button class="btn" id="e-test">Verbindung testen</button>
      <h3>E-Mail-Vorlagen</h3>
      ${Object.entries({ rechnung: 'Rechnung', angebot: 'Kostenvoranschlag', erinnerung: 'Zahlungserinnerung' })
        .map(([k, l]) => `<h4>${l}</h4>${feld(`email.vorlagen.${k}.betreff`, 'Betreff')}<label>Text<textarea data-s="email.vorlagen.${k}.text" rows="6">${esc(s.email.vorlagen[k].text)}</textarea></label>`)
        .join('')}
      <p class="hilfe">Platzhalter: {KUNDE} {NUMMER} {BETRAG} {DATUM} {FAELLIG} {GUELTIG} {FIRMA}</p>`),

    sicherung: () => `<div class="karte"><h3>Datensicherung</h3>
      <p>Alle Daten liegen auf dem Server in <code>data/db.json</code>. Zusätzlich wird täglich automatisch eine Kopie in <code>data/backups/</code> abgelegt (30 Tage).</p>
      <p>Lade regelmäßig eine Sicherung herunter und bewahre sie extern auf (z. B. USB-Stick, Cloud). Rechnungen musst du 10 Jahre aufbewahren.</p>
      <div class="btn-gruppe"><a class="btn btn-primaer" href="/api-backup">Sicherung herunterladen</a>
      <label class="btn">Sicherung wiederherstellen<input type="file" id="e-restore" accept=".json" hidden></label></div></div>`
  };

  $('#main').innerHTML = `<div class="seiten-kopf"><h1>Einstellungen</h1></div>
    <div class="tabs">${Object.entries(EINST_TABS).map(([k, v]) => `<a href="#/einstellungen/${k}" class="${k === tab ? 'aktiv' : ''}">${v}</a>`).join('')}</div>
    ${(tabs[tab] || tabs.firma)()}`;

  // Werte binden
  $$('[data-s]').forEach((el) => {
    el.addEventListener('input', () => {
      const alt = getPfad(s, el.dataset.s);
      setPfad(s, el.dataset.s, typeof alt === 'number' ? parseZahl(el.value) : el.value);
      if ($('#e-vorschau')) designVorschau();
    });
  });
  $$('input[name="modus"]').forEach((r) => (r.onchange = () => (s.steuer.modus = r.value)));

  if ($('#e-speichern'))
    $('#e-speichern').onclick = async () => {
      try {
        await speichereEinstellungen();
        toast('Einstellungen gespeichert');
        viewEinstellungen(tab);
      } catch (err) {
        toast(err.message, 'fehler');
      }
    };

  // Logo
  if ($('#e-logo'))
    $('#e-logo').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2e6) return toast('Logo bitte kleiner als 2 MB', 'fehler');
      const r = new FileReader();
      r.onload = async () => {
        s.firma.logo = r.result;
        await speichereEinstellungen();
        viewEinstellungen('firma');
      };
      r.readAsDataURL(file);
    };
  if ($('#e-logo-weg')) $('#e-logo-weg').onclick = async () => { s.firma.logo = ''; await speichereEinstellungen(); viewEinstellungen('firma'); };

  // Design-Vorschau mit Beispieldaten
  function designVorschau() {
    $('#e-vorschau').innerHTML = renderDokument(
      neuesDokument('rechnung', {
        nummer: 'RE-MUSTER-001',
        leistungsdatum: heute(),
        kunde: { name: 'Max Mustermann', strasse: 'Musterstraße 1', plz: '12345', ort: 'Musterstadt' },
        feldWerte: { f_auszug: 'Alte Straße 5, 12345 Musterstadt', f_einzug: 'Neue Straße 9, 12345 Musterstadt' },
        positionen: [
          { beschreibung: 'Umzugshelfer (3 Personen)', menge: 12, einheit: 'Std.', preis: 35, ustSatz: 19 },
          { beschreibung: 'Umzugswagen 3,5 t inkl. Fahrer', menge: 4, einheit: 'Std.', preis: 60, ustSatz: 19 },
          { beschreibung: 'Anfahrt', menge: 1, einheit: 'Pauschal', preis: 50, ustSatz: 19 }
        ]
      })
    );
    skaliereVorschau($('#e-vorschau'));
  }
  if ($('#e-vorschau')) designVorschau();

  // Eigene Felder
  if ($('#e-felder')) {
    const zeichne = () => {
      $('#e-felder').innerHTML = s.eigeneFelder
        .map((f, i) => `<div class="extra-feld"><input data-fl="${i}" value="${esc(f.label)}" placeholder="Bezeichnung"><select data-ff="${i}">${[['beide', 'Rechnung & KV'], ['rechnung', 'nur Rechnung'], ['angebot', 'nur Kostenvoranschlag']].map(([v, l]) => `<option value="${v}" ${f.fuer === v ? 'selected' : ''}>${l}</option>`).join('')}</select><button class="btn-icon" data-fd="${i}">✕</button></div>`)
        .join('');
      $$('[data-fl]').forEach((el) => (el.oninput = () => (s.eigeneFelder[el.dataset.fl].label = el.value)));
      $$('[data-ff]').forEach((el) => (el.onchange = () => (s.eigeneFelder[el.dataset.ff].fuer = el.value)));
      $$('[data-fd]').forEach((el) => (el.onclick = () => { s.eigeneFelder.splice(el.dataset.fd, 1); zeichne(); }));
    };
    $('#e-feld-plus').onclick = () => { s.eigeneFelder.push({ id: `f_${Date.now().toString(36)}`, label: '', fuer: 'beide' }); zeichne(); };
    zeichne();
  }

  // Preisliste
  if ($('#e-artikel')) {
    const zeichne = () => {
      $('#e-artikel').innerHTML = s.artikel
        .map((a, i) => `<div class="extra-feld artikel"><input data-ab="${i}" value="${esc(a.beschreibung)}" placeholder="Beschreibung"><input data-ae="${i}" value="${esc(a.einheit)}" list="e-einheiten" placeholder="Einheit"><input data-ap="${i}" value="${esc(zahl(a.preis))}" inputmode="decimal" placeholder="Preis"><button class="btn-icon" data-ad="${i}">✕</button></div>`)
        .join('') + `<datalist id="e-einheiten">${s.einheiten.map((e) => `<option value="${esc(e)}">`).join('')}</datalist>`;
      $$('[data-ab]').forEach((el) => (el.oninput = () => (s.artikel[el.dataset.ab].beschreibung = el.value)));
      $$('[data-ae]').forEach((el) => (el.oninput = () => (s.artikel[el.dataset.ae].einheit = el.value)));
      $$('[data-ap]').forEach((el) => (el.oninput = () => (s.artikel[el.dataset.ap].preis = parseZahl(el.value))));
      $$('[data-ad]').forEach((el) => (el.onclick = () => { s.artikel.splice(el.dataset.ad, 1); zeichne(); }));
    };
    $('#e-artikel-plus').onclick = () => { s.artikel.push({ beschreibung: '', einheit: 'Std.', preis: 0 }); zeichne(); };
    zeichne();
  }

  // einfache Listen (Einheiten, Kategorien)
  $$('[data-liste]').forEach((ta) => (ta.oninput = () => (s[ta.dataset.liste] = ta.value.split('\n').map((x) => x.trim()).filter(Boolean))));

  if ($('#e-test'))
    $('#e-test').onclick = async () => {
      try {
        await speichereEinstellungen();
        await api('POST', '/api-mail/test');
        toast('Verbindung erfolgreich – E-Mails können versendet werden.');
      } catch (err) {
        toast(`Fehler: ${err.message}`, 'fehler');
      }
    };

  if ($('#e-restore'))
    $('#e-restore').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file || !(await bestaetigen('Alle aktuellen Daten werden durch die Sicherung ersetzt. Fortfahren?'))) return;
      try {
        await api('POST', '/api-restore', JSON.parse(await file.text()));
        await ladeAlles();
        toast('Sicherung wiederhergestellt');
      } catch (err) {
        toast(err.message, 'fehler');
      }
    };
}

function listenEditor(key) {
  return `<textarea data-liste="${key}" rows="6">${esc(S.settings[key].join('\n'))}</textarea><span class="hilfe">Ein Eintrag pro Zeile</span>`;
}
