# CHERRIFT temporary asset mappings

Ezek szándékos, létező fájlra mutató helyettesítések. Nem üres vagy hibás képek: addig használhatók, amíg a végleges asset meg nem érkezik.

| Hiányzó végleges asset | Jelenlegi helyettesítés | Csere helye |
|---|---|---|
| `assets/ui/skin_thumbs/warrior_cherry.webp` | `assets/player/skins/warrior_cherry/warrior_cherry_icon.png` | `THUMB_PLACEHOLDERS` a `src/cherrift_app.js` fájlban |
| `assets/ui/skin_thumbs/wuxia_sakura_cherry.webp` | `assets/player/skins/wuxia_sakura_cherry/wuxia_sakura_cherry_icon.png` | `THUMB_PLACEHOLDERS` a `src/cherrift_app.js` fájlban |
| `assets/map/world4/world4_splashart_3.png` (World 4, Chapter 5) | `assets/map/world4/world4_splashart_2.png` | `chapterArt()` a `src/cherrift_world_ui.js` és `src/cherrift_stability.js` fájlokban |

## Későbbi csere

1. Tedd be a végleges fájlt a fenti hiányzó útvonalra.
2. A megadott cserehelyen írd át vagy töröld a fallbacket.
3. Futtasd az `npm test` parancsot.

Ne nevezd át a meglévő helyettesítő fájlokat, mert azokat más képernyők is használják.
