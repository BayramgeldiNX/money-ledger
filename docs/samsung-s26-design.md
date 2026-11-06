# Samsung Galaxy S26: design plan

For the model building this. Read `CLAUDE.md` first; its rules win over this file.
The app was shaped for the iPhone 16 Home Screen app. This plan makes the same app feel native on a
Samsung Galaxy S26 installed as an app from Chrome or Samsung Internet, **without changing anything on iPhone or Windows**.

## The phone

| | Galaxy S26 | S26+ / Ultra | iPhone 16 (today) |
|---|---|---|---|
| CSS width × height | about 360 × 780 | about 384–412 × 830–915 | 393 × 852 |
| Top | status bar + punch-hole camera (centre) | same | Dynamic Island |
| Bottom | gesture bar or 3 buttons (Back · Home · Recents) | same | home indicator |
| Browser engine | Chrome / Samsung Internet (Blink) | same | Safari (WebKit) |
| Unlock | ultrasonic fingerprint, face | same | Face ID |
| Back | **system Back gesture / button** | same | none |

Samsung "Screen zoom" and "Font size" can make the page narrower or the text bigger. Design for **360 px wide** first and
check it still holds at 412 px and with text one size bigger.

## What the owner gets

The same app, same screens, same numbers and colours as on the iPhone (green-white light look, dark look with cards).
On the Samsung it also:

1. **Back works like Android.** Back closes the open sheet / form / menu first. On any tab other than Home, Back goes to Home.
   Only on Home with nothing open does Back leave the app.
2. **The bottom bar sits right on the gesture bar**, never pushed off screen or floating with a gap.
3. **The status bar matches the app** (green-white in White, black in Dark), also when the Appearance switch differs from the phone.
4. **Samsung's own dark mode never repaints the app.** The app has its own dark look.
5. **Fingerprint lock** in Settings, the same lock as Face ID on iPhone: the passkey asks Android for the fingerprint/face,
   with the same 4-digit passcode fallback and the same "forgot passcode" path. Wording says "Fingerprint" not "Face ID".
6. **A small tap of vibration** (≈10 ms) when an entry is saved and when a swipe passes the delete point. Android only
   (`navigator.vibrate`), off under `prefers-reduced-motion`. Nothing else vibrates.
7. Everything fits at 360 px: no text cut off, no row wrapping onto two lines that does not on the iPhone, no horizontal scroll.

## Hard rules

1. **iPhone and Windows must not change.** Every Android change is behind a platform check or a CSS rule that only
   matches on Android. Where a shared rule must change, prove the iPhone result is the same (393 × 852, iOS user agent).
2. Do not touch `src/lib/ledger.js`, `src/lib/format.js`, money maths, data shapes, Firestore or backups. No number on any screen may change.
3. Keep the `black-translucent` status bar meta and the iPhone `body::before` strip as they are (see the comment in `index.html`).
   On Android `env(safe-area-inset-top)` is 0, so the strip is already invisible there; keep it that way.
4. Colours only through the existing tokens. Spending stays red `#D92D20`, primary green `#0B8457`, background `#F4FAF5`.
   No new card boxes or grey fills in White.
5. No new screens, no gamification, Home stays "Money left + today's food limit".
6. New pure logic (platform checks, back-stack rules) goes in `src/lib/` with Vitest tests, like `isIOS`.
7. All motion and vibration is skipped under `prefers-reduced-motion`.

## Work, in order

### 1. Platform check
- Add `isAndroid({ userAgent })` next to `isIOS` in `src/lib/lock.js` (or a new `src/lib/platform.js` if it reads better),
  with tests (Samsung Chrome UA, Samsung Internet UA `SamsungBrowser/…`, iPhone UA, Windows UA).
- Set `document.documentElement.dataset.os = "android" | "ios" | ""` once in `src/main.js`, so CSS can target `[data-os="android"]`.

### 2. Bottom bar (bug on Android today)
`fitBottomBar()` in `src/app.js` is an iPhone fix: it uses `screen.height - bar.bottom`. On Android `screen.height`
includes the status bar and the navigation bar, so the "gap" comes out about 50–90 px and the tab bar is pushed **down,
behind the gesture bar**. Run this fix only on iOS. On Android `--screen-h` and `--bar-gap` stay unset (0).
Keep `padding-bottom: env(safe-area-inset-bottom)` on `.tabs-bar`: with Chrome edge-to-edge it is the gesture-bar height, otherwise 0.

### 3. Back button
- Keep a small in-app history: when a sheet (`#sheet`, `#dsheet`, `#csheet`), the lock passcode pad, or a full-screen view opens,
  `history.pushState({ml: "sheet"})`; when the user moves off Home, `pushState({ml: "tab"})`.
- On `popstate`: close the top sheet if one is open; else if not on Home, go to Home; else let it leave.
- Closing a sheet by tap / drag / Save must `history.back()` (or mark the state used) so Back is never "spent" on a closed sheet.
- The lock screen must not close on Back.
- Do this on all platforms only if it is invisible on iPhone and Windows (no extra history entries visible to the user on desktop
  browsers is fine to skip: limit to `data-os="android"` if unsure).

### 4. Status bar and forced dark
- `index.html`: add `<meta name="color-scheme" content="light dark">`. CSS: `:root { color-scheme: light; }`, and `dark` in both
  dark blocks, so Samsung Internet does not invert the page and form controls / date pickers match the theme.
- `src/theme.js` already rewrites both `theme-color` tags for a forced choice; check that the Android status bar really follows it
  (Chrome reads the first matching tag). Light status bar `#F4FAF5`, dark `#000000`.
- Manifest (`vite.config.js`): keep `theme_color` / `background_color` `#F4FAF5`; this is also the Android splash screen colour.

### 5. 360 px layout
Check every screen (Home, Month, Reports, Debts, Wallets, Settings, the add form, the debt form, the lock screen) at 360 × 780:
- the tab bar labels, the big money number (`.summary .big` must not wrap; the narrow-phone rule may scale it, do not change its 40 px base),
  chips in the add form, the calendar's 7 columns, wallet rows, report bars, toasts.
- Fix only with `@media (max-width: 370px)` rules or Android-only rules. Thumb targets stay ≥ 44 px (Android asks 48 dp for the main ones: the tab bar and the + button already are).

### 6. Android touch polish
- Inputs keep `font-size: 16px` (already). The amount fields use `inputmode="decimal"`; the Samsung keyboard may give a comma, and `parseAmt` already accepts it. Check it.
- Ripple / tap highlight: keep `-webkit-tap-highlight-color: transparent` (already) and the `:active` scale.
- `overscroll-behavior-y: none` on `html, body` on Android only, so the page does not glow / stretch past the top inside the app.
- The add-form drag-to-close works with touch; check it does not fight Chrome's own pull gestures.

### 7. Fingerprint lock
- `src/lock.js` today only offers the lock when `isIOS`. Offer it on Android too (`isAndroid && window.PublicKeyCredential`
  and `PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` true).
- Same passkey method (`authenticatorAttachment: "platform"`, `userVerification: "required"`), same storage keys, same relock timing,
  same 4-digit passcode fallback. Only the words change: "Face ID" → "Fingerprint", "iCloud Keychain" → "Google Password Manager / Samsung Pass".
- Android shows its own sheet; a cancel there falls back to the passcode pad, as on iPhone.

### 8. Vibration
- One helper (in `src/motion.js`): `buzz(ms = 10)` → `navigator.vibrate?.(ms)` when Android and not reduced motion.
- Call it on entry saved and when a swipe row crosses the delete point. Nowhere else.

## Done when
- `npm test` and `npm run build` pass.
- In a 360 × 780 Android-emulated browser (Chrome mobile UA, touch), every screen above looks right in White and Dark, the tab bar sits at the bottom,
  Back closes sheets then goes Home, and the add form works with the keyboard open.
- In a 393 × 852 iPhone-emulated browser the app looks and behaves exactly as before.
- Desktop (1280 wide) is unchanged.
