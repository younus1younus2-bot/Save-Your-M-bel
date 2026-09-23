/* ===== Einstellungen – hier anpassen ===== */
const CONFIG = {
  // WhatsApp-Nummer im internationalen Format ohne + und ohne Leerzeichen
  whatsapp: '490000000000',
  // Empfänger-E-Mail (wird genutzt, wenn kein Formular-Dienst eingetragen ist)
  email: 'info@saveyourmobel.de',
  // Optional: Formular-Dienst, z. B. https://formspree.io/f/XXXXXXX
  // Leer lassen => Anfrage öffnet das E-Mail-Programm des Kunden.
  endpoint: ''
};

/* ===== Mobile Navigation ===== */
const nav = document.getElementById('nav');
const toggle = document.querySelector('.nav-toggle');
toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  toggle.setAttribute('aria-expanded', open);
});
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('is-open')));

/* ===== WhatsApp-Links ===== */
const waLink = text => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
document.getElementById('wa-float').href = waLink('Hallo Save Your Möbel, ich habe eine Frage:');

/* ===== Mehrstufiges Anfrageformular ===== */
const form = document.getElementById('inquiry');
const steps = [...form.querySelectorAll('.step')];
const progress = [...form.querySelectorAll('.progress li')];
const btnPrev = form.querySelector('[data-prev]');
const btnNext = form.querySelector('[data-next]');
const btnSubmit = form.querySelector('[type="submit"]');
let current = 0;

function showStep(i) {
  current = i;
  steps.forEach((s, n) => s.classList.toggle('is-active', n === i));
  progress.forEach((p, n) => {
    p.classList.toggle('is-active', n === i);
    p.classList.toggle('is-done', n < i);
  });
  btnPrev.hidden = i === 0;
  btnNext.hidden = i === steps.length - 1;
  btnSubmit.hidden = i !== steps.length - 1;
}

function validateStep(i) {
  const step = steps[i];
  let ok = true;
  step.querySelectorAll('[required]').forEach(el => {
    const valid = el.type === 'radio'
      ? !!form.querySelector(`[name="${el.name}"]:checked`)
      : el.type === 'checkbox' ? el.checked : el.value.trim() !== '';
    if (el.type !== 'radio') el.classList.toggle('invalid', !valid);
    if (!valid) ok = false;
  });
  const email = step.querySelector('[type="email"]');
  if (email && email.value && !email.checkValidity()) {
    email.classList.add('invalid');
    ok = false;
  }
  step.querySelectorAll('.error').forEach(e => e.classList.toggle('is-visible', !ok));
  return ok;
}

btnNext.addEventListener('click', () => { if (validateStep(current)) showStep(current + 1); });
btnPrev.addEventListener('click', () => showStep(current - 1));

// Zusatzfelder je nach Leistung ein-/ausblenden
function updateConditional() {
  const service = form.querySelector('[name="leistung"]:checked')?.value;
  form.querySelectorAll('[data-show-for]').forEach(f =>
    f.classList.toggle('is-visible', f.dataset.showFor === service));
}
form.querySelectorAll('[name="leistung"]').forEach(r => r.addEventListener('change', () => {
  updateConditional();
  // Auswahl übernimmt direkt den nächsten Schritt
  setTimeout(() => showStep(1), 200);
}));

// Klick auf eine Leistungskarte wählt die Leistung im Formular vor
document.querySelectorAll('.card[data-service]').forEach(card => card.addEventListener('click', () => {
  const radio = form.querySelector(`[name="leistung"][value="${card.dataset.service}"]`);
  if (radio) { radio.checked = true; updateConditional(); showStep(1); }
}));

function buildMessage(data) {
  const lines = [
    'Neue Anfrage – Save Your Möbel',
    '',
    `Leistung: ${data.leistung}`,
    `Beschreibung: ${data.beschreibung}`,
    `Ort: ${data.ort}`,
    data.ziel ? `Zieladresse: ${data.ziel}` : null,
    data.termin ? `Wunschtermin: ${new Date(data.termin).toLocaleDateString('de-DE')}` : null,
    data.etage ? `Etage: ${data.etage}` : null,
    '',
    `Name: ${data.name}`,
    `Telefon: ${data.telefon}`,
    data.email ? `E-Mail: ${data.email}` : null,
    `Antwort per: ${data.kontaktweg}`
  ];
  return lines.filter(l => l !== null).join('\n');
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateStep(current)) return;

  const data = Object.fromEntries(new FormData(form));
  if (data.leistung !== 'Umzug & Transport') delete data.ziel;
  const message = buildMessage(data);

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Wird gesendet …';

  try {
    if (CONFIG.endpoint) {
      const res = await fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, _subject: `Anfrage: ${data.leistung}`, nachricht: message })
      });
      if (!res.ok) throw new Error('Senden fehlgeschlagen');
    } else {
      window.location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Anfrage: ' + data.leistung)}&body=${encodeURIComponent(message)}`;
    }
    form.querySelector('.progress').hidden = true;
    steps.forEach(s => s.classList.remove('is-active'));
    form.querySelector('.form__nav').hidden = true;
    form.querySelector('.success').hidden = false;
    document.getElementById('wa-followup').href = waLink(`${message}\n\nHier noch Fotos dazu:`);
  } catch (err) {
    alert('Leider hat das nicht geklappt. Bitte rufen Sie uns an oder schreiben Sie per WhatsApp.');
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Anfrage senden';
  }
});

showStep(0);
