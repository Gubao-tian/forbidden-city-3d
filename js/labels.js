import * as THREE from "three";

/** Billboard labels drawn on canvas -- no DOM overlay, so they scale and
 *  occlude with the scene like real 3D objects. */
function makeLabelTexture(name, en) {
  const W = 512;
  const H = en ? 200 : 132;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "rgba(9, 11, 16, 0.72)";
  ctx.strokeStyle = "rgba(224, 185, 120, 0.55)";
  ctx.lineWidth = 3;
  const r = 26;
  const x = 6;
  const y = 14;
  const w = W - 12;
  const h = H - 28;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#f5ead6";
  ctx.font = '600 74px "Songti SC", "STSong", "SimSun", serif';
  ctx.fillText(name, W / 2, en ? 118 : 86);

  if (en) {
    ctx.fillStyle = "rgba(224, 185, 120, 0.85)";
    ctx.font = '400 30px "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
    ctx.fillText(en, W / 2, 162);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createLabelLayer(labels) {
  const group = new THREE.Group();
  group.name = "labels";

  for (const item of labels) {
    const tex = makeLabelTexture(item.name, item.en);
    const material = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: item.small ? 0.72 : 0.95,
    });
    const sprite = new THREE.Sprite(material);
    const height = item.small ? 9 : 12;
    sprite.scale.set((height * tex.image.width) / tex.image.height, height, 1);
    sprite.position.copy(item.pos);
    sprite.renderOrder = item.small ? 998 : 999;
    sprite.userData.baseOpacity = material.opacity;
    group.add(sprite);
  }

  group.visible = true;
  return group;
}
