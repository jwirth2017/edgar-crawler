// Ground height (ft, relative to the main floor) at any plan point.
// Shared by the 3D terrain mesh and the walkthrough so you walk on exactly
// the ground you see.
//
// Front yard and motor court sit at main-floor level. Each side yard is a
// smooth lawn plane falling toward the rear at no more than `maxSlope` : 1
// until it reaches the walkout patio level. Behind the house the pool deck
// and patio are flat at the walkout level, then the lot falls away west.
import { site, floors } from '../config/house.js';

const T = site.terrain;
const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const MAIN = floors.upper.footprint[0];   // main block
const WING = floors.main.footprint[1];
const PD = site.poolDeck;

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
  if (x < MAIN.x) {
    if (y >= T.south.highY) return Math.max(T.courtGrade, front(y) - 0.5);
    return sidePlane(T.south.highY, y, T.courtGrade) - fall;
  }
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
  const y0 = T.south.highY - (T.courtGrade - T.walkoutGrade) * T.maxSlope;
  return { x, y0: Math.min(y0, y1), y1, heightAt: (y) => sidePlane(T.south.highY, y, T.courtGrade) - T.walkoutGrade };
}
