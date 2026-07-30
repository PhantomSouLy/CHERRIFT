class CherriftInput {
  constructor() {
    this.keys = new Set();
    this.skillQueued = false;
    this.touchMode = true;
    this.pointerId = null;
    this.pointerStart = { x:0, y:0 };
    this.pointerNow = { x:0, y:0 };
    this.pointerActive = false;

    window.addEventListener("keydown", e => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      const playing = document.body.classList.contains("is-playing") &&
        (!window.UI?.game || window.UI.game.mode === "playing");
      if (playing && [" ", "spacebar", "e", "shift"].includes(k)) {
        this.skillQueued = true;
        e.preventDefault();
      }
    });

    window.addEventListener("keyup", e => this.keys.delete(e.key.toLowerCase()));

    const skill = document.getElementById("skill");
    if (skill) {
      skill.addEventListener("pointerdown", e => {
        this.skillQueued = true;
        e.preventDefault();
        e.stopPropagation();
      });
    }

    window.addEventListener("pointerdown", e => {
      if (!this.shouldStartMove(e)) return;
      this.pointerId = e.pointerId;
      this.pointerActive = true;
      this.pointerStart = { x:e.clientX, y:e.clientY };
      this.pointerNow = { x:e.clientX, y:e.clientY };
    }, { passive:true });

    window.addEventListener("pointermove", e => {
      if (!this.pointerActive || e.pointerId !== this.pointerId) return;
      this.pointerNow = { x:e.clientX, y:e.clientY };
    }, { passive:true });

    const end = e => {
      if (e.pointerId !== this.pointerId) return;
      this.pointerActive = false;
      this.pointerId = null;
    };
    window.addEventListener("pointerup", end, { passive:true });
    window.addEventListener("pointercancel", end, { passive:true });

    const reset = () => {
      this.keys.clear();
      this.skillQueued = false;
      this.pointerActive = false;
      this.pointerId = null;
    };
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) reset();
    });
  }

  shouldStartMove(e) {
    const inGame = document.body.classList.contains("is-playing") &&
      (!window.UI?.game || window.UI.game.mode === "playing");
    if (!inGame || !this.touchMode) return false;
    if (e.target.closest("button,input,.modal,.panel,.menu-screen")) return false;
    return true;
  }

  getMoveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) y -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y += 1;

    if (this.pointerActive) {
      const dx = this.pointerNow.x - this.pointerStart.x;
      const dy = this.pointerNow.y - this.pointerStart.y;
      const len = Math.hypot(dx, dy);
      if (len > 8) {
        x += dx / Math.max(60, len);
        y += dy / Math.max(60, len);
      }
    }

    const l = Math.hypot(x, y);
    if (l > 1) return { x:x/l, y:y/l };
    return { x, y };
  }

  consumeSkill() {
    if (!this.skillQueued) return false;
    this.skillQueued = false;
    return true;
  }
}
window.CherriftInput = CherriftInput;
