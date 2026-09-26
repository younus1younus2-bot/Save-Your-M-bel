// Eingabeprüfung für alle Datensätze (Server und Test-Version nutzen dieselben Regeln)
import { z } from 'zod';
import { parseZahl } from './rechnen.js';

const text = (max = 500) => z.string().max(max, `Höchstens ${max} Zeichen`).optional().default('');
const zahl = z.union([z.number(), z.string()]).transform((v) => parseZahl(v));
const datum = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum im Format JJJJ-MM-TT')
  .or(z.literal(''))
  .optional()
  .default('');
const pflichtDatum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Bitte ein Datum wählen');
const uhrzeit = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Uhrzeit im Format HH:MM')
  .or(z.literal(''))
  .optional()
  .default('');
const email = z
  .string()
  .max(200)
  .optional()
  .default('')
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Bitte die E-Mail-Adresse prüfen');
const farbe = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Farbe als #RRGGBB')
  .optional()
  .default('#E53935');

const kundeDaten = z
  .object({
    name: text(200),
    firma: text(200),
    strasse: text(200),
    plz: text(20),
    ort: text(100),
    email,
    telefon: text(60),
    kundennummer: text(40)
  })
  .passthrough();

const position = z.object({
  beschreibung: text(2000),
  menge: zahl.default(1),
  einheit: text(40),
  preis: zahl.default(0),
  ustSatz: zahl.optional()
});

export const SCHEMAS = {
  kunden: kundeDaten.extend({
    name: z.string().trim().min(1, 'Bitte einen Namen eingeben').max(200),
    sprache: z.enum(['de', 'en']).optional().default('de'),
    notiz: text(5000)
  }),
  dokumente: z
    .object({
      typ: z.enum(['rechnung', 'angebot']),
      kundeId: text(40),
      auftragId: text(40),
      kunde: kundeDaten.optional().default({}),
      positionen: z.array(position).max(300, 'Höchstens 300 Positionen').default([]),
      datum,
      leistungsdatum: datum,
      faelligAm: datum,
      gueltigBis: datum,
      rabattProzent: zahl.optional().default(0),
      anzahlungProzent: zahl.optional().default(0),
      steuerModus: z.enum(['klein', 'regel']).default('klein'),
      sprache: z.enum(['de', 'en']).optional().default('de'),
      betreff: text(300),
      titel: text(100),
      einleitung: text(5000),
      schlusstext: text(5000),
      notiz: text(5000),
      kategorie: text(100),
      nummer: text(40)
    })
    .passthrough(),
  termine: z
    .object({
      datum: pflichtDatum,
      von: uhrzeit,
      bis: uhrzeit,
      titel: text(200),
      kundeName: text(200),
      telefon: text(60),
      vonAdresse: text(300),
      nachAdresse: text(300),
      fahrzeug: text(100),
      notiz: text(5000),
      status: z.enum(['geplant', 'bestätigt', 'erledigt', 'abgesagt']).optional().default('geplant'),
      mitarbeiterIds: z.array(z.string().max(40)).max(50).default([])
    })
    .passthrough(),
  buchungen: z
    .object({
      datum: pflichtDatum,
      typ: z.enum(['einnahme', 'ausgabe']),
      betrag: zahl.refine((v) => v !== 0, 'Bitte einen Betrag eingeben'),
      ust: zahl.optional().default(0),
      kategorie: text(100),
      beschreibung: text(500),
      belegNr: text(60),
      notiz: text(5000)
    })
    .passthrough(),
  mitarbeiter: z
    .object({
      name: z.string().trim().min(1, 'Bitte einen Namen eingeben').max(100),
      farbe,
      telefon: text(60),
      email,
      rolle: text(60),
      stundenlohn: zahl.optional().default(0),
      notiz: text(5000)
    })
    .passthrough(),
  aufgaben: z
    .object({
      titel: z.string().trim().min(1, 'Bitte einen Titel eingeben').max(300),
      faellig: datum,
      erledigt: z.boolean().optional().default(false),
      notiz: text(5000),
      kundeId: text(40),
      auftragId: text(40)
    })
    .passthrough(),
  auftraege: z
    .object({
      titel: z.string().trim().min(1, 'Bitte einen Titel eingeben').max(200),
      status: z.enum(['anfrage', 'kv_versendet', 'zusage', 'termin', 'erledigt', 'rechnung', 'bezahlt', 'abgesagt']).default('anfrage'),
      kundeId: text(40),
      kundeName: text(200),
      datum,
      notiz: text(5000)
    })
    .passthrough(),
  notizen: z
    .object({
      kundeId: z.string().min(1).max(40),
      text: z.string().trim().min(1, 'Bitte einen Text eingeben').max(5000)
    })
    .passthrough(),
  dateien: z
    .object({
      kundeId: text(40),
      auftragId: text(40),
      terminId: text(40),
      aufgabeId: text(40),
      dokumentId: text(40),
      buchungId: text(40),
      mitarbeiterId: text(40),
      name: text(200),
      beschreibung: text(300),
      typ: z.string().regex(/^(image\/(png|jpeg|webp)|application\/pdf)$/, 'Nur Bilder (PNG, JPG, WebP) und PDF'),
      daten: z
        .string()
        .max(7_200_000, 'Die Datei ist zu groß (höchstens 5 MB)')
        .regex(/^data:(image\/|application\/pdf)/, 'Ungültige Datei'),
      vorschau: z.string().max(400_000, 'Vorschaubild ist zu groß').startsWith('data:image/', 'Ungültiges Vorschaubild').optional()
    })
    .passthrough()
    .refine((d) => d.kundeId || d.auftragId || d.terminId || d.aufgabeId || d.dokumentId || d.buchungId || d.mitarbeiterId, 'Die Datei braucht einen Kunden, Auftrag, Termin oder eine Aufgabe')
};

export const SAMMLUNGEN = Object.keys(SCHEMAS);

// Prüft Daten und liefert eine verständliche Fehlermeldung
export function pruefe(sammlung, daten) {
  const schema = SCHEMAS[sammlung];
  if (!schema) throw fehler(404, 'Unbekannter Bereich');
  const r = schema.safeParse(daten || {});
  if (!r.success) {
    const f = r.error.issues[0];
    throw fehler(400, `${f.path.join('.') ? `${feldName(f.path)}: ` : ''}${f.message}`);
  }
  return r.data;
}

const FELDNAMEN = { name: 'Name', email: 'E-Mail', datum: 'Datum', betrag: 'Betrag', titel: 'Titel', positionen: 'Positionen', typ: 'Typ', text: 'Text' };
const feldName = (pfad) => FELDNAMEN[pfad[pfad.length - 1]] || pfad.join('.');

export function fehler(status, meldung) {
  const e = new Error(meldung);
  e.status = status;
  return e;
}
