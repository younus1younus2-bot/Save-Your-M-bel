// Installierbare App (Service Worker) und Push-Benachrichtigungen
import backend from 'backend';

export async function registriereServiceWorker() {
  if (backend.art !== 'server' || !('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

const zuUint8 = (base64) => {
  const s = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};

export async function pushAktiv() {
  if (!backend.push || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return Boolean(await reg?.pushManager.getSubscription());
}

export async function pushEinschalten() {
  if (!backend.push) throw new Error('Benachrichtigungen gibt es nur im eigenen Portal.');
  if (!('serviceWorker' in navigator) || !('PushManager' in window))
    throw new Error('Dieser Browser unterstützt keine Benachrichtigungen. Auf dem iPhone: Portal zuerst zum Home-Bildschirm hinzufügen.');
  const erlaubt = await Notification.requestPermission();
  if (erlaubt !== 'granted') throw new Error('Benachrichtigungen wurden im Browser nicht erlaubt.');
  const reg = (await navigator.serviceWorker.getRegistration()) || (await registriereServiceWorker());
  const { schluessel } = await backend.push.schluessel();
  const abo = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: zuUint8(schluessel) }));
  await backend.push.abonnieren(abo.toJSON());
}

export async function pushAusschalten() {
  const reg = await navigator.serviceWorker?.getRegistration();
  const abo = await reg?.pushManager.getSubscription();
  if (!abo) return;
  await backend.push?.abbestellen(abo.endpoint).catch(() => {});
  await abo.unsubscribe();
}
