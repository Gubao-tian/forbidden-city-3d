import * as THREE from "three";

/**
 * All surface detail is generated at runtime from canvases, so the repository
 * ships no binary assets and works offline. Where a surface has relief —
 * paving joints, stone courses, roof tiles — a normal map is derived from the
 * same canvas by finite differences, which is what makes close-ups read as
 * material rather than paint.
 */

function makeCanvas(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  return c;
}

function toTexture(canvas, { repeat = [1, 1], srgb = true } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = 8;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Height -> tangent-space normal map (central differences). */
function normalFromCanvas(src, strength = 2.2) {
  const w = src.width;
  const h = src.height;
  const data = src.getContext("2d").getImageData(0, 0, w, h).data;
  const lum = (x, y) => {
    const xx = (x + w) % w;
    const yy = (y + h) % h;
    const i = (yy * w + xx) * 4;
    return (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;
  };

  const out = makeCanvas(w, h, () => {});
  const ctx = out.getContext("2d");
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (lum(x + 1, y) - lum(x - 1, y)) * strength;
      const dy = (lum(x, y + 1) - lum(x, y - 1)) * strength;
      const nx = -dx;
      const ny = -dy;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * w + x) * 4;
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

/** Barrel tiles: ribs running down the slope. */
function tileCanvas() {
  return makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#c9973f";
    ctx.fillRect(0, 0, w, h);

    for (let x = 0; x < w; x += 16) {
      ctx.fillStyle = "rgba(96, 66, 24, 0.5)";
      ctx.fillRect(x, 0, 3, h);
      ctx.fillStyle = "rgba(250, 216, 140, 0.5)";
      ctx.fillRect(x + 6, 0, 2, h);
      ctx.fillStyle = "rgba(255, 236, 178, 0.18)";
      ctx.fillRect(x + 7, 0, 6, h);
    }
    for (let y = 0; y < h; y += 32) {
      ctx.fillStyle = "rgba(80, 54, 20, 0.22)";
      ctx.fillRect(0, y, w, 2);
    }
  });
}

/** Courtyard paving: large slabs, weathered. */
function pavementCanvas() {
  return makeCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#a8a294";
    ctx.fillRect(0, 0, w, h);
    const cell = 64;
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        const v = 0.94 + Math.random() * 0.1;
        ctx.fillStyle = `rgb(${Math.round(168 * v)},${Math.round(162 * v)},${Math.round(148 * v)})`;
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      }
    }
    ctx.strokeStyle = "rgba(96, 90, 78, 0.3)";
    ctx.lineWidth = 2;
    for (let y = 0; y <= h; y += cell) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x <= w; x += cell) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = `rgba(80, 74, 64, ${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  });
}

/** Han-bai-yu platform: ashlar blocks with tight joints. */
function stoneCanvas() {
  return makeCanvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#ded7c6";
    ctx.fillRect(0, 0, w, h);
    const rows = 4;
    const cols = 3;
    const bh = h / rows;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (w / cols / 2);
      for (let c = -1; c <= cols; c++) {
        const x = c * (w / cols) + offset;
        const v = 0.97 + Math.random() * 0.06;
        ctx.fillStyle = `rgb(${Math.round(222 * v)},${Math.round(215 * v)},${Math.round(198 * v)})`;
        ctx.fillRect(x + 2, r * bh + 2, w / cols - 4, bh - 4);
      }
    }
    ctx.strokeStyle = "rgba(150, 142, 124, 0.45)";
    ctx.lineWidth = 2;
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * bh);
      ctx.lineTo(w, r * bh);
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(160, 152, 134, ${0.06 + Math.random() * 0.08})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const y0 = Math.random() * h;
      ctx.moveTo(0, y0);
      for (let x = 0; x < w; x += 32) ctx.lineTo(x, y0 + (Math.random() - 0.5) * 10);
      ctx.stroke();
    }
  });
}

/** Lattice windows: gilt grid on dark timber. */
function latticeCanvas() {
  return makeCanvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = "#5c2317";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(214, 168, 96, 0.85)";
    ctx.lineWidth = 2;
    for (let x = 0; x <= w; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  });
}

/** Painted beam band: alternating blue/green panels with gold separators. */
function beamCanvas() {
  return makeCanvas(256, 32, (ctx, w, h) => {
    for (let x = 0; x < w; x += 32) {
      const i = x / 32;
      ctx.fillStyle = i % 2 === 0 ? "#1b4a63" : "#1c5a49";
      ctx.fillRect(x, 0, 32, h);
      ctx.fillStyle = "rgba(216, 178, 90, 0.9)";
      ctx.fillRect(x, 0, 3, h);
      ctx.fillStyle = "rgba(216, 178, 90, 0.35)";
      ctx.fillRect(x + 12, 9, 8, 14);
    }
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, h - 3, w, 3);
  });
}


/** Interfering ripples, used as an animated normal map for the moat. */
function rippleCanvas() {
  return makeCanvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 26; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const r = 12 + Math.random() * 46;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, "rgba(255,255,255,0.35)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  });
}

export function createMaterials() {
  const tile = tileCanvas();
  const pave = pavementCanvas();
  const stone = stoneCanvas();

  return {
    roof: new THREE.MeshStandardMaterial({
      map: toTexture(tile),
      normalMap: toTexture(normalFromCanvas(tile, 1.6), { srgb: false }),
      normalScale: new THREE.Vector2(0.6, 0.6),
      color: 0xf6cf72,
      roughness: 0.52,
      metalness: 0.12,
      envMapIntensity: 0.75,
      side: THREE.DoubleSide,
    }),
    roofDeep: new THREE.MeshStandardMaterial({
      color: 0x4a3a26,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }),
    ridge: new THREE.MeshStandardMaterial({ color: 0x5b3f1d, roughness: 0.6, metalness: 0.2 }),
    wallCap: new THREE.MeshStandardMaterial({
      color: 0x8f6d34,
      roughness: 0.78,
      metalness: 0.08,
      side: THREE.DoubleSide,
    }),
    wall: new THREE.MeshStandardMaterial({ color: 0x9d2b1f, roughness: 0.94 }),
    wallShadow: new THREE.MeshStandardMaterial({ color: 0x7d2017, roughness: 0.95 }),
    stone: new THREE.MeshStandardMaterial({
      map: toTexture(stone, { repeat: [4, 2] }),
      normalMap: toTexture(normalFromCanvas(stone, 1.4), { repeat: [4, 2], srgb: false }),
      normalScale: new THREE.Vector2(0.35, 0.35),
      color: 0xf4efe2,
      roughness: 0.95,
    }),
    stoneDark: new THREE.MeshStandardMaterial({
      map: toTexture(stone, { repeat: [4, 2] }),
      color: 0xc4b9a3,
      roughness: 0.95,
    }),
    lattice: new THREE.MeshStandardMaterial({ map: toTexture(latticeCanvas(), { repeat: [7, 3] }), roughness: 0.8 }),
    beam: new THREE.MeshStandardMaterial({ map: toTexture(beamCanvas()), roughness: 0.65 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd8b25a, roughness: 0.32, metalness: 0.85 }),
    timber: new THREE.MeshStandardMaterial({ color: 0x6b2a18, roughness: 0.85 }),
    ground: new THREE.MeshStandardMaterial({
      map: toTexture(pave, { repeat: [300, 300] }),
      normalMap: toTexture(normalFromCanvas(pave, 1.5), { repeat: [300, 300], srgb: false }),
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughness: 1,
    }),
    water: new THREE.MeshStandardMaterial({
      color: 0x24485a,
      roughness: 0.14,
      metalness: 0.22,
      transparent: true,
      opacity: 0.95,
      envMapIntensity: 1.15,
      normalMap: toTexture(normalFromCanvas(rippleCanvas(), 2.6), { repeat: [26, 26], srgb: false }),
      normalScale: new THREE.Vector2(0.35, 0.35),
    }),
    rock: new THREE.MeshStandardMaterial({ color: 0x6f6a60, roughness: 1 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x4b3b2a, roughness: 1 }),
    lantern: new THREE.MeshStandardMaterial({
      color: 0x8c2a1c,
      emissive: 0xff7a3c,
      emissiveIntensity: 0,
      roughness: 0.7,
    }),
  };
}
