// Appearance: per device, so the iPhone and Windows can differ. Never synced and not in backups.
const KEY = "ml.theme";
const COLORS = { light: "#F4FAF5", dark: "#000000" };

export const normTheme = (v) => (v === "light" || v === "dark" ? v : "auto");

export function getTheme() {
  try { return normTheme(localStorage.getItem(KEY)); } catch (e) { return "auto"; }
}

function apply(choice) {
  const root = document.documentElement;
  if (choice === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  // The two theme-color tags have media queries. A forced choice sets both; Auto puts each back.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    const own = m.media.includes("dark") ? COLORS.dark : COLORS.light;
    m.content = choice === "auto" ? own : COLORS[choice];
  });
}

export function setTheme(v) {
  const choice = normTheme(v);
  try {
    if (choice === "auto") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch (e) { /* the switch still works until the app closes */ }
  apply(choice);
}

export function initThemeSwitch(box) {
  const paint = () => box.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.choice === getTheme())));
  apply(getTheme());
  paint();
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    setTheme(b.dataset.choice);
    paint();
  });
}
