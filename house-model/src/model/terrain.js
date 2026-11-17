// Ground height (ft, relative to the main floor) at any plan point.
// Shared by the 3D terrain mesh and the walkthrough so you walk on exactly
// the ground you see.
import { site, floors } from '../config/house.js';

const T = site.terrain;
const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// Gentle rolling that fades in away from the house and yard.
function roll(x, y) {
  const dx = Math.max(0, -60 - x, x - 95);
  const dy = Math.max(0, -95 - y, y - 55);
  const fade = smooth(10, 60, Math.hypot(dx, dy));
  const r = Math.sin(x * 0.031 + 0.7) * Math.cos(y * 0.023 - 0.4) + 0.5 * Math.sin((x + y) * 0.052);
  return T.rollAmplitude * fade * r;
}

// East-west profile: high at the street, falling to the walkout level at the
// rear wall, flat across the pool deck, then falling away to the west.
function profile(y) {
  const pd = site.poolDeck;
  if (y >= T.slopeFrontY) return T.frontGrade + (y - T.slopeFrontY - 8) * 0.008;
  if (y >= T.slopeRearY) {
    return T.walkoutGrade + (T.frontGrade - T.walkoutGrade) * smooth(T.slopeRearY, T.slopeFrontY, y);
  }
  if (y >= pd.y) return T.walkoutGrade;
  return T.walkoutGrade - (pd.y - y) * T.westFall;
}

const court = site.courtyard;
const rw = site.retainingWall;

/** Upper terrace on the garage side (x < 0): driveway, garage pad and motor court. */
function terrace(x, y) {
  if (x >= 0) return -Infinity;
  if (y >= court.y) return T.courtyardGrade + Math.max(0, y - 48) * 0.008;
  // past the retaining wall the terrace only exists beyond its end, as an embankment
  if (x < court.x) return T.courtyardGrade - (court.y - y) * 0.6;
  return -Infinity;
}

export function grade(x, y) {
  const base = profile(y) + roll(x, y);
  const t = terrace(x, y);
  if (t === -Infinity) return base;
  // blend the terrace back into natural grade far to the south
  const fadeOut = smooth(-95, -70, x);
  return Math.max(base, base + (t - base) * fadeOut);
}

/** Rectangles where the terrain is not drawn (the house sits there). */
export const terrainHoles = [
  ...floors.main.footprint,
  { x: site.pool.x, y: site.pool.y, w: site.pool.w, d: site.pool.d },
];

export const retainingWallTop = rw.top;
