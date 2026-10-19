import * as THREE from "three";
import { box, gableRoofGeometry } from "./geometry.js";
import {
  createHall,
  createGate,
  createCorridor,
  createCornerTower,
  createPavilion,
  createWallSegment,
} from "./buildings.js";
import { createTree, createTreeMaterials } from "./trees.js";
import { createCourt } from "./districts.js";
import { DISTRICTS } from "./layout.js";

/**
 * The central axis, south (午门, +Z) to north (神武门, −Z). Distances are
 * approximations of the published plan, compressed slightly so the whole axis
 * stays framed in one view. The side courtyards live in layout.js.
 */
export const AXIS = {
  south: 480,
  north: -480,
  halfWidth: 376,
};

const HALLS = [
  {
    id: "taihe",
    name: "太和殿",
    en: "Hall of Supreme Harmony",
    z: 282,
    w: 64,
    d: 37,
    h: 24,
    platform: { height: 8, tiers: 3 },
    roof: { height: 18, double: true },
    columnSpacing: 6,
  },
  {
    id: "zhonghe",
    name: "中和殿",
    en: "Hall of Central Harmony",
    z: 226,
    w: 26,
    d: 26,
    h: 14,
    platform: { height: 4.5, tiers: 1 },
    roof: { height: 13, double: false },
    columnSpacing: 4.4,
  },
  {
    id: "baohe",
    name: "保和殿",
    en: "Hall of Preserving Harmony",
    z: 180,
    w: 50,
    d: 24,
    h: 18,
    platform: { height: 6, tiers: 2 },
    roof: { height: 15, double: true },
    columnSpacing: 5.2,
  },
  {
    id: "qianqing",
    name: "乾清宫",
    en: "Palace of Heavenly Purity",
    z: 44,
    w: 46,
    d: 22,
    h: 17,
    platform: { height: 5, tiers: 2 },
    roof: { height: 15, double: true },
    columnSpacing: 5,
  },
  {
    id: "jiaotai",
    name: "交泰殿",
    en: "Hall of Union",
    z: -6,
    w: 22,
    d: 22,
    h: 11,
    platform: { height: 3, tiers: 1 },
    roof: { height: 11, double: false },
    columnSpacing: 4,
  },
  {
    id: "kunning",
    name: "坤宁宫",
    en: "Palace of Earthly Tranquility",
    z: -46,
    w: 40,
    d: 20,
    h: 15,
    platform: { height: 4, tiers: 1 },
    roof: { height: 13, double: true },
    columnSpacing: 4.8,
  },
];

const GATES = [
  {
    id: "taihemen",
    name: "太和门",
    en: "Gate of Supreme Harmony",
    z: 352,
    w: 40,
    d: 18,
    h: 11,
    platform: { height: 4 },
    roof: { height: 12, double: false },
  },
  {
    id: "qianqingmen",
    name: "乾清门",
    en: "Gate of Heavenly Purity",
    z: 104,
    w: 34,
    d: 16,
    h: 10,
    platform: { height: 3.6 },
    roof: { height: 11, double: false },
  },
];

export function buildCity(mat) {
  const root = new THREE.Group();
  const labels = [];

  // ---- ground, imperial way, axis line -------------------------------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), mat.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  root.add(box(14, 0.35, 960, mat.stone, { y: 0.18 }));

  const axis = box(0.9, 0.35, 960, mat.gold, { y: 0.42, shadow: false });
  root.add(axis);

  // ---- outer wall + moat + corner towers -----------------------------------
  // The wall is broken wherever a gate sits in it, otherwise it runs straight
  // across the 午门 and buries its arches.
  const addWallRun = (from, to, along, fixed) => {
    const len = Math.abs(to - from);
    if (len < 1) return;
    const seg = createWallSegment({ length: len, along }, mat);
    if (along === "x") seg.position.set((from + to) / 2, 0, fixed);
    else seg.position.set(fixed, 0, (from + to) / 2);
    root.add(seg);
  };

  const WUMEN_HALF = 56;
  addWallRun(-AXIS.halfWidth, -WUMEN_HALF, "x", AXIS.south);
  addWallRun(WUMEN_HALF, AXIS.halfWidth, "x", AXIS.south);

  const SHENWU_HALF = 42;
  addWallRun(-AXIS.halfWidth, -SHENWU_HALF, "x", AXIS.north);
  addWallRun(SHENWU_HALF, AXIS.halfWidth, "x", AXIS.north);

  const SIDE_GATE_Z = 250;
  const SIDE_GATE_HALF = 24;
  for (const x of [-AXIS.halfWidth, AXIS.halfWidth]) {
    addWallRun(AXIS.north, SIDE_GATE_Z - SIDE_GATE_HALF, "z", x);
    addWallRun(SIDE_GATE_Z + SIDE_GATE_HALF, AXIS.south, "z", x);
  }

  const moatW = 52;
  const moatGap = 60;
  // One ring, four runs that actually meet at the corners: the offset of each
  // run is derived from the same outer bound, so no corner is left open.
  const moatOuterX = AXIS.halfWidth + moatGap + moatW; // outer face of the ring
  const moatOuterZ = AXIS.south + moatGap + moatW;
  const moatRuns = [
    [0, AXIS.south + moatGap + moatW / 2, moatOuterX * 2, moatW],
    [0, AXIS.north - moatGap - moatW / 2, moatOuterX * 2, moatW],
    [-AXIS.halfWidth - moatGap - moatW / 2, 0, moatW, moatOuterZ * 2],
    [AXIS.halfWidth + moatGap + moatW / 2, 0, moatW, moatOuterZ * 2],
  ];
  for (const [x, z, w, d] of moatRuns) {
    const water = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), mat.water);
    water.position.set(x, -0.1, z);
    water.receiveShadow = true;
    root.add(water);
  }

  for (const x of [-AXIS.halfWidth, AXIS.halfWidth]) {
    for (const z of [AXIS.south, AXIS.north]) {
      const tower = createCornerTower(mat);
      tower.position.set(x, 0, z);
      tower.rotation.y = Math.PI / 4;
      root.add(tower);
    }
  }

  // ---- meridian gate (午门): brick base, tower, two wings -------------------
  const wumen = new THREE.Group();

  // 城台 is built from piers and a masonry arch rather than one solid box, so
  // the 券门 are real openings with depth behind them.
  const H_TAI = 12;
  const D_TAI = 56;
  const ARCHES = [
    { x: 0, w: 12, h: 9.8 },
    { x: -25, w: 8.4, h: 7.8 },
    { x: 25, w: 8.4, h: 7.8 },
  ];

  const buildPier = (x0, x1) => {
    if (x1 - x0 < 0.05) return;
    wumen.add(box(x1 - x0, H_TAI, D_TAI, mat.wall, { x: (x0 + x1) / 2, y: H_TAI / 2 }));
  };

  const buildArchHead = (a) => {
    const N = 28;
    const r = a.w / 2;
    const springY = a.h - r;
    for (let i = 0; i < N; i++) {
      const x0 = a.x - r + (a.w * i) / N;
      const x1 = a.x - r + (a.w * (i + 1)) / N;
      const xm = (x0 + x1) / 2;
      const dx = Math.abs(xm - a.x);
      const yArc = dx < r ? springY + Math.sqrt(Math.max(0, r * r - dx * dx)) : a.h;
      const colH = H_TAI - yArc;
      if (colH > 0.08) {
        wumen.add(box(x1 - x0 + 0.06, colH, D_TAI, mat.wall, { x: xm, y: yArc + colH / 2 }));
      }
    }
  };

  let cursor = -52;
  // piers must be built left to right, otherwise a later pier fills in an
  // opening that was already cut
  for (const a of [...ARCHES].sort((p, q) => p.x - q.x)) {
    const left = a.x - a.w / 2;
    const right = a.x + a.w / 2;
    buildPier(cursor, left);
    buildArchHead(a);
    // dark passage behind the opening
    wumen.add(
      box(a.w - 0.3, a.h - 0.3, 3.4, mat.voidDark, {
        x: a.x,
        y: (a.h - 0.3) / 2,
        z: D_TAI / 2 - 1.9,
      }),
    );
    cursor = right;
  }
  buildPier(cursor, 52);

  // stone sill under each opening
  for (const a of ARCHES) {
    wumen.add(box(a.w + 0.6, 0.5, 4, mat.stoneDark, { x: a.x, y: 0.25, z: D_TAI / 2 - 1.4 }));
  }

  wumen.add(box(108, 0.8, 60, mat.stoneDark, { y: 12.4 }));

  const wumenTower = createGate(
    { w: 62, d: 22, h: 12, platform: { height: 1.2 }, roof: { height: 14, double: true } },
    mat,
  );
  wumenTower.position.y = 12;
  wumen.add(wumenTower);

  // 雁翅楼: the wings must sit on the city platform, not hover over the moat,
  // so each one gets a solid brick base continuous with the main block.
  const WING_LEN = 32;
  const WING_Z = 22 + WING_LEN / 2;
  const wingBodyH = 9;
  for (const x of [-54, 54]) {
    wumen.add(box(30, 12, WING_LEN + 12, mat.wall, { x, y: 6, z: WING_Z - 4 }));
    wumen.add(box(17, wingBodyH, WING_LEN, mat.wall, { x, y: 12 + wingBodyH / 2, z: WING_Z }));
    wumen.add(box(18.4, 0.8, WING_LEN + 1.2, mat.beam, { x, y: 12 + wingBodyH + 0.4, z: WING_Z }));

    // 掖门 on each wing, facing south
    wumen.add(box(7.6, 7.2, 0.25, mat.voidDark, { x, y: 3.7, z: WING_Z - 4 + (WING_LEN + 12) / 2 - 0.05 }));

    const wingRoof = new THREE.Mesh(
      gableRoofGeometry({ width: WING_LEN + 3, depth: 19, height: 4.6, overhang: 1.1 }),
      mat.roof,
    );
    wingRoof.rotation.y = Math.PI / 2;
    wingRoof.position.set(x, 12 + wingBodyH + 0.8, WING_Z);
    wingRoof.castShadow = true;
    wumen.add(wingRoof);

    // window band on the outward face
    wumen.add(
      box(0.4, 3.6, WING_LEN * 0.78, mat.lattice, {
        x: x + Math.sign(x) * 8.6,
        y: 12 + wingBodyH * 0.52,
        z: WING_Z,
      }),
    );
  }
  wumen.position.set(0, 0, AXIS.south);
  root.add(wumen);
  labels.push({ name: "午门", en: "Meridian Gate", pos: new THREE.Vector3(0, 44, AXIS.south) });

  // ---- golden water river and its five bridges -----------------------------
  const water = new THREE.Mesh(new THREE.BoxGeometry(300, 0.6, 26), mat.water);
  water.position.set(0, 0.1, 398);
  root.add(water);
  for (const x of [-48, -24, 0, 24, 48]) {
    root.add(box(10, 1.1, 30, mat.stone, { x, y: 0.55, z: 398 }));
    for (const side of [-1, 1]) {
      root.add(box(1.2, 2.4, 30, mat.stoneDark, { x: x + side * 4.6, y: 1.2, z: 398 }));
    }
  }

  // ---- gates on the axis ---------------------------------------------------
  for (const g of GATES) {
    const gate = createGate(g, mat);
    gate.position.set(0, 0, g.z);
    root.add(gate);
    labels.push({ name: g.name, en: g.en, pos: new THREE.Vector3(0, g.h + 22, g.z) });
  }

  // ---- the great halls -----------------------------------------------------
  for (const h of HALLS) {
    const hall = createHall(h, mat);
    hall.position.set(0, 0, h.z);
    root.add(hall);
    labels.push({
      name: h.name,
      en: h.en,
      pos: new THREE.Vector3(0, hall.userData.height + 12, h.z),
    });
  }

  // ---- courtyard walls near the axis ---------------------------------------
  for (const z of [352, 104, -210]) {
    const len = 104;
    for (const sign of [-1, 1]) {
      const seg = createWallSegment({ length: len, along: "x" }, mat);
      seg.position.set(sign * (44 + len / 2), 0, z);
      root.add(seg);
    }
  }

  // ---- side courtyards, traced from the palace plan ------------------------
  for (const cfg of DISTRICTS) {
    root.add(createCourt(mat, cfg));
    labels.push({
      name: cfg.name,
      pos: new THREE.Vector3(cfg.x, 30, cfg.z),
      small: true,
    });
  }

  // ---- side gates through the outer wall: 东华门 / 西华门 -------------------
  for (const [x, rot] of [
    [AXIS.halfWidth, -Math.PI / 2],
    [-AXIS.halfWidth, Math.PI / 2],
  ]) {
    const gate = createGate(
      { w: 26, d: 14, h: 9, platform: { height: 4 }, roof: { height: 10, double: false } },
      mat,
    );
    gate.position.set(x, 0, 250);
    gate.rotation.y = rot;
    root.add(gate);
  }

  // ---- galleries lining the courtyard of the three great halls -------------
  for (const x of [-158, 158]) {
    const c = createCorridor({ length: 196, along: "z" }, mat);
    c.position.set(x, 0, 250);
    root.add(c);
  }

  // ---- imperial garden -----------------------------------------------------
  const garden = new THREE.Group();
  const treeMats = createTreeMaterials();

  // Jittered grid reads as planting beds rather than random scatter.
  const KINDS = ["cypress", "cypress", "cypress", "pine", "pine", "broadleaf"];
  let seed = 1;
  for (let ix = -2; ix <= 2; ix++) {
    for (let iz = -3; iz <= 1; iz++) {
      const x = ix * 34 + (Math.random() - 0.5) * 9;
      const z = -118 + iz * 30 + (Math.random() - 0.5) * 8;
      if (Math.abs(x) < 17) continue; // keep the axis clear

      const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
      const tree = createTree(treeMats, { kind, seed: seed++ });
      tree.position.set(x, 0, z);
      tree.rotation.y = Math.random() * Math.PI * 2;
      garden.add(tree);

      const pit = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.25, 12), mat.soil);
      pit.position.set(x, 0.13, z);
      pit.receiveShadow = true;
      garden.add(pit);
    }
  }

  for (let i = 0; i < 10; i++) {
    const shrub = createTree(treeMats, { kind: "broadleaf", seed: 900 + i });
    shrub.scale.setScalar(0.26);
    shrub.position.set((Math.random() - 0.5) * 160, 0, -150 + (Math.random() - 0.5) * 80);
    if (Math.abs(shrub.position.x) < 18) continue;
    garden.add(shrub);
  }

  for (const [x, z, s] of [
    [-46, -118, 0.9],
    [46, -118, 0.9],
    [0, -168, 1.15],
  ]) {
    const p = createPavilion(mat, s);
    p.position.set(x, 0, z);
    garden.add(p);
  }

  // 钦安殿 at the heart of the garden
  const qinandian = createPavilion(mat, 1.35);
  qinandian.position.set(0, 0, -140);
  garden.add(qinandian);

  // planting beds: dark earth under the trees, so the garden does not read as
  // a paved square that happens to have trees standing on it
  for (const [x, z, w, d] of [
    [-92, -128, 130, 90],
    [92, -128, 130, 90],
    [0, -206, 300, 70],
  ]) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), mat.soil);
    bed.position.set(x, 0.18, z);
    bed.receiveShadow = true;
    garden.add(bed);
  }

  // rockery (堆秀山): a cluster of boulders rather than one floating sphere
  const ROCK_SEED = [
    [-74, -168, 13, 1.0],
    [-60, -162, 9, 1.3],
    [-84, -158, 8, 1.1],
    [-68, -176, 10, 0.9],
    [-88, -172, 6, 1.4],
  ];
  for (const [x, z, r, sq] of ROCK_SEED) {
    const rock = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat.rock);
    rock.position.set(x, r * 0.55, z);
    rock.scale.set(1, sq, 0.85);
    rock.rotation.y = x * 0.37;
    rock.castShadow = true;
    rock.receiveShadow = true;
    garden.add(rock);
  }

  root.add(garden);
  labels.push({ name: "御花园", en: "Imperial Garden", pos: new THREE.Vector3(0, 34, -150) });

  // ---- shenwu gate (神武门) ------------------------------------------------
  const shenwu = new THREE.Group();
  shenwu.add(box(80, 10, 34, mat.stoneDark, { y: 5 }));
  const shenwuTower = createGate(
    { w: 34, d: 16, h: 12, platform: { height: 2.4 }, roof: { height: 13, double: true } },
    mat,
  );
  shenwuTower.position.y = 10;
  shenwu.add(shenwuTower);
  shenwu.position.set(0, 0, AXIS.north);
  root.add(shenwu);
  labels.push({ name: "神武门", en: "Gate of Divine Might", pos: new THREE.Vector3(0, 42, AXIS.north) });

  return { group: root, labels };
}
