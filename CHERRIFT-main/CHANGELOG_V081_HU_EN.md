# CHERRIFT v0.8.1 — Arsenal Layout Hotfix

## Magyar

- Az Arsenal panel most közvetlenül a viewport fölött, önálló teljes képernyős rétegen jelenik meg.
- Megszűnt az a hiba, amikor a régi Gear képernyő jobb oldala az Arsenal mellett látható maradt.
- Az Arsenal megnyitásakor az alatta lévő teljes appfelület biztonságosan elrejtődik, bezáráskor visszaáll.
- A fejléc, material sor és kártyarács többé nem vágódik le.
- Desktopon három-, közepes szélességen két-, telefonon egyoszlopos kártyarács működik.
- Az Arsenal saját belső görgetést kapott, ezért alacsonyabb kijelzőn sem esik szét.
- Az Escape gomb visszavisz a Gear képernyőre.
- A javítás kezeli a nyelvváltáskor újragenerált Arsenal panelt is.

## English

- Arsenal now renders in an isolated full-viewport layer.
- The old Gear screen no longer remains visible beside Arsenal.
- The underlying application is hidden while Arsenal is open and restored on close.
- Header, materials and cards no longer clip outside the available area.
- The card grid uses three desktop columns, two medium-width columns and one mobile column.
- Arsenal has its own safe vertical scrolling area.
- Escape returns to Gear.
- The fix also handles Arsenal being recreated after a language change.
