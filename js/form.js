/* =====================================================================
   Einheitliches Anfrageformular (3 Schritte)
   Daten (Telefon, WhatsApp, E-Mail, Formular-Dienst) kommen aus js/layout.js
   ===================================================================== */
const form = document.getElementById('inquiry');
const steps = [...form.querySelectorAll('.step')];
const progress = [...form.querySelectorAll('.progress li')];
const btnPrev = form.querySelector('[data-prev]');
const btnNext = form.querySelector('[data-next]');
const btnSubmit = form.querySelector('[type="submit"]');
const waLink = text => `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
let current = 0;

function showStep(i, scroll = true) {
  current = i;
  steps.forEach((s, n) => s.classList.toggle('is-active', n === i));
  progress.forEach((p, n) => {
    p.classList.toggle('is-active', n === i);
    p.classList.toggle('is-done', n < i);
  });
  btnPrev.hidden = i === 0;
  btnNext.hidden = i === steps.length - 1;
  btnSubmit.hidden = i !== steps.length - 1;
  if (scroll && form.getBoundingClientRect().top < 0) form.scrollIntoView({ behavior: 'smooth' });
}

/* Nur die Felder der gewählten Leistung anzeigen; die anderen werden deaktiviert
   (dann werden sie weder geprüft noch mitgeschickt). */
function applyServiceType() {
  const type = form.querySelector('[name="leistung"]:checked')?.dataset.type;
  form.querySelectorAll('[data-for]').forEach(group => {
    const active = group.dataset.for === type;
    group.hidden = !active;
    group.querySelectorAll('input, select, textarea').forEach(el => { el.disabled = !active; });
  });
}

function validateStep(i) {
  const step = steps[i];
  let ok = true;
  step.querySelectorAll('[required]:not(:disabled)').forEach(el => {
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
  step.querySelector('.error')?.classList.toggle('is-visible', !ok);
  if (!ok) step.querySelector('.invalid')?.focus();
  return ok;
}

// Fehlermarkierung verschwindet beim Tippen
form.addEventListener('input', e => {
  if (e.target.classList.contains('invalid') && e.target.value.trim()) e.target.classList.remove('invalid');
});

btnNext.addEventListener('click', () => { if (validateStep(current)) showStep(current + 1); });
btnPrev.addEventListener('click', () => showStep(current - 1));

// Auswahl einer Leistung führt direkt zum nächsten Schritt
form.querySelectorAll('[name="leistung"]').forEach(r => r.addEventListener('change', () => {
  applyServiceType();
  steps[0].querySelector('.error').classList.remove('is-visible');
  setTimeout(() => showStep(1), 180);
}));

// Vorauswahl über den Link, z. B. anfrage.html?leistung=Privatumzug
const preset = new URLSearchParams(location.search).get('leistung');
const presetRadio = preset && [...form.querySelectorAll('[name="leistung"]')].find(r => r.value === preset);
if (presetRadio) { presetRadio.checked = true; applyServiceType(); showStep(1, false); }
else { applyServiceType(); showStep(0, false); }

/* ===== Nachricht zusammenbauen ===== */
const LABELS = {
  leistung: 'Leistung', von: 'Auszug', etage_von: 'Etage Auszug', aufzug_von: 'Aufzug Auszug',
  nach: 'Einzug', etage_nach: 'Etage Einzug', aufzug_nach: 'Aufzug Einzug', groesse: 'Größe',
  extras: 'Zusatzleistungen', ort: 'Ort', objekt: 'Objekt', flaeche: 'Fläche (m²)', etage: 'Etage',
  besenrein: 'Besenrein', montageart: 'Art der Montage', termin: 'Wunschtermin', flexibel: 'Termin flexibel',
  nachricht: 'Weitere Infos', name: 'Name', telefon: 'Telefon', email: 'E-Mail', kontaktweg: 'Antwort per'
};

function collect() {
  const data = {};
  for (const [key, value] of new FormData(form)) {
    if (key === 'datenschutz' || !String(value).trim()) continue;
    data[key] = data[key] ? `${data[key]}, ${value}` : value;
  }
  if (data.termin) data.termin = new Date(data.termin).toLocaleDateString('de-DE');
  return data;
}

function buildMessage(data) {
  const lines = ['Neue Anfrage – Save Your Möbel', ''];
  for (const [key, label] of Object.entries(LABELS)) {
    if (key === 'name') lines.push('');
    if (data[key]) lines.push(`${label}: ${data[key]}`);
  }
  return lines.join('\n');
}

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateStep(current)) return;

  const data = collect();
  const message = buildMessage(data);
  const subject = `Anfrage: ${data.leistung} – ${data.name}`;

  btnSubmit.disabled = true;
  btnSubmit.textContent = 'Wird gesendet …';

  try {
    if (SITE.formEndpoint) {
      const res = await fetch(SITE.formEndpoint, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, _subject: subject, _replyto: data.email || '', zusammenfassung: message })
      });
      if (!res.ok) throw new Error('Senden fehlgeschlagen');
    } else {
      window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    }
    form.querySelector('.progress').hidden = true;
    steps.forEach(s => s.classList.remove('is-active'));
    form.querySelector('.form__nav').hidden = true;
    form.querySelector('.success').hidden = false;
    document.getElementById('wa-followup').href = waLink(`${message}\n\nHier noch Fotos dazu:`);
    form.scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    alert(`Leider hat das nicht geklappt. Bitte rufen Sie uns an (${SITE.phone}) oder schreiben Sie per WhatsApp.`);
    btnSubmit.disabled = false;
    btnSubmit.textContent = 'Anfrage senden';
  }
});
