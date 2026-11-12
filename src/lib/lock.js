// Pure rules for the Face ID lock (the screen and the Face ID calls are in src/lock.js).

export const RELOCK_AFTER_MS = 60 * 1000;
export const PIN_LENGTH = 4;
const OLD_PIN_LENGTH = 6; // passcodes saved before the switch to 4 digits have no length on them
const PASS_ITERATIONS = 310000;
const FREE_TRIES = 5;
const FIRST_WAIT_MS = 30 * 1000;
const LONGEST_WAIT_MS = 15 * 60 * 1000;

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
  return { salt: toB64(salt), hash: await hashPassword(password, salt, iterations), iterations, digits: password.length };
}
export async function checkPassword(password, record) {
  return !!record && (await hashPassword(password, fromB64(record.salt), record.iterations)) === record.hash;
}

export const pinLengthOf = (record) => (record && record.digits) || OLD_PIN_LENGTH;

// Five free tries, then 30 seconds, doubling up to 15 minutes.
export function waitAfterFails(fails) {
  if (fails < FREE_TRIES) return 0;
  return Math.min(FIRST_WAIT_MS * 2 ** (fails - FREE_TRIES), LONGEST_WAIT_MS);
}

// ---- the lock's decisions, free of the screen and of localStorage (storage and clock are arguments) ----
export const LOCK_KEYS = { cred: "ml.lock.cred", pass: "ml.lock.pass", fails: "ml.lock.fails", left: "ml.lock.left" };

// Check a passcode and count wrong tries (kept in storage so closing the app does not reset them).
// Returns "" when it is right, or what to tell the owner. `storage` has read(key, fallback) and write(key, value).
export async function attemptPasscode(pin, storage, now = Date.now()) {
  const fails = storage.read(LOCK_KEYS.fails, null) || { n: 0, at: 0 };
  const left = fails.at + waitAfterFails(fails.n) - now;
  if (left > 0) return "Too many tries. Wait " + Math.ceil(left / 1000) + " seconds.";
  if (await checkPassword(pin, storage.read(LOCK_KEYS.pass, null))) { storage.write(LOCK_KEYS.fails, { n: 0, at: 0 }); return ""; }
  storage.write(LOCK_KEYS.fails, { n: fails.n + 1, at: now });
  return "Wrong passcode.";
}

// When the app is left (pagehide): the time to remember for an app-update reload, or null to remember nothing.
// Nothing is remembered while locked or with no lock set, so those never skip the lock later.
export const leftAtToRemember = ({ locked, hasLock, hiddenAt, now }) => (locked || !hasLock ? null : hiddenAt || now);

// What to do when the page comes back from the background: "none" (nothing to decide), "relock" or "open".
export const onReturn = ({ away, locked, now }) => (!away || locked ? "none" : shouldRelock(away, now) ? "relock" : "open");

// What to do when the app starts with a lock set. `left` is the remembered time away (0 when none),
// `hidden` whether the page is in the background. lock: ask at once; cover: hide the money until decided.
export function onStart({ left, hidden, now }) {
  if (shouldRelock(left, now)) return { lock: true, cover: true, hiddenAt: 0 };
  // reloaded in the background: the time away still counts from when the owner left
  if (hidden) return { lock: false, cover: true, hiddenAt: left };
  return { lock: false, cover: false, hiddenAt: 0 };
}
