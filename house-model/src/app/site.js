// Terrain, pool, hot tub, pavilion, retaining wall and trees.
import * as THREE from 'three';
import { site } from '../config/house.js';
import { grade, terrainHoles } from '../model/terrain.js';
import { siteTexture } from './materials.js';
import { slabPoly } from './roofs.js';

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

  const mat = new THREE.MeshStandardMaterial({ map: siteTexture(site, SITE_EXTENT, 4), roughness: 0.97 });
  // cut the terrain away inside the house and pool footprints
  const holes = terrainHoles.slice(0, 4).map((r) => new THREE.Vector4(r.x, r.y, r.x + r.w, r.y + r.d));
  while (holes.length < 4) holes.push(new THREE.Vector4(1e6, 1e6, 1e6, 1e6));
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
  const deck = site.terrain.walkoutGrade;
  const p = site.pool;
  const g = 'site';
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
  // keep walkers out of the water
  B.collider(p.x, p.x + p.w, p.y, p.y + p.d, bottom, deck + 4);

  // raised hot tub at the house end, spilling into the pool
  const h = site.hotTub;
  const zt = deck + h.raised;
  B.box(g, M.stone, h.x, h.x + h.w, h.y, h.y + 0.8, deck - 2, zt, { collide: true });
  B.box(g, M.stone, h.x, h.x + h.w, h.y + h.d - 0.8, h.y + h.d, deck - 2, zt, { collide: true });
  B.box(g, M.stone, h.x, h.x + 0.8, h.y, h.y + h.d, deck - 2, zt, { collide: true });
  B.box(g, M.stone, h.x + h.w - 0.8, h.x + h.w, h.y, h.y + h.d, deck - 2, zt, { collide: true });
  B.box(g, M.trimWhite, h.x - 0.3, h.x + h.w + 0.3, h.y - 0.3, h.y + h.d + 0.3, zt, zt + 0.25);
  B.box(g, M.poolTile, h.x + 0.8, h.x + h.w - 0.8, h.y + 0.8, h.y + h.d - 0.8, deck - 2.5, deck - 2);
  B.box(g, M.water, h.x + 0.8, h.x + h.w - 0.8, h.y + 0.8, h.y + h.d - 0.8, zt - 0.4, zt - 0.3, { shadow: false });
  // spillway sheet
  const sx = h.x + h.w / 2;
  B.box(g, M.water, sx - 1.5, sx + 1.5, h.y - 0.35, h.y - 0.25, water, zt - 0.3, { shadow: false });
  lanterns.push(new THREE.Vector3(sx, water + 0.2, h.y - 2));

  // outdoor kitchen pavilion
  const pv = site.pavilion;
  const zp = deck + pv.postHeight;
  const posts = [];
  for (const fx of [0, 0.5, 1]) for (const fy of [0, 1]) posts.push([pv.x + fx * pv.w, pv.y + fy * pv.d]);
  posts.push([pv.x, pv.y + pv.d / 2], [pv.x + pv.w, pv.y + pv.d / 2]);
  for (const [px, py] of posts) {
    const cx = Math.min(Math.max(px, pv.x + 0.6), pv.x + pv.w - 0.6);
    const cy = Math.min(Math.max(py, pv.y + 0.6), pv.y + pv.d - 0.6);
    B.box(g, M.stone, cx - 0.9, cx + 0.9, cy - 0.9, cy + 0.9, deck, deck + 2.8, { collide: true });
    B.box(g, M.cedar, cx - 0.5, cx + 0.5, cy - 0.5, cy + 0.5, deck + 2.8, zp, { collide: true });
  }
  for (const [x0, x1, y0, y1] of [
    [pv.x, pv.x + pv.w, pv.y, pv.y + 1], [pv.x, pv.x + pv.w, pv.y + pv.d - 1, pv.y + pv.d],
    [pv.x, pv.x + 1, pv.y, pv.y + pv.d], [pv.x + pv.w - 1, pv.x + pv.w, pv.y, pv.y + pv.d],
  ]) B.box(g, M.cedar, x0 + 0.1, x1 - 0.1, y0 + 0.1, y1 - 0.1, zp, zp + 1);
  // string lights' glow points under the eaves
  for (let i = 0; i < 4; i++) lanterns.push(new THREE.Vector3(pv.x + 2 + i * (pv.w - 4) / 3, zp - 0.4, pv.y + pv.d / 2));

  retainingWall(B, M);
  trees(B, M);
}

function retainingWall(B, M) {
  const rw = site.retainingWall;
  const [[ax, ay], [bx, by], [cx, cy]] = rw.path;
  const low = site.terrain.walkoutGrade - 1.5;
  const t = rw.thickness;
  // along x = 0 (wall body on the terrace side) and along y = -47 (on the low side)
  const seg1 = [ax - t, ax, Math.min(ay, by), Math.max(ay, by) ];
  const seg2 = [Math.min(bx, cx), Math.max(bx, cx), by - 1, by - 1 + t];
  for (const r of [seg1, seg2]) {
    B.box('site', M.stone, ...r, low, rw.top, { collide: true });
    B.box('site', M.trimWhite, r[0] - 0.15, r[1] + 0.15, r[2] - 0.15, r[3] + 0.15, rw.top, rw.top + 0.25);
  }
  // black guard rail on top
  for (const [x0, x1, y0, y1] of [seg1, seg2]) {
    const isX = x1 - x0 > y1 - y0;
    const len = isX ? x1 - x0 : y1 - y0;
    const n = Math.round(len / 6);
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    for (let i = 0; i <= n; i++) {
      const tt = i / n;
      const px = isX ? x0 + (x1 - x0) * tt : mx;
      const py = isX ? my : y0 + (y1 - y0) * tt;
      B.box('site', M.rail, px - 0.1, px + 0.1, py - 0.1, py + 0.1, rw.top + 0.25, rw.top + 3.5);
    }
    const tr = isX ? [x0, x1, my - 0.08, my + 0.08] : [mx - 0.08, mx + 0.08, y0, y1];
    B.box('site', M.rail, ...tr, rw.top + 3.35, rw.top + 3.5);
    B.box('site', M.rail, ...tr, rw.top + 1.6, rw.top + 1.7);
    B.collider(...tr, rw.top, rw.top + 4);
  }
}

function trees(B, M) {
  let s = 99;
  const r = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  // trees stay along the lot edges so the house, yard and street views stay open
  const edge = (x, y) => x < -95 || x > 125 || y < -125 || y > 176;
  const accents = [[-78, 30], [-70, 52], [96, -20], [104, 18], [92, 46], [-66, -70], [100, -92]];
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
