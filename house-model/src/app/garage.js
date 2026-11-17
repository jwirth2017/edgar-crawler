// The 3-car garage: its own building, angled to face the turnaround. Built in
// its local plan with the same wall / opening / floor / furniture / roof code as
// the house, then rotated and moved into place (see exterior.garage.place).
import * as THREE from 'three';
import { exterior, garageFrame, garageLink } from '../config/house.js';
import { Builder } from './builder.js';
import { registerLevel, buildLevelWalls, buildLevelFloors, buildLevelFurniture } from './house.js';
import { gableRoof, slabPoly } from './roofs.js';

export function buildGarage(M, groups, { colliders, surfaces }) {
  const g = exterior.garage;
  if (!g) return;
  const B = new Builder();
  registerLevel('garage', g);
  buildLevelWalls(B, M, 'garage');
  buildLevelFloors(B, M, 'garage');
  buildLevelFurniture(B, M, 'garage');
  const f = g.footprint[0];
  const z = g.floor;
  B.box('garage', M.drywall, f.x, f.x + f.w, f.y, f.y + f.d, z + g.ceiling, z + g.ceiling + 0.3);          // ceiling
  B.box('garage', M.stone, f.x - 0.3, f.x + f.w + 0.3, f.y - 0.3, f.y + f.d + 0.3, z - 2.5, z - 0.5);       // foundation skirt
  gableRoof(B, M, g.roof, null, 'garageRoof');
  const inner = { garage: new THREE.Group(), garageRoof: new THREE.Group() };
  B.finish(inner);
  // world = at + R(angle) · (local − anchor); plan (x, y) is world (X, Z)
  const { anchor, at, angle } = g.place;
  for (const [key, parent] of [['garage', groups.main], ['garageRoof', groups.roof]]) {
    const outer = new THREE.Group();
    outer.position.set(at[0], 0, at[1]);
    outer.rotation.y = (-angle * Math.PI) / 180;
    inner[key].position.set(-anchor[0], 0, -anchor[1]);
    outer.add(inner[key]);
    parent.add(outer);
  }
  // walkthrough: colliders and floors stay in the local plan, tested through the frame
  const frame = garageFrame();
  for (const c of B.colliders) colliders.push({ ...c, frame });
  for (const s of B.surfaces) surfaces.push({ ...s, frame });
  buildLink(M, groups, { colliders, surfaces });
}

/**
 * Enclosed link between the garage side door and the breezeway's walk-through
 * door: square to the breezeway, mitred to the angled garage wall. Stone base,
 * board-and-batten, a window each side, low shed roof tucked under both eaves.
 */
function buildLink(M, groups, { colliders, surfaces }) {
  if (!exterior.garage.link) return;
  const L = garageLink();
  const B = new Builder();
  const z0 = exterior.garage.floor;
  const top = z0 + L.eave - z0;                    // eave height (absolute)
  const head = z0 + 7;
  const sill = z0 + 3;
  const [w0, w1] = L.window;
  // floor
  slabPoly(B, 'main', M.slateTile, M.concrete, L.poly.map(([x, y]) => [x, y, z0]), 0.5);
  B.surface(Math.min(L.xg(L.y0), L.xg(L.y1)), L.xb, L.y0, L.y1, z0, 'garage-link');
  // the two long walls, each with a window
  for (const [wy, out] of [[L.y0, -1], [L.y1, 1]]) {
    const ya = Math.min(wy, wy + out * 0.5);
    const yb = Math.max(wy, wy + out * 0.5);
    const xa = L.xg(wy);
    const xb = L.xb;
    B.box('main', M.stone, xa, xb, ya - 0.05, yb + 0.05, z0 - 1, z0 + 2.5, { collide: true });
    B.box('main', M.siding, xa, xb, ya, yb, z0 + 2.5, sill);
    B.box('main', M.siding, xa, xb, ya, yb, head, top);
    B.box('main', M.siding, xa, w0, ya, yb, sill, head);
    B.box('main', M.siding, w1, xb, ya, yb, sill, head);
    B.box('main', M.glass, w0, w1, wy + out * 0.22, wy + out * 0.28, sill, head, { shadow: false });
    for (const [a, b] of [[w0, w0 + 0.2], [w1 - 0.2, w1]]) B.box('main', M.black, a, b, ya - 0.03, yb + 0.03, sill, head);
    for (const z of [sill, head - 0.2]) B.box('main', M.black, w0, w1, ya - 0.03, yb + 0.03, z, z + 0.2);
    B.box('main', M.trimWhite, w0 - 0.2, w1 + 0.2, Math.min(wy + out * 0.5, wy + out * 0.85), Math.max(wy + out * 0.5, wy + out * 0.85), sill - 0.15, sill);
  }
  // low shed roof (planar), sloping toward the turnaround, tucked under both eaves
  const oh = 0.8;
  const z = (y) => top + 0.25 + (y - (L.y0 - oh)) * 0.06;
  const ya = L.y0 - oh;
  const yb = L.y1 + oh;
  slabPoly(B, 'roof', M.roof, M.black, [[L.xb, ya, z(ya)], [L.xg(ya), ya, z(ya)], [L.xg(yb), yb, z(yb)], [L.xb, yb, z(yb)]]);
  // cedar ceiling inside
  slabPoly(B, 'main', M.cedar, M.cedar, L.poly.map(([x, y]) => [x, y, top - 0.3]), 0.08);
  B.finish({ main: groups.main, roof: groups.roof });
  colliders.push(...B.colliders);
  surfaces.push(...B.surfaces);
}
