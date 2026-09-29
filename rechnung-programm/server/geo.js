// Adresssuche (Photon/OpenStreetMap) und Fahrstrecke (OSRM) – mit Zwischenspeicher und Zeitlimit
const cache = new Map();
const KOPF = { 'User-Agent': 'Rechnung-Programm (Umzugsfirma)' };

async function holeJson(url) {
  if (cache.has(url)) return cache.get(url);
  const r = await fetch(url, { headers: KOPF, signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw Object.assign(new Error('Adressdienst gerade nicht erreichbar'), { status: 502 });
  const d = await r.json();
  if (cache.size > 2000) cache.delete(cache.keys().next().value);
  cache.set(url, d);
  return d;
}

const zeile = (p) => {
  const strasse = [p.street || (p.type === 'street' ? p.name : ''), p.housenumber].filter(Boolean).join(' ');
  const name = p.name && p.name !== p.street && p.type !== 'street' && p.type !== 'house' ? p.name : '';
  return [name, strasse, [p.postcode, p.city || p.town || p.village || (p.type === 'city' ? p.name : '')].filter(Boolean).join(' ')].filter(Boolean).join(', ');
};

export async function adressSuche(q) {
  if (!q || q.trim().length < 3) return [];
  const d = await holeJson(`https://photon.komoot.io/api/?q=${encodeURIComponent(q.trim())}&limit=6&lang=de&lat=50.94&lon=6.96`);
  return (d.features || [])
    .filter((f) => ['DE', 'AT', 'CH', 'NL', 'BE', 'LU', 'FR', 'PL', 'DK'].includes(f.properties.countrycode))
    .map((f) => ({
      text: zeile(f.properties),
      strasse: [f.properties.street || '', f.properties.housenumber || ''].filter(Boolean).join(' '),
      plz: f.properties.postcode || '',
      ort: f.properties.city || f.properties.town || f.properties.village || '',
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1]
    }))
    .filter((a) => a.text);
}

export async function strecke(von, nach) {
  const [a] = await adressSuche(von);
  const [b] = await adressSuche(nach);
  if (!a || !b) throw Object.assign(new Error('Eine der Adressen wurde nicht gefunden.'), { status: 404 });
  const d = await holeJson(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`);
  const r = d.routes?.[0];
  if (!r) throw Object.assign(new Error('Keine Strecke gefunden.'), { status: 404 });
  return { km: Math.round(r.distance / 100) / 10, minuten: Math.round(r.duration / 60), von: a.text, nach: b.text };
}
