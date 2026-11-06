# iPhone 15 Pro Max: design plan

For the model building this. Read `CLAUDE.md` first; its rules win over this file.
The app was shaped for the iPhone 16 Home Screen app (393 × 852), and `docs/samsung-s26-design.md` made it native on Android
(360 px). This plan makes the same app feel made for the **big iPhone 15 Pro Max**, installed on the Home Screen from Safari,
**without changing anything on iPhone 16, Android or Windows**.

## The phone

| | iPhone 15 Pro Max | iPhone 16 (today) | Galaxy S26 |
|---|---|---|---|
| CSS width × height (portrait) | **430 × 932** | 393 × 852 | about 360 × 780 |
| Pixel ratio | 3 | 3 | about 3 |
| Top safe area (portrait) | 59 px, Dynamic Island | 59 px, Dynamic Island | 0 (status bar) |
| Bottom safe area (portrait) | 34 px, home indicator | 34 px | 0 or gesture bar |
| Landscape | 932 × 430, **59 px left/right** safe area (Island side), 21 px bottom | 852 × 393 | — |
| Display | 6.7", ProMotion 120 Hz | 6.1", 60 Hz | — |
| Engine | Safari (WebKit), Home Screen app | same | Blink |
| Unlock | Face ID | Face ID | fingerprint |

iOS **Display Zoom** ("Larger Text" in Display & Brightness) makes the 15 Pro Max report a narrower viewport (about 375–393 wide);
then the iPhone 16 rules already apply. **Dynamic Type** does not change web text size in a Home Screen app, so ignore it.

## What the owner gets

Same app, same screens, same numbers and colours (green-white light look, dark look with cards). On the big phone it also:

1. **Uses the extra width calmly.** More white space and slightly larger key numbers, not more things. Home stays
   "Money left + today's food limit". The big yuan number is a touch bigger (≈44 px, from 40), dollars under it in black.
2. **Thumb reach.** A 6.7" phone is hard to reach at the top with one hand. The things used every day (+ button, tab bar,
   Save in the add form, the sheet's close) are all in the bottom half or reachable by swipe-down. Nothing new is added at the top.
3. **Rows breathe.** Entry rows, wallet rows and the calendar get a little more height and gap so the 430 px screen does not
   look like a stretched 393 px one. The calendar's 7 day cells become squarer (taller), not wider-looking.
4. **The bottom bar and + button sit exactly on the home indicator** in the Home Screen app, as on iPhone 16
   (`fitBottomBar` with `screen.height` 932; the 90 px gap cap must still hold).
5. **Landscape works.** Turning the phone sideways (932 wide, so the desktop layout with the tabs on top) never hides anything
   under the Dynamic Island or the rounded corners: the + button, toasts, sheets and the lock screen keep clear of the 59 px side
   safe areas.
6. **Smooth on ProMotion.** Motion already uses `transform` / `opacity`; keep it that way so it runs at 120 Hz. No new motion.

## Hard rules

1. **iPhone 16 (393 × 852), Android (360) and Windows (desktop) must not change.** Put the big-phone rules behind
   `@media (min-width: 420px) and (max-width: 640px)` (portrait big phone) or `:root[data-os="ios"]` + a landscape media query.
   Where a shared rule must change, prove the 393 and 360 results are the same.
2. Do not touch `src/lib/ledger.js`, `src/lib/format.js`, money maths, data shapes, Firestore or backups. No number on any screen may change
   value. Only size and spacing may change.
3. Keep the `black-translucent` status bar meta and the `body::before` black strip (see the comment in `index.html`).
4. Colours only through the existing tokens. Spending red `#D92D20`, primary green `#0B8457`, background `#F4FAF5`.
   White look: no new card boxes, grey fills or rings; thin lines and white space. Dark keeps its cards and rings.
   New light/dark differences go through tokens set in both dark blocks.
5. No new screens, no gamification, no streaks or goals.
6. New pure logic goes in `src/lib/` with Vitest tests.
7. All motion is skipped under `prefers-reduced-motion`.
8. Thumb targets stay ≥ 44 px.

## Work, in order

### 1. Big-phone portrait sizing (CSS only)
One block near the "Narrow phones" rule at the end of `src/styles.css`:
`@media (min-width: 420px) and (max-width: 640px) { … }`
(Width only, any OS: a phone 420–640 px wide in portrait gets it too. Galaxy S26 models are ≤ 412 px, so they do not.)
- `.summary .big`: 44 px (iPhone 16 stays 40; under 400 stays 34).
- `.wrap` side padding: 20 px (and `--flat-px` 20 px where it is 16 on phones), so the page has the same calm margins as the design.
- `.entry`: padding 14px 8px; `.entry .reason` 16 px.
- `.cal .day`, `#csheet .cal .day`: min-height 58 px.
- `.chip`: min-height 46 px. `.tabs button`: min-height 54 px, label 12 px.
- `#f-amount, #d-amount`: 48 px.
- Home food limit line and ring: same look, may use the extra width; do not add anything.
Check every screen (Home, Month, Reports, Debts, Wallets, Settings, add form, debt form, calendar sheet, lock screen) at 430 × 932
in White and Dark: nothing wraps that did not wrap at 393, no horizontal scroll.

### 2. Bottom bar on the tall screen
`fitBottomBar()` in `src/app.js` (iOS only) uses `screen.height - bar.bottom`. On the 15 Pro Max standalone, `screen.height` is 932 and
the real gap is 0–34 px, so the `<= 90` cap is fine. Check the logic once by reading it; change only if it is wrong for 932.
Keep `padding-bottom: env(safe-area-inset-bottom)` on `.tabs-bar`.

### 3. Landscape (iOS)
The manifest keeps `orientation: "any"` (Windows and iPad need it). At 932 × 430 the desktop layout (> 640 px) is used. Fix only what is hidden:
- `.fab` right: on desktop it is `max(20px, calc((100vw - 760px) / 2 + 20px))`, which ignores `env(safe-area-inset-right)`.
  Make it `max(20px + env(safe-area-inset-right, 0px), …)` style so the + button never sits under the Island or the corner.
  Bottom: add `env(safe-area-inset-bottom)` (already there).
- `.sheet` on desktop (centred): make sure its `max-height` leaves room for top/bottom safe areas and it scrolls inside.
- `.toast`: keep inside the left/right safe areas.
- `.lock-screen`: padding also uses `env(safe-area-inset-left/right)`.
- The `body::before` strip has height 0 in landscape (top inset 0); fine.
These `env()` values are 0 on Windows and Android, so the change is invisible there; still prove the desktop 1280 look is unchanged.

### 4. Sheets on the tall screen
- The add form sheet `max-height: calc(100dvh - 54px - safe-top - kb)` is fine, but on 932 tall the sheet should not be a near
  full-screen wall: keep its natural height; Save stays at the bottom where the thumb is.
- Drag-to-close works from the grab bar and from the sheet top; check on a tall sheet that scrolling inside the sheet does not close it.

### 5. Face ID
No change in behaviour. The 15 Pro Max has Face ID like the 16; the lock screen must look centred and fit in both orientations.

## Done when
- `npm test` and `npm run build` pass.
- 430 × 932 (iOS user agent, or `document.documentElement.dataset.os = "ios"` set by hand): every screen above looks right in White and Dark;
  the big number is 44 px; nothing wraps or scrolls sideways.
- 932 × 430 landscape: + button, toasts, sheets and the lock screen are clear of the sides.
- 393 × 852 (iPhone 16) and 360 × 780 (Android) look exactly as before; desktop 1280 is unchanged.
- The browser cannot fake `env(safe-area-inset-*)`; check those rules by reading them, and say so in the report.
