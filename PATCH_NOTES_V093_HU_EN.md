# CHERRIFT v0.9.2 → v0.9.3

Alapverzió: `v0.9.1`  
Célverzió: `v0.9.3 – TEST BUILD`

## Magyar changelog

### v0.9.2 – Stability & Combat Fix

- Elkészült a Common skinek fire-frame alapú Stationary Attack rendszere.
- Mozgás a fire frame előtt megszakítja a támadást, lövedék nélkül.
- Mozgás a fire frame után megszakítja a hátralévő támadási animációt, de a kilőtt lövedék tovább repül.
- A támadás megszakítása nem nullázza a cooldown-t és nem enged gyorsabb attack spamet.
- Minden skin adatvezérelt `attackMovementMode` beállítást kapott.
- Ninja, Archer és Wuxia `mobile`, a többi jelenlegi skin `stationary` módú.
- Mobile Attack közben 68%-os mozgásisebesség-szorzó működik.
- A BAG már csak a jelenleg birtokolt, nullánál nagyobb mennyiségű tárgyakat mutatja.
- Üres BAG esetén kilenc üres inventory slot jelenik meg; ismeretlen tárgy nem kerül előre felfedésre.
- Equip, Unequip és Gear-csere nem indít Reward popupot.
- Külön reward-context készült a belső itemmozgások és a valódi jutalmak elválasztására.
- A főmenü Feedback, Bug Report, Mail és Settings ikonjai stabil, delegált kattintáskezelést kaptak.
- A preview-k teljes sprite-cellát és fix pivotot használnak; megszűnik a frame-enkénti méretváltozás és jitter.
- A boot csak a kiválasztott skin szükséges artworkjét és idle sheetjét tölti elő.
- Az összes látható buildjelzés ugyanazt a `v0.9.3 – TEST BUILD` verziót használja.

### v0.9.3 – UI & World Update

- Új, Naraka-stílusú Cherry Selector:
  - desktopon függőleges skinikonlista;
  - mobilon vízszintes, érintéssel görgethető lista;
  - Locked, New és Equipped állapot;
  - a kiválasztás nem equipel automatikusan;
  - külön Equip gomb;
  - Splash Art / Game View kapcsoló;
  - valódi sprite-sheet preview;
  - négy irány és Idle / Walk / Attack / Skill preview;
  - kattintható/tapintható skill-információs panel.
- 14 darab optimalizált, 256×256-os WebP skin-thumbnail készült, összesen körülbelül 200 KB méretben.
- Új World Select:
  - külön World 1–7 váltó;
  - kizárólag a kiválasztott World chapterei látszanak;
  - Locked, Available, Completed, Perfect Clear és Boss állapotok;
  - recommended level, difficulty, objective, best time és rewardpanelek;
  - az aktuális skin megjelenik a Play mellett;
  - zárolt vagy még el nem készült World nem indítható.
- World 1–3 a jelenlegi valódi chapteradatokat használja.
- World 4–7 konfigurált, vizuális placeholder/locked állapotot kapott; nem fed fel nem létező chaptert.
- Elkészült a kulcsalapú HU/EN lokalizáció:
  - angol fallback;
  - `{level}`, `{amount}`, `{name}` és más dinamikus változók;
  - fejlesztői warning hiányzó kulcsnál;
  - kulcsvalidáció;
  - a régi szövegalapú fordító kompatibilitási rétegként megmaradt.
- A skinadatok `nameKey`, `descriptionKey`, `passiveKey`, `skillNameKey` és `skillDescriptionKey` mezőket kaptak.
- Elkészült az első működő Event panel:
  - Closed Beta Welcome Event;
  - egyszeri 250 Coin + 1 Common Chest jutalom;
  - idempotens átvétel;
  - desktop és mobil elérés.

## Fontos assetmegjegyzések

- Az Archer sprite sheet forrásképe továbbra is cserére szorul. A frissítés nem módosította vagy generálta újra.
- A Wuxia Sakura Cherry fülét levágó forrássheet továbbra is cserére szorul. A frissítés nem módosította.
- World 4–7 végleges mapgrafikái még szükségesek. A rendszer jelenleg biztonságos placeholder/locked megjelenést használ.

## English summary

- Fire-frame based Common attack cancellation with preserved cooldown.
- Data-driven stationary/mobile attack movement modes.
- BAG only shows currently owned items.
- Gear swaps no longer trigger false Reward popups.
- Stable main-menu utility buttons and fixed-pivot sprite previews.
- New responsive Cherry Selector with separate Equip action and real sprite-sheet preview.
- New World 1–7 selector with per-World chapter lists and safe locked placeholders.
- Key-based Hungarian/English localization with fallback and validation.
- First working, idempotent Closed Beta Welcome Event.
- Archer and Wuxia source sheets were intentionally left unchanged.

## Validation

- JavaScript syntax validation.
- CSS parser validation.
- Local asset-reference validation.
- 14 optimized WebP thumbnail validation.
- Desktop `1440×900`.
- Short desktop `1128×584`.
- Phone portrait `390×844`.
- Phone landscape `844×390`.
- Returning Discord-session simulation.
- Explicit attack-cancel, cooldown, BAG, reward, World Select, Event and localization assertions.
