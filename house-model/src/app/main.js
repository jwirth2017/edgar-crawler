import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { floors, sun as sunConfig, views } from '../config/house.js';
import { Builder } from './builder.js';
import { makeMaterials } from './materials.js';
import { buildHouse, LEVELS } from './house.js';
import { buildExterior, siteFurniture } from './exterior.js';
import { buildRoofs } from './roofs.js';
import { buildTerrain, buildPoolAndYard } from './site.js';
import { solarPosition, applySun, compassName } from './sun.js';
import { Walker } from './walk.js';

// ─── renderer, scene, camera ─────────────────────────────────────────────────
const host = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer({ element: document.getElementById('labels') });
labelRenderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#b8c7d3', 450, 2200);
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.3, 8000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 8;
controls.maxDistance = 900;

// ─── lights + sky ────────────────────────────────────────────────────────────
const sky = new Sky();
sky.scale.setScalar(5000);
sky.material.uniforms.mieDirectionalG.value = 0.8;
scene.add(sky);
const hemi = new THREE.HemisphereLight('#cfe3ff', '#6b6150', 0.9);
scene.add(hemi);
const ambient = new THREE.AmbientLight('#ffffff', 0.3);
scene.add(ambient);
const sunLight = new THREE.DirectionalLight('#ffffff', 3);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(4096, 4096);
const sc = sunLight.shadow.camera;
sc.left = -125; sc.right = 125; sc.top = 125; sc.bottom = -125; sc.near = 10; sc.far = 1400;
sunLight.shadow.bias = -0.0004;
sunLight.shadow.normalBias = 0.06;
sunLight.target.position.set(18, -6, -18);
scene.add(sunLight, sunLight.target);

// ─── build the model ─────────────────────────────────────────────────────────
const M = makeMaterials();
const groups = {};
for (const g of [...LEVELS, ...LEVELS.map((l) => `ceil_${l}`), 'roof', 'site']) {
  groups[g] = new THREE.Group();
  groups[g].name = g;
  scene.add(groups[g]);
}
const labelRoots = Object.fromEntries(LEVELS.map((l) => {
  const root = new THREE.Group();
  scene.add(root);
  return [l, root];
}));

const B = new Builder();
const lanterns = [];
buildHouse(B, M, labelRoots);
buildExterior(B, M, lanterns);
buildRoofs(B, M);
buildPoolAndYard(B, M, lanterns);
siteFurniture(B, M);
B.finish(groups);
for (const m of buildTerrain(M)) groups.site.add(m);

const walker = new Walker(camera, renderer.domElement, { colliders: B.colliders, surfaces: B.surfaces });

// ─── view modes ──────────────────────────────────────────────────────────────
const W = (x, y, z) => new THREE.Vector3(x, z, y);
let mode = 'exterior';
const HOME_EYE = W(-95, 150, 70);
const HOME_TARGET = W(18, 6, 4);
let anim = null;

function flyTo(eye, target, ms = 900) {
  anim = { t0: performance.now(), ms, fromE: camera.position.clone(), fromT: controls.target.clone(), toE: eye, toT: target };
}

function setLabels(level) {
  for (const l of LEVELS) for (const o of labelRoots[l].children) o.visible = l === level;
}

function setVisibility(level) {
  const idx = level ? LEVELS.indexOf(level) : LEVELS.length;
  LEVELS.forEach((l, i) => {
    groups[l].visible = i <= idx;
    groups[`ceil_${l}`].visible = !level || i < idx;
  });
  groups.roof.visible = !level;
  setLabels(level);
}

function setMode(next, { fly = true } = {}) {
  if (mode === 'walk' && next !== 'walk') walker.exit();
  mode = next;
  document.querySelectorAll('#views button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === next)));
  const walking = next === 'walk';
  controls.enabled = !walking;
  document.getElementById('crosshair').style.display = walking ? 'block' : 'none';
  updateHud();
  if (walking) { setVisibility(null); return; }
  if (next === 'exterior') {
    setVisibility(null);
    if (fly) flyTo(HOME_EYE.clone(), HOME_TARGET.clone());
  } else {
    setVisibility(next);
    const z = floors[next].floor;
    const mb = floors.upper.footprint[0];
    const cx = mb.x + mb.w / 2 + (next === 'main' ? 4 : 0);
    flyTo(W(cx + 10, 92, z + 92), W(cx, 18, z));
  }
}

function updateHud() {
  const hud = document.getElementById('hud');
  if (mode !== 'walk') { hud.style.display = 'none'; return; }
  hud.style.display = 'block';
  hud.textContent = walker.locked
    ? 'WASD / arrows to move · mouse to look · Shift to run · Esc to release the mouse'
    : 'Click the view to look around with the mouse (or drag) · WASD / arrows to move · Shift to run';
}
walker.onChange = updateHud;

document.querySelectorAll('#views button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.view)));

// presets
const presetBox = document.getElementById('presets');
for (const v of views) {
  const b = document.createElement('button');
  b.textContent = v.name;
  b.addEventListener('click', () => goPreset(v));
  presetBox.appendChild(b);
}
function goPreset(v) {
  if (v.type === 'orbit') {
    setMode('exterior', { fly: false });
    flyTo(W(...v.eye), W(...v.target));
  } else {
    setMode('walk');
    walker.enter(v.at, v.look, floors[v.level].floor, v.pitch);
  }
}
document.getElementById('walkBtn').addEventListener('click', () => {
  setMode('walk');
  const mb = floors.upper.footprint[0];
  walker.enter([mb.x + mb.w / 2, 54], [mb.x + mb.w / 2, 30], floors.main.floor);
});

// ─── sun ─────────────────────────────────────────────────────────────────────
const timeInput = document.getElementById('time');
const monthSel = document.getElementById('month');
['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].forEach((m, i) => {
  const o = document.createElement('option');
  o.value = String(i + 1);
  o.textContent = `${m} 21`;
  monthSel.appendChild(o);
});
timeInput.value = String(sunConfig.hour);
monthSel.value = String(sunConfig.month);
function fmtTime(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const ap = hh >= 12 ? 'pm' : 'am';
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`;
}
function updateSun() {
  const hour = Number(timeInput.value);
  const month = Number(monthSel.value);
  const pos = solarPosition(sunConfig.latitude, month, month === sunConfig.month ? sunConfig.day : 21, hour);
  applySun({ sun: sunLight, hemi, ambient, sky, renderer, scene, M }, pos);
  document.getElementById('sunInfo').textContent = pos.altitude > -1
    ? `${fmtTime(hour)} · sun ${Math.round(pos.altitude)}° ${compassName(pos.azimuth)}`
    : `${fmtTime(hour)} · after sunset`;
}
timeInput.addEventListener('input', updateSun);
monthSel.addEventListener('change', updateSun);
updateSun();

// ─── screenshot ──────────────────────────────────────────────────────────────
document.getElementById('shot').addEventListener('click', () => {
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.href = renderer.domElement.toDataURL('image/png');
  a.download = `farmhouse-${mode}-${fmtTime(Number(timeInput.value)).replace(/[: ]/g, '')}.png`;
  a.click();
  const t = document.getElementById('toast');
  t.textContent = 'Screenshot saved';
  t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 1600);
});

// ─── loop ────────────────────────────────────────────────────────────────────
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
});

const clock = new THREE.Clock();
function frame() {
  const dt = clock.getDelta();
  if (anim) {
    const t = Math.min(1, (performance.now() - anim.t0) / anim.ms);
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.lerpVectors(anim.fromE, anim.toE, e);
    controls.target.lerpVectors(anim.fromT, anim.toT, e);
    if (t >= 1) anim = null;
  }
  if (mode === 'walk') walker.update(dt);
  else controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  if (!STATIC) requestAnimationFrame(frame);
}
// ?static=1 renders only on request (used by automated screenshots on machines without a GPU)
const STATIC = new URLSearchParams(location.search).has('static');

camera.position.copy(HOME_EYE);
controls.target.copy(HOME_TARGET);
setMode('exterior', { fly: false });
document.getElementById('loading').remove();

// expose a small hook for automated checks / deep links (?view=, ?preset=, ?t=)
const q = new URLSearchParams(location.search);
if (q.get('t')) { timeInput.value = q.get('t'); updateSun(); }
if (q.get('view')) setMode(q.get('view'));
if (q.get('preset')) { const v = views.find((p) => p.id === q.get('preset')); if (v) goPreset(v); }
if (q.get('view') || q.get('preset')) { if (anim) { anim.ms = 1; } }
window.__house = {
  walker, setMode, goPreset, colliders: B.colliders.length, surfaces: B.surfaces.length, camera, controls,
  // advance animations instantly and draw one frame (for automated checks)
  render(steps = 1) { if (anim) anim.ms = 1; for (let i = 0; i < steps; i++) frame(); return performance.now(); },
};
frame();
