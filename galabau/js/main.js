/* =====================================================================
   Kaiser Garten- & Landschaftsbau – zentrale Daten. NUR HIER ändern, gilt für ALLE Seiten.
   ===================================================================== */
window.SITE = {
  name: 'Kaiser',
  claim: 'Garten- & Landschaftsbau',
  phone: '0163 1991538',
  phoneLink: '+491631991538',
  mobile: '',                        // optional: Handynummer, z. B. '0170 1234567'
  whatsapp: '491631991538',          // WhatsApp-Nummer ohne + (leer = Button ausblenden)
  email: 'kaiser.gartenbau@outlook.de',
  street: 'Musterstraße 1',          // TODO
  zip: '12345',                      // TODO
  city: 'Musterstadt',               // TODO: Ihre Stadt – erscheint in vielen Texten
  hours: [['Mo – Fr', '7:00 – 18:00'], ['Sa', 'nach Vereinbarung']],
  instagram: '',                     // z. B. 'https://instagram.com/kaiser.galabau' (leer = ausblenden)
  facebook: '',
  founded: '',                       // z. B. '2015' – leer = wird nicht angezeigt
  // Orte im Einsatzgebiet (Startseite + Kontakt)
  areas: ['Musterstadt', 'Nachbarort 1', 'Nachbarort 2', 'Nachbarort 3', 'Nachbarort 4', 'Umland 30 km'],
  // Anfragen empfangen: z. B. kostenloser Formspree-Endpunkt 'https://formspree.io/f/XXXX'.
  // Leer = das E-Mail-Programm des Kunden öffnet sich mit fertig ausgefüllter Nachricht.
  formEndpoint: ''
};

/* ===== Leistungen – Reihenfolge = Reihenfolge im Menü und auf der Startseite ===== */
window.SERVICES = [
  { slug: 'gartenplanung',     title: 'Gartenplanung & Gestaltung', short: 'Vom ersten Entwurf bis zum fertigen Traumgarten – alles aus einer Hand.', icon: 'pencil', img: 'img/projekte/beet-nachher.jpg' },
  { slug: 'gartenpflege',      title: 'Garten- & Gehölzpflege',     short: 'Rückschnitt, Hecken, Baumpflege und Pflege das ganze Jahr.',             icon: 'scissors', img: 'img/projekte/hecke-buchs.jpg' },
  { slug: 'terrassen-auffahrten', title: 'Terrassen & Auffahrten',  short: 'Pflaster, Naturstein und Platten – belastbar und schön.',                 icon: 'grid', img: 'img/projekte/terrasse-nachher.jpg' },
  { slug: 'lichtplanung',      title: 'Lichtplanung',               short: 'Stimmungsvolle Gartenbeleuchtung für Atmosphäre und Sicherheit.',        icon: 'lamp', img: 'img/projekte/weg-nachher.jpg' },
  { slug: 'treppen-mauern',    title: 'Treppen & Mauern',           short: 'Gartentreppen, Trockenmauern, Gabionen und Hangbefestigung.',            icon: 'stairs', img: 'img/projekte/mauer-nachher.jpg' },
  { slug: 'holzarbeiten',      title: 'Holzarbeiten & Zäune',       short: 'Holzterrassen, Pergolen, Sichtschutz und Zaunbau.',                      icon: 'fence', img: 'img/projekte/sichtschutz-nachher.jpg' },
  { slug: 'rasen-bepflanzung', title: 'Rasen & Bepflanzung',        short: 'Rollrasen, Rasenneuanlage, Beete, Hecken und Bewässerung.',              icon: 'sprout', img: 'img/projekte/hecke-rot.jpg' }
];

/* ===== Bewertungen =====
   ACHTUNG: Das sind BEISPIELE zur Ansicht. Vor dem Livegang durch echte Kundenbewertungen
   (z. B. aus Google) ersetzen – erfundene Bewertungen sind in Deutschland unzulässig (UWG).
   service = slug der Leistung → erscheint zusätzlich auf deren Unterseite. */
window.REVIEWS = [
  { name: 'Beispielkunde A.', place: 'Musterstadt', service: 'gartenplanung', stars: 5, text: 'Von der Planung bis zur Umsetzung super abgestimmt. Unser Garten ist nicht wiederzuerkennen – pünktlich, sauber und zum vereinbarten Preis.' },
  { name: 'Beispielkundin B.', place: 'Nachbarort 1', service: 'terrassen-auffahrten', stars: 5, text: 'Die neue Terrasse ist perfekt verlegt. Das Team hat jeden Abend aufgeräumt und uns gut beraten, welcher Stein zu unserem Haus passt.' },
  { name: 'Beispielkunde C.', place: 'Nachbarort 2', service: 'gartenpflege', stars: 5, text: 'Wir lassen unseren Garten seit zwei Jahren pflegen. Zuverlässig, freundlich und immer erreichbar. Klare Empfehlung!' },
  { name: 'Beispielkundin D.', place: 'Musterstadt', service: 'lichtplanung', stars: 5, text: 'Die Gartenbeleuchtung hat unseren Abenden eine ganz neue Stimmung gegeben. Tolle Ideen und saubere Verkabelung.' },
  { name: 'Beispielkundin F.', place: 'Nachbarort 4', service: 'holzarbeiten', stars: 5, text: 'Sichtschutz und Pergola wurden millimetergenau gebaut. Endlich haben wir Privatsphäre auf der Terrasse.' }
];

/* ===================================================================== */
const ICONS = {
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16"/><path d="m22 6-10 7L2 6"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  whatsapp: '<path d="M3 21l1.7-4.9A9 9 0 1 1 8 19.5z"/><path d="M9 10c0 3 2 5 5 5l1.5-1.5-2-1-1 1c-1 0-2.5-1.5-2.5-2.5l1-1-1-2z"/>',
  instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1z"/>',
  quote: '<path d="M3 21c3 0 7-1 7-8V5H3v7h4c0 4-2 6-4 6zm11 0c3 0 7-1 7-8V5h-7v7h4c0 4-2 6-4 6z" fill="currentColor" stroke="none"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10z"/><path d="M2 21c0-3 1.9-5.4 5.2-6.1 2.5-.5 5.8-1.9 7.8-4.9"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
  grid: '<rect x="3" y="3" width="18" height="18"/><path d="M3 9h18M3 15h18M9 3v6M15 9v6M9 15v6"/>',
  lamp: '<path d="M9 18h6M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/>',
  drop: '<path d="M12 2.7 6.3 8.3a8 8 0 1 0 11.4 0z"/><path d="M8 14a4 4 0 0 0 4 4"/>',
  stairs: '<path d="M3 21h5v-5h5v-5h5V6h3"/><path d="M3 21V3"/>',
  fence: '<path d="M4 3 2 5v16h4V5zM12 3l-2 2v16h4V5zM20 3l-2 2v16h4V5zM6 9h4M6 15h4M14 9h4M14 15h4"/>',
  sprout: '<path d="M7 20h10M12 20v-8"/><path d="M12 12C12 7 9 5 4 5c0 5 3 7 8 7zM12 12c0-4 2-6 7-6 0 4-2 6-7 6z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  handshake: '<path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1 1 0 1 1-3-3l2.8-2.8a5 5 0 0 1 6 .8L21 7M3 7l4.5-4.5M21 11l-2-2M3 11l6.5 6.5a1 1 0 1 0 3-3"/>',
  calendar: '<rect x="3" y="4" width="18" height="18"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  euro: '<path d="M4 10h12M4 14h9M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  tree: '<path d="M12 22v-7"/><path d="M12 2a5 5 0 0 0-5 5 4 4 0 0 0-2 7.5A4 4 0 0 0 9 18h6a4 4 0 0 0 4-3.5A4 4 0 0 0 17 7a5 5 0 0 0-5-5z"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  home: '<path d="m3 10 9-7 9 7v11H3z"/><path d="M9 21v-7h6v7"/>'
};
const icon = (name, cls = '') =>
  `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true">${ICONS[name] || ''}</svg>`;
window.icon = icon;

const S = window.SITE;
const page = location.pathname.split('/').pop() || 'index.html';
const isService = SERVICES.some(s => `${s.slug}.html` === page);
const tel = `tel:${S.phoneLink}`;
const wa = S.whatsapp ? `https://wa.me/${S.whatsapp}?text=${encodeURIComponent(`Hallo ${S.name} ${S.claim}, ich interessiere mich für …`)}` : '';
const address = `${S.street}, ${S.zip} ${S.city}`;

/* ===== Kopfzeile ===== */
const navLink = (href, label) => `<a href="${href}"${href === page ? ' aria-current="page"' : ''}>${label}</a>`;
const headerEl = document.getElementById('site-header');
if (headerEl) headerEl.outerHTML = `
<div class="preloader" aria-hidden="true"><img src="img/logo.png" alt=""></div>
<div class="topbar">
  <div class="container topbar__inner">
    <div class="topbar__group">
      <a href="${tel}">${icon('phone')} ${S.phone}</a>
      <a href="mailto:${S.email}">${icon('mail')} ${S.email}</a>
    </div>
    <div class="topbar__group topbar__group--hide">
      <span>${icon('clock')} ${S.hours[0][0]}: ${S.hours[0][1]}</span>
      <span>${icon('pin')} ${S.city} &amp; Umgebung</span>
      ${S.instagram ? `<a href="${S.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${icon('instagram')}</a>` : ''}
    </div>
  </div>
</div>
<header class="header" id="header">
  <div class="container header__inner">
    <a href="index.html" class="logo" aria-label="${S.name} – Startseite"><img src="img/logo.png" alt="${S.name} – ${S.claim}" width="560" height="338"></a>
    <nav class="nav" id="nav" aria-label="Hauptmenü">
      <button class="nav-toggle nav-close" aria-label="Menü schließen">${icon('close')}</button>
      ${navLink('index.html', 'Startseite')}
      <div class="nav__drop${isService || page === 'leistungen.html' ? ' is-current' : ''}">
        <button type="button" aria-expanded="false" aria-haspopup="true">Leistungen ${icon('chevronDown')}</button>
        <div class="nav__menu">
          ${navLink('leistungen.html', `${icon('leaf')} Alle Leistungen`)}
          ${SERVICES.map(s => navLink(`${s.slug}.html`, `${icon(s.icon)} ${s.title}`)).join('')}
        </div>
      </div>
      ${navLink('referenzen.html', 'Referenzen')}
      ${navLink('ueber-uns.html', 'Über uns')}
      ${navLink('kontakt.html', 'Kontakt')}
      <div class="nav__mobile-extra">
        <a href="${tel}" class="btn">${icon('phone')} ${S.phone}</a>
        <a href="kontakt.html" class="btn btn--outline">Angebot anfragen</a>
      </div>
    </nav>
    <a href="${tel}" class="btn header__call">${icon('phone')}<span><small>Jetzt anrufen</small>${S.phone}</span></a>
    <button class="nav-toggle nav-open" aria-label="Menü öffnen" aria-controls="nav" aria-expanded="false">${icon('menu')}</button>
  </div>
</header>
<div class="nav-backdrop"></div>`;

/* ===== Fußzeile + Kontaktleisten ===== */
const footerEl = document.getElementById('site-footer');
if (footerEl) footerEl.outerHTML = `
<footer class="footer">
  <div class="container footer__grid">
    <div>
      <a href="index.html" class="footer__logo" aria-label="Startseite"><img src="img/logo-weiss.png" alt="${S.name}" width="560" height="338"></a>
      <p>Ihr Fachbetrieb für Garten- und Landschaftsbau in ${S.city} und Umgebung. Planung, Bau und Pflege – alles aus einer Hand.</p>
      <div class="footer__social">
        <a href="${tel}" aria-label="Anrufen">${icon('phone')}</a>
        ${wa ? `<a href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${icon('whatsapp')}</a>` : ''}
        ${S.instagram ? `<a href="${S.instagram}" target="_blank" rel="noopener" aria-label="Instagram">${icon('instagram')}</a>` : ''}
        ${S.facebook ? `<a href="${S.facebook}" target="_blank" rel="noopener" aria-label="Facebook">${icon('facebook')}</a>` : ''}
      </div>
    </div>
    <div>
      <h4>Leistungen</h4>
      ${SERVICES.map(s => `<a href="${s.slug}.html">${icon('chevron')} ${s.title}</a>`).join('')}
    </div>
    <div>
      <h4>Unternehmen</h4>
      <a href="ueber-uns.html">${icon('chevron')} Über uns</a>
      <a href="referenzen.html">${icon('chevron')} Referenzen</a>
      <a href="kontakt.html">${icon('chevron')} Kontakt &amp; Anfrage</a>
      <a href="impressum.html">${icon('chevron')} Impressum</a>
      <a href="datenschutz.html">${icon('chevron')} Datenschutz</a>
    </div>
    <div>
      <h4>Kontakt</h4>
      <a href="${tel}">${icon('phone')} ${S.phone}</a>
      ${S.mobile ? `<a href="tel:${S.mobile.replace(/\s/g, '')}">${icon('phone')} ${S.mobile}</a>` : ''}
      <a href="mailto:${S.email}">${icon('mail')} ${S.email}</a>
      <span>${icon('pin')} <span style="display:block;padding:0">${S.street}<br>${S.zip} ${S.city}</span></span>
      <h4 style="margin-top:22px">Öffnungszeiten</h4>
      <div class="footer__hours">${S.hours.map(([d, t]) => `<b>${d}</b><span style="padding:0">${t}</span>`).join('')}</div>
    </div>
  </div>
  <div class="container footer__bottom">
    <span>© ${new Date().getFullYear()} ${S.name} – ${S.claim}</span>
    <nav><a href="impressum.html">Impressum</a><a href="datenschutz.html">Datenschutz</a></nav>
  </div>
</footer>
<div class="float-bar" aria-label="Schnellkontakt">
  <a href="${tel}">${icon('phone')}<span>${S.phone}</span></a>
  ${wa ? `<a href="${wa}" target="_blank" rel="noopener">${icon('whatsapp')}<span>WhatsApp schreiben</span></a>` : ''}
  <a href="mailto:${S.email}">${icon('mail')}<span>${S.email}</span></a>
  <a href="kontakt.html">${icon('file')}<span>Angebot anfragen</span></a>
</div>
<nav class="mobile-bar" aria-label="Schnellkontakt">
  <a href="${tel}">${icon('phone')} Anrufen</a>
  ${wa ? `<a href="${wa}" target="_blank" rel="noopener">${icon('whatsapp')} WhatsApp</a>` : `<a href="mailto:${S.email}">${icon('mail')} E-Mail</a>`}
  <a href="kontakt.html">${icon('file')} Anfrage</a>
</nav>
<button class="to-top" aria-label="Nach oben">${icon('chevron')}</button>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="Bildansicht">
  <button class="lightbox__close" aria-label="Schließen">${icon('close')}</button>
  <button class="lightbox__prev" aria-label="Vorheriges Bild">${icon('chevron')}</button>
  <div><div class="lightbox__img"></div><p class="lightbox__cap"></p></div>
  <button class="lightbox__next" aria-label="Nächstes Bild">${icon('chevron')}</button>
</div>`;

/* ===== Platzhalter füllen ===== */
document.querySelectorAll('[data-icon]').forEach(el => {
  const st = el.getAttribute('style');
  el.outerHTML = icon(el.dataset.icon, el.className).replace('<svg', st ? `<svg style="${st}"` : '<svg');
});
document.querySelectorAll('[data-site]').forEach(el => {
  const k = el.dataset.site;
  el.textContent = k === 'address' ? address : (S[k] || '');
});
document.querySelectorAll('[data-tel]').forEach(a => { a.href = tel; });
document.querySelectorAll('[data-mail]').forEach(a => { a.href = `mailto:${S.email}`; });
document.querySelectorAll('[data-wa]').forEach(a => { if (wa) a.href = wa; else a.remove(); });
document.querySelectorAll('[data-hide-empty]').forEach(el => { if (!S[el.dataset.hideEmpty]) el.remove(); });

/* Leistungs-Kacheln automatisch (<div data-tiles="all|others">) */
document.querySelectorAll('[data-tiles]').forEach(box => {
  const list = box.dataset.tiles === 'others' ? SERVICES.filter(s => `${s.slug}.html` !== page).slice(0, 3) : SERVICES;
  box.classList.toggle('tiles--feature', list.length % 2 === 1 && !box.classList.contains('tiles--3'));
  box.innerHTML = list.map((s, i) => `
    <a href="${s.slug}.html" class="tile reveal" style="--i:${i % 4}">
      <div class="media" data-img="${s.img || `img/leistungen/${s.slug}.jpg`}"></div>
      <div class="tile__body">
        <div class="tile__icon">${icon(s.icon)}</div>
        <h3>${s.title}</h3>
        <span class="tile__more">Mehr erfahren</span>
      </div>
    </a>`).join('');
});

/* Bewertungen (<div data-reviews> oder data-reviews="slug") */
const avg = REVIEWS.length ? (REVIEWS.reduce((a, r) => a + r.stars, 0) / REVIEWS.length) : 0;
const starRow = n => `<span class="stars" aria-label="${n} von 5 Sternen">${icon('star').repeat(Math.round(n))}</span>`;
document.querySelectorAll('[data-rating-summary]').forEach(el => {
  el.innerHTML = `<b>${avg.toFixed(1).replace('.', ',')}</b>${starRow(avg)}<span>${REVIEWS.length} Bewertungen</span>`;
});
document.querySelectorAll('[data-reviews]').forEach(box => {
  const slug = box.dataset.reviews;
  let list = slug ? REVIEWS.filter(r => r.service === slug) : REVIEWS;
  if (slug && list.length < 3) list = list.concat(REVIEWS.filter(r => r.service !== slug)).slice(0, 3);
  box.innerHTML = `<div class="reviews__track">${list.map(r => `
    <div class="review"><div class="review__card">
      ${icon('quote', 'quote')}
      ${starRow(r.stars)}
      <p class="review__text">„${r.text}“</p>
      <div class="review__who"><div class="review__avatar">${r.name.charAt(0)}</div>
        <div><b>${r.name}</b><small>${r.place} · ${(SERVICES.find(s => s.slug === r.service) || {}).title || ''}</small></div></div>
    </div></div>`).join('')}</div>
    <div class="carousel__nav"><button class="carousel__arrow" data-dir="-1" aria-label="Zurück">${icon('chevron')}</button><div class="dots"></div><button class="carousel__arrow" data-dir="1" aria-label="Weiter">${icon('chevron')}</button></div>`;
  box.querySelector('[data-dir="-1"] .ico').style.transform = 'rotate(180deg)';
  initReviewSlider(box);
});

function initReviewSlider(box) {
  const track = box.querySelector('.reviews__track');
  const items = track.children.length;
  const dotsBox = box.querySelector('.dots');
  let idx = 0, timer;
  const perView = () => innerWidth <= 680 ? 1 : innerWidth <= 1024 ? 2 : 3;
  const pages = () => Math.max(1, items - perView() + 1);
  const render = () => {
    idx = Math.min(idx, pages() - 1);
    track.style.transform = `translateX(-${idx * (100 / perView())}%)`;
    dotsBox.innerHTML = Array.from({ length: pages() }, (_, i) => `<button aria-label="Bewertung ${i + 1}"${i === idx ? ' class="is-active"' : ''}></button>`).join('');
    dotsBox.querySelectorAll('button').forEach((b, i) => b.onclick = () => { idx = i; render(); restart(); });
  };
  const go = d => { idx = (idx + d + pages()) % pages(); render(); };
  const restart = () => { clearInterval(timer); timer = setInterval(() => go(1), 6000); };
  box.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => { go(+b.dataset.dir); restart(); });
  box.addEventListener('mouseenter', () => clearInterval(timer));
  box.addEventListener('mouseleave', restart);
  addEventListener('resize', render);
  render(); restart();
}

/* ===== Bilder: data-img → Hintergrund; fehlt die Datei, bleibt der grüne Platzhalter ===== */
document.querySelectorAll('[data-img]').forEach(el => {
  const src = el.dataset.img;
  el.style.setProperty('--img', `url("${new URL(src, location.href).href}")`); // absolut, sonst sucht der Browser relativ zu css/
  const probe = new Image();
  probe.onerror = () => el.classList.add('is-missing');
  probe.src = src;
});

/* ===== Vorlader ===== */
const pre = document.querySelector('.preloader');
const hidePre = () => pre && pre.classList.add('is-done');
addEventListener('load', hidePre);
setTimeout(hidePre, 1800);

/* ===== Kopfzeile beim Scrollen + Nach-oben-Button ===== */
const header = document.getElementById('header');
const toTop = document.querySelector('.to-top');
const onScroll = () => {
  const y = scrollY;
  header && header.classList.toggle('is-scrolled', y > 60);
  toTop && toTop.classList.toggle('is-visible', y > 700);
};
addEventListener('scroll', onScroll, { passive: true }); onScroll();
toTop && toTop.addEventListener('click', () => scrollTo({ top: 0 }));

/* ===== Menü (mobil) + Dropdown ===== */
const nav = document.getElementById('nav');
const backdrop = document.querySelector('.nav-backdrop');
const openBtn = document.querySelector('.nav-open');
const setNav = open => {
  nav.classList.toggle('is-open', open);
  backdrop.classList.toggle('is-open', open);
  openBtn.setAttribute('aria-expanded', open);
  document.body.style.overflow = open ? 'hidden' : '';
  document.body.classList.toggle('menu-open', open);
};
openBtn && openBtn.addEventListener('click', () => setNav(true));
document.querySelector('.nav-close')?.addEventListener('click', () => setNav(false));
backdrop && backdrop.addEventListener('click', () => setNav(false));
document.querySelectorAll('.nav__drop > button').forEach(b => b.addEventListener('click', () => {
  const open = b.parentElement.classList.toggle('is-open');
  b.setAttribute('aria-expanded', open);
}));
document.addEventListener('click', e => {
  document.querySelectorAll('.nav__drop.is-open').forEach(d => { if (!d.contains(e.target) && innerWidth > 1024) d.classList.remove('is-open'); });
});
addEventListener('keydown', e => { if (e.key === 'Escape') { setNav(false); closeLightbox(); } });

/* ===== Hero-Slider ===== */
document.querySelectorAll('.hero[data-slider]').forEach(hero => {
  const slides = [...hero.querySelectorAll('.hero__slide')];
  const dots = hero.querySelector('.hero__dots');
  if (slides.length < 2) { slides[0]?.classList.add('is-active'); return; }
  let i = 0, timer;
  dots.innerHTML = slides.map((_, n) => `<button aria-label="Bild ${n + 1}"></button>`).join('');
  const show = n => {
    slides[i].classList.remove('is-active'); dots.children[i].classList.remove('is-active');
    i = (n + slides.length) % slides.length;
    slides[i].classList.add('is-active'); dots.children[i].classList.add('is-active');
  };
  [...dots.children].forEach((d, n) => d.onclick = () => { show(n); clearInterval(timer); timer = setInterval(() => show(i + 1), 7000); });
  slides[0].classList.add('is-active'); dots.children[0].classList.add('is-active');
  timer = setInterval(() => show(i + 1), 7000);
});

/* ===== Scroll-Animationen ===== */
document.querySelectorAll('.stagger').forEach(g => [...g.children].forEach((c, n) => c.style.setProperty('--i', n)));
const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}), { threshold: .12, rootMargin: '0px 0px -40px 0px' }) : null;
document.querySelectorAll('.reveal').forEach(el => io ? io.observe(el) : el.classList.add('is-in'));

/* Zähler hochzählen */
const countIO = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target, end = +el.dataset.count, suffix = el.dataset.suffix || '', t0 = performance.now();
  const step = t => {
    const p = Math.min((t - t0) / 1800, 1);
    el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString('de-DE') + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step); countIO.unobserve(el);
}), { threshold: .5 }) : null;
document.querySelectorAll('[data-count]').forEach(el => countIO ? countIO.observe(el) : (el.textContent = el.dataset.count + (el.dataset.suffix || '')));

/* ===== Referenz-Karussell ===== */
document.querySelectorAll('.carousel').forEach(c => {
  const track = c.querySelector('.carousel__track');
  const dots = c.querySelector('.dots');
  const items = [...track.children];
  const stepW = () => items[0].getBoundingClientRect().width + 22;
  const count = () => Math.max(1, Math.round((track.scrollWidth - track.clientWidth) / stepW()) + 1);
  const renderDots = () => {
    dots.innerHTML = Array.from({ length: count() }, (_, n) => `<button aria-label="Seite ${n + 1}"></button>`).join('');
    [...dots.children].forEach((d, n) => d.onclick = () => track.scrollTo({ left: n * stepW() }));
    sync();
  };
  const sync = () => {
    const n = Math.round(track.scrollLeft / stepW());
    [...dots.children].forEach((d, k) => d.classList.toggle('is-active', k === n));
  };
  track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
  c.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => {
    const max = track.scrollWidth - track.clientWidth - 5;
    const d = +b.dataset.dir;
    if (d > 0 && track.scrollLeft >= max) track.scrollTo({ left: 0 });
    else track.scrollBy({ left: d * stepW() });
  });
  let auto = setInterval(() => c.querySelector('[data-dir="1"]').click(), 5000);
  c.addEventListener('mouseenter', () => clearInterval(auto));
  c.addEventListener('mouseleave', () => { clearInterval(auto); auto = setInterval(() => c.querySelector('[data-dir="1"]').click(), 5000); });
  addEventListener('resize', renderDots);
  renderDots();
});

/* ===== Galerie-Filter ===== */
document.querySelectorAll('.filters[data-target]').forEach(f => {
  const gallery = document.querySelector(f.dataset.target);
  f.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    f.querySelectorAll('button').forEach(x => x.classList.toggle('is-active', x === b));
    const cat = b.dataset.filter;
    gallery.querySelectorAll('.gallery__item').forEach(it => {
      const show = cat === 'all' || it.dataset.cat === cat;
      it.classList.toggle('is-hidden', !show);
      if (show) { it.classList.remove('is-in'); requestAnimationFrame(() => requestAnimationFrame(() => it.classList.add('is-in'))); }
    });
  });
});

/* ===== Lightbox ===== */
const lb = document.querySelector('.lightbox');
let lbItems = [], lbIdx = 0;
function openLightbox(list, n) {
  lbItems = list; lbIdx = n; renderLightbox();
  lb.classList.add('is-open'); document.body.style.overflow = 'hidden';
}
function renderLightbox() {
  const it = lbItems[lbIdx];
  const media = it.querySelector('[data-img]');
  lb.querySelector('.lightbox__img').style.backgroundImage = `url("${media.dataset.img}"), var(--ph)`;
  lb.querySelector('.lightbox__cap').textContent = it.querySelector('figcaption')?.innerText.replace(/\n+/g, ' – ') || '';
}
function closeLightbox() { if (!lb || !lb.classList.contains('is-open')) return; lb.classList.remove('is-open'); document.body.style.overflow = ''; }
if (lb) {
  lb.querySelector('.lightbox__close').onclick = closeLightbox;
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  lb.querySelector('.lightbox__prev').onclick = () => { lbIdx = (lbIdx - 1 + lbItems.length) % lbItems.length; renderLightbox(); };
  lb.querySelector('.lightbox__next').onclick = () => { lbIdx = (lbIdx + 1) % lbItems.length; renderLightbox(); };
  addEventListener('keydown', e => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'ArrowLeft') lb.querySelector('.lightbox__prev').click();
    if (e.key === 'ArrowRight') lb.querySelector('.lightbox__next').click();
  });
}
document.addEventListener('click', e => {
  const it = e.target.closest('[data-lightbox]');
  if (!it) return;
  const group = [...document.querySelectorAll(`[data-lightbox="${it.dataset.lightbox}"]:not(.is-hidden)`)];
  openLightbox(group, group.indexOf(it));
});
document.querySelectorAll('[data-lightbox]').forEach(it => {
  it.tabIndex = 0;
  it.addEventListener('keydown', e => { if (e.key === 'Enter') it.click(); });
});

/* ===== Vorher/Nachher-Regler ===== */
document.querySelectorAll('.ba').forEach(ba => {
  const r = ba.querySelector('input');
  const set = () => ba.style.setProperty('--pos', r.value + '%');
  r.addEventListener('input', set); set();
});

/* Vorher/Nachher: Projekt wechseln */
document.querySelectorAll('.ba-switch').forEach(sw => {
  const ba = document.querySelector(sw.dataset.ba);
  const box = sw.parentElement;
  sw.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    sw.querySelectorAll('button').forEach(x => x.classList.toggle('is-active', x === b));
    [[ '.ba__before', b.dataset.before ], [ '.media:not(.ba__before)', b.dataset.after ]].forEach(([sel, src]) => {
      const m = ba.querySelector(sel); m.dataset.img = src; m.style.setProperty('--img', `url("${new URL(src, location.href).href}")`);
    });
    const r = ba.querySelector('input'); r.value = 50; r.dispatchEvent(new Event('input'));
    box.querySelector('.ba-title').innerHTML = b.dataset.title;
    box.querySelector('.ba-text').innerHTML = b.dataset.text;
  });
});

/* ===== FAQ: immer nur eine offen ===== */
document.querySelectorAll('.faq details').forEach(d => d.addEventListener('toggle', () => {
  if (d.open) d.parentElement.querySelectorAll('details[open]').forEach(o => o !== d && (o.open = false));
}));

/* ===== Kontaktformular ===== */
const form = document.getElementById('contact-form');
if (form) {
  const chips = form.querySelector('[data-service-chips]');
  chips.innerHTML = SERVICES.map(s => `<label><input type="checkbox" name="leistung" value="${s.title}"><span>${s.title}</span></label>`).join('')
    + '<label><input type="checkbox" name="leistung" value="Sonstiges"><span>Sonstiges</span></label>';
  const pre = new URLSearchParams(location.search).get('leistung');
  if (pre) { const s = SERVICES.find(x => x.slug === pre); const cb = s && chips.querySelector(`input[value="${s.title}"]`); if (cb) cb.checked = true; }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const leist = fd.getAll('leistung').join(', ') || '–';
    const lines = [
      `Leistung(en): ${leist}`,
      `Name: ${fd.get('name')}`, `Telefon: ${fd.get('telefon')}`, `E-Mail: ${fd.get('email') || '–'}`,
      `Ort / PLZ: ${fd.get('ort') || '–'}`, `Gartengröße: ${fd.get('groesse') || '–'}`,
      `Zeitraum: ${fd.get('zeitraum') || '–'}`, `Rückruf: ${fd.get('rueckruf') || '–'}`, '', `Nachricht:`, fd.get('nachricht') || '–'
    ];
    const msg = form.querySelector('.form__msg');
    if (S.formEndpoint) {
      fd.set('leistung', leist);
      try {
        const res = await fetch(S.formEndpoint, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error();
        msg.textContent = 'Vielen Dank! Ihre Anfrage ist bei uns angekommen. Wir melden uns innerhalb von 24 Stunden.';
        form.reset();
      } catch {
        msg.textContent = `Das Senden hat leider nicht geklappt. Bitte rufen Sie uns an: ${S.phone}`;
      }
    } else {
      location.href = `mailto:${S.email}?subject=${encodeURIComponent('Anfrage über die Website: ' + leist)}&body=${encodeURIComponent(lines.join('\n'))}`;
      msg.textContent = 'Ihr E-Mail-Programm wurde geöffnet – bitte die Nachricht dort nur noch absenden.';
    }
    msg.classList.add('is-visible');
  });
}
