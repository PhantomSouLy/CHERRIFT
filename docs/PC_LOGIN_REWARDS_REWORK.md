# PC Login Rewards — Crystal Calendar

Build: `1018-crystal-calendar`.
Base: `954a28b` (Rework Loading Screen), with the previously delivered PC Social `1017-crystal-social` preserved.

## Selected concept 2

Six native reward cards form a 3 by 2 calendar on the left. The seventh native card is presented separately in a tall crystal arch on the right. The current day has a highlighted card, a day counter, and one main claim action. Existing logo, background, crystal ornaments and reward art are reused.

Reward contents come from the existing native labels, including the actual seventh-day bundle of Coins, Bloom Gems and a Standard Energy Drink. The mockup's illustrative chest and quantities do not replace game rewards. Decorative illustrations use existing item artwork; no reward values are hard-coded in this presentation module.

## Behaviour and ownership

- The original current-day `data-login-day` button is moved into the desktop footer, retaining its identity and all native click handling. It is returned to its original card when the desktop layer closes. Other native buttons remain disabled/hidden according to their existing state.
- The original `CHERRIFT_ONLINE` capture handler remains responsible for `claim_login`, authentication, duplicate-request handling and server validation. The desktop module grants no local rewards and makes no API calls.
- Claimed previous days are shown only when their actual date key exists in `UI.save.login.claimed`. Unclaimed earlier days in the current calendar week are marked missed. The current button's native disabled state determines whether today's reward is already claimed.
- The reset countdown uses the existing game's UTC date convention. At midnight or when the first-day value changes, the native calendar renderer is asked to refresh eligibility. The countdown cannot enable a button or grant a reward.
- The layer uses the existing desktop gate: width at least 821px, excluding short touch landscape. Mobile retains its original layout and buttons. Desktop-to-mobile resize restores the original card markup and attributes.
- The category has a lobby back button, keyboard-accessible native claim button and Escape handling that respects existing dialogs. A desktop readiness gate prevents the old menu from flashing before crystal decoration.
- Reduced-motion preferences disable the decorative shimmer. The six-day calendar scrolls if needed in shorter windows.

## Files and compatibility

New presentation: `src/cherrift_desktop_login.js` and `assets/cherrift_desktop_login.css`.
Registration: `index.html`, `src/cherrift_manifest.json`.
Tests: `tools/desktop_login.test.mjs`, npm script and CI entry.

The patch also retains the small Social files and its read-only snapshot export because GitHub main still predates that delivered patch. Apply the archive as a whole so the shared index and manifest register both screens. No original image assets, database files, authentication implementation or economy rules are replaced.

This is a downloadable patch, not a complete game or a GitHub deployment.
