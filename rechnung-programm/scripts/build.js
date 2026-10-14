// Baut die Oberfläche: public/build/app.js (für den Server) und demo/rechnung-programm-test.html (Test-Version ohne Server)
// Aufruf: npm run build   (nur Server: npm run build -- --nur-app)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import DEFAULTS from '../src/shared/defaults.js';

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lies = (p) => fs.readFileSync(path.join(wurzel, p), 'utf8');
const pkg = JSON.parse(lies('package.json'));
const version = (name) => String(pkg.dependencies[name] || pkg.optionalDependencies?.[name] || '').replace(/^[^\d]*/, '');

async function baue(backend, optionen) {
  return esbuild.build({
    entryPoints: [path.join(wurzel, 'src/client/main.js')],
    bundle: true,
    alias: { backend: path.join(wurzel, `src/client/backend-${backend}.js`) },
    target: ['es2020', 'safari14'],
    legalComments: 'none',
    logLevel: 'warning',
    ...optionen
  });
}

// 1) Oberfläche für den Server
await baue('server', { outfile: path.join(wurzel, 'public/build/app.js'), format: 'esm', minify: true, sourcemap: true });
console.log('Gebaut: public/build/app.js');

if (!process.argv.includes('--nur-app')) {
  // 2) Test-Version als eine HTML-Datei (Logo, Schrift und Code eingebettet)
  const js = (await baue('demo', { write: false, format: 'iife', minify: true })).outputFiles[0].text;
  const dataUri = (datei, typ) => `data:${typ};base64,${fs.readFileSync(path.join(wurzel, datei)).toString('base64')}`;
  const defaults = JSON.parse(JSON.stringify(DEFAULTS));
  defaults.firma.logo = dataUri('public/img/logo.png', 'image/png');
  defaults.firma.logoHell = dataUri('public/img/logo-hell.png', 'image/png');
  const dokumentCss = lies('public/css/dokument.css').replace(/url\('\.\.\/fonts\/([^']+)'\)/g, (m, f) => `url('${dataUri(`public/fonts/${f}`, 'font/woff2')}')`);
  const index = lies('public/index.html');
  const start = index.indexOf('>', index.indexOf('<body')) + 1;
  const koerper = index.slice(start, index.indexOf('<!--SKRIPTE-->')).trim();
  const fonts = index.match(/<link[^>]*fonts\.googleapis\.com\/css2[^>]*>/s)?.[0] || '';
  const sicher = (s) => s.replace(/<\/script/gi, '<\\/script');
  const html = `<title>Rechnung-Programm</title>
<meta name="description" content="Test-Version des Rechnung-Programms">
${fonts}
<style>
${lies('public/css/app.css')}
${dokumentCss}
</style>
${koerper}
<script src="https://cdn.jsdelivr.net/npm/chart.js@${version('chart.js')}/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html2pdf.js@${version('html2pdf.js')}/dist/html2pdf.bundle.min.js"></script>
<script>window.DEMO_DEFAULTS = ${sicher(JSON.stringify(defaults))};</script>
<script>${sicher(js)}</script>
`;
  fs.mkdirSync(path.join(wurzel, 'demo'), { recursive: true });
  fs.writeFileSync(path.join(wurzel, 'demo/rechnung-programm-test.html'), html);
  console.log(`Gebaut: demo/rechnung-programm-test.html (${Math.round(html.length / 1024)} KB)`);
}
