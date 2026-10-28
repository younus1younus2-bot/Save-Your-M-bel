# Website-Container: PHP + Apache mit Versions-Umschaltung (aktive Version + Vorschau per Cookie)
FROM php:8.3-apache
RUN a2enmod rewrite headers \
 && rm -f /etc/apache2/sites-enabled/000-default.conf \
 && mkdir -p /var/www/versionen/_v /usr/local/lib/sym /etc/website-steuerung
COPY versionen.conf /etc/apache2/sites-enabled/000-versionen.conf
COPY vorschau.php /usr/local/lib/sym/vorschau.php
