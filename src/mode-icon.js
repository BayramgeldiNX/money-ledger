// Swaps the app logo (tab icon, Home Screen icon, install manifest, header logo) between ¥ (cn) and $ (intl).
const KEY = "ml.mode";
const BASE = import.meta.env.BASE_URL;
const DOLLAR_SVG = '<svg viewBox="0 0 1024 1024"><g fill="none" stroke="#fff" stroke-width="76" stroke-linecap="round" stroke-linejoin="round"><path d="M648 400C648 340 590 320 512 320 430 320 380 360 380 425 380 490 430 510 512 515 594 520 644 545 644 610 644 675 594 710 512 710 430 710 376 680 376 620M512 250v530"/></g><circle cx="780" cy="250" r="56" fill="#46C77F"/></svg>';
const orig = {}; // original attributes / markup, remembered the first time we swap

export function rememberedMode() {
  try { return localStorage.getItem(KEY) === "intl" ? "intl" : "cn"; } catch { return "cn"; }
}

function swapHref(key, el, intlHref) {
  if (!el) return;
  if (!(key in orig)) orig[key] = el.getAttribute("href");
  el.setAttribute("href", intlHref || orig[key]);
}

export function applyModeIcon(mode) {
  const intl = mode === "intl";
  try { localStorage.setItem(KEY, intl ? "intl" : "cn"); } catch {}
  const q = (s) => document.querySelector(s);
  swapHref("icon", q('link[rel="icon"]'), intl && BASE + "favicon-usd.png");
  swapHref("touch", q('link[rel="apple-touch-icon"]'), intl && BASE + "apple-touch-icon-usd.png");
  swapHref("manifest", q('link[rel="manifest"]'), intl && BASE + "manifest-intl.webmanifest");
  const logo = q(".brand .logo");
  if (logo) {
    if (!("logo" in orig)) orig.logo = logo.innerHTML;
    logo.innerHTML = intl ? DOLLAR_SVG : orig.logo;
  }
}
