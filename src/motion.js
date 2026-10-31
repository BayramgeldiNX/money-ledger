// Motion helpers: small DOM-only pieces that make the app feel alive. Every one of them is skipped, or lands instantly,
// when the phone asks for reduced motion. Money math never lives here: these only change how numbers and rows arrive.

export const reduced = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Rolling digits ----------
// For each character of `next`: a plain character, or a digit with the digit it rolls from (0 when nothing was shown before).
// Digits are matched from the right, so ¥999 -> ¥1,002 keeps the last digit in the same column.
export function rollParts(prev, next) {
  const pd = (String(prev == null ? "" : prev).match(/\d/g) || []).map(Number);
  const chars = Array.from(String(next));
  const n = chars.filter((c) => /\d/.test(c)).length;
  let k = 0;
  return chars.map((ch) => {
    if (!/\d/.test(ch)) return { ch };
    const rank = n - 1 - k++;
    const was = pd[pd.length - 1 - rank];
    return { ch, to: Number(ch), from: was == null ? 0 : was };
  });
}

const lastText = {}, lastFrom = {}, lastAt = {};
// Writes `text` into el as columns of digits that roll to their new value. Same text as before: just text, no motion.
// One change often redraws the screen twice in a row: the second draw of the same number carries on rolling
// from where the first one started, instead of cutting it short.
export function rollNumber(el, text, opts = {}) {
  const id = opts.id;
  let prev = id != null && id in lastText ? lastText[id] : "";
  if (id != null) {
    if (text === prev && Date.now() - (lastAt[id] || 0) < 450) prev = lastFrom[id];
    else if (text !== prev) { lastFrom[id] = prev; lastAt[id] = Date.now(); }
    lastText[id] = text;
  }
  if (reduced() || text === prev) { el.textContent = text; return; }
  const parts = rollParts(prev, text), digits = "0123456789".split("").map((d) => "<b>" + d + "</b>").join("");
  let k = 0;
  const cols = parts.map((p) => (p.ch === undefined || p.to === undefined) ? '<span class="rc">' + esc(p.ch) + "</span>"
    : '<span class="rd" style="--d:' + p.from + ";--k:" + k++ + '" data-to="' + p.to + '"><span class="rs">' + digits + "</span></span>").join("");
  el.innerHTML = '<span class="sr-only">' + esc(text) + '</span><span class="roll" aria-hidden="true"' + (opts.delay ? ' style="--roll-delay:' + opts.delay + 'ms"' : "") + ">" + cols + "</span>";
  const go = () => el.querySelectorAll(".rd").forEach((c) => c.style.setProperty("--d", c.dataset.to));
  // two frames so the start position is painted first; the timer is for a page that never draws a frame (hidden tab)
  requestAnimationFrame(() => requestAnimationFrame(go));
  setTimeout(go, 320);
}

// ---------- Spend tick ----------
// The amount you just entered shows for a moment beside the total, then drifts away and is gone.
export function spendTick(host, text, income) {
  if (!host || reduced()) return;
  host.querySelectorAll(".spend-tick").forEach((x) => x.remove());
  const t = document.createElement("div");
  t.className = "spend-tick " + (income ? "inc-amt" : "out-amt");
  t.textContent = text;
  t.setAttribute("aria-hidden", "true");
  host.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

// ---------- Sliding highlight ----------
// One soft pill glides to whichever button in the group is pressed. It sits behind the buttons, so if this never runs
// the buttons keep their own pressed look (the "glide" class is what hides it).
const lastPlace = new WeakMap();
function place(box, itemSel, isOn, cls) {
  const on = Array.from(box.querySelectorAll(itemSel)).find(isOn);
  let pill = box.querySelector(":scope > ." + cls);
  if (!on || !on.offsetWidth) { if (pill) pill.style.opacity = "0"; box.classList.remove("glide"); return; }
  const r = { x: on.offsetLeft, y: on.offsetTop, w: on.offsetWidth, h: on.offsetHeight };
  const put = (p, v) => { p.style.width = v.w + "px"; p.style.height = v.h + "px"; p.style.transform = "translate(" + v.x + "px," + v.y + "px)"; };
  if (!pill) {
    pill = document.createElement("i");
    pill.className = cls; pill.setAttribute("aria-hidden", "true");
    box.prepend(pill);
    // a re-drawn group starts the pill where it last was, so it still travels
    pill.style.transition = "none"; put(pill, lastPlace.get(box) || r); void pill.offsetWidth; pill.style.transition = "";
  }
  box.classList.add("glide");
  pill.style.opacity = "1";
  put(pill, r);
  lastPlace.set(box, r);
}
export function glide(box, itemSel = "button", attr = "aria-pressed") {
  if (!box || box.dataset.glide) return;
  box.dataset.glide = "1";
  const cls = "glide-pill", isOn = (b) => b.getAttribute(attr) === "true";
  const run = () => place(box, itemSel, isOn, cls);
  new MutationObserver((muts) => {
    if (muts.some((m) => m.type === "attributes" || Array.from(m.addedNodes).concat(Array.from(m.removedNodes)).some((n) => !(n.classList && n.classList.contains(cls))))) run();
  }).observe(box, { childList: true, subtree: true, attributes: true, attributeFilter: [attr] });
  try { new ResizeObserver(run).observe(box); } catch (e) {}
  run();
}

// ---------- Loading skeleton ----------
export function skeletonRows(n = 6) {
  const row = '<div class="sk-row"><i class="sk sk-tile"></i><span><i class="sk sk-l1"></i><i class="sk sk-l2"></i></span><i class="sk sk-amt"></i></div>';
  return '<div class="sk-list" role="status"><span class="sr-only">Loading…</span><div aria-hidden="true">' + row.repeat(n) + "</div></div>";
}

// ---------- Empty-state line art ----------
const ART = {
  wallet: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3"/><path d="M4 7.5v9A2.5 2.5 0 0 0 6.5 19H20V8H6.5A2.5 2.5 0 0 1 4 7.5z"/><circle cx="16" cy="13.5" r="1"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  gauge: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4.2-4.6"/><circle cx="12" cy="16" r="1.3"/>',
};
const drawn = new Set();
// One thin line drawing. It draws itself the first time it is shown, and just sits there afterwards.
export function emptyArt(kind) {
  const first = !drawn.has(kind); drawn.add(kind);
  return '<svg class="empty-art' + (first ? " draw" : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ART[kind] || ART.wallet).replace(/<(path|circle)/g, '<$1 pathLength="1"') + "</svg>";
}

// ---------- Sticky day headers ----------
// A day header that has reached the top of the screen gets the "stuck" look (tighter, with a soft shadow).
export function watchStuck(listId) {
  let raf = 0;
  const update = () => {
    raf = 0;
    const list = document.getElementById(listId);
    if (!list || !list.offsetParent) return;
    list.querySelectorAll(".day-head").forEach((h) => {
      const top = parseFloat(getComputedStyle(h).top) || 0;
      h.classList.toggle("stuck", h.getBoundingClientRect().top <= top + 0.5);
    });
  };
  window.addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
}

// ---------- Swipe rows (touch screens) ----------
// Swipe a row left to reveal Delete (you still tap it); swipe right past the edge and it opens for editing.
export function initSwipe(list, { onEdit, onDelete }) {
  const OPEN = 92, EDIT_AT = 64, touch = "ontouchstart" in window || (navigator.maxTouchPoints || 0) > 0;
  let t = null, openRow = null, swallow = 0;
  const entryOf = (w) => w.querySelector(".entry");
  const setX = (w, x, anim) => { const e = entryOf(w); e.style.transition = anim ? "" : "none"; e.style.transform = x ? "translateX(" + x + "px)" : ""; };
  const closeRow = () => { if (!openRow) return; const w = openRow; openRow = null; w.classList.remove("open"); setX(w, 0, true); };
  if (!touch) return { prepare() {} };
  document.addEventListener("touchstart", (e) => { if (openRow && !openRow.contains(e.target)) closeRow(); }, { passive: true });
  list.addEventListener("touchstart", (e) => {
    const entry = e.target.closest(".swipe > .entry");
    if (!entry || e.touches.length !== 1) { t = null; return; }
    const p = e.touches[0], w = entry.parentElement;
    t = { w, x: p.clientX, y: p.clientY, base: w === openRow ? -OPEN : 0, lock: null, cur: 0 };
  }, { passive: true });
  list.addEventListener("touchmove", (e) => {
    if (!t) return;
    const p = e.touches[0], dx = p.clientX - t.x, dy = p.clientY - t.y;
    if (!t.lock) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      t.lock = Math.abs(dx) > Math.abs(dy) * 1.4 ? "x" : "y";
      if (t.lock === "x") t.w.classList.add("drag");
    }
    if (t.lock !== "x") return;
    e.preventDefault();
    let x = t.base + dx;
    // past the end it resists, like a rubber band
    if (x < -OPEN) x = -OPEN + (x + OPEN) * 0.3;
    if (x > 0) x = Math.min(x * 0.7, 130);
    t.cur = x;
    t.w.classList.toggle("right", x > 0);
    t.w.classList.toggle("ready", x >= EDIT_AT);
    setX(t.w, x, false);
  }, { passive: false });
  const end = (cancel) => {
    if (!t) return;
    const { w, lock, cur } = t; t = null;
    if (lock !== "x") return;
    swallow = Date.now() + 400;
    w.classList.remove("drag", "ready");
    if (!cancel && cur >= EDIT_AT) { setX(w, 0, true); onEdit(entryOf(w).dataset.id); }
    else if (!cancel && cur <= -OPEN / 2) { openRow = w; w.classList.add("open"); setX(w, -OPEN, true); }
    else { if (openRow === w) openRow = null; w.classList.remove("open"); setX(w, 0, true); }
  };
  list.addEventListener("touchend", () => end(false));
  list.addEventListener("touchcancel", () => end(true));
  // a swipe must not also count as a tap on the row
  list.addEventListener("click", (e) => {
    if (Date.now() < swallow) { e.stopImmediatePropagation(); e.preventDefault(); return; }
    if (openRow && !e.target.closest(".swipe-act")) { closeRow(); e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
  list.addEventListener("click", async (e) => {
    const b = e.target.closest(".swipe-act.del"); if (!b) return;
    const w = b.closest(".swipe"), id = entryOf(w).dataset.id;
    openRow = null;
    if (!reduced()) {
      const h = w.offsetHeight; w.style.overflow = "hidden";
      // the timer is a backstop: a page that is not being drawn never finishes an animation, and the delete must still happen
      try { await Promise.race([w.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 240, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" }).finished, sleep(360)]); } catch (err) {}
    }
    onDelete(id);
  });
  return {
    // wrap every row once after the list is drawn, so nothing moves in the DOM while a finger is down
    prepare() {
      openRow = null; t = null;
      list.querySelectorAll(".entries > .entry").forEach((entry) => {
        const w = document.createElement("div");
        w.className = "swipe";
        w.innerHTML = '<div class="swipe-act edit" aria-hidden="true"><span>Edit</span></div><button type="button" class="swipe-act del" tabindex="-1" aria-label="Delete this expense"><span>Delete</span></button>';
        entry.replaceWith(w); w.appendChild(entry);
      });
    },
  };
}

// First rows of a freshly shown list arrive one after another. Rows that are the new entry keep their own animation.
export function staggerRows(box, max = 8) {
  if (reduced()) return;
  Array.from(box.querySelectorAll(".entry:not(.fresh)")).slice(0, max).forEach((e, i) => { e.style.setProperty("--i", i); e.classList.add("stag"); });
}

// ---------- Bars that morph ----------
const BAR_SETS = [[".ybar .yb i", "height"], [".wb-bars i", "height"], [".hbar .b i", "width"]];
export function snapshotBars(root) {
  return BAR_SETS.map(([sel, prop]) => Array.from(root.querySelectorAll(sel)).map((i) => i.style[prop]));
}
// Bars that were on screen before and are on screen now glide from the old size to the new one.
export function morphBars(root, snap) {
  if (!snap || reduced()) return;
  BAR_SETS.forEach(([sel, prop], s) => {
    root.querySelectorAll(sel).forEach((i, k) => {
      const from = snap[s][k], to = i.style[prop];
      if (!from) return;
      i.style.animation = "none";
      if (from === to) return;
      i.animate({ [prop]: [from, to] }, { duration: 520, easing: "cubic-bezier(.2, .8, .2, 1)" });
    });
  });
}

// ---------- Touch/hover scrub on bar charts ----------
// Moving over a bar dims the others and shows its label (the bar's title) above it.
export function scrubBars(root, groupSel = ".ybars, .wbars") {
  root.querySelectorAll(groupSel).forEach((g) => {
    if (g.dataset.scrub) return;
    g.dataset.scrub = "1";
    const bars = () => Array.from(g.children).filter((c) => c.title);
    let tip = null, used = 0;
    const hide = () => { g.classList.remove("scrubbing"); g.querySelectorAll(".hot").forEach((b) => b.classList.remove("hot")); if (tip) { tip.remove(); tip = null; } };
    // a mouse already gets the bar's own tooltip; this is for a finger or a pen
    let sx = 0;
    g.addEventListener("pointerdown", (e) => { sx = e.clientX; });
    g.addEventListener("pointermove", (e) => {
      // a tap is not a scrub: it has to travel a little first
      if (e.pointerType === "mouse" || (!g.classList.contains("scrubbing") && Math.abs(e.clientX - sx) < 10)) return;
      const b = bars().find((x) => { const r = x.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right; });
      if (!b) { hide(); return; }
      if (b.classList.contains("hot")) return;
      used = Date.now() + 400;
      g.querySelectorAll(".hot").forEach((x) => x.classList.remove("hot"));
      g.classList.add("scrubbing"); b.classList.add("hot");
      if (!tip) { tip = document.createElement("div"); tip.className = "scrub-tip"; tip.setAttribute("aria-hidden", "true"); g.appendChild(tip); }
      tip.textContent = b.title;
      const gr = g.getBoundingClientRect(), br = b.getBoundingClientRect();
      tip.style.left = Math.max(70, Math.min(br.left - gr.left + br.width / 2, gr.width - 70)) + "px";
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => g.addEventListener(ev, hide));
    // letting go after a scrub must not open the month under the finger
    g.addEventListener("click", (e) => { if (Date.now() < used) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  });
}

// ---------- Money in flight ----------
// A small pill with the amount travels from one balance to another. For a ¥ <-> $ move the text changes on the way.
export function flyMoney(fromEl, toEl, fromText, toText, color) {
  if (reduced() || !fromEl || !toEl || !document.body.animate) return;
  const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
  if (!a.width || !b.width) return;
  const chip = document.createElement("div");
  chip.className = "fly-chip"; chip.setAttribute("aria-hidden", "true");
  chip.style.setProperty("--c", color || "var(--accent)");
  chip.innerHTML = '<span class="f1">' + esc(fromText) + "</span>" + (toText && toText !== fromText ? '<span class="f2">' + esc(toText) + "</span>" : "");
  document.body.appendChild(chip);
  const w = chip.offsetWidth, h = chip.offsetHeight;
  const sx = a.right - w, sy = a.top + a.height / 2 - h / 2, ex = b.right - w, ey = b.top + b.height / 2 - h / 2;
  const move = chip.animate([
    { transform: "translate(" + sx + "px," + sy + "px) scale(.85)", opacity: 0 },
    { transform: "translate(" + sx + "px," + sy + "px) scale(1)", opacity: 1, offset: 0.15 },
    { transform: "translate(" + ex + "px," + ey + "px) scale(1)", opacity: 1, offset: 0.85 },
    { transform: "translate(" + ex + "px," + ey + "px) scale(.85)", opacity: 0 },
  ], { duration: 820, easing: "cubic-bezier(.45, .05, .2, 1)" });
  const f1 = chip.querySelector(".f1"), f2 = chip.querySelector(".f2");
  if (f2) { f1.animate({ opacity: [1, 1, 0, 0] }, { duration: 820, easing: "ease-in-out" }); f2.animate({ opacity: [0, 0, 1, 1] }, { duration: 820, easing: "ease-in-out" }); }
  move.finished.then(() => chip.remove(), () => chip.remove());
  setTimeout(() => chip.remove(), 1200);
}

// ---------- Light / dark switch ----------
// When the colors swap (the system switches, or the theme is set) they ease over instead of flashing.
export function initThemeFade() {
  const root = document.documentElement; let timer = 0;
  const fade = () => { if (reduced()) return; root.classList.add("theme-fade"); clearTimeout(timer); timer = setTimeout(() => root.classList.remove("theme-fade"), 340); };
  try { new MutationObserver(fade).observe(root, { attributes: true, attributeFilter: ["data-theme"] }); } catch (e) {}
  try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", fade); } catch (e) {}
}

export { sleep };
