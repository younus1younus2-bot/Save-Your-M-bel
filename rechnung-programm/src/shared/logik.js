// Geschäftslogik – arbeitet auf einem „Speicher“ (SQLite auf dem Server, Browser-Speicher in der Test-Version).
// Alle Regeln für Nummern, Sperren, Storno, Buchungen und Aufträge stehen nur hier.
import DEFAULTS from './defaults.js';
import { berechne, deepMerge, heute, neueId, plusTage } from './rechnen.js';
import { fehler, pruefe, SAMMLUNGEN } from './schema.js';

// Felder, die nur die Logik selbst setzen darf
const GESCHUETZT = [
  'id',
  'gesperrt',
  'festgeschriebenAm',
  'summen',
  'bezahltAm',
  'storniertDurch',
  'storno',
  'bezugId',
  'bezugNummer',
  'bezugDatum',
  'geloescht',
  'erstellt',
  'erstelltVon',
  'geaendert',
  'geaendertVon',
  'verlauf'
];
// Bei gesperrten Rechnungen darf nur noch das geändert werden
const NACH_SPERRE_ERLAUBT = ['notiz'];
export const AUFTRAG_STATUS = ['anfrage', 'kv_versendet', 'zusage', 'termin', 'erledigt', 'rechnung', 'bezahlt'];
const SAMMLUNG_NAME = {
  kunden: 'Kunde',
  dokumente: 'Dokument',
  termine: 'Termin',
  buchungen: 'Buchung',
  mitarbeiter: 'Mitarbeiter',
  aufgaben: 'Aufgabe',
  auftraege: 'Auftrag',
  notizen: 'Notiz',
  dateien: 'Datei'
};

const docName = (d) => (d.storno ? 'Stornorechnung' : d.typ === 'rechnung' ? 'Rechnung' : 'Kostenvoranschlag') + (d.nummer ? ` ${d.nummer}` : ' (Entwurf)');
const ohne = (obj, felder) => Object.fromEntries(Object.entries(obj).filter(([k]) => !felder.includes(k)));

export function oeffentlicheEinstellungen(s) {
  const kopie = JSON.parse(JSON.stringify(s));
  if (kopie.email?.smtp) kopie.email.smtp.pass = kopie.email.smtp.pass ? '********' : '';
  delete kopie.geheim;
  return kopie;
}

export function erstelleLogik(store, { umgebung = {} } = {}) {
  const einstellungen = () => deepMerge(DEFAULTS, store.einstellungen() || {});
  const jetzt = () => new Date().toISOString();

  function protokolliere(ctx, aktion, sammlung, obj, text) {
    store.protokolliere({
      zeit: jetzt(),
      benutzer: ctx.benutzer?.name || 'System',
      aktion,
      sammlung,
      objektId: obj?.id || '',
      kundeId: sammlung === 'kunden' ? obj?.id : obj?.kundeId || '',
      text
    });
  }

  function hole(sammlung, id, { geloeschtOk = false } = {}) {
    const obj = store.hole(sammlung, id);
    if (!obj || (obj.geloescht && !geloeschtOk)) throw fehler(404, `${SAMMLUNG_NAME[sammlung] || 'Eintrag'} nicht gefunden`);
    return obj;
  }

  function nurChef(ctx) {
    if (ctx.benutzer?.rolle !== 'chef') throw fehler(403, 'Dafür fehlt die Berechtigung');
  }

  // ---------- Nummern ----------
  function naechsteNummer(typ) {
    const s = einstellungen();
    const cfg = s.nummern[typ];
    const vorhandene = new Set(
      store
        .alle('dokumente', { mitGeloeschten: true })
        .filter((d) => d.typ === typ && d.nummer)
        .map((d) => d.nummer)
    );
    let nummer;
    do {
      nummer = cfg.prefix.replace('{JAHR}', String(new Date().getFullYear())) + String(cfg.naechste).padStart(cfg.stellen || 1, '0');
      cfg.naechste += 1;
    } while (vorhandene.has(nummer));
    store.setzeEinstellungen(deepMerge(store.einstellungen() || {}, { nummern: { [typ]: { naechste: cfg.naechste } } }));
    return nummer;
  }

  function nummerFrei(typ, nummer, eigeneId) {
    return !store.alle('dokumente', { mitGeloeschten: true }).some((d) => d.typ === typ && d.nummer === nummer && d.id !== eigeneId);
  }

  // ---------- Aufträge (Board) ----------
  function abgeleiteterStatus(auftrag) {
    const docs = store.alle('dokumente').filter((d) => d.auftragId === auftrag.id && !d.storno);
    const termine = store.alle('termine').filter((t) => t.auftragId === auftrag.id && t.status !== 'abgesagt');
    const kvs = docs.filter((d) => d.typ === 'angebot');
    const rechnungen = docs.filter((d) => d.typ === 'rechnung' && d.status !== 'storniert');
    const offene = rechnungen.filter((d) => d.gesperrt);
    let status = 'anfrage';
    if (kvs.some((d) => d.status !== 'entwurf')) status = 'kv_versendet';
    if (kvs.some((d) => d.status === 'angenommen') || rechnungen.length) status = 'zusage';
    if (termine.length) status = 'termin';
    if (termine.length && termine.every((t) => t.status === 'erledigt' || t.datum < heute())) status = 'erledigt';
    if (offene.length) status = 'rechnung';
    if (offene.length && offene.every((d) => d.status === 'bezahlt')) status = 'bezahlt';
    return status;
  }

  function aktualisiereAuftrag(ctx, auftragId) {
    if (!auftragId) return;
    const a = store.hole('auftraege', auftragId);
    if (!a || a.geloescht || a.status === 'abgesagt') return;
    const neu = abgeleiteterStatus(a);
    // automatisch nur vorwärts; zurück geht es nur per Hand im Board
    if (AUFTRAG_STATUS.indexOf(neu) > AUFTRAG_STATUS.indexOf(a.status)) {
      store.schreibe('auftraege', { ...a, status: neu, geaendert: jetzt() });
    }
  }

  function auftragFuer(ctx, doc) {
    if (doc.auftragId && store.hole('auftraege', doc.auftragId)) return doc.auftragId;
    if (doc.storno) return '';
    const a = {
      id: neueId(),
      titel: [doc.kunde?.name || doc.kunde?.firma, doc.kategorie].filter(Boolean).join(' – ') || 'Neuer Auftrag',
      kundeId: doc.kundeId || '',
      kundeName: doc.kunde?.name || '',
      datum: doc.leistungsdatum || '',
      status: 'anfrage',
      erstellt: jetzt(),
      erstelltVon: ctx.benutzer?.name || ''
    };
    store.schreibe('auftraege', a);
    return a.id;
  }

  // ---------- Allgemeines Speichern ----------
  function speichere(ctx, sammlung, eingabe, id) {
    if (!SAMMLUNGEN.includes(sammlung)) throw fehler(404, 'Unbekannter Bereich');
    if (sammlung === 'dokumente') return speichereDokument(ctx, eingabe, id);
    if (sammlung === 'termine' && ctx.benutzer?.rolle === 'mitarbeiter') return terminStatusMitarbeiter(ctx, eingabe, id);
    nurChef(ctx);
    return store.transaktion(() => {
      const alt = id ? hole(sammlung, id) : null;
      if (alt && sammlung === 'buchungen' && alt.dokumentId) throw fehler(409, 'Diese Buchung gehört zu einer Rechnung und wird dort geändert.');
      const roh = { ...(alt || {}), ...ohne(eingabe || {}, GESCHUETZT) };
      const daten = pruefe(sammlung, roh);
      const obj = {
        ...daten,
        id: alt?.id || neueId(),
        erstellt: alt?.erstellt || jetzt(),
        erstelltVon: alt?.erstelltVon || ctx.benutzer?.name || '',
        geaendert: jetzt(),
        geaendertVon: ctx.benutzer?.name || ''
      };
      if (sammlung === 'kunden' && !obj.kundennummer) obj.kundennummer = naechsteKundennummer();
      if (sammlung === 'buchungen' && alt?.dokumentId) obj.dokumentId = alt.dokumentId;
      store.schreibe(sammlung, obj);
      if (!['notizen', 'dateien'].includes(sammlung) || !alt) {
        protokolliere(
          ctx,
          alt ? 'geändert' : 'angelegt',
          sammlung,
          obj,
          `${SAMMLUNG_NAME[sammlung]} ${alt ? 'geändert' : 'angelegt'}: ${obj.name || obj.titel || obj.beschreibung || obj.text?.slice(0, 60) || ''}`
        );
      }
      if (sammlung === 'termine') aktualisiereAuftrag(ctx, obj.auftragId);
      return obj;
    });
  }

  function naechsteKundennummer() {
    const max = store.alle('kunden', { mitGeloeschten: true }).reduce((m, k) => Math.max(m, parseInt(String(k.kundennummer || '').replace(/\D/g, ''), 10) || 0), 1000);
    return `K${max + 1}`;
  }

  // Mitarbeiter dürfen bei ihren Terminen nur den Status ändern (z. B. „erledigt“)
  function terminStatusMitarbeiter(ctx, eingabe, id) {
    return store.transaktion(() => {
      const t = hole('termine', id);
      if (!(t.mitarbeiterIds || []).includes(ctx.benutzer.mitarbeiterId)) throw fehler(403, 'Dieser Termin ist dir nicht zugeordnet');
      const status = pruefe('termine', { ...t, status: eingabe?.status }).status;
      const obj = { ...t, status, geaendert: jetzt(), geaendertVon: ctx.benutzer.name };
      store.schreibe('termine', obj);
      protokolliere(ctx, 'geändert', 'termine', obj, `Termin „${t.titel}“: Status ${status}`);
      aktualisiereAuftrag(ctx, obj.auftragId);
      return obj;
    });
  }

  // ---------- Dokumente ----------
  function speichereDokument(ctx, eingabe, id) {
    nurChef(ctx);
    return store.transaktion(() => {
      const alt = id ? hole('dokumente', id) : null;
      if (alt?.gesperrt) {
        const erlaubt = Object.fromEntries(Object.entries(eingabe || {}).filter(([k]) => NACH_SPERRE_ERLAUBT.includes(k)));
        const obj = { ...alt, ...erlaubt, geaendert: jetzt(), geaendertVon: ctx.benutzer?.name || '' };
        store.schreibe('dokumente', obj);
        return obj;
      }
      const roh = { ...(alt || {}), ...ohne(eingabe || {}, GESCHUETZT) };
      if (alt) roh.typ = alt.typ;
      const daten = pruefe('dokumente', roh);
      const s = einstellungen();
      const doc = {
        ...daten,
        id: alt?.id || neueId(),
        erstellt: alt?.erstellt || jetzt(),
        erstelltVon: alt?.erstelltVon || ctx.benutzer?.name || '',
        geaendert: jetzt(),
        geaendertVon: ctx.benutzer?.name || '',
        verlauf: alt?.verlauf || []
      };
      if (!doc.datum) doc.datum = heute();
      if (doc.typ === 'rechnung') {
        // Status einer Rechnung ändert sich nur über Aktionen (abschließen, bezahlt, storno)
        doc.status = 'entwurf';
        if (!doc.faelligAm) doc.faelligAm = plusTage(doc.datum, s.zahlungszielTage);
        if (doc.nummer && !nummerFrei('rechnung', doc.nummer, doc.id)) throw fehler(409, `Die Nummer ${doc.nummer} ist schon vergeben.`);
      } else {
        if (!['entwurf', 'offen', 'angenommen', 'abgelehnt'].includes(doc.status)) doc.status = 'entwurf';
        if (!doc.gueltigBis) doc.gueltigBis = plusTage(doc.datum, s.angebotGueltigTage);
        if (!doc.nummer) doc.nummer = naechsteNummer('angebot');
        else if (!nummerFrei('angebot', doc.nummer, doc.id)) throw fehler(409, `Die Nummer ${doc.nummer} ist schon vergeben.`);
      }
      doc.summen = berechne(doc).cent;
      doc.auftragId = auftragFuer(ctx, doc);
      store.schreibe('dokumente', doc);
      if (!alt) protokolliere(ctx, 'angelegt', 'dokumente', doc, `${docName(doc)} angelegt`);
      else if (alt.status !== doc.status) protokolliere(ctx, 'geändert', 'dokumente', doc, `${docName(doc)}: Status ${doc.status}`);
      aktualisiereAuftrag(ctx, doc.auftragId);
      return doc;
    });
  }

  function verlauf(doc, text) {
    return [...(doc.verlauf || []), { datum: heute(), text }];
  }

  // Rechnung festschreiben: Nummer vergeben und sperren (danach keine Änderungen mehr, nur Storno)
  function festschreiben(ctx, doc) {
    if (doc.typ !== 'rechnung' || doc.gesperrt) return doc;
    if (!doc.positionen?.length) throw fehler(400, 'Die Rechnung hat noch keine Positionen.');
    if (!doc.kunde?.name && !doc.kunde?.firma) throw fehler(400, 'Bitte zuerst einen Kunden eintragen.');
    const nummer = doc.nummer && nummerFrei('rechnung', doc.nummer, doc.id) ? doc.nummer : naechsteNummer('rechnung');
    const fest = {
      ...doc,
      nummer,
      status: 'offen',
      gesperrt: true,
      festgeschriebenAm: jetzt(),
      summen: berechne(doc).cent,
      leistungsdatum: doc.leistungsdatum || doc.datum,
      verlauf: verlauf(doc, `Abgeschlossen, Nummer ${nummer} vergeben`)
    };
    store.schreibe('dokumente', fest);
    protokolliere(ctx, 'abgeschlossen', 'dokumente', fest, `Rechnung ${nummer} abgeschlossen (${(fest.summen.brutto / 100).toFixed(2).replace('.', ',')} €)`);
    aktualisiereAuftrag(ctx, fest.auftragId);
    return fest;
  }

  function abschliessen(ctx, id) {
    nurChef(ctx);
    return store.transaktion(() => festschreiben(ctx, hole('dokumente', id)));
  }

  // Nach erfolgreichem Versand (E-Mail) oder wenn per Hand als versendet markiert
  function versendet(ctx, id, { an = '', art = '' } = {}) {
    nurChef(ctx);
    return store.transaktion(() => {
      let doc = hole('dokumente', id);
      if (doc.typ === 'rechnung') doc = festschreiben(ctx, doc);
      else if (doc.status === 'entwurf') doc = { ...doc, status: 'offen' };
      doc = { ...doc, verlauf: verlauf(doc, an ? `${art || 'Per E-Mail'} an ${an} gesendet` : 'Als versendet markiert'), zuletztVersendet: jetzt() };
      store.schreibe('dokumente', doc);
      protokolliere(ctx, 'versendet', 'dokumente', doc, `${docName(doc)} ${an ? `an ${an} ` : ''}versendet`);
      aktualisiereAuftrag(ctx, doc.auftragId);
      return doc;
    });
  }

  function bucheZahlung(ctx, doc, datum, vorzeichen = 1, text = '') {
    const buchung = {
      id: neueId(),
      datum,
      typ: 'einnahme',
      kategorie: doc.kategorie || 'Umzug',
      beschreibung: text || `${docName(doc)} – ${doc.kunde?.firma || doc.kunde?.name || ''}`,
      betrag: (vorzeichen * doc.summen.brutto) / 100,
      ust: (vorzeichen * doc.summen.ust) / 100,
      belegNr: doc.nummer,
      dokumentId: doc.id,
      kundeId: doc.kundeId || '',
      erstellt: jetzt(),
      erstelltVon: ctx.benutzer?.name || ''
    };
    store.schreibe('buchungen', buchung);
    return buchung;
  }

  // Zahlung erfassen: Rechnung festschreiben, Status bezahlt, Einnahme buchen – alles in einem Schritt
  function bezahlt(ctx, id, { datum } = {}) {
    nurChef(ctx);
    return store.transaktion(() => {
      let doc = hole('dokumente', id);
      if (doc.typ !== 'rechnung') throw fehler(400, 'Nur Rechnungen können bezahlt werden.');
      if (doc.status === 'bezahlt') return doc;
      if (doc.status === 'storniert' || doc.storno) throw fehler(409, 'Diese Rechnung ist storniert.');
      doc = festschreiben(ctx, doc);
      const am = /^\d{4}-\d{2}-\d{2}$/.test(datum || '') ? datum : heute();
      doc = { ...doc, status: 'bezahlt', bezahltAm: am, verlauf: verlauf(doc, `Als bezahlt markiert (${am.split('-').reverse().join('.')})`) };
      store.schreibe('dokumente', doc);
      bucheZahlung(ctx, doc, am);
      protokolliere(ctx, 'bezahlt', 'dokumente', doc, `Rechnung ${doc.nummer} bezahlt`);
      aktualisiereAuftrag(ctx, doc.auftragId);
      return doc;
    });
  }

  function zahlungZuruecknehmen(ctx, id) {
    nurChef(ctx);
    return store.transaktion(() => {
      let doc = hole('dokumente', id);
      if (doc.status !== 'bezahlt') throw fehler(409, 'Die Rechnung ist nicht als bezahlt markiert.');
      store
        .alle('buchungen')
        .filter((b) => b.dokumentId === doc.id)
        .forEach((b) => store.schreibe('buchungen', { ...b, geloescht: jetzt() }));
      doc = { ...doc, status: 'offen', bezahltAm: '', verlauf: verlauf(doc, 'Zahlung zurückgenommen') };
      store.schreibe('dokumente', doc);
      protokolliere(ctx, 'geändert', 'dokumente', doc, `Zahlung zu Rechnung ${doc.nummer} zurückgenommen`);
      return doc;
    });
  }

  // Storno: erzeugt eine Stornorechnung mit negativen Beträgen, die Originalrechnung bleibt unverändert erhalten
  function stornieren(ctx, id, { grund = '' } = {}) {
    nurChef(ctx);
    return store.transaktion(() => {
      const orig = hole('dokumente', id);
      if (orig.typ !== 'rechnung' || orig.storno) throw fehler(400, 'Nur Rechnungen können storniert werden.');
      if (!orig.gesperrt) throw fehler(409, 'Entwürfe werden nicht storniert, sondern gelöscht.');
      if (orig.status === 'storniert') throw fehler(409, 'Diese Rechnung ist bereits storniert.');
      const storno = {
        ...ohne(orig, ['id', 'nummer', 'verlauf', 'bezahltAm', 'zuletztVersendet']),
        id: neueId(),
        storno: true,
        bezugId: orig.id,
        bezugNummer: orig.nummer,
        bezugDatum: orig.datum,
        datum: heute(),
        titel: '',
        positionen: orig.positionen.map((p) => ({ ...p, menge: -Number(p.menge || 0) })),
        anzahlungProzent: 0,
        notiz: grund,
        status: 'entwurf',
        gesperrt: false,
        erstellt: jetzt(),
        erstelltVon: ctx.benutzer?.name || ''
      };
      storno.summen = berechne(storno).cent;
      let fest = festschreiben(ctx, storno);
      fest = { ...fest, status: 'storno', verlauf: verlauf(fest, `Storniert Rechnung ${orig.nummer}${grund ? ` (${grund})` : ''}`) };
      store.schreibe('dokumente', fest);
      const neuOrig = { ...orig, status: 'storniert', storniertDurch: fest.id, verlauf: verlauf(orig, `Storniert durch ${fest.nummer}${grund ? ` (${grund})` : ''}`) };
      store.schreibe('dokumente', neuOrig);
      // Wurde die Rechnung schon bezahlt, wird die Erstattung als negative Einnahme gebucht
      if (orig.status === 'bezahlt') bucheZahlung(ctx, fest, heute(), 1, `Erstattung zu Rechnung ${orig.nummer} (Storno ${fest.nummer})`);
      protokolliere(ctx, 'storniert', 'dokumente', neuOrig, `Rechnung ${orig.nummer} storniert durch ${fest.nummer}`);
      return { original: neuOrig, storno: fest };
    });
  }

  function umwandeln(ctx, id) {
    nurChef(ctx);
    return store.transaktion(() => {
      const kv = hole('dokumente', id);
      if (kv.typ !== 'angebot') throw fehler(400, 'Nur Kostenvoranschläge können umgewandelt werden.');
      const s = einstellungen();
      const r = speichereDokument(ctx, {
        typ: 'rechnung',
        kundeId: kv.kundeId,
        auftragId: kv.auftragId,
        kunde: { ...kv.kunde },
        leistungsdatum: kv.leistungsdatum,
        datum: heute(),
        betreff: (kv.betreff || '').replace(/Kostenvoranschlag/gi, 'Rechnung'),
        einleitung: kv.sprache === 'en' ? '' : s.texte.rechnungEinleitung,
        schlusstext: kv.sprache === 'en' ? s.texte.en.rechnungSchluss : s.texte.rechnungSchluss,
        positionen: JSON.parse(JSON.stringify(kv.positionen)),
        rabattProzent: kv.rabattProzent,
        steuerModus: kv.steuerModus,
        sprache: kv.sprache,
        kategorie: kv.kategorie,
        feldWerte: { ...(kv.feldWerte || {}) },
        extraFelder: JSON.parse(JSON.stringify(kv.extraFelder || [])),
        zeigeAnteil: kv.zeigeAnteil,
        ausAngebot: kv.nummer
      });
      const neuKv = { ...kv, status: 'angenommen', verlauf: verlauf(kv, 'In Rechnung umgewandelt'), geaendert: jetzt() };
      store.schreibe('dokumente', neuKv);
      aktualisiereAuftrag(ctx, kv.auftragId);
      return r;
    });
  }

  function duplizieren(ctx, id) {
    nurChef(ctx);
    const d = hole('dokumente', id);
    return speichereDokument(ctx, { ...ohne(d, [...GESCHUETZT, 'nummer', 'status', 'auftragId', 'zuletztVersendet', 'ausAngebot']), datum: heute(), faelligAm: '', gueltigBis: '' });
  }

  // ---------- Löschen (Papierkorb) und Wiederherstellen ----------
  function loeschen(ctx, sammlung, id) {
    nurChef(ctx);
    return store.transaktion(() => {
      const obj = hole(sammlung, id);
      if (sammlung === 'dokumente') {
        if (obj.gesperrt) throw fehler(409, 'Abgeschlossene Rechnungen können nicht gelöscht werden. Bitte stornieren.');
      }
      if (sammlung === 'buchungen' && obj.dokumentId) throw fehler(409, 'Diese Buchung gehört zu einer Rechnung. Bitte dort die Zahlung zurücknehmen.');
      const neu = { ...obj, geloescht: jetzt(), geloeschtVon: ctx.benutzer?.name || '' };
      store.schreibe(sammlung, neu);
      // Auftrag ohne weitere Dokumente oder Termine mit in den Papierkorb legen
      if (sammlung === 'dokumente' && obj.auftragId) {
        const rest = [...store.alle('dokumente'), ...store.alle('termine')].filter((x) => x.auftragId === obj.auftragId);
        const auftrag = store.hole('auftraege', obj.auftragId);
        if (!rest.length && auftrag && !auftrag.geloescht) store.schreibe('auftraege', { ...auftrag, geloescht: jetzt() });
      }
      protokolliere(ctx, 'gelöscht', sammlung, obj, `${sammlung === 'dokumente' ? docName(obj) : SAMMLUNG_NAME[sammlung]} gelöscht${obj.name || obj.titel ? `: ${obj.name || obj.titel}` : ''}`);
      return { ok: true };
    });
  }

  function wiederherstellen(ctx, sammlung, id) {
    nurChef(ctx);
    return store.transaktion(() => {
      const obj = hole(sammlung, id, { geloeschtOk: true });
      const neu = ohne(obj, ['geloescht', 'geloeschtVon']);
      store.schreibe(sammlung, neu);
      protokolliere(ctx, 'wiederhergestellt', sammlung, neu, `${SAMMLUNG_NAME[sammlung]} wiederhergestellt`);
      return neu;
    });
  }

  // ---------- Fotos (an Kunden, Aufträgen und Terminen) ----------
  const istMitarbeiter = (ctx) => ctx.benutzer?.rolle === 'mitarbeiter';
  const eigeneTermine = (ctx) => store.alle('termine').filter((t) => (t.mitarbeiterIds || []).includes(ctx.benutzer?.mitarbeiterId));

  // Mitarbeiter sehen nur Fotos ihrer eigenen Einsätze (am Termin oder am zugehörigen Auftrag)
  function darfFotoSehen(ctx, f) {
    if (ctx.benutzer?.rolle === 'chef') return true;
    if (!istMitarbeiter(ctx)) return false;
    return eigeneTermine(ctx).some((t) => f.terminId === t.id || (t.auftragId && f.auftragId === t.auftragId));
  }

  function fotoHochladen(ctx, eingabe) {
    if (!ctx.benutzer || !['chef', 'mitarbeiter'].includes(ctx.benutzer.rolle)) throw fehler(403, 'Dafür fehlt die Berechtigung');
    return store.transaktion(() => {
      const e = ohne(eingabe || {}, [...GESCHUETZT, 'erstelltVonId']);
      const termin = e.terminId ? hole('termine', e.terminId) : null;
      if (termin) {
        e.auftragId ||= termin.auftragId || '';
        e.kundeId ||= termin.kundeId || '';
      }
      const auftrag = e.auftragId ? hole('auftraege', e.auftragId) : null;
      if (auftrag) e.kundeId ||= auftrag.kundeId || '';
      if (e.kundeId) hole('kunden', e.kundeId);
      if (e.aufgabeId) e.kundeId ||= hole('aufgaben', e.aufgabeId).kundeId || '';
      if (e.dokumentId) e.kundeId ||= hole('dokumente', e.dokumentId).kundeId || '';
      if (e.buchungId) hole('buchungen', e.buchungId);
      if (e.mitarbeiterId) hole('mitarbeiter', e.mitarbeiterId);
      if (istMitarbeiter(ctx) && !(termin && (termin.mitarbeiterIds || []).includes(ctx.benutzer.mitarbeiterId))) {
        throw fehler(403, 'Fotos kannst du nur zu deinen eigenen Einsätzen hinzufügen');
      }
      const daten = pruefe('dateien', e);
      const obj = { ...daten, id: neueId(), erstellt: jetzt(), erstelltVon: ctx.benutzer.name || '', erstelltVonId: ctx.benutzer.id || '' };
      store.schreibe('dateien', obj);
      protokolliere(
        ctx,
        'angelegt',
        'dateien',
        obj,
        `${obj.typ === 'application/pdf' ? 'Datei' : 'Foto'} hinzugefügt${obj.beschreibung ? `: ${obj.beschreibung}` : ''}${auftrag ? ` (Auftrag „${auftrag.titel}“)` : ''}`
      );
      return ohne(obj, ['daten']);
    });
  }

  // Liste ohne große Bilddaten (nur Vorschaubild)
  function fotos(ctx, { kundeId, auftragId, terminId, aufgabeId, dokumentId, buchungId, mitarbeiterId } = {}) {
    const ohneBild = { ohne: ['daten'] };
    let liste = [];
    if (terminId) {
      const t = hole('termine', terminId);
      const ids = new Set();
      liste = [...store.finde('dateien', { terminId }, ohneBild), ...(t.auftragId ? store.finde('dateien', { auftragId: t.auftragId }, ohneBild) : [])].filter((f) => !ids.has(f.id) && ids.add(f.id));
    } else if (aufgabeId) liste = store.finde('dateien', { aufgabeId }, ohneBild);
    else if (dokumentId) liste = store.finde('dateien', { dokumentId }, ohneBild);
    else if (buchungId) liste = store.finde('dateien', { buchungId }, ohneBild);
    else if (mitarbeiterId) liste = store.finde('dateien', { mitarbeiterId }, ohneBild);
    else if (auftragId) liste = store.finde('dateien', { auftragId }, ohneBild);
    else if (kundeId) liste = store.finde('dateien', { kundeId }, ohneBild);
    else throw fehler(400, 'Bitte Kunde, Auftrag, Termin oder Aufgabe angeben');
    return liste.filter((f) => darfFotoSehen(ctx, f)).sort((a, b) => String(b.erstellt).localeCompare(String(a.erstellt)));
  }

  function foto(ctx, id) {
    const f = hole('dateien', id);
    if (!darfFotoSehen(ctx, f)) throw fehler(403, 'Dafür fehlt die Berechtigung');
    return f;
  }

  // Chef darf alle Fotos löschen, Mitarbeiter nur ihre eigenen
  function fotoLoeschen(ctx, id, wiederher = false) {
    return store.transaktion(() => {
      const f = hole('dateien', id, { geloeschtOk: wiederher });
      const erlaubt = ctx.benutzer?.rolle === 'chef' || (istMitarbeiter(ctx) && f.erstelltVonId && f.erstelltVonId === ctx.benutzer.id && darfFotoSehen(ctx, f));
      if (!erlaubt) throw fehler(403, 'Dieses Foto darfst du nicht löschen');
      const neu = wiederher ? ohne(f, ['geloescht', 'geloeschtVon']) : { ...f, geloescht: jetzt(), geloeschtVon: ctx.benutzer.name || '' };
      store.schreibe('dateien', neu);
      protokolliere(ctx, wiederher ? 'wiederhergestellt' : 'gelöscht', 'dateien', f, wiederher ? 'Foto wiederhergestellt' : 'Foto gelöscht');
      return wiederher ? ohne(neu, ['daten']) : { ok: true };
    });
  }

  // Anzahl Fotos je Auftrag, Termin und Aufgabe (für Kamera-Symbol auf Karten)
  function fotoAnzahl(termine) {
    const proAuftrag = store.zaehle('dateien', 'auftragId');
    const proTermin = store.zaehle('dateien', 'terminId');
    const termin = {};
    for (const t of termine) {
      const n = t.auftragId ? proAuftrag[t.auftragId] || 0 : proTermin[t.id] || 0;
      if (n) termin[t.id] = n;
    }
    return { auftrag: proAuftrag, termin, aufgabe: store.zaehle('dateien', 'aufgabeId'), dokument: store.zaehle('dateien', 'dokumentId'), buchung: store.zaehle('dateien', 'buchungId') };
  }

  // ---------- Mehrere auf einmal ----------
  function sammelBezahlt(ctx, ids, datum) {
    nurChef(ctx);
    const ergebnis = { ok: [], fehler: [] };
    for (const id of ids || []) {
      try {
        ergebnis.ok.push(bezahlt(ctx, id, { datum }));
      } catch (e) {
        ergebnis.fehler.push({ id, meldung: e.message });
      }
    }
    return ergebnis;
  }

  // ---------- Auftrag im Board verschieben ----------
  function auftragStatus(ctx, id, status) {
    nurChef(ctx);
    return speichere(ctx, 'auftraege', { status }, id);
  }

  // ---------- Daten für den Start ----------
  function daten(ctx) {
    const s = oeffentlicheEinstellungen(einstellungen());
    if (ctx.benutzer?.rolle === 'mitarbeiter') {
      const mid = ctx.benutzer.mitarbeiterId;
      return {
        settings: { firma: { name: s.firma.name, logo: s.firma.logo, logoHell: s.firma.logoHell }, design: s.design },
        mitarbeiter: store.alle('mitarbeiter').map((m) => ({ id: m.id, name: m.name, farbe: m.farbe, telefon: m.telefon })),
        termine: store.alle('termine').filter((t) => (t.mitarbeiterIds || []).includes(mid)),
        fotoAnzahl: { auftrag: {}, termin: fotoAnzahl(eigeneTermine(ctx)).termin, aufgabe: {} },
        kunden: [],
        dokumente: [],
        buchungen: [],
        aufgaben: [],
        auftraege: []
      };
    }
    const out = { settings: s };
    for (const c of ['kunden', 'dokumente', 'buchungen', 'mitarbeiter', 'termine', 'aufgaben', 'auftraege', 'notizen']) out[c] = store.alle(c);
    out.fotoAnzahl = fotoAnzahl(out.termine);
    return out;
  }

  function papierkorb(ctx) {
    nurChef(ctx);
    return SAMMLUNGEN.filter((c) => c !== 'dateien').flatMap((c) =>
      store
        .alle(c, { mitGeloeschten: true })
        .filter((x) => x.geloescht)
        .map((x) => ({ sammlung: c, id: x.id, name: x.name || x.titel || x.nummer || x.beschreibung || x.text?.slice(0, 60) || '', geloescht: x.geloescht }))
    );
  }

  function setzeEinstellungen(ctx, neu) {
    nurChef(ctx);
    const alt = store.einstellungen() || {};
    const daten = { ...(neu || {}) };
    delete daten.geheim;
    // unverändertes Passwort-Platzhalter nicht übernehmen
    if (daten.email?.smtp?.pass === '********') daten.email.smtp.pass = alt.email?.smtp?.pass || '';
    else if (daten.email?.smtp?.pass && umgebung.verschluessele) daten.email.smtp.pass = umgebung.verschluessele(daten.email.smtp.pass);
    const zusammen = deepMerge(DEFAULTS, { ...daten, geheim: alt.geheim });
    store.setzeEinstellungen(zusammen);
    protokolliere(ctx, 'geändert', 'einstellungen', { id: 'einstellungen' }, 'Einstellungen geändert');
    return oeffentlicheEinstellungen(zusammen);
  }

  return {
    einstellungen,
    setzeEinstellungen,
    daten,
    speichere,
    loeschen,
    wiederherstellen,
    papierkorb,
    abschliessen,
    versendet,
    bezahlt,
    zahlungZuruecknehmen,
    stornieren,
    umwandeln,
    duplizieren,
    sammelBezahlt,
    auftragStatus,
    hole,
    protokoll: (ctx, filter) => (nurChef(ctx), store.protokoll(filter)),
    fotoHochladen,
    fotos,
    foto,
    fotoLoeschen
  };
}
