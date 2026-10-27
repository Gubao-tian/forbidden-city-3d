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

  // --- anaglyph (red/cyan) stereo ------------------------------------------
  // Two eyes offset along the camera's right axis, each rendered into its own
  // target, then composited by a full-screen shader that routes the left eye
  // into the red channel and the right eye into green+blue. Pop on a pair of
  // red/cyan glasses and the city gains real depth.
  const STEREO_FOV = 45;
  const STEREO_SEP = 3.4; // eye separation in world units
  const eyeL = camera.clone();
  const eyeR = camera.clone();
  eyeR.fov = STEREO_FOV;
  eyeL.fov = STEREO_FOV;
  eyeL.updateProjectionMatrix();
  eyeR.updateProjectionMatrix();

  const rtL = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);
  const rtR = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

  const anaglyphMat = new THREE.ShaderMaterial({
    uniforms: {
      tLeft: { value: rtL.texture },
      tRight: { value: rtR.texture },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tLeft;
      uniform sampler2D tRight;
      varying vec2 vUv;
      void main() {
        vec3 L = texture2D(tLeft, vUv).rgb;
        vec3 R = texture2D(tRight, vUv).rgb;
        float g = 0.45 * L.g + 0.55 * R.g;
        // left → red, right → cyan (green+blue)
        gl_FragColor = vec4(L.r, g, R.b, 1.0);
      }
    `,
    depthTest: false,
    depthWrite: false,
  });

  const anaglyphScene = new THREE.Scene();
  const anaglyphCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const anaglyphQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), anaglyphMat);
  anaglyphScene.add(anaglyphQuad);

  let stereo = false;

  function setStereo(on) {
    stereo = on;
    renderer.autoClear = true;
  }

  function renderStereo(scene) {
    // orient the two eyes along the current camera basis
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();

    const basePos = camera.position.clone();
    const baseTarget = controls.target.clone();

    eyeL.position.copy(basePos).addScaledVector(right, -STEREO_SEP / 2);
    eyeL.lookAt(baseTarget);
    eyeR.position.copy(basePos).addScaledVector(right, STEREO_SEP / 2);
    eyeR.lookAt(baseTarget);

    renderer.setRenderTarget(rtL);
    renderer.render(scene, eyeL);
    renderer.setRenderTarget(rtR);
    renderer.render(scene, eyeR);
    renderer.setRenderTarget(null);
    renderer.render(anaglyphScene, anaglyphCam);
  }

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
    uniform vec3 horizonColor;
    uniform vec3 sunColor;
    uniform vec3 sunDir;
    varying vec3 vWorld;
    void main() {
      vec3 d = normalize(vWorld);
      float h = d.y;
      // vertical gradient: horizon (bottom) -> zenith (top)
      float t = clamp(pow(max(h, 0.0), 0.42), 0.0, 1.0);
      vec3 col = mix(bottomColor, topColor, t);
      // warm band hugging the horizon
      float band = pow(1.0 - clamp(abs(h) * 6.0, 0.0, 1.0), 3.0);
      col = mix(col, horizonColor, band * 0.55);
      // solar glow: a soft brightening toward the sun
      float sunA = clamp(dot(d, normalize(sunDir)), 0.0, 1.0);
      col += sunColor * pow(sunA, 6.0) * 0.35;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const SKY_UNIFORMS = {
    topColor: { value: DAY.skyTop.clone() },
    bottomColor: { value: DAY.skyBottom.clone() },
    horizonColor: { value: new THREE.Color("#f3e2c0") },
    sunColor: { value: DAY.sun.clone() },
    sunDir: { value: new THREE.Vector3(0.55, 0.45, 0.42).normalize() },
  };

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4000, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: SKY_UNIFORMS,
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

  function bakeEnvironment(top, bottom, horizon, sunColor, sunDir) {
    const envScene = new THREE.Scene();
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: top.clone() },
        bottomColor: { value: bottom.clone() },
        horizonColor: { value: horizon.clone() },
        sunColor: { value: sunColor.clone() },
        sunDir: { value: sunDir.clone() },
      },
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

  const DAY_HORIZON = new THREE.Color("#f3e2c0");
  const NIGHT_HORIZON = new THREE.Color("#1a2440");
  const envDay = bakeEnvironment(DAY.skyTop, DAY.skyBottom, DAY_HORIZON, DAY.sun, SKY_UNIFORMS.sunDir.value);
  const envNight = bakeEnvironment(NIGHT.skyTop, NIGHT.skyBottom, NIGHT_HORIZON, NIGHT.sun, SKY_UNIFORMS.sunDir.value);
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

  // --- day / night + time of day --------------------------------------------
  // A full day is 24 units; the sun rises in the east (around hour 6) and sets
  // in the west (around hour 18), sweeping an arc over the palace. `sunElev`
  // is the sun's height above the horizon in [-1, 1]; it drives how much of
  // the night palette bleeds in, plus a warm dawn/dusk tint when the sun is low.
  const state = { mix: 0, target: 0, time: 10, auto: false };
  const tmpA = new THREE.Color();
  const tmpB = new THREE.Color();
  const tmpSun = new THREE.Vector3();
  const SUN_RADIUS = 1200;

  // extra warm tone for golden hour, blended by how low the sun sits
  const GOLDEN = new THREE.Color("#ff9a3c");
  const DUSK_SKY_TOP = new THREE.Color("#3a4a7a");
  const DUSK_SKY_BOTTOM = new THREE.Color("#f0a86a");

  function sunPositionFor(hour) {
    // hour 0 = midnight; sun crosses the meridian (south, +Z) at noon.
    const a = ((hour - 6) / 24) * Math.PI * 2;
    const elev = Math.sin(a); // -1 (midnight) .. +1 (noon)
    const x = Math.cos(a) * SUN_RADIUS;
    const y = Math.sin(a) * SUN_RADIUS;
    // sun tracks north-to-south through the day; keep it mostly to the +Z side
    const z = Math.sin(a * 0.5) * 200 + 420;
    return { x, y: Math.max(y, 40), z, elev };
  }

  function applyMix(m, hour = state.time) {
    const { x, y, z, elev } = sunPositionFor(hour);

    // how "night" is the palette? full night when the sun is well below the
    // horizon, full day when it is well above it.
    const night = THREE.MathUtils.clamp((0.05 - elev) / 0.25, 0, 1);
    // golden-hour warmth peaks when the sun is just above the horizon
    const golden = THREE.MathUtils.clamp(1 - Math.abs(elev - 0.08) / 0.28, 0, 1);

    skyUniforms.topColor.value
      .copy(tmpA.copy(DAY.skyTop).lerp(NIGHT.skyTop, night))
      .lerp(DUSK_SKY_TOP, golden * 0.6);
    skyUniforms.bottomColor.value
      .copy(tmpA.copy(DAY.skyBottom).lerp(NIGHT.skyBottom, night))
      .lerp(DUSK_SKY_BOTTOM, golden * 0.7);
    skyUniforms.horizonColor.value
      .copy(tmpA.copy(DAY_HORIZON).lerp(NIGHT_HORIZON, night))
      .lerp(GOLDEN, golden * 0.8);
    skyUniforms.sunColor.value
      .copy(tmpB.copy(DAY.sun).lerp(NIGHT.sun, night))
      .lerp(GOLDEN, golden * 0.5);

    scene.fog.color.copy(tmpA.copy(DAY.fog).lerp(NIGHT.fog, night));
    scene.fog.near = THREE.MathUtils.lerp(DAY.fogNear, NIGHT.fogNear, night);
    scene.fog.far = THREE.MathUtils.lerp(DAY.fogFar, NIGHT.fogFar, night);

    sun.color.copy(tmpB.copy(DAY.sun).lerp(NIGHT.sun, night)).lerp(GOLDEN, golden * 0.6);
    sun.intensity = THREE.MathUtils.lerp(DAY.sunIntensity, NIGHT.sunIntensity, night);
    sun.position.set(x, y, z);
    skyUniforms.sunDir.value.copy(sun.position).normalize();

    hemi.color.copy(tmpA.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, night));
    hemi.groundColor.copy(tmpB.copy(DAY.hemiGround).lerp(NIGHT.hemiGround, night));
    hemi.intensity = THREE.MathUtils.lerp(DAY.hemiIntensity, NIGHT.hemiIntensity, night);

    renderer.toneMappingExposure = THREE.MathUtils.lerp(DAY.exposure, NIGHT.exposure, night);
    scene.environment = night > 0.5 ? envNight : envDay;
    stars.material.opacity = night * 0.85;
    stars.visible = night > 0.02;
    lanterns.visible = night > 0.05;
    lanterns.children.forEach((l) => {
      l.intensity = night * 1500;
    });

    state.mix = night;
    onMix?.(night);
  }

  applyMix(0);

  function setNight(on) {
    state.auto = false;
    // snap time to noon / midnight and let the blend ease toward it
    state.target = on ? 1 : 0;
    state.time = on ? 24 : 12;
    applyMix(state.target, state.time);
  }

  /** Jump straight to a time of day (0-24). Turns off the auto cycle. */
  function setTimeOfDay(hour) {
    state.auto = false;
    state.time = hour;
    applyMix(0, hour);
  }

  /** Let the day progress on its own; one full day every `daySeconds`. */
  function setAutoCycle(on, daySeconds = 120) {
    state.auto = on;
    if (on) state.daySeconds = daySeconds;
  }

  function tick(dt) {
    if (state.auto) {
      state.time = (state.time + (dt * 24) / state.daySeconds) % 24;
      applyMix(0, state.time);
    } else if (Math.abs(state.mix - state.target) > 0.001) {
      state.mix += (state.target - state.mix) * Math.min(1, dt * 2.2);
      applyMix(state.mix, state.time);
    }
    controls.update(dt);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    eyeR.aspect = camera.aspect;
    eyeR.updateProjectionMatrix();
    rtL.setSize(window.innerWidth, window.innerHeight);
    rtR.setSize(window.innerWidth, window.innerHeight);
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("resize", resize);

  return {
    renderer,
    scene,
    camera,
    controls,
    sun,
    setNight,
    setTimeOfDay,
    setAutoCycle,
    setStereo,
    renderStereo,
    tick,
    isNight: () => state.target === 1,
    getTime: () => state.time,
  };
}
