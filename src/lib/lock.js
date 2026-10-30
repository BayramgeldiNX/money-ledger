// Pure rules for the Face ID lock (the screen and the Face ID calls are in src/lock.js).

export const RELOCK_AFTER_MS = 60 * 1000;

// iPads report themselves as a Mac, so a Mac with a touch screen counts as iOS.
export function isIOS({ userAgent = "", platform = "", maxTouchPoints = 0 } = {}) {
  return /iPhone|iPad|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

// A short trip away (a photo picker, a quick look at another app) does not ask for Face ID again.
export const shouldRelock = (hiddenAt, now, after = RELOCK_AFTER_MS) => !hiddenAt || now - hiddenAt >= after;

export const toB64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
export const fromB64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
