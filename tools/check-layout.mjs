#!/usr/bin/env node
// Validates the courtyard layout: no two courtyards may occupy the same
// ground, nothing may spill outside the wall, nothing may sit on the axis.
//
//   node tools/check-layout.mjs
//
import { overlaps, violations, DISTRICTS } from "../js/layout.js";

const ov = overlaps();
const vi = violations();

console.log(`courtyards: ${DISTRICTS.length}`);

if (ov.length) {
  console.log(`\noverlapping pairs: ${ov.length}`);
  for (const o of ov) console.log(`  ${o.a} <-> ${o.b}  (${o.ox} x ${o.oz} m)`);
}

if (vi.length) {
  console.log(`\nviolations: ${vi.length}`);
  for (const v of vi) console.log(`  ${v.name}: ${v.why}`);
}

if (!ov.length && !vi.length) console.log("\nlayout OK");
process.exit(ov.length || vi.length ? 1 : 0);
