import * as THREE from "three";
import { box, gableRoofGeometry } from "./geometry.js";
import {
  createHall,
  createGate,
  createCorridor,
  createCornerTower,
  createPavilion,
  createWallSegment,
  createLion,
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

// 整体高度提升系数：对整个城市根节点做垂直方向的整体缩放，使宫殿、城墙、
// 角楼、亭台、树木与远山在 y 方向同步拔高、更显巍峨，而平面布局（x/z）完全
// 不变。这是线性缩放，所有「垂直堆叠关系」会被精确保持（角楼仍立于地面、金线
// 仍高于御道、屋顶仍压在殿身之上）。标签与近景聚焦使用世界坐标，需同步乘此系数。
export const HEIGHT_SCALE = 1.2;

const HALLS = [
  {
    id: "taihe",
    name: "太和殿",
    en: "Hall of Supreme Harmony",
    desc: "故宫三大殿之首，俗称「金銮殿」。明清两代皇帝在此举行登基、大婚、册立等最隆重的典礼。",
    z: 282,
    w: 64,
    d: 37,
    h: 24,
    platform: { height: 8, tiers: 3 },
    roof: { height: 18, double: true },
    columnSpacing: 6,
    beasts: 10,
  },
  {
    id: "zhonghe",
    name: "中和殿",
    en: "Hall of Central Harmony",
    desc: "太和殿前的小殿，皇帝在举行大典前在此稍事休息、接受朝贺，是礼仪的过渡空间。",
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
    desc: "三大殿之末，明清时曾在此举行殿试，皇帝亲自主持科举的最高一级考试。",
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
    desc: "内廷后三宫之首，明代及清初为皇帝寝宫，清雍正后改为处理日常政务、接见大臣之所。",
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
    desc: "位于乾清宫与坤宁宫之间，存放皇帝宝玺，象征天地交泰、阴阳和合。",
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
    desc: "内廷后三宫之一，明代为皇后寝宫，清代改建为祭祀与皇帝大婚的洞房。",
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
    desc: "外朝正门，皇帝在此「御门听政」，接受百官朝贺。门前铜狮与金水桥遥相呼应。",
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
    desc: "内廷与外朝的分界，门内即皇帝寝居的后三宫，是「国」与「家」的分水岭。",
    z: 104,
    w: 34,
    d: 16,
    h: 10,
    platform: { height: 3.6 },
    roof: { height: 11, double: false },
  },
];

export function buildCity(mat, { season = "summer" } = {}) {
  const root = new THREE.Group();
  const labels = [];

  // ---- ground, imperial way, axis line -------------------------------------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), mat.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  // A thin snowfield for winter: a translucent white sheet just above the
  // paving so the whole city reads as freshly snowed, while the plazas and
  // paths still ghost through underneath.
  if (season === "winter") {
    const snow = new THREE.Mesh(
      new THREE.PlaneGeometry(12000, 12000),
      new THREE.MeshStandardMaterial({ color: 0xeef3f7, roughness: 0.9, transparent: true, opacity: 0.92 }),
    );
    snow.rotation.x = -Math.PI / 2;
    snow.position.y = 0.05;
    snow.receiveShadow = true;
    root.add(snow);
  }

  root.add(box(14, 0.35, 960, mat.stone, { y: 0.18 }));

  // The gilded central axis runs the ceremonial length of the palace — from the
  // Meridian Gate up to the Imperial Garden, then again from the garden's north
  // edge to the Gate of Divine Might. It is deliberately split so the garden
  // (a landscape of pavilions, planting beds and the Hall of Imperial Peace)
  // is NOT bisected by a gold line, which previously read as a broken, flickering
  // stripe. Each run sits ABOVE the stone path (base clears the path top face,
  // y≈0.355) so it never z-fights when the camera closes in.
  const GARDEN_SOUTH = -100; // south edge of the Imperial Garden
  const GARDEN_NORTH = -210; // north edge, where the axis resumes
  const axisSouth = box(1.3, 0.18, AXIS.south - GARDEN_SOUTH, mat.gold, {
    y: 0.46,
    z: (AXIS.south + GARDEN_SOUTH) / 2,
    shadow: false,
  });
  const axisNorth = box(1.3, 0.18, GARDEN_NORTH - AXIS.north, mat.gold, {
    y: 0.46,
    z: (GARDEN_NORTH + AXIS.north) / 2,
    shadow: false,
  });
  root.add(axisSouth, axisNorth);

  // ---- distant hills, ringing the palace so the horizon is not empty --------
  // A belt of low blue-grey ridges sits far outside the moat; the fog washes
  // them into soft silhouettes that frame the city. Each hill is a flattened
  // cone with a deterministic wobble so the ring looks natural, not stamped.
  const hills = new THREE.Group();
  hills.name = "hills";
  const hillMat = new THREE.MeshStandardMaterial({
    color: 0x6e8599,
    roughness: 1,
    flatShading: true,
  });
  const mulberry = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const hillRand = mulberry(2024);
  const HILL_COUNT = 22;
  for (let i = 0; i < HILL_COUNT; i++) {
    const a = (i / HILL_COUNT) * Math.PI * 2 + hillRand() * 0.4;
    const radius = 2100 + hillRand() * 700;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const h = 160 + hillRand() * 240;
    const r = 320 + hillRand() * 420;
    const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7, 1), hillMat);
    hill.position.set(x, h / 2 - 6, z);
    hill.rotation.y = hillRand() * Math.PI;
    hill.receiveShadow = false;
    hills.add(hill);
    // a smaller neighbour to break the skyline
    if (hillRand() > 0.4) {
      const r2 = r * (0.5 + hillRand() * 0.4);
      const h2 = h * (0.55 + hillRand() * 0.4);
      const h2x = x + (hillRand() - 0.5) * r * 1.6;
      const h2z = z + (hillRand() - 0.5) * r * 1.6;
      const hill2 = new THREE.Mesh(new THREE.ConeGeometry(r2, h2, 6, 1), hillMat);
      hill2.position.set(h2x, h2 / 2 - 8, h2z);
      hill2.rotation.y = hillRand() * Math.PI;
      hills.add(hill2);
    }
  }
  root.add(hills);

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
  wumen.userData.info = {
    id: "wumen",
    name: "午门",
    en: "Meridian Gate",
    desc: "故宫正门，形如展翅的「雁翅楼」。皇帝在此颁发诏书、举行献俘礼，民间所谓「推出午门斩首」实为讹传。",
  };
  root.add(wumen);
  labels.push({
    name: "午门",
    en: "Meridian Gate",
    pos: new THREE.Vector3(0, 44, AXIS.south),
    focus: { target: new THREE.Vector3(0, 18, AXIS.south + 20), dist: 160, height: 55 },
  });

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
    gate.userData.info = { id: g.id, name: g.name, en: g.en, desc: g.desc };
    root.add(gate);
    labels.push({
      name: g.name,
      en: g.en,
      pos: new THREE.Vector3(0, g.h + 22, g.z),
      focus: { target: new THREE.Vector3(0, g.h * 0.6, g.z + 20), dist: 120, height: 42 },
    });

    // 太和门 pairs with two bronze lions on the plaza before it
    if (g.id === "taihemen") {
      for (const side of [-1, 1]) {
        const lion = createLion(mat, { scale: 1.15, mirror: side > 0 });
        lion.position.set(side * 30, 0, g.z + 26);
        lion.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
        root.add(lion);
      }
    }
  }

  // ---- the great halls -----------------------------------------------------
  for (const h of HALLS) {
    const hall = createHall(h, mat);
    hall.position.set(0, 0, h.z);
    hall.userData.info = { id: h.id, name: h.name, en: h.en, desc: h.desc };
    root.add(hall);
    labels.push({
      name: h.name,
      en: h.en,
      pos: new THREE.Vector3(0, hall.userData.height + 12, h.z),
      focus: { target: new THREE.Vector3(0, h.h * 0.5, h.z + h.d), dist: h.w * 2.4, height: h.h * 1.6 },
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
    const court = createCourt(mat, cfg);
    court.userData.info = { id: cfg.name, name: cfg.name, en: "", desc: cfg.desc || "" };
    root.add(court);
    labels.push({
      name: cfg.name,
      pos: new THREE.Vector3(cfg.x, 30, cfg.z),
      small: true,
      focus: { target: new THREE.Vector3(cfg.x, 8, cfg.z), dist: Math.max(cfg.w, cfg.d) * 1.6, height: 46 },
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

  // Jittered grid reads as planting beds rather than random scatter. The mix
  // favours evergreen 古柏/松, with a few autumn 银杏 and spring 玉兰 for colour.
  const KINDS = ["cypress", "cypress", "pine", "pine", "broadleaf", "ginkgo", "ginkgo", "magnolia"];
  let seed = 1;
  for (let ix = -2; ix <= 2; ix++) {
    for (let iz = -3; iz <= 1; iz++) {
      const x = ix * 34 + (Math.random() - 0.5) * 9;
      const z = -118 + iz * 30 + (Math.random() - 0.5) * 8;
      if (Math.abs(x) < 17) continue; // keep the axis clear

      const kind = KINDS[Math.floor(Math.random() * KINDS.length)];
      const tree = createTree(treeMats, { kind, seed: seed++, season });
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
    const shrub = createTree(treeMats, { kind: "broadleaf", seed: 900 + i, season });
    shrub.scale.setScalar(0.26);
    shrub.position.set((Math.random() - 0.5) * 160, 0, -150 + (Math.random() - 0.5) * 80);
    if (Math.abs(shrub.position.x) < 18) continue;
    garden.add(shrub);
  }

  // The garden pavilions frame the axis from either side; the central lane is
  // left open so the axis path reads as one continuous walk, not a stripe that
  // gets chopped up by a pavilion standing square in the middle of it.
  for (const [x, z, s] of [
    [-46, -118, 0.9],
    [46, -118, 0.9],
    [-34, -168, 0.72],
    [34, -168, 0.72],
  ]) {
    const p = createPavilion(mat, s);
    p.position.set(x, 0, z);
    garden.add(p);
  }

  // 钦安殿 at the heart of the garden
  const qinandian = createPavilion(mat, 1.35);
  qinandian.position.set(0, 0, -140);
  qinandian.userData.info = {
    id: "qinan",
    name: "钦安殿",
    en: "Hall of Imperial Peace",
    desc: "御花园中心的主殿，供奉道教玄天上帝（真武大帝），是宫中现存最古老的建筑之一。",
  };
  garden.add(qinandian);

  // planting beds: dark earth under the trees, so the garden does not read as
  // a paved square that happens to have trees standing on it. The north bed is
  // split either side of the axis so the central path stays unbroken.
  for (const [x, z, w, d] of [
    [-92, -128, 130, 90],
    [92, -128, 130, 90],
    [-82, -206, 120, 70],
    [82, -206, 120, 70],
  ]) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), mat.soil);
    bed.position.set(x, 0.18, z);
    bed.receiveShadow = true;
    garden.add(bed);
  }

  root.add(garden);
  labels.push({
    name: "御花园",
    en: "Imperial Garden",
    pos: new THREE.Vector3(0, 34, -150),
    focus: { target: new THREE.Vector3(0, 10, -130), dist: 120, height: 30 },
  });

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
  shenwu.userData.info = {
    id: "shenwu",
    name: "神武门",
    en: "Gate of Divine Might",
    desc: "故宫北门，原名「玄武门」，因避康熙帝玄烨名讳改称「神武门」。现为故宫博物院正门。",
  };
  root.add(shenwu);
  labels.push({
    name: "神武门",
    en: "Gate of Divine Might",
    pos: new THREE.Vector3(0, 42, AXIS.north),
    focus: { target: new THREE.Vector3(0, 18, AXIS.north - 20), dist: 150, height: 50 },
  });

  // ---- distant birds, a slow circling flock for atmosphere ------------------
  // Each bird is a tiny two-triangle silhouette; the flock orbits the palace on
  // a large radius, animated in main.js so the sky is never quite still.
  const birds = new THREE.Group();
  birds.name = "birds";
  const birdGeo = (() => {
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([
      0, 0, 0, 1.1, 0.16, 0.3, 0.6, 0, 0.55,
      0, 0, 0, -1.1, 0.16, 0.3, -0.6, 0, 0.55,
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    return g;
  })();
  const birdMat = new THREE.MeshBasicMaterial({
    color: 0x2a2f38,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 14; i++) {
    const b = new THREE.Mesh(birdGeo, birdMat);
    b.userData = {
      radius: 360 + Math.random() * 420,
      speed: (0.05 + Math.random() * 0.06) * (Math.random() > 0.5 ? 1 : -1),
      phase: Math.random() * Math.PI * 2,
      y: 210 + Math.random() * 130,
      scale: 2.4 + Math.random() * 2.6,
    };
    b.scale.setScalar(b.userData.scale);
    birds.add(b);
  }
  root.add(birds);

  // 整体提升：垂直方向统一拔高。平面尺度不变，只让城市在 y 方向更挺拔。
  root.scale.y = HEIGHT_SCALE;
  // 标签与近景聚焦点是世界坐标（不在 root 内），必须同步放大其 y，否则名称
  // 标签会飘在变高后的建筑下方，点击近景也会聚焦偏低。
  for (const lbl of labels) {
    lbl.pos.y *= HEIGHT_SCALE;
    if (lbl.focus) {
      lbl.focus.target.y *= HEIGHT_SCALE;
      if (typeof lbl.focus.height === "number") lbl.focus.height *= HEIGHT_SCALE;
    }
  }

  return { group: root, labels, birds };
}
