// Übergabe-Protokoll: Fotos vor und nach dem Umzug, Beschriftung (auch automatisch), AGB, Unterschrift von Kunde und Mitarbeiter, PDF
import backend from 'backend';
import { datum, esc } from '../../shared/rechnen.js';
import { PHASE_TEXT, ZUSTAND_TEXT, renderUebergabe, uebergabeDateiname } from '../../shared/vorlagen.js';
import { S, api, istChef } from '../state.js';
import { main } from '../helfer.js';
import { $, $$, bestaetigen, bildVerkleinern, dauerMerker, toast } from '../ui.js';

const RAEUME = ['Wohnzimmer', 'Schlafzimmer', 'Kinderzimmer', 'Küche', 'Bad', 'Flur', 'Arbeitszimmer', 'Esszimmer', 'Keller', 'Dachboden', 'Garage', 'Balkon', 'Treppenhaus', 'LKW', 'Draußen', 'Büro'];
const ZUSTAENDE = { vorher: ['einwandfrei', 'gebrauchsspuren', 'vorschaden'], nachher: ['einwandfrei', 'gebrauchsspuren', 'vorschaden', 'neuer-schaden'] };
const zeit = (iso) => new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Unterschriftenfeld auf einem Canvas (Finger, Stift oder Maus)
function unterschriftFeld(canvas) {
  const ctx = canvas.getContext('2d');
  let striche = 0;
  let malt = false;
  const groesse = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111';
    striche = 0;
  };
  const punkt = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    malt = true;
    ctx.beginPath();
    ctx.moveTo(...punkt(e));
    ctx.lineTo(...punkt(e));
    ctx.stroke();
    striche++;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!malt) return;
    ctx.lineTo(...punkt(e));
    ctx.stroke();
  });
  const ende = () => (malt = false);
  canvas.addEventListener('pointerup', ende);
  canvas.addEventListener('pointercancel', ende);
  requestAnimationFrame(groesse);
  return {
    leer: () => striche === 0,
    leeren: groesse,
    // feste Größe für das Protokoll (klein genug für die Datenbank)
    bild() {
      const c = document.createElement('canvas');
      c.width = 600;
      c.height = Math.round((600 * canvas.height) / canvas.width) || 200;
      c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height);
      return c.toDataURL('image/png');
    }
  };
}

export async function viewUebergabe(auftragId) {
  main().innerHTML = '<div class="seiten-kopf"><h1>Übergabe-Protokoll</h1></div><p class="hilfe">Lädt…</p>';
  let ansicht;
  try {
    ansicht = await api('GET', `/api/uebergaben/auftrag/${auftragId}`);
  } catch (e) {
    main().innerHTML = `<div class="seiten-kopf"><h1>Übergabe-Protokoll</h1></div><div class="karte"><p>${esc(e.message)}</p></div>`;
    return;
  }
  const kiAn = () => S.status?.kiVerfuegbar && S.settings?.uebergabe?.ki !== false;
  let phase = dauerMerker.get(`uebergabe:${auftragId}`, '') || (ansicht.uebergabe.vorher?.unterschrieben ? 'nachher' : 'vorher');
  const pads = {};

  const u = () => ansicht.uebergabe;
  const fotosVon = (ph) => ansicht.fotos.filter((f) => f.phase === ph);
  const nrVon = (f) => `${f.phase === 'nachher' ? 'N' : 'V'}${f.nr}`;

  function zeichne() {
    const x = u();
    const gesperrtVorher = !!x.vorher?.unterschrieben;
    main().innerHTML = `
      <div class="seiten-kopf ueb-kopf">
        <div><h1>Übergabe-Protokoll</h1><p class="hilfe">${esc(x.kundeName || 'Kunde')}${x.datum ? ` · ${datum(x.datum)}` : ''}</p></div>
        <button class="btn" id="ueb-pdf" type="button">📄 PDF</button>
      </div>
      <details class="karte ueb-daten" ${gesperrtVorher ? '' : 'open'}>
        <summary><b>Kundendaten</b> <small>aus dem Auftrag übernommen</small></summary>
        <div class="raster-2">
          ${[
            ['kundeName', 'Kunde'],
            ['telefon', 'Telefon'],
            ['vonAdresse', 'Von (Auszug)'],
            ['nachAdresse', 'Nach (Einzug)'],
            ['leistung', 'Leistung']
          ]
            .map(([k, l]) => `<label>${l}<input data-kopf="${k}" value="${esc(x[k] || '')}" ${gesperrtVorher ? 'readonly' : ''}></label>`)
            .join('')}
          <label>Datum<input type="date" data-kopf="datum" value="${esc(x.datum || '')}" ${gesperrtVorher ? 'readonly' : ''}></label>
        </div>
      </details>
      <nav class="tabs ueb-tabs" aria-label="Phase">${['vorher', 'nachher']
        .map((ph) => `<a href="#" data-phase="${ph}" class="${ph === phase ? 'aktiv' : ''}">${x[ph]?.unterschrieben ? '✔ ' : ''}${PHASE_TEXT[ph]} <small>${fotosVon(ph).length}</small></a>`)
        .join('')}</nav>
      <div id="ueb-phase"></div>`;
    $$('[data-phase]').forEach(
      (a) =>
        (a.onclick = (e) => {
          e.preventDefault();
          phase = a.dataset.phase;
          dauerMerker.set(`uebergabe:${auftragId}`, phase);
          zeichne();
        })
    );
    $$('[data-kopf]').forEach((el) => (el.onchange = () => speichereKopf({ [el.dataset.kopf]: el.value })));
    $('#ueb-pdf').onclick = pdf;
    zeichnePhase();
  }

  async function speichereKopf(aenderung) {
    try {
      ansicht.uebergabe = await api('PUT', `/api/uebergaben/${u().id}`, aenderung);
    } catch (e) {
      toast(e.message, 'fehler');
    }
  }

  function fotoKarte(f, gesperrt) {
    const zustaende = ZUSTAENDE[f.phase];
    return `<article class="ueb-foto" data-foto="${f.id}">
      <div class="ueb-bild"><img src="${esc(f.vorschau || '')}" alt="Foto ${nrVon(f)}" loading="lazy"><span class="ueb-nr">${nrVon(f)}</span>
        ${f.ki ? '<span class="ueb-ki" title="Mit Bilderkennung beschriftet – bitte prüfen">🤖 erkannt</span>' : ''}</div>
      <div class="ueb-felder">
        ${
          gesperrt
            ? `<b>${esc([f.raum, f.gegenstand].filter(Boolean).join(' · ') || 'Ohne Beschriftung')}</b>
               <span class="ueb-zustand z-${esc(f.zustand || 'leer')}">${esc(ZUSTAND_TEXT[f.zustand || ''])}</span>
               ${f.beschreibung ? `<p>${esc(f.beschreibung)}</p>` : ''}`
            : `<input data-feld="gegenstand" value="${esc(f.gegenstand || '')}" placeholder="Gegenstand, z. B. Kleiderschrank" aria-label="Gegenstand">
               <div class="ueb-zeile">
                 <input data-feld="raum" list="ueb-raeume" value="${esc(f.raum || '')}" placeholder="Raum" aria-label="Raum">
                 <select data-feld="zustand" aria-label="Zustand"><option value="">Zustand …</option>${zustaende
                   .map((z) => `<option value="${z}" ${f.zustand === z ? 'selected' : ''}>${ZUSTAND_TEXT[z]}</option>`)
                   .join('')}</select>
               </div>
               <textarea data-feld="beschreibung" rows="2" placeholder="Beschreibung, z. B. Kratzer links unten ca. 5 cm" aria-label="Beschreibung">${esc(f.beschreibung || '')}</textarea>
               <div class="ueb-aktionen">
                 ${kiAn() ? `<button class="btn btn-klein" type="button" data-erkennen>${f.ki ? '🤖 Neu erkennen' : '🤖 Erkennen'}</button>` : ''}
                 <button class="btn btn-klein rot" type="button" data-weg>Löschen</button>
               </div>`
        }
        <small class="hilfe">${esc(zeit(f.erstellt))}${f.erstelltVon ? ` · ${esc(f.erstelltVon)}` : ''}</small>
      </div>
    </article>`;
  }

  function zeichnePhase() {
    const x = u();
    const p = x[phase] || {};
    const s = p.unterschrieben;
    const liste = fotosVon(phase);
    const agb = S.settings?.uebergabe || {};
    const wartetAufVorher = phase === 'nachher' && !x.vorher?.unterschrieben;
    $('#ueb-phase').innerHTML = `
      ${
        s
          ? `<div class="hinweis-box ok ueb-fertig">✔ <b>Unterschrieben</b> am ${esc(zeit(s.am))} von <b>${esc(s.kundeName)}</b> (Kunde) und <b>${esc(s.mitarbeiterName)}</b>.
             ${phase === 'nachher' ? `<br>${s.schaeden === 'gemeldet' ? `Gemeldete Schäden: ${esc(s.schadenText)}` : 'Keine neuen Schäden festgestellt.'}` : ''}
             <br><small>Fotos und Beschriftungen sind jetzt gesperrt und können nicht mehr geändert werden.</small></div>`
          : `<div class="ueb-kamera">
               <label class="btn btn-primaer ueb-gross">📷 Foto aufnehmen<input type="file" accept="image/*" capture="environment" multiple hidden data-hochladen></label>
               <label class="btn ueb-gross">🖼 Aus Galerie<input type="file" accept="image/*" multiple hidden data-hochladen></label>
             </div>
             <p class="hilfe">${phase === 'vorher' ? 'Jedes wichtige Möbelstück fotografieren – besonders vorhandene Kratzer, Dellen und Macken.' : 'Dieselben Möbel nach dem Aufbau in der neuen Wohnung fotografieren.'}${kiAn() ? ' Die Fotos werden automatisch erkannt und beschriftet – bitte kurz prüfen.' : ''}</p>
             <div class="ueb-status hilfe" aria-live="polite"></div>`
      }
      <datalist id="ueb-raeume">${RAEUME.map((r) => `<option value="${r}">`).join('')}</datalist>
      <div class="ueb-raster">${liste.length ? liste.map((f) => fotoKarte(f, !!s)).join('') : '<p class="hilfe ueb-leer">Noch keine Fotos.</p>'}</div>
      ${s ? '' : `<label class="ueb-notiz">Notiz zu „${PHASE_TEXT[phase]}“<textarea id="ueb-notiz" rows="2" placeholder="z. B. Treppenhaus eng, Kunde hat selbst gepackt">${esc(p.notiz || '')}</textarea></label>`}
      ${
        s || wartetAufVorher
          ? wartetAufVorher
            ? '<div class="hinweis-box">Erst unterschreiben lassen, was <b>vor dem Umzug</b> fotografiert wurde – danach kann das Protokoll „Nach dem Umzug“ unterschrieben werden. Fotos kannst du schon jetzt aufnehmen.</div>'
            : ''
          : `<section class="karte ueb-unterschreiben">
              <h3>${phase === 'vorher' ? 'Zustand vor dem Umzug bestätigen' : 'Zustand nach dem Umzug bestätigen'}</h3>
              ${
                phase === 'vorher'
                  ? `${agb.agbText ? `<div class="ueb-agb">${esc(agb.agbText).replace(/\n/g, '<br>')}</div>` : ''}
                     <label class="checkbox ueb-check"><input type="checkbox" id="ueb-agb"> <span>Der Kunde hat die <b>AGB</b>${agb.agbLink ? ` (<a href="${esc(agb.agbLink)}" target="_blank" rel="noopener">ansehen</a>)` : ''} gelesen und akzeptiert sie. Die Fotos zeigen den Zustand der Möbel vor dem Umzug richtig.</span></label>`
                  : `<div class="ueb-ergebnis">
                       <label class="checkbox"><input type="radio" name="ueb-schaden" value="keine"> <span><b>Keine neuen Schäden</b> – alles in Ordnung</span></label>
                       <label class="checkbox"><input type="radio" name="ueb-schaden" value="gemeldet"> <span><b>Kunde meldet einen Schaden</b></span></label>
                       <textarea id="ueb-schadentext" rows="2" placeholder="Welcher Gegenstand, welcher Schaden? (Foto-Nr. angeben, z. B. N3)" hidden></textarea>
                     </div>`
              }
              <div class="ueb-sigs">
                ${[
                  ['kunde', 'Unterschrift Kunde', x.kundeName],
                  ['mitarbeiter', `Unterschrift Mitarbeiter (${esc(S.settings?.firma?.name || '')})`, S.benutzer?.name]
                ]
                  .map(
                    ([wer, titel, name]) => `<div class="ueb-sig">
                      <div class="ueb-sig-kopf"><b>${titel}</b><button class="link-knopf" type="button" data-leeren="${wer}">Löschen</button></div>
                      <canvas data-sig="${wer}" aria-label="${titel}"></canvas>
                      <input data-signame="${wer}" value="${esc(name || '')}" placeholder="Name in Druckbuchstaben" aria-label="Name">
                    </div>`
                  )
                  .join('')}
              </div>
              <button class="btn btn-primaer ueb-gross" id="ueb-unterschreiben" type="button">✍ Unterschreiben &amp; abschließen</button>
            </section>`
      }`;
    verbinde(!!s);
  }

  function verbinde(gesperrt) {
    $$('[data-hochladen]').forEach((inp) => (inp.onchange = () => hochladen([...inp.files]).finally(() => (inp.value = ''))));
    if ($('#ueb-notiz')) $('#ueb-notiz').onchange = (e) => speichereKopf({ [phase]: { ...u()[phase], notiz: e.target.value } });
    if (!gesperrt) $$('[data-foto]').forEach(bindeKarte);
    $$('[data-sig]').forEach((c) => (pads[c.dataset.sig] = unterschriftFeld(c)));
    $$('[data-leeren]').forEach((b) => (b.onclick = () => pads[b.dataset.leeren].leeren()));
    $$('input[name="ueb-schaden"]').forEach((r) => (r.onchange = () => ($('#ueb-schadentext').hidden = r.value !== 'gemeldet' || !r.checked)));
    if ($('#ueb-unterschreiben')) $('#ueb-unterschreiben').onclick = unterschreiben;
  }

  function bindeKarte(karte) {
    const id = karte.dataset.foto;
    $$('[data-feld]', karte).forEach((el) => (el.onchange = () => beschriften(id, { [el.dataset.feld]: el.value })));
    if ($('[data-erkennen]', karte)) $('[data-erkennen]', karte).onclick = () => erkennen(id, true);
    if ($('[data-weg]', karte))
      $('[data-weg]', karte).onclick = async () => {
        if (!(await bestaetigen('Dieses Foto löschen?', { ok: 'Löschen', gefahr: true }))) return;
        try {
          await api('DELETE', `/api/dateien/${id}`);
          ansicht.fotos = ansicht.fotos.filter((f) => f.id !== id);
          zeichne();
        } catch (e) {
          toast(e.message, 'fehler');
        }
      };
  }

  async function hochladen(dateien) {
    const status = $('.ueb-status');
    const neu = [];
    for (const [i, datei] of dateien.entries()) {
      if (status) status.textContent = `Foto ${i + 1} von ${dateien.length} wird gespeichert …`;
      try {
        const [daten, vorschau] = await Promise.all([bildVerkleinern(datei, 1600, 0.82), bildVerkleinern(datei, 480, 0.72)]);
        const f = await api('POST', '/api/dateien', { uebergabeId: u().id, phase, typ: 'image/jpeg', daten, vorschau, name: datei.name?.slice(0, 200) || '' });
        ansicht.fotos.push(f);
        neu.push(f.id);
      } catch (e) {
        toast(e.message, 'fehler');
      }
    }
    zeichne();
    if (kiAn()) for (const id of neu) erkennen(id);
  }

  async function beschriften(id, aenderung) {
    try {
      const f = await api('PUT', `/api/uebergaben/fotos/${id}`, aenderung);
      Object.assign(
        ansicht.fotos.find((x) => x.id === id),
        f
      );
    } catch (e) {
      toast(e.message, 'fehler');
    }
  }

  async function erkennen(id, vonHand = false) {
    const karte = $(`[data-foto="${id}"]`);
    karte?.classList.add('erkennt');
    try {
      const f = await api('POST', `/api/uebergaben/fotos/${id}/erkennen`, {});
      Object.assign(
        ansicht.fotos.find((x) => x.id === id),
        f
      );
      const alt = $(`[data-foto="${id}"]`);
      if (alt) {
        alt.outerHTML = fotoKarte(f, false);
        bindeKarte($(`[data-foto="${id}"]`));
      }
    } catch (e) {
      if (vonHand || e.status !== 501) toast(e.message, 'fehler');
    } finally {
      $(`[data-foto="${id}"]`)?.classList.remove('erkennt');
    }
  }

  async function unterschreiben() {
    const leer = ansicht.fotos.filter((f) => f.phase === phase && !f.gegenstand);
    const body = {
      phase,
      kundeName: $('[data-signame="kunde"]').value,
      mitarbeiterName: $('[data-signame="mitarbeiter"]').value,
      agbAkzeptiert: phase === 'vorher' ? $('#ueb-agb').checked : undefined,
      schaeden: $('input[name="ueb-schaden"]:checked')?.value || '',
      schadenText: $('#ueb-schadentext')?.value || ''
    };
    if (phase === 'vorher' && !body.agbAkzeptiert) return toast('Bitte die AGB bestätigen lassen', 'fehler');
    if (phase === 'nachher' && !body.schaeden) return toast('Bitte angeben, ob Schäden festgestellt wurden', 'fehler');
    if (pads.kunde.leer() || pads.mitarbeiter.leer()) return toast('Bitte Kunde und Mitarbeiter unterschreiben lassen', 'fehler');
    if (
      !(await bestaetigen(
        `${leer.length ? `${leer.length} Foto(s) haben noch keinen Gegenstand. ` : ''}Nach der Unterschrift können die Fotos und Beschriftungen „${PHASE_TEXT[phase]}“ nicht mehr geändert werden. Jetzt abschließen?`,
        { ok: 'Unterschreiben' }
      ))
    )
      return;
    try {
      ansicht = await api('POST', `/api/uebergaben/${u().id}/unterschreiben`, { ...body, kundeUnterschrift: pads.kunde.bild(), mitarbeiterUnterschrift: pads.mitarbeiter.bild() });
      toast('Unterschrieben – das Protokoll ist gespeichert');
      if (phase === 'vorher') phase = 'nachher';
      dauerMerker.set(`uebergabe:${auftragId}`, phase);
      zeichne();
    } catch (e) {
      toast(e.message, 'fehler');
    }
  }

  async function pdf() {
    const knopf = $('#ueb-pdf');
    knopf.disabled = true;
    knopf.textContent = 'PDF wird erstellt …';
    try {
      // Ersatzweise im Browser: dafür die Fotos in voller Größe laden
      const html = async () => {
        const voll = await Promise.all([...ansicht.fotos, ...ansicht.unterschriften].map((f) => api('GET', `/api/dateien/${f.id}`)));
        const nachId = Object.fromEntries(voll.map((f) => [f.id, f]));
        return renderUebergabe(
          { uebergabe: u(), fotos: ansicht.fotos.map((f) => ({ ...f, daten: nachId[f.id]?.daten })), unterschriften: ansicht.unterschriften.map((f) => ({ ...f, daten: nachId[f.id]?.daten })) },
          S.settings
        );
      };
      await backend.download(await backend.uebergabePdf(u().id, html), uebergabeDateiname(u()));
    } catch (e) {
      toast(e.message, 'fehler');
    } finally {
      knopf.disabled = false;
      knopf.textContent = '📄 PDF';
    }
  }

  zeichne();
  if (!istChef() && !ansicht.fotos.length) toast('Tipp: Erst alle Möbel fotografieren, dann den Kunden unterschreiben lassen.');
}

// Übersicht im Menü: alle Aufträge (Chef) bzw. eigene Einsätze (Mitarbeiter) mit Stand des Protokolls
export function viewUebergaben() {
  const chef = istChef();
  const stand = (auftragId) => {
    const x = S.uebergaben.find((u) => u.auftragId === auftragId);
    if (x?.nachher?.unterschrieben) return ['fertig', '✔ Fertig'];
    if (x?.vorher?.unterschrieben) return ['halb', 'Vorher ✔ – Nachher offen'];
    if (x) return ['offen', 'Begonnen'];
    return ['neu', chef ? 'Noch nicht begonnen' : 'Öffnen'];
  };
  const eintraege = chef
    ? S.auftraege.filter((a) => a.status !== 'abgesagt').map((a) => ({ id: a.id, titel: a.titel, kunde: a.kundeName, datum: S.termine.find((t) => t.auftragId === a.id)?.datum || a.datum || '' }))
    : [...new Map(S.termine.filter((t) => t.auftragId).map((t) => [t.auftragId, { id: t.auftragId, titel: t.titel || 'Einsatz', kunde: t.kundeName, datum: t.datum }])).values()];
  eintraege.sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
  let suche = '';
  main().innerHTML = `
    <div class="seiten-kopf"><div><h1>Übergabe-Protokolle</h1><p class="hilfe">Fotos vor und nach dem Umzug mit Unterschrift des Kunden – Auftrag antippen zum Öffnen.</p></div></div>
    <div class="filter-leiste"><input type="search" id="ueb-suche" placeholder="Kunde oder Auftrag suchen …" aria-label="Suchen"></div>
    <div class="ueb-liste" id="ueb-liste"></div>`;
  const zeichneListe = () => {
    const q = suche.toLowerCase();
    const liste = eintraege.filter((e) => !q || `${e.titel} ${e.kunde}`.toLowerCase().includes(q));
    $('#ueb-liste').innerHTML = liste.length
      ? liste
          .map((e) => {
            const [art, text] = stand(e.id);
            return `<a class="ueb-eintrag" href="#/uebergabe/${esc(e.id)}"><div><b>${esc(e.kunde || e.titel)}</b><small>${esc(e.titel)}${e.datum ? ` · ${datum(e.datum)}` : ''}</small></div><span class="ueb-stand s-${art}">${text}</span></a>`;
          })
          .join('')
      : `<p class="leer">${chef ? 'Noch keine Aufträge. Lege zuerst einen Auftrag an (z. B. aus einer Anfrage).' : 'Keine Einsätze mit Auftrag.'}</p>`;
  };
  $('#ueb-suche').oninput = (e) => {
    suche = e.target.value;
    zeichneListe();
  };
  zeichneListe();
}
