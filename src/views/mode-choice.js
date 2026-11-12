import { esc, reduced } from "../util.js";
// First-time "Which money do you use?" screen, and the Settings card to switch mode later.
// Plain DOM, no framework. All text goes through esc() before it is put in markup.


const LOGO = '<span class="logo" aria-hidden="true"><svg viewBox="0 0 1024 1024"><g fill="none" stroke="#fff" stroke-width="76" stroke-linecap="round" stroke-linejoin="round"><path d="M352 300 512 515 672 300M512 515v255M392 570h240M392 680h240"/></g><circle cx="780" cy="250" r="56" fill="#46C77F"/></svg></span>';

const CHOICES = [
  { mode: "cn", sym: "¥", name: "Yuan", sub: "Chinese · Alipay and WeChat Pay, dollars shown under yuan" },
  { mode: "intl", sym: "$", name: "Dollar", sub: "International · dollars only, add your own wallets" },
];

export function askMode() {
  return new Promise((resolve) => {
    const prev = document.activeElement;
    let picked = "";
    const root = document.createElement("div");
    root.className = "mc-screen";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "mc-title");
    root.innerHTML =
      '<div class="mc-box">' +
        '<div class="mc-brand">' + LOGO + '<span>Money Ledger</span></div>' +
        '<h1 class="mc-title" id="mc-title" tabindex="-1">Which money do you use?</h1>' +
        '<div class="mc-choices" role="radiogroup" aria-labelledby="mc-title">' +
          CHOICES.map((c) =>
            '<button type="button" class="mc-choice" role="radio" aria-checked="false" data-mode="' + c.mode + '">' +
              '<span class="mc-sym" aria-hidden="true">' + esc(c.sym) + '</span>' +
              '<span class="mc-text"><b>' + esc(c.sym + " " + c.name) + '</b><small>' + esc(c.sub) + '</small></span>' +
            '</button>').join("") +
        '</div>' +
        '<button type="button" class="btn primary big mc-go" disabled>Continue</button>' +
        '<p class="hint mc-note">You can change this later in Settings.</p>' +
      '</div>';
    document.body.appendChild(root);

    const go = root.querySelector(".mc-go");
    const btns = [...root.querySelectorAll(".mc-choice")];
    const pick = (b) => {
      picked = b.dataset.mode;
      btns.forEach((x) => { const on = x === b; x.setAttribute("aria-checked", String(on)); x.classList.toggle("on", on); });
      go.disabled = false;
    };
    btns.forEach((b, i) => {
      b.onclick = () => pick(b);
      b.onkeydown = (e) => {
        const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        const n = btns[(i + d + btns.length) % btns.length];
        n.focus();
        pick(n);
      };
    });

    // keep Tab inside the dialog
    const title = root.querySelector("#mc-title");
    root.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const f = [...root.querySelectorAll("button:not([disabled])")];
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === title)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    go.onclick = () => {
      if (!picked) return;
      go.disabled = true;
      const done = () => { root.remove(); try { if (prev && prev.focus) prev.focus(); } catch (e) { /* ignore */ } resolve(picked); };
      if (reduced()) done();
      else { root.classList.add("out"); setTimeout(done, 220); }
    };

    title.focus({ preventScroll: true });
  });
}

const NAMES = { cn: "Chinese (¥)", intl: "International ($)" };
const ASK = {
  intl: "Switch to International? Amounts will show in dollars only. Your entries are not changed.",
  cn: "Switch to Chinese? Amounts will show in yuan with dollars under them. Your entries are not changed.",
};

export function mountModeCard(el, { mode, onChange } = {}) {
  if (!el) return;
  const cur = mode === "intl" ? "intl" : "cn";
  const other = cur === "cn" ? "intl" : "cn";
  el.hidden = false;
  el.innerHTML =
    '<div class="head"><h2>Money mode</h2><span class="hint">' + esc(NAMES[cur]) + '</span></div>' +
    '<div class="seg mc-seg" role="group" aria-label="Money mode">' +
      '<button type="button" data-mode="cn" aria-pressed="' + (cur === "cn") + '">Chinese (¥)</button>' +
      '<button type="button" data-mode="intl" aria-pressed="' + (cur === "intl") + '">International ($)</button>' +
    '</div>' +
    '<div class="mc-confirm" hidden>' +
      '<p class="hint mc-ask" role="status"></p>' +
      '<div class="form-actions"><button type="button" class="btn primary mc-yes">Switch</button><button type="button" class="btn mc-no">Cancel</button></div>' +
    '</div>' +
    '<div class="form-msg mc-msg" role="status"></div>';

  const box = el.querySelector(".mc-confirm");
  const ask = el.querySelector(".mc-ask");
  const msg = el.querySelector(".mc-msg");
  const yes = el.querySelector(".mc-yes");
  const no = el.querySelector(".mc-no");
  let target = "";

  el.querySelectorAll(".mc-seg button").forEach((b) => {
    b.onclick = () => {
      msg.textContent = "";
      if (b.dataset.mode === cur) { box.hidden = true; target = ""; return; }
      target = other;
      ask.textContent = ASK[target];
      box.hidden = false;
      yes.disabled = false;
      yes.focus({ preventScroll: true });
    };
  });
  no.onclick = () => { box.hidden = true; target = ""; msg.textContent = ""; };
  yes.onclick = async () => {
    if (!target) return;
    yes.disabled = true;
    msg.textContent = "";
    try {
      await onChange(target);
    } catch (e) {
      console.error(e);
      msg.textContent = "Could not switch. Try again.";
      yes.disabled = false;
    }
  };
}
