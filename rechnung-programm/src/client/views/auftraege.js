// Auftrags-Board: jeder Umzug als Karte, per Drag & Drop durch die Phasen
import { berechne, datum, esc, euro, heute, plusTage } from '../../shared/rechnen.js';
import { S, api, ladeAlles, loescheMitRueckgaengig, speichere } from '../state.js';
import { AUFTRAG_SPALTEN, docTitel, main, statusBadge } from '../helfer.js';
import { $, $$, dauerMerker, merker, modal, tipp, toast } from '../ui.js';
import { dateiVormerken, fotoBereich, fotoZahl } from '../fotos.js';
import { terminDialog } from './kalender.js';

const zugehoerig = (a) => ({
  docs: S.dokumente.filter((d) => d.auftragId === a.id),
  termine: S.termine.filter((t) => t.auftragId === a.id)
});

function auftragBetrag(a) {
  const { docs } = zugehoerig(a);
  const r = docs.filter((d) => d.typ === 'rechnung' && !d.storno && d.status !== 'storniert');
  const quelle = r.length ? r : docs.filter((d) => d.typ === 'angebot');
  return quelle.length ? berechne(quelle[quelle.length - 1]).brutto : 0;
}

export function viewAuftraege() {
  const zeigeAlteBezahlte = dauerMerker.get('board-alle-bezahlt', false);
  main().innerHTML = `
    <div class="seiten-kopf">
      <h1>Aufträge</h1>
      <div class="btn-gruppe">
        <label class="checkbox"><input type="checkbox" id="b-alle" ${zeigeAlteBezahlte ? 'checked' : ''}> Ältere bezahlte zeigen</label>
        <button class="btn btn-primaer" id="a-neu" type="button">+ Neue Anfrage</button>
      </div>
    </div>
    ${tipp('board', 'Jeder Umzug ist eine Karte. Sie wandert automatisch weiter (Kostenvoranschlag verschickt → Zusage → Termin → Rechnung → bezahlt). Du kannst Karten auch mit der Maus verschieben.')}
    <div class="board" id="board"></div>`;

  const zeichne = () => {
    if (!$('#board')) return;
    const grenze = plusTage(heute(), -30);
    $('#board').innerHTML = AUFTRAG_SPALTEN.map(([status, titel]) => {
      let karten = S.auftraege.filter((a) => a.status === status);
      if (status === 'bezahlt' && !zeigeAlteBezahlte) karten = karten.filter((a) => (a.geaendert || a.erstellt || '').slice(0, 10) >= grenze);
      karten.sort((a, b) => (a.datum || '9999').localeCompare(b.datum || '9999'));
      const summe = karten.reduce((x, a) => x + auftragBetrag(a), 0);
      return `<section class="board-spalte" data-status="${status}" aria-label="${esc(titel)}">
        <header><b>${esc(titel)}</b><span class="board-zahl">${karten.length}</span>${summe ? `<small>${euro(summe)}</small>` : ''}</header>
        <div class="board-karten" data-drop="${status}">
          ${
            karten
              .map((a) => {
                const { termine } = zugehoerig(a);
                const naechster = termine.filter((t) => t.status !== 'abgesagt').sort((x, y) => x.datum.localeCompare(y.datum))[0];
                const betrag = auftragBetrag(a);
                return `<article class="board-karte karte-klick" draggable="true" tabindex="0" data-a="${a.id}">
                <b>${esc(a.titel)}</b>
                ${naechster || a.datum ? `<small>📅 ${datum(naechster?.datum || a.datum)}${naechster?.von ? ` ${esc(naechster.von)}` : ''}</small>` : ''}
                <div class="board-fuss">${betrag ? `<span>${euro(betrag)}</span>` : '<span></span>'}<span>${fotoZahl(S.fotoAnzahl.auftrag[a.id])}${a.quelle === 'website' ? ` <span title="Anfrage über die Website${a.webQuelle ? ` (${esc(a.webQuelle)})` : ''}">🌐</span>` : ''}${a.notiz ? ' <span title="Notiz">📝</span>' : ''}</span></div>
              </article>`;
              })
              .join('') || '<div class="board-leer">–</div>'
          }
        </div>
      </section>`;
    }).join('');

    $$('.board-karte').forEach((el) => {
      el.onclick = () =>
        auftragDialog(
          S.auftraege.find((a) => a.id === el.dataset.a),
          zeichne
        );
      el.addEventListener('dragstart', (e) => (e.dataTransfer.setData('text/plain', el.dataset.a), el.classList.add('zieht')));
      el.addEventListener('dragend', () => el.classList.remove('zieht'));
    });
    $$('[data-drop]').forEach((ziel) => {
      ziel.addEventListener('dragover', (e) => (e.preventDefault(), ziel.classList.add('drop-ziel')));
      ziel.addEventListener('dragleave', () => ziel.classList.remove('drop-ziel'));
      ziel.addEventListener('drop', async (e) => {
        e.preventDefault();
        ziel.classList.remove('drop-ziel');
        const a = S.auftraege.find((x) => x.id === e.dataTransfer.getData('text/plain'));
        if (!a || a.status === ziel.dataset.drop) return;
        await verschiebe(a, ziel.dataset.drop, zeichne);
      });
    });
  };

  $('#b-alle').onchange = (e) => {
    dauerMerker.set('board-alle-bezahlt', e.target.checked);
    viewAuftraege();
  };
  $('#a-neu').onclick = () => auftragDialog({ status: 'anfrage' }, zeichne);
  zeichne();
}

async function verschiebe(a, status, fertig) {
  const alt = a.status;
  try {
    Object.assign(a, await api('POST', `/api/auftraege/${a.id}/status`, { status }));
    fertig();
    toast(`„${a.titel}“ → ${AUFTRAG_SPALTEN.find(([s]) => s === status)?.[1] || status}`, 'ok', {
      aktion: 'Rückgängig',
      beiAktion: async () => (Object.assign(a, await api('POST', `/api/auftraege/${a.id}/status`, { status: alt })), fertig())
    });
  } catch (e) {
    toast(e.message, 'fehler');
  }
}

export function auftragDialog(a, fertig = () => {}) {
  const neu = !a.id;
  const { docs, termine } = neu ? { docs: [], termine: [] } : zugehoerig(a);
  const { el, close } = modal(
    neu ? 'Neue Anfrage' : a.titel,
    `
    <form class="formular" id="a-form">
      <div class="raster-2">
        <label class="span-2">Titel<input id="a-titel" required value="${esc(a.titel || '')}" placeholder="z. B. Umzug Familie Wagner, 3 Zimmer"></label>
        <label>Kunde<select id="a-kunde"><option value="">– ohne / später –</option>${S.kunden
          .slice()
          .sort((x, y) => x.name.localeCompare(y.name))
          .map((k) => `<option value="${k.id}" ${k.id === a.kundeId ? 'selected' : ''}>${esc(k.name)}</option>`)
          .join('')}</select></label>
        <label>Wunschtermin<input type="date" id="a-datum" value="${esc(a.datum || '')}"></label>
        <label>Phase<select id="a-status">${[...AUFTRAG_SPALTEN, ['abgesagt', 'Abgesagt']].map(([s, t]) => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="span-2">Notiz<textarea id="a-notiz" rows="3" placeholder="z. B. Anfrage per Telefon, Wohnung 3. OG, Klavier">${esc(a.notiz || '')}</textarea></label>
      </div>
      ${
        neu
          ? '<h4>Fotos & Dateien</h4><div id="a-vormerk"></div>'
          : `<h4>Dokumente</h4>${docs.length ? `<ul class="termin-liste">${docs.map((d) => `<li><a href="#/dokument/${d.id}" data-zu>${esc(docTitel(d))}</a> ${statusBadge(d)} <small>${euro(berechne(d).brutto)}</small></li>`).join('')}</ul>` : '<p class="hilfe">Noch keine Dokumente.</p>'}
      <h4>Termine</h4>${termine.length ? `<ul class="termin-liste">${termine.map((t) => `<li><button type="button" class="link-knopf" data-termin="${t.id}">${datum(t.datum)} ${esc(t.von || '')} – ${esc(t.titel || '')}</button> <small>${esc(t.status || '')}</small></li>`).join('')}</ul>` : '<p class="hilfe">Noch keine Termine.</p>'}
      <h4>Fotos & Dateien</h4><p class="hilfe">Deine Mitarbeiter sehen diese Fotos und Dateien bei ihren Einsätzen zu diesem Auftrag.</p><div id="a-fotos"></div>
      <div class="btn-gruppe"><button class="btn btn-klein" type="button" data-neu="angebot">+ Kostenvoranschlag</button><button class="btn btn-klein" type="button" data-neu="rechnung">+ Rechnung</button><button class="btn btn-klein" type="button" id="a-termin">+ Termin</button></div>`
      }
      <div class="btn-gruppe rechts">
        ${neu ? '' : '<button class="btn rot" type="button" id="a-del">Löschen</button>'}
        <button class="btn btn-primaer" type="submit">Speichern</button>
      </div>
    </form>`
  );
  const vorgemerkt = neu ? dateiVormerken($('#a-vormerk', el)) : null;
  if ($('#a-fotos', el))
    fotoBereich($('#a-fotos', el), { abfrage: { auftragId: a.id }, leerText: 'Noch keine Fotos – z. B. von der Besichtigung, besonderen Möbeln oder dem Treppenhaus.', beiAenderung: fertig });
  const werte = () => {
    const k = S.kunden.find((x) => x.id === $('#a-kunde', el).value);
    return { ...a, titel: $('#a-titel', el).value, kundeId: k?.id || '', kundeName: k?.name || '', datum: $('#a-datum', el).value, status: $('#a-status', el).value, notiz: $('#a-notiz', el).value };
  };
  $('#a-form', el).onsubmit = async (e) => {
    e.preventDefault();
    try {
      const gespeichert = await speichere('auftraege', werte());
      await vorgemerkt?.hochladen({ auftragId: gespeichert.id });
      toast('Gespeichert');
      close();
      fertig();
    } catch (err) {
      toast(err.message, 'fehler');
    }
  };
  $$('[data-zu]', el).forEach((x) => (x.onclick = close));
  $$('[data-neu]', el).forEach(
    (b) =>
      (b.onclick = async () => {
        const gespeichert = await speichere('auftraege', werte());
        merker.set('vorAuftrag', gespeichert.id);
        if (gespeichert.kundeId) merker.set('vorKunde', gespeichert.kundeId);
        close();
        location.hash = `#/neu/${b.dataset.neu}`;
      })
  );
  $$('[data-termin]', el).forEach(
    (b) =>
      (b.onclick = () => (
        close(),
        terminDialog(
          S.termine.find((t) => t.id === b.dataset.termin),
          fertig
        )
      ))
  );
  if ($('#a-termin', el))
    $('#a-termin', el).onclick = async () => {
      const g = await speichere('auftraege', werte());
      const k = S.kunden.find((x) => x.id === g.kundeId);
      close();
      terminDialog(
        {
          datum: g.datum || heute(),
          titel: g.titel,
          auftragId: g.id,
          kundeId: g.kundeId,
          kundeName: g.kundeName,
          telefon: k?.telefon || '',
          vonAdresse: k ? [k.strasse, [k.plz, k.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ') : ''
        },
        async () => (await ladeAlles(), fertig())
      );
    };
  if ($('#a-del', el))
    $('#a-del', el).onclick = async () => {
      close();
      await loescheMitRueckgaengig('auftraege', a.id, 'Auftrag gelöscht', fertig);
    };
}
