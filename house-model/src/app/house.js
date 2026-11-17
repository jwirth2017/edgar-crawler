// The house: walls, openings, floors, ceilings, stairs, furniture and room
// labels for each level, built from the config via the shared layout module.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { floors, build, stair, exterior } from '../config/house.js';
import { deriveWalls, allRooms, roomAt, fmtFeet } from '../model/layout.js';
import { furniture } from './furniture.js';

export const LEVELS = ['basement', 'main', 'upper'];
const EPS = 1e-6;
const MAIN_BLOCK = floors.upper.footprint[0];
const GARAGE = floors.main.rooms.find((r) => r.id === 'garage');
const inRect = (r, x, y) => x > r.x - EPS && x < r.x + r.w + EPS && y > r.y - EPS && y < r.y + r.d + EPS;
const roofById = (id) => exterior.roofs.find((r) => r.id === id);

export const floorZ = (levelKey, room) => floors[levelKey].floor + ((room && room.floorOffset) || 0);
const ceilingOf = (levelKey, room) => (room && room.ceiling) || floors[levelKey].ceiling;

// faces of the main block that are covered by the porch / deck (no stone wainscot)
const COVERED_FACES = [
  { axis: 'y', at: 0, from: 0, to: 56 },
  { axis: 'y', at: 40, from: 0, to: 56 },
];

/** Wall-line geometry helpers. */
function rectAlong(w, a, b, off0, off1) {
  return w.axis === 'y'
    ? [a, b, w.at + Math.min(off0, off1), w.at + Math.max(off0, off1)]
    : [w.at + Math.min(off0, off1), w.at + Math.max(off0, off1), a, b];
}
const along = (w, t, off) => (w.axis === 'y' ? [t, w.at + off] : [w.at + off, t]);

export function buildHouse(B, M, labelRoots) {
  for (const key of LEVELS) {
    buildLevelWalls(B, M, key);
    buildLevelFloors(B, M, key);
    buildLevelFurniture(B, M, key);
    buildLabels(key, labelRoots[key]);
  }
  buildStairs(B, M);
  buildChimney(B, M);
}

// ─── walls ────────────────────────────────────────────────────────────────────
function buildLevelWalls(B, M, key) {
  const floor = floors[key];
  const rooms = allRooms(floor);
  const { walls } = deriveWalls(floor);

  for (const w of walls) {
    const ext = w.kind === 'exterior';
    const t = ext ? build.exteriorWall : build.interiorWall;
    // split the run wherever the rooms on either side change
    const cuts = new Set([w.from, w.to]);
    for (const r of rooms) {
      const [lo, hi] = w.axis === 'y' ? [r.x, r.x + r.w] : [r.y, r.y + r.d];
      if (lo > w.from + EPS && lo < w.to - EPS) cuts.add(lo);
      if (hi > w.from + EPS && hi < w.to - EPS) cuts.add(hi);
    }
    const pts = [...cuts].sort((p, q) => p - q);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const mid = (a + b) / 2;
      const A = roomAt(rooms, ...along(w, mid, -0.3));
      const C = roomAt(rooms, ...along(w, mid, 0.3));
      const present = [A, C].filter(Boolean);
      const zLow = Math.min(...present.map((r) => floorZ(key, r)));
      const zRef = Math.max(...present.map((r) => floorZ(key, r)));
      let zTop;
      if (ext) zTop = exteriorTop(key, present[0]);
      else zTop = Math.max(...present.map((r) => floorZ(key, r) + ceilingOf(key, r)));
      // main-block wall shared with the one-story wing: carry it up to the
      // upper floor and clad the wing side above the wing ceiling
      const sharedEdge = key === 'main' && !ext && present.length === 2
        && present.filter((r) => inRect(MAIN_BLOCK, r.x + r.w / 2, r.y + r.d / 2)).length === 1;
      if (sharedEdge) {
        const zU = floors.upper.floor;
        const wingSide = inRect(MAIN_BLOCK, A.x + A.w / 2, A.y + A.d / 2) ? 1 : -1;
        const ta = Math.abs(a - w.from) < EPS ? a - t / 2 : a;
        const tb = Math.abs(b - w.to) < EPS ? b + t / 2 : b;
        B.box(key, M.drywall, ...rectAlong(w, ta, tb, -t / 2, t / 2), zTop, zU);
        B.box(key, M.siding, ...rectAlong(w, ta, tb, wingSide * (t / 2), wingSide * (t / 2 + 0.07)), zTop, zU);
      }
      if (present.every((r) => r.void)) continue;
      const voidSide = present.some((r) => r.void);
      if (voidSide) zTop = Math.min(zTop, zRef + 3.5);
      const ea = Math.abs(a - w.from) < EPS ? a - t / 2 : a;
      const eb = Math.abs(b - w.to) < EPS ? b + t / 2 : b;
      const ops = w.openings
        .filter((o) => o.to > a + EPS && o.from < b - EPS)
        .map((o) => ({ ...o, from: Math.max(o.from, a), to: Math.min(o.to, b) }));
      const out = ext ? (A ? 1 : -1) : 0; // outward perpendicular sign for cladding
      const pieces = wallPieces(ea, eb, ops, zLow, zRef, zTop, voidSide);
      for (const p of pieces) {
        if (p.rail) { railing(B, M, key, w, p.a, p.b, p.z0); continue; }
        B.box(key, M.drywall, ...rectAlong(w, p.a, p.b, -t / 2, t / 2), p.z0, p.z1, { collide: true });
        if (ext) cladding(B, M, key, w, p, out, t, zRef);
      }
      for (const o of ops) openingUnit(B, M, key, w, o, zRef, t, ext, A ? -1 : 1);
    }
  }
}

function exteriorTop(key, room) {
  if (key === 'basement') return floors.main.floor;
  if (key === 'upper') return floors.upper.floor + floors.upper.ceiling;
  const cx = room.x + room.w / 2;
  const cy = room.y + room.d / 2;
  if (inRect(MAIN_BLOCK, cx, cy)) return floors.upper.floor;
  if (GARAGE && inRect(GARAGE, cx, cy)) return roofById('garage').eave;
  return roofById('wing').eave;
}

/** Solid pieces of a wall segment once doors and windows are cut out. */
function wallPieces(a, b, ops, zLow, zRef, zTop, voidSide) {
  const out = [];
  let cur = a;
  for (const o of ops.sort((p, q) => p.from - q.from)) {
    if (o.from > cur + EPS) out.push({ a: cur, b: o.from, z0: zLow, z1: zTop });
    const sill = o.sill ?? (o.kind === 'passthrough' ? 3.5 : build.windowSill);
    const head = o.head ?? (['window', 'passthrough'].includes(o.kind) ? build.windowHead : build.doorHeight);
    if (o.kind === 'railing') {
      out.push({ a: o.from, b: o.to, z0: zRef, rail: true });
    } else {
      if (['window', 'passthrough'].includes(o.kind)) out.push({ a: o.from, b: o.to, z0: zLow, z1: zRef + sill });
      if (!voidSide && zRef + head < zTop - EPS) out.push({ a: o.from, b: o.to, z0: zRef + head, z1: zTop, header: true });
    }
    cur = Math.max(cur, o.to);
  }
  if (cur < b - EPS) out.push({ a: cur, b, z0: zLow, z1: zTop });
  return out;
}

function onCoveredFace(w) {
  return COVERED_FACES.some((f) => f.axis === w.axis && Math.abs(f.at - w.at) < EPS && w.from >= f.from - EPS && w.to <= f.to + EPS);
}

/** Exterior skin: board-and-batten, stone wainscot, or full stone below grade. */
function cladding(B, M, key, w, p, out, t, zRef) {
  const o0 = out * (t / 2);
  const o1 = out * (t / 2 + 0.07);
  const rect = (z0, z1, mat) => z1 > z0 + EPS && B.box(key, mat, ...rectAlong(w, p.a - 0.07, p.b + 0.07, o0, o1), z0, z1);
  if (key === 'basement') return rect(p.z0, p.z1, M.stone);
  if (key === 'upper') return rect(p.z0, p.z1, M.siding);
  const wains = onCoveredFace(w) ? -Infinity : zRef + exterior.wainscotHeight;
  rect(p.z0, Math.min(p.z1, wains), M.stone);
  rect(Math.max(p.z0, wains), p.z1, M.siding);
  if (p.z1 > wains && p.z0 < wains) {
    // cap on the stone wainscot
    B.box(key, M.trimWhite, ...rectAlong(w, p.a - 0.07, p.b + 0.07, o0, out * (t / 2 + 0.2)), wains - 0.12, wains);
  }
}

// ─── doors, windows, railings ────────────────────────────────────────────────
function openingUnit(B, M, key, w, o, zRef, t, ext, inSign) {
  const width = o.to - o.from;
  const sill = o.sill ?? (o.kind === 'passthrough' ? 3.5 : build.windowSill);
  const head = o.head ?? (['window', 'passthrough'].includes(o.kind) ? build.windowHead : build.doorHeight);
  const fw = 0.22; // frame width
  const fd = t + 0.1; // frame depth
  const frame = (a, b, z0, z1, mat = M.black) => B.box(key, mat, ...rectAlong(w, a, b, -fd / 2, fd / 2), z0, z1);
  const pane = (a, b, z0, z1, collide = true) => {
    B.box(key, M.glass, ...rectAlong(w, a, b, -0.03, 0.03), z0, z1, { shadow: false });
    if (collide) B.collider(...rectAlong(w, a, b, -0.15, 0.15), z0, z1);
  };
  const mullions = (a, b, z0, z1) => {
    const n = Math.max(1, Math.round((b - a) / 2.6));
    for (let i = 1; i < n; i++) {
      const m = a + ((b - a) * i) / n;
      frame(m - 0.06, m + 0.06, z0, z1);
    }
    if (z1 - z0 > 5) frame(a, b, z0 + (z1 - z0) * 0.7 - 0.06, z0 + (z1 - z0) * 0.7 + 0.06);
  };

  if (o.kind === 'window') {
    const z0 = zRef + sill;
    const z1 = zRef + head;
    if (!ext) return;
    frame(o.from, o.from + fw, z0, z1);
    frame(o.to - fw, o.to, z0, z1);
    frame(o.from, o.to, z0, z0 + fw);
    frame(o.from, o.to, z1 - fw, z1);
    mullions(o.from + fw, o.to - fw, z0 + fw, z1 - fw);
    pane(o.from, o.to, z0, z1);
    // sill trim outside
    B.box(key, M.trimWhite, ...rectAlong(w, o.from - 0.2, o.to + 0.2, -inSign * (t / 2), -inSign * (t / 2 + 0.35)), z0 - 0.15, z0);
  } else if (o.kind === 'passthrough') {
    const z0 = zRef + sill;
    const z1 = zRef + head;
    frame(o.from, o.from + fw, z0, z1);
    frame(o.to - fw, o.to, z0, z1);
    frame(o.from, o.to, z1 - fw, z1);
    // folded-open bifold panels stacked at both ends
    for (const [edge, dir] of [[o.from + fw, 1], [o.to - fw, -1]]) {
      for (let k = 0; k < 3; k++) {
        const a = edge + dir * k * 0.18;
        B.box(key, M.black, ...rectAlong(w, Math.min(a, a + dir * 0.12), Math.max(a, a + dir * 0.12), inSign * 0.2, inSign * 2.2), z0 + 0.1, z1 - 0.3);
      }
    }
    // counter sill through the wall
    B.box(key, M.counterTop, ...rectAlong(w, o.from, o.to, -t / 2 - 0.4, t / 2 + 0.4), z0 - 0.15, z0);
  } else if (o.kind === 'glassdoor') {
    const z0 = zRef;
    const z1 = zRef + head;
    frame(o.from, o.from + fw, z0, z1);
    frame(o.to - fw, o.to, z0, z1);
    frame(o.from, o.to, z1 - fw, z1);
    // fixed glass panels at each side, the middle half slid open
    const side = width / 4;
    for (const [a, b] of [[o.from + fw, o.from + side], [o.to - side, o.to - fw]]) {
      frame(b - 0.12, b, z0, z1 - fw);
      mullions(a, b, z0 + 0.3, z1 - fw);
      frame(a, b, z0, z0 + 0.3);
      pane(a, b, z0 + 0.3, z1 - fw);
    }
    if (!ext) return;
  } else if (o.kind === 'entry') {
    const z1 = zRef + head;
    frame(o.from, o.from + fw, zRef, z1, M.black);
    frame(o.to - fw, o.to, zRef, z1, M.black);
    frame(o.from, o.to, z1 - fw, z1, M.black);
    // two glass doors swung open into the foyer
    for (const [hinge, dir] of [[o.from + fw, 1], [o.to - fw, -1]]) {
      const len = width / 2 - fw;
      const [hx, hy] = along(w, hinge, inSign * (t / 2));
      const [tx, ty] = along(w, hinge + dir * 0.15, inSign * (t / 2 + len));
      const x0 = Math.min(hx, tx), x1 = Math.max(hx, tx), y0 = Math.min(hy, ty), y1 = Math.max(hy, ty);
      B.box(key, M.black, x0, x1, y0, y1, zRef, zRef + 0.6);
      B.box(key, M.black, x0, x1, y0, y1, z1 - fw - 0.4, z1 - fw);
      B.box(key, M.glass, x0, x1, y0, y1, zRef + 0.6, z1 - fw - 0.4, { shadow: false });
    }
  } else if (o.kind === 'door' && ext) {
    const z1 = zRef + head;
    frame(o.from, o.from + 0.18, zRef, z1, M.trimWhite);
    frame(o.to - 0.18, o.to, zRef, z1, M.trimWhite);
    frame(o.from, o.to, z1 - 0.18, z1, M.trimWhite);
    const len = width - 0.3;
    const [hx, hy] = along(w, o.from + 0.18, inSign * (t / 2));
    const [tx, ty] = along(w, o.from + 0.33, inSign * (t / 2 + len));
    B.box(key, M.black, Math.min(hx, tx), Math.max(hx, tx), Math.min(hy, ty), Math.max(hy, ty), zRef, z1 - 0.2);
  } else if (o.kind === 'garage') {
    const z1 = zRef + head;
    const recess = -inSign * (t / 2 - 0.15);
    B.box(key, M.garageDoor, ...rectAlong(w, o.from, o.to, recess - 0.1, recess + 0.1), zRef, z1, { collide: true });
    // window lites across the top section and panel grooves
    B.box(key, M.glass, ...rectAlong(w, o.from + 0.5, o.to - 0.5, recess - 0.14, recess - 0.12), z1 - 1.8, z1 - 0.6, { shadow: false });
    for (let k = 1; k < 4; k++) {
      B.box(key, M.black, ...rectAlong(w, o.from, o.to, recess - 0.13, recess - 0.11), zRef + (k * head) / 4 - 0.04, zRef + (k * head) / 4 + 0.04);
    }
    frame(o.from - 0.4, o.from, zRef, z1 + 0.4, M.cedar);
    frame(o.to, o.to + 0.4, zRef, z1 + 0.4, M.cedar);
    frame(o.from - 0.4, o.to + 0.4, z1, z1 + 0.5, M.cedar);
  }
}

function railing(B, M, key, w, a, b, z0) {
  const h = 3.5;
  B.box(key, M.rail, ...rectAlong(w, a, b, -0.09, 0.09), z0 + h - 0.15, z0 + h);
  B.box(key, M.rail, ...rectAlong(w, a, b, -0.05, 0.05), z0 + 0.25, z0 + 0.35);
  for (let t = a + 0.2; t < b - 0.1; t += 0.42) {
    B.box(key, M.rail, ...rectAlong(w, t - 0.03, t + 0.03, -0.03, 0.03), z0 + 0.3, z0 + h - 0.15);
  }
  B.collider(...rectAlong(w, a, b, -0.2, 0.2), z0, z0 + h);
}

// ─── floors and ceilings ─────────────────────────────────────────────────────
function slabBottom(key, room) {
  const z = floorZ(key, room);
  const cx = room.x + room.w / 2;
  const cy = room.y + room.d / 2;
  if (key === 'upper') return floors.main.floor + floors.main.ceiling;
  if (key === 'main' && inRect(MAIN_BLOCK, cx, cy)) return floors.basement.floor + floors.basement.ceiling;
  return z - 0.5;
}

function floorMaterial(M, room) {
  if (room.id === 'sim') return M.turf;
  if (room.finished === false && room.use !== 'garage' && !room.stair) return M.concrete;
  return M.floorFor(room.use);
}

function buildLevelFloors(B, M, key) {
  const floor = floors[key];
  for (const r of allRooms(floor)) {
    if (r.void || r.stair) continue;
    const z = floorZ(key, r);
    // finish flooring on top, drywall structure below (so ceilings read as ceilings)
    B.box(key, floorMaterial(M, r), r.x, r.x + r.w, r.y, r.y + r.d, z - 0.15, z);
    B.box(key, M.drywall, r.x, r.x + r.w, r.y, r.y + r.d, slabBottom(key, r), z - 0.15);
    B.surface(r.x, r.x + r.w, r.y, r.y + r.d, z, `${key}:${r.id}`);
  }
  // ceilings where no floor sits directly above
  const ceilGroup = `ceil_${key}`;
  if (key === 'upper') {
    const zc = floors.upper.floor + floors.upper.ceiling;
    for (const f of floor.footprint) B.box(ceilGroup, M.drywall, f.x, f.x + f.w, f.y, f.y + f.d, zc, zc + 0.4);
  }
  if (key === 'main') {
    for (const r of allRooms(floor)) {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.d / 2;
      if (inRect(MAIN_BLOCK, cx, cy)) continue;
      const zc = floorZ(key, r) + (r.id === 'garage' ? 10 : ceilingOf(key, r));
      B.box(ceilGroup, M.drywall, r.x, r.x + r.w, r.y, r.y + r.d, zc, zc + 0.3);
    }
  }
}

// ─── stairs ──────────────────────────────────────────────────────────────────
/** Geometry of one stacked U-stair run between two levels. */
function flight(z0, z1, risers) {
  const rise = (z1 - z0) / risers;
  const r1 = Math.ceil(risers / 2);
  const r2 = risers - r1;
  const xL = stair.x + stair.landing;
  const xs1 = xL + (r1 - 1) * stair.tread;          // first riser of the lower flight
  const xa = xL + (r2 - 1) * stair.tread;           // top riser of the upper flight
  const zl = z0 + r1 * rise;                         // landing height
  return { z0, z1, rise, r1, r2, xL, xs1, xa, zl };
}

function buildStairs(B, M) {
  const s = stair;
  const half = s.d / 2;
  const band1 = [s.y, s.y + half - 0.17];
  const band2 = [s.y + half + 0.17, s.y + s.d];
  const zB = floors.basement.floor;
  const zM = floors.main.floor;
  const zU = floors.upper.floor;
  const runs = [
    { group: 'basement', f: flight(zB, zM, s.risers.basementToMain) },
    { group: 'main', f: flight(zM, zU, s.risers.mainToUpper) },
  ];
  for (const { group, f } of runs) {
    // lower flight (band 1): climbs from the open end toward the landing
    for (let k = 1; k < f.r1; k++) {
      const top = f.z0 + k * f.rise;
      const xa0 = f.xs1 - k * s.tread;
      B.box(group, M.oak, xa0, xa0 + s.tread + 0.08, ...band1, Math.max(f.z0, top - 0.9), top);
    }
    // landing
    B.box(group, M.oak, s.x, f.xL, s.y, s.y + s.d, f.zl - 0.9, f.zl);
    // upper flight (band 2): from the landing back toward the open end
    for (let k = 1; k < f.r2; k++) {
      const top = f.zl + k * f.rise;
      const x0 = f.xL + (k - 1) * s.tread;
      B.box(group, M.oak, x0 - 0.08, x0 + s.tread, ...band2, top - 0.9, top);
    }
    // walkable ramps
    const r1 = f.rise / s.tread;
    B.surface(f.xL, f.xs1 + 0.01, ...band1, (x) => Math.min(f.zl, f.z0 + (f.xs1 + 0.5 * s.tread - x) * r1), 'stair');
    B.surface(s.x, f.xL, s.y, s.y + s.d, f.zl, 'landing');
    B.surface(f.xL, f.xa + 0.01, ...band2, (x) => Math.min(f.z1, f.zl + (x - f.xL + 0.5 * s.tread) * r1), 'stair');
  }
  const [lower, upper] = runs.map((r) => r.f);
  // floor slabs inside the stair box
  B.box('basement', M.concrete, s.x, s.x + s.w, s.y, s.y + s.d, zB - 0.5, zB);
  B.surface(lower.xs1, s.x + s.w, s.y, s.y + s.d, zB, 'stair-base');
  const zMainBottom = floors.basement.floor + floors.basement.ceiling;
  B.box('main', M.oak, upper.xs1, s.x + s.w, ...band1, zM - 0.15, zM);
  B.box('main', M.oak, lower.xa, s.x + s.w, s.y + half - 0.17, s.y + s.d, zM - 0.15, zM);
  B.box('main', M.drywall, upper.xs1, s.x + s.w, ...band1, zMainBottom, zM - 0.15);
  B.box('main', M.drywall, lower.xa, s.x + s.w, s.y + half - 0.17, s.y + s.d, zMainBottom, zM - 0.15);
  B.surface(upper.xs1, s.x + s.w, ...band1, zM, 'main:stairtop');
  B.surface(lower.xa, s.x + s.w, ...band2, zM, 'main:stairtop');
  const zUpperBottom = floors.main.floor + floors.main.ceiling;
  B.box('upper', M.oak, upper.xs1, s.x + s.w, ...band1, zU - 0.15, zU);
  B.box('upper', M.oak, upper.xa, s.x + s.w, s.y + half - 0.17, s.y + s.d, zU - 0.15, zU);
  B.box('upper', M.drywall, upper.xs1, s.x + s.w, ...band1, zUpperBottom, zU - 0.15);
  B.box('upper', M.drywall, upper.xa, s.x + s.w, s.y + half - 0.17, s.y + s.d, zUpperBottom, zU - 0.15);
  B.surface(upper.xs1, s.x + s.w, ...band1, zU, 'upper:stairtop');
  B.surface(upper.xa, s.x + s.w, ...band2, zU, 'upper:stairtop');
  // center wall between the flights
  const dx0 = s.x + s.landing;
  const dx1 = upper.xs1;
  const dy0 = s.y + half - 0.17;
  const dy1 = s.y + half + 0.17;
  B.box('basement', M.drywall, dx0, dx1, dy0, dy1, zB, zM, { collide: true });
  B.box('main', M.drywall, dx0, dx1, dy0, dy1, zM, zU, { collide: true });
  B.box('upper', M.drywall, dx0, dx1, dy0, dy1, zU, zU + 3.5, { collide: true });
  B.box('upper', M.oak, dx0, dx1, dy0 - 0.05, dy1 + 0.05, zU + 3.5, zU + 3.65);
  // guard across the stairwell at the top
  B.box('upper', M.rail, upper.xs1 - 0.1, upper.xs1 + 0.1, s.y, dy0, zU + 3.35, zU + 3.5);
  for (let y = s.y + 0.3; y < dy0; y += 0.42) B.box('upper', M.rail, upper.xs1 - 0.03, upper.xs1 + 0.03, y - 0.03, y + 0.03, zU, zU + 3.4);
  B.collider(upper.xs1 - 0.2, upper.xs1 + 0.2, s.y, dy0, zU, zU + 3.5);
  // under-stair closet wall in the basement
  B.box('basement', M.drywall, lower.xa - 0.17, lower.xa + 0.17, dy1, s.y + s.d, zB, zM - 0.9, { collide: true });
}

// ─── fireplace chimney (living room → above the roof) ───────────────────────
function buildChimney(B, M) {
  const fp = floors.main.furniture.find((f) => f.type === 'fireplace');
  if (!fp) return;
  const roof = roofById('main');
  const cy = fp.y + fp.d / 2;
  const roofAt = roof.eave + Math.min(cy - roof.y, roof.y + roof.d - cy) * (roof.pitch / 12);
  const top = roofAt + 4;
  const zU = floors.upper.floor;
  const zTop = zU + floors.upper.ceiling;
  B.box('main', M.stone, fp.x, fp.x + fp.w, fp.y, fp.y + fp.d, fp.h, zU, { collide: true });
  B.box('upper', M.stone, fp.x, fp.x + fp.w, fp.y, fp.y + fp.d, zU, zTop, { collide: true });
  B.box('roof', M.stone, fp.x - 0.4, fp.x + fp.w + 0.6, fp.y - 0.3, fp.y + fp.d + 0.3, zTop, top);
  B.box('roof', M.black, fp.x - 0.7, fp.x + fp.w + 0.9, fp.y - 0.6, fp.y + fp.d + 0.6, top, top + 0.35);
}

// ─── furniture ───────────────────────────────────────────────────────────────
function buildLevelFurniture(B, M, key) {
  const floor = floors[key];
  const rooms = allRooms(floor);
  for (const f of floor.furniture || []) {
    if (f.type === 'chimney') continue;
    const room = roomAt(rooms, f.x + f.w / 2, f.y + f.d / 2);
    const base = floorZ(key, room) + (typeof f.elev === 'number' ? f.elev : 0);
    furniture(B, M, key, f, base, room);
  }
}

// ─── labels ──────────────────────────────────────────────────────────────────
function buildLabels(key, root) {
  for (const r of floors[key].rooms) {
    if (r.stair) continue;
    const div = document.createElement('div');
    div.className = 'room-label';
    div.innerHTML = `<b>${r.name}</b>${r.void ? '' : `<span>${fmtFeet(r.w)} × ${fmtFeet(r.d)}</span>`}`;
    const obj = new CSS2DObject(div);
    obj.position.set(r.x + r.w / 2, floorZ(key, r) + (r.void ? 1 : 3.2), r.y + r.d / 2);
    root.add(obj);
  }
}
