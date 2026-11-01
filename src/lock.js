// Face ID lock for the iPhone app. It uses a passkey only as a way to ask iOS for Face ID, so it is a
// lock screen on this device: it does not encrypt anything, and the data stays protected by the sign-in.
// A 4-digit passcode is the everyday fallback and works offline. The account password is only for a forgotten
// passcode, which is why turning the lock on needs a signed-in account.
import { isIOS, shouldRelock, toB64, fromB64, makePassRecord, checkPassword, pinLengthOf, waitAfterFails, PIN_LENGTH } from "./lib/lock.js";
import { currentUser, verifyPassword, authMessage } from "./sync/firebase.js";
import { reduced, sleep } from "./motion.js";

const KEY = "ml.lock.cred", PASS_KEY = "ml.lock.pass", FAILS_KEY = "ml.lock.fails", LEFT_KEY = "ml.lock.left";
const read =(key) => { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* stays off */ } };
const savedCred = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
const saveCred = (id) => { try { localStorage.setItem(KEY, id); } catch (e) { /* stays off */ } };
const clearLock = () => { try { [KEY, PASS_KEY, FAILS_KEY].forEach((k) => localStorage.removeItem(k)); } catch (e) { /* nothing saved */ } };

const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

const FACE_ICON = '<svg viewBox="0 0 48 48" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M6 16V10a4 4 0 0 1 4-4h6M32 6h6a4 4 0 0 1 4 4v6M42 32v6a4 4 0 0 1-4 4h-6M16 42h-6a4 4 0 0 1-4-4v-6"/>' +
  '<path d="M17 19v3M31 19v3M24 19v8h-2M18 33c3.500 2.500 8.500 2.500 12 0"/></svg>';
const DELETE_ICON = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7z"/><path d="M12 10l4 4M16 10l-4 4"/></svg>';

async function faceIdAvailable() {
  if (!isIOS(navigator) || !window.PublicKeyCredential) return false;
  try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch (e) { return false; }
}

async function createCred() {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: randomBytes(32),
    rp: { name: "Money Ledger", id: location.hostname },
    user: { id: randomBytes(16), name: "Money Ledger", displayName: "Money Ledger" },
    pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "required" },
    attestation: "none",
    timeout: 60000,
  } });
  return toB64(cred.rawId);
}

async function askFaceId() {
  const cred = await navigator.credentials.get({ publicKey: {
    challenge: randomBytes(32),
    rpId: location.hostname,
    allowCredentials: [{ type: "public-key", id: fromB64(savedCred()), transports: ["internal"] }],
    userVerification: "required",
    timeout: 60000,
  } });
  return toB64(cred.rawId) === savedCred();
}

const savedPinLength = () => pinLengthOf(read(PASS_KEY));

// Checks the passcode, counting wrong tries. Returns "" when it is right, or what to tell the owner.
async function tryPasscode(pin) {
  const fails = read(FAILS_KEY) || { n: 0, at: 0 };
  const left = fails.at + waitAfterFails(fails.n) - Date.now();
  if (left > 0) return "Too many tries. Wait " + Math.ceil(left / 1000) + " seconds.";
  if (await checkPassword(pin, read(PASS_KEY))) { write(FAILS_KEY, { n: 0, at: 0 }); return ""; }
  write(FAILS_KEY, { n: fails.n + 1, at: Date.now() });
  return "Wrong passcode.";
}

// ---- The number pad: title, dots, and 0-9. onPin gets the digits when all of them are in. ----
function makePad(host, { title, left, length, onPin }) {
  let digits = "", busy = false;
  const key = (d) => '<button type="button" class="pin-key" data-d="' + d + '">' + d + '</button>';
  host.innerHTML = '<h2 class="pin-title"></h2><div class="pin-dots" aria-hidden="true"></div>' +
    '<div class="pin-msg" role="status"></div><div class="pin-keys">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(key).join("") +
    left + key(0) + '<button type="button" class="pin-key plain" data-del aria-label="Delete">' + DELETE_ICON + '</button></div>';
  const row = host.querySelector(".pin-dots"), msg = host.querySelector(".pin-msg"), head = host.querySelector(".pin-title");
  // the dots are drawn once and only switched on or off, so each new digit's dot springs in by itself
  const paint = () => {
    const n = length(), tick = row.querySelector(".pin-ok");
    if (tick) tick.remove();
    row.classList.remove("ok");
    if (row.querySelectorAll("span").length !== n) row.innerHTML = Array.from({ length: n }, () => "<span></span>").join("");
    row.querySelectorAll("span").forEach((s, i) => s.classList.toggle("on", i < digits.length));
  };
  const pad = {
    title: (text) => { head.textContent = text; },
    say: (text) => { msg.textContent = text; },
    reset: () => { digits = ""; busy = false; paint(); },
    shake: () => { row.classList.remove("shake"); void row.offsetWidth; row.classList.add("shake"); },
    // right passcode: the dots fold away and a check draws in their place
    ok: async () => {
      if (reduced()) return;
      row.classList.add("ok");
      await sleep(180);
      row.insertAdjacentHTML("beforeend", '<svg class="pin-ok" viewBox="0 0 24 24" aria-hidden="true"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg>');
      await sleep(420);
    },
  };
  pad.title(title);
  paint();
  host.querySelector(".pin-keys").addEventListener("click", (ev) => {
    const b = ev.target.closest("button");
    if (!b || busy) return;
    if (b.hasAttribute("data-del")) { digits = digits.slice(0, -1); paint(); return; }
    if (!b.dataset.d || digits.length >= length()) return;
    digits += b.dataset.d;
    msg.textContent = "";
    paint();
    if (digits.length === length()) { busy = true; onPin(digits); }
  });
  return pad;
}

// A full screen with a pad on it, for Settings. Returns the pad; close() takes the screen away.
function padScreen(opts) {
  const screen = document.createElement("div");
  screen.className = "lock-screen";
  screen.setAttribute("role", "dialog");
  screen.innerHTML = '<div class="pin"></div>';
  document.body.appendChild(screen);
  const close = () => screen.remove();
  const pad = makePad(screen.querySelector(".pin"), { ...opts, left: '<button type="button" class="pin-key plain small" data-cancel>Cancel</button>', onPin: (pin) => opts.onPin(pin, pad, close) });
  screen.querySelector("[data-cancel]").onclick = () => { close(); if (opts.onCancel) opts.onCancel(); };
  return pad;
}

// ---- Lock screen ----
let cover = null, pad = null, locked = false, asking = false, hiddenAt = 0, card = null;

function showAccountForm() {
  cover.querySelector(".pin").hidden = true;
  cover.querySelector("#lock-go-big").hidden = true;
  cover.querySelector("#lock-forgot").hidden = true;
  cover.querySelector("#lock-form").hidden = false;
  cover.querySelector("#lock-pass").focus();
}
// Turned on before the passcode existed: Face ID or the account password only.
function showUnlockChoices() {
  const hasPin = !!read(PASS_KEY);
  cover.querySelector(".pin").hidden = !hasPin;
  cover.querySelector("#lock-go-big").hidden = hasPin;
  cover.querySelector("#lock-forgot").hidden = false;
  cover.querySelector("#lock-forgot").textContent = hasPin ? "Forgot passcode?" : "Use account password";
  cover.querySelector("#lock-form").hidden = true;
  cover.querySelector("#lock-msg").textContent = "";
  cover.querySelector("#lock-pass").value = "";
  pad.say("");
  pad.reset();
}

function buildCover() {
  cover = document.createElement("div");
  cover.className = "lock-screen";
  cover.setAttribute("role", "dialog");
  cover.setAttribute("aria-label", "Money Ledger is locked");
  cover.innerHTML = '<div class="lock-box"><div class="pin"></div>' +
    '<button type="button" class="btn primary" id="lock-go-big" hidden>Unlock with Face ID</button>' +
    '<form id="lock-form" class="stack" style="gap:10px" novalidate hidden>' +
    '<h2 class="pin-title">Account password</h2>' +
    '<p class="hint" style="margin:0">Needs internet. This turns the lock off, and you can turn it back on in Settings.</p>' +
    '<input class="input" id="lock-pass" type="password" autocomplete="current-password" placeholder="Account password" aria-label="Account password">' +
    '<div class="form-msg" id="lock-msg" role="status"></div>' +
    '<button type="submit" class="btn" id="lock-pass-go" style="min-height:44px">Unlock</button>' +
    '<button type="button" class="lock-link" id="lock-back">Back</button></form>' +
    '<button type="button" class="lock-link" id="lock-forgot">Forgot passcode?</button></div>';
  pad = makePad(cover.querySelector(".pin"), {
    title: "Enter passcode",
    length: savedPinLength,
    left: '<button type="button" class="pin-key plain" id="lock-go" aria-label="Unlock with Face ID">' + FACE_ICON + '</button>',
    onPin: usePasscode,
  });
  cover.querySelector("#lock-go").onclick = unlock;
  cover.querySelector("#lock-go-big").onclick = unlock;
  cover.querySelector("#lock-forgot").onclick = showAccountForm;
  cover.querySelector("#lock-back").onclick = showUnlockChoices;
  cover.querySelector("#lock-form").addEventListener("submit", useAccountPassword);
  document.body.appendChild(cover);
}

function showCover() {
  const fresh = !cover;
  if (fresh) buildCover();
  if (fresh || cover.hidden) showUnlockChoices();
  cover.classList.remove("lift");
  cover.hidden = false;
}
function openApp() {
  locked = false;
  if (!cover) return;
  const c = cover;
  if (reduced()) { c.hidden = true; showUnlockChoices(); return; }
  // the screen lifts away; if the app locked again meanwhile, leave it covered
  c.classList.add("lift");
  setTimeout(() => { c.classList.remove("lift"); if (locked) return; c.hidden = true; showUnlockChoices(); }, 420);
}

async function unlock() {
  if (asking) return;
  asking = true;
  pad.say("");
  try {
    if (await askFaceId()) openApp();
    else pad.say("Face ID did not match. Try again.");
  } catch (e) {
    // Cancelled, or iOS wants a tap first: the Face ID key is there. Anything else needs saying.
    if (!e || e.name !== "NotAllowedError") { console.error(e); pad.say("Face ID is not working. Use your passcode."); }
  }
  asking = false;
}

async function usePasscode(pin) {
  const problem = await tryPasscode(pin);
  if (!problem) { await pad.ok(); openApp(); return; }
  pad.say(problem);
  pad.shake();
  pad.reset();
}

async function useAccountPassword(ev) {
  ev.preventDefault();
  const pass = cover.querySelector("#lock-pass"), go = cover.querySelector("#lock-pass-go"), msg = cover.querySelector("#lock-msg");
  if (!pass.value) { msg.textContent = "Type your password."; return; }
  go.disabled = true;
  msg.textContent = "";
  try {
    await verifyPassword(pass.value);
    clearLock();
    openApp();
    if (card) mountLockCard(card);
  } catch (e) {
    console.error(e && e.code);
    msg.textContent = authMessage(e);
  }
  go.disabled = false;
}

function lockNow() {
  locked = true;
  showCover();
  unlock();
}

// An app update reloads the page, which would forget the unlock and ask for Face ID again. So the time it was
// last open goes in sessionStorage (it survives a reload, not closing the app), under the same one-minute rule.
function saveLeftAt() {
  try {
    if (locked || !savedCred()) sessionStorage.removeItem(LEFT_KEY);
    else sessionStorage.setItem(LEFT_KEY, String(hiddenAt || Date.now()));
  } catch (e) { /* it asks again */ }
}
function takeLeftAt() {
  try {
    const at = Number(sessionStorage.getItem(LEFT_KEY));
    sessionStorage.removeItem(LEFT_KEY);
    return at;
  } catch (e) { return 0; }
}

// Runs before the app paints, so the money is never seen first.
export async function startLock() {
  window.addEventListener("pagehide", saveLeftAt);
  document.addEventListener("visibilitychange", () => {
    if (!savedCred()) return;
    if (document.hidden) { hiddenAt = Date.now(); showCover(); return; }
    const away = hiddenAt; hiddenAt = 0;
    if (!away || locked) return;
    if (shouldRelock(away, Date.now())) lockNow(); else openApp();
  });
  if (!savedCred()) return;
  const left = takeLeftAt();
  if (shouldRelock(left, Date.now())) {
    locked = true;
    showCover();
  } else if (document.hidden) {
    // reloaded in the background: the time away still counts from when the owner left
    hiddenAt = left;
    showCover();
  }
  let user;
  try { user = await currentUser(); } catch (e) { console.error(e); }
  // Signed out: a forgotten passcode would have no way back, and the account's data is not on screen anyway.
  if (user === null) { clearLock(); openApp(); return; }
  if (locked && !document.hidden) unlock();
}

// ---- The Face ID card in Settings. Only shown on an iPhone or iPad that can use it. ----
export async function mountLockCard(el) {
  if (!el) return;
  card = el;
  if (!(await faceIdAvailable())) { el.hidden = true; return; }
  el.hidden = false;
  const head = (state) => '<div class="head"><h2>Face ID</h2><span class="hint">' + state + '</span></div>';
  let user = null;
  try { user = await currentUser(); } catch (e) { console.error(e); }
  if (!user) {
    el.innerHTML = head("off") + '<p class="hint" style="margin:0">Sign in to your account first, so you can still get in if you forget your passcode.</p>';
    return;
  }
  if (savedCred()) mountOn(el, head); else mountOff(el, head);
}

function mountOff(el, head) {
  el.innerHTML = head("off") +
    '<p class="hint" style="margin:0">Ask for Face ID when you open Money Ledger, and after a minute away. A 4-digit passcode opens it if Face ID fails, even with no internet.</p>' +
    '<button type="button" class="btn" id="lock-toggle" style="align-self:flex-start">Turn on</button><div class="form-msg" id="lock-card-msg" role="status"></div>';
  const msg = el.querySelector("#lock-card-msg");
  el.querySelector("#lock-toggle").onclick = () => {
    msg.textContent = "";
    let first = "";
    padScreen({
      title: "Create a 4-digit passcode",
      length: () => PIN_LENGTH,
      onPin: async (pin, p, close) => {
        if (!first) { first = pin; p.title("Enter it again"); p.reset(); return; }
        if (pin !== first) { first = ""; p.title("Create a 4-digit passcode"); p.say("The two passcodes were different."); p.shake(); p.reset(); return; }
        try {
          // Face ID first: iOS only allows it straight after the tap, and the hash takes a moment.
          const id = await createCred();
          write(PASS_KEY, await makePassRecord(pin));
          saveCred(id);
          close();
          mountLockCard(el);
        } catch (e) {
          if (!e || e.name !== "NotAllowedError") console.error(e);
          close();
          msg.textContent = "Could not turn on Face ID. Check that iCloud Keychain is on in iPhone Settings, then try again.";
        }
      },
    });
  };
}

function mountOn(el, head) {
  const hasPin = !!read(PASS_KEY);
  el.innerHTML = head("on") +
    '<p class="hint" style="margin:0">Money Ledger asks for Face ID when you open it, and after a minute away.' + (hasPin ? "" : " Turn this off and on again to add a passcode that works with no internet.") + '</p>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn" id="lock-toggle">Turn off</button>' +
    '<button type="button" class="btn" id="lock-off-pin" hidden>Turn off with passcode</button></div>' +
    '<div class="form-msg" id="lock-card-msg" role="status"></div>';
  const btn = el.querySelector("#lock-toggle"), msg = el.querySelector("#lock-card-msg"), viaPin = el.querySelector("#lock-off-pin");
  const turnOff = () => { clearLock(); mountLockCard(el); };
  btn.onclick = async () => {
    btn.disabled = true; msg.textContent = "";
    try {
      if (await askFaceId()) { turnOff(); return; }
    } catch (e) {
      if (!e || e.name !== "NotAllowedError") console.error(e);
    }
    btn.disabled = false;
    msg.textContent = "Face ID did not finish, so it stays on.";
    viaPin.hidden = !hasPin;
  };
  viaPin.onclick = () => padScreen({
    title: "Enter passcode",
    length: savedPinLength,
    onPin: async (pin, p, close) => {
      const problem = await tryPasscode(pin);
      if (!problem) { close(); turnOff(); return; }
      p.say(problem); p.shake(); p.reset();
    },
  });
}
