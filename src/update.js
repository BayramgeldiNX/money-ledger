// Settings > App version: shows the build and lets the owner pull a newer version by hand.
// vite-plugin-pwa runs in autoUpdate mode, so a found update installs and the page reloads by itself.
import { registerSW } from "virtual:pwa-register";

let reg = null;
registerSW({ immediate: true, onRegisteredSW: (_url, r) => { reg = r || null; } });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Resolves to "updating" (page reloads on its own), "current", or "unavailable".
export async function checkForUpdate() {
  if (!reg) return "unavailable";
  try { await reg.update(); } catch { return "unavailable"; }
  for (let i = 0; i < 3 && !(reg.installing || reg.waiting); i++) await wait(300);
  return reg.installing || reg.waiting ? "updating" : "current";
}

export function mountUpdate() {
  const btn = document.getElementById("app-update");
  const msg = document.getElementById("app-update-msg");
  const build = document.getElementById("app-build");
  if (!btn) return;
  build.textContent = "Built " + __BUILD__;
  btn.onclick = async () => {
    btn.disabled = true;
    msg.textContent = "Checking…";
    const r = await checkForUpdate();
    msg.textContent = r === "updating" ? "New version found. Updating…"
      : r === "current" ? "You are up to date."
      : "Updates are not available here (open the installed app).";
    btn.disabled = false;
  };
}
