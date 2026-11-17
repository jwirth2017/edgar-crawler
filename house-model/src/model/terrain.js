// Ground height (ft, relative to the main floor) at any plan point.
// Shared by the 3D terrain mesh and the walkthrough so you walk on exactly
// the ground you see.
//
// Front yard, motor court, breezeway and garage sit at main-floor level.
// On the garage side the lawn falls away from those at no more than
// `maxSlope` : 1 (measured as distance from their edges) until it reaches the
// walkout patio level. On the wing side the lawn is a plane falling toward the
// rear. Behind the house the pool deck and patio are flat at the walkout
// level, then the lot falls away west.
import { site, floors, exterior, phases, garageFrame, garageLink } from '../config/house.js';

const T = site.terrain;
const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const MAIN = floors.upper.footprint[0];   // main block
const WING = floors.main.footprint[1];
const PD = site.poolDeck;
const GF = exterior.garage.footprint[0];
const GARAGE = { poly: [[GF.x, GF.y], [GF.x + GF.w, GF.y], [GF.x + GF.w, GF.y + GF.d], [GF.x, GF.y + GF.d]].map(garageFrame().toWorld) };
const BW = exterior.breezeway;

/** Areas held at main-floor level on the garage side. */
const SOUTH_HIGH = [
  ...[].concat(site.courtyard),
  { x: BW.x, y: BW.y, w: BW.w, d: BW.d },
  GARAGE,
  { poly: garageLink().poly },
];
const distBox = (r, x, y) => Math.hypot(Math.max(r.x - x, 0, x - (r.x + r.w)), Math.max(r.y - y, 0, y - (r.y + r.d)));
/** Distance from (x, y) to a convex polygon (0 inside). */
function distPoly(P, x, y) {
  let inside = true;
  let best = Infinity;
  for (let i = 0; i < P.length; i++) {
    const [ax, ay] = P[i];
    const [bx, by] = P[(i + 1) % P.length];
    const ex = bx - ax;
    const ey = by - ay;
    if (ex * (y - ay) - ey * (x - ax) > 0) inside = false;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey)));
    best = Math.min(best, Math.hypot(x - ax - t * ex, y - ay - t * ey));
  }
  if (!inside) {
    // try the other winding (polygons may be given either way round)
    inside = true;
    for (let i = 0; i < P.length; i++) {
      const [ax, ay] = P[i];
      const [bx, by] = P[(i + 1) % P.length];
      if ((bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0) inside = false;
    }
  }
  return inside ? 0 : best;
}
const distRect = (r, x, y) => (r.poly ? distPoly(r.poly, x, y) : distBox(r, x, y));

/** The walkout-level yard beside the house (patio, paver grid, pool deck): x ≥ 0, y ≤ 0. */
const LOW = { x: MAIN.x, y: PD.y, w: PD.w, d: -PD.y };

/**
 * Garage-side lawn, graded with no retaining walls: falls at maxSlope : 1 away
 * from the high areas (court, drive, breezeway, garage, front yard), and where
 * those sit close to the walkout-level yard it blends evenly between the two,
 * so the ground meets the patio level at the house's edge.
 */
function southGrade(x, y) {
  const front = MAIN.y + MAIN.d;
  let dHigh = Math.max(0, front - y);
  for (const r of SOUTH_HIGH) dHigh = Math.min(dHigh, distRect(r, x, y));
  const dLow = distRect(LOW, x, y);
  const fall = T.courtGrade - dHigh / T.maxSlope;
  const blend = T.walkoutGrade + (T.courtGrade - T.walkoutGrade) * (dLow / Math.max(1e-6, dLow + dHigh));
  return Math.max(T.walkoutGrade, Math.min(fall, blend));
}

// Gentle rolling that fades in well away from the house and yard.
function roll(x, y) {
  const dx = Math.max(0, -75 - x, x - 110);
  const dy = Math.max(0, -100 - y, y - 80);
  const fade = smooth(10, 60, Math.hypot(dx, dy));
  const r = Math.sin(x * 0.031 + 0.7) * Math.cos(y * 0.023 - 0.4) + 0.5 * Math.sin((x + y) * 0.052);
  return T.rollAmplitude * fade * r;
}

/** Side-yard lawn plane: main-floor level forward of `highY`, then down at maxSlope : 1. */
function sidePlane(highY, y, top) {
  const z = top - Math.max(0, highY - y) / T.maxSlope;
  return Math.max(T.walkoutGrade, z);
}

/** Continued fall to the west beyond the pool deck. */
function westFall(y) {
  return y < PD.y ? (PD.y - y) * T.westFall : 0;
}

function baseGrade(x, y) {
  const fall = westFall(y);
  const front = (yy) => T.frontGrade + Math.max(0, yy - 60) * 0.006;
  // south side (garage, motor court). The x = 0 line itself belongs to the
  // south lawn beside the house, but to the patio behind it (so the patio
  // edge sits under the low wall, not out on the patio).
  if (x < MAIN.x || (x <= MAIN.x && y >= MAIN.y)) return southGrade(x, y) - fall;
  // north side, beside and beyond the wing (and the pool deck's north edge)
  if (x >= PD.x + PD.w || x >= WING.x + WING.w) {
    if (y >= T.north.highY) return front(y);
    return sidePlane(T.north.highY, y, T.frontGrade) - fall;
  }
  // between the house sides. Rows on or behind the rear wall are patio /
  // yard at the walkout level; under the house (hidden) also walkout level so
  // nothing pokes up in front of the basement walls; front yard from the
  // front wall forward.
  const frontLine = x < WING.x ? MAIN.y + MAIN.d : WING.y + WING.d;
  if (y >= frontLine) return front(y);
  return T.walkoutGrade - fall;
}

export function grade(x, y) {
  return baseGrade(x, y) + roll(x, y);
}

/** Rectangles where the terrain is not drawn (the house sits there). */
export const terrainHoles = [...floors.main.footprint];
/** The Phase 2 pool basin (the terrain is cut away there only in Phase 2). */
export const poolHole = (() => { const p = phases[2].pool; return { x: p.x, y: p.y, w: p.w, d: p.d }; })();

/**
 * The low stone wall at the patio's south edge: where the south lawn plane is
 * still above the patio, between the house corner and the point the lawn
 * reaches patio level. Returns { x, y0, y1, heightAt(y) }.
 */
export function patioEdgeWall() {
  const x = MAIN.x;
  const y1 = MAIN.y;
  const heightAt = (y) => southGrade(x - 1e-3, y) - T.walkoutGrade;
  let y0 = y1;
  while (y0 > y1 - 80 && heightAt(y0 - 0.25) > 0.02) y0 -= 0.25;
  return { x, y0, y1, heightAt };
}
