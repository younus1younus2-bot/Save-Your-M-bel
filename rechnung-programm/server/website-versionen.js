// Website-Versionen umschalten: Jede Version liegt als eigener Ordner im Versionsordner (nur lesend eingebunden),
// die aktive steht in der Steuerdatei aktiv.txt („version <name>“), die der Website-Container bei jeder Anfrage liest.
import fs from 'node:fs';
import path from 'node:path';

const NAME = /^[a-z0-9-]{1,40}$/;

export function erstelleWebsiteVersionen({ versionenOrdner = process.env.WEBSITE_VERSIONEN, steuerOrdner = process.env.WEBSITE_STEUERUNG } = {}) {
  const steuerDatei = steuerOrdner && path.join(steuerOrdner, 'aktiv.txt');
  const eingerichtet = () => Boolean(versionenOrdner && steuerOrdner && fs.existsSync(versionenOrdner) && fs.existsSync(steuerOrdner));

  function aktiv() {
    try {
      const zeile = fs
        .readFileSync(steuerDatei, 'utf8')
        .split('\n')
        .find((z) => z.startsWith('version '));
      const name = zeile?.slice(8).trim();
      return NAME.test(name || '') ? name : 'v1';
    } catch {
      return 'v1';
    }
  }

  function info(name) {
    let meta = {};
    try {
      meta = JSON.parse(fs.readFileSync(path.join(versionenOrdner, name, '_version.json'), 'utf8')) || {};
    } catch {
      // ohne Beschreibung: nur der Ordnername
    }
    const nummer = name.match(/^v(\d+)$/)?.[1];
    return {
      name,
      titel: String(meta.titel || (nummer ? `Version ${nummer}` : name)).slice(0, 80),
      beschreibung: String(meta.beschreibung || '').slice(0, 400),
      erstellt: String(meta.erstellt || '').slice(0, 30)
    };
  }

  function liste() {
    if (!eingerichtet()) return { eingerichtet: false, aktiv: null, versionen: [] };
    const versionen = fs
      .readdirSync(versionenOrdner, { withFileTypes: true })
      .filter((e) => e.isDirectory() && NAME.test(e.name))
      .map((e) => info(e.name))
      .sort((a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }));
    return { eingerichtet: true, aktiv: aktiv(), versionen };
  }

  function setzeAktiv(name) {
    const fehler = (text, status = 400) => Object.assign(new Error(text), { status });
    if (!eingerichtet()) throw fehler('Website-Versionen sind auf dem Server noch nicht eingerichtet', 409);
    if (!NAME.test(String(name || ''))) throw fehler('Ungültiger Versionsname');
    if (!fs.existsSync(path.join(versionenOrdner, name, 'index.php'))) throw fehler('Diese Version gibt es nicht', 404);
    // erst in eine Hilfsdatei schreiben und dann umbenennen – der Webserver liest nie eine halbe Datei
    const tmp = `${steuerDatei}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `version ${name}\n`, { mode: 0o644 });
    fs.renameSync(tmp, steuerDatei);
    return liste();
  }

  return { liste, setzeAktiv };
}
