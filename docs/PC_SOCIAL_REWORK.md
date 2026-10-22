# PC Social — Crystal Connections

Build: `1017-crystal-social`. Base: `954a28b` (Rework Loading Screen).

Selected concept 3: category navigation on the left, a searchable native player list in the centre, and a selected-player preview on the right. Original logo and existing crystal realm, profile ornaments and faceted button artwork are reused. No new art download is needed.

## Behaviour

- Friends, Requests, Search and Blocked remain the native Social categories. Weekly Ranking opens the existing ranking screen.
- Click a row or its diamond button to preview that player. The native Profile button and the preview's View Profile button open the existing profile modal.
- Add, Accept, Delete, Block and Unblock remain the original native buttons and handlers. No mock players, presence, chat or party features are added.
- Preview statistics come from a copied native Social snapshot and the existing read-only player_profile API. Missing or failed detail responses retain the list information. Removed players, navigation, account changes and mobile resize invalidate pending preview responses.
- Search supports Enter. The sidebar supports Arrow Up/Down, Home and End; it scrolls when categories outgrow the available height. Escape returns to the lobby unless a native dialog or input owns the key.
- Desktop gate matches the existing desktop menu (minimum width 821px, excluding short touch landscape). Mobile markup is restored when leaving desktop mode. The existing native mobile Social interface remains.
- The initial native desktop Social layout is gated until crystal chrome is attached, preventing a flash of the old menu.

## Scope

Presentation module and CSS, a read-only Social snapshot export, index/manifest build registration, targeted tests and CI registration. No database, auth, game economy, server action or asset files are changed. The complete original assets from the base version are required.

## Installation

Apply all files in CHERRIFT-PC-Social.zip to the matching repository paths. Upload index.html, src/cherrift_manifest.json, src/cherrift_prebeta.js and both new Social files together. Deploy through the repository's usual workflow; refresh once to pick up the new build query. This archive is a patch, not the complete game.
