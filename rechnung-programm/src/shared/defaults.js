// Standard-Einstellungen (werden vom Server und von der Test-Version genutzt)
const DEFAULT_SETTINGS = {
  sprache: 'de',
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
    kleinunternehmer: 'Gemäß § 19 UStG wurde auf eine Berechnung von Umsatzsteuer verzichtet',
    // Englische Fassung für internationale Kunden
    en: {
      rechnungSchluss: 'Please transfer the amount by {FAELLIG}, quoting invoice number {NUMMER}.\nThank you for your business!',
      angebotSchluss: 'We look forward to your order',
      kleinunternehmer: 'No VAT is charged in accordance with § 19 UStG (German small business regulation)'
    }
  },
  // Vorlagen für typische Umzüge (füllen alle Positionen mit einem Klick)
  umzugsvorlagen: [
    {
      name: '1-Zimmer-Wohnung',
      positionen: [
        { beschreibung: 'Anfahrt', menge: 1, einheit: 'Pauschal', preis: 40 },
        { beschreibung: 'Transportpauschale (inkl. Fahrzeug & Logistik)', menge: 1, einheit: 'Pauschal', preis: 300 },
        { beschreibung: 'Beladung', menge: 1, einheit: 'Pauschal', preis: 120 },
        { beschreibung: 'Entladung', menge: 1, einheit: 'Pauschal', preis: 120 }
      ]
    },
    {
      name: '3-Zimmer-Wohnung mit Montage',
      positionen: [
        { beschreibung: 'Anfahrt', menge: 1, einheit: 'Pauschal', preis: 40 },
        { beschreibung: 'Transportpauschale (inkl. Fahrzeug & Logistik)', menge: 1, einheit: 'Pauschal', preis: 700 },
        { beschreibung: 'Beladung', menge: 1, einheit: 'Pauschal', preis: 300 },
        { beschreibung: 'Entladung', menge: 1, einheit: 'Pauschal', preis: 300 },
        { beschreibung: 'Möbel-Demontage / Montage', menge: 4, einheit: 'Std.', preis: 40 },
        { beschreibung: 'Verpackungsmaterial', menge: 1, einheit: 'Pauschal', preis: 60 }
      ]
    },
    {
      name: 'Büroumzug',
      positionen: [
        { beschreibung: 'Anfahrt', menge: 1, einheit: 'Pauschal', preis: 40 },
        { beschreibung: 'Transportpauschale (inkl. Fahrzeug & Logistik)', menge: 1, einheit: 'Pauschal', preis: 900 },
        { beschreibung: 'Beladung', menge: 1, einheit: 'Pauschal', preis: 400 },
        { beschreibung: 'Entladung', menge: 1, einheit: 'Pauschal', preis: 400 },
        { beschreibung: 'Möbel-Demontage / Montage', menge: 6, einheit: 'Std.', preis: 40 },
        { beschreibung: 'Verpackungsmaterial', menge: 1, einheit: 'Pauschal', preis: 120 }
      ]
    },
    {
      name: 'Entrümpelung Keller',
      positionen: [
        { beschreibung: 'Anfahrt', menge: 1, einheit: 'Pauschal', preis: 40 },
        { beschreibung: 'Entrümpelung inkl. Entsorgung', menge: 8, einheit: 'm³', preis: 45 }
      ]
    }
  ],
  // Fertige Sätze zum Einfügen in Texte und Beschreibungen
  textbausteine: [
    'Die Halteverbotszone wird von uns beantragt.',
    'Klavier-Transport inklusive.',
    'Wartezeiten werden mit 35 € pro Stunde berechnet.',
    'Möbelschutz (Decken und Folie) ist im Preis enthalten.',
    'Die Anzahlung ist bei Auftragserteilung fällig, der Restbetrag nach dem Umzug.'
  ],
  preisProKm: 1.5,
  erinnerungen: {
    kvNachfassenTage: 7,
    entwurfAlterTage: 3,
    ueberfaelligTage: 0
  },
  sicherung: {
    email: '', // tägliche Sicherung per E-Mail an diese Adresse
    uhrzeit: 2
  },
  // Verbindung zur Website: Anfragen landen als Auftrag im Portal, Besucher-Statistik
  website: {
    url: '', // z. B. https://www.saveyourmobel.de (für Tracking-Links)
    anfrageMail: true // bei neuer Website-Anfrage zusätzlich eine E-Mail an die Firmenadresse
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

export default DEFAULT_SETTINGS;
