# Samsung Galaxy A55: design and build plan

For the model building this. Read `CLAUDE.md` first; its rules win over this file.
Do the steps in order. Find code by function name or selector, not by line number.

> **Status (2026-11-06):** the shared Android base (Back gesture via `src/backnav.js`, iOS-only bottom-bar fit, fingerprint
> lock, keyboard fallback, `color-scheme`, `data-os="android"`) shipped first with the Galaxy S26 plan (`docs/samsung-s26-design.md`).
> This A55 work adds on top of it: the **Install app** card (`src/install.js`), Back does nothing while the app is locked,
> the fingerprint icon on the lock pad, the status-bar strip in the page colour, and `color-scheme` following a forced White/Dark.
> Detection lives in `src/lib/lock.js` (`isAndroid`, `osOf`), not a separate `device.js`.

## The phone

| | Samsung Galaxy A55 5G |
|---|---|
| Screen | 6.6" Super AMOLED, 1080 × 2340, 120 Hz, punch-hole camera top centre |
| CSS viewport | **384 × 832** (device pixel ratio 2.8125). With the 3-button nav bar about 384 × 785 in the app |
| System | Android 14/15, One UI 6/7. Browser: Chrome (main) or Samsung Internet |
| Navigation | Gesture bar (default) or 3-button bar. **The system Back gesture/button exists** (iPhone has none) |
| Unlock | In-display fingerprint, face unlock, PIN |
| Install | Chrome menu → *Add to Home screen / Install app* (uses the web manifest, maskable icon) |

## What the owner gets

The same Money Ledger as on the iPhone 16, feeling native on the Samsung: nothing hidden under the system bars,
Back closes what is open, a fingerprint lock instead of Face ID, and an *Install app* button in Settings.
The look does not change: same green-white light theme, same dark theme, same numbers.

## Hard rules

1. **iPhone and Windows must not change.** Every Android-only behaviour is gated by `isAndroid` (JS) or `html.is-android` (CSS).
   Fixes that are only right on iOS get gated to iOS, never removed.
2. Do not touch money math (`src/lib/ledger.js`, `format.js`), data shapes, Firestore, backup or restore.
3. No new design ideas beyond this file: no haptics, no streaks, no new colours, no new screens.
4. Keep the CLAUDE.md design rules (yuan main, dollars under it, spending red, light = no boxes).
5. Do not commit. Do not push.

## Steps

### 1. Device detection (pure, tested)
- New `src/lib/device.js`: `isIOS({ userAgent, platform, maxTouchPoints })` (move it from `src/lib/lock.js`, and re-export it
  there so imports keep working) and `isAndroid({ userAgent })` (`/Android/i`).
- `src/platform.js` uses `isIOS` from there instead of its own regex.
- In `index.html`, the early inline script (next to the theme one) adds `is-android` to `<html>` when the user agent says Android,
  so CSS can target it before first paint.
- Tests in `tests/device.test.js`: A55 Chrome UA, Samsung Internet UA (`SamsungBrowser`), iPhone UA, iPad-as-Mac, Windows.

### 2. Bottom bar fit: iOS only (bug)
`fitBottomBar()` in `src/app.js` sets `--screen-h` and `--bar-gap` from `screen.height`. On Android, `screen.height` includes the
status bar and the nav bar, so the gap comes out 24–72 px and the tab bar and the + button are pushed **under the nav bar**.
Gate both values to iOS (`isIOS(navigator)`); on Android they stay unset / `0px`.

### 3. Status bar strip
`body::before` is a black strip the height of `env(safe-area-inset-top)`, made for iOS's white clock. On Android the status bar
takes its colour from `theme-color` and draws dark icons on the light theme. For `html.is-android` the strip uses `var(--bg)`
(light and dark both). If Chrome draws edge-to-edge, content still starts below the status bar.

### 4. Back gesture closes things (Android only)
Android Back must never drop the owner out of the app while something is open.
- Opening any sheet (`#sheet`, `#dsheet`, `#csheet`) pushes one history entry (`{ ml: "sheet" }`).
  Back (`popstate`) closes the top sheet with the normal close function (same animation as tapping ✕).
- Closing a sheet in the app (✕, swipe down, save, scrim tap) removes that entry with `history.back()`, guarded so the
  resulting `popstate` does not close a second sheet or reopen anything.
- Switching away from Home pushes one entry; Back on another tab goes to Home. Back on Home leaves the app as normal.
- The lock screen is never closed by Back. The URL never changes (state only, same URL).
- Gate all of it on `isAndroid`; iPhone and Windows behave as today.

### 5. Keyboard
`watchKeyboard()` works when the browser shrinks only the visual viewport (Chrome on Android does this by default, like iOS).
Samsung Internet may shrink the layout viewport instead; then `--kb` reads 0, which is correct, but `kb-open` never turns on
and the tab bar and + button ride up on top of the keyboard. On Android also treat it as keyboard-open when a text field is
focused and `window.innerHeight` dropped more than 150 px below the tallest height seen at the same width
(set `kb-open`, keep `--kb` at 0). Do not add `interactive-widget` to the viewport meta.

### 6. Fingerprint lock (Android)
`src/lock.js` today is iPhone/iPad only. Allow it on Android too: the same passkey trick works there (Chrome asks for the
fingerprint through Google Password Manager or Samsung Pass). Same 4-digit passcode fallback, same storage keys.
- Words: "Face ID" on iOS, "Fingerprint" on Android (Settings card title, unlock button label, messages). Use one helper,
  e.g. `bioName()`, not scattered ternaries. Use a fingerprint icon on Android in place of the face icon.
- Android failure message: "Could not turn on Fingerprint. Check that a screen lock and Google Password Manager or Samsung Pass are on, then try again."
- Windows still never shows the card.

### 7. Install button (Android)
Catch `beforeinstallprompt` (call `preventDefault`, keep the event). When it has fired and the app is not running standalone,
Settings shows a small row: **Install app** — "Put Money Ledger on your Home screen." Tapping calls `prompt()`; hide the row
after `appinstalled` or once used. Plain row in the Settings style, no new card colours. Nothing shows on iPhone or Windows
(they never fire the event).

### 8. Forced dark and colours
Samsung Internet and Chrome can force-darken pages that do not say they handle light. Add `color-scheme: light` to the light
`:root` tokens (dark already sets `dark`) and `<meta name="color-scheme" content="light dark">`. With a forced White or Dark
choice in `src/theme.js`, `color-scheme` must follow that choice. The theme-color tags already follow it.

### 9. Fit at 384 px
Check every screen at 384 × 832 and 384 × 785, light and dark: Home, Add sheet (favourites row, method chips, amount),
month list (sticky day heads, swipe rows), Reports (bars, donut, report grid), Wallets (transfer form), Debts, Limits, waiting list,
bills, Settings, lock screen + number pad. Nothing may overflow sideways or be cut by the nav bar.
Fix with existing breakpoints (`max-width: 400px`, `520px`, `640px`); do not add Samsung-only sizes unless a fix there would
change the iPhone (393 px).

### 10. Downloads and share
Keep `src/platform.js` downloads as normal file downloads on Android (they land in *Downloads*). Check the PDF statement and
the backup both save in the installed app.

## Already right on Android (keep)
`inputmode="decimal"` on money fields (Samsung keyboard may show `,`, and `parseAmt` accepts it), `text-size-adjust: 100%`,
16 px inputs, `env(safe-area-inset-*)` padding on the tab bar and sheets, theme-color tags, maskable icon, `prefers-reduced-motion`.

## Done means
- `npm test` and `npm run build` pass.
- Emulated A55 (384 × 832, Android user agent) in light and dark: all screens fit, tab bar sits right above the nav area,
  Back closes an open sheet, Settings shows the Fingerprint card wording.
- Emulated iPhone 16 (393 × 852, iPhone user agent): looks and behaves exactly as before.
- Windows desktop width: unchanged.

## iPhone parity list (for the checker)
Home (Money left, today's food limit line/ring) · Add sheet: amount, ¥/$ switch starting on ¥, Alipay default, sections,
reason, one-tap favourites, more options (date, type), swipe down to close · month list with sticky day heads and swipe rows
(edit/delete) · income · wallets with balances and moves between ¥ and $ wallets (flying money) · debts · limits (week/month) ·
waiting list · bills · reports and PDF statement · Settings: rate, food limit, sections, appearance (Auto/White/Dark), sign-in and
sync, backup/restore, lock, app version · offline outbox · update reload · rolling digits and other motion.
