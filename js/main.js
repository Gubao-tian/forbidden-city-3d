import * as THREE from "three";
import { createScene } from "./scene.js";
import { createMaterials } from "./materials.js";
import { buildCity } from "./city.js";
import { createLabelLayer } from "./labels.js";

// Surface failures instead of failing silently (also handy for CI screenshots).
window.__errors = [];
window.addEventListener("error", (e) => window.__errors.push(String(e.message || e)));
window.addEventListener("unhandledrejection", (e) => window.__errors.push(String(e.reason)));

const canvas = document.getElementById("scene");
const materials = createMaterials();

// Lattice windows pick up a warm interior glow once the sun goes down.
const {
  renderer,
  scene,
  camera,
  controls,
  setNight,
  setTimeOfDay,
  setAutoCycle,
  setStereo,
  renderStereo,
  tick,
} = createScene(canvas, {
  onMix: (m) => {
    materials.lattice.emissive.setRGB(1.0, 0.56, 0.24);
    materials.lattice.emissiveIntensity = m * 0.9;
  },
});

let city;
let labelLayer;
let birds;

// The city is (re)built on season change, since tree colour and the winter
// snowfield are baked at construction time.
function buildCityFor(season) {
  const built = buildCity(materials, { season });
  city = built.group;
  birds = built.birds;
  labelLayer = createLabelLayer(built.labels);
  scene.add(city);
  scene.add(labelLayer);
}
buildCityFor("summer");

// ---------------------------------------------------------------------------
// Camera presets with eased transitions
// ---------------------------------------------------------------------------
const VIEWS = {
  overview: { position: new THREE.Vector3(520, 430, 880), target: new THREE.Vector3(0, 14, 40) },
  axis: { position: new THREE.Vector3(0, 170, 900), target: new THREE.Vector3(0, 30, -80) },
  taihe: { position: new THREE.Vector3(170, 90, 470), target: new THREE.Vector3(0, 30, 282) },
  garden: { position: new THREE.Vector3(62, 26, -74), target: new THREE.Vector3(28, 11, -122) },
};

let flight = null;

function flyTo(name, duration = 1.25) {
  const view = VIEWS[name];
  if (!view) return;
  flight = {
    t: 0,
    duration,
    fromPos: camera.position.clone(),
    toPos: view.position.clone(),
    fromTarget: controls.target.clone(),
    toTarget: view.target.clone(),
  };
}

/**
 * Fly to a labelled building's close-up. The label carries a `focus` with a
 * ground target, a standoff distance and a camera height; the camera approaches
 * from the south (+Z), the direction every axis building faces.
 */
function flyToFocus(focus, duration = 1.1) {
  if (!focus) return;
  const target = focus.target.clone();
  const pos = target.clone().add(new THREE.Vector3(0, focus.height ?? 40, focus.dist ?? 140));
  flight = {
    t: 0,
    duration,
    fromPos: camera.position.clone(),
    toPos: pos,
    fromTarget: controls.target.clone(),
    toTarget: target,
  };
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function updateFlight(dt) {
  if (!flight) return;
  flight.t = Math.min(1, flight.t + dt / flight.duration);
  const k = easeInOut(flight.t);
  camera.position.lerpVectors(flight.fromPos, flight.toPos, k);
  controls.target.lerpVectors(flight.fromTarget, flight.toTarget, k);
  if (flight.t >= 1) flight = null;
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
const ui = {
  rotate: false,
  labels: true,
  night: false,
  season: "summer",
  autoTime: false,
  stereo: false,
};

const SEASON_NAMES = ["spring", "summer", "autumn", "winter"];

function syncButtons() {
  document.querySelector('[data-toggle="rotate"]').classList.toggle("is-active", ui.rotate);
  document.querySelector('[data-toggle="labels"]').classList.toggle("is-active", ui.labels);
  document.querySelector('[data-toggle="night"]').classList.toggle("is-active", ui.night);
  document.querySelector('[data-toggle="night"]').textContent = ui.night ? "日出" : "入夜";
  document.querySelector('[data-toggle="auto"]').classList.toggle("is-active", ui.autoTime);
  document.querySelector('[data-toggle="auto"]').textContent = ui.autoTime ? "时间停止" : "时间流动";
  document.querySelector('[data-toggle="stereo"]').classList.toggle("is-active", ui.stereo);
  const seasonBtn = document.querySelector('[data-cycle="season"]');
  if (seasonBtn) seasonBtn.textContent = `季节·${seasonLabel(ui.season)}`;
}

function seasonLabel(s) {
  return { spring: "春", summer: "夏", autumn: "秋", winter: "冬" }[s] || s;
}

/** Tear down and rebuild the city for a new season. */
function setSeason(season) {
  if (season === ui.season) return;
  ui.season = season;

  // dispose the old city and label layer, then rebuild
  const oldCity = city;
  const oldLabels = labelLayer;
  scene.remove(oldCity);
  scene.remove(oldLabels);
  disposeObject(oldCity);
  disposeObject(oldLabels);

  buildCityFor(season);
  if (ui.labels === false) labelLayer.visible = false;
  syncButtons();
}

// recursively free geometries so season switching does not leak GPU memory.
// NOTE: materials are shared (created once in createMaterials) and must NOT be
// disposed here — only geometries and per-building materials are owned locally.
function disposeObject(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
  });
}

document.querySelectorAll("[data-view]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-view]").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    flyTo(btn.dataset.view);
  });
});

document.querySelector('[data-toggle="rotate"]').addEventListener("click", () => {
  ui.rotate = !ui.rotate;
  controls.autoRotate = ui.rotate;
  syncButtons();
});

document.querySelector('[data-toggle="labels"]').addEventListener("click", () => {
  ui.labels = !ui.labels;
  labelLayer.visible = ui.labels;
  syncButtons();
});

document.querySelector('[data-toggle="night"]').addEventListener("click", () => {
  ui.night = !ui.night;
  setNight(ui.night);
  syncButtons();
});

document.querySelector('[data-cycle="season"]').addEventListener("click", () => {
  const i = (SEASON_NAMES.indexOf(ui.season) + 1) % SEASON_NAMES.length;
  setSeason(SEASON_NAMES[i]);
});

document.querySelector('[data-toggle="auto"]').addEventListener("click", () => {
  ui.autoTime = !ui.autoTime;
  setAutoCycle(ui.autoTime, 90); // a full day every 90 seconds
  syncButtons();
});

document.querySelector('[data-toggle="stereo"]').addEventListener("click", () => {
  ui.stereo = !ui.stereo;
  setStereo(ui.stereo);
  syncButtons();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "1") flyTo("overview");
  if (e.key === "2") flyTo("axis");
  if (e.key === "3") flyTo("taihe");
  if (e.key === "4") flyTo("garden");
  if (e.key.toLowerCase() === "n") document.querySelector('[data-toggle="night"]').click();
  if (e.key.toLowerCase() === "l") document.querySelector('[data-toggle="labels"]').click();
  if (e.key.toLowerCase() === "s") document.querySelector('[data-cycle="season"]').click();
  if (e.key.toLowerCase() === "t") document.querySelector('[data-toggle="auto"]').click();
});

// ---------------------------------------------------------------------------
// Building pick → info card
// ---------------------------------------------------------------------------
const infoCard = document.getElementById("info");
const infoName = document.getElementById("info-name");
const infoEn = document.getElementById("info-en");
const infoDesc = document.getElementById("info-desc");
const infoClose = document.getElementById("info-close");

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let dragMoved = false;

function showInfo(info) {
  infoName.textContent = info.name;
  infoEn.textContent = info.en || "";
  infoEn.style.display = info.en ? "" : "none";
  infoDesc.textContent = info.desc || "（暂无简介）";
  infoCard.hidden = false;
  requestAnimationFrame(() => infoCard.classList.add("is-open"));
}

function hideInfo() {
  infoCard.classList.remove("is-open");
  setTimeout(() => {
    if (!infoCard.classList.contains("is-open")) infoCard.hidden = true;
  }, 300);
}

infoClose.addEventListener("click", hideInfo);

// The title is a click target: it always returns you to the aerial overview.
const titleEl = document.querySelector(".hud-title");
if (titleEl) {
  titleEl.addEventListener("click", () => {
    flyTo("overview");
    document.querySelectorAll("[data-view]").forEach((b) => b.classList.remove("is-active"));
    document.querySelector('[data-view="overview"]').classList.add("is-active");
  });
}

canvas.addEventListener("pointerdown", (e) => {
  dragMoved = false;
});
canvas.addEventListener("pointermove", (e) => {
  if (e.buttons & 1) dragMoved = true;
});
canvas.addEventListener("pointerup", (e) => {
  // only treat as a click when the pointer barely moved — a drag/rotate should
  // never pop the card or trigger a fly-to
  if (dragMoved || e.button !== 0) return;

  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  // 1) label sprites first: clicking a floating name flies to its close-up
  const labelHits = raycaster.intersectObjects(labelLayer.children, false);
  for (const hit of labelHits) {
    const label = hit.object.userData.label;
    if (label?.focus) {
      flyToFocus(label.focus);
      showInfo({ name: label.name, en: label.en, desc: "" });
      return;
    }
  }

  // 2) then buildings: clicking a building pops its info card
  const hits = raycaster.intersectObjects(city.children, true);
  for (const hit of hits) {
    let obj = hit.object;
    while (obj && !obj.userData.info) obj = obj.parent;
    if (obj?.userData?.info) {
      showInfo(obj.userData.info);
      return;
    }
  }
  // clicked empty space → dismiss
  hideInfo();
});

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let firstFrame = true;

function render() {
  const dt = Math.min(clock.getDelta(), 0.05);
  tick(dt);

  // keep the moat moving so it reads as water rather than a glass slab
  // Labels behave like a map legend: they fade in as you approach, so the
  // overview stays clean and the close-ups stay readable.
  if (labelLayer.visible) {
    for (const sprite of labelLayer.children) {
      const d = camera.position.distanceTo(sprite.position);
      const a = Math.min(1, Math.max(0, (950 - d) / 320));
      sprite.visible = a > 0.02;
      sprite.material.opacity = a * sprite.userData.baseOpacity;
    }
  }

  if (materials.water.normalMap) {
    materials.water.normalMap.offset.x = (materials.water.normalMap.offset.x + dt * 0.006) % 1;
    materials.water.normalMap.offset.y = (materials.water.normalMap.offset.y + dt * 0.004) % 1;
  }

  // slow circling flock; each bird banks into its turn so the wing stays level
  if (birds) {
    const t = clock.elapsedTime;
    for (const b of birds.children) {
      const u = b.userData;
      const a = t * u.speed + u.phase;
      b.position.set(Math.cos(a) * u.radius, u.y, Math.sin(a) * u.radius);
      b.rotation.y = -a - Math.PI / 2;
    }
  }

  updateFlight(dt);
  if (ui.stereo) renderStereo(scene);
  else renderer.render(scene, camera);

  if (firstFrame) {
    firstFrame = false;
    requestAnimationFrame(() => document.getElementById("loading").classList.add("is-done"));
  }
  requestAnimationFrame(render);
}

syncButtons();

// Deep links: ?view=overview|axis|taihe|garden and ?night=1 let any camera
// state be shared as a URL (and give the screenshot pipeline a stable target).
const params = new URLSearchParams(window.location.search);
const initialView = params.get("view");

if (initialView && VIEWS[initialView]) {
  camera.position.copy(VIEWS[initialView].position);
  controls.target.copy(VIEWS[initialView].target);
  controls.update();
  document.querySelectorAll("[data-view]").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.view === initialView);
  });
} else {
  // Establishing shot: start high and far, then settle into the aerial view.
  camera.position.set(1500, 1180, 2100);
  controls.target.set(0, 0, 0);
  setTimeout(() => flyTo("overview", 2.6), 220);
}

if (params.get("night") === "1") {
  ui.night = true;
  setNight(true);
  syncButtons();
}

render();

// expose a tiny API for screenshots/tests without polluting the globals too much
window.gugong = {
  flyTo,
  setNight: (on) => {
    ui.night = on;
    setNight(on);
    syncButtons();
  },
  showLabels: (on) => {
    ui.labels = on;
    labelLayer.visible = on;
    syncButtons();
  },
  camera,
  controls,
  scene,
  ready: true,
};
