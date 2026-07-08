# GaCherry Roguelike 0.1

Ez egy első, tesztelhető HTML5 Canvas alapverzió.

## Indítás

1. Csomagold ki a ZIP-et.
2. Nyisd meg az `index.html` fájlt böngészőben.
3. PC-n WASD / nyilak, mobilon virtuális joystick.

Ha valamiért telefonon nem indul helyi fájlból, töltsd fel GitHubra és kapcsold be a GitHub Pages-t, vagy futtasd kis lokális szerverrel:

```bash
python -m http.server 8000
```

Utána böngészőben:

```text
http://localhost:8000
```

## 0.1-ben benne van

- Főmenü
- Guest profil localStorage mentéssel
- Discord login helye előkészítve, de még nem aktív
- PC + mobil input
- Cherry mozgás
- Auto-fire a legközelebbi enemyre
- Special skill gomb / kattintás
- Slime enemy
- Enemy spawnolás nehezedéssel
- XP orb
- Level up 3 választással
- Game Over statok
- Collision: Cherry megakad a pályaelemekben, enemyk nem

## Fontos

Ez még prototype / 0.1 alap. A mostani sprite-ok és pályaelemek placeholder assetek. Később cserélhetők kézzel ugyanazokra a fájlnevekre.
