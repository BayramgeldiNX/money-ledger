// "Install app" card in Settings, Android only. Chrome on Android fires beforeinstallprompt when the app can be installed.
// Chrome and Edge on Windows fire it too, so everything here is skipped unless the device is Android.
import { isAndroid } from "./lib/os.js";
const android = isAndroid(navigator);
let saved = null;
const card = () => document.getElementById("install-card");
const standalone = () => navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;

function paint() {
  const el = card();
  if (el) el.hidden = !saved || standalone();
}

if (android) {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    saved = e;
    paint();
  });
  window.addEventListener("appinstalled", () => { saved = null; paint(); });
}

export function mountInstall() {
  const el = card(); if (!el || !android) return;
  el.innerHTML = '<div class="head"><h2>Install app</h2></div>' +
    '<p class="hint" style="margin:0">Put Money Ledger on your Home screen.</p>' +
    '<button type="button" class="btn" id="install-go" style="align-self:flex-start">Install app</button>';
  el.querySelector("#install-go").onclick = async () => {
    const ev = saved; if (!ev) return;
    saved = null; paint(); // a prompt can be used once
    // dismissed or not, the card stays hidden until the browser fires beforeinstallprompt again
    try { await ev.prompt(); await ev.userChoice; } catch (e) { /* the browser said no */ }
  };
  paint();
}
