// The 3-car garage: its own building, angled to face the turnaround. Built in
// its local plan with the same wall / opening / floor / furniture / roof code as
// the house, then rotated and moved into place (see exterior.garage.place).
import * as THREE from 'three';
import { exterior, garageFrame } from '../config/house.js';
import { Builder } from './builder.js';
import { registerLevel, buildLevelWalls, buildLevelFloors, buildLevelFurniture } from './house.js';
import { gableRoof } from './roofs.js';

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
}
