/* Presentation only: stable screen transitions and lobby hierarchy.
   Navigation, prices, progression, rewards and account state keep their owners. */
(() => {
  "use strict";
  if (window.CHERRIFT_PRESENTATION) return;
  let route = "", animation = null;
  const copy = (hu,en) => window.UI?.save?.settings?.language === "en" ? en : hu;
  function lobby() {
    const dashboard = document.getElementById("menuDashboardV060");
    if (!dashboard) return;
    let intro = dashboard.querySelector(".cr-lobby-intro");
    if (!intro) {
      intro = document.createElement("header");
      intro.className = "cr-lobby-intro";
      intro.innerHTML = '<span class="cr-eyebrow"></span><h1></h1><p></p>';
      dashboard.prepend(intro);
    }
    const values = [copy("CHERRIFT · A TE KALANDOD", "CHERRIFT · YOUR ADVENTURE"),
      copy("Egy új kaland<br>itt kezdődik.", "A new adventure<br>starts here."),
      copy("Válaszd ki Cherryt. Állítsd össze a felszerelésed. Indulhat a következő futam.",
        "Choose your Cherry. Build your loadout. Make the next run yours.")];
    const key=values.join("|");
    if(intro.dataset.copy!==key){intro.dataset.copy=key;intro.children[0].textContent=values[0];intro.children[1].innerHTML=values[1];intro.children[2].textContent=values[2];}
  }
  function sync() {
    lobby();
    const app=document.getElementById("app");
    if(!app) return;
    const visible=Array.from(app.children).find(el => (el.classList.contains("panel") || el.classList.contains("screen")) && !el.classList.contains("hidden") && getComputedStyle(el).display !== "none");
    const next=visible?.id || "";
    if(next===route) return;
    route=next;
    document.body.dataset.crScreen=route;
    animation?.cancel();
    if(visible && !document.body.classList.contains("v060-booting") && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animation=visible.animate?.([{opacity:.35,transform:"translateY(10px)"},{opacity:1,transform:"translateY(0)"}],{duration:260,easing:"cubic-bezier(.2,.7,.2,1)"});
    }
  }
  function start() {
    document.body.classList.add("cr-ui-ready");
    sync();
    // Only direct screen visibility is observed, never profile image children.
    const app=document.getElementById("app");
    if(app){new MutationObserver(records=>{if(records.some(r=>r.target===app || r.target.parentElement===app))sync();}).observe(app,{childList:true,attributes:true,attributeFilter:["class"],subtree:true});}
  }
  window.addEventListener("cherrift:runtime-clean-ready",start,{once:true});
  window.addEventListener("cherrift:languagechange",lobby);
  window.addEventListener("cherrift:savechange",lobby);
  window.CHERRIFT_PRESENTATION=Object.freeze({version:"1.0.1-menu-polish",sync});
})();
