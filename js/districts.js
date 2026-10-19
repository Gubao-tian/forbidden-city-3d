import * as THREE from "three";
import { mergeGeometries } from "../vendor/BufferGeometryUtils.js";
import { gableRoofGeometry, hipRoofGeometry } from "./geometry.js";

/** Box geometry baked at a world position — merged later into one draw call. */
function boxAt(w, h, d, x, y, z) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

function meshFrom(geos, material, { cast = true, receive = true } = {}) {
  if (!geos.length) return null;
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(merged, material);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

/**
 * A walled courtyard — the repeating unit of the palace. Each one is merged
 * into a handful of draw calls (red mass, stone, roofs, painted bands), which
 * is what makes ~25 of them affordable.
 */
export function createCourt(mat, cfg) {
  const group = new THREE.Group();
  const { w, d } = cfg;
  const wallH = 8;
  const t = 2;
  const gap = cfg.gap ?? Math.min(18, w * 0.2);

  const red = [];
  const stone = [];
  const roofs = [];
  const bands = [];
  const caps = [];
  const facades = [];

  // --- perimeter walls, open at the south --------------------------------
  // Plinth, red body, and a real tiled coping with the ridge running along the
  // wall — a flat slab on top reads as a plank, not as masonry.
  const capGeo = (len, thick, along) => {
    const g = gableRoofGeometry({ width: len, depth: thick + 1.4, height: 1.15, overhang: 0.2 });
    if (along === "z") g.rotateY(Math.PI / 2);
    return g;
  };

  const addWall = (ww, dd, x, z) => {
    red.push(boxAt(ww, wallH, dd, x, wallH / 2, z));
    stone.push(boxAt(ww + 1.4, 1.0, dd + 1.4, x, 0.5, z));
    const along = ww > dd ? "x" : "z";
    const cap = capGeo(along === "x" ? ww : dd, along === "x" ? dd : ww, along);
    cap.translate(x, wallH, z);
    caps.push(cap);
  };

  addWall(w, t, 0, -d / 2);
  addWall(t, d, -w / 2, 0);
  addWall(t, d, w / 2, 0);

  const segW = (w - gap) / 2;
  if (segW > 0) {
    addWall(segW, t, -(gap / 2 + segW / 2), d / 2);
    addWall(segW, t, gap / 2 + segW / 2, d / 2);
  }

  // --- gate house ---------------------------------------------------------
  const gateW = gap * 0.86;
  red.push(boxAt(gateW, 7.5, 9, 0, 3.75, d / 2));
  const gateRoof = hipRoofGeometry({ width: gateW, depth: 9, height: 4.2, overhang: 1.6, lift: 1.2 });
  gateRoof.translate(0, 7.5, d / 2);
  roofs.push(gateRoof);
  bands.push(boxAt(gateW + 0.6, 0.9, 9.6, 0, 7.5, d / 2));
  const gateFacade = new THREE.PlaneGeometry(gateW * 0.9, 4.6);
  gateFacade.translate(0, 3.4, d / 2 + 4.55);
  facades.push(gateFacade);

  // --- main hall ----------------------------------------------------------
  const hw = cfg.hall.w;
  const hd = cfg.hall.d;
  const hh = cfg.hall.h;
  const hallZ = -d / 2 + hd / 2 + 14;

  stone.push(boxAt(hw + 12, 2.2, hd + 12, 0, 1.1, hallZ));
  red.push(boxAt(hw, hh, hd, 0, 2.2 + hh / 2, hallZ));
  bands.push(boxAt(hw + 1.4, 0.95, hd + 1.4, 0, 2.2 + hh + 0.48, hallZ));

  // lattice façade so a courtyard hall is not a bare red box up close
  const hallFacade = new THREE.PlaneGeometry(hw * 0.88, hh * 0.6);
  hallFacade.translate(0, 2.2 + hh * 0.42, hallZ + hd / 2 + 0.06);
  facades.push(hallFacade);

  const hallRoof = hipRoofGeometry({
    width: hw,
    depth: hd,
    height: cfg.hall.roof ?? hh * 0.85,
    overhang: 2,
    lift: 1.6,
  });
  hallRoof.translate(0, 2.2 + hh + 1.4, hallZ);
  roofs.push(hallRoof);

  // --- two side halls -----------------------------------------------------
  const sw = Math.min(20, w * 0.22);
  for (const sign of [-1, 1]) {
    const sx = sign * (w / 2 - sw / 2 - 6);
    const sz = -d / 2 + 46;
    stone.push(boxAt(sw + 8, 1.6, 26, sx, 0.8, sz));
    red.push(boxAt(sw, 7.5, 20, sx, 1.6 + 3.75, sz));

    const f = new THREE.PlaneGeometry(20 * 0.86, 7.5 * 0.6);
    f.rotateY(sign > 0 ? -Math.PI / 2 : Math.PI / 2);
    f.translate(sx - sign * (sw / 2 + 0.06), 1.6 + 3.1, sz);
    facades.push(f);

    const r = hipRoofGeometry({ width: sw, depth: 20, height: 5.2, overhang: 1.6, lift: 1.2 });
    r.translate(sx, 1.6 + 7.5, sz);
    roofs.push(r);
  }

  const parts = [
    meshFrom(red, mat.wall),
    meshFrom(stone, mat.stone),
    meshFrom(roofs, mat.roof),
    meshFrom(bands, mat.beam),
    meshFrom(caps, mat.wallCap),
    meshFrom(facades, mat.lattice, { cast: false }),
  ];
  for (const p of parts) if (p) group.add(p);

  group.position.set(cfg.x, 0, cfg.z);
  group.userData.height = 24;
  return group;
}

/** A free-standing small hall (no courtyard), e.g. garden pavilions. */
export function createStandalone(mat, cfg) {
  const red = [];
  const stone = [];
  const roofs = [];

  stone.push(boxAt(cfg.w + 8, 2, cfg.d + 8, 0, 1, 0));
  red.push(boxAt(cfg.w, cfg.h, cfg.d, 0, 2 + cfg.h / 2, 0));
  const roof = hipRoofGeometry({
    width: cfg.w,
    depth: cfg.d,
    height: cfg.h * 0.8,
    overhang: 1.8,
    lift: 1.4,
  });
  roof.translate(0, 2 + cfg.h, 0);
  roofs.push(roof);

  const g = new THREE.Group();
  for (const m of [meshFrom(red, mat.wall), meshFrom(stone, mat.stone), meshFrom(roofs, mat.roof)]) {
    if (m) g.add(m);
  }
  g.position.set(cfg.x, 0, cfg.z);
  if (cfg.rotation) g.rotation.y = cfg.rotation;
  return g;
}
