// Bilderkennung für das Übergabe-Protokoll: Claude beschreibt, was auf dem Foto zu sehen ist (Gegenstand, Raum,
// sichtbarer Zustand). Nur aktiv, wenn ANTHROPIC_API_KEY gesetzt ist – sonst beschriftet der Mitarbeiter von Hand.
// Die Erkennung ist ein Vorschlag: der Mitarbeiter prüft und korrigiert ihn vor der Unterschrift.
import Anthropic from '@anthropic-ai/sdk';

const MODELL = 'claude-opus-5-5';
const RAEUME = ['Wohnzimmer', 'Schlafzimmer', 'Kinderzimmer', 'Küche', 'Bad', 'Flur', 'Arbeitszimmer', 'Esszimmer', 'Keller', 'Dachboden', 'Garage', 'Balkon', 'Treppenhaus', 'LKW', 'Draußen', 'Büro'];

const SCHEMA = {
  type: 'object',
  properties: {
    gegenstand: { type: 'string', description: 'Hauptgegenstand auf dem Foto, kurz, z. B. „Kleiderschrank, 3-türig, weiß“' },
    raum: { type: 'string', enum: ['', ...RAEUME], description: 'Raum oder Ort, leer wenn nicht erkennbar' },
    zustand: { type: 'string', enum: ['einwandfrei', 'gebrauchsspuren', 'beschaedigt', 'nicht-erkennbar'] },
    schaeden: { type: 'array', items: { type: 'string' }, description: 'Sichtbare Schäden mit Stelle, z. B. „Kratzer ca. 5 cm an der linken Tür unten“; leer wenn keine' },
    verpackung: { type: 'string', description: 'Schutz/Verpackung, falls sichtbar, z. B. „in Umzugsdecken und Stretchfolie“; sonst leer' },
    beschreibung: { type: 'string', description: 'Ein sachlicher Satz für das Protokoll' }
  },
  required: ['gegenstand', 'raum', 'zustand', 'schaeden', 'verpackung', 'beschreibung'],
  additionalProperties: false
};

const ANWEISUNG = `Du hilfst einer Umzugsfirma, ein Übergabe-Protokoll zu führen. Du bekommst ein Foto, das vor oder nach dem Umzug aufgenommen wurde.
Beschreibe nur, was auf dem Foto wirklich zu sehen ist – sachlich, auf Deutsch, ohne Vermutungen über Ursachen oder Schuld.
- gegenstand: das wichtigste Möbelstück oder der wichtigste Gegenstand (bei mehreren: den größten nennen und „u. a.“ ergänzen).
- raum: nur wenn eindeutig erkennbar, sonst leer.
- zustand: „einwandfrei“ wenn keine Mängel sichtbar sind, „gebrauchsspuren“ bei normaler Abnutzung, „beschaedigt“ bei deutlichen Schäden (Bruch, Riss, tiefe Kratzer, Dellen, abgebrochene Teile), „nicht-erkennbar“ wenn der Gegenstand verpackt oder verdeckt ist oder das Foto zu unscharf ist.
- schaeden: jeden sichtbaren Mangel einzeln mit Stelle und ungefährer Größe.
Wenn auf dem Foto Personen zu sehen sind, beschreibe sie nicht.`;

export function erstelleUebergabeKi({ log = () => {} } = {}) {
  const verfuegbar = () => Boolean(process.env.ANTHROPIC_API_KEY);
  let client = null;
  const holeClient = () => (client ||= new Anthropic());

  // Gibt die Beschriftung für das Foto zurück oder wirft einen verständlichen Fehler
  async function erkenne(dataUrl, { phase = 'vorher' } = {}) {
    if (!verfuegbar()) throw Object.assign(new Error('Die Bilderkennung ist auf dem Server nicht eingerichtet.'), { status: 501 });
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl || '');
    if (!m) throw Object.assign(new Error('Dieses Foto kann nicht erkannt werden.'), { status: 400 });
    let antwort;
    try {
      antwort = await holeClient().beta.messages.create({
        model: MODELL,
        max_tokens: 4000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
        system: ANWEISUNG,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
              { type: 'text', text: `Foto ${phase === 'nachher' ? 'NACH' : 'VOR'} dem Umzug. Bitte beschreiben.` }
            ]
          }
        ]
      });
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) throw Object.assign(new Error('Der KI-Schlüssel auf dem Server ist ungültig.'), { status: 502 });
      if (e instanceof Anthropic.RateLimitError) throw Object.assign(new Error('Die Bilderkennung ist gerade ausgelastet – bitte gleich noch einmal versuchen.'), { status: 503 });
      if (e instanceof Anthropic.APIError) {
        log(`Bilderkennung fehlgeschlagen (${e.status}): ${e.message}`);
        throw Object.assign(new Error('Die Bilderkennung hat gerade nicht geklappt. Bitte von Hand beschriften.'), { status: 502 });
      }
      throw e;
    }
    if (antwort.stop_reason === 'refusal') throw Object.assign(new Error('Dieses Foto wurde von der Bilderkennung nicht beschrieben. Bitte von Hand beschriften.'), { status: 422 });
    const text = antwort.content.find((b) => b.type === 'text')?.text || '';
    let d;
    try {
      d = JSON.parse(text);
    } catch {
      throw Object.assign(new Error('Die Bilderkennung hat keine verwertbare Antwort geliefert.'), { status: 502 });
    }
    const kurz = (v, n) =>
      String(v || '')
        .trim()
        .slice(0, n);
    return {
      gegenstand: kurz(d.gegenstand, 120),
      raum: RAEUME.includes(d.raum) ? d.raum : '',
      zustand: ['einwandfrei', 'gebrauchsspuren', 'beschaedigt', 'nicht-erkennbar'].includes(d.zustand) ? d.zustand : 'nicht-erkennbar',
      schaeden: (Array.isArray(d.schaeden) ? d.schaeden : [])
        .map((s) => kurz(s, 200))
        .filter(Boolean)
        .slice(0, 10),
      verpackung: kurz(d.verpackung, 200),
      beschreibung: kurz(d.beschreibung, 300),
      modell: antwort.model,
      am: new Date().toISOString()
    };
  }

  return { verfuegbar, erkenne };
}
