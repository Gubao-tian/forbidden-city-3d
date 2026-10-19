import * as THREE from "three";

/**
 * 庑殿顶 / 攒尖顶 —— a hip roof lofted from a shrinking rectangle.
 *
 * The roof is built as a ring-loft: each ring is a rectangle perimeter that
 * shrinks and rises toward the ridge. Because the perimeter is sampled densely
 * (not just 4 corners) the eaves can curl upward near the corners, which is
 * what makes a Chinese roof read as a Chinese roof rather than a tent.
 *
 * When the plan is wider than it is deep the top collapses to a ridge line
 * (庑殿顶); when it is square the ridge collapses to a point (攒尖顶).
 */
export function hipRoofGeometry({
  width,
  depth,
  height,
  overhang = 1.6,
  lift = 1.1,
  curve = 1.55,
  rings = 9,
  seg = 12,
}) {
  const W = width / 2 + overhang;
  const D = depth / 2 + overhang;
  const ridgeHalf = Math.max(0, W - D);

  const perRing = seg * 4;
  const positions = [];
  const uvs = [];
  const indices = [];

  const ringPoint = (t, i) => {
    const hw = W * (1 - t) + ridgeHalf * t;
    const hd = D * (1 - t);
    const base = height * Math.pow(t, curve);
    const side = Math.floor(i / seg);
    const k = (i - side * seg) / seg;

    let x;
    let z;
    if (side === 0) {
      x = -hw + 2 * hw * k;
      z = hd;
    } else if (side === 1) {
      x = hw;
      z = hd - 2 * hd * k;
    } else if (side === 2) {
      x = hw - 2 * hw * k;
      z = -hd;
    } else {
      x = -hw;
      z = -hd + 2 * hd * k;
    }

    // Corners flare up, the middle of each eave stays low (起翘).
    const sx = Math.abs(x) / Math.max(hw, 1e-3);
    const sz = hd > 1e-3 ? Math.abs(z) / hd : 0;
    const corner = Math.pow(Math.max(sx, sz), 4);
    const y = base + lift * (1 - t) * corner;
    return [x, y, z];
  };

  // Perimeter arc length at the eave, used for tile-density UVs.
  const arc = [0];
  let prev = ringPoint(0, 0);
  for (let i = 1; i <= perRing; i++) {
    const p = ringPoint(0, i % perRing);
    arc.push(arc[i - 1] + Math.hypot(p[0] - prev[0], p[2] - prev[2]));
    prev = p;
  }

  for (let r = 0; r <= rings; r++) {
    const t = r / rings;
    for (let i = 0; i < perRing; i++) {
      const [x, y, z] = ringPoint(t, i);
      positions.push(x, y, z);
      // 1 tile rib per metre along the eave, 1 course per metre up the slope
      uvs.push(arc[i] / 32, (t * height) / 8);
    }
  }

  for (let r = 0; r < rings; r++) {
    for (let i = 0; i < perRing; i++) {
      const j = (i + 1) % perRing;
      const a = r * perRing + i;
      const b = r * perRing + j;
      const c = (r + 1) * perRing + i;
      const d = (r + 1) * perRing + j;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** 硬山/悬山 two-slope roof, used for corridors and side halls. */
export function gableRoofGeometry({ width, depth, height, overhang = 1.2 }) {
  const W = width / 2 + overhang;
  const D = depth / 2 + overhang;
  const h = height;

  const positions = [
    -W, 0, D, W, 0, D, W, 0, -D, -W, 0, -D, // eaves
    W, h, 0, -W, h, 0, // ridge
  ];
  const uvs = [0, 0, 1, 0, 1, 1, 0, 1, 1, 0.5, 0, 0.5];
  const indices = [
    0, 1, 4, 1, 2, 4, 2, 5, 4, 2, 3, 5, 3, 0, 5, 0, 4, 5,
  ];

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export function box(w, h, d, material, { x = 0, y = 0, z = 0, shadow = true } = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  return mesh;
}

/** Thin bar between two points — used for hip ridges (垂脊). */
export function edgeBar(a, b, radius, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(radius, radius, len, 5, 1);
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  mesh.castShadow = true;
  return mesh;
}
