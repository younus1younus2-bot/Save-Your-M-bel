"""Einsatzorte für die Stadtseiten (gartenbau-<ort>.html).

Reihenfolge = Reihenfolge auf der Übersichtsseite. Die Liste in js/main.js (SITE.areas)
muss dieselben Namen enthalten. Nach Änderungen:  python3 tools/ortsseiten.py && python3 tools/seo.py
"""

def slug(name):
    s = name.lower()
    for a, b in (('ä', 'ae'), ('ö', 'oe'), ('ü', 'ue'), ('ß', 'ss')):
        s = s.replace(a, b)
    return 'gartenbau-' + '-'.join(''.join(c if c.isalnum() else ' ' for c in s).split()) + '.html'

# Landschaftstypen: bestimmen, welche Gartensituationen auf der Seite beschrieben werden
REGION = {
    'stadt': ('Stadtgärten mit wenig Platz', [
        ('Kleine Gärten groß wirken lassen', 'Reihenhaus- und Stadtgärten sind oft schmal. Mit klarer Wegeführung, Ebenen und passenden Pflanzen wirkt auch ein kleiner Garten großzügig.'),
        ('Sichtschutz zum Nachbarn', 'Wo Gärten dicht an dicht liegen, sorgen Sichtschutzwände, Hecken oder bepflanzte Rankgerüste für Privatsphäre auf der Terrasse.'),
        ('Wenig Zufahrt, saubere Logistik', 'Ohne Einfahrt in den Garten transportieren wir Material mit kleinen Maschinen und Schubkarren – und lassen Hausflur und Gehweg sauber zurück.'),
    ]),
    'bergisch': ('Hanggrundstücke im Bergischen Land', [
        ('Hänge sicher abfangen', 'Viele Grundstücke liegen am Hang. Stützmauern, Gabionen oder Trockenmauern schaffen ebene Flächen und halten den Boden dauerhaft.'),
        ('Treppen und Wege im Gefälle', 'Bequeme Gartentreppen und rutschfeste Wege verbinden die Ebenen – mit Beleuchtung auch abends sicher.'),
        ('Wasser richtig ableiten', 'Bei Gefälle und lehmigem Boden ist Drainage wichtig, damit Regenwasser nicht auf der Terrasse steht oder hinter Mauern drückt.'),
    ]),
    'rhein': ('Gärten nahe am Rhein', [
        ('Ebene Flächen gut nutzen', 'Viele Grundstücke sind eben – ideal für großzügige Terrassen, Rasenflächen und Beete mit klarer Linienführung.'),
        ('Rasen und Bewässerung', 'Durchlässige, oft sandige Böden trocknen im Sommer schnell aus. Eine automatische Bewässerung hält Rasen und Beete grün.'),
        ('Einfahrten und Stellplätze', 'Für Einfahrten bauen wir einen tragfähigen Unterbau und achten darauf, dass Regenwasser versickern kann.'),
    ]),
    'vorgebirge': ('Gärten am Vorgebirge', [
        ('Fruchtbare Böden nutzen', 'Die Region ist für ihren Obst- und Gemüseanbau bekannt. Die guten Böden eignen sich hervorragend für Staudenbeete, Hecken und Obstbäume.'),
        ('Obstbäume richtig schneiden', 'Viele Gärten haben alte Obstbäume. Mit fachgerechtem Schnitt bleiben sie gesund und tragen wieder gut.'),
        ('Lehm und Staunässe', 'Wo der Boden schwer und lehmig ist, verbessern wir ihn vor der Pflanzung und sorgen bei Terrassen für eine gute Entwässerung.'),
    ]),
    'erft': ('Einfamilienhaus- und Neubaugärten', [
        ('Neubau-Garten von Grund auf', 'Nach dem Hausbau ist der Garten oft nur Baustellenboden. Wir planen und bauen alles: Terrasse, Rasen, Beete, Einfahrt und Zaun.'),
        ('Terrasse und Einfahrt', 'Großformatige Platten für die Terrasse, befahrbares Pflaster für die Einfahrt – fachgerecht verlegt und passend zum Haus.'),
        ('Sichtschutz in Neubaugebieten', 'Wo neue Häuser nah beieinander stehen, sorgen Sichtschutzzäune und schnell wachsende Hecken für Privatsphäre.'),
    ]),
    'sieg': ('Gärten zwischen Sieg und Rhein', [
        ('Vielfältige Grundstücke', 'Von der Stadtvilla bis zum Reihenhaus: Wir passen Planung und Ausführung an Grundstück, Boden und Ihre Wünsche an.'),
        ('Gartenpflege das ganze Jahr', 'Heckenschnitt, Rasenpflege und Gehölzschnitt – einmalig oder regelmäßig mit Pflegevertrag.'),
        ('Terrassen und Wege', 'Neue Terrassen, Gartenwege und Einfahrten mit solidem Unterbau, damit nichts absackt oder wackelt.'),
    ]),
}

# name, Kreis/Lage, Landschaftstyp, Ortsteile, eigener Einleitungssatz, Nachbarorte
ORTE = [
    ('Köln', 'Hier ist unser Betrieb zu Hause', 'stadt', ['Porz', 'Rodenkirchen', 'Lindenthal', 'Ehrenfeld', 'Nippes', 'Mülheim', 'Kalk', 'Sülz'],
     'In Köln sind wir zu Hause: Von unserem Standort im rechtsrheinischen Köln sind wir schnell in allen Stadtteilen – vom kleinen Innenhof in der Südstadt bis zum Familiengarten in Porz oder Rodenkirchen.',
     ['Lövenich', 'Bergisch Gladbach', 'Leverkusen', 'Hürth']),
    ('Bergisch Gladbach', 'Rheinisch-Bergischer Kreis', 'bergisch', ['Refrath', 'Bensberg', 'Paffrath', 'Schildgen'],
     'Bergisch Gladbach liegt direkt an der Kölner Stadtgrenze. Ob Refrath, Bensberg oder Paffrath – wir kennen die typischen Hang- und Waldrandgrundstücke der Stadt.',
     ['Köln', 'Odenthal', 'Rösrath', 'Overath']),
    ('Siegburg', 'Rhein-Sieg-Kreis', 'sieg', ['Kaldauen', 'Wolsdorf', 'Stallberg', 'Braschoss'],
     'In der Kreisstadt Siegburg gestalten und pflegen wir Gärten vom Stadtzentrum bis Kaldauen und Braschoss.',
     ['Troisdorf', 'Sankt Augustin', 'Lohmar']),
    ('Troisdorf', 'Rhein-Sieg-Kreis', 'sieg', ['Sieglar', 'Spich', 'Oberlar', 'Bergheim'],
     'Troisdorf liegt zwischen Köln und Siegburg – für uns eine kurze Anfahrt. Wir arbeiten in Sieglar, Spich, Oberlar und allen anderen Stadtteilen.',
     ['Siegburg', 'Sankt Augustin', 'Köln']),
    ('Sankt Augustin', 'Rhein-Sieg-Kreis', 'sieg', ['Hangelar', 'Menden', 'Niederpleis', 'Mülldorf'],
     'In Sankt Augustin betreuen wir Gärten in Hangelar, Menden, Niederpleis und Mülldorf – von der Neuanlage bis zur regelmäßigen Pflege.',
     ['Siegburg', 'Troisdorf', 'Bornheim']),
    ('Wesseling', 'Rhein-Erft-Kreis', 'rhein', ['Berzdorf', 'Keldenich', 'Urfeld'],
     'Wesseling liegt am Rhein im Süden von Köln. Wir gestalten Gärten in der Innenstadt ebenso wie in Berzdorf, Keldenich und Urfeld.',
     ['Brühl', 'Bornheim', 'Köln']),
    ('Brühl', 'Rhein-Erft-Kreis', 'vorgebirge', ['Vochem', 'Pingsdorf', 'Kierberg', 'Badorf'],
     'Brühl liegt am Rand des Vorgebirges. Wir planen, bauen und pflegen Gärten in Vochem, Pingsdorf, Kierberg und allen weiteren Stadtteilen.',
     ['Hürth', 'Wesseling', 'Bornheim']),
    ('Hürth', 'Rhein-Erft-Kreis', 'erft', ['Efferen', 'Hermülheim', 'Fischenich', 'Kalscheuren'],
     'Hürth grenzt direkt an Köln. In Efferen, Hermülheim, Fischenich und den übrigen Stadtteilen gestalten wir Gärten rund ums Einfamilienhaus.',
     ['Köln', 'Brühl', 'Frechen']),
    ('Frechen', 'Rhein-Erft-Kreis', 'erft', ['Königsdorf', 'Bachem', 'Buschbell', 'Habbelrath'],
     'In Frechen sind wir in Königsdorf, Bachem, Buschbell und Habbelrath für Sie da – für neue Gärten, Terrassen und die Pflege bestehender Anlagen.',
     ['Hürth', 'Kerpen', 'Lövenich']),
    ('Leverkusen', 'kreisfreie Stadt', 'rhein', ['Opladen', 'Schlebusch', 'Wiesdorf', 'Manfort'],
     'Leverkusen liegt nördlich von Köln am Rhein. Wir arbeiten in Opladen, Schlebusch, Wiesdorf und allen anderen Stadtteilen.',
     ['Köln', 'Bergisch Gladbach', 'Monheim']),
    ('Lövenich', 'Stadtteil im Kölner Westen', 'stadt', ['Weiden', 'Junkersdorf', 'Widdersdorf'],
     'Lövenich im Kölner Westen ist geprägt von Einfamilien- und Reihenhäusern. Wir gestalten und pflegen Gärten hier und in den Nachbarvierteln Weiden, Junkersdorf und Widdersdorf.',
     ['Köln', 'Frechen', 'Pulheim']),
    ('Pulheim', 'Rhein-Erft-Kreis', 'erft', ['Brauweiler', 'Stommeln', 'Sinnersdorf', 'Dansweiler'],
     'In Pulheim sind wir in Brauweiler, Stommeln, Sinnersdorf und Dansweiler unterwegs – mit allem, was ein schöner Garten braucht.',
     ['Lövenich', 'Köln', 'Dormagen']),
    ('Bornheim', 'Rhein-Sieg-Kreis', 'vorgebirge', ['Roisdorf', 'Hersel', 'Merten', 'Sechtem'],
     'Bornheim ist die Stadt am Vorgebirge. In Roisdorf, Hersel, Merten, Sechtem und den anderen Orten gestalten und pflegen wir Gärten aller Größen.',
     ['Brühl', 'Wesseling', 'Sankt Augustin']),
    ('Overath', 'Rheinisch-Bergischer Kreis', 'bergisch', ['Immekeppel', 'Marialinden', 'Heiligenhaus', 'Untereschbach'],
     'Overath liegt mitten im Bergischen Land. In Immekeppel, Marialinden, Heiligenhaus und Untereschbach kennen wir die typischen Hanglagen gut.',
     ['Rösrath', 'Lohmar', 'Bergisch Gladbach']),
    ('Lohmar', 'Rhein-Sieg-Kreis', 'bergisch', ['Wahlscheid', 'Birk', 'Donrath', 'Neuhonrath'],
     'Lohmar liegt am Übergang vom Siegtal ins Bergische Land. Wir arbeiten in Wahlscheid, Birk, Donrath und allen weiteren Ortsteilen.',
     ['Siegburg', 'Overath', 'Rösrath']),
    ('Rösrath', 'Rheinisch-Bergischer Kreis', 'bergisch', ['Hoffnungsthal', 'Forsbach', 'Kleineichen', 'Stümpen'],
     'Rösrath grenzt direkt an Köln. In Hoffnungsthal, Forsbach, Kleineichen und Stümpen gestalten wir Gärten am Hang und am Waldrand.',
     ['Köln', 'Overath', 'Bergisch Gladbach']),
    ('Odenthal', 'Rheinisch-Bergischer Kreis', 'bergisch', ['Altenberg', 'Voiswinkel', 'Blecher', 'Eikamp'],
     'Odenthal mit dem bekannten Altenberg liegt im Grünen nördlich von Bergisch Gladbach. Wir arbeiten in Voiswinkel, Blecher, Eikamp und allen anderen Ortsteilen.',
     ['Bergisch Gladbach', 'Leverkusen', 'Köln']),
    ('Dormagen', 'Rhein-Kreis Neuss', 'rhein', ['Zons', 'Nievenheim', 'Hackenbroich', 'Horrem'],
     'Dormagen liegt am Rhein zwischen Köln und Neuss. Ob in der Innenstadt, in Zons, Nievenheim oder Hackenbroich – wir sind für Sie da.',
     ['Monheim', 'Pulheim', 'Leverkusen']),
    ('Kerpen', 'Rhein-Erft-Kreis', 'erft', ['Sindorf', 'Horrem', 'Türnich', 'Brüggen'],
     'In Kerpen sind wir in Sindorf, Horrem, Türnich, Brüggen und allen weiteren Stadtteilen tätig – vom Neubaugarten bis zur Gartenpflege.',
     ['Frechen', 'Hürth', 'Pulheim']),
    ('Monheim', 'Kreis Mettmann', 'rhein', ['Baumberg', 'Altstadt', 'Berliner Viertel'],
     'Monheim am Rhein liegt gegenüber von Dormagen. Wir gestalten und pflegen Gärten in Monheim und Baumberg.',
     ['Leverkusen', 'Dormagen', 'Köln']),
]

ORT_BY_NAME = {o[0]: o for o in ORTE}
