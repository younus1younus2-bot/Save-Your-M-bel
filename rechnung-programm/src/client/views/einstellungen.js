// Einstellungen inkl. Zugänge, Vorlagen, Textbausteine, Papierkorb, Benachrichtigungen und Sicherung
import backend from 'backend';
import { datum, esc, euro, heute, parseZahl, zahl } from '../../shared/rechnen.js';
import { renderDokument } from '../../shared/vorlagen.js';
import { S, api, istChef, ladeAlles, speichereEinstellungen } from '../state.js';
import { main, neuesDokument } from '../helfer.js';
import { $, $$, abfrage, bestaetigen, logoVarianten, modal, skaliereVorschau, toast } from '../ui.js';
import { pushAktiv, pushEinschalten, pushAusschalten } from '../pwa.js';

const getPfad = (obj, pfad) => pfad.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
function setPfad(obj, pfad, wert) {
  const teile = pfad.split('.');
  const letzter = teile.pop();
  teile.reduce((o, k) => (o[k] ||= {}), obj)[letzter] = wert;
}

const TABS = {
  firma: 'Firma',
  steuer: 'Steuer',
  design: 'Rechnungsdesign',
  nummern: 'Nummern & Fristen',
  texte: 'Texte',
  felder: 'Eigene Felder',
  preise: 'Preisliste',
  vorlagen: 'Umzugs-Vorlagen',
  bausteine: 'Textbausteine',
  kategorien: 'Kategorien',
  email: 'E-Mail',
  zugaenge: 'Zugänge',
  mein: 'Mein Zugang',
  sicherung: 'Datensicherung',
  papierkorb: 'Papierkorb'
};

export function viewEinstellungen(tab = 'firma') {
  if (!istChef()) tab = 'mein';
  const s = S.settings;
  const feld = (pfad, label, attrs = '') => `<label>${label}<input data-s="${pfad}" value="${esc(getPfad(s, pfad) ?? '')}" ${attrs}></label>`;
  const bereich = (inhalt) => `<div class="karte">${inhalt}<div class="btn-gruppe rechts"><button class="btn btn-primaer" id="e-speichern" type="button">Speichern</button></div></div>`;

  const tabs = {
    firma: () =>
      bereich(`<h3>Firmendaten (erscheinen auf Rechnungen)</h3>
      <div class="raster-2">
        ${feld('firma.name', 'Firmenname')}${feld('firma.web', 'Webseite')}
        ${feld('firma.vorname', 'Vorname Inhaber/in')}${feld('firma.nachname', 'Nachname Inhaber/in')}
        ${feld('firma.strasse', 'Straße & Nr.')}<div class="raster-2 innen">${feld('firma.plz', 'PLZ')}${feld('firma.ort', 'Ort')}</div>
        ${feld('firma.telefon', 'Telefon')}${feld('firma.email', 'E-Mail')}
        ${feld('firma.steuernummer', 'Steuernummer')}${feld('firma.ustId', 'USt-IdNr. (falls vorhanden)')}
      </div>
      <h4>Bankverbindung</h4>
      <div class="raster-2">${feld('firma.kontoinhaber', 'Kontoinhaber')}${feld('firma.bank', 'Bank')}${feld('firma.iban', 'IBAN')}${feld('firma.bic', 'BIC')}</div>
      <h4>Logo</h4>
      <div class="logo-feld">
        ${s.firma.logo ? `<img src="${esc(s.firma.logo)}" alt="Logo für helle Flächen">` : ''}
        ${s.firma.logoHell ? `<img src="${esc(s.firma.logoHell)}" alt="Logo für den dunklen Kopfbereich" class="logo-dunkel">` : ''}
        ${s.firma.logo ? '' : '<span class="hilfe">Kein Logo – es wird der Firmenname angezeigt.</span>'}
      </div>
      <div class="logo-feld"><input type="file" id="e-logo" accept="image/png,image/jpeg,image/webp" aria-label="Logo hochladen">${s.firma.logo ? '<button class="btn btn-klein" id="e-logo-weg" type="button">Logo entfernen</button>' : ''}</div>
      <p class="hilfe">Am besten ein PNG mit durchsichtigem oder weißem Hintergrund. Die helle Version für den dunklen Kopf wird automatisch erzeugt.</p>`),

    steuer: () =>
      bereich(`<h3>Besteuerung</h3>
      <label class="radio-karte"><input type="radio" name="modus" value="klein" ${s.steuer.modus === 'klein' ? 'checked' : ''}>
        <div><b>Kleinunternehmer (§ 19 UStG)</b><br>Keine Umsatzsteuer auf Rechnungen. Der Hinweis zu § 19 UStG steht automatisch auf jeder Rechnung. Preise = Endpreise.</div></label>
      <label class="radio-karte"><input type="radio" name="modus" value="regel" ${s.steuer.modus === 'regel' ? 'checked' : ''}>
        <div><b>Regelbesteuerung (mit Umsatzsteuer)</b><br>Preise werden netto eingegeben, Umsatzsteuer je Position (19 % / 7 %). Die Buchhaltung zeigt Vorsteuer und Zahllast.</div></label>
      <div class="raster-3">${feld('steuer.satz', 'Standard-Steuersatz in %', 'inputmode="decimal"')}</div>
      <p class="hinweis-box">Bereits abgeschlossene Rechnungen behalten ihre Besteuerung. Den Zeitpunkt des Wechsels bitte mit dem Steuerberater abstimmen.</p>`),

    design: () =>
      bereich(`<h3>Aussehen von Rechnung & Kostenvoranschlag</h3>
      <div class="raster-3">
        <label>Vorlage<select data-s="design.vorlage">${[['saveyourmoebel', 'Save Your Möbel (wie Canva)'], ['modern', 'Modern (farbiger Streifen)']].map(([v, l]) => `<option value="${v}" ${s.design.vorlage === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label>Farbe Kopfbereich<input type="color" data-s="design.kopf" value="${esc(s.design.kopf)}"></label>
        <label>Akzentfarbe<input type="color" data-s="design.farbe" value="${esc(s.design.farbe)}"></label>
        <label>Schriftart<select data-s="design.schrift">${['Aileron', 'Montserrat', 'Open Sans', 'Lato', 'Poppins', 'Roboto', 'Arial'].map((f) => `<option ${s.design.schrift === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
        <label>Überschriften (Vorlage Modern)<input type="color" data-s="design.akzent" value="${esc(s.design.akzent)}"></label>
        <label>Vorschau in Sprache<select id="e-sprache"><option value="de">Deutsch</option><option value="en">Englisch</option></select></label>
      </div>
      <div class="vorschau-rahmen klein"><div id="e-vorschau" class="vorschau-skaliert"></div></div>`),

    nummern: () =>
      bereich(`<h3>Nummernkreise</h3>
      <p class="hilfe">{JAHR} wird durch das aktuelle Jahr ersetzt. Rechnungsnummern werden erst beim Abschließen vergeben – gelöschte Entwürfe erzeugen keine Lücken.</p>
      <div class="raster-3">
        ${feld('nummern.rechnung.prefix', 'Rechnungen: Präfix')}${feld('nummern.rechnung.naechste', 'Nächste Nummer', 'type="number" min="1"')}${feld('nummern.rechnung.stellen', 'Stellen', 'type="number" min="1" max="8"')}
        ${feld('nummern.angebot.prefix', 'Kostenvoranschläge: Präfix')}${feld('nummern.angebot.naechste', 'Nächste Nummer', 'type="number" min="1"')}${feld('nummern.angebot.stellen', 'Stellen', 'type="number" min="1" max="8"')}
      </div>
      <h3>Fristen & Erinnerungen</h3>
      <div class="raster-3">
        ${feld('zahlungszielTage', 'Zahlungsziel (Tage)', 'type="number" min="0"')}${feld('angebotGueltigTage', 'Kostenvoranschlag gültig (Tage)', 'type="number" min="0"')}
        ${feld('erinnerungen.kvNachfassenTage', 'KV nachfassen nach (Tagen)', 'type="number" min="1"')}${feld('erinnerungen.entwurfAlterTage', 'Erinnerung an Entwürfe nach (Tagen)', 'type="number" min="1"')}
      </div>`),

    texte: () =>
      bereich(`<h3>Standardtexte</h3>
      ${[
        ['texte.kleinunternehmer', 'Hinweis Kleinunternehmer (§ 19 UStG)'],
        ['texte.rechnungEinleitung', 'Rechnung – Einleitung (leer = keine)'],
        ['texte.rechnungSchluss', 'Rechnung – Schlusstext'],
        ['texte.angebotEinleitung', 'Kostenvoranschlag – Einleitung (leer = keine)'],
        ['texte.angebotSchluss', 'Kostenvoranschlag – Schlusstext']
      ]
        .map(([p, l]) => `<label>${l}<textarea data-s="${p}" rows="3">${esc(getPfad(s, p))}</textarea></label>`)
        .join('')}
      <h4>Englische Fassung</h4>
      ${[
        ['texte.en.kleinunternehmer', 'Small business note (§ 19 UStG)'],
        ['texte.en.rechnungSchluss', 'Invoice – closing text'],
        ['texte.en.angebotSchluss', 'Cost estimate – closing text']
      ]
        .map(([p, l]) => `<label>${l}<textarea data-s="${p}" rows="2">${esc(getPfad(s, p))}</textarea></label>`)
        .join('')}
      <p class="hilfe">Platzhalter: {KUNDE} {NUMMER} {BETRAG} {DATUM} {FAELLIG} {GUELTIG} {ZIEL} {FIRMA}</p>`),

    felder: () =>
      bereich(`<h3>Eigene Felder</h3>
      <p class="hilfe">Erscheinen in jedem neuen Dokument (z. B. Auszugs-/Einzugsadresse, Etage, m³). Leere Felder werden nicht gedruckt.</p>
      <div id="e-felder"></div><button class="btn btn-klein" id="e-feld-plus" type="button">+ Feld</button>`),

    preise: () =>
      bereich(`<h3>Preisliste (Artikel & Leistungen)</h3>
      <p class="hilfe">Schnell in Dokumente einfügbar. Preise lassen sich im Dokument jederzeit anpassen.</p>
      <div id="e-artikel"></div><button class="btn btn-klein" id="e-artikel-plus" type="button">+ Artikel</button>
      <h4>Fahrtkosten</h4><div class="raster-3">${feld('preisProKm', 'Preis pro Kilometer (€)', 'inputmode="decimal"')}</div>
      <h4>Einheiten</h4>${listenEditor('einheiten')}`),

    vorlagen: () =>
      bereich(`<h3>Vorlagen für typische Umzüge</h3>
      <p class="hilfe">Füllen alle Positionen mit einem Klick („Vorlage einfügen…“ im Dokument). Neue Vorlagen kannst du auch direkt aus einem Dokument speichern (⋯ → Positionen als Vorlage speichern).</p>
      <div id="e-vorlagen"></div><button class="btn btn-klein" id="e-vorlage-plus" type="button">+ Vorlage</button>`),

    bausteine: () =>
      bereich(`<h3>Textbausteine</h3>
      <p class="hilfe">Fertige Sätze, die du im Dokument mit „Textbaustein einfügen“ an der Cursorposition einfügst. Ein Baustein pro Zeile.</p>
      <textarea data-liste="textbausteine" rows="10">${esc((s.textbausteine || []).join('\n'))}</textarea>`),

    kategorien: () =>
      bereich(`<h3>Kategorien für die Buchhaltung</h3>
      <div class="raster-2"><div><h4>Einnahmen</h4>${listenEditor('kategorienEinnahmen')}</div><div><h4>Ausgaben</h4>${listenEditor('kategorienAusgaben')}</div></div>`),

    email: () =>
      bereich(`<h3>E-Mail-Versand (SMTP)</h3>
      <p class="hilfe">Damit Mails von deiner eigenen Adresse kommen: IONOS smtp.ionos.de (587) · Strato smtp.strato.de (465) · Gmail smtp.gmail.com (587, App-Passwort) · Outlook smtp.office365.com (587). Das Passwort wird verschlüsselt gespeichert.</p>
      <div class="raster-2">
        ${feld('email.smtp.host', 'SMTP-Server')}${feld('email.smtp.port', 'Port', 'type="number"')}
        ${feld('email.smtp.user', 'Benutzername (meist die E-Mail-Adresse)')}${feld('email.smtp.pass', 'Passwort', 'type="password" autocomplete="new-password"')}
        ${feld('email.smtp.from', 'Absender-Adresse (leer = Benutzername)')}${feld('email.bcc', 'Kopie aller Mails an (BCC, optional)')}
      </div>
      <button class="btn" id="e-test" type="button">Verbindung testen</button>
      <h3>E-Mail-Vorlagen</h3>
      ${Object.entries({ rechnung: 'Rechnung', angebot: 'Kostenvoranschlag', erinnerung: 'Zahlungserinnerung' })
        .map(([k, l]) => `<h4>${l}</h4>${feld(`email.vorlagen.${k}.betreff`, 'Betreff')}<label>Text<textarea data-s="email.vorlagen.${k}.text" rows="6">${esc(s.email.vorlagen[k].text)}</textarea></label>`)
        .join('')}
      <p class="hilfe">Platzhalter: {KUNDE} {NUMMER} {BETRAG} {DATUM} {FAELLIG} {GUELTIG} {FIRMA}</p>`),

    zugaenge: () => `<div class="karte"><div class="karte-kopf"><h3>Zugänge</h3><button class="btn btn-primaer" id="z-neu" type="button">+ Zugang</button></div>
      <p class="hilfe"><b>Chef</b> sieht und bearbeitet alles. <b>Mitarbeiter</b> sehen nur ihre eigenen Einsätze (mit Navigation) und können sie als erledigt melden – keine Preise, keine Rechnungen.</p>
      <table class="tabelle" id="z-tabelle"><tbody><tr><td class="leer">Lädt…</td></tr></tbody></table></div>`,

    mein: () => `<div class="karte"><h3>Mein Zugang</h3>
      <p>Angemeldet als <b>${esc(S.benutzer?.name || '')}</b> (${esc(S.benutzer?.email || '')}) · Rolle: ${S.benutzer?.rolle === 'chef' ? 'Chef' : 'Mitarbeiter'}</p>
      <form id="pw-form" class="raster-3">
        <label>Aktuelles Passwort<input type="password" id="pw-alt" autocomplete="current-password" required></label>
        <label>Neues Passwort (mind. 10 Zeichen)<input type="password" id="pw-neu" autocomplete="new-password" minlength="10" required></label>
        <div class="feld-knopf"><button class="btn btn-primaer" type="submit">Passwort ändern</button></div>
      </form>
      <h3>Benachrichtigungen aufs Handy</h3>
      <p class="hilfe">Du bekommst Push-Nachrichten, z. B. bei neuen Einsätzen oder morgens mit dem Tagesüberblick. Tipp: Das Portal vorher über „Zum Startbildschirm hinzufügen“ als App installieren.</p>
      <div class="btn-gruppe"><button class="btn" id="push-an" type="button">Benachrichtigungen einschalten</button><button class="btn" id="push-aus" type="button">Ausschalten</button><span class="hilfe" id="push-status"></span></div></div>`,

    sicherung: () => `<div class="karte"><h3>Datensicherung</h3>
      <p>Die Daten liegen in einer Datenbank auf dem Server. Jeden Tag wird automatisch eine Kopie in <code>data/backups/</code> abgelegt (30 Tage). Rechnungen musst du 10 Jahre aufbewahren.</p>
      <h4>Sicherung nach außen (empfohlen)</h4>
      <p class="hilfe">Jeden Tag geht automatisch eine Sicherung per E-Mail an diese Adresse – so sind die Daten auch sicher, wenn der Server ausfällt.</p>
      <div class="raster-3">${feld('sicherung.email', 'Sicherung täglich per E-Mail an', 'type="email" placeholder="z. B. privat@beispiel.de"')}<div class="feld-knopf"><button class="btn" id="e-sich-speichern" type="button">Speichern</button><button class="btn" id="e-sich-jetzt" type="button">Jetzt senden</button></div></div>
      <h4>Von Hand</h4>
      <div class="btn-gruppe"><button class="btn btn-primaer" id="e-sich-laden" type="button">Sicherung herunterladen</button>
      <label class="btn">Sicherung wiederherstellen<input type="file" id="e-restore" accept=".json,.gz" hidden></label></div></div>`,

    papierkorb: () => `<div class="karte"><h3>Papierkorb</h3><p class="hilfe">Gelöschte Einträge bleiben hier erhalten und lassen sich wiederherstellen.</p><table class="tabelle" id="pk-tabelle"><tbody><tr><td class="leer">Lädt…</td></tr></tbody></table></div>`
  };

  const sichtbareTabs = istChef() ? TABS : { mein: TABS.mein };
  main().innerHTML = `<div class="seiten-kopf"><h1>Einstellungen</h1></div>
    <nav class="tabs" aria-label="Bereiche">${Object.entries(sichtbareTabs).map(([k, v]) => `<a href="#/einstellungen/${k}" class="${k === tab ? 'aktiv' : ''}" ${k === tab ? 'aria-current="page"' : ''}>${v}</a>`).join('')}</nav>
    ${(tabs[tab] || tabs.firma)()}`;

  $$('[data-s]').forEach((el) =>
    el.addEventListener('input', () => {
      const alt = getPfad(s, el.dataset.s);
      setPfad(s, el.dataset.s, typeof alt === 'number' ? parseZahl(el.value) : el.value);
      if ($('#e-vorschau')) designVorschau();
    })
  );
  $$('input[name="modus"]').forEach((r) => (r.onchange = () => (s.steuer.modus = r.value)));
  $$('[data-liste]').forEach((ta) => (ta.oninput = () => (s[ta.dataset.liste] = ta.value.split('\n').map((x) => x.trim()).filter(Boolean))));

  const speichern = async () => {
    try {
      if (tab === 'nummern') s.nummernGeprueft = true;
      if (tab === 'preise') s.preiseGeprueft = true;
      await speichereEinstellungen();
      toast('Einstellungen gespeichert');
      viewEinstellungen(tab);
    } catch (err) {
      toast(err.message, 'fehler');
    }
  };
  if ($('#e-speichern')) $('#e-speichern').onclick = speichern;

  // Logo
  if ($('#e-logo'))
    $('#e-logo').onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 3e6) return toast('Logo bitte kleiner als 3 MB', 'fehler');
      const r = new FileReader();
      r.onload = async () => {
        try {
          const { normal, hell } = await logoVarianten(r.result);
          s.firma.logo = normal;
          s.firma.logoHell = hell;
          await speichereEinstellungen();
          viewEinstellungen('firma');
        } catch {
          toast('Das Bild konnte nicht gelesen werden.', 'fehler');
        }
      };
      r.readAsDataURL(file);
    };
  if ($('#e-logo-weg'))
    $('#e-logo-weg').onclick = async () => {
      s.firma.logo = '';
      s.firma.logoHell = '';
      await speichereEinstellungen();
      viewEinstellungen('firma');
    };

  // Design-Vorschau
  function designVorschau() {
    $('#e-vorschau').innerHTML = renderDokument(
      neuesDokument('rechnung', {
        nummer: 'MUSTER',
        status: 'offen',
        gesperrt: true,
        sprache: $('#e-sprache')?.value || 'de',
        kunde: { name: 'Max Mustermann', strasse: 'Musterstraße 1', plz: '12345', ort: 'Musterstadt' },
        positionen: s.artikel.slice(0, 5).map((a) => ({ ...a, menge: 1, ustSatz: s.steuer.satz }))
      }),
      s
    );
    skaliereVorschau($('#e-vorschau'));
  }
  if ($('#e-vorschau')) {
    $('#e-sprache').onchange = designVorschau;
    designVorschau();
  }

  // Eigene Felder
  if ($('#e-felder')) {
    const zeichne = () => {
      $('#e-felder').innerHTML = s.eigeneFelder
        .map(
          (f, i) => `<div class="extra-feld"><input data-fl="${i}" value="${esc(f.label)}" placeholder="Bezeichnung" aria-label="Bezeichnung"><select data-ff="${i}" aria-label="Verwendung">${[['beide', 'Rechnung & KV'], ['rechnung', 'nur Rechnung'], ['angebot', 'nur Kostenvoranschlag']].map(([v, l]) => `<option value="${v}" ${f.fuer === v ? 'selected' : ''}>${l}</option>`).join('')}</select><button class="btn-icon" data-fd="${i}" type="button" aria-label="Entfernen">✕</button></div>`
        )
        .join('');
      $$('[data-fl]').forEach((el) => (el.oninput = () => (s.eigeneFelder[el.dataset.fl].label = el.value)));
      $$('[data-ff]').forEach((el) => (el.onchange = () => (s.eigeneFelder[el.dataset.ff].fuer = el.value)));
      $$('[data-fd]').forEach((el) => (el.onclick = () => (s.eigeneFelder.splice(el.dataset.fd, 1), zeichne())));
    };
    $('#e-feld-plus').onclick = () => (s.eigeneFelder.push({ id: `f_${Date.now().toString(36)}`, label: '', fuer: 'beide' }), zeichne());
    zeichne();
  }

  // Preisliste
  if ($('#e-artikel')) {
    const zeichne = () => {
      $('#e-artikel').innerHTML =
        s.artikel
          .map(
            (a, i) => `<div class="extra-feld artikel"><input data-ab="${i}" value="${esc(a.beschreibung)}" placeholder="Beschreibung" aria-label="Beschreibung"><input data-ae="${i}" value="${esc(a.einheit)}" list="e-einheiten" placeholder="Einheit" aria-label="Einheit"><input data-ap="${i}" value="${esc(zahl(a.preis))}" inputmode="decimal" placeholder="Preis" aria-label="Preis"><button class="btn-icon" data-ad="${i}" type="button" aria-label="Entfernen">✕</button></div>`
          )
          .join('') + `<datalist id="e-einheiten">${s.einheiten.map((e) => `<option value="${esc(e)}">`).join('')}</datalist>`;
      $$('[data-ab]').forEach((el) => (el.oninput = () => (s.artikel[el.dataset.ab].beschreibung = el.value)));
      $$('[data-ae]').forEach((el) => (el.oninput = () => (s.artikel[el.dataset.ae].einheit = el.value)));
      $$('[data-ap]').forEach((el) => (el.oninput = () => (s.artikel[el.dataset.ap].preis = parseZahl(el.value))));
      $$('[data-ad]').forEach((el) => (el.onclick = () => (s.artikel.splice(el.dataset.ad, 1), zeichne())));
    };
    $('#e-artikel-plus').onclick = () => (s.artikel.push({ beschreibung: '', einheit: 'Pauschal', preis: 0 }), zeichne());
    zeichne();
  }

  // Umzugs-Vorlagen
  if ($('#e-vorlagen')) {
    const zeichne = () => {
      $('#e-vorlagen').innerHTML = (s.umzugsvorlagen || []).length
        ? s.umzugsvorlagen
            .map((v, i) => {
              const summe = v.positionen.reduce((a, p) => a + parseZahl(p.menge) * parseZahl(p.preis), 0);
              return `<div class="vorlage-zeile"><div><b>${esc(v.name)}</b><small>${v.positionen.length} Positionen · ${euro(summe)}</small></div><div class="btn-gruppe"><button class="btn btn-klein" data-vb="${i}" type="button">Bearbeiten</button><button class="btn-icon" data-vd="${i}" type="button" aria-label="Vorlage löschen">✕</button></div></div>`;
            })
            .join('')
        : '<p class="leer">Noch keine Vorlagen.</p>';
      $$('[data-vd]').forEach((b) => (b.onclick = () => (s.umzugsvorlagen.splice(Number(b.dataset.vd), 1), zeichne())));
      $$('[data-vb]').forEach((b) => (b.onclick = () => vorlageDialog(s.umzugsvorlagen[Number(b.dataset.vb)], zeichne)));
    };
    $('#e-vorlage-plus').onclick = async () => {
      const name = await abfrage('Neue Vorlage', 'Name', { ok: 'Weiter' });
      if (!name) return;
      const v = { name, positionen: [{ beschreibung: 'Anfahrt', menge: 1, einheit: 'Pauschal', preis: 40 }] };
      s.umzugsvorlagen = [...(s.umzugsvorlagen || []), v];
      zeichne();
      vorlageDialog(v, zeichne);
    };
    zeichne();
  }

  // E-Mail testen
  if ($('#e-test'))
    $('#e-test').onclick = async () => {
      try {
        await speichereEinstellungen();
        await backend.mailTest();
        toast('Verbindung erfolgreich – E-Mails können versendet werden.');
      } catch (err) {
        toast(`Fehler: ${err.message}`, 'fehler');
      }
    };

  // Zugänge
  if ($('#z-tabelle')) zugaenge();

  // Mein Zugang
  if ($('#pw-form'))
    $('#pw-form').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await backend.benutzer.passwort($('#pw-alt').value, $('#pw-neu').value);
        toast('Passwort geändert');
        e.target.reset();
      } catch (err) {
        toast(err.message, 'fehler');
      }
    };
  if ($('#push-an')) {
    const status = async () => ($('#push-status').textContent = (await pushAktiv()) ? 'Eingeschaltet auf diesem Gerät' : 'Aus');
    $('#push-an').onclick = async () => {
      try {
        await pushEinschalten();
        toast('Benachrichtigungen eingeschaltet');
      } catch (err) {
        toast(err.message, 'fehler');
      }
      status();
    };
    $('#push-aus').onclick = async () => (await pushAusschalten(), status());
    status();
  }

  // Sicherung
  if ($('#e-sich-speichern')) $('#e-sich-speichern').onclick = speichern;
  if ($('#e-sich-jetzt'))
    $('#e-sich-jetzt').onclick = async () => {
      try {
        await speichereEinstellungen();
        toast((await backend.sicherungMail()).ok ? 'Sicherung per E-Mail gesendet' : 'Bitte zuerst E-Mail-Versand und Adresse eintragen', 'ok');
      } catch (err) {
        toast(err.message, 'fehler');
      }
    };
  if ($('#e-sich-laden'))
    $('#e-sich-laden').onclick = async () => {
      try {
        await backend.download(await backend.sicherungHolen(), `rechnung-programm-sicherung-${heute()}.json`);
      } catch (err) {
        toast(err.message, 'fehler');
      }
    };
  if ($('#e-restore'))
    $('#e-restore').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!(await bestaetigen('Alle aktuellen Daten werden durch die Sicherung ersetzt. Vorher wird automatisch eine Kopie des jetzigen Stands angelegt. Fortfahren?', { ok: 'Wiederherstellen', gefahr: true }))) return;
      try {
        let text;
        if (file.name.endsWith('.gz')) text = await new Response(file.stream().pipeThrough(new DecompressionStream('gzip'))).text();
        else text = await file.text();
        await backend.wiederherstellen(JSON.parse(text));
        await ladeAlles();
        toast('Sicherung wiederhergestellt');
      } catch (err) {
        toast(err.message, 'fehler');
      }
    };

  // Papierkorb
  if ($('#pk-tabelle')) papierkorb();
}

function listenEditor(key) {
  return `<textarea data-liste="${key}" rows="6">${esc(S.settings[key].join('\n'))}</textarea><span class="hilfe">Ein Eintrag pro Zeile</span>`;
}

function vorlageDialog(v, fertig) {
  const kopie = JSON.parse(JSON.stringify(v));
  const { el, close } = modal(`Vorlage „${v.name}“`, `
    <label>Name<input id="v-name" value="${esc(kopie.name)}"></label>
    <div id="v-pos"></div>
    <button class="btn btn-klein" type="button" id="v-plus">+ Position</button>
    <div class="btn-gruppe rechts"><button class="btn btn-primaer" type="button" id="v-ok">Übernehmen</button></div>
    <p class="hilfe">Danach unten auf „Speichern“ klicken.</p>`, { breit: true });
  const zeichne = () => {
    $('#v-pos', el).innerHTML = kopie.positionen
      .map((p, i) => `<div class="extra-feld artikel"><input data-b="${i}" value="${esc(p.beschreibung)}" aria-label="Beschreibung"><input data-m="${i}" value="${esc(zahl(p.menge, 3))}" aria-label="Menge"><input data-p="${i}" value="${esc(zahl(p.preis))}" aria-label="Preis"><button class="btn-icon" data-d="${i}" type="button" aria-label="Entfernen">✕</button></div>`)
      .join('');
    $$('[data-b]', el).forEach((x) => (x.oninput = () => (kopie.positionen[x.dataset.b].beschreibung = x.value)));
    $$('[data-m]', el).forEach((x) => (x.oninput = () => (kopie.positionen[x.dataset.m].menge = parseZahl(x.value))));
    $$('[data-p]', el).forEach((x) => (x.oninput = () => (kopie.positionen[x.dataset.p].preis = parseZahl(x.value))));
    $$('[data-d]', el).forEach((x) => (x.onclick = () => (kopie.positionen.splice(Number(x.dataset.d), 1), zeichne())));
  };
  $('#v-plus', el).onclick = () => (kopie.positionen.push({ beschreibung: '', menge: 1, einheit: 'Pauschal', preis: 0 }), zeichne());
  $('#v-ok', el).onclick = () => {
    Object.assign(v, kopie, { name: $('#v-name', el).value || kopie.name });
    close();
    fertig();
  };
  zeichne();
}

async function zugaenge() {
  const zeichne = async () => {
    let liste = [];
    try {
      liste = await backend.benutzer.liste();
    } catch (e) {
      $('#z-tabelle').innerHTML = `<tbody><tr><td class="leer">${esc(e.message)}</td></tr></tbody>`;
      return;
    }
    $('#z-tabelle').innerHTML = `<thead><tr><th>Name</th><th>E-Mail</th><th>Rolle</th><th>Mitarbeiter</th><th>Status</th></tr></thead><tbody>${liste
      .map(
        (b) => `<tr class="klickbar" tabindex="0" data-b="${esc(b.id)}"><td><b>${esc(b.name)}</b></td><td>${esc(b.email)}</td><td>${b.rolle === 'chef' ? 'Chef' : 'Mitarbeiter'}</td><td>${esc(S.mitarbeiter.find((m) => m.id === b.mitarbeiterId)?.name || '–')}</td><td>${b.aktiv === false ? '<span class="badge">gesperrt</span>' : '<span class="badge badge-bezahlt">aktiv</span>'}</td></tr>`
      )
      .join('')}</tbody>`;
    $$('#z-tabelle [data-b]').forEach((tr) => (tr.onclick = () => zugangDialog(liste.find((b) => b.id === tr.dataset.b), zeichne)));
  };
  $('#z-neu').onclick = () => zugangDialog({ rolle: 'mitarbeiter', aktiv: true }, zeichne);
  zeichne();
}

function zugangDialog(b, fertig) {
  const neu = !b.id;
  const { el, close } = modal(neu ? 'Neuer Zugang' : b.name, `
    <form class="formular" id="z-form"><div class="raster-2">
      <label>Name<input id="z-name" required value="${esc(b.name || '')}"></label>
      <label>E-Mail (Login)<input id="z-email" type="email" required value="${esc(b.email || '')}"></label>
      <label>Rolle<select id="z-rolle"><option value="mitarbeiter">Mitarbeiter</option><option value="chef" ${b.rolle === 'chef' ? 'selected' : ''}>Chef</option></select></label>
      <label>Verknüpfter Mitarbeiter<select id="z-ma"><option value="">–</option>${S.mitarbeiter.map((m) => `<option value="${m.id}" ${m.id === b.mitarbeiterId ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select></label>
      <label>${neu ? 'Passwort (mind. 10 Zeichen)' : 'Neues Passwort (leer = unverändert)'}<input id="z-pw" type="password" autocomplete="new-password" ${neu ? 'required minlength="10"' : ''}></label>
      ${neu ? '' : `<label class="checkbox"><input type="checkbox" id="z-aktiv" ${b.aktiv !== false ? 'checked' : ''}> Zugang aktiv</label>`}
    </div>
    <p class="hilfe">Mitarbeiter-Zugänge brauchen einen verknüpften Mitarbeiter – dann sehen sie genau dessen Einsätze.</p>
    <div class="btn-gruppe rechts"><button class="btn btn-primaer" type="submit">Speichern</button></div></form>`);
  $('#z-form', el).onsubmit = async (e) => {
    e.preventDefault();
    const daten = { name: $('#z-name', el).value, email: $('#z-email', el).value, rolle: $('#z-rolle', el).value, mitarbeiterId: $('#z-ma', el).value, passwort: $('#z-pw', el).value || undefined };
    if (daten.rolle === 'mitarbeiter' && !daten.mitarbeiterId) return toast('Bitte einen Mitarbeiter verknüpfen.', 'fehler');
    try {
      if (neu) await backend.benutzer.anlegen(daten);
      else await backend.benutzer.aendern(b.id, { ...daten, aktiv: $('#z-aktiv', el).checked });
      toast('Gespeichert');
      close();
      fertig();
    } catch (err) {
      toast(err.message, 'fehler');
    }
  };
}

async function papierkorb() {
  const NAMEN = { kunden: 'Kunde', dokumente: 'Dokument', termine: 'Termin', buchungen: 'Buchung', mitarbeiter: 'Mitarbeiter', aufgaben: 'Aufgabe', auftraege: 'Auftrag', notizen: 'Notiz' };
  const zeichne = async () => {
    const liste = (await api('GET', '/api/papierkorb')).sort((a, b) => b.geloescht.localeCompare(a.geloescht));
    $('#pk-tabelle').innerHTML = liste.length
      ? `<thead><tr><th>Art</th><th>Eintrag</th><th>Gelöscht am</th><th></th></tr></thead><tbody>${liste
          .map((x) => `<tr><td>${NAMEN[x.sammlung] || x.sammlung}</td><td>${esc(x.name)}</td><td>${datum(x.geloescht)}</td><td class="c-num"><button class="btn btn-klein" data-wh="${x.sammlung}|${x.id}" type="button">Wiederherstellen</button></td></tr>`)
          .join('')}</tbody>`
      : '<tbody><tr><td class="leer">Der Papierkorb ist leer.</td></tr></tbody>';
    $$('[data-wh]').forEach(
      (b) =>
        (b.onclick = async () => {
          const [col, id] = b.dataset.wh.split('|');
          try {
            await api('POST', `/api/${col}/${id}/wiederherstellen`);
            await ladeAlles();
            toast('Wiederhergestellt');
            zeichne();
          } catch (e) {
            toast(e.message, 'fehler');
          }
        })
    );
  };
  zeichne();
}
