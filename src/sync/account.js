// The Account card in Settings: sign in, create an account, sign out. The page reloads after a change
// so the whole app starts again on the right storage (this device, or your account).
import { syncAvailable, currentUser, signIn, signUp, signOutNow, authMessage } from "./firebase.js";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export async function mountAccount(el) {
  if (!el) return;
  if (!syncAvailable) {
    el.innerHTML = '<div class="head"><h2>Account</h2></div><p class="hint" style="margin:0">Sync is not set up yet, so your data stays on this device. Back it up in Settings → Backup.</p>';
    return;
  }
  el.innerHTML = '<div class="head"><h2>Account</h2></div><p class="hint" style="margin:0">Checking…</p>';
  let user = null;
  try { user = await currentUser(); } catch (e) { console.error(e); }
  if (user) {
    el.innerHTML = '<div class="head"><h2>Account</h2><span class="hint">synced</span></div>' +
      '<p class="hint" style="margin:0">Signed in as <b>' + esc(user.email) + '</b>. Your entries are saved in your account and appear on every device you sign in on.</p>' +
      '<button type="button" class="btn" id="acct-out" style="align-self:flex-start">Sign out</button><div class="form-msg" id="acct-msg"></div>';
    el.querySelector("#acct-out").onclick = async () => {
      const b = el.querySelector("#acct-out"); b.disabled = true;
      try { await signOutNow(); location.reload(); } catch (e) { b.disabled = false; el.querySelector("#acct-msg").textContent = "Could not sign out. Try again."; }
    };
    return;
  }
  el.innerHTML = '<div class="head"><h2>Account</h2><span class="hint">this device only</span></div>' +
    '<p class="hint" style="margin:0">Sign in to keep a safe copy and use Money Ledger on your iPhone and Windows with the same data.</p>' +
    '<form id="acct-form" class="stack" style="gap:10px" novalidate>' +
    '<input class="input" id="acct-email" type="email" autocomplete="email" inputmode="email" placeholder="Email" aria-label="Email">' +
    '<input class="input" id="acct-pass" type="password" autocomplete="current-password" placeholder="Password (6 or more characters)" aria-label="Password">' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="submit" class="btn primary" id="acct-in" style="flex:1;min-height:44px">Sign in</button><button type="button" class="btn" id="acct-new" style="min-height:44px">Create account</button></div>' +
    '<div class="form-msg" id="acct-msg" role="status"></div></form>';
  const msg = el.querySelector("#acct-msg"), email = el.querySelector("#acct-email"), pass = el.querySelector("#acct-pass");
  const run = async (fn) => {
    const e = email.value.trim(), p = pass.value;
    if (!e || !p) { msg.textContent = "Type your email and password."; return; }
    el.querySelectorAll("button").forEach((b) => (b.disabled = true)); msg.textContent = "One moment…";
    try { await fn(e, p); location.reload(); }
    catch (err) { console.error(err && err.code); msg.textContent = authMessage(err); el.querySelectorAll("button").forEach((b) => (b.disabled = false)); }
  };
  el.querySelector("#acct-form").addEventListener("submit", (ev) => { ev.preventDefault(); run(signIn); });
  el.querySelector("#acct-new").onclick = () => { pass.autocomplete = "new-password"; run(signUp); };
}
