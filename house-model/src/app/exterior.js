// Porch, deck, breezeway, foundations and exterior lanterns.
import * as THREE from 'three';
import { floors, exterior, site, phases } from '../config/house.js';
import { grade } from '../model/terrain.js';
import { furniture } from './furniture.js';
import { deckStair } from '../model/deckStair.js';

export function buildExterior(B, M, lanterns) {
  porch(B, M, lanterns);
  deck(B, M, lanterns);
  breezeway(B, M, lanterns);
  stoop(B, M, lanterns);
  foundations(B, M);
}

/** Small stone landing outside the mudroom door, one step up from the court (which reaches the door). */
function stoop(B, M, lanterns) {
  const s = exterior.stoop;
  if (!s) return;
  const court = site.terrain.courtGrade;
  B.box('main', M.stone, s.x, s.x + s.w, s.y, s.y + s.d, court - 0.5, s.top);
  B.surface(s.x, s.x + s.w, s.y, s.y + s.d, s.top, 'stoop');
  lantern(B, M, lanterns, s.x + s.w - 0.4, s.y + 0.6, 7);
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
  if (st.x > d.x + 0.5) cableRail(B, M, g, [[d.x, d.y], [st.x, d.y]], zTop, d.railHeight);
  if (st.x + st.w < d.x + d.w - 0.5) cableRail(B, M, g, [[st.x + st.w, d.y], [d.x + d.w, d.y]], zTop, d.railHeight);
  cableRail(B, M, g, [[d.x + d.w, d.y], [d.x + d.w, d.y + d.d]], zTop, d.railHeight);
  cableRail(B, M, g, [[d.x, d.y], [d.x, d.y + d.d]], zTop, d.railHeight);
  outdoorKitchen(B, M, zTop);
  // bar counter outside the kitchen pass-through
  const bc = d.barCounter;
  B.box(g, M.cedar, bc.x, bc.x + bc.w, bc.y, bc.y + bc.d, zTop, zTop + bc.h - 0.15);
  B.box(g, M.counterTop, bc.x - 0.2, bc.x + bc.w + 0.2, bc.y - 0.5, bc.y + bc.d, zTop + bc.h - 0.15, zTop + bc.h);
  for (let x = bc.x + 1; x < bc.x + bc.w - 0.5; x += 2.4) {
    B.box(g, M.black, x, x + 1.2, bc.y - 2.2, bc.y - 1, zTop, zTop + 2.6);
  }
  // L-shaped stairs down to the pool deck: solid treads, landing, two runs
  const L = deckStair();
  for (let k = 1; k < L.n1; k++) {
    const top = L.zTop - k * L.rise;
    B.box(g, M.deck, L.x0, L.x1, L.Y0 - k * L.t, L.Y0 - (k - 1) * L.t, patio, top);
  }
  B.box(g, M.deck, L.x0, L.x1, L.yL0, L.yL1, patio, L.zl);
  for (let j = 1; j < L.n2; j++) {
    const top = L.zl - j * L.rise;
    B.box(g, M.deck, L.x0 - j * L.t, L.x0 - (j - 1) * L.t, L.yL0, L.yL1, patio, top);
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  B.surface(L.x0, L.x1, L.yL1, L.Y0, (x, y) => clamp(L.zTop - ((L.Y0 - y) / L.t - 0.5) * L.rise, L.zl, L.zTop), 'deck-stair');
  B.surface(L.x0, L.x1, L.yL0, L.yL1, L.zl, 'deck-stair-landing');
  B.surface(L.xEnd, L.x0, L.yL0, L.yL1, (x) => clamp(L.zl - ((L.x0 - x) / L.t - 0.5) * L.rise, patio, L.zl), 'deck-stair');
  // rails: z of the tread at a plan point, for each run
  const z1 = (y) => clamp(L.zTop - ((L.Y0 - y) / L.t) * L.rise, L.zl, L.zTop);
  const z2 = (x) => clamp(L.zl - ((L.x0 - x) / L.t) * L.rise, patio, L.zl);
  stairRail(B, M, g, [L.x1, L.Y0], [L.x1, L.yL0], (x, y) => z1(y), d.railHeight);          // outer side, run 1 + landing
  stairRail(B, M, g, [L.x0, L.Y0], [L.x0, L.yL1], (x, y) => z1(y), d.railHeight);          // inner side, run 1
  stairRail(B, M, g, [L.x1, L.yL0], [L.xEnd, L.yL0], (x) => (x >= L.x0 ? L.zl : z2(x)), d.railHeight); // outer side, landing + run 2
  stairRail(B, M, g, [L.x0, L.yL1], [L.xEnd, L.yL1], (x) => z2(x), d.railHeight);          // inner side, run 2
  // covered section: cedar posts and beams (hip roof is built with the roofs)
  if (d.cover) {
    const c = d.cover;
    const zb = zTop + c.eave - 0.15;
    for (const px of [c.x + 0.4, c.x + c.w - 0.4]) {
      B.box(g, M.stone, px - 0.9, px + 0.9, c.y - 0.5, c.y + 1.3, zTop, zTop + 2.5, { collide: true });
      B.box(g, M.cedar, px - 0.45, px + 0.45, c.y - 0.05, c.y + 0.85, zTop + 2.5, zb, { collide: true });
    }
    B.box(g, M.cedar, c.x, c.x + c.w, c.y, c.y + 0.8, zb - 0.9, zb);
    for (const bx of [c.x, c.x + c.w - 0.8]) B.box(g, M.cedar, bx, bx + 0.8, c.y, c.y + c.d, zb - 0.9, zb);
  }
  // sconces on the rear wall
  for (const x of [16.5, 37.5]) lantern(B, M, lanterns, x, -0.5, 7);
  for (const x of [1.5, 14.5, 17, 35, 41, 52]) lantern(B, M, lanterns, x, -0.5, site.terrain.walkoutGrade + 7.2);
}

/** Black stair rail between two plan points: posts, a sloped top rail, and a collider; `zf(x, y)` is the tread height. */
function stairRail(B, M, g, [xa, ya], [xb, yb], zf, h) {
  const len = Math.hypot(xb - xa, yb - ya);
  const n = Math.max(1, Math.ceil(len / 2));
  const P = (i) => [xa + ((xb - xa) * i) / n, ya + ((yb - ya) * i) / n];
  for (let i = 0; i <= n; i++) {
    const [x, y] = P(i);
    const z = zf(x, y);
    if (i % 2 === 0 || i === n) B.box(g, M.rail, x - 0.1, x + 0.1, y - 0.1, y + 0.1, z, z + h);
  }
  for (let i = 0; i < n; i++) {
    const [x0, y0] = P(i);
    const [x1, y1] = P(i + 1);
    const za = zf(x0, y0);
    const zb = zf(x1, y1);
    const r = [Math.min(x0, x1) - 0.08, Math.max(x0, x1) + 0.08, Math.min(y0, y1) - 0.08, Math.max(y0, y1) + 0.08];
    B.box(g, M.rail, ...r, Math.min(za, zb) + h - 0.12, Math.max(za, zb) + h);
    for (const k of [0.35, 0.65]) B.box(g, M.steel, ...r, Math.min(za, zb) + h * k - 0.02, Math.max(za, zb) + h * k - 0.02 + 0.04, { shadow: false });
    B.collider(r[0] - 0.2, r[1] + 0.2, r[2] - 0.2, r[3] + 0.2, Math.min(za, zb), Math.max(za, zb) + h);
  }
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
    const a0 = bw.archX ?? (bw.w - bw.archWidth) / 2;
    const a1 = a0 + bw.archWidth;
    const spring = z0 + bw.archSpring;
    const top = z0 + bw.archTop;
    const hole = new THREE.Path();
    hole.moveTo(a0, z0);
    hole.lineTo(a1, z0);
    hole.lineTo(a1, spring);
    hole.absellipse(a0 + bw.archWidth / 2, spring, bw.archWidth / 2, top - spring, 0, Math.PI, false);
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
  // far-side wall beside the motor court (the garage's own wall closes the rest)
  if (bw.sideWall) {
    const [ya, yb] = bw.sideWall;
    const wx0 = bw.x - 0.25;
    const wx1 = bw.x + 0.35;
    B.box('main', M.stone, wx0 - 0.05, wx1 + 0.05, ya, yb, z0 - 1, z0 + 3.5, { collide: true });
    B.box('main', M.siding, wx0, wx1, ya, yb, z0 + 3.5, roof.eave, { collide: true });
  }
}

function foundations(B, M) {
  // stone foundation walls down to grade around the wing (crawlspace); the garage builds its own
  const wing = floors.main.footprint[1];
  const run = (x0, x1, y0, y1, zTop) => {
    let low = zTop;
    for (let t = 0; t <= 1.0001; t += 0.1) low = Math.min(low, grade(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t));
    B.box('main', M.stone, x0, x1, y0, y1, low - 1, zTop);
  };
  const t = 0.62;
  run(wing.x, wing.x + wing.w, wing.y - t / 2, wing.y + t / 2, 0);
  run(wing.x, wing.x + wing.w, wing.y + wing.d - t / 2, wing.y + wing.d + t / 2, 0);
  run(wing.x + wing.w - t / 2, wing.x + wing.w + t / 2, wing.y, wing.y + wing.d, 0);
}

export function lantern(B, M, lanterns, x, y, z) {
  B.box('main', M.black, x - 0.35, x + 0.35, y - 0.35, y + 0.35, z - 0.9, z + 0.6);
  B.box('main', M.lantern, x - 0.25, x + 0.25, y - 0.25, y + 0.25, z - 0.7, z + 0.4, { shadow: false });
  lanterns.push(new THREE.Vector3(x, z, y));
}

export function siteFurniture(B, M) {
  const place = (f, group) => {
    const base = f.elev === 'deck' ? exterior.deck.floor : site.terrain.walkoutGrade;
    furniture(B, M, f.elev === 'deck' ? 'main' : group, f, base, null);
  };
  for (const f of site.furniture) place(f, 'site');
  B.phase = 2;
  for (const f of phases[2].furniture) place(f, 'phase2');
  B.phase = null;
}

/**
 * Outdoor kitchen on the garage-side end of the deck: an L of stone-faced
 * counter (main run along x, return toward the house at its west end), a
 * built-in gas grill, an undercounter fridge in the return, a raised bar
 * ledge on the yard side with stools, and a porcelain heat pad underneath.
 */
function outdoorKitchen(B, M, z) {
  const k = exterior.deck.kitchen;
  if (!k) return;
  const g = 'main';
  const top = 3;
  const x0 = k.x;
  const x1 = k.x + k.len;
  const yb = k.y;                    // yard-side face of the main run
  const yf = k.y + k.depth;          // cook-side face
  const rx1 = x0 + k.returnDepth;
  const ry1 = yf + k.returnLen - k.depth;   // return runs toward the house
  // heat-resistant pad under the whole cooking area
  B.box(g, M.slateTile, x0 - 0.5, x1 + 0.5, yb - 0.3, Math.min(ry1 + 0.5, -0.4), z, z + 0.06, { shadow: false });
  B.surface(x0 - 0.5, x1 + 0.5, yb - 0.3, Math.min(ry1 + 0.5, -0.4), z + 0.06, 'kitchen-pad');
  const zp = z + 0.06;
  // stone bodies + quartz tops
  B.box(g, M.stone, x0, x1, yb, yf, zp, zp + top - 0.12, { collide: true });
  B.box(g, M.stone, x0, rx1, yf, ry1, zp, zp + top - 0.12, { collide: true });
  B.box(g, M.quartzWhite, x0 - 0.1, x1 + 0.1, yb, yf + 0.1, zp + top - 0.12, zp + top);
  B.box(g, M.quartzWhite, x0 - 0.1, rx1 + 0.1, yf, ry1 + 0.1, zp + top - 0.12, zp + top);
  // raised bar ledge on the yard side (stone riser + quartz ledge)
  const lt = zp + k.ledgeH;
  B.box(g, M.stone, x0, x1, yb - 0.5, yb, zp, lt - 0.12, { collide: true });
  B.box(g, M.quartzWhite, x0 - 0.1, x1 + 0.1, yb - k.ledgeDepth, yb + 0.1, lt - 0.12, lt);
  // built-in gas grill: stainless body + lid, control strip on the cook side
  const gx0 = x0 + k.grillAt - k.grillW / 2;
  const gx1 = gx0 + k.grillW;
  B.box(g, M.steel, gx0, gx1, yb + 0.15, yf - 0.1, zp + top - 0.1, zp + top + 0.35);
  B.box(g, M.steel, gx0 + 0.05, gx1 - 0.05, yb + 0.15, yf - 0.6, zp + top + 0.35, zp + top + 1.05);
  B.box(g, M.black, gx0, gx1, yf - 0.02, yf + 0.04, zp + 1.6, zp + top - 0.2, { shadow: false });
  B.box(g, M.steel, gx0 + 0.1, gx1 - 0.1, yf, yf + 0.06, zp + 0.3, zp + 1.5, { shadow: false });   // access doors
  // undercounter fridge in the return, door facing the cook zone
  B.box(g, M.steel, rx1 - 0.02, rx1 + 0.05, ry1 - 2.2, ry1 - 0.3, zp + 0.2, zp + 2.75, { shadow: false });
  B.box(g, M.black, rx1 + 0.05, rx1 + 0.1, ry1 - 0.6, ry1 - 0.5, zp + 1.6, zp + 2.5, { shadow: false });
  // three bar stools on the yard side
  const n = k.stools;
  for (let i = 0; i < n; i++) {
    const cx = x0 + (k.len * (i + 0.5)) / n;
    const cy = yb - k.ledgeDepth - 0.75;
    B.box(g, M.black, cx - 0.08, cx + 0.08, cy - 0.08, cy + 0.08, zp, zp + 2.4);
    B.box(g, M.black, cx - 0.6, cx + 0.6, cy - 0.6, cy + 0.6, zp, zp + 0.08);
    B.box(g, M.cedar, cx - 0.65, cx + 0.65, cy - 0.65, cy + 0.65, zp + 2.4, zp + 2.55);
    B.box(g, M.cedar, cx - 0.65, cx + 0.65, cy - 0.7, cy - 0.55, zp + 2.55, zp + 3.4);
  }
}

/** Clear walkway widths around the outdoor kitchen (for the report). */
export function outdoorKitchenClearances() {
  const d = exterior.deck;
  const k = d.kitchen;
  const c = d.cover;
  const postFace = c.x + 0.4 - 0.9;              // west face of the cover's stone post base
  const stoolOuter = k.y - k.ledgeDepth - 1.5;
  return {
    east: postFace - (k.x + k.len),               // between the counter end and the cover post
    west: k.x - d.x,                              // between the counter and the west rail
    yard: stoolOuter - d.y,                       // beyond the stools to the deck edge
    cook: d.y + d.d - (k.y + k.depth),            // cook-side aisle to the house wall
  };
}
