import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { floors, sun as sunConfig, views, phases } from '../config/house.js';
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
const TOUCH = matchMedia('(pointer: coarse)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, TOUCH ? 1.5 : 2));
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
sunLight.shadow.mapSize.set(TOUCH ? 2048 : 4096, TOUCH ? 2048 : 4096);
const sc = sunLight.shadow.camera;
sc.left = -125; sc.right = 125; sc.top = 125; sc.bottom = -125; sc.near = 10; sc.far = 1400;
sunLight.shadow.bias = -0.0004;
sunLight.shadow.normalBias = 0.06;
sunLight.target.position.set(18, -6, -18);
scene.add(sunLight, sunLight.target);

// ─── build the model ─────────────────────────────────────────────────────────
const M = makeMaterials();
const groups = {};
for (const g of [...LEVELS, ...LEVELS.map((l) => `ceil_${l}`), 'roof', 'site', 'phase1', 'phase2', 'poolhouse']) {
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
const terrainMeshes = buildTerrain(M);
for (const m of terrainMeshes) groups.site.add(m);

const walker = new Walker(camera, renderer.domElement, { colliders: B.colliders, surfaces: B.surfaces });

// ─── phase (1 = initial build, 2 = pool + pool house) ─────────────────────────
let phase = phases.default;
function setPhase(ph) {
  phase = ph;
  groups.phase1.visible = ph === 1;
  groups.phase2.visible = ph === 2;
  groups.poolhouse.visible = ph === 2;
  terrainMeshes[0].userData.setPhase(ph);
  walker.phase = ph;
  document.querySelectorAll('#phase button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.phase) === ph)));
  document.getElementById('phaseNote').textContent = ph === 1
    ? 'Initial build: paver grid and lawn; blue-capped posts mark the utility stub-outs for Phase 2.'
    : 'Adds the 16 × 36 pool, raised hot tub, pool deck and ~800 sq ft pool house.';
}
document.querySelectorAll('#phase button').forEach((b) => b.addEventListener('click', () => setPhase(Number(b.dataset.phase))));
setPhase(phase);

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
  document.getElementById('crosshair').style.display = walking && !TOUCH ? 'block' : 'none';
  document.getElementById('joy').style.display = walking && TOUCH ? 'block' : 'none';
  document.getElementById('walkExit').style.display = walking && TOUCH ? 'block' : 'none';
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
  if (TOUCH) {
    hud.textContent = 'Drag the view to look around · use the joystick to walk';
    clearTimeout(updateHud.t);
    updateHud.t = setTimeout(() => { if (mode === 'walk') hud.style.display = 'none'; }, 4000);
    return;
  }
  hud.textContent = walker.locked
    ? 'WASD / arrows to move · mouse to look · Shift to run · Esc to release the mouse'
    : 'Click the view to look around with the mouse (or drag) · WASD / arrows to move · Shift to run';
}
walker.onChange = updateHud;

document.querySelectorAll('#views button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.view)));

// ─── phone layout: collapsible bottom sheet, joystick ────────────────────────
const panel = document.getElementById('panel');
const moreBtn = document.getElementById('moreBtn');
function setSheet(open) {
  panel.classList.toggle('open', open);
  moreBtn.setAttribute('aria-expanded', String(open));
  moreBtn.textContent = open ? 'Less ▾' : 'More ▴';
}
moreBtn.addEventListener('click', () => setSheet(!panel.classList.contains('open')));
const sheetIsBottom = () => getComputedStyle(document.getElementById('panelHead')).display !== 'none';
// collapse the sheet after picking a preset / walk so the model is in view
panel.addEventListener('click', (e) => {
  if (sheetIsBottom() && e.target.closest('#presets button, #walkBtn')) setSheet(false);
});
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--sheet', sheetIsBottom() ? `${panel.offsetHeight}px` : '0px');
}).observe(panel);

const joy = document.getElementById('joy');
const knob = joy.querySelector('.knob');
let joyId = null;
function joyMove(e) {
  const r = joy.getBoundingClientRect();
  const R = r.width / 2;
  let dx = e.clientX - (r.left + R);
  let dy = e.clientY - (r.top + R);
  const d = Math.hypot(dx, dy);
  if (d > R) { dx *= R / d; dy *= R / d; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  const dead = 0.12;
  const n = Math.min(1, d / R);
  const s = n < dead ? 0 : (n - dead) / (1 - dead) / (n || 1);
  walker.joy = { x: (dx / R) * s, y: (dy / R) * s };
}
joy.addEventListener('pointerdown', (e) => {
  joyId = e.pointerId;
  joy.setPointerCapture(e.pointerId);
  joyMove(e);
  e.preventDefault();
});
joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = (e) => {
  if (e.pointerId !== joyId) return;
  joyId = null;
  walker.joy = { x: 0, y: 0 };
  knob.style.transform = '';
};
joy.addEventListener('pointerup', joyEnd);
joy.addEventListener('pointercancel', joyEnd);
document.getElementById('walkExit').addEventListener('click', () => setMode('exterior'));

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
// Shown in an overlay (downloads are blocked when the page is hosted in a
// sandboxed frame): long-press on a phone, or right-click → Save on desktop.
const shotView = document.getElementById('shotView');
document.getElementById('shot').addEventListener('click', () => {
  renderer.render(scene, camera);
  document.getElementById('shotImg').src = renderer.domElement.toDataURL('image/png');
  document.getElementById('shotHint').textContent = TOUCH
    ? 'Press and hold the image to save it to Photos.'
    : 'Right-click the image and choose “Save image as…”.';
  shotView.style.display = 'flex';
});
document.getElementById('shotClose').addEventListener('click', () => { shotView.style.display = 'none'; });

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
if (q.get('phase')) setPhase(Number(q.get('phase')) === 2 ? 2 : 1);
if (q.get('view')) setMode(q.get('view'));
if (q.get('preset')) { const v = views.find((p) => p.id === q.get('preset')); if (v) goPreset(v); }
if (q.get('view') || q.get('preset')) { if (anim) { anim.ms = 1; } }
window.__house = {
  walker, setMode, goPreset, setPhase, colliders: B.colliders.length, surfaces: B.surfaces.length, camera, controls,
  // advance animations instantly and draw one frame (for automated checks)
  render(steps = 1) { if (anim) anim.ms = 1; for (let i = 0; i < steps; i++) frame(); return performance.now(); },
};
frame();
