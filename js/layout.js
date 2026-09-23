/* =====================================================================
   Zentrale Daten – nur hier ändern, gilt für ALLE Seiten
   ===================================================================== */
window.SITE = {
  name: 'Save Your Möbel',
  phone: '0174 9585385',
  phoneLink: '+491749585385',
  whatsapp: '491749585385',          // internationales Format ohne +
  email: 'info@saveyourmobel.de',     // TODO: echte E-Mail prüfen
  address: 'Musterstraße 1, 12345 Musterstadt', // TODO: echte Adresse
  logo: 'img/logo.png',               // Logo-Datei (fehlt sie, wird das Schild-Symbol gezeigt)
  // Optional: Formular-Dienst (z. B. https://formspree.io/f/XXXX). Leer = E-Mail-Programm
  formEndpoint: ''
};

const NAV = [
  ['privatumzug.html', 'Privatumzug'],
  ['firmenumzug.html', 'Firmenumzug'],
  ['entruempelung.html', 'Entrümpelung'],
  ['ueber-uns.html', 'Über uns'],
  ['faq.html', 'FAQ']
];

/* ===== Icons (Linien-Stil) ===== */
const ICONS = {
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  home: '<path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
  cap: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  truck: '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkSquare: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  box: '<path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  whatsapp: '<path d="M3 21l1.7-4.9A9 9 0 1 1 8 19.5z"/><path d="M9 10c0 3 2 5 5 5l1.5-1.5-2-1-1 1c-1 0-2.5-1.5-2.5-2.5l1-1-1-2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'
};
const icon = (name, cls = '') =>
  `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
window.icon = icon;

/* ===== Kopfzeile ===== */
const page = location.pathname.split('/').pop() || 'index.html';
const logoHtml = `<a href="index.html" class="logo" aria-label="${SITE.name} – Startseite">
  <img src="${SITE.logo}" alt="${SITE.name}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'logo__fallback',innerHTML:window.icon('shield')+'<b>SAVE YOUR <em>MÖBEL</em></b>'}))">
</a>`;

document.getElementById('site-header').outerHTML = `
<header class="header">
  <div class="container header__inner">
    ${logoHtml}
    <nav class="nav" id="nav" aria-label="Hauptmenü">
      ${NAV.map(([href, label]) => `<a href="${href}"${href === page ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
      <a href="anfrage.html" class="nav__cta-mobile btn">Kostenlos anfragen</a>
    </nav>
    <a href="tel:${SITE.phoneLink}" class="btn btn--pill header__phone">${icon('phone')}<span>${SITE.phone}</span></a>
    <button class="nav-toggle" aria-label="Menü öffnen" aria-controls="nav" aria-expanded="false">${icon('menu')}</button>
  </div>
</header>`;

/* ===== Fußzeile ===== */
document.getElementById('site-footer').outerHTML = `
<section class="cta-band">
  <div class="container cta-band__inner">
    <div>
      <h2>Bereit für Ihren <span class="red">stressfreien Umzug?</span></h2>
      <p>Kostenlos und unverbindlich anfragen – Antwort innerhalb von 24 Stunden.</p>
    </div>
    <div class="cta-band__actions">
      <a href="anfrage.html" class="btn">Kostenlos anfragen</a>
      <a href="tel:${SITE.phoneLink}" class="btn btn--outline-light">${icon('phone')} ${SITE.phone}</a>
    </div>
  </div>
</section>
<footer class="footer">
  <div class="container footer__grid">
    <div>
      <div class="footer__brand">${icon('shield')} SAVE YOUR MÖBEL</div>
      <p>Professionelle Umzüge deutschlandweit – schnell, sicher &amp; stressfrei.</p>
    </div>
    <div>
      <h4>Leistungen</h4>
      <a href="privatumzug.html">Privatumzug</a>
      <a href="firmenumzug.html">Firmenumzug</a>
      <a href="entruempelung.html">Entrümpelung</a>
      <a href="anfrage.html?leistung=Montage">Montage</a>
    </div>
    <div>
      <h4>Unternehmen</h4>
      <a href="ueber-uns.html">Über uns</a>
      <a href="faq.html">FAQ</a>
      <a href="impressum.html">Impressum</a>
      <a href="datenschutz.html">Datenschutz</a>
    </div>
    <div>
      <h4>Kontakt</h4>
      <a href="tel:${SITE.phoneLink}">${icon('phone')} ${SITE.phone}</a>
      <a href="mailto:${SITE.email}">${icon('mail')} ${SITE.email}</a>
      <span>${icon('pin')} ${SITE.address}</span>
    </div>
  </div>
  <div class="container footer__bottom">© ${new Date().getFullYear()} ${SITE.name}. Alle Rechte vorbehalten.</div>
</footer>
<a class="wa-float" href="https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent('Hallo Save Your Möbel, ich habe eine Frage:')}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon('whatsapp')}</a>`;

/* ===== Platzhalter <i data-icon="…"> durch SVG ersetzen ===== */
document.querySelectorAll('[data-icon]').forEach(el => { el.outerHTML = icon(el.dataset.icon, el.className); });
/* Telefon-Links auf Inhaltsseiten */
document.querySelectorAll('[data-phone]').forEach(a => { a.href = `tel:${SITE.phoneLink}`; });

/* ===== Mobiles Menü ===== */
const nav = document.getElementById('nav');
const toggle = document.querySelector('.nav-toggle');
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', open);
});

/* ===== FAQ: immer nur eine Frage offen ===== */
document.querySelectorAll('.faq details').forEach(d => d.addEventListener('toggle', () => {
  if (d.open) d.parentElement.querySelectorAll('details[open]').forEach(o => o !== d && (o.open = false));
}));
