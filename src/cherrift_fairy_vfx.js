/* Fairy Bloom Orb and Magic Burst artwork, separate from character sprites. */
(() => {
  "use strict";
  const proto = window.CherriftGame?.prototype;
  const id = "fairy_cherry";
  if (!proto || window.CHERRIFT_FAIRY_VFX) return;

  const orb = {key:"fairyBloomOrb", file:"fairy_bloom_orb.png", frames:4};
  const burst = {key:"fairyMagicBurst", file:"fairy_magic_burst.png", frames:8};
  const root = "assets/effects/fairy_cherry/";
  if (typeof ImageAssets !== "undefined") {
    const loadAll = ImageAssets.prototype.loadAll;
    ImageAssets.prototype.loadAll = function loadFairyEffects(...args) {
      return Promise.all([loadAll.apply(this, args), ...[orb, burst].map(
        asset => this.loadImage(asset.key, root + asset.file + "?v=fairy-v1"))
      ]).then(([result]) => result);
    };
  }

  function stamp(context, image, frames, frame, x, y, width, height) {
    const cellWidth = (image.naturalWidth || image.width) / frames;
    const cellHeight = image.naturalHeight || image.height;
    context.drawImage(image, cellWidth * frame, 0, cellWidth, cellHeight,
      x - width / 2, y - height / 2, width, height);
  }

  const fire = proto.autoFire;
  proto.autoFire = function markFairyProjectiles(...args) {
    const result = fire.apply(this, args);
    if (this.player?.skin === id) {
      for (const bullet of this.player.fairyShot?.bullets || []) bullet.fairyBloom = true;
    }
    return result;
  };

  const drawBullet = proto.drawBullet;
  proto.drawBullet = function drawFairyBloom(context, bullet) {
    const image = bullet?.fairyBloom && !bullet.__elementalProjectileV095 && this.assets.get(orb.key);
    if (!image) return drawBullet.call(this, context, bullet);
    const frame = Math.floor((this.t || 0) * 16) % orb.frames;
    context.save();
    context.translate(bullet.x, bullet.y);
    context.rotate(Math.atan2(bullet.vy, bullet.vx));
    stamp(context, image, orb.frames, frame, 0, 0, 40, 40);
    context.restore();
  };

  const skill = proto.skill;
  proto.skill = function markFairyBurst(...args) {
    if (this.player?.skin !== id) return skill.apply(this, args);
    const existing = new Set(this.effects);
    const result = skill.apply(this, args);
    for (const effect of this.effects) {
      if (existing.has(effect)) continue;
      if (effect.type === "burst") {
        effect.fairyBurst = true;
        if (this.assets.get(burst.key)) effect.life = .64;
      } else if (effect.type === "skillPulseV085" || effect.type === "elemental_range_v095") {
        effect.fairyBurstDuplicate = true;
      }
    }
    return result;
  };

  const drawEffect = proto.drawEffect;
  proto.drawEffect = function drawFairyBurst(context, effect) {
    const image = (effect?.fairyBurst || effect?.fairyBurstDuplicate) && this.assets.get(burst.key);
    if (!image) return drawEffect.call(this, context, effect);
    if (effect.fairyBurstDuplicate) return;
    const phase = Math.max(0, Math.min(.9999, effect.t / effect.life));
    const frame = Math.floor(phase * burst.frames);
    const diameter = (effect.r || 185) * 2;
    const expansion = [.15,.29,.52,.79,1,1.08,1.13,1.16][frame];
    context.save();
    context.globalAlpha *= [1,1,1,1,.95,.75,.5,.24][frame];
    stamp(context, image, burst.frames, frame, effect.x, effect.y,
      diameter * expansion, diameter * expansion * .68);
    context.restore();
  };

  window.CHERRIFT_FAIRY_VFX = Object.freeze({orb, burst});
})();
