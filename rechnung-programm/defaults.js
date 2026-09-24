// Standard-Einstellungen (werden vom Server und von der Test-Version genutzt)
const DEFAULT_SETTINGS = {
  firma: {
    name: 'Save Your Möbel',
    inhaber: '',
    strasse: '',
    plz: '',
    ort: '',
    telefon: '',
    email: '',
    web: 'www.saveyourmobel.de',
    steuernummer: '',
    ustId: '',
    bank: '',
    iban: '',
    bic: '',
    logo: ''
  },
  steuer: {
    modus: 'klein', // 'klein' = Kleinunternehmer §19 UStG, 'regel' = mit Umsatzsteuer
    satz: 19
  },
  design: {
    farbe: '#E53935',
    akzent: '#1F1F1F',
    schrift: 'Montserrat'
  },
  nummern: {
    rechnung: { prefix: 'RE-{JAHR}-', naechste: 1, stellen: 3 },
    angebot: { prefix: 'KV-{JAHR}-', naechste: 1, stellen: 3 }
  },
  zahlungszielTage: 14,
  angebotGueltigTage: 30,
  texte: {
    rechnungEinleitung: 'vielen Dank für Ihren Auftrag. Wir stellen Ihnen folgende Leistungen in Rechnung:',
    rechnungSchluss: 'Bitte überweisen Sie den Betrag innerhalb von {ZIEL} Tagen unter Angabe der Rechnungsnummer.\nVielen Dank für Ihr Vertrauen!',
    angebotEinleitung: 'vielen Dank für Ihre Anfrage. Gerne unterbreiten wir Ihnen folgenden Kostenvoranschlag:',
    angebotSchluss: 'Dieser Kostenvoranschlag ist gültig bis {GUELTIG}. Wir freuen uns auf Ihren Auftrag!'
  },
  eigeneFelder: [
    { id: 'f_auszug', label: 'Auszugsadresse', fuer: 'beide' },
    { id: 'f_einzug', label: 'Einzugsadresse', fuer: 'beide' }
  ],
  einheiten: ['Pauschal', 'Std.', 'Stk.', 'm³', 'km', 'Tag', 'Helfer'],
  kategorienAusgaben: ['Fahrzeug / Miete', 'Kraftstoff', 'Löhne / Aushilfen', 'Verpackungsmaterial', 'Versicherung', 'Werbung', 'Büro / Telefon', 'Werkzeug', 'Sonstiges'],
  kategorienEinnahmen: ['Umzug', 'Entrümpelung', 'Montage', 'Sonstiges'],
  artikel: [
    { beschreibung: 'Umzugshelfer', einheit: 'Std.', preis: 35 },
    { beschreibung: 'Umzugswagen 3,5 t inkl. Fahrer', einheit: 'Std.', preis: 60 },
    { beschreibung: 'Anfahrt', einheit: 'Pauschal', preis: 50 },
    { beschreibung: 'Möbel-Demontage / Montage', einheit: 'Std.', preis: 40 },
    { beschreibung: 'Umzugskartons', einheit: 'Stk.', preis: 2.5 }
  ],
  email: {
    vorlagen: {
      rechnung: {
        betreff: 'Ihre Rechnung {NUMMER} – {FIRMA}',
        text: 'Guten Tag {KUNDE},\n\nanbei erhalten Sie Ihre Rechnung {NUMMER} über {BETRAG}.\nBitte überweisen Sie den Betrag bis zum {FAELLIG}.\n\nMit freundlichen Grüßen\n{FIRMA}'
      },
      angebot: {
        betreff: 'Ihr Kostenvoranschlag {NUMMER} – {FIRMA}',
        text: 'Guten Tag {KUNDE},\n\nvielen Dank für Ihre Anfrage. Anbei erhalten Sie unseren Kostenvoranschlag {NUMMER} über {BETRAG}.\nBei Fragen sind wir gerne für Sie da.\n\nMit freundlichen Grüßen\n{FIRMA}'
      },
      erinnerung: {
        betreff: 'Zahlungserinnerung zu Rechnung {NUMMER}',
        text: 'Guten Tag {KUNDE},\n\nsicher ist es Ihrer Aufmerksamkeit entgangen: Die Rechnung {NUMMER} über {BETRAG} war am {FAELLIG} fällig.\nBitte überweisen Sie den offenen Betrag in den nächsten Tagen.\n\nMit freundlichen Grüßen\n{FIRMA}'
      }
    },
    smtp: { host: '', port: 587, user: '', pass: '', from: '' },
    bcc: ''
  }
};

module.exports = DEFAULT_SETTINGS;
