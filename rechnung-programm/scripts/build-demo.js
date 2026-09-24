// Baut die Test-Version als eine einzige HTML-Datei (ohne Server, Daten im Browser).
// Aufruf: npm run build:demo  ->  demo/rechnung-programm-test.html
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const lies = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const pkg = require('../package.json');
const version = (name) => pkg.dependencies[name].replace(/^[^\d]*/, '');

const index = lies('public/index.html');
const body = index.slice(index.indexOf('<body>') + 6, index.indexOf('<script'));
const fonts = index.match(/<link href="https:\/\/fonts\.googleapis\.com[^>]+>/)[0];

const demoCss = `
.demo-box { padding: 14px; border-radius: 12px; background: var(--seite-2); font-size: 12px; color: var(--seite-text); display: flex; flex-direction: column; gap: 8px; }
.demo-box b { color: var(--seite-text-hell); font-size: 13px; }
.demo-box .btn { background: transparent; color: var(--seite-text-hell); border-color: rgba(255, 255, 255, .16); white-space: normal; text-align: center; }
.demo-box .btn:hover { background: rgba(255, 255, 255, .08); }
`;

// Logo und Schrift direkt einbetten (die Test-Seite darf keine eigenen Dateien nachladen)
const dataUri = (datei, typ) => `data:${typ};base64,${fs.readFileSync(path.join(root, datei)).toString('base64')}`;
const defaults = JSON.parse(JSON.stringify(require('../defaults')));
defaults.firma.logo = dataUri('public/img/logo.png', 'image/png');
defaults.firma.logoHell = dataUri('public/img/logo-hell.png', 'image/png');
const dokumentCss = lies('public/css/dokument.css').replace(/url\('\.\.\/fonts\/([^']+)'\)/g, (m, f) => `url('${dataUri(`public/fonts/${f}`, 'font/woff2')}')`);

const skript = (datei) => `<script>\n${lies(datei).replace(/<\/script/gi, '<\\/script')}\n</script>`;

const html = `<title>Rechnung-Programm</title>
<meta name="description" content="Test-Version des Rechnung-Programms">
${fonts}
<style>
${lies('public/css/app.css')}
${dokumentCss}
${demoCss}
</style>
${body.trim()}
<script src="https://cdn.jsdelivr.net/npm/chart.js@${version('chart.js')}/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2pdf.js@${version('html2pdf.js')}/dist/html2pdf.bundle.min.js"></script>
<script>window.DEMO_DEFAULTS = ${JSON.stringify(defaults)};</script>
${skript('public/js/core.js')}
${skript('demo/demo-api.js')}
${skript('public/js/dokumente.js')}
${skript('public/js/finanzen.js')}
${skript('public/js/kalender.js')}
${skript('public/js/einstellungen.js')}
${skript('public/js/app.js')}
`;

const ziel = path.join(root, 'demo', 'rechnung-programm-test.html');
fs.writeFileSync(ziel, html);
console.log(`Test-Version gebaut: ${path.relative(root, ziel)} (${Math.round(html.length / 1024)} KB)`);
