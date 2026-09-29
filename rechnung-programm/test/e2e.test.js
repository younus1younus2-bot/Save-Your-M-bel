// Browser-Test des kompletten Ablaufs (wird übersprungen, wenn Playwright/Chromium fehlt)
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { starteServer } from '../server/index.js';

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  chromium = null;
}

describe('Browser-Ablauf', { skip: !chromium && 'Playwright nicht installiert' }, () => {
  let server;
  let browser;
  let seite;
  let basis;
  const fehler = [];
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-e2e-'));

  before(async () => {
    server = await starteServer({ port: 0, datenOrdner: ordner, leise: true });
    basis = `http://localhost:${server.port}/`;
    try {
      browser = await chromium.launch();
    } catch {
      browser = null;
      return;
    }
    seite = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    seite.on('pageerror', (e) => fehler.push(e.message));
    await seite.route(/fonts\.g|photon|osrm/, (r) => r.abort());
  });
  after(async () => {
    await browser?.close();
    await server.stop();
    fs.rmSync(ordner, { recursive: true, force: true });
  });

  test('Einrichtung, Kostenvoranschlag, Rechnung, Zahlung, Storno', async (t) => {
    if (!browser) return t.skip('Chromium nicht verfügbar');
    await seite.goto(basis);
    await seite.fill('#l-name', 'Hamam');
    await seite.fill('#l-email', 'chef@test.de');
    await seite.fill('#l-pw', 'sehrgeheim123');
    await seite.click('#login-form button');
    await seite.waitForSelector('.begruessung');

    await seite.goto(`${basis}#/neu/angebot`);
    await seite.fill('[data-k="name"]', 'Erika Muster');
    await seite.selectOption('#vorlageWahl', '0');
    await seite.waitForFunction(() => location.hash.startsWith('#/dokument/'), null, { timeout: 5000 });
    await seite.waitForFunction(() => document.querySelector('#speicherstatus')?.textContent.includes('Gespeichert'));

    await seite.click('[data-a="umwandeln"]');
    await seite.waitForFunction(() => document.querySelector('h1')?.textContent.includes('Entwurf'));
    await seite.click('[data-a="abschliessen"]');
    await seite.click('[data-ja]');
    await seite.waitForSelector('.gesperrt-box');
    assert.match(await seite.textContent('h1'), /Rechnung HA04/);

    await seite.click('[data-a="bezahlt"]');
    await seite.click('#abf-form button[type=submit]');
    await seite.waitForFunction(() => document.querySelector('h1')?.textContent.includes('Bezahlt'));

    await seite.click('.editor-kopf .mehr summary');
    await seite.click('[data-a="storno"]');
    await seite.fill('#abf-wert', 'Test');
    await seite.click('#abf-form button[type=submit]');
    await seite.waitForFunction(() => document.querySelector('h1')?.textContent.includes('Stornorechnung HA05'));
  });

  test('Board, Suche und Kalender', async (t) => {
    if (!browser) return t.skip('Chromium nicht verfügbar');
    await seite.goto(`${basis}#/auftraege`);
    await seite.waitForSelector('.board-spalte');
    assert.equal(await seite.locator('.board-spalte').count(), 7);

    await seite.keyboard.press('Control+k');
    await seite.fill('#s-eingabe', 'erika');
    await seite.waitForSelector('.suche-treffer li b');
    assert.match(await seite.textContent('.suche-treffer li b'), /Erika Muster/);
    await seite.keyboard.press('Escape');

    await seite.goto(`${basis}#/kalender`);
    await seite.click('#t-neu');
    await seite.fill('#t-titel', 'Umzug Test');
    await seite.click('#t-form button[type=submit]');
    await seite.waitForSelector('.kal-termin');
    assert.equal(fehler.length, 0, fehler.join('\n'));
  });
});
