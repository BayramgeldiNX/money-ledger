// Face ID lock for the iPhone app. It uses a passkey only as a way to ask iOS for Face ID, so it is a
// lock screen on this device: it does not encrypt anything, and the data stays protected by the sign-in.
// Turning it on needs a signed-in account, because the account password is the way back in if Face ID fails.
import { isIOS, shouldRelock, toB64, fromB64 } from "./lib/lock.js";
import { currentUser, verifyPassword, authMessage } from "./sync/firebase.js";

const KEY = "ml.lock.cred";
const savedCred = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
const saveCred = (id) => { try { localStorage.setItem(KEY, id); } catch (e) { /* stays off */ } };
const clearCred = () => { try { localStorage.removeItem(KEY); } catch (e) { /* nothing saved */ } };

const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

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

// ---- Lock screen ----
let cover = null, locked = false, asking = false, hiddenAt = 0, card = null;

function buildCover() {
  cover = document.createElement("div");
  cover.className = "lock-screen";
  cover.setAttribute("role", "dialog");
  cover.setAttribute("aria-label", "Money Ledger is locked");
  cover.innerHTML = '<div class="lock-box stack">' +
    '<svg class="lock-icon" viewBox="0 0 48 48" width="56" height="56" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M6 16V10a4 4 0 0 1 4-4h6M32 6h6a4 4 0 0 1 4 4v6M42 32v6a4 4 0 0 1-4 4h-6M16 42h-6a4 4 0 0 1-4-4v-6"/>' +
    '<path d="M17 19v3M31 19v3M24 19v8h-2M18 33c3.500 2.500 8.500 2.500 12 0"/></svg>' +
    '<h2>Money Ledger</h2>' +
    '<button type="button" class="btn primary" id="lock-go">Unlock with Face ID</button>' +
    '<div class="form-msg" id="lock-msg" role="status"></div>' +
    '<button type="button" class="lock-link" id="lock-pw">Use password instead</button>' +
    '<form id="lock-form" class="stack" style="gap:10px" novalidate hidden>' +
    '<p class="hint" style="margin:0">This turns Face ID off. You can turn it back on in Settings.</p>' +
    '<input class="input" id="lock-pass" type="password" autocomplete="current-password" placeholder="Account password" aria-label="Account password">' +
    '<button type="submit" class="btn" id="lock-pass-go" style="min-height:44px">Unlock</button></form></div>';
  cover.querySelector("#lock-go").onclick = unlock;
  cover.querySelector("#lock-pw").onclick = () => {
    cover.querySelector("#lock-pw").hidden = true;
    cover.querySelector("#lock-form").hidden = false;
    cover.querySelector("#lock-msg").textContent = "";
    cover.querySelector("#lock-pass").focus();
  };
  cover.querySelector("#lock-form").addEventListener("submit", usePassword);
  document.body.appendChild(cover);
}

function showCover() {
  if (!cover) buildCover();
  cover.hidden = false;
}
function openApp() {
  locked = false;
  if (!cover) return;
  cover.hidden = true;
  cover.querySelector("#lock-msg").textContent = "";
  cover.querySelector("#lock-form").hidden = true;
  cover.querySelector("#lock-pw").hidden = false;
  cover.querySelector("#lock-pass").value = "";
}

async function unlock() {
  if (asking) return;
  asking = true;
  const msg = cover.querySelector("#lock-msg");
  msg.textContent = "";
  try {
    if (await askFaceId()) openApp();
    else msg.textContent = "Face ID did not match. Try again.";
  } catch (e) {
    // Cancelled, or iOS wants a tap first: the button is there. Anything else needs saying.
    if (!e || e.name !== "NotAllowedError") { console.error(e); msg.textContent = "Face ID is not working. Use your password instead."; }
  }
  asking = false;
}

async function usePassword(ev) {
  ev.preventDefault();
  const pass = cover.querySelector("#lock-pass"), go = cover.querySelector("#lock-pass-go"), msg = cover.querySelector("#lock-msg");
  if (!pass.value) { msg.textContent = "Type your password."; return; }
  go.disabled = true;
  try {
    await verifyPassword(pass.value);
    clearCred();
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

// Runs before the app paints, so the money is never seen first.
export async function startLock() {
  document.addEventListener("visibilitychange", () => {
    if (!savedCred()) return;
    if (document.hidden) { hiddenAt = Date.now(); showCover(); return; }
    const away = hiddenAt; hiddenAt = 0;
    if (!away || locked) return;
    if (shouldRelock(away, Date.now())) lockNow(); else openApp();
  });
  if (!savedCred()) return;
  locked = true;
  showCover();
  let user;
  try { user = await currentUser(); } catch (e) { console.error(e); }
  // Signed out: the lock has no way back in, and the account's data is not on screen anyway.
  if (user === null) { clearCred(); openApp(); return; }
  if (!document.hidden) unlock();
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
    el.innerHTML = head("off") + '<p class="hint" style="margin:0">Sign in to your account first. Your password is the way back in if Face ID ever fails.</p>';
    return;
  }
  const on = !!savedCred();
  el.innerHTML = head(on ? "on" : "off") +
    '<p class="hint" style="margin:0">' + (on ? "Money Ledger asks for Face ID when you open it, and after a minute away." : "Ask for Face ID when you open Money Ledger, and after a minute away.") + '</p>' +
    '<button type="button" class="btn" id="lock-toggle" style="align-self:flex-start">' + (on ? "Turn off" : "Turn on") + '</button><div class="form-msg" id="lock-card-msg" role="status"></div>';
  const btn = el.querySelector("#lock-toggle"), msg = el.querySelector("#lock-card-msg");
  btn.onclick = async () => {
    btn.disabled = true; msg.textContent = "";
    try {
      if (on) {
        if (await askFaceId()) clearCred();
      } else {
        saveCred(await createCred());
      }
      mountLockCard(el);
    } catch (e) {
      btn.disabled = false;
      if (!e || e.name !== "NotAllowedError") console.error(e);
      msg.textContent = on ? "Face ID did not finish, so it stays on." : "Could not turn on Face ID. Check that iCloud Keychain is on in iPhone Settings, then try again.";
    }
  };
}
