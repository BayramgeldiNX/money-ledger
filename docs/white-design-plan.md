# White minimal design: build plan

For the model building this. Read `CLAUDE.md` first; its rules win over this file.
Do the steps in order and stop at each checkpoint if something fails.
Line numbers are from commit `5695af5`. They will shift as you edit, so find each rule by its selector.

## What the owner gets

The light theme becomes a white, minimal look, and Settings gets a new **Appearance** switch: `Auto · White · Dark`.

- **White:** white page, thin grey lines instead of shadows, and fewer colours. Spending stays red.
- **Dark:** looks exactly as it does today.
- **Auto:** follows the phone, as the app does today. This is the default.

### Why this shape

- **No third theme.** White replaces the current light theme, so there are still only two sets of colours to maintain.
- **The switch is required, not a nice extra.** The app has no theme setting today: `data-theme` is supported in CSS, but nothing in JS ever sets it. The owner's iPhone screenshot was in dark mode, so without a switch they would never see the white design.

## Hard rules

1. **Dark must not change at all.** Every new token gets its current look as the dark value. Step 0 and Step 7 prove this.
2. **Dark tokens live in two blocks** in `src/styles.css`: `@media (prefers-color-scheme: dark)` (line 32) and `:root[data-theme="dark"]` (line 43). Every new dark value goes in **both**.
3. **Do not touch** `src/lib/*`, money formatting, data shapes, Firestore or backup. No number on any screen may change.
4. **Do not change the status bar meta.** Keep `black-translucent` and the black `body::before` strip. The comment at `index.html:11` explains why `default` breaks the layout. The black strip stays at the top in White. This is accepted; do not try to fix it.
5. **Do not change `.summary .big` font size.** The rolling digits and the narrow-phone rule depend on it. Weight may change through the token below.
6. **Keep the blue accent.** Do not set `--accent` to black. `.k-need` is ink and `.k-want` is accent (line 586), and `.ff-bar .fx` and `.fl` work the same way (line 299), so a black accent makes two chart series look identical.
7. Do not add other design ideas, split `app.js`, or change screens beyond this plan.
8. Commit only when the owner asks. Nothing goes live until the owner says so.

## Step 0: Record dark mode before editing

Start the preview (`preview_start` with name `money-ledger`, port 5180), set the viewport to 393×852 and `colorScheme: "dark"`. On Home, run the script below through `javascript_tool` and save the result to the scratchpad. Open Settings and Report and run it again on each.

```js
const props = ["backgroundColor", "boxShadow", "borderRadius", "paddingLeft", "paddingTop", "color", "fontWeight", "borderTopWidth"];
const sel = [".card", ".summary", ".summary .big", ".icon-btn", ".month-switch button", ".tile", ".seg", ".seg button[aria-pressed='true']",
  ".banner", ".fab", ".tabs-bar", ".tabs button[aria-selected='true']", "#month-list .day-head", ".entry", ".input", ".btn", ".chip"];
Object.fromEntries(sel.map((s) => {
  const el = document.querySelector(s);
  if (!el) return [s, null];
  const c = getComputedStyle(el);
  return [s, props.map((p) => c[p]).join(" | ")];
}));
```

## Step 1: Tokens (`src/styles.css`)

**Change in `:root` (line 12):**

| Token | Now | New |
|---|---|---|
| `--bg` | `#F2F2F5` | `#FFFFFF` |
| `--surface-2` | `#F2F2F5` | `#F5F5F7` |
| `--faint` | `#A9A9B2` | `#B4B4BC` |
| `--line` | `#E6E6EB` | `#ECECEF` |
| `--scrim` | `rgba(10, 10, 20, .32)` | `rgba(10, 10, 20, .24)` |
| `--shadow` | two soft layers | `none` |

Keep `--surface`, `--ink`, `--muted`, `--accent`, `--good`, `--bad`, `--warn` and their soft versions as they are.

**Add these new tokens.** The dark values reproduce today's look exactly.

| Token | White (`:root`) | Dark (both blocks) | Used for |
|---|---|---|---|
| `--card-edge` | `0 0 0 1px var(--line)` | `none` | outline of normal cards |
| `--ctl` | `var(--surface-2)` | `var(--surface)` | round buttons and chips sitting on the page |
| `--ctl-press` | `var(--line)` | `var(--surface-2)` | pressed lock-screen key |
| `--pill-lift` | `0 1px 2px rgba(10, 10, 20, .10)` | `none` | selected pill in a segmented control |
| `--tab-on` | `var(--ink)` | `var(--accent)` | active tab colour, phone |
| `--tab-pill` | `var(--surface-2)` | `var(--accent-soft)` | active tab pill, phone |
| `--tile-mix` | `7%` | `13%` | section icon tile tint |
| `--tile-edge` | `0%` | `18%` | section icon tile outline |
| `--big-weight` | `700` | `800` | Money left number |
| `--fab-shadow` | `0 4px 14px rgba(10, 10, 20, .18)` | `0 10px 28px rgba(10,10,20,.25)` | floating + button |
| `--flat-bg` | `transparent` | `var(--surface)` | the two Home cards |
| `--flat-r` | `0px` | `var(--r)` | the two Home cards |
| `--flat-px` | `0px` | `20px` | the two Home cards, side padding |
| `--flat-rule` | `1px solid var(--line)` | `0 solid transparent` | line under Money left |

**Checkpoint:** in dark, nothing looks different yet. In light, the app looks broken because white sits on white. Step 2 fixes that.

## Step 2: Apply the tokens to the rules (`src/styles.css`)

**Cards and icons**

| Selector (line) | Change |
|---|---|
| `.card` (89) | `box-shadow: var(--card-edge)` |
| `.banner` (114) | `box-shadow: var(--card-edge)`. Leave `.banner.warn` and `.banner.synced` alone: warnings stay coloured. |
| `.tile` (125) | `background: color-mix(in srgb, var(--c) var(--tile-mix), var(--surface)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) var(--tile-edge), transparent)` |
| `.summary .big` (134) | `font-weight: var(--big-weight)` |
| `.fab` (212) | `box-shadow: var(--fab-shadow)` |

**Things that would vanish, white on white**

| Selector (line) | Change |
|---|---|
| `.month-switch button` (70) | `background: var(--ctl)` |
| `.icon-btn` (105) | `background: var(--ctl)`. Rules that already set `--surface-2` (254, 478, 963) stay as they are. |
| `.search-row .input` (262) | `background: var(--ctl)` |
| `.search-row .chip` (263) | `background: var(--ctl)` |
| `.favs .chip` (505) | `background: var(--ctl)` |
| `.pin-key` (528) | `background: var(--ctl)` |
| `.pin-key:active` (529) | `background: var(--ctl-press)` |

**Selected pills and the tab bar**

| Selector (line) | Change |
|---|---|
| `.seg button[aria-pressed="true"]` (121) | `box-shadow: var(--pill-lift)` |
| `.seg, .cur-toggle, .tabs` (832) | `--pill-sh: var(--pill-lift)`. The lines after it still override `.cur-toggle` and `.tabs` to `none`. |
| phone `.tabs button[aria-selected="true"]` (84) | `color: var(--tab-on)` |
| phone `.tabs` (835) | `--pill: var(--tab-pill)` |

**Check these by eye and change only if they are invisible in White:**
`.debt-actions .btn` (333), `.pay-row` (336), `.wform .input` (386), `.shop-warn .btn` (468), `.lc-dot` (409). If one needs a fix, use `--ctl`, or a new token if `--ctl` would change dark.

Leave the fixed colours as they are: `.logo`, `body::before`, `.sync-dot`, `.lc-tip`, the white text on coloured buttons.

## Step 3: Flat Home

Home has only two cards. They lose their box in White and keep it in Dark.

**`index.html`:** add the class `flat` to `#summary` (line 46) and to the entries card (`<div class="card" style="margin-top:12px">`, line 62).

**`src/styles.css`:** add this straight after the `.card` rule:

```css
.card.flat { background: var(--flat-bg); border-radius: var(--flat-r); padding-inline: var(--flat-px); box-shadow: none; }
.card.flat.summary { border-bottom: var(--flat-rule); border-radius: var(--flat-r); }
```

**`#month-list .day-head` (879):** the sticky header stretches across the card using a hard-coded `20px`, and with no side padding that makes the page scroll sideways. Change it to:

```css
margin-inline: calc(-1 * var(--flat-px)); padding-inline: var(--flat-px);
```

**Check after this step, in White at 393px:**
- `document.documentElement.scrollWidth === innerWidth` (no sideways scroll)
- The entry rows line up with the page edge. `.entry` has `margin: 0 -8px; padding: 10px 8px`, so leave those values alone.
- The Home calendar view and the empty state still look right, since they sit in the same card.
- Scroll a long list: the sticky day header stays opaque and covers the rows.
- Swipe rows are touch-only and can't be swiped in the preview. Read `.swipe` and `.swipe-act` (883 onward) and confirm they don't rely on the old 20px. Put this on the owner's phone list.

## Step 4: First paint and app icon colours

**`index.html`**
- Line 6: `theme-color` for light becomes `#FFFFFF`.
- Line 14: replace the inline style with:
  ```html
  <style>html{background:#FFF}@media (prefers-color-scheme:dark){html{background:#000}}html[data-theme=light]{background:#FFF}html[data-theme=dark]{background:#000}</style>
  ```
- Straight after that style, add this so the chosen theme applies before anything draws:
  ```html
  <script>try{var t=localStorage.getItem("ml.theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}</script>
  ```

**`vite.config.js`** (lines 29-30): `background_color` and `theme_color` become `#FFFFFF`.

## Step 5: Appearance switch

**New file `src/theme.js`:** match the style of `src/motion.js`.

```js
// Appearance: per device, so the iPhone and Windows can differ. Never synced and not in backups.
const KEY = "ml.theme";
const COLORS = { light: "#FFFFFF", dark: "#000000" };

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
```

If private browsing makes `localStorage` throw, `paint` falls back to Auto while the page shows the choice. That is acceptable.

**`index.html`:** add this as the **first** card inside `.settings-grid` (line 79), above `#acct-card`:

```html
<div class="card stack">
  <div class="head"><h2>Appearance</h2></div>
  <div class="seg" id="s-theme" role="group" aria-label="Appearance" style="align-self:flex-start">
    <button type="button" data-choice="auto" aria-pressed="true">Auto</button>
    <button type="button" data-choice="light" aria-pressed="false">White</button>
    <button type="button" data-choice="dark" aria-pressed="false">Dark</button>
  </div>
  <p class="hint" style="margin:0">Auto follows your phone. Saved on this device only.</p>
</div>
```

**`src/app.js`**
- Line 2 area: add `import { initThemeSwitch } from "./theme.js";`
- Init block (line 2851, beside `initThemeFade()`): call `initThemeSwitch($("s-theme"));`
- Line 2853: add `"s-theme"` to the `glide` list: `["f-type", "f-kind", "d-dir", "s-theme"]`.

Do not put this in `renderSettings` and do not set `state.settingsDirty`: the switch applies at once and has no Save step. `initThemeFade` already watches `data-theme`, so the colours ease over without new code.

**`tests/theme.test.js`:** test `normTheme`: `"light"` and `"dark"` return themselves; `"auto"`, `null`, `""` and `"blue"` return `"auto"`.

## Step 6: Update the docs

In `CLAUDE.md`:
- Add `src/theme.js` to the layout list: "Appearance switch, per device in `ml.theme`".
- In the Design rule, add: "Light is the white minimal look: lines instead of shadows. Dark keeps its cards. New light/dark differences go through tokens, set in both dark blocks."

## Step 7: Verify

**Automatic**
```bash
npm test
```
```bash
npm run build
```
Tests must pass with the new ones added (before this work: 77 passed, 2 skipped).

**Dark is unchanged:** rerun the Step 0 script on Home, Settings and Report in dark and compare it with the saved results.
The only allowed difference: Settings now has an extra card at the top.
In dark, `.summary` may report a `0px` border; that draws nothing.

**The switch**, with the viewport's `colorScheme` set to **dark** (the owner's case):
1. Auto → dark look.
2. White → white look with no reload, and the pill slides.
3. Reload → still White, with no dark flash.
4. Back to Auto → dark look, and `localStorage.getItem("ml.theme")` is `null`.
5. Set `colorScheme` to light and choose Dark → dark look.

**White, every screen at 393×852.** No invisible controls, no sideways scroll, no console errors:
- Home: list, calendar view, search open, empty month, a picked day
- Report: Day, Week, Month, Year; the charts' two series can still be told apart
- Wallets, including moving money between wallets
- Debts, including a payment row
- Limits, including one past 90%
- Settings, top to bottom
- Sheets: add entry, the Home date calendar
- Lock screen: its keys must be visible (the `.pin-key` rule in Step 2)
- Toast with Undo

Also check Home and Settings at desktop width.

**Numbers:** compare Money left, the dollar line and one entry's amounts in text before and after. They must match.

**Preview quirks, so you don't chase false bugs:**
- Screenshots can be stale; wait a second and take another.
- Numbers count up and digits roll. A screenshot right after switching tabs can show a mid-count value, such as ¥4 on the way to ¥8. Read the text after 3 seconds before calling it a bug.
- Animations can stall in the pane. Do not add `animation: none` while testing: it freezes the rolling digits.

## Step 8: Hand over

1. Send the owner before-and-after screenshots of Home and one other screen in White, and say that Dark is unchanged.
2. Tell them plainly:
   - Their phone is in dark mode, so they must open Settings → Appearance → **White** to see it.
   - The black strip behind the clock stays.
3. Ask whether to commit and put it live. Do neither without a yes.

**When they say yes:**
- Commit with the same author as recent commits, ending with the session's `Co-Authored-By` line.
- Network commands need the proxy: `git -c http.proxy=http://127.0.0.1:7897 push`, and `HTTPS_PROXY` for `gh`.
- `gh pr create` often fails here on GraphQL. `gh api` REST calls work: `repos/BayramgeldiNX/money-ledger/pulls` and `.../merge`.
- Merging to `main` runs the "Test and publish" workflow. Check that it succeeds before saying it's live.

**What the owner should check on the iPhone**, since the preview can't test these:
- Close and reopen the app, twice if needed.
- Set White, close the app and reopen it: it stays White with no dark flash.
- Swipe a row left and right on Home.
- The lock screen and Face ID.
- The add sheet with the keyboard open.
- If they change the phone between light and dark, Auto follows it.

## Undoing it

Everything is in one PR, so it can be reverted in one step. Saved data isn't touched. A leftover `ml.theme` value does nothing harmful: the CSS still reads `data-theme`.
