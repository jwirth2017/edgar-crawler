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
import { site, floors, exterior } from '../config/house.js';

const T = site.terrain;
const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const MAIN = floors.upper.footprint[0];   // main block
const WING = floors.main.footprint[1];
const PD = site.poolDeck;
const GARAGE = floors.main.rooms.find((r) => r.id === 'garage');
const BW = exterior.breezeway;

/** Areas held at main-floor level on the garage side. */
const SOUTH_HIGH = [
  ...[].concat(site.courtyard),
  { x: BW.x, y: BW.y, w: BW.w, d: BW.d },
  { x: GARAGE.x, y: GARAGE.y, w: GARAGE.w, d: GARAGE.d },
];
const distRect = (r, x, y) => Math.hypot(Math.max(r.x - x, 0, x - (r.x + r.w)), Math.max(r.y - y, 0, y - (r.y + r.d)));

/** Garage-side lawn: falls at maxSlope : 1 away from the high areas and the front yard. */
function southGrade(x, y) {
  const front = MAIN.y + MAIN.d;
  let d = Math.max(0, front - y);
  for (const r of SOUTH_HIGH) d = Math.min(d, distRect(r, x, y));
  return Math.max(T.walkoutGrade, T.courtGrade - d / T.maxSlope);
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
  // south side (garage, motor court): x left of the house
  if (x < MAIN.x) return southGrade(x, y) - fall;
  // north side, beside and beyond the wing (and the pool deck's north edge)
  if (x >= PD.x + PD.w || x >= WING.x + WING.w) {
    if (y >= T.north.highY) return front(y);
    return sidePlane(T.north.highY, y, T.frontGrade) - fall;
  }
  // between the house sides: front yard, or patio / pool deck behind
  if (y >= MAIN.y + MAIN.d - 6) return front(y);
  if (y < MAIN.y) return T.walkoutGrade - fall;
  // directly beside the wing's front (x within the wing, y between wing front and main front)
  return front(y);
}

export function grade(x, y) {
  return baseGrade(x, y) + roll(x, y);
}

/** Rectangles where the terrain is not drawn (the house sits there). */
export const terrainHoles = [
  ...floors.main.footprint,
  { x: site.pool.x, y: site.pool.y, w: site.pool.w, d: site.pool.d },
];

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
