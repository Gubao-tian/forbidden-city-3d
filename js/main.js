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
const { renderer, scene, camera, controls, setNight, tick } = createScene(canvas, {
  onMix: (m) => {
    materials.lattice.emissive.setRGB(1.0, 0.56, 0.24);
    materials.lattice.emissiveIntensity = m * 0.9;
  },
});

const { group: city, labels } = buildCity(materials);
scene.add(city);

const labelLayer = createLabelLayer(labels);
scene.add(labelLayer);

// ---------------------------------------------------------------------------
// Camera presets with eased transitions
// ---------------------------------------------------------------------------
const VIEWS = {
  overview: { position: new THREE.Vector3(760, 660, 1120), target: new THREE.Vector3(0, 18, 40) },
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
  labels: false,
  night: false,
};

function syncButtons() {
  document.querySelector('[data-toggle="rotate"]').classList.toggle("is-active", ui.rotate);
  document.querySelector('[data-toggle="labels"]').classList.toggle("is-active", ui.labels);
  document.querySelector('[data-toggle="night"]').classList.toggle("is-active", ui.night);
  document.querySelector('[data-toggle="night"]').textContent = ui.night ? "日出" : "入夜";
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

window.addEventListener("keydown", (e) => {
  if (e.key === "1") flyTo("overview");
  if (e.key === "2") flyTo("axis");
  if (e.key === "3") flyTo("taihe");
  if (e.key.toLowerCase() === "n") document.querySelector('[data-toggle="night"]').click();
  if (e.key.toLowerCase() === "l") document.querySelector('[data-toggle="labels"]').click();
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
  if (materials.water.normalMap) {
    materials.water.normalMap.offset.x = (materials.water.normalMap.offset.x + dt * 0.006) % 1;
    materials.water.normalMap.offset.y = (materials.water.normalMap.offset.y + dt * 0.004) % 1;
  }
  updateFlight(dt);
  renderer.render(scene, camera);

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
