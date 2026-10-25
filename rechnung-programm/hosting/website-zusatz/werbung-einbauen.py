#!/usr/bin/env python3
"""Baut das Werbe-Pixel (nur mit Einwilligung) in die laufende Website ein.
Aufruf: python3 werbung-einbauen.py <Website-Ordner> <Pixel-ID>   (Pixel-ID leer = Pixel entfernen)"""
import pathlib, re, shutil, sys

ziel = pathlib.Path(sys.argv[1])
pixel = re.sub(r'[^A-Za-z0-9]', '', sys.argv[2] if len(sys.argv) > 2 else '')
kopf = ziel / 'includes' / 'kopf.php'
schutz = ziel / 'datenschutz.php'
if not kopf.is_file():
    sys.exit('includes/kopf.php nicht gefunden – ist das der Website-Ordner?')

# 1) Skript kopieren und in den Seitenkopf aller Seiten einbinden
(ziel / 'js').mkdir(exist_ok=True)
shutil.copy(pathlib.Path(__file__).with_name('werbung.js'), ziel / 'js' / 'werbung.js')
text = re.sub(r'\n?\s*<script src="/js/werbung\.js[^>]*></script>', '', kopf.read_text(encoding='utf-8'))
if pixel:
    text = text.rstrip('\n') + f'\n    <script src="/js/werbung.js?v=1" data-pixel="{pixel}" defer></script>\n'
kopf.write_text(text, encoding='utf-8')

# 2) Abschnitt in der Datenschutzerklärung
if schutz.is_file():
    s = schutz.read_text(encoding='utf-8')
    s = re.sub(r'\n?<!-- WERBUNG-ANFANG -->.*?<!-- WERBUNG-ENDE -->', '', s, flags=re.S)
    if pixel:
        abschnitt = '''<!-- WERBUNG-ANFANG -->
        <h2 style="margin-top:28px">Werbe-Messung mit OpenAI (nur mit Einwilligung)</h2>
        <p>Wenn Sie im Hinweis auf unserer Website „Akzeptieren“ wählen, laden wir ein Mess-Pixel der OpenAI Ireland Ltd. bzw. OpenAI, L.L.C. (USA). Damit können wir messen, ob Besucher über Werbeanzeigen zu uns kommen und z.&nbsp;B. eine Anfrage senden. Dabei werden Informationen wie aufgerufene Seiten, Zeitpunkt, IP-Adresse und Geräte- bzw. Browserangaben an OpenAI übertragen; eine Übermittlung in die USA ist möglich. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Ohne Einwilligung wird das Pixel nicht geladen.</p>
        <p>Sie können Ihre Entscheidung jederzeit ändern: <button type="button" onclick="window.SYM_werbung_aendern &amp;&amp; SYM_werbung_aendern()" style="padding:8px 14px;border-radius:999px;border:2px solid #e53935;background:#fff;color:#e53935;font-weight:700;cursor:pointer">Einwilligung ändern</button></p>
        <!-- WERBUNG-ENDE -->
'''
        stelle = s.rfind('</main>')
        if stelle == -1:
            stelle = s.rfind('<?php include')
        s = s[:stelle] + abschnitt + '    ' + s[stelle:]
    schutz.write_text(s, encoding='utf-8')

print('Werbe-Pixel eingebaut (nur nach Einwilligung).' if pixel else 'Werbe-Pixel entfernt.')
