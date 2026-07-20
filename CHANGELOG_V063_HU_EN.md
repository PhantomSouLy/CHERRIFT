# CHERRIFT v0.6.3 TEST BUILD

## Magyar

- Betöltés utáni, reszponzív Guest / Discord belépőképernyő került a játékba. A Guest mód egyértelműen jelzi a helyi mentés kockázatát.
- A Discord-belépés Supabase Authtal, PKCE-folyamattal, automatikus session-visszaállítással és kijelentkezéssel működik. A Settings → Account most valódi fiókállapotot mutat.
- A Supabase böngészős kliens helyi, verziózott vendor fájlként töltődik, ezért a login nem függ külső CDN-től.
- Új, helyben mentett Mail rendszer olvasatlan számlálóval, levélolvasóval és egyszer átvehető jutalommal.
- Új Feedback és Bug Report felület. Strukturált Markdown jelentést készít, amely másolható vagy előre kitöltött GitHub Issue-ként megnyitható. A teljes mentés nem kerül bele.
- A főmenü minden változatán jól látható a `TESZTVERZIÓ · v0.6.3` jelzés.
- Egységes és nagyobb Erő / HP / ATK kijelzés a desktop főmenüben, a mobil főmenüben, a Gear fejlécében és a loadout bal alsó sarkában.
- A Gyűjteményből megnyitott Daily, Achievements, Login Rewards, Shop, Mail és Feedback oldal Back gombja ismét a Gyűjteménybe visz, az aktív fül megtartásával.
- Valódi equipment ikonok minden slothoz. Common → Leather/Copper, Uncommon → Reinforced Leather/Silver, Rare → Iron/Emerald Silver, Epic és Legendary → Royal. A Weapon ikonok vizuális minőség alapján vannak sorba rendezve.
- A Common és Rare közelharci skinek a négyframe-es lila base slash effektet használják. A Warrior saját effektje külön marad.
- A Warrior új RGBA sheetjeinek helyes kiosztása: slash 3×2 / 6 frame, Whirlwind 4×2 / 8 frame. A régi 192 px-es egysoros kivágás és a placeholder ívek megszűntek.
- Mentésséma 6 a Mail állapotaihoz, visszafelé kompatibilis migrációval.
- GitHub Issue Form sablonok hibajelentéshez és visszajelzéshez.

## English

- Added a responsive post-loader Guest / Discord gate. Guest mode clearly explains the risk of browser-local saves.
- Discord sign-in now uses Supabase Auth with PKCE, automatic session restoration and sign-out. Settings → Account displays the real account state.
- The Supabase browser client is shipped as a local versioned vendor file, so login does not depend on a third-party CDN.
- New device-local Mail with an unread counter, reader and one-time claimable reward.
- New Feedback and Bug Report screen. It builds a structured Markdown report that can be copied or opened as a prefilled GitHub Issue; the complete save is never included.
- Every home layout now clearly displays `TEST BUILD · v0.6.3`.
- Consistent, larger Power / HP / ATK cards on desktop home, mobile home, the Gear header and the lower-left of the loadout stage.
- Back from Daily, Achievements, Login Rewards, Shop, Mail or Feedback opened through Library now returns to Library and preserves its active tab.
- Real equipment artwork for every slot. Common → Leather/Copper, Uncommon → Reinforced Leather/Silver, Rare → Iron/Emerald Silver, Epic and Legendary → Royal. Weapon art is ordered by visual quality.
- Common and Rare melee skins use the four-frame purple base slash; Warrior keeps its dedicated effect.
- Correct Warrior RGBA grids: 3×2 / 6-frame slash and 4×2 / 8-frame Whirlwind. The obsolete 192 px single-row slicing and placeholder arcs are removed.
- Save schema 6 stores Mail state with backward-compatible migration.
- GitHub Issue Form templates for bugs and feedback.
