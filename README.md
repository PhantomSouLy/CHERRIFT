# CHERRIFT v0.2.2 UI + PLAY FIX

Javított 0.2 build.

## Fő javítások

- A Play utáni "csak UI / üres kék-zöld canvas" hibát javítja.
- A játék már nem próbál menü módban üres `obstacles/player` állapotból világot rajzolni.
- A világ, player, enemy, map objektumok induláskor rendesen inicializálódnak.
- Visszakerült egy látványosabb, GaCherry-szerű menü hangulat.
- Gear oldal paperdoll/body + inventory ikonrács.
- Gear statok csak kattintás után jelennek meg.
- Equip / unequip / sell működik.
- Skin választó lapozgatós carousel lett splash-art jellegű preview-val és in-game preview-val.
- Settings szebb, nagy fullscreen gombbal.
- Mobilon a mozgás továbbra is láthatatlan, nagy bal oldali touch area.

## Assetek

A játék a meglévő asset útvonalakat használja:

- `assets/player/cherry_sprite_sheet.png`
- `assets/enemies/slime_sprite_sheet.png`
- `assets/map/grass_tile.png`
- `assets/map/rock_small.png`
- `assets/map/rock_big.png`
- `assets/map/bush_01.png`
- `assets/map/bush_02.png`
- `assets/map/log.png`
- `assets/map/tree_small.png`
- `assets/map/tree_big.png`
- `assets/pickups/xp_small.png`
- `assets/pickups/xp_big.png`
- `assets/effects/pink_burst.png`

Ha egy asset hiányzik, a játék fallback rajzolt placeholdert használ, tehát nem omlik össze.

## Indítás

Nyisd meg az `index.html` fájlt, vagy:

```bash
python -m http.server 8000
```

Majd böngészőben:

```text
http://localhost:8000
```


## v0.2.3 click fix

- Decorative overlay layers now cannot capture clicks/touches.
- Menu/buttons/panels are forced above decorative layers.
- Canvas cannot block UI clicks.
- Mobile touch movement no longer swallows taps on menu/panels/buttons.
