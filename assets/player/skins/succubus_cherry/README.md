# Succubus Cherry — Legendary sprite pack

Játékra kész, valódi RGBA sprite sheet csomag. A karakter és az effektek külön fájlokban maradnak, ezért a támadások időzítése és az effektméret kódból szabadon állítható.

## Technikai szabvány

- Cellaméret: `192×192 px`
- Pivot: `x = 96`
- Talajvonal: `y = 184` (az utolsó látható pixelsor `183`)
- Irányok: `down`, `up`, `right`, `left`
- Formátum: valódi `RGBA PNG`, teljesen átlátszó háttérrel
- Frame-sorrend: balról jobbra
- A `left` sheetek képkockánkénti, pixelpontos tükörképei a `right` sheeteknek
- A karakter sheetekbe nincs nagy VFX beleégetve

## Animációk

| Állapot | Frame | Ajánlott FPS | Sheetméret | Megjegyzés |
|---|---:|---:|---:|---|
| `idle` | 4 | 3 | 768×192 | Alap nyugalmi loop |
| `idle2` | 6 | 5 | 1152×192 | Részletes másodlagos idle, kéz/fej/szárny/farok mozgással |
| `walk` | 6 | 8 | 1152×192 | Bal–jobb lábváltás |
| `walk_attack_ranged` | 6 | 10 | 1152×192 | Mozgás közbeni ranged cast; a walk lábframe-jeit használja |
| `attack_ranged` | 6 | 16 | 1152×192 | Helyben álló ranged támadás |
| `attack_melee` | 6 | 18 | 1152×192 | Kétlépcsős karmolás |
| `skill` | 8 | 12 | 1536×192 | Soul Drain: töltés, kitörés, tartás, recovery |

Ajánlott eseményframe-ek, 0-alapú indexeléssel:

- `walk_attack_ranged`: projectile spawn `4`
- `attack_ranged`: projectile spawn `3–4`
- `attack_melee`: első találat `2`, második találat `3–4`
- `skill`: Soul Drain burst `4`, soul wispek indítása `4–5`

## Fájlelnevezés

```text
succubus_cherry_<state>_<direction>.png
```

Példa: `succubus_cherry_walk_attack_ranged_right.png`.

A korábbi `melee` és `ranged` nevű fájlok változatlan kompatibilitási másolatai a `legacy_aliases/` mappában vannak. Az új, egyértelmű nevek: `attack_melee` és `attack_ranged`.

## Külön VFX-ek

Az `effects/` mappa tartalma:

- `claw_mark.png` — négy karmolásnyom az enemyn
- `claw_slash.png` — melee támadás első effektje
- `front_slash.png` — melee támadás második effektje
- `succubus_crimson_claw_wave.png` — ranged projectile
- `succubus_soul_hit.png` — ranged találati effekt
- `succubus_soul_wisp.png` — skill után célra repülő lélek
- `succubus_blood_shield.png` — rövid, halvány overheal shield
- `succubus_soul_drain_burst_sheet.png` — külön Soul Drain kitörés effektforrás

## Integráció

1. A gyökérben lévő 28 karakter sheetet másold a skin sprite mappájába.
2. A renderer cellaméretét állítsd `192×192`-re.
3. A pivot legyen `(96, 184)`.
4. A projectile/hit/shield/soul effekteket az animáció eseményframe-jein külön spawnold.
5. A `left` fájlokat közvetlenül használd; futásidőben már nem szükséges újra tükrözni.

## Ellenőrzés

A `validation.json` szerint mind a 28 sheet megfelelő méretű, RGBA, nem üres, nem lóg ki a cellából, és minden jobb–bal pár pixelpontosan egyezik tükrözés után.

