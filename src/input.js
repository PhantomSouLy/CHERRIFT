class InputManager {
  constructor() {
    this.keys = new Set();
    this.joy = { active: false, id: null, x: 0, y: 0 };
    this.skillPressed = false;
    this._bindKeyboard();
    this._bindTouchJoystick();
    this._bindSkill();
  }
  _bindKeyboard() {
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright"," "].includes(k)) e.preventDefault();
      this.keys.add(k);
      if (k === " " || k === "enter") this.skillPressed = true;
    }, { passive: false });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
  }
  _bindTouchJoystick() {
    const base = document.getElementById("joystickBase");
    const knob = document.getElementById("joystickKnob");
    const center = () => {
      knob.style.transform = "translate(0px,0px)";
      this.joy.x = 0; this.joy.y = 0;
    };
    const update = (clientX, clientY) => {
      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const max = rect.width * 0.33;
      const len = Math.hypot(dx, dy) || 1;
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      this.joy.x = dx / max;
      this.joy.y = dy / max;
    };
    base.addEventListener("pointerdown", (e) => {
      e.preventDefault(); base.setPointerCapture(e.pointerId);
      this.joy.active = true; this.joy.id = e.pointerId;
      update(e.clientX, e.clientY);
    }, { passive: false });
    base.addEventListener("pointermove", (e) => {
      if (!this.joy.active || e.pointerId !== this.joy.id) return;
      e.preventDefault(); update(e.clientX, e.clientY);
    }, { passive: false });
    const end = (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.active = false; this.joy.id = null; center();
    };
    base.addEventListener("pointerup", end);
    base.addEventListener("pointercancel", end);
  }
  _bindSkill() {
    const btn = document.getElementById("skillButton");
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); this.skillPressed = true; }, { passive: false });
    const canvas = document.getElementById("gameCanvas");
    canvas.addEventListener("pointerdown", (e) => {
      if (window.GaCherry && window.GaCherry.mode === "playing" && e.pointerType === "mouse" && e.button === 0) {
        this.skillPressed = true;
      }
    });
  }
  getMoveVector() {
    let x = 0, y = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) x += 1;
    if (this.keys.has("w") || this.keys.has("arrowup")) y -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) y += 1;
    x += this.joy.x; y += this.joy.y;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }
  consumeSkill() {
    const pressed = this.skillPressed;
    this.skillPressed = false;
    return pressed;
  }
}
window.InputManager = InputManager;
