// PDF-Erzeugung auf dem Server mit Playwright (echtes Vektor-PDF mit durchsuchbarem Text).
// Ist Playwright/Chromium nicht installiert, meldet /api/pdf „nicht verfügbar“ und der Browser erzeugt das PDF selbst.
import fs from 'node:fs';
import path from 'node:path';

export function erstellePdf(publicOrdner) {
  let browserPromise = null;
  let verfuegbar = null;

  const dataUri = (datei, typ) => `data:${typ};base64,${fs.readFileSync(datei).toString('base64')}`;
  // Schriften direkt in das CSS einbetten
  const css = () =>
    fs
      .readFileSync(path.join(publicOrdner, 'css/dokument.css'), 'utf8')
      .replace(/url\('\.\.\/fonts\/([^']+)'\)/g, (m, f) => `url('${dataUri(path.join(publicOrdner, 'fonts', f), 'font/woff2')}')`);

  // Relative Bildpfade (z. B. img/logo-hell.png) durch eingebettete Bilder ersetzen
  const bilderEinbetten = (html) =>
    html.replace(/src="(img\/[\w.-]+\.(png|jpe?g|webp|svg))"/g, (m, datei, ext) => {
      const voll = path.join(publicOrdner, datei);
      if (!voll.startsWith(path.join(publicOrdner, 'img')) || !fs.existsSync(voll)) return 'src=""';
      const typ = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      return `src="${dataUri(voll, typ)}"`;
    });

  async function browser() {
    if (!browserPromise) {
      browserPromise = import('playwright')
        .then(({ chromium }) => chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] }))
        .catch((e) => {
          browserPromise = null;
          throw e;
        });
    }
    return browserPromise;
  }

  async function pruefe() {
    if (verfuegbar !== null) return verfuegbar;
    try {
      await browser();
      verfuegbar = true;
    } catch (e) {
      console.warn(`PDF auf dem Server nicht verfügbar (${e.message.split('\n')[0]}). Der Browser erzeugt PDFs selbst.`);
      verfuegbar = false;
    }
    return verfuegbar;
  }

  // Mehrere Seiten (z. B. Sammel-PDF) werden mit Seitenumbruch hintereinander gesetzt
  async function erzeuge(seitenHtml) {
    const b = await browser();
    const kontext = await b.newContext({ javaScriptEnabled: false });
    try {
      const seite = await kontext.newPage();
      // Kein Zugriff nach außen: alles Nötige ist eingebettet
      await seite.route('**/*', (route) => (route.request().url().startsWith('data:') ? route.continue() : route.abort()));
      const inhalt = (Array.isArray(seitenHtml) ? seitenHtml : [seitenHtml]).map((h) => `<div class="pdf-seite">${bilderEinbetten(h)}</div>`).join('');
      await seite.setContent(
        `<!doctype html><html><head><meta charset="utf-8"><style>
          ${css()}
          @page { size: A4; margin: 14mm 0 12mm; }
          @page :first { margin-top: 0; }
          html, body { margin: 0; background: #fff; }
          .pdf-seite { break-after: page; }
          .pdf-seite:last-child { break-after: auto; }
          .pdf-seite .doc-page { min-height: 283mm; box-shadow: none; }
          .s-tabelle tr, .d-positionen tr, .s-summen, .d-summen-wrap, .s-fuss, .d-fuss { break-inside: avoid; }
          .s-tabelle thead, .d-positionen thead { display: table-header-group; }
        </style></head><body>${inhalt}</body></html>`,
        { waitUntil: 'load' }
      );
      await seite.evaluate(() => document.fonts.ready);
      return await seite.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
    } finally {
      await kontext.close();
    }
  }

  async function schliessen() {
    if (browserPromise) (await browserPromise.catch(() => null))?.close();
  }

  return { pruefe, erzeuge, schliessen };
}
