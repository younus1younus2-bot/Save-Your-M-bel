// Automatische Erinnerungen („Das solltest du heute erledigen“) aus den vorhandenen Daten
import { datum, heute, plusTage, tageZwischen } from './rechnen.js';

export function erinnerungen(d, settings) {
  const h = heute();
  const morgen = plusTage(h, 1);
  const cfg = settings.erinnerungen || {};
  const liste = [];
  const name = (doc) => doc.kunde?.firma || doc.kunde?.name || 'Kunde';

  for (const doc of d.dokumente || []) {
    if (doc.typ === 'angebot' && doc.status === 'offen') {
      const seit = (doc.zuletztVersendet || doc.datum || '').slice(0, 10);
      const tage = seit ? tageZwischen(seit, h) : 0;
      if (tage >= (cfg.kvNachfassenTage ?? 7))
        liste.push({ art: 'nachfassen', prio: 2, text: `Kostenvoranschlag ${doc.nummer} an ${name(doc)} seit ${tage} Tagen ohne Antwort – nachfassen?`, link: `#/dokument/${doc.id}` });
    }
    if (doc.typ === 'rechnung' && doc.status === 'offen' && !doc.storno && doc.faelligAm && doc.faelligAm < h) {
      const tage = tageZwischen(doc.faelligAm, h);
      if (tage >= (cfg.ueberfaelligTage ?? 0))
        liste.push({ art: 'ueberfaellig', prio: 1, text: `Rechnung ${doc.nummer} (${name(doc)}) seit ${tage} Tag${tage === 1 ? '' : 'en'} überfällig`, link: `#/dokument/${doc.id}` });
    }
    if (doc.typ === 'rechnung' && doc.status === 'entwurf' && !doc.gesperrt) {
      const tage = tageZwischen((doc.erstellt || doc.datum || h).slice(0, 10), h);
      if (tage >= (cfg.entwurfAlterTage ?? 3)) liste.push({ art: 'entwurf', prio: 3, text: `Rechnungsentwurf für ${name(doc)} seit ${tage} Tagen nicht abgeschlossen`, link: `#/dokument/${doc.id}` });
    }
  }

  for (const t of d.termine || []) {
    if (t.status === 'abgesagt' || t.status === 'erledigt') continue;
    if (t.datum === morgen)
      liste.push({ art: 'morgen', prio: 2, text: `Morgen${t.von ? ` ${t.von} Uhr` : ''}: ${t.titel || t.kundeName || 'Einsatz'} – Team informiert, Halteverbot, Fahrzeug?`, link: '#/kalender' });
    if (t.datum >= h && t.datum <= plusTage(h, 7) && !(t.mitarbeiterIds || []).length)
      liste.push({ art: 'team', prio: 2, text: `Einsatz am ${datum(t.datum)} (${t.titel || t.kundeName || 'Termin'}) hat noch kein Team`, link: '#/kalender' });
  }

  // Umzug erledigt, aber noch keine Rechnung
  for (const a of d.auftraege || []) {
    if (a.status === 'erledigt') liste.push({ art: 'rechnung', prio: 2, text: `Auftrag „${a.titel}“ ist erledigt – Rechnung schreiben`, link: '#/auftraege' });
  }

  for (const a of d.aufgaben || []) {
    if (!a.erledigt && a.faellig && a.faellig <= h) liste.push({ art: 'aufgabe', prio: a.faellig < h ? 1 : 2, text: a.titel, link: '#/aufgaben', aufgabeId: a.id, faellig: a.faellig });
  }

  return liste.sort((a, b) => a.prio - b.prio);
}
