#!/usr/bin/env python3
"""Baut den Cookie-/Einwilligungs-Banner (und optional das OpenAI-Werbe-Pixel) in die laufende Website ein.
Aufruf: python3 werbung-einbauen.py <Website-Ordner> [Pixel-ID]
Kann beliebig oft ausgeführt werden – vorhandene Einträge werden ersetzt, nicht verdoppelt."""
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
attr = f' data-pixel="{pixel}"' if pixel else ''
text = text.rstrip('\n') + f'\n    <script src="/js/werbung.js?v=2"{attr} defer></script>\n'
kopf.write_text(text, encoding='utf-8')

# 2) Abschnitte in der Datenschutzerklärung
if schutz.is_file():
    s = schutz.read_text(encoding='utf-8')
    s = re.sub(r'\n?\s*<!-- WERBUNG-ANFANG -->.*?<!-- WERBUNG-ENDE -->\n?', '\n', s, flags=re.S)
    teile = ['''<!-- WERBUNG-ANFANG -->
        <h2 style="margin-top:28px">Cookies und Einwilligungen</h2>
        <p>Beim ersten Besuch fragen wir Sie in einem Hinweisfenster, welchen optionalen Diensten Sie zustimmen. Notwendige Funktionen (z.&nbsp;B. das Anfrageformular und das Speichern Ihrer Auswahl) sind immer aktiv. Optionale Dienste werden erst nach Ihrer Einwilligung geladen (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Ihre Auswahl speichern wir zusammen mit Datum und Uhrzeit nur in Ihrem Browser (localStorage, Schlüssel „sym_einwilligung“) für 12 Monate; danach fragen wir erneut. Diese Speicherung ist für die Verwaltung Ihrer Einwilligung erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).</p>
        <p>Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen oder ändern – über den Keks-Knopf unten links auf jeder Seite oder hier: <button type="button" onclick="window.SYM_cookie_einstellungen &amp;&amp; SYM_cookie_einstellungen()" style="padding:8px 14px;border-radius:999px;border:2px solid #e53935;background:#fff;color:#e53935;font-weight:700;cursor:pointer">Cookie-Einstellungen öffnen</button></p>
        <h2 style="margin-top:28px">Externe Medien: Google Maps (nur mit Einwilligung)</h2>
        <p>Auf einigen Seiten können Sie eine Karte von Google Maps (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland; Muttergesellschaft Google LLC, USA) anzeigen. Die Karte wird erst geladen, wenn Sie in den Cookie-Einstellungen „Externe Medien“ zustimmen oder die Karte per Klick laden. Dabei werden u.&nbsp;a. Ihre IP-Adresse und Geräteinformationen an Google übertragen; eine Übermittlung in die USA ist möglich. Google LLC ist unter dem EU-US Data Privacy Framework zertifiziert. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG).</p>
''']
    if pixel:
        teile.append('''        <h2 style="margin-top:28px">Marketing: Werbe-Messung mit OpenAI (nur mit Einwilligung)</h2>
        <p>Wenn Sie in den Cookie-Einstellungen „Marketing“ zustimmen, laden wir ein Mess-Pixel der OpenAI Ireland Ltd. bzw. OpenAI, L.L.C. (USA). Damit messen wir, ob Besucher über Werbeanzeigen zu uns kommen und z.&nbsp;B. eine Anfrage senden. Dabei werden Informationen wie aufgerufene Seiten, Zeitpunkt, IP-Adresse sowie Geräte- und Browserangaben an OpenAI übertragen; eine Übermittlung in die USA ist möglich. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Ohne Einwilligung wird das Pixel nicht geladen.</p>
''')
    teile.append('        <!-- WERBUNG-ENDE -->\n')
    abschnitt = ''.join(teile)
    stelle = s.rfind('</main>')
    if stelle == -1:
        stelle = s.rfind('<?php include')
    s = s[:stelle] + abschnitt + '    ' + s[stelle:]
    schutz.write_text(s, encoding='utf-8')

print('Cookie-Banner eingebaut' + (' (mit Werbe-Pixel nach Einwilligung).' if pixel else '.'))
