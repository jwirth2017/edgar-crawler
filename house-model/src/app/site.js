// Terrain, Phase 1 / Phase 2 yard (pool, hot tub, pool house, stub-outs),
// low patio wall and trees.
import * as THREE from 'three';
import { site, phases } from '../config/house.js';
import { grade, terrainHoles, poolHole, patioEdgeWall } from '../model/terrain.js';
import { siteTexture } from './materials.js';
import { slabPoly, buildPoolHouseRoof } from './roofs.js';
import { registerLevel, buildLevelWalls, buildLevelFloors, buildLevelFurniture } from './house.js';

export const SITE_EXTENT = [-160, -210, 220, 200]; // x0, y0, x1, y1 (plan feet)

export function buildTerrain(M) {
  const [x0, y0, x1, y1] = SITE_EXTENT;
  const nx = x1 - x0;
  const ny = y1 - y0;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array((nx + 1) * (ny + 1) * 3);
  const uv = new Float32Array((nx + 1) * (ny + 1) * 2);
  let k = 0;
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + i;
      const y = y0 + j;
      pos[k * 3] = x;
      pos[k * 3 + 1] = grade(x, y);
      pos[k * 3 + 2] = y;
      uv[k * 2] = i / nx;
      uv[k * 2 + 1] = 1 - j / ny;
      k++;
    }
  }
  const idx = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i;
      const b = a + 1;
      const c = a + nx + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();

  const maps = { 1: siteTexture(site, SITE_EXTENT, 4, 1), 2: siteTexture(site, SITE_EXTENT, 4, 2) };
  const mat = new THREE.MeshStandardMaterial({ map: maps[phases.default], roughness: 0.97 });
  // cut the terrain away inside the house footprints, and the pool in Phase 2
  const holes = terrainHoles.slice(0, 3).map((r) => new THREE.Vector4(r.x, r.y, r.x + r.w, r.y + r.d));
  while (holes.length < 3) holes.push(new THREE.Vector4(1e6, 1e6, 1e6, 1e6));
  const poolVec = new THREE.Vector4(1e6, 1e6, 1e6, 1e6);
  holes.push(poolVec);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uHoles = { value: holes };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldPos;\nuniform vec4 uHoles[4];')
      .replace('void main() {', `void main() {
        for (int i = 0; i < 4; i++) {
          vec4 h = uHoles[i];
          if (vWorldPos.x > h.x && vWorldPos.x < h.z && vWorldPos.z > h.y && vWorldPos.z < h.w) discard;
        }`);
  };
  // the depth pass used for shadows needs the same cut-outs
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  mesh.customDepthMaterial.onBeforeCompile = mat.onBeforeCompile;
  mesh.name = 'terrain';
  /** Switch the ground paint and the pool cut-out between phases. */
  mesh.userData.setPhase = (ph) => {
    mat.map = maps[ph];
    mat.needsUpdate = true;
    if (ph === 2) poolVec.set(poolHole.x, poolHole.y, poolHole.x + poolHole.w, poolHole.y + poolHole.d);
    else poolVec.set(1e6, 1e6, 1e6, 1e6);
  };
  mesh.userData.setPhase(phases.default);

  // big ground disc beyond the modeled lot
  const far = new THREE.Mesh(
    new THREE.CircleGeometry(2400, 64).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#5a7f3a', roughness: 1 }),
  );
  far.position.set(30, -16, 0);
  far.receiveShadow = true;
  return [mesh, far];
}

export function buildPoolAndYard(B, M, lanterns) {
  B.phase = 1;
  stubOutMarkers(B, M);
  B.phase = 2;
  poolAndHotTub(B, M, lanterns);
  poolHouse(B, M, lanterns);
  B.phase = null;
  patioWall(B, M);
  trees(B, M);
}

/** Phase 1: small capped posts marking the utility stub-outs for Phase 2. */
function stubOutMarkers(B, M) {
  for (const s of site.stubOuts) {
    const z = grade(s.x, s.y);
    B.box('phase1', M.marker, s.x - 0.25, s.x + 0.25, s.y - 0.25, s.y + 0.25, z - 0.5, z + 2.2, { collide: true });
    B.box('phase1', M.markerCap, s.x - 0.35, s.x + 0.35, s.y - 0.35, s.y + 0.35, z + 2.2, z + 2.6);
  }
}

/** Phase 2: 16 x 36 pool and the raised stone hot tub spilling into it. */
function poolAndHotTub(B, M, lanterns) {
  const deck = site.terrain.walkoutGrade;
  const p = phases[2].pool;
  const g = 'phase2';
  const water = deck - 0.45;
  const bottom = deck - p.depth;
  // basin (tile) + coping
  B.box(g, M.poolTile, p.x, p.x + p.w, p.y, p.y + p.d, bottom - 0.5, bottom);
  B.box(g, M.poolTile, p.x - 0.5, p.x, p.y, p.y + p.d, bottom, deck);
  B.box(g, M.poolTile, p.x + p.w, p.x + p.w + 0.5, p.y, p.y + p.d, bottom, deck);
  B.box(g, M.poolTile, p.x - 0.5, p.x + p.w + 0.5, p.y - 0.5, p.y, bottom, deck);
  B.box(g, M.poolTile, p.x - 0.5, p.x + p.w + 0.5, p.y + p.d, p.y + p.d + 0.5, bottom, deck);
  const c = 1.5;
  for (const r of [
    [p.x - c, p.x + p.w + c, p.y - c, p.y], [p.x - c, p.x + p.w + c, p.y + p.d, p.y + p.d + c],
    [p.x - c, p.x, p.y, p.y + p.d], [p.x + p.w, p.x + p.w + c, p.y, p.y + p.d],
  ]) B.box(g, M.trimWhite, ...r, deck - 0.2, deck + 0.12);
  B.box(g, M.water, p.x, p.x + p.w, p.y, p.y + p.d, water - 0.05, water, { shadow: false });
  // sundeck (tanning ledge) at the far end with in-pool loungers
  const sd = p.sundeck;
  if (sd) {
    const top = water - sd.water;
    B.box(g, M.poolTile, p.x, p.x + p.w, p.y, p.y + sd.d, bottom, top);
    B.box(g, M.trimWhite, p.x, p.x + p.w, p.y + sd.d - 0.35, p.y + sd.d, top - 0.05, top + 0.02);   // ledge nosing
    const n = sd.loungers || 0;
    for (let i = 0; i < n; i++) {
      const cx = p.x + (p.w * (i + 0.5)) / n;
      const y0 = p.y + 1.2;
      const y1 = y0 + 5.8;
      B.box(g, M.poolLounger, cx - 1.1, cx + 1.1, y0 + 1.6, y1, top, top + 0.85);                // seat, mostly in the water
      B.box(g, M.poolLounger, cx - 1.1, cx + 1.1, y0, y0 + 1.7, top, top + 1.5);                // raised back end
      B.box(g, M.poolLounger, cx - 1.1, cx + 1.1, y0 - 0.1, y0 + 0.3, top, top + 2.1);          // backrest
    }
  }
  B.collider(p.x, p.x + p.w, p.y, p.y + p.d, bottom, deck + 4);   // keep walkers out of the water

  const h = phases[2].hotTub;
  const zt = deck + h.raised;
  B.box(g, M.stone, h.x, h.x + h.w, h.y, h.y + 0.8, deck - 2, zt, { collide: true });
  B.box(g, M.stone, h.x, h.x + h.w, h.y + h.d - 0.8, h.y + h.d, deck - 2, zt, { collide: true });
  B.box(g, M.stone, h.x, h.x + 0.8, h.y, h.y + h.d, deck - 2, zt, { collide: true });
  B.box(g, M.stone, h.x + h.w - 0.8, h.x + h.w, h.y, h.y + h.d, deck - 2, zt, { collide: true });
  // coping ring on top of the stone walls (open in the middle so the water shows)
  const cp = 1.1;
  for (const r of [
    [h.x - 0.3, h.x + h.w + 0.3, h.y - 0.3, h.y + cp - 0.3], [h.x - 0.3, h.x + h.w + 0.3, h.y + h.d - cp + 0.3, h.y + h.d + 0.3],
    [h.x - 0.3, h.x + cp - 0.3, h.y + cp - 0.3, h.y + h.d - cp + 0.3], [h.x + h.w - cp + 0.3, h.x + h.w + 0.3, h.y + cp - 0.3, h.y + h.d - cp + 0.3],
  ]) B.box(g, M.trimWhite, ...r, zt, zt + 0.25);
  B.box(g, M.poolTile, h.x + 0.8, h.x + h.w - 0.8, h.y + 0.8, h.y + h.d - 0.8, deck - 2.5, deck - 2);
  B.box(g, M.water, h.x + 0.8, h.x + h.w - 0.8, h.y + 0.8, h.y + h.d - 0.8, zt - 0.4, zt - 0.3, { shadow: false });
  const sx = h.x + h.w / 2;
  B.box(g, M.water, sx - 1.5, sx + 1.5, h.y - 0.35, h.y - 0.25, water, zt - 0.3, { shadow: false });
}

/** Phase 2: ~800 sq ft pool house, built with the same wall / opening / floor code as the house. */
function poolHouse(B, M, lanterns) {
  const ph = phases[2].poolHouse;
  registerLevel('poolhouse', ph);
  buildLevelWalls(B, M, 'poolhouse');
  buildLevelFloors(B, M, 'poolhouse');
  buildLevelFurniture(B, M, 'poolhouse');
  const f = ph.footprint[0];
  const z = ph.floor;
  const deck = site.terrain.walkoutGrade;
  // stone foundation skirt down to grade
  let low = z;
  for (const [x, y] of [[f.x, f.y], [f.x + f.w, f.y], [f.x, f.y + f.d], [f.x + f.w, f.y + f.d]]) low = Math.min(low, grade(x, y));
  B.box('poolhouse', M.stone, f.x - 0.3, f.x + f.w + 0.3, f.y - 0.3, f.y + f.d + 0.3, low - 1, z - 0.5);
  // flat ceiling over the bath (the great room is vaulted to the roof)
  const bath = ph.rooms.find((r) => r.use === 'bath');
  if (bath) B.box('poolhouse', M.drywall, bath.x, bath.x + bath.w, bath.y, bath.y + bath.d, z + ph.ceiling, z + ph.ceiling + 0.3);
  // covered porch facing the pool: stone floor, cedar posts on stone bases, beam
  const p = ph.porch;
  B.box('poolhouse', M.stone, p.x, p.x + p.w, p.y, p.y + p.d, deck - 0.5, z);
  B.surface(p.x, p.x + p.w, p.y, p.y + p.d, z, 'poolhouse-porch');
  const eave = z + ph.wallTop;
  // the porch's open edge faces the pool: '+y' (default), '-y', '+x' or '-x'
  const face = p.faces || '+y';
  const alongY = face[1] === 'x';                      // porch runs along y when it faces ±x
  const open = { '+y': p.y + p.d, '-y': p.y, '+x': p.x + p.w, '-x': p.x }[face];
  const wall = { '+y': p.y, '-y': p.y + p.d, '+x': p.x, '-x': p.x + p.w }[face];
  const inward = face[0] === '+' ? -1 : 1;             // from the open edge toward the building
  const [a0, len] = alongY ? [p.y, p.d] : [p.x, p.w];
  const at = (t, off) => (alongY ? [off, t] : [t, off]);   // (along, across) → plan (x, y)
  const sq = (t, off, r, z0, z1, mat, opts) => {
    const [x, y] = at(t, off);
    B.box('poolhouse', mat, x - r, x + r, y - r, y + r, z0, z1, opts);
  };
  const posts = 3;
  for (let i = 0; i < posts; i++) {
    const t = a0 + 0.6 + ((len - 1.2) * i) / (posts - 1);
    const off = open + inward * 0.7;
    sq(t, off, 0.9, z, z + 2.5, M.stone, { collide: true });
    sq(t, off, 0.45, z + 2.5, eave - 0.6, M.cedar, { collide: true });
  }
  {
    const o0 = open + inward * 1.2;
    const o1 = open + inward * 0.2;
    const [lo, hi] = [Math.min(o0, o1), Math.max(o0, o1)];
    if (alongY) B.box('poolhouse', M.cedar, lo, hi, p.y, p.y + p.d, eave - 0.9, eave);
    else B.box('poolhouse', M.cedar, p.x, p.x + p.w, lo, hi, eave - 0.9, eave);
  }
  // lanterns on the building wall at each end of the porch
  for (const t of [a0 + 2, a0 + len - 2]) {
    const out = -inward;                               // from the wall out onto the porch
    const [x0, y0] = at(t, wall + out * 0.25);
    const [x1, y1] = at(t, wall + out * 0.7);
    const [lx0, ly0] = at(t, wall + out * 0.3);
    const [lx1, ly1] = at(t, wall + out * 0.8);
    if (alongY) {
      B.box('poolhouse', M.black, Math.min(x0, x1), Math.max(x0, x1), t - 0.35, t + 0.35, z + 6, z + 7.4);
      B.box('poolhouse', M.lantern, Math.min(lx0, lx1), Math.max(lx0, lx1), t - 0.25, t + 0.25, z + 6.2, z + 7.2, { shadow: false });
    } else {
      B.box('poolhouse', M.black, t - 0.35, t + 0.35, Math.min(y0, y1), Math.max(y0, y1), z + 6, z + 7.4);
      B.box('poolhouse', M.lantern, t - 0.25, t + 0.25, Math.min(ly0, ly1), Math.max(ly0, ly1), z + 6.2, z + 7.2, { shadow: false });
    }
  }
  buildPoolHouseRoof(B, M, ph, 'poolhouse');
}

/** Low stone wall at the patio's south edge, where the side lawn is still above the patio (≤ 3 ft). */
function patioWall(B, M) {
  const w = patioEdgeWall();
  if (w.y1 - w.y0 < 0.5) return;
  const low = site.terrain.walkoutGrade - 0.5;
  const step = 1;
  for (let y = w.y0; y < w.y1 - 1e-6; y += step) {
    const y1 = Math.min(w.y1, y + step);
    const h = Math.max(w.heightAt(y), w.heightAt(y1));
    if (h < 0.2) continue;
    const top = site.terrain.walkoutGrade + h + 0.25;
    B.box('site', M.stone, w.x - 1.2, w.x, y, y1, low, top, { collide: true });
    B.box('site', M.trimWhite, w.x - 1.35, w.x + 0.15, y, y1, top, top + 0.2);
  }
}

function trees(B, M) {
  let s = 99;
  const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  // trees stay along the lot edges so the house, yard and street views stay open
  const edge = (x, y) => x < -95 || x > 125 || y < -125 || y > 176;
  const accents = [[-98, -30], [-74, 78], [96, -20], [104, 18], [92, 46], [-66, -70], [100, -92]];
  let placed = 0;
  for (let tries = 0; tries < 1200 && placed < 75; tries++) {
    let x = -150 + r() * 360;
    let y = -200 + r() * 390;
    if (placed < accents.length) [x, y] = accents[placed];
    else if (!edge(x, y) || (y > 140 && y < 172)) continue;
    placed++;
    const z = grade(x, y);
    const evergreen = r() < 0.35;
    const size = 0.7 + r() * 0.6;
    if (evergreen) {
      B.geom('site', M.bark, new THREE.CylinderGeometry(0.4, 0.6, 6 * size, 6).translate(x, z + 3 * size, y));
      for (let k = 0; k < 3; k++) {
        const rad = (7 - k * 1.8) * size;
        const cone = new THREE.ConeGeometry(rad, 10 * size, 8).translate(x, z + (5 + k * 6) * size + 4, y);
        B.geom('site', M.leafDark, cone);
      }
    } else {
      B.geom('site', M.bark, new THREE.CylinderGeometry(0.6, 0.9, 12 * size, 7).translate(x, z + 6 * size, y));
      for (let k = 0; k < 4; k++) {
        const rad = (6 + r() * 4) * size;
        const blob = new THREE.IcosahedronGeometry(rad, 1).translate(x + (r() - 0.5) * 8 * size, z + (14 + r() * 8) * size, y + (r() - 0.5) * 8 * size);
        B.geom('site', r() < 0.5 ? M.leaf : M.leafDark, blob);
      }
    }
  }
}

export { slabPoly };
