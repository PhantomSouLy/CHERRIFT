/* Shared alignment and movement clock for the three eight-direction Cherry skins.
   Geometry is measured at build time: no canvas pixel reads during gameplay. */
(() => {
  'use strict';
  if (!window.CherriftGame || window.CHERRIFT_CHERRY_MOTION) return;
  const ids = new Set(['cherry_default', 'archer_cherry', 'ninja_cherry']);
  const proto = CherriftGame.prototype;
  const move = proto.movePlayer;
  proto.movePlayer = function moveCherryWithStride(v, dt) {
    const p = this.player, x = p?.x, y = p?.y;
    const result = move.call(this, v, dt);
    if (p && p === this.player && ids.has(p.skin) && dt > 0 && !(p.dashTimer > 0)) {
      // Advance only on actual travel; facing changes and attack casts cannot
      // restart the legs. Pausing and pushing into a wall do not advance them.
      const distance = Math.hypot(p.x - x, p.y - y);
      const speed = Math.max(1, p.speed || 235);
      p.cherryStrideTime = (p.cherryStrideTime || 0) + Math.min(dt, distance / speed);
    }
    return result;
  };
  function walkFrame(p, count = 6) {
    return Math.floor((p.cherryStrideTime || 0) * 8) % count;
  }
  function draw(ctx, image, id, state, dir, frame, p, width, height) {
    const frames = window.CHERRIFT_CHERRY_GEOMETRY?.[id]?.[state]?.[dir];
    let geometry = frames?.[frame];
    let sourceFrame=frame;
    if (state.startsWith('walk') && geometry && window.CHERRIFT_CHERRY_GAIT) {
      sourceFrame=state === 'walk' ? 0 : frame;
      const gaitGeometry=frames[sourceFrame];
      const gait=window.CHERRIFT_CHERRY_GAIT.get(image,id,dir,walkFrame(p),gaitGeometry,sourceFrame);
      if(gait) {image=gait;frame=0;geometry=gaitGeometry;}
    }
    if (!geometry) {
      ctx.drawImage(image, frame * 192, 0, 192, 192,
        p.x - 96 * width / 192, p.y + 30 - 184 * height / 192, width, height);
      return;
    }
    const [top, bottom, footX] = geometry;
    // Same visible height in every direction/state, isotropic scale preserves
    // body proportions. The common soles baseline eliminates vertical hopping.
    // Skills keep their crouch/lean relative to their own idle directional size.
    const idle = window.CHERRIFT_CHERRY_GEOMETRY[id].idle[dir];
    const bodyHeight = state === 'skill'
      ? idle.reduce((sum, g) => sum + g[1] - g[0], 0) / idle.length
      : bottom - top;
    const scale = 156 / bodyHeight;
    const w = width * scale, h = height * scale;
    ctx.drawImage(image, frame * 192, 0, 192, 192,
      p.x - footX * w / 192, p.y + 30 - bottom * h / 192, w, h);
  }
  window.CHERRIFT_CHERRY_MOTION = Object.freeze({walkFrame, draw});
})();
