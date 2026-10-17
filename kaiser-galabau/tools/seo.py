#!/usr/bin/env python3
"""SEO für die Kaiser-Website erzeugen.

Liest die Firmendaten aus js/main.js (window.SITE) und schreibt in jede Seite:
- Seitentitel und Beschreibung (was Google in den Suchergebnissen zeigt)
- Canonical-Link und Vorschau für WhatsApp/Facebook (Open Graph), sobald eine Domain eingetragen ist
- strukturierte Daten für Google (JSON-LD): Firma, Leistung, Brotkrumen-Navigation, Fragen & Antworten
- Telefon, E-Mail, Stadt, Adresse, Öffnungszeiten und Einsatzorte direkt ins HTML
  (vorher nur per JavaScript, jetzt auch für Suchmaschinen ohne JavaScript lesbar)
Außerdem sitemap.xml (nur mit Domain) und robots.txt.

Aufruf im Ordner kaiser-galabau:   python3 tools/seo.py
Beliebig oft wiederholbar – ersetzt nur den markierten SEO-Block.
"""
import html
import json
import os
import re
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from orte import ORTE, slug as ort_slug  # noqa: E402
ORT_PAGES = {ort_slug(o[0]): o for o in ORTE}

# ---------- Firmendaten aus js/main.js ----------
js = open('js/main.js', encoding='utf-8').read()
site_block = js[js.index('window.SITE = {'):js.index('};', js.index('window.SITE = {'))]
SITE = dict(re.findall(r"^\s*(\w+): '([^']*)'", site_block, re.M))
SITE['hours'] = re.findall(r"\['([^']*)', '([^']*)'\]", re.search(r'hours: \[(.*)\],', site_block).group(1))
SITE['areas'] = re.findall(r"'([^']*)'", re.search(r'areas: \[(.*)\],', site_block).group(1))
SERVICES = re.findall(r"\{ slug: '([^']+)',\s*title: '([^']+)',\s*short: '([^']+)'", js)

BRAND = f"{SITE['name']} {SITE['claim']}"          # Kaiser Garten- & Landschaftsbau
CITY = SITE['city']
DOMAIN = SITE.get('domain', '').rstrip('/')
PHONE = SITE['phone']
ADDRESS = f"{SITE['street']}, {SITE['zip']} {CITY}"

def url(page):
    return f"{DOMAIN}/" if page == 'index.html' else f"{DOMAIN}/{page}"

# ---------- Titel & Beschreibungen (Titel ≤ ca. 60, Beschreibung ≤ ca. 155 Zeichen) ----------
C = CITY
PAGES = {
  'index.html': (f"Garten- & Landschaftsbau in {C} | Kaiser",
                 f"Ihr Gartenbauer in {C}: Gartenplanung, Gartenpflege, Terrassen, Pflaster, Zäune, Mauern & Gartenlicht. Kostenlose Beratung: {PHONE}."),
  'leistungen.html': (f"Leistungen im Gartenbau in {C} | Kaiser",
                 f"Alle Leistungen von {BRAND} in {C} und Umgebung: Planung, Pflege, Terrassen, Licht, Treppen, Mauern, Zäune, Rasen & Bepflanzung."),
  'gartenplanung.html': (f"Gartenplanung & Gartengestaltung in {C} | Kaiser",
                 f"Gartenplanung in {C}: Beratung vor Ort, Entwurf, Pflanzplan und Umsetzung aus einer Hand. Jetzt kostenlos beraten lassen."),
  'gartenpflege.html': (f"Gartenpflege & Heckenschnitt in {C} | Kaiser",
                 f"Gartenpflege in {C}: Heckenschnitt, Rasenpflege, Baum- und Gehölzpflege – einmalig oder regelmäßig im Pflegevertrag. Jetzt anfragen."),
  'terrassen-auffahrten.html': (f"Terrassenbau & Pflasterarbeiten in {C} | Kaiser",
                 f"Terrassen, Wege und Einfahrten in {C}: Feinsteinzeug, Naturstein und Pflaster fachgerecht verlegt – mit solidem Unterbau. Jetzt anfragen."),
  'lichtplanung.html': (f"Gartenbeleuchtung & Lichtplanung in {C} | Kaiser",
                 f"Gartenbeleuchtung in {C}: Lichtkonzept, LED-Strahler, Wege- und Terrassenlicht, smarte Steuerung. Planung und Einbau vom Fachbetrieb."),
  'treppen-mauern.html': (f"Gartentreppen, Mauern & Gabionen in {C} | Kaiser",
                 f"Stützmauern, Trockenmauern, Gabionen und Gartentreppen in {C} – stabil, sicher und schön. Hangbefestigung vom Fachbetrieb Kaiser."),
  'holzarbeiten.html': (f"Zaunbau, Sichtschutz & Holzterrassen in {C} | Kaiser",
                 f"Sichtschutz, Zäune, Doppelstabmatten, Holzterrassen und Pergolen in {C} – maßgenau gebaut von {BRAND}."),
  'rasen-bepflanzung.html': (f"Rollrasen, Bepflanzung & Bewässerung in {C} | Kaiser",
                 f"Rollrasen verlegen, Rasen neu anlegen, Hecken und Beete bepflanzen, automatische Bewässerung in {C}. {BRAND} berät Sie gern."),
  'referenzen.html': (f"Referenzen & Vorher-Nachher aus {C} | Kaiser",
                 f"Projekte von {BRAND}: Terrassen, Einfahrten, Zäune, Mauern, Beete und Gartenbeleuchtung in {C} – mit Vorher-Nachher-Vergleich."),
  'ueber-uns.html': (f"Über uns – Ihr Gartenbauer in {C} | Kaiser",
                 f"Lernen Sie uns kennen: ehrliche Beratung, ein fester Ansprechpartner und sorgfältiges Handwerk für Gärten in {C} und Umgebung."),
  'kontakt.html': (f"Kontakt & Angebot anfragen | Kaiser Gartenbau {C}",
                 f"Kostenlose Beratung für Ihren Garten in {C}: Rufen Sie an unter {PHONE}, schreiben Sie per WhatsApp oder nutzen Sie unser Anfrageformular."),
  'impressum.html': (f"Impressum | {BRAND}", f"Impressum von {BRAND}, {C}."),
  'datenschutz.html': (f"Datenschutzerklärung | {BRAND}", f"Datenschutzerklärung von {BRAND}."),
  '404.html': (f"Seite nicht gefunden | {BRAND}", f"Diese Seite gibt es leider nicht. Zur Startseite von {BRAND}."),
}
PAGES['einsatzgebiet.html'] = (f"Einsatzgebiet: Gartenbau in {C} & Umgebung | Kaiser",
    f"{BRAND} ist in {C} und {len(ORTE) - 1} Orten der Umgebung für Sie da: " + ', '.join(o[0] for o in ORTE[1:6]) + " und mehr.")
for _p, _o in ORT_PAGES.items():
    PAGES[_p] = (f"Gartenbau in {_o[0]} – Planung & Pflege | Kaiser",
                 f"Ihr Gartenbauer in {_o[0]} ({_o[3][0]}, {_o[3][1]} u. a.): Planung, Pflege, Terrassen, Zäune & Mauern. Kostenlose Beratung: {PHONE}.")
NOINDEX = {'datenschutz.html', '404.html'}
SERVICE_SLUGS = {slug: (title, short) for slug, title, short in SERVICES}
OG_IMAGE = {'index.html': 'img/projekte/abend-nachher.jpg', 'referenzen.html': 'img/projekte/einfahrt-nachher.jpg',
            'ueber-uns.html': 'img/projekte/beet-nachher.jpg'}

# ---------- strukturierte Daten ----------
DAYS = {'Mo': 'Monday', 'Di': 'Tuesday', 'Mi': 'Wednesday', 'Do': 'Thursday', 'Fr': 'Friday', 'Sa': 'Saturday', 'So': 'Sunday'}
ORDER = list(DAYS)

def opening_hours():
    out = []
    for days, times in SITE['hours']:
        t = re.findall(r'(\d{1,2}):(\d{2})', times)
        if len(t) != 2:
            continue  # z. B. "nach Vereinbarung"
        d = re.findall(r'Mo|Di|Mi|Do|Fr|Sa|So', days)
        if '–' in days and len(d) == 2:
            d = ORDER[ORDER.index(d[0]):ORDER.index(d[1]) + 1]
        out.append({'@type': 'OpeningHoursSpecification', 'dayOfWeek': [DAYS[x] for x in d],
                    'opens': f'{int(t[0][0]):02d}:{t[0][1]}', 'closes': f'{int(t[1][0]):02d}:{t[1][1]}'})
    return out

BIZ_ID = f'{DOMAIN}/#firma' if DOMAIN else '#firma'

def business():
    b = {
        '@type': 'HomeAndConstructionBusiness', '@id': BIZ_ID, 'name': BRAND,
        'description': f'Fachbetrieb für Garten- und Landschaftsbau in {CITY} und Umgebung: Gartenplanung, Gartenpflege, Terrassen, Pflaster, Zäune, Mauern, Gartenbeleuchtung, Rasen und Bepflanzung.',
        'telephone': SITE['phoneLink'], 'email': SITE['email'],
        'address': {'@type': 'PostalAddress', 'streetAddress': SITE['street'], 'postalCode': SITE['zip'],
                    'addressLocality': CITY, 'addressCountry': 'DE'},
        'areaServed': [{'@type': 'City', 'name': a} for a in SITE['areas'] if not re.search(r'\d', a)],
        'openingHoursSpecification': opening_hours(),
        'hasOfferCatalog': {'@type': 'OfferCatalog', 'name': 'Leistungen',
                            'itemListElement': [{'@type': 'Offer', 'itemOffered': {'@type': 'Service', 'name': t}} for _, t, _ in SERVICES]},
    }
    if DOMAIN:
        b.update({'url': f'{DOMAIN}/', 'logo': f'{DOMAIN}/img/logo.png', 'image': f'{DOMAIN}/img/projekte/abend-nachher.jpg'})
    same = [SITE[k] for k in ('instagram', 'facebook') if SITE.get(k)]
    if same:
        b['sameAs'] = same
    # Bewusst KEINE Sternebewertung: Google erlaubt nur echte, auf der Seite sichtbare Bewertungen.
    return b

def strip(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()

def faq(page_html):
    qs = re.findall(r'<details><summary>(.*?)</summary><div><p>(.*?)</p></div></details>', page_html, re.S)
    if not qs:
        return None
    return {'@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': strip(q), 'acceptedAnswer': {'@type': 'Answer', 'text': strip(a)}} for q, a in qs]}

def breadcrumbs(page):
    name = lambda p: strip(re.search(r'<h1[^>]*>(.*?)</h1>', open(p, encoding='utf-8').read(), re.S).group(1)) if p != 'index.html' else 'Startseite'
    trail = [('index.html', 'Startseite')]
    slug = page[:-5]
    if slug in SERVICE_SLUGS:
        trail += [('leistungen.html', 'Leistungen'), (page, SERVICE_SLUGS[slug][0])]
    elif page in ORT_PAGES:
        trail += [('einsatzgebiet.html', 'Einsatzgebiet'), (page, ORT_PAGES[page][0])]
    elif page != 'index.html':
        trail.append((page, re.sub(r'\s+in\s+.*$', '', name(page))))
    if len(trail) < 2 or not DOMAIN:  # Google verlangt vollständige Adressen – erst mit Domain
        return None
    items = []
    for i, (p, n) in enumerate(trail, 1):
        it = {'@type': 'ListItem', 'position': i, 'name': n}
        if DOMAIN:
            it['item'] = url(p)
        items.append(it)
    return {'@type': 'BreadcrumbList', 'itemListElement': items}

def graph(page, page_html):
    g = [business()]
    if page in NOINDEX:
        return {'@context': 'https://schema.org', '@graph': g}
    if page == 'index.html':
        w = {'@type': 'WebSite', 'name': BRAND, 'inLanguage': 'de-DE', 'publisher': {'@id': BIZ_ID}}
        if DOMAIN:
            w['url'] = f'{DOMAIN}/'
        g.append(w)
    slug = page[:-5]
    if slug in SERVICE_SLUGS:
        t, short = SERVICE_SLUGS[slug]
        s = {'@type': 'Service', 'name': t, 'serviceType': t, 'description': short,
             'provider': {'@id': BIZ_ID}, 'areaServed': {'@type': 'City', 'name': CITY}}
        if DOMAIN:
            s['url'] = url(page)
        g.append(s)
    if page in ORT_PAGES:
        s = {'@type': 'Service', 'name': f'Garten- und Landschaftsbau in {ORT_PAGES[page][0]}', 'serviceType': 'Garten- und Landschaftsbau',
             'provider': {'@id': BIZ_ID}, 'areaServed': {'@type': 'City', 'name': ORT_PAGES[page][0]}}
        if DOMAIN:
            s['url'] = url(page)
        g.append(s)
    for extra in (breadcrumbs(page), faq(page_html)):
        if extra:
            g.append(extra)
    return {'@context': 'https://schema.org', '@graph': g}

# ---------- in die Seiten schreiben ----------
def esc(s):
    return html.escape(s, quote=True)

def head_block(page, page_html):
    title, desc = PAGES[page]
    L = ['<!-- SEO:START (automatisch erzeugt von tools/seo.py – nicht von Hand ändern) -->',
         f'  <title>{esc(title)}</title>',
         f'  <meta name="description" content="{esc(desc)}">',
         f'  <meta name="robots" content="{"noindex, follow" if page in NOINDEX else "index, follow, max-image-preview:large"}">',
         '  <meta property="og:type" content="website">',
         '  <meta property="og:locale" content="de_DE">',
         f'  <meta property="og:site_name" content="{esc(BRAND)}">',
         f'  <meta property="og:title" content="{esc(title)}">',
         f'  <meta property="og:description" content="{esc(desc)}">',
         '  <meta name="twitter:card" content="summary_large_image">']
    if DOMAIN:
        img = OG_IMAGE.get(page) or next((s for s in re.findall(r'data-img="([^"]+\.jpg)"', page_html)), 'img/projekte/abend-nachher.jpg')
        L += [f'  <link rel="canonical" href="{url(page)}">',
              f'  <meta property="og:url" content="{url(page)}">',
              f'  <meta property="og:image" content="{DOMAIN}/{img}">']
    hero = re.search(r'class="(?:hero__slide|page-hero)[^"]*">\s*<div class="bg" data-img="([^"]+)"', page_html) or \
           re.search(r'<div class="bg" data-img="([^"]+)"', page_html)
    if hero:  # Hauptbild früh laden (schnellerer Seitenaufbau, wichtig für Google)
        src = hero.group(1)
        L.append(f'  <link rel="preload" as="image" href="{src[:-4] + ".webp" if src.startswith("img/projekte/") else src}" type="{"image/webp" if src.startswith("img/projekte/") else "image/jpeg"}">')
    L.append('  <script type="application/ld+json">' + json.dumps(graph(page, page_html), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>')
    L.append('  <!-- SEO:END -->')
    return '\n'.join(L)

def fill_static(s):
    """Daten, die sonst erst JavaScript einsetzt, schon ins HTML schreiben."""
    vals = {'city': CITY, 'phone': PHONE, 'email': SITE['email'], 'address': ADDRESS, 'name': SITE['name'], 'claim': SITE['claim']}
    s = re.sub(r'(<(\w+)\b[^>]*\bdata-site="(\w+)"[^>]*>)(.*?)(</\2>)',
               lambda m: m.group(1) + html.escape(vals.get(m.group(3), m.group(4)), quote=False) + m.group(5) if m.group(3) in vals else m.group(0), s, flags=re.S)
    s = re.sub(r'(<a href=")#(" data-tel)', rf'\1tel:{SITE["phoneLink"]}\2', s)
    s = re.sub(r'(<a href=")#(" data-mail)', rf'\1mailto:{SITE["email"]}\2', s)
    areas = ''.join(f'<li><a href="{ort_slug(a)}">{html.escape(a)}</a></li>' for a in SITE['areas'])
    s = re.sub(r'(<ul class="area-list"[^>]*id="areas"[^>]*>).*?(</ul>)', rf'\g<1>{areas}\2', s, flags=re.S)
    hours = '<br>'.join(f'{html.escape(d)}: {html.escape(t)}' for d, t in SITE['hours'])
    s = re.sub(r'(<(?:p|span) id="hours(?:-short)?">).*?(</(?:p|span)>)', rf'\g<1>{hours}\2', s, flags=re.S)
    return s

def process(page):
    s = open(page, encoding='utf-8').read()
    s = re.sub(r'\n?\s*<!-- SEO:START.*?<!-- SEO:END -->', '', s, flags=re.S)
    s = re.sub(r'\n\s*<title>.*?</title>', '', s, flags=re.S)
    s = re.sub(r'\n\s*<meta name="description"[^>]*>', '', s)
    s = fill_static(s)
    s = s.replace('<meta name="viewport" content="width=device-width, initial-scale=1">',
                  '<meta name="viewport" content="width=device-width, initial-scale=1">\n  ' + head_block(page, s), 1)
    open(page, 'w', encoding='utf-8').write(s)

pages = sorted(p for p in os.listdir('.') if p.endswith('.html'))
missing = [p for p in pages if p not in PAGES]
if missing:
    sys.exit(f'Für diese Seiten fehlen Titel/Beschreibung in tools/seo.py: {missing}')
for p in pages:
    process(p)

# ---------- sitemap.xml & robots.txt ----------
indexable = [p for p in pages if p not in NOINDEX]
robots = 'User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /daten/\nDisallow: /anfrage.php\n'
if DOMAIN:
    today = date.today().isoformat()
    prio = lambda p: '1.0' if p == 'index.html' else '0.9' if p[:-5] in SERVICE_SLUGS else '0.8' if p in ORT_PAGES else '0.3' if p == 'impressum.html' else '0.7'
    xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    xml += [f'  <url><loc>{url(p)}</loc><lastmod>{today}</lastmod><priority>{prio(p)}</priority></url>' for p in indexable]
    xml.append('</urlset>')
    open('sitemap.xml', 'w', encoding='utf-8').write('\n'.join(xml) + '\n')
    robots += f'\nSitemap: {DOMAIN}/sitemap.xml\n'
elif os.path.exists('sitemap.xml'):
    os.remove('sitemap.xml')
open('robots.txt', 'w', encoding='utf-8').write(robots)

# ---------- Kontrolle ----------
print(f'Stadt: {CITY} | Domain: {DOMAIN or "(noch keine – Canonical/Sitemap/Vorschaubild folgen, sobald eingetragen)"}')
for p in pages:
    t, d = PAGES[p]
    warn = ('  ⚠ Titel lang' if len(t) > 62 else '') + ('  ⚠ Beschreibung lang' if len(d) > 160 else '')
    print(f'{p:28} Titel {len(t):3} | Beschreibung {len(d):3}{warn}')
