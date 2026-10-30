// Pure rules for the Face ID lock (the screen and the Face ID calls are in src/lock.js).

export const RELOCK_AFTER_MS = 60 * 1000;
export const PIN_LENGTH = 6;
const PASS_ITERATIONS = 310000;
const FREE_TRIES = 5;
const FIRST_WAIT_MS = 30 * 1000;
const LONGEST_WAIT_MS = 15 * 60 * 1000;

// iPads report themselves as a Mac, so a Mac with a touch screen counts as iOS.
export function isIOS({ userAgent = "", platform = "", maxTouchPoints = 0 } = {}) {
  return /iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

// A short trip away (a photo picker, a quick look at another app) does not ask for Face ID again.
export const shouldRelock = (hiddenAt, now, after = RELOCK_AFTER_MS) => !hiddenAt || now - hiddenAt >= after;

export const toB64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
export const fromB64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

// The passcode is never saved, only a slow salted hash of it, so a guess takes real time.
async function hashPassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  return toB64(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256));
}
export async function makePassRecord(password, iterations = PASS_ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: toB64(salt), hash: await hashPassword(password, salt, iterations), iterations };
}
export async function checkPassword(password, record) {
  return !!record && (await hashPassword(password, fromB64(record.salt), record.iterations)) === record.hash;
}

// Five free tries, then 30 seconds, doubling up to 15 minutes.
export function waitAfterFails(fails) {
  if (fails < FREE_TRIES) return 0;
  return Math.min(FIRST_WAIT_MS * 2 ** (fails - FREE_TRIES), LONGEST_WAIT_MS);
}
