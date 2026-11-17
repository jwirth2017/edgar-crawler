// Porch, deck, breezeway, foundations and exterior lanterns.
import * as THREE from 'three';
import { floors, exterior, site } from '../config/house.js';
import { grade } from '../model/terrain.js';
import { furniture } from './furniture.js';

export function buildExterior(B, M, lanterns) {
  porch(B, M, lanterns);
  deck(B, M, lanterns);
  breezeway(B, M, lanterns);
  foundations(B, M);
}

function porch(B, M, lanterns) {
  const p = exterior.porch;
  const g = 'main';
  B.box(g, M.deck, p.x, p.x + p.w, p.y, p.y + p.d, p.floor - 0.4, p.floor);
  B.box(g, M.stone, p.x, p.x + p.w, p.y, p.y + p.d, -3, p.floor - 0.4);
  B.surface(p.x, p.x + p.w, p.y, p.y + p.d, p.floor, 'porch');
  // steps down to the front walk
  const fg = exterior.porch.floor;
  const walk = site.terrain.frontGrade;
  const n = Math.max(1, Math.round((fg - walk) / 0.55));
  const rise = (fg - walk) / n;
  for (let k = 1; k <= n; k++) {
    const y0 = p.y + p.d + (k - 1) * 1.1;
    const top = fg - k * rise;
    B.box(g, M.stone, p.steps.x, p.steps.x + p.steps.w, y0, y0 + 1.1, walk - 1, top);
    B.surface(p.steps.x, p.steps.x + p.steps.w, y0, y0 + 1.1, top, 'porch-step');
  }
  // cedar posts on stone bases + beam
  const posts = Math.round(p.w / p.postSpacing);
  const zBeam = p.roofLow - 0.6;
  for (let i = 0; i <= posts; i++) {
    const cx = p.x + p.postSize / 2 + (p.w - p.postSize) * (i / posts);
    const cy = p.y + p.d - 0.8;
    B.box(g, M.stone, cx - 1, cx + 1, cy - 1, cy + 1, p.floor, p.floor + 3, { collide: true });
    B.box(g, M.trimWhite, cx - 1.1, cx + 1.1, cy - 1.1, cy + 1.1, p.floor + 3, p.floor + 3.2);
    B.box(g, M.cedar, cx - p.postSize / 2, cx + p.postSize / 2, cy - p.postSize / 2, cy + p.postSize / 2, p.floor + 3.2, zBeam, { collide: true });
  }
  B.box('roof', M.cedar, p.x, p.x + p.w, p.y + p.d - 1.2, p.y + p.d - 0.4, zBeam, zBeam + 0.9);
  // lanterns beside the front door
  const entry = floors.main.openings.find((o) => o.kind === 'entry');
  if (entry) for (const x of [entry.from - 1.2, entry.to + 1.2]) lantern(B, M, lanterns, x, p.y + 0.5, 6.5);
}

function deck(B, M, lanterns) {
  const d = exterior.deck;
  const g = 'main';
  const zTop = d.floor;
  const zBot = d.floor - 1;
  B.box(g, M.deck, d.x, d.x + d.w, d.y, d.y + d.d, zBot, zTop);
  B.surface(d.x, d.x + d.w, d.y, d.y + d.d, zTop, 'deck');
  // beam + stone piers down to the patio
  const patio = site.terrain.walkoutGrade;
  B.box(g, M.cedar, d.x, d.x + d.w, d.y + 0.2, d.y + 1.4, zBot - 1, zBot);
  const count = Math.round(d.w / d.pierSpacing);
  for (let i = 0; i <= count; i++) {
    const x = d.x + (d.w - d.pierSize) * (i / count);
    B.box(g, M.stone, x, x + d.pierSize, d.y, d.y + d.pierSize, patio, zBot - 1, { collide: true });
    B.box(g, M.trimWhite, x - 0.15, x + d.pierSize + 0.15, d.y - 0.15, d.y + d.pierSize + 0.15, zBot - 1.25, zBot - 1);
  }
  // under-deck ceiling for the covered patio
  B.box(g, M.cedar, d.x, d.x + d.w, d.y, d.y + d.d, zBot - 0.15, zBot);
  // cable railing on the open sides (gap at the stair)
  const st = d.stairs;
  cableRail(B, M, g, [[st.x + st.w, d.y], [d.x + d.w, d.y]], zTop, d.railHeight);
  cableRail(B, M, g, [[d.x + d.w, d.y], [d.x + d.w, d.y + d.d]], zTop, d.railHeight);
  cableRail(B, M, g, [[d.x, d.y], [d.x, d.y + d.d]], zTop, d.railHeight);
  // bar counter outside the kitchen pass-through
  const bc = d.barCounter;
  B.box(g, M.cedar, bc.x, bc.x + bc.w, bc.y, bc.y + bc.d, zTop, zTop + bc.h - 0.15);
  B.box(g, M.counterTop, bc.x - 0.2, bc.x + bc.w + 0.2, bc.y - 0.5, bc.y + bc.d, zTop + bc.h - 0.15, zTop + bc.h);
  for (let x = bc.x + 1; x < bc.x + bc.w - 0.5; x += 2.4) {
    B.box(g, M.black, x, x + 1.2, bc.y - 2.2, bc.y - 1, zTop, zTop + 2.6);
  }
  // stairs down to the pool deck, solid treads on a stone base
  const drop = zTop - patio;
  const n = Math.ceil(drop / 0.6);
  const rise = drop / n;
  const run = st.d / n;
  for (let k = 1; k <= n; k++) {
    const y1 = d.y - (k - 1) * run;
    B.box(g, M.deck, st.x, st.x + st.w, y1 - run, y1, patio, zTop - k * rise);
  }
  B.surface(st.x, st.x + st.w, st.y, d.y, (x, y) => patio + ((y - st.y) / st.d) * drop, 'deck-stair');
  cableRail(B, M, g, [[st.x + st.w, st.y], [st.x + st.w, d.y]], zTop, d.railHeight, (y) => patio + ((y - st.y) / st.d) * drop);
  // sconces on the rear wall
  for (const x of [16.5, 37.5]) lantern(B, M, lanterns, x, -0.5, 7);
  for (const x of [1.5, 14.5, 17, 35, 41, 52]) lantern(B, M, lanterns, x, -0.5, site.terrain.walkoutGrade + 7.2);
}

/** Black cable rail along a polyline. `zAt(t)` lets it follow a stair. */
function cableRail(B, M, g, [[x0, y0], [x1, y1]], z, h, zAt) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.round(len / 5));
  const isX = Math.abs(y1 - y0) < 1e-6;
  const zf = (t) => (zAt ? zAt(isX ? x0 + (x1 - x0) * t : y0 + (y1 - y0) * t) : z);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    B.box(g, M.rail, x - 0.12, x + 0.12, y - 0.12, y + 0.12, zf(t), zf(t) + h);
  }
  if (!zAt) {
    const rect = isX ? [Math.min(x0, x1), Math.max(x0, x1), y0 - 0.1, y0 + 0.1] : [x0 - 0.1, x0 + 0.1, Math.min(y0, y1), Math.max(y0, y1)];
    B.box(g, M.rail, ...rect, z + h - 0.12, z + h + 0.05);
    for (let k = 1; k <= 9; k++) {
      const zz = z + 0.3 + k * 0.32;
      const r = isX ? [rect[0], rect[1], y0 - 0.015, y0 + 0.015] : [x0 - 0.015, x0 + 0.015, rect[2], rect[3]];
      B.box(g, M.steel, ...r, zz - 0.015, zz + 0.015, { shadow: false });
    }
    B.collider(...(isX ? [rect[0], rect[1], y0 - 0.3, y0 + 0.3] : [x0 - 0.3, x0 + 0.3, rect[2], rect[3]]), z, z + h);
  } else {
    // stair rail: posts only + top rail segments
    for (let i = 0; i < n; i++) {
      const ya = y0 + (y1 - y0) * (i / n);
      const yb = y0 + (y1 - y0) * ((i + 1) / n);
      const za = zf(i / n);
      const zb = zf((i + 1) / n);
      B.box(g, M.rail, x0 - 0.1, x0 + 0.1, Math.min(ya, yb), Math.max(ya, yb), Math.min(za, zb) + h - 0.1, Math.max(za, zb) + h);
      B.collider(x0 - 0.3, x0 + 0.3, Math.min(ya, yb), Math.max(ya, yb), Math.min(za, zb), Math.max(za, zb) + h);
    }
  }
}

function breezeway(B, M, lanterns) {
  const bw = exterior.breezeway;
  const roof = exterior.roofs.find((r) => r.id === 'breezeway');
  const z0 = bw.floorOffset;
  const zr = roof.eave + (bw.w / 2) * (roof.pitch / 12);
  B.box('main', M.concrete, bw.x, bw.x + bw.w, bw.y, bw.y + bw.d, z0 - 0.5, z0);
  B.surface(bw.x, bw.x + bw.w, bw.y, bw.y + bw.d, z0, 'breezeway');
  // cedar plank ceiling
  B.box('main', M.cedar, bw.x, bw.x + bw.w, bw.y, bw.y + bw.d, roof.eave - 0.3, roof.eave);
  // arched facades front and rear, with the gable above
  for (const [yFace, t] of [[bw.y, 1], [bw.y + bw.d - 1, 1]]) {
    const s = new THREE.Shape();
    s.moveTo(0, z0 - 0.5);
    s.lineTo(bw.w, z0 - 0.5);
    s.lineTo(bw.w, roof.eave);
    s.lineTo(bw.w / 2, zr - 0.05);
    s.lineTo(0, roof.eave);
    s.closePath();
    const a0 = (bw.w - bw.archWidth) / 2;
    const a1 = a0 + bw.archWidth;
    const spring = z0 + bw.archSpring;
    const top = z0 + bw.archTop;
    const hole = new THREE.Path();
    hole.moveTo(a0, z0);
    hole.lineTo(a1, z0);
    hole.lineTo(a1, spring);
    hole.absellipse(bw.w / 2, spring, bw.archWidth / 2, top - spring, 0, Math.PI, false);
    hole.lineTo(a0, z0);
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 24 });
    g.translate(bw.x, 0, yFace);
    B.geom('main', M.siding, g);
    // stone piers each side of the arch + colliders
    for (const [x0, x1] of [[bw.x, bw.x + a0], [bw.x + a1, bw.x + bw.w]]) {
      B.box('main', M.stone, x0 - 0.1, x1 + 0.1, yFace - 0.1, yFace + t + 0.1, z0 - 1, z0 + 3.5);
      B.collider(x0, x1, yFace, yFace + t, z0, roof.eave);
    }
    lantern(B, M, lanterns, bw.x + a0 - 1, yFace + (yFace < bw.y + 1 ? -0.4 : t + 0.4), z0 + 7);
    lantern(B, M, lanterns, bw.x + a1 + 1, yFace + (yFace < bw.y + 1 ? -0.4 : t + 0.4), z0 + 7);
  }
}

function foundations(B, M) {
  // stone foundation walls down to grade around the wing (crawlspace) and garage
  const wing = floors.main.footprint[1];
  const garage = floors.main.rooms.find((r) => r.id === 'garage');
  const run = (x0, x1, y0, y1, zTop) => {
    let low = zTop;
    for (let t = 0; t <= 1.0001; t += 0.1) low = Math.min(low, grade(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t));
    B.box('main', M.stone, x0, x1, y0, y1, low - 1, zTop);
  };
  const t = 0.62;
  run(wing.x, wing.x + wing.w, wing.y - t / 2, wing.y + t / 2, 0);
  run(wing.x, wing.x + wing.w, wing.y + wing.d - t / 2, wing.y + wing.d + t / 2, 0);
  run(wing.x + wing.w - t / 2, wing.x + wing.w + t / 2, wing.y, wing.y + wing.d, 0);
  run(garage.x - t / 2, garage.x + garage.w + t / 2, garage.y - t / 2, garage.y + garage.d + t / 2, garage.floorOffset - 0.5);
}

export function lantern(B, M, lanterns, x, y, z) {
  B.box('main', M.black, x - 0.35, x + 0.35, y - 0.35, y + 0.35, z - 0.9, z + 0.6);
  B.box('main', M.lantern, x - 0.25, x + 0.25, y - 0.25, y + 0.25, z - 0.7, z + 0.4, { shadow: false });
  lanterns.push(new THREE.Vector3(x, z, y));
}

export function siteFurniture(B, M) {
  const items = [...site.furniture, ...site.pavilion.furniture];
  for (const f of items) {
    const base = f.elev === 'deck' ? exterior.deck.floor : site.terrain.walkoutGrade;
    furniture(B, M, f.elev === 'deck' ? 'main' : 'site', f, base, null);
  }
}
