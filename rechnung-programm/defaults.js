// Standard-Einstellungen (werden vom Server und von der Test-Version genutzt)
const DEFAULT_SETTINGS = {
  firma: {
    name: 'Save Your Möbel',
    vorname: 'Hamam',
    nachname: 'Al Hariri',
    strasse: 'Christrosenweg 56',
    plz: '51143',
    ort: 'Köln',
    telefon: '(+49) 0174 9585385',
    email: 'info@saveyourmöbel.de',
    web: 'www.saveyourmobel.de',
    steuernummer: '',
    ustId: '',
    kontoinhaber: 'Hamam Al Hariri',
    bank: '',
    iban: '',
    bic: '',
    // Logo für helle Flächen und helle Variante für den dunklen Kopfbereich der Rechnung
    logo: 'img/logo.png',
    logoHell: 'img/logo-hell.png'
  },
  steuer: {
    modus: 'klein', // 'klein' = Kleinunternehmer §19 UStG, 'regel' = mit Umsatzsteuer
    satz: 19
  },
  design: {
    vorlage: 'saveyourmoebel', // 'saveyourmoebel' (wie Canva-Vorlage) oder 'modern'
    farbe: '#E53935',
    kopf: '#2B2B2B',
    akzent: '#1F1F1F',
    schrift: 'Aileron'
  },
  nummern: {
    rechnung: { prefix: 'HA', naechste: 4, stellen: 2 },
    angebot: { prefix: 'KV', naechste: 1, stellen: 2 }
  },
  zahlungszielTage: 14,
  angebotGueltigTage: 30,
  texte: {
    rechnungEinleitung: '',
    rechnungSchluss: 'Bitte überweisen Sie den Betrag bis zum {FAELLIG} unter Angabe der Rechnungsnummer {NUMMER}.\nVielen Dank für Ihren Auftrag!',
    angebotEinleitung: '',
    angebotSchluss: 'Wir freuen uns auf Ihren Auftrag',
    kleinunternehmer: 'Gemäß § 19 UStG wurde auf eine Berechnung von Umsatzsteuer verzichtet'
  },
  eigeneFelder: [
    { id: 'f_auszug', label: 'Auszugsadresse', fuer: 'beide' },
    { id: 'f_einzug', label: 'Einzugsadresse', fuer: 'beide' }
  ],
  einheiten: ['Pauschal', 'Std.', 'Stk.', 'm³', 'km', 'Tag', 'Helfer'],
  kategorienAusgaben: ['Fahrzeug / Miete', 'Kraftstoff', 'Löhne / Aushilfen', 'Verpackungsmaterial', 'Versicherung', 'Werbung', 'Büro / Telefon', 'Werkzeug', 'Sonstiges'],
  kategorienEinnahmen: ['Umzug', 'Entrümpelung', 'Montage', 'Sonstiges'],
  artikel: [
    { beschreibung: 'Anfahrt', einheit: 'Pauschal', preis: 40 },
    { beschreibung: 'Transportpauschale (inkl. Fahrzeug & Logistik)', einheit: 'Pauschal', preis: 500 },
    { beschreibung: 'Beladung', einheit: 'Pauschal', preis: 200 },
    { beschreibung: 'Entladung', einheit: 'Pauschal', preis: 200 },
    { beschreibung: 'Verpackungsmaterial', einheit: 'Pauschal', preis: 40 },
    { beschreibung: 'Möbel-Demontage / Montage', einheit: 'Std.', preis: 40 },
    { beschreibung: 'Umzugshelfer', einheit: 'Std.', preis: 35 },
    { beschreibung: 'Entrümpelung inkl. Entsorgung', einheit: 'm³', preis: 45 }
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
