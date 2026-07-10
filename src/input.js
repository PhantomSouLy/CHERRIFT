class CherriftInput {
  constructor() {
    this.keys = {};
    this.touch = null;
    this.skillWanted = false;
    this.touchMode = true;

    window.addEventListener("keydown", e => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === " " || e.key.toLowerCase() === "e") this.skillWanted = true;
    });

    window.addEventListener("keyup", e => {
      this.keys[e.key.toLowerCase()] = false;
    });

    const skill = document.getElementById("skill");
    skill.addEventListener("pointerdown", e => {
      e.preventDefault();
      this.skillWanted = true;
    });

    window.addEventListener("pointerdown", e => this._touchStart(e), { passive:false });
    window.addEventListener("pointermove", e => this._touchMove(e), { passive:false });
    window.addEventListener("pointerup", e => this._touchEnd(e), { passive:false });
    window.addEventListener("pointercancel", e => this._touchEnd(e), { passive:false });
  }

  _touchStart(e) {
    if (!this.touchMode) return;

    // Never steal taps/clicks from UI.
    if (e.target.closest("#app button, #app input, .panel, .modal, .menu-screen, .hud, .skill")) return;

    // Touch movement only on the left / middle gameplay area.
    if (e.clientX > window.innerWidth * 0.72) return;

    e.preventDefault();
    this.touch = { id:e.pointerId, sx:e.clientX, sy:e.clientY, x:e.clientX, y:e.clientY };
  }

  _touchMove(e) {
    if (!this.touch || e.pointerId !== this.touch.id) return;
    e.preventDefault();
    this.touch.x = e.clientX;
    this.touch.y = e.clientY;
  }

  _touchEnd(e) {
    if (this.touch && e.pointerId === this.touch.id) this.touch = null;
  }

  getMoveVector() {
    let x = 0, y = 0;
    if (this.keys["a"] || this.keys["arrowleft"]) x -= 1;
    if (this.keys["d"] || this.keys["arrowright"]) x += 1;
    if (this.keys["w"] || this.keys["arrowup"]) y -= 1;
    if (this.keys["s"] || this.keys["arrowdown"]) y += 1;

    if (this.touch) {
      const dx = this.touch.x - this.touch.sx;
      const dy = this.touch.y - this.touch.sy;
      const dead = 10;
      if (Math.hypot(dx, dy) > dead) {
        x += Math.max(-1, Math.min(1, dx / 70));
        y += Math.max(-1, Math.min(1, dy / 70));
      }
    }

    const len = Math.hypot(x, y);
    return len > 1 ? { x:x/len, y:y/len } : { x, y };
  }

  consumeSkill() {
    const v = this.skillWanted;
    this.skillWanted = false;
    return v;
  }
}
window.CherriftInput = CherriftInput;