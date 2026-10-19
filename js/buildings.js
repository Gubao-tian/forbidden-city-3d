import * as THREE from "three";
import { box, hipRoofGeometry, gableRoofGeometry, edgeBar } from "./geometry.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Rectangular platform with a run of steps on its +Z face. */
function platform(group, mat, { w, d, h, tiers = 1, stepWidth = 0.4 }) {
  const tierH = h / tiers;
  for (let i = 0; i < tiers; i++) {
    const pad = (tiers - i) * 3.2;
    group.add(
      box(w + pad, tierH, d + pad, i % 2 === 0 ? mat.stone : mat.stoneDark, {
        y: tierH * i + tierH / 2,
      }),
    );
  }
  const topPad = tiers * 3.2;
  const frontZ = d / 2 + topPad / 2;
  const steps = Math.max(4, Math.round(h / 0.55));
  const run = 0.9;
  // Step i counts outward from the platform: the one touching the platform is
  // full height, the outermost one is a single riser — i.e. the run descends.
  for (let i = 0; i < steps; i++) {
    const sh = (h * (i + 1)) / steps;
    group.add(
      box(w * stepWidth, sh, run, mat.stoneDark, {
        y: sh / 2,
        z: frontZ + (steps - i) * run - run / 2,
      }),
    );
  }
  return h;
}

/** Columns along the eave line, the detail that makes a box read as a hall. */
function colonnade(group, mat, { w, d, h, spacing = 4.6 }) {
  const cols = Math.max(2, Math.round(w / spacing));
  for (let i = 0; i <= cols; i++) {
    const x = -w / 2 + (w * i) / cols;
    for (const z of [d / 2 + 0.55, -d / 2 - 0.55]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, h, 8), mat.timber);
      c.position.set(x, h / 2, z);
      c.castShadow = true;
      group.add(c);
    }
  }
  const sideCols = Math.max(1, Math.round(d / spacing));
  for (let i = 1; i < sideCols; i++) {
    const z = -d / 2 + (d * i) / sideCols;
    for (const x of [w / 2 + 0.55, -w / 2 - 0.55]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, h, 8), mat.timber);
      c.position.set(x, h / 2, z);
      c.castShadow = true;
      group.add(c);
    }
  }
}

/** 重檐 roof: lower eave ring, short clerestory, upper roof. */
function doubleRoof(group, mat, { w, d, h, roofH, y }) {
  const lowerH = roofH * 0.46;
  const lower = new THREE.Mesh(
    hipRoofGeometry({ width: w * 1.03, depth: d * 1.03, height: lowerH, overhang: 2.6, lift: 2.2 }),
    mat.roof,
  );
  lower.position.y = y;
  lower.castShadow = true;
  lower.receiveShadow = true;
  group.add(lower);

  const midH = h * 0.16;
  group.add(box(w * 0.8, midH, d * 0.8, mat.wall, { y: y + midH / 2 }));
  group.add(box(w * 0.82, 0.45, d * 0.82, mat.gold, { y: y + midH - 0.1 }));

  const upper = new THREE.Mesh(
    hipRoofGeometry({ width: w * 0.84, depth: d * 0.84, height: roofH * 0.66, overhang: 1.8, lift: 2.0 }),
    mat.roof,
  );
  upper.position.y = y + midH;
  upper.castShadow = true;
  upper.receiveShadow = true;
  group.add(upper);

  ridge(group, mat, { w: w * 0.84, y: y + midH + roofH * 0.66, z: 0 });
}

function ridge(group, mat, { w, y, z = 0 }) {
  group.add(box(w * 0.62, 1.1, 1.2, mat.ridge, { y: y + 0.2, z }));
  group.add(box(w * 0.62, 0.28, 0.28, mat.gold, { y: y + 0.85, z }));
}

/**
 * A palace hall: platform, body, colonnade, painted beam band, roof.
 */
export function createHall(cfg, mat) {
  const g = new THREE.Group();
  const { w, d, h } = cfg;
  const simple = Boolean(cfg.simple);
  const baseH = platform(g, mat, {
    w,
    d,
    h: cfg.platform.height,
    tiers: cfg.platform.tiers ?? 1,
  });

  g.add(box(w, h, d, mat.wall, { y: baseH + h / 2 }));

  if (!simple) {
    // façade lattice
    const lattice = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.66), mat.lattice);
    lattice.position.set(0, baseH + h * 0.42, d / 2 + 0.06);
    g.add(lattice);

    // plaque
    g.add(box(Math.min(7, w * 0.22), 1.7, 0.35, mat.gold, { y: baseH + h * 0.78, z: d / 2 + 0.28 }));

    colonnade(g, mat, { w, d, h, spacing: cfg.columnSpacing ?? 4.8 });
    g.children.forEach((c) => {
      if (c.geometry?.type === "CylinderGeometry") c.position.y += baseH;
    });
  }

  // painted band + bracket set
  g.add(box(w + 2.2, 2.0, d + 2.2, mat.beam, { y: baseH + h + 0.9 }));
  g.add(box(w + 3.0, 1.1, d + 3.0, mat.timber, { y: baseH + h + 2.4 }));

  const y = baseH + h + 2.9;
  if (cfg.roof.double) {
    doubleRoof(g, mat, { w, d, h, roofH: cfg.roof.height, y });
  } else {
    const roof = new THREE.Mesh(
      hipRoofGeometry({
        width: w,
        depth: d,
        height: cfg.roof.height,
        overhang: 2.4,
        lift: 1.4,
      }),
      mat.roof,
    );
    roof.position.y = y;
    roof.castShadow = true;
    roof.receiveShadow = true;
    g.add(roof);
    ridge(g, mat, { w, y: y + cfg.roof.height, z: 0 });
  }

  const total = y + cfg.roof.height + 1;
  g.userData.height = total;
  return g;
}

/** Gate building: wall with three arched openings and a tower above. */
export function createGate(cfg, mat) {
  const g = new THREE.Group();
  const { w, d, h } = cfg;
  const baseH = platform(g, mat, { w, d, h: cfg.platform.height, tiers: 1, stepWidth: 0.28 });

  g.add(box(w, h, d, mat.wall, { y: baseH + h / 2 }));

  // three door recesses
  const doors = [-1, 0, 1];
  doors.forEach((k) => {
    const dw = k === 0 ? w * 0.16 : w * 0.12;
    g.add(box(dw, h * 0.52, 0.6, mat.timber, { x: k * w * 0.24, y: baseH + h * 0.26, z: d / 2 + 0.12 }));
  });

  g.add(box(w + 2.2, 1.9, d + 2.2, mat.beam, { y: baseH + h + 0.85 }));
  g.add(box(w + 3.0, 1.1, d + 3.0, mat.timber, { y: baseH + h + 2.3 }));

  const y = baseH + h + 2.8;
  if (cfg.roof.double) {
    doubleRoof(g, mat, { w, d, h, roofH: cfg.roof.height, y });
  } else {
    const roof = new THREE.Mesh(
      hipRoofGeometry({ width: w, depth: d, height: cfg.roof.height, overhang: 2.2, lift: 1.3 }),
      mat.roof,
    );
    roof.position.y = y;
    roof.castShadow = true;
    g.add(roof);
    ridge(g, mat, { w, y: y + cfg.roof.height });
  }

  g.userData.height = y + cfg.roof.height + 1;
  return g;
}

/** Long low building with a gable roof — the galleries that frame the courts. */
export function createCorridor({ length, along = "z" }, mat) {
  const g = new THREE.Group();
  const w = along === "z" ? 8 : length;
  const d = along === "z" ? length : 8;

  g.add(box(w, 1.2, d, mat.stone, { y: 0.6 }));
  g.add(box(w - 1.4, 5.4, d - 1.4, mat.wall, { y: 1.2 + 2.7 }));
  g.add(box(w - 0.6, 0.9, d - 0.6, mat.beam, { y: 1.2 + 5.4 + 0.45 }));

  // The ridge has to run along the long axis: build it length-wise, then turn
  // the whole roof a quarter turn for north-south galleries.
  const roof = new THREE.Mesh(
    gableRoofGeometry({ width: length, depth: 9.5, height: 3.4, overhang: 1.5 }),
    mat.roof,
  );
  if (along === "z") roof.rotation.y = Math.PI / 2;
  roof.position.y = 1.2 + 5.4 + 0.9;
  roof.castShadow = true;
  g.add(roof);
  g.userData.height = 1.2 + 5.4 + 0.9 + 3.4;
  return g;
}

/** 角楼 — the nine-ridge, eighteen-column corner pavilion, simplified to three tiers. */
export function createCornerTower(mat) {
  const g = new THREE.Group();
  // the tower stands on the wall itself, so its base is brick, not marble
  g.add(box(22, 6, 22, mat.wall, { y: 3 }));
  g.add(box(22.8, 0.6, 22.8, mat.stoneDark, { y: 6.1 }));

  g.add(box(16, 9, 16, mat.wall, { y: 6 + 4.5 }));
  const lower = new THREE.Mesh(
    hipRoofGeometry({ width: 16, depth: 16, height: 5.5, overhang: 2.4, lift: 1.6 }),
    mat.roof,
  );
  lower.position.y = 15;
  lower.castShadow = true;
  g.add(lower);

  // middle storey, tucked into the lower roof
  g.add(box(10, 4.2, 10, mat.wall, { y: 19.6 }));

  const upper = new THREE.Mesh(
    hipRoofGeometry({ width: 10, depth: 10, height: 6.5, overhang: 1.8, lift: 1.8 }),
    mat.roof,
  );
  upper.position.y = 21.4;
  upper.castShadow = true;
  g.add(upper);

  // 宝顶 sits on the group, at the actual apex of the top roof
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), mat.gold);
  finial.position.y = 21.4 + 6.5 + 0.6;
  finial.castShadow = true;
  g.add(finial);

  g.userData.height = 29;
  return g;
}

/** Open pavilion in the imperial garden: columns, railings, pyramidal roof. */
export function createPavilion(mat, scale = 1) {
  const g = new THREE.Group();
  const s = 9 * scale;
  const baseY = 1.2;
  g.add(box(s + 3.2, baseY, s + 3.2, mat.stone, { y: baseY / 2 }));

  for (const x of [-s / 2, s / 2]) {
    for (const z of [-s / 2, s / 2]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 4.6, 10), mat.timber);
      c.position.set(x, baseY + 2.3, z);
      c.castShadow = true;
      g.add(c);
    }
  }

  // railing on three sides, open at the front
  const railY = baseY + 1.15;
  const addRail = (w, d, x, z) => {
    g.add(box(w, 0.14, d, mat.timber, { x, y: railY, z }));
    g.add(box(w, 0.1, d, mat.timber, { x, y: railY - 0.55, z }));
  };
  addRail(0.14, s - 0.6, -s / 2, 0);
  addRail(0.14, s - 0.6, s / 2, 0);
  addRail(s - 0.6, 0.14, 0, -s / 2);

  // lintel beam under the eave
  g.add(box(s + 0.6, 0.55, s + 0.6, mat.beam, { y: baseY + 4.6 }));

  const roof = new THREE.Mesh(
    hipRoofGeometry({ width: s + 2, depth: s + 2, height: 4.6, overhang: 1.4, lift: 1.5, curve: 1.4 }),
    mat.roof,
  );
  roof.position.y = baseY + 4.9;
  roof.castShadow = true;
  g.add(roof);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), mat.gold);
  ball.position.y = baseY + 4.9 + 4.6 + 0.45;
  g.add(ball);
  g.userData.height = 11 * scale;
  return g;
}

/** Palace wall: stone plinth, red body, tiled coping along the wall's own axis. */
export function createWallSegment({ length, along = "z" }, mat) {
  const g = new THREE.Group();
  const thickness = 3.2;
  const height = 9;
  const w = along === "z" ? thickness : length;
  const d = along === "z" ? length : thickness;

  g.add(box(w + 1.8, 1.2, d + 1.8, mat.stoneDark, { y: 0.6 }));
  g.add(box(w, height, d, mat.wall, { y: height / 2 }));

  // The coping's ridge has to run along the wall, not across it: build it
  // length-wise and turn it a quarter turn for north-south walls.
  const capW = along === "z" ? length : length + 2.4;
  const capD = along === "z" ? thickness + 2.4 : thickness;
  const cap = new THREE.Mesh(
    gableRoofGeometry({ width: capW, depth: capD, height: 1.5, overhang: 0.3 }),
    mat.wallCap,
  );
  cap.position.y = height + 0.1;
  if (along === "z") cap.rotation.y = Math.PI / 2;
  cap.castShadow = true;
  cap.receiveShadow = true;
  g.add(cap);
  g.userData.height = height + 1.6;
  return g;
}
