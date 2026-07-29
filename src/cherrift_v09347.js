(() => {
"use strict";

const VERSION = "0.9.3.4.7-pc-visual-polish";
const STYLE_ID = "cherriftPcVisualV09347";

if (document.getElementById(STYLE_ID)) return;

const style = document.createElement("style");
style.id = STYLE_ID;
style.textContent = `
@media (min-width:821px) {
  :root {
    --v0933-top:68px;
    --v0933-sub:43px;
  }

  /* Primary navigation: larger and clearer, without making the bar bulky. */
  body.v0933-desktop .topnav-v0933 .rail-nav-v060 button {
    min-width:82px!important;
    gap:7px!important;
    padding:0 10px!important;
  }
  body.v0933-desktop .topnav-v0933 .rail-nav-v060 button b {
    font-size:13px!important;
    font-weight:800!important;
    line-height:1.1!important;
  }
  body.v0933-desktop .topnav-v0933 .rail-nav-v060 button i,
  body.v0933-desktop .topnav-v0933 .rail-nav-v060 button > span {
    font-size:15px!important;
  }

  /* Secondary navigation remains visibly subordinate to the main row. */
  .desktop-subnav-v0933 button {
    padding:0 17px!important;
    font-size:11.5px!important;
    font-weight:850!important;
    letter-spacing:.05px!important;
  }

  /* Chapter card stars: large, fixed and perfectly centred. */
  .chapter-card-v0933 {
    padding-bottom:58px!important;
  }
  .chapter-card-v0933 > em {
    position:absolute!important;
    left:0!important;
    right:0!important;
    bottom:14px!important;
    width:100%!important;
    margin:0!important;
    display:block!important;
    color:#ffd66d!important;
    font-size:30px!important;
    line-height:1!important;
    letter-spacing:5px!important;
    text-align:center!important;
    text-shadow:
      0 0 8px rgba(255,208,89,.62),
      0 2px 5px rgba(0,0,0,.72)!important;
  }

  /* Equipped cards: inventory-like square cards around Cherry. */
  #gear .gear-stage-v0560.gear-mmorp-layout-v090 {
    position:relative!important;
    display:block!important;
    min-height:370px!important;
    overflow:visible!important;
  }

  #gear .gear-mmorp-layout-v090 .gear-slot-v0560 {
    --slot-size:88px;
    position:absolute!important;
    inset:auto!important;
    width:var(--slot-size)!important;
    height:var(--slot-size)!important;
    min-width:var(--slot-size)!important;
    min-height:var(--slot-size)!important;
    aspect-ratio:1/1!important;
    padding:5px!important;
    display:grid!important;
    grid-template-columns:1fr!important;
    grid-template-rows:1fr!important;
    place-items:center!important;
    align-content:center!important;
    column-gap:0!important;
    overflow:hidden!important;
    border:2px solid var(--rarity)!important;
    border-radius:10px!important;
    background:
      radial-gradient(circle at 50% 24%,rgba(255,255,255,.10),transparent 42%),
      linear-gradient(145deg,rgba(53,43,58,.96),rgba(19,15,23,.99))!important;
    box-shadow:
      inset 0 0 0 1px rgba(0,0,0,.34),
      0 8px 18px rgba(0,0,0,.27),
      0 0 17px color-mix(in srgb,var(--rarity) 22%,transparent)!important;
    transform:none!important;
  }

  #gear .gear-mmorp-layout-v090 .gear-slot-v0560::after {
    inset:-3px!important;
    border-radius:13px!important;
  }

  #gear .gear-mmorp-layout-v090 .gear-slot-icon-v0560,
  #gear .gear-mmorp-layout-v090 .gear-slot-icon-v0932 {
    width:100%!important;
    height:100%!important;
    display:grid!important;
    place-items:center!important;
    font-size:29px!important;
  }

  #gear .gear-mmorp-layout-v090 .gear-slot-icon-v0560 img,
  #gear .gear-mmorp-layout-v090 .gear-slot-icon-v0932 img {
    width:82%!important;
    height:82%!important;
    object-fit:contain!important;
  }

  #gear .gear-mmorp-layout-v090 .gear-slot-v0560 > b,
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560 > small,
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560 > .arsenal-badge-v070 {
    display:none!important;
  }

  #gear .gear-mmorp-layout-v090 .gear-arsenal-level-v0932 {
    right:4px!important;
    bottom:4px!important;
  }

  #gear .gear-mmorp-layout-v090 .gear-slot-v0560.slot-helmet {
    left:50%!important;
    top:1%!important;
    right:auto!important;
    bottom:auto!important;
    transform:translateX(-50%)!important;
  }
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560.slot-armor {
    left:20%!important;
    top:25%!important;
  }
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560.slot-weapon {
    left:20%!important;
    top:52%!important;
  }
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560.slot-ring {
    left:20%!important;
    top:auto!important;
    bottom:4%!important;
  }
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560.slot-necklace {
    right:20%!important;
    top:25%!important;
  }
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560.slot-gloves {
    right:20%!important;
    top:52%!important;
  }
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560.slot-boots {
    right:20%!important;
    left:auto!important;
    top:auto!important;
    bottom:4%!important;
    transform:none!important;
  }

  #gear .gear-mmorp-layout-v090 .gear-slot-v0560:hover {
    filter:brightness(1.11)!important;
    transform:translateY(-2px)!important;
  }
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560.slot-helmet:hover {
    transform:translateX(-50%) translateY(-2px)!important;
  }
}

@media (min-width:821px) and (max-width:1200px) {
  body.v0933-desktop .topnav-v0933 .rail-nav-v060 button {
    min-width:66px!important;
    padding:0 7px!important;
  }
  body.v0933-desktop .topnav-v0933 .rail-nav-v060 button b {
    font-size:10.5px!important;
  }
  .desktop-subnav-v0933 button {
    padding:0 13px!important;
    font-size:10.5px!important;
  }
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560 {
    --slot-size:76px;
  }
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560.slot-armor,
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560.slot-weapon,
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560.slot-ring {
    left:14%!important;
  }
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560.slot-necklace,
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560.slot-gloves,
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560.slot-boots {
    right:14%!important;
  }
}

@media (min-width:821px) and (max-height:720px) {
  #gear .gear-mmorp-layout-v090 .gear-slot-v0560 {
    --slot-size:72px;
  }
  .chapter-card-v0933 > em {
    bottom:10px!important;
    font-size:27px!important;
  }
}
`;

document.head.appendChild(style);

window.CHERRIFT_V09347 = Object.freeze({
  version: VERSION,
  desktopOnly: true
});

console.info("[CHERRIFT] v0.9.3.4.7 PC visual polish loaded.");
})();
