// API-Routen, die Server und Test-Version gemeinsam nutzen.
// Jede Route: [Methode, Pfad, Rolle ('chef' | 'alle'), Handler(ctx, params, body, query)]
import { SAMMLUNGEN } from './schema.js';

export function erstelleRouten(L) {
  const sammlung = (p) => {
    if (!SAMMLUNGEN.includes(p.col)) {
      const e = new Error('Unbekannter Bereich');
      e.status = 404;
      throw e;
    }
    return p.col;
  };
  return [
    ['GET', '/api/daten', 'alle', (ctx) => L.daten(ctx)],
    ['GET', '/api/einstellungen', 'chef', (ctx) => L.daten(ctx).settings],
    ['PUT', '/api/einstellungen', 'chef', (ctx, p, b) => L.setzeEinstellungen(ctx, b)],
    ['GET', '/api/protokoll', 'chef', (ctx, p, b, q) => L.protokoll(ctx, { kundeId: q.kundeId, objektId: q.objektId, limit: Number(q.limit) || 200 })],
    ['GET', '/api/papierkorb', 'chef', (ctx) => L.papierkorb(ctx)],
    ['GET', '/api/dateien', 'alle', (ctx, p, b, q) => L.fotos(ctx, q)],
    ['POST', '/api/dateien', 'alle', (ctx, p, b) => L.fotoHochladen(ctx, b)],
    ['GET', '/api/dateien/:id', 'alle', (ctx, p) => L.foto(ctx, p.id)],
    ['DELETE', '/api/dateien/:id', 'alle', (ctx, p) => L.fotoLoeschen(ctx, p.id)],
    ['POST', '/api/dateien/:id/wiederherstellen', 'alle', (ctx, p) => L.fotoLoeschen(ctx, p.id, true)],
    ['POST', '/api/dokumente/:id/abschliessen', 'chef', (ctx, p) => L.abschliessen(ctx, p.id)],
    ['POST', '/api/dokumente/:id/versendet', 'chef', (ctx, p, b) => L.versendet(ctx, p.id, b || {})],
    ['POST', '/api/dokumente/:id/bezahlt', 'chef', (ctx, p, b) => L.bezahlt(ctx, p.id, b || {})],
    ['POST', '/api/dokumente/:id/zahlung-zuruecknehmen', 'chef', (ctx, p) => L.zahlungZuruecknehmen(ctx, p.id)],
    ['POST', '/api/dokumente/:id/storno', 'chef', (ctx, p, b) => L.stornieren(ctx, p.id, b || {})],
    ['POST', '/api/dokumente/:id/umwandeln', 'chef', (ctx, p) => L.umwandeln(ctx, p.id)],
    ['POST', '/api/dokumente/:id/duplizieren', 'chef', (ctx, p) => L.duplizieren(ctx, p.id)],
    ['POST', '/api/sammel/bezahlt', 'chef', (ctx, p, b) => L.sammelBezahlt(ctx, b?.ids, b?.datum)],
    ['POST', '/api/anfragen/import', 'chef', (ctx, p, b) => L.anfragenImport(ctx, b?.anfragen)],
    ['POST', '/api/auftraege/:id/status', 'chef', (ctx, p, b) => L.auftragStatus(ctx, p.id, b?.status)],
    ['POST', '/api/:col/:id/wiederherstellen', 'chef', (ctx, p) => L.wiederherstellen(ctx, sammlung(p), p.id)],
    ['POST', '/api/:col', 'chef', (ctx, p, b) => L.speichere(ctx, sammlung(p), b)],
    ['PUT', '/api/:col/:id', 'alle', (ctx, p, b) => L.speichere(ctx, sammlung(p), b, p.id)],
    ['DELETE', '/api/:col/:id', 'chef', (ctx, p) => L.loeschen(ctx, sammlung(p), p.id)]
  ].map(([methode, pfad, rolle, handler]) => {
    const namen = [];
    const re = new RegExp(`^${pfad.replace(/:(\w+)/g, (m, n) => (namen.push(n), '([\\w-]+)'))}$`);
    return { methode, pfad, rolle, handler, passt: (m, url) => (m === methode ? url.match(re) : null), namen };
  });
}

// Passende Route suchen und ausführen
export function fuehreAus(routen, ctx, methode, url, body) {
  const [pfad, qs = ''] = url.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs));
  for (const r of routen) {
    const m = r.passt(methode, pfad);
    if (!m) continue;
    if (r.rolle === 'chef' && ctx.benutzer?.rolle !== 'chef') {
      const e = new Error('Dafür fehlt die Berechtigung');
      e.status = 403;
      throw e;
    }
    const params = Object.fromEntries(r.namen.map((n, i) => [n, m[i + 1]]));
    return { gefunden: true, ergebnis: r.handler(ctx, params, body, query) };
  }
  return { gefunden: false };
}
