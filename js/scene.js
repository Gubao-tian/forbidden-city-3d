import * as THREE from "three";
import { OrbitControls } from "../vendor/OrbitControls.js";

const DAY = {
  skyTop: new THREE.Color("#2f6cb0"),
  skyBottom: new THREE.Color("#c8d9e8"),
  sun: new THREE.Color("#fff3d8"),
  sunIntensity: 2.9,
  hemiSky: new THREE.Color("#d9e0e8"),
  hemiGround: new THREE.Color("#8a7358"),
  hemiIntensity: 0.5,
  fog: new THREE.Color("#c8d9e8"),
  fogNear: 1400,
  fogFar: 3600,
  exposure: 0.98,
};

const NIGHT = {
  skyTop: new THREE.Color("#050914"),
  skyBottom: new THREE.Color("#0b1220"),
  sun: new THREE.Color("#8fa8e8"),
  sunIntensity: 0.55,
  hemiSky: new THREE.Color("#2a3b63"),
  hemiGround: new THREE.Color("#1a1611"),
  hemiIntensity: 0.62,
  fog: new THREE.Color("#0b1220"),
  fogNear: 700,
  fogFar: 2600,
  exposure: 1.15,
};

export function createScene(canvas, { onMix } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = DAY.exposure;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(DAY.fog, DAY.fogNear, DAY.fogFar);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 8000);
  camera.position.set(760, 660, 1120);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 18, 40);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 45;
  controls.maxDistance = 1600;
  controls.maxPolarAngle = Math.PI * 0.492;
  controls.autoRotateSpeed = 0.32;
  controls.update();

  // --- sky dome -------------------------------------------------------------
  const SKY_VERT = /* glsl */ `
    varying vec3 vWorld;
    void main() {
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `;
  const SKY_FRAG = /* glsl */ `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    varying vec3 vWorld;
    void main() {
      float h = normalize(vWorld).y;
      float t = clamp(pow(max(h, 0.0), 0.42), 0.0, 1.0);
      gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
    }
  `;

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4000, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: DAY.skyTop.clone() },
        bottomColor: { value: DAY.skyBottom.clone() },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
    }),
  );
  sky.name = "sky";
  scene.add(sky);

  const skyUniforms = sky.material.uniforms;

  // --- image based lighting -------------------------------------------------
  // Bake the gradient sky into an environment map so water, gilt finials and
  // glazed tiles actually reflect something instead of reading as flat paint.
  const pmrem = new THREE.PMREMGenerator(renderer);

  function bakeEnvironment(top, bottom) {
    const envScene = new THREE.Scene();
    const mat = new THREE.ShaderMaterial({
      uniforms: { topColor: { value: top.clone() }, bottomColor: { value: bottom.clone() } },
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 12), mat);
    envScene.add(sphere);
    const target = pmrem.fromScene(envScene, 0.02, 0.1, 200);
    mat.dispose();
    sphere.geometry.dispose();
    return target.texture;
  }

  const envDay = bakeEnvironment(DAY.skyTop, DAY.skyBottom);
  const envNight = bakeEnvironment(NIGHT.skyTop, NIGHT.skyBottom);
  scene.environment = envDay;
  scene.environmentIntensity = 0.34;

  // --- lights ---------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(DAY.hemiSky.clone(), DAY.hemiGround.clone(), DAY.hemiIntensity);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(DAY.sun.clone(), DAY.sunIntensity);
  sun.position.set(520, 640, 420);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const cam = sun.shadow.camera;
  cam.left = -620;
  cam.right = 620;
  cam.top = 620;
  cam.bottom = -620;
  cam.near = 100;
  cam.far = 2400;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 1.2;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0x93b6e0, 0.35);
  fill.position.set(-460, 320, -520);
  scene.add(fill);

  // --- stars (night only) ---------------------------------------------------
  const starGeo = new THREE.BufferGeometry();
  const starCount = 1400;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.92 + 0.02);
    const r = 3200;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));

  // round, soft points instead of the default hard squares
  const starCanvas = document.createElement("canvas");
  starCanvas.width = starCanvas.height = 16;
  const sctx = starCanvas.getContext("2d");
  const sgrad = sctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  sgrad.addColorStop(0, "rgba(255,255,255,1)");
  sgrad.addColorStop(0.45, "rgba(230,240,255,0.55)");
  sgrad.addColorStop(1, "rgba(255,255,255,0)");
  sctx.fillStyle = sgrad;
  sctx.fillRect(0, 0, 16, 16);
  const starTex = new THREE.CanvasTexture(starCanvas);

  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      map: starTex,
      color: 0xe6efff,
      size: 2.6,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  stars.name = "stars";
  scene.add(stars);

  // warm accent lights that only matter after dark
  const lanterns = new THREE.Group();
  for (const z of [352, 282, 226, 180, 104, 44, -6, -46]) {
    const l = new THREE.PointLight(0xffa060, 0, 300, 2);
    l.position.set(0, 26, z);
    lanterns.add(l);
  }
  lanterns.visible = false;
  scene.add(lanterns);

  // --- day / night blending --------------------------------------------------
  const state = { mix: 0, target: 0 };
  const tmpA = new THREE.Color();
  const tmpB = new THREE.Color();

  function applyMix(m) {
    skyUniforms.topColor.value.copy(tmpA.copy(DAY.skyTop).lerp(NIGHT.skyTop, m));
    skyUniforms.bottomColor.value.copy(tmpA.copy(DAY.skyBottom).lerp(NIGHT.skyBottom, m));
    scene.fog.color.copy(tmpA.copy(DAY.fog).lerp(NIGHT.fog, m));
    scene.fog.near = THREE.MathUtils.lerp(DAY.fogNear, NIGHT.fogNear, m);
    scene.fog.far = THREE.MathUtils.lerp(DAY.fogFar, NIGHT.fogFar, m);

    sun.color.copy(tmpB.copy(DAY.sun).lerp(NIGHT.sun, m));
    sun.intensity = THREE.MathUtils.lerp(DAY.sunIntensity, NIGHT.sunIntensity, m);
    sun.position.lerpVectors(new THREE.Vector3(520, 640, 420), new THREE.Vector3(-380, 300, -260), m);

    hemi.color.copy(tmpA.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, m));
    hemi.groundColor.copy(tmpB.copy(DAY.hemiGround).lerp(NIGHT.hemiGround, m));
    hemi.intensity = THREE.MathUtils.lerp(DAY.hemiIntensity, NIGHT.hemiIntensity, m);

    renderer.toneMappingExposure = THREE.MathUtils.lerp(DAY.exposure, NIGHT.exposure, m);
    scene.environment = m > 0.5 ? envNight : envDay;
    stars.material.opacity = m * 0.85;
    stars.visible = m > 0.02;
    lanterns.visible = m > 0.05;
    lanterns.children.forEach((l) => {
      l.intensity = m * 1500;
    });
    onMix?.(m);
  }

  applyMix(0);

  function setNight(on) {
    state.target = on ? 1 : 0;
  }

  function tick(dt) {
    if (Math.abs(state.mix - state.target) > 0.001) {
      state.mix += (state.target - state.mix) * Math.min(1, dt * 2.2);
      applyMix(state.mix);
    }
    controls.update(dt);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", resize);

  return { renderer, scene, camera, controls, sun, setNight, tick, isNight: () => state.target === 1 };
}
