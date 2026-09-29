// Import aus der alten Website-Datenbank (phpMyAdmin-Export als CSV oder JSON)
const ALTE_SPALTEN = [
  'id',
  'anfrage_nr',
  'service_type',
  'status',
  'wunschtermin',
  'flexibilitaet',
  'uhrzeit',
  'von_strasse',
  'von_plz',
  'von_stadt',
  'von_etage',
  'von_aufzug',
  'nach_strasse',
  'nach_plz',
  'nach_stadt',
  'nach_etage',
  'nach_aufzug',
  'entfernung',
  'inventar',
  'volumen',
  'teile',
  'fahrzeug',
  'extras',
  'anrede',
  'firma',
  'kunde_name',
  'kunde_telefon',
  'kunde_email',
  'kontakt_methode',
  'anmerkungen',
  'preis',
  'rabatt',
  'mwst',
  'rechnung_nr',
  'rechnung_datum',
  'bezahlt',
  'created_at',
  'updated_at'
];

export function csvZeilen(text) {
  text = text.replace(/^\uFEFF/, '');
  const erste = text.split(/\r?\n/, 1)[0];
  const trenner = [';', ',', '\t'].sort((x, y) => erste.split(y).length - erste.split(x).length)[0];
  const zeilen = [];
  let zeile = [];
  let feld = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') ((feld += '"'), i++);
      else if (c === '"') inQuote = false;
      else feld += c;
    } else if (c === '"') inQuote = true;
    else if (c === trenner) (zeile.push(feld), (feld = ''));
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      zeile.push(feld);
      if (zeile.some((x) => x !== '')) zeilen.push(zeile);
      ((zeile = []), (feld = ''));
    } else feld += c;
  }
  zeile.push(feld);
  if (zeile.some((x) => x !== '')) zeilen.push(zeile);
  return zeilen;
}

export function anfragenAusDatei(text) {
  const t = text.trim();
  if (t.startsWith('[') || t.startsWith('{')) {
    const j = JSON.parse(t);
    // phpMyAdmin-JSON: [{type:'header'}, {type:'table', name:'anfragen', data:[…]}]
    const tabelle = Array.isArray(j) ? j.find((x) => x?.type === 'table' && (x.name === 'anfragen' || x.data)) : null;
    const liste = tabelle ? tabelle.data : Array.isArray(j) ? j : j.data || [];
    return liste.filter((z) => z && typeof z === 'object');
  }
  const zeilen = csvZeilen(t);
  if (!zeilen.length) return [];
  const kopf = zeilen[0].map((x) => x.trim().toLowerCase());
  const mitKopf = kopf.includes('kunde_name') || kopf.includes('anfrage_nr');
  const spalten = mitKopf ? kopf : ALTE_SPALTEN;
  return (mitKopf ? zeilen.slice(1) : zeilen).map((z) => Object.fromEntries(spalten.map((s, i) => [s, z[i] === 'NULL' ? '' : (z[i] ?? '')])));
}
