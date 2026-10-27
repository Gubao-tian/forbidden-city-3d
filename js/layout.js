/**
 * Courtyard layout, traced from the palace plan: the six eastern palaces and
 * six western palaces, the two retirement complexes, the literary (文华) and
 * military (武英) halls, and the service courts.
 *
 * Coordinates are metres in the scene: +Z is south (午门), −Z is north (神武门),
 * the axis is x = 0, the outer wall sits at |x| = 376 and |z| = 480.
 *
 * Each entry is one walled courtyard: `w`/`d` are the courtyard footprint,
 * `hall` is the main building inside it. `tools/check-layout.mjs` proves that
 * no two courtyards occupy the same ground.
 */
export const DISTRICTS = [
  // ---- east, south to north ------------------------------------------------
  { name: "文华殿", x: 250, z: 300, w: 130, d: 112, hall: { w: 42, d: 20, h: 11 }, desc: "太子读书与经筵讲学之所，与西侧武英殿相对，一「文」一「武」拱卫外朝。" },
  { name: "文渊阁", x: 240, z: 208, w: 90, d: 56, hall: { w: 34, d: 16, h: 12 }, desc: "皇家藏书楼，仿宁波天一阁而建，曾藏《四库全书》。" },
  { name: "南三所", x: 328, z: 160, w: 84, d: 70, hall: { w: 28, d: 15, h: 9 }, desc: "皇子居所，太子与年幼皇子在此读书习武。" },
  { name: "奉先殿", x: 300, z: 76, w: 110, d: 92, hall: { w: 44, d: 20, h: 13 }, desc: "皇室供奉祖先牌位的家庙，每逢节令举行祭祀。" },
  { name: "斋宫", x: 150, z: 100, w: 80, d: 80, hall: { w: 28, d: 14, h: 9 }, desc: "皇帝祭天前斋戒之所，以表虔诚。" },
  { name: "景仁宫", x: 106, z: -40, w: 80, d: 80, hall: { w: 30, d: 15, h: 9 }, desc: "东六宫之一，后妃居住的宫殿。" },
  { name: "承乾宫", x: 106, z: -126, w: 80, d: 80, hall: { w: 30, d: 15, h: 9 }, desc: "东六宫之一，后妃居住的宫殿。" },
  { name: "钟粹宫", x: 106, z: -212, w: 80, d: 80, hall: { w: 30, d: 15, h: 9 }, desc: "东六宫之一，后妃居住的宫殿。" },
  { name: "延禧宫", x: 196, z: -40, w: 80, d: 80, hall: { w: 30, d: 15, h: 9 }, desc: "东六宫之一，后妃居住的宫殿。" },
  { name: "永和宫", x: 196, z: -126, w: 80, d: 80, hall: { w: 30, d: 15, h: 9 }, desc: "东六宫之一，后妃居住的宫殿。" },
  { name: "景阳宫", x: 196, z: -212, w: 80, d: 80, hall: { w: 30, d: 15, h: 9 }, desc: "东六宫之一，后妃居住的宫殿。" },
  { name: "宁寿宫", x: 312, z: -136, w: 120, d: 168, hall: { w: 40, d: 20, h: 14 }, desc: "乾隆帝为自己退位后准备的养老宫，规模宏大，俗称「小紫禁城」。" },
  { name: "养性殿", x: 312, z: -16, w: 96, d: 60, hall: { w: 32, d: 16, h: 10 }, desc: "宁寿宫区建筑，乾隆退位后在此修养心性。" },

  // ---- west, south to north ------------------------------------------------
  { name: "武英殿", x: -250, z: 300, w: 130, d: 112, hall: { w: 42, d: 20, h: 11 }, desc: "与文华殿相对，清代曾在此刻书，是为「武英殿聚珍版」。" },
  { name: "敬思殿", x: -250, z: 216, w: 96, d: 54, hall: { w: 34, d: 16, h: 10 }, desc: "武英殿区建筑。" },
  { name: "内务府", x: -326, z: 152, w: 90, d: 70, hall: { w: 28, d: 15, h: 9 }, desc: "清代宫廷服务机构，掌管宫中衣食住行等一应事务。" },
  { name: "慈宁宫", x: -224, z: 56, w: 120, d: 118, hall: { w: 44, d: 20, h: 12 }, desc: "皇太后居所，明清两代太后在此颐养天年。" },
  { name: "寿康宫", x: -328, z: -14, w: 84, d: 86, hall: { w: 30, d: 15, h: 9 }, desc: "皇太后寝宫，乾隆帝生母崇庆皇太后曾在此居住。" },
  { name: "寿安宫", x: -328, z: -110, w: 84, d: 86, hall: { w: 30, d: 15, h: 9 }, desc: "皇太后、太妃居所。" },
  { name: "养心殿", x: -122, z: 40, w: 64, d: 56, hall: { w: 34, d: 16, h: 10 }, desc: "清雍正帝以后皇帝的日常居所与政务中心，「垂帘听政」即发生于此。" },
  { name: "永寿宫", x: -106, z: -40, w: 80, d: 80, hall: { w: 30, d: 15, h: 9 }, desc: "西六宫之一，后妃居住的宫殿。" },
  { name: "翊坤宫", x: -106, z: -126, w: 80, d: 80, hall: { w: 30, d: 15, h: 9 }, desc: "西六宫之一，后妃居住的宫殿。" },
  { name: "储秀宫", x: -106, z: -212, w: 80, d: 80, hall: { w: 30, d: 15, h: 9 }, desc: "西六宫之一，慈禧太后入宫后曾在此居住。" },
  { name: "太极殿", x: -196, z: -46, w: 80, d: 80, hall: { w: 30, d: 15, h: 9 }, desc: "西六宫之一，后妃居住的宫殿。" },
  { name: "长春宫", x: -196, z: -126, w: 80, d: 80, hall: { w: 30, d: 15, h: 9 }, desc: "西六宫之一，后妃居住的宫殿。" },
  { name: "咸福宫", x: -196, z: -212, w: 80, d: 80, hall: { w: 30, d: 15, h: 9 }, desc: "西六宫之一，后妃居住的宫殿。" },
  { name: "英华殿", x: -312, z: -212, w: 100, d: 80, hall: { w: 30, d: 15, h: 9 }, desc: "宫中佛堂，供奉佛像。" },

  // ---- northern service courts (乾东五所 / 乾西五所) -------------------------
  { name: "乾东五所", x: 110, z: -300, w: 76, d: 70, hall: { w: 26, d: 14, h: 8 } },
  { name: "乾东五所北", x: 110, z: -380, w: 76, d: 70, hall: { w: 26, d: 14, h: 8 } },
  { name: "乾西五所", x: -110, z: -300, w: 76, d: 70, hall: { w: 26, d: 14, h: 8 } },
  { name: "乾西五所北", x: -110, z: -380, w: 76, d: 70, hall: { w: 26, d: 14, h: 8 } },
];

export const PALACE = {
  halfWidth: 376,
  south: 480,
  north: -480,
};

/** Resolve every courtyard to its world-space rectangle. */
export function rects() {
  return DISTRICTS.map((d) => ({
    name: d.name,
    x0: d.x - d.w / 2,
    x1: d.x + d.w / 2,
    z0: d.z - d.d / 2,
    z1: d.z + d.d / 2,
  }));
}

/** Pairwise overlaps — no two courtyards may occupy the same ground. */
export function overlaps() {
  const list = rects();
  const out = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const oz = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
      if (ox > 0.5 && oz > 0.5) out.push({ a: a.name, b: b.name, ox: +ox.toFixed(1), oz: +oz.toFixed(1) });
    }
  }
  return out;
}

/** Courtyards must stay inside the outer wall and off the central axis. */
export function violations(axisClearance = 60) {
  const out = [];
  for (const d of DISTRICTS) {
    const r = { x0: d.x - d.w / 2, x1: d.x + d.w / 2, z0: d.z - d.d / 2, z1: d.z + d.d / 2 };
    if (r.x0 < -PALACE.halfWidth + 4 || r.x1 > PALACE.halfWidth - 4) out.push({ name: d.name, why: "outside east/west wall" });
    if (r.z0 < PALACE.north + 4 || r.z1 > PALACE.south - 4) out.push({ name: d.name, why: "outside north/south wall" });
    if (r.x0 < axisClearance && r.x1 > -axisClearance) out.push({ name: d.name, why: "overlaps the central axis" });
  }
  return out;
}
