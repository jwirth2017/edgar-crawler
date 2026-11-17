// Geometry of the L-shaped stair from the deck down to the pool deck, shared by
// the 3D model and the plans. Run 1 drops off the deck edge toward the pool
// (west, -y), a square landing, then run 2 turns south (-x) to the patio.
import { exterior, site } from '../config/house.js';

export function deckStair() {
  const d = exterior.deck;
  const st = d.stairs;
  const zTop = d.floor;
  const patio = site.terrain.walkoutGrade;
  const drop = zTop - patio;
  const n = Math.round(drop / st.riser);
  const rise = drop / n;
  const t = st.tread;
  const n1 = st.firstRun;                 // risers from the deck down to the landing
  const n2 = n - n1;                      // risers from the landing down to the patio
  const Y0 = d.y;                         // deck edge
  const x0 = st.x;
  const x1 = st.x + st.w;
  const yL1 = Y0 - (n1 - 1) * t;          // landing, deck side
  const yL0 = yL1 - st.w;                 // landing, pool side
  const xEnd = x0 - (n2 - 1) * t;         // foot of run 2
  return {
    n, n1, n2, rise, t, zTop, patio, zl: zTop - n1 * rise, Y0, x0, x1, yL0, yL1, xEnd,
    run1: { x0, x1, y0: yL1, y1: Y0 },
    landing: { x0, x1, y0: yL0, y1: yL1 },
    run2: { x0: xEnd, x1: x0, y0: yL0, y1: yL1 },
  };
}
