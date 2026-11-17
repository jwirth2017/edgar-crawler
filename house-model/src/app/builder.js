// Geometry builder. Everything in the model is made of boxes and a few custom
// shapes, collected here, then merged into one mesh per (group, material) so
// the scene stays fast. The builder also records walkthrough colliders and
// walkable surfaces as it goes.
//
// Coordinates: plan (x, y) in feet + elevation z. World: X = plan x (north),
// Y = elevation (up), Z = plan y (east, toward the street).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Overwrite UVs with world-space feet so tiled textures stay at true scale. */
export function worldUV(geo) {
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    const nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (ny >= nx && ny >= nz) { uv[i * 2] = x; uv[i * 2 + 1] = z; }
    else if (nx >= nz) { uv[i * 2] = z; uv[i * 2 + 1] = y; }
    else { uv[i * 2] = x; uv[i * 2 + 1] = y; }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** Box geometry with local UVs in feet (for rotated pieces). */
export function feetBox(sx, sy, sz) {
  const g = new THREE.BoxGeometry(sx, sy, sz);
  return worldUV(g);
}

export class Builder {
  constructor() {
    this.batches = new Map();   // key → { group, material, geos: [] }
    this.colliders = [];        // { x0, x1, y0, y1, z0, z1 }
    this.surfaces = [];         // { x0, x1, y0, y1, h: number | (x, y) => number, tag }
    this.phase = null;          // set while building phase-only items (1 or 2); recorded on colliders/surfaces
  }

  add(group, material, geo, { shadow = true } = {}) {
    const key = `${group}|${material.uuid}|${shadow}`;
    if (!this.batches.has(key)) this.batches.set(key, { group, material, shadow, geos: [] });
    const g = geo.index ? geo.toNonIndexed() : geo;
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    this.batches.get(key).geos.push(g);
  }

  /** Axis-aligned box from plan rectangle + elevation range. */
  box(group, material, x0, x1, y0, y1, z0, z1, opts = {}) {
    if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
    const g = new THREE.BoxGeometry(x1 - x0, z1 - z0, y1 - y0);
    g.translate((x0 + x1) / 2, (z0 + z1) / 2, (y0 + y1) / 2);
    worldUV(g);
    this.add(group, material, g, opts);
    if (opts.collide) this.collider(x0, x1, y0, y1, z0, z1);
  }

  /** Box of size (along plan x, up, along plan y) placed with a matrix (world). */
  boxM(group, material, sx, sz, sy, matrix, opts = {}) {
    const g = feetBox(sx, sz, sy);
    g.applyMatrix4(matrix);
    this.add(group, material, g, opts);
  }

  geom(group, material, geo, opts = {}) {
    if (!geo.attributes.uv) worldUV(geo);
    this.add(group, material, geo, opts);
  }

  collider(x0, x1, y0, y1, z0, z1) {
    this.colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), z0, z1, phase: this.phase });
  }

  surface(x0, x1, y0, y1, h, tag = '') {
    this.surfaces.push({ x0, x1, y0, y1, h, tag, phase: this.phase });
  }

  /** Merge everything into meshes and add them to `groups[groupName]`. */
  finish(groups) {
    for (const { group, material, shadow, geos } of this.batches.values()) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      if (!groups[group]) throw new Error(`unknown group ${group}`);
      groups[group].add(mesh);
    }
    this.batches.clear();
  }
}

/** Plan point + elevation → world vector. */
export const W = (x, y, z) => new THREE.Vector3(x, z, y);
