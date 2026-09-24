// Anmeldung und erste Einrichtung
import backend from 'backend';
import { esc } from '../../shared/rechnen.js';
import { $, toast } from '../ui.js';

export function zeigeLogin({ einrichten = false, logo = 'img/logo.png' } = {}) {
  return new Promise((resolve) => {
    document.body.classList.add('login-modus');
    const box = document.createElement('div');
    box.className = 'login-wand';
    box.innerHTML = `<form class="login-karte" id="login-form">
      <img src="${esc(logo)}" alt="Save Your Möbel" class="login-logo">
      <h1>${einrichten ? 'Portal einrichten' : 'Anmelden'}</h1>
      <p class="hilfe">${einrichten ? 'Lege den Chef-Zugang an. Weitere Zugänge für Mitarbeiter erstellst du danach unter Einstellungen → Zugänge.' : 'Rechnung-Programm · Save Your Möbel'}</p>
      ${einrichten ? '<label>Dein Name<input id="l-name" required autocomplete="name"></label>' : ''}
      <label>E-Mail<input id="l-email" type="email" required autocomplete="username"></label>
      <label>Passwort${einrichten ? ' (mind. 10 Zeichen)' : ''}<input id="l-pw" type="password" required ${einrichten ? 'minlength="10" autocomplete="new-password"' : 'autocomplete="current-password"'}></label>
      <button class="btn btn-primaer" type="submit">${einrichten ? 'Zugang anlegen' : 'Anmelden'}</button>
    </form>`;
    document.body.appendChild(box);
    $('#l-email', box).focus();
    $('#login-form', box).onsubmit = async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector('button');
      btn.disabled = true;
      try {
        const r = einrichten
          ? await backend.einrichten({ name: $('#l-name', box).value, email: $('#l-email', box).value, passwort: $('#l-pw', box).value })
          : await backend.anmelden($('#l-email', box).value, $('#l-pw', box).value);
        box.remove();
        document.body.classList.remove('login-modus');
        resolve(r.benutzer);
      } catch (err) {
        toast(err.message, 'fehler');
        btn.disabled = false;
      }
    };
  });
}
