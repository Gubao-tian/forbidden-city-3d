import * as THREE from "three";
import { mergeGeometries } from "../vendor/BufferGeometryUtils.js";

/**
 * Procedural trees: tapered trunk + a few branches, and a canopy built from
 * crossed alpha-cut planes ("leaf cards"). Solid spheres read as lollipops the
 * moment you zoom in; cards keep their silhouette and detail at any distance.
 */

/** Deterministic PRNG so the garden looks the same on every load. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A clump of leaves on transparent background, drawn in white so the canopy
 *  colour can come from per-vertex tints. */
function leafClusterTexture() {
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, S, S);

  const rand = mulberry32(1337);
  for (let i = 0; i < 1500; i++) {
    const angle = rand() * Math.PI * 2;
    // dense core, ragged edge
    const radius = Math.pow(rand(), 0.5) * 250;
    const x = S / 2 + Math.cos(angle) * radius;
    const y = S / 2 + Math.sin(angle) * radius * 0.94;

    const len = 6 + rand() * 11;
    const wid = len * (0.36 + rand() * 0.2);
    const shade = 205 + Math.floor(rand() * 50);
    const alpha = 0.6 + rand() * 0.4;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rand() * Math.PI * 2);
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, len, wid, 0, 0, Math.PI * 2);
    ctx.fill();
    // midrib
    ctx.strokeStyle = `rgba(${shade - 60},${shade - 60},${shade - 60},${alpha * 0.5})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-len * 0.8, 0);
    ctx.lineTo(len * 0.8, 0);
    ctx.stroke();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function barkTexture() {
  const W = 128;
  const H = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#5b4a3a";
  ctx.fillRect(0, 0, W, H);

  const rand = mulberry32(99);
  for (let i = 0; i < 220; i++) {
    const x = rand() * W;
    const w = 1 + rand() * 3;
    const shade = 60 + Math.floor(rand() * 70);
    ctx.fillStyle = `rgba(${shade},${shade - 8},${shade - 16},${0.25 + rand() * 0.4})`;
    ctx.fillRect(x, 0, w, H);
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(30,24,18,${0.2 + rand() * 0.3})`;
    ctx.fillRect(rand() * W, rand() * H, 2 + rand() * 6, 6 + rand() * 30);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export function createTreeMaterials() {
  const leafMap = leafClusterTexture();
  const leaf = new THREE.MeshStandardMaterial({
    map: leafMap,
    alphaTest: 0.36,
    side: THREE.DoubleSide,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
  });

  const bark = new THREE.MeshStandardMaterial({
    map: barkTexture(),
    color: 0x7a6653,
    roughness: 0.95,
  });

  return { leaf, bark, leafMap };
}

const SPECIES = {
  // 古柏: tall, narrow, very dense
  cypress: {
    height: [10, 15],
    trunk: 0.62,
    crown: "cone",
    hue: 0.3,
    sat: 0.26,
    light: [0.14, 0.22],
    clusters: [26, 34],
    size: [1.5, 2.3],
    branches: 3,
  },
  // 松: spreading, layered pads
  pine: {
    height: [8, 12],
    trunk: 0.55,
    crown: "layers",
    hue: 0.31,
    sat: 0.3,
    light: [0.17, 0.25],
    clusters: [20, 26],
    size: [2.2, 3.1],
    branches: 4,
  },
  // 槐 / 银杏: round crown
  broadleaf: {
    height: [8, 12],
    trunk: 0.6,
    crown: "round",
    hue: 0.27,
    sat: 0.34,
    light: [0.19, 0.28],
    clusters: [22, 30],
    size: [2.0, 3.0],
    branches: 4,
  },
  // 银杏 in autumn: tall, golden-yellow, round crown — the signature fall tree
  ginkgo: {
    height: [9, 13],
    trunk: 0.58,
    crown: "round",
    hue: 0.12,
    sat: 0.62,
    light: [0.48, 0.56],
    clusters: [24, 32],
    size: [1.7, 2.6],
    branches: 4,
  },
  // 玉兰: spring blossoms, taller with a slightly open crown
  magnolia: {
    height: [8, 11],
    trunk: 0.5,
    crown: "round",
    hue: 0.96,
    sat: 0.28,
    light: [0.68, 0.78],
    clusters: [18, 24],
    size: [1.8, 2.6],
    branches: 3,
  },
};

function crownPoints(kind, rand, h, cfg) {
  const pts = [];
  const n = cfg.clusters[0] + Math.floor(rand() * (cfg.clusters[1] - cfg.clusters[0]));

  if (kind === "cone") {
    for (let i = 0; i < n; i++) {
      const t = Math.pow(rand(), 0.75); // denser at the bottom
      const y = h * (0.28 + t * 0.72);
      const r = (1 - t) * h * 0.19 * (0.55 + rand() * 0.6);
      const a = rand() * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
  } else if (kind === "layers") {
    const layers = 4;
    for (let l = 0; l < layers; l++) {
      const t = l / (layers - 1);
      const y = h * (0.42 + t * 0.5);
      const r = h * (0.3 - t * 0.16);
      const per = Math.max(3, Math.round(n / layers));
      for (let i = 0; i < per; i++) {
        const a = (i / per) * Math.PI * 2 + rand() * 0.9;
        const rr = r * (0.55 + rand() * 0.5);
        pts.push(new THREE.Vector3(Math.cos(a) * rr, y + (rand() - 0.5) * 0.9, Math.sin(a) * rr));
      }
    }
  } else {
    for (let i = 0; i < n; i++) {
      // point on a squashed sphere shell
      const u = rand() * Math.PI * 2;
      const v = Math.acos(2 * rand() - 1);
      const rr = h * 0.26 * (0.55 + rand() * 0.5);
      pts.push(
        new THREE.Vector3(
          Math.sin(v) * Math.cos(u) * rr,
          h * 0.62 + Math.cos(v) * rr * 0.85,
          Math.sin(v) * Math.sin(u) * rr,
        ),
      );
    }
  }
  return pts;
}

function leafCard(size, position, rand, color) {
  const geo = new THREE.PlaneGeometry(size, size);
  const colors = new Float32Array(12);
  for (let i = 0; i < 4; i++) {
    const shade = 0.82 + rand() * 0.3;
    colors[i * 3] = color.r * shade;
    colors[i * 3 + 1] = color.g * shade;
    colors[i * 3 + 2] = color.b * shade;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const euler = new THREE.Euler((rand() - 0.5) * 0.8, rand() * Math.PI, (rand() - 0.5) * 0.5);
  const m = new THREE.Matrix4().compose(
    position,
    new THREE.Quaternion().setFromEuler(euler),
    new THREE.Vector3(1, 1, 1),
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Per-season leaf palette shift: hue offset, saturation and lightness scale. */
const SEASONS = {
  spring: { hue: -0.01, sat: 1.15, light: 1.08 }, // fresh greens + blossom
  summer: { hue: 0.0, sat: 1.0, light: 1.0 },
  autumn: { hue: 0.06, sat: 1.3, light: 1.02 }, // toward gold / red
  winter: { hue: 0.0, sat: 0.35, light: 0.85 }, // bare, muted branches
};

export function createTree(mats, { kind = "cypress", seed = 1, season = "summer" } = {}) {
  const cfg = SPECIES[kind] ?? SPECIES.cypress;
  const s = SEASONS[season] ?? SEASONS.summer;
  const rand = mulberry32(seed * 2654435761);
  const h = cfg.height[0] + rand() * (cfg.height[1] - cfg.height[0]);

  const group = new THREE.Group();

  // ---- trunk + branches ----------------------------------------------------
  const trunkParts = [];
  const baseR = h * 0.042;
  const trunkH = h * cfg.trunk;

  const trunk = new THREE.CylinderGeometry(baseR * 0.55, baseR, trunkH, 7, 4);
  trunk.translate(0, trunkH / 2, 0);
  trunkParts.push(trunk);

  for (let i = 0; i < cfg.branches; i++) {
    const angle = (i / cfg.branches) * Math.PI * 2 + rand() * 0.8;
    const y0 = trunkH * (0.5 + rand() * 0.35);
    const len = h * (0.18 + rand() * 0.14);
    const geo = new THREE.CylinderGeometry(baseR * 0.12, baseR * 0.3, len, 5, 1);
    geo.translate(0, len / 2, 0);
    const dir = new THREE.Vector3(Math.cos(angle) * 0.75, 1, Math.sin(angle) * 0.75).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    geo.applyQuaternion(q);
    geo.translate(0, y0, 0);
    trunkParts.push(geo);
  }

  const trunkMesh = new THREE.Mesh(mergeGeometries(trunkParts, false), mats.bark);
  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  group.add(trunkMesh);

  // ---- canopy --------------------------------------------------------------
  const base = new THREE.Color().setHSL(cfg.hue + s.hue, cfg.sat * s.sat, cfg.light[0] * s.light);
  const cards = [];
  for (const p of crownPoints(kind, rand, h, cfg)) {
    const size = cfg.size[0] + rand() * (cfg.size[1] - cfg.size[0]);
    const tint = base.clone().offsetHSL((rand() - 0.5) * 0.03, (rand() - 0.5) * 0.1, (rand() - 0.5) * 0.07);
    cards.push(leafCard(size, p, rand, tint));
    // a second, rotated card through the same point gives the clump volume
    if (rand() > 0.35) {
      const p2 = p.clone().add(new THREE.Vector3((rand() - 0.5) * 1.2, (rand() - 0.5) * 1.2, (rand() - 0.5) * 1.2));
      cards.push(leafCard(size * (0.8 + rand() * 0.3), p2, rand, tint));
    }
  }

  const canopy = new THREE.Mesh(mergeGeometries(cards, false), mats.leaf);
  canopy.castShadow = true;
  canopy.receiveShadow = true;
  canopy.customDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: mats.leafMap,
    alphaTest: 0.36,
  });
  group.add(canopy);

  group.userData.height = h;
  return group;
}
