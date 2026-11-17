// Roofs: gable, cross gable, shed (porch) and hip (deck cover), as thin metal
// slabs with seam-aligned UVs, plus gable-end siding and cedar timbers.
import * as THREE from 'three';
import { floors, exterior, site } from '../config/house.js';
import { W } from './builder.js';

const ROOF_T = 0.35;

/** Planar polygon (3–4 points, plan coords [x, y, z]) as a slab: metal top, black underside + edges. */
export function slabPoly(B, group, topMat, edgeMat, pts, t = ROOF_T) {
  let P = pts.map(([x, y, z]) => W(x, y, z));
  let n = new THREE.Vector3().subVectors(P[1], P[0]).cross(new THREE.Vector3().subVectors(P[2], P[0])).normalize();
  if (n.y < 0) { P = P.reverse(); n.negate(); }
  const e1 = new THREE.Vector3().subVectors(P[1], P[0]).normalize();
  const e2 = new THREE.Vector3().crossVectors(n, e1).normalize();
  const Q = P.map((p) => p.clone().addScaledVector(n, -t));
  const tris = (pp) => (pp.length === 3 ? [[0, 1, 2]] : [[0, 1, 2], [0, 2, 3]]);
  const mk = (verts, normal, uvFn) => {
    const pos = [];
    const nor = [];
    const uv = [];
    for (const v of verts) {
      pos.push(v.x, v.y, v.z);
      nor.push(normal.x, normal.y, normal.z);
      const [u, w] = uvFn(v);
      uv.push(u, w);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return g;
  };
  const planeUV = (v) => [v.clone().sub(P[0]).dot(e1), v.clone().sub(P[0]).dot(e2)];
  const top = [];
  for (const [a, b, c] of tris(P)) top.push(P[a], P[b], P[c]);
  B.geom(group, topMat, mk(top, n, planeUV));
  const bot = [];
  for (const [a, b, c] of tris(Q)) bot.push(Q[a], Q[c], Q[b]);
  B.geom(group, edgeMat, mk(bot, n.clone().negate(), planeUV));
  for (let i = 0; i < P.length; i++) {
    const j = (i + 1) % P.length;
    const en = new THREE.Vector3().subVectors(P[j], P[i]).cross(n).normalize();
    B.geom(group, edgeMat, mk([P[i], Q[i], Q[j], P[i], Q[j], P[j]], en, (v) => [v.x + v.z, v.y]));
  }
}

/** Triangle of wall (gable end) extruded `t` thick, in the plane x = at or y = at. */
function gableTriangle(B, group, mat, axis, at, a0, a1, zBase, zApex, t = 0.5) {
  // shape lies in local XY (x = along the wall, y = elevation), extruded along +Z.
  // For a wall on x = at, the along-wall coordinate is negated so that a
  // +90° turn about Y maps it onto plan y without mirroring the faces.
  const sgn = axis === 'y' ? 1 : -1;
  const shape = new THREE.Shape();
  shape.moveTo(sgn * a0, zBase);
  shape.lineTo(sgn * a1, zBase);
  shape.lineTo(sgn * (a0 + a1) / 2, zApex);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false });
  if (axis === 'y') {
    g.translate(0, 0, at - t / 2);            // world Z = plan y
  } else {
    g.rotateY(Math.PI / 2);                   // local z → world X, local -x → world Z
    g.translate(at - t / 2, 0, 0);
  }
  B.geom(group, mat, g);
}

const FOOTPRINTS = () => {
  const bw = exterior.breezeway;
  const g = floors.main.rooms.find((r) => r.id === 'garage');
  return {
    main: floors.upper.footprint[0],
    wing: floors.main.footprint[1],
    garage: g,
    breezeway: { x: bw.x, y: bw.y, w: bw.w, d: bw.d },
  };
};

/** True if the edge of rect `id` on `side` touches another building. */
function abuts(id, r, side) {
  if (id === 'main') return false;
  const others = Object.entries(FOOTPRINTS()).filter(([k]) => k !== id).map(([, v]) => v);
  const E = 1e-6;
  return others.some((o) => {
    if (side === 'x0') return Math.abs(o.x + o.w - r.x) < E && o.y < r.y + r.d && o.y + o.d > r.y;
    if (side === 'x1') return Math.abs(o.x - (r.x + r.w)) < E && o.y < r.y + r.d && o.y + o.d > r.y;
    if (side === 'y0') return Math.abs(o.y + o.d - r.y) < E && o.x < r.x + r.w && o.x + o.w > r.x;
    return Math.abs(o.y - (r.y + r.d)) < E && o.x < r.x + r.w && o.x + o.w > r.x;
  });
}

function cedarTruss(B, M, axis, at, outSign, a0, a1, zBase, zApex, group = 'roof') {
  // collar tie + king post just proud of the gable face, knee braces at the eaves
  const span = a1 - a0;
  const slope = (zApex - zBase) / (span / 2);
  const zc = zBase + (zApex - zBase) * 0.42;
  const wAt = span - (2 * (zc - zBase)) / slope;
  const mid = (a0 + a1) / 2;
  const o0 = at + outSign * 0.3;
  const o1 = at + outSign * 0.75;
  const R = (lo, hi) => (axis === 'y' ? [lo, hi, Math.min(o0, o1), Math.max(o0, o1)] : [Math.min(o0, o1), Math.max(o0, o1), lo, hi]);
  B.box(group, M.cedar, ...R(mid - wAt / 2 + 0.4, mid + wAt / 2 - 0.4), zc - 0.25, zc + 0.25);
  B.box(group, M.cedar, ...R(mid - 0.25, mid + 0.25), zc, zApex - 0.9);
  for (const dir of [-1, 1]) {
    const ex = mid + dir * (span / 2 - 0.9);
    const m = new THREE.Matrix4();
    const ang = dir * Math.PI / 4;
    const pos = axis === 'y' ? W(ex, (o0 + o1) / 2, zBase - 0.9) : W((o0 + o1) / 2, ex, zBase - 0.9);
    if (axis === 'y') m.makeRotationZ(ang); else m.makeRotationX(-ang);
    m.setPosition(pos);
    B.boxM(group, M.cedar, axis === 'y' ? 2.6 : 0.4, 0.4, axis === 'y' ? 0.4 : 2.6, m);
  }
}

export function gableRoof(B, M, r, notch = null, group = 'roof') {
  const s = r.pitch / 12;
  const o = (side) => (abuts(r.id, r, side) ? 0 : r.overhang);
  const along = r.ridge;                         // 'x' or 'y'
  const [a0, a1, b0, b1] = along === 'x' ? [r.x, r.x + r.w, r.y, r.y + r.d] : [r.y, r.y + r.d, r.x, r.x + r.w];
  const [oa0, oa1, ob0, ob1] = along === 'x' ? [o('x0'), o('x1'), o('y0'), o('y1')] : [o('y0'), o('y1'), o('x0'), o('x1')];
  const half = (b1 - b0) / 2;
  const bm = b0 + half;
  const zr = r.eave + half * s;
  const P = (a, b, z) => (along === 'x' ? [a, b, z] : [b, a, z]);
  // A cross gable (`notch` = its span along the ridge) interrupts the eaves:
  // there the plane starts at the wall line instead of the overhang, so the
  // gable wall runs down uninterrupted.
  const spans = notch ? [[a0 - oa0, notch[0], true], [notch[0], notch[1], false], [notch[1], a1 + oa1, true]] : [[a0 - oa0, a1 + oa1, true]];
  for (const [sa, sb, over] of spans) {
    const e0 = over ? ob0 : 0;
    const e1 = over ? ob1 : 0;
    slabPoly(B, group, M.roof, M.black, [P(sa, b0 - e0, r.eave - e0 * s), P(sb, b0 - e0, r.eave - e0 * s), P(sb, bm, zr), P(sa, bm, zr)]);
    slabPoly(B, group, M.roof, M.black, [P(sb, b1 + e1, r.eave - e1 * s), P(sa, b1 + e1, r.eave - e1 * s), P(sa, bm, zr), P(sb, bm, zr)]);
  }
  // ridge cap
  const cap = along === 'x' ? [a0 - oa0, a1 + oa1, bm - 0.35, bm + 0.35] : [bm - 0.35, bm + 0.35, a0 - oa0, a1 + oa1];
  B.box(group, M.black, ...cap, zr - 0.1, zr + 0.18);
  // gable-end walls
  if (r.id !== 'breezeway') {
    for (const end of [a0, a1]) gableTriangle(B, group, M.siding, along === 'x' ? 'x' : 'y', end, b0, b1, r.eave - 0.05, zr - 0.05);
  }
  return { a0, a1, b0, b1, zr, along };
}

/** Pool house roof (Phase 2): gable over building + porch, cedar truss at the porch end. */
export function buildPoolHouseRoof(B, M, ph, group) {
  const r = ph.roof;
  const g = gableRoof(B, M, r, null, group);
  cedarTruss(B, M, 'y', g.a1, 1, g.b0, g.b1, r.eave, g.zr, group);
  // vaulted tongue-and-groove ceiling inside the enclosed part
  const s = r.pitch / 12;
  const zv = r.eave - 0.45;
  const xm = r.x + r.w / 2;
  const zr = zv + (r.w / 2) * s;
  const f = ph.footprint[0];
  slabPoly(B, group, M.cedar, M.cedar, [[f.x, f.y, zv], [f.x, f.y + f.d, zv], [xm, f.y + f.d, zr], [xm, f.y, zr]], 0.08);
  slabPoly(B, group, M.cedar, M.cedar, [[f.x + f.w, f.y + f.d, zv], [f.x + f.w, f.y, zv], [xm, f.y, zr], [xm, f.y + f.d, zr]], 0.08);
}

export function buildRoofs(B, M) {
  for (const r of exterior.roofs) {
    if (r.type === 'gable') {
      const cross = exterior.roofs.find((c) => c.type === 'crossGable');
      const notch = r.id === 'main' && cross ? [cross.centerX - cross.width / 2, cross.centerX + cross.width / 2] : null;
      const g = gableRoof(B, M, r, notch);
      if (r.id === 'wing') cedarTruss(B, M, 'y', g.a1, 1, g.b0, g.b1, r.eave, g.zr);
      if (r.id === 'breezeway') for (const [end, sign] of [[g.a0, -1], [g.a1, 1]]) cedarTruss(B, M, 'y', end, sign, g.b0, g.b1, r.eave, g.zr);
    } else if (r.type === 'crossGable') {
      const main = floors.upper.footprint[0];
      const s = r.pitch / 12;
      const x0 = r.centerX - r.width / 2;
      const x1 = r.centerX + r.width / 2;
      const zr = r.eave + (r.width / 2) * s;
      const y0 = main.y - r.overhang;
      const y1 = main.y + main.d + r.overhang;
      const oh = r.overhang;
      slabPoly(B, 'roof', M.roof, M.black, [[x0 - oh, y1, r.eave - oh * s], [x0 - oh, y0, r.eave - oh * s], [r.centerX, y0, zr], [r.centerX, y1, zr]]);
      slabPoly(B, 'roof', M.roof, M.black, [[x1 + oh, y0, r.eave - oh * s], [x1 + oh, y1, r.eave - oh * s], [r.centerX, y1, zr], [r.centerX, y0, zr]]);
      B.box('roof', M.black, r.centerX - 0.35, r.centerX + 0.35, y0, y1, zr - 0.1, zr + 0.18);
      for (const [end, sign] of [[main.y, -1], [main.y + main.d, 1]]) {
        gableTriangle(B, 'roof', M.siding, 'y', end, x0, x1, r.eave - 0.05, zr - 0.05);
        cedarTruss(B, M, 'y', end, sign, x0, x1, r.eave, zr);
      }
    }
  }
  porchRoof(B, M);
  deckCover(B, M);
}

function porchRoof(B, M) {
  const p = exterior.porch;
  const oh = 1;
  const slope = (p.roofHigh - p.roofLow) / p.d;
  const yHi = p.y;
  const yLo = p.y + p.d + oh;
  const zLo = p.roofHigh - slope * (yLo - yHi);
  slabPoly(B, 'roof', M.roof, M.black, [[p.x - oh, yHi, p.roofHigh], [p.x + p.w + oh, yHi, p.roofHigh], [p.x + p.w + oh, yLo, zLo], [p.x - oh, yLo, zLo]]);
  // cedar ceiling under the porch roof
  slabPoly(B, 'roof', M.cedar, M.cedar, [[p.x, yHi, p.roofHigh - 0.5], [p.x + p.w, yHi, p.roofHigh - 0.5], [p.x + p.w, p.y + p.d, p.roofLow - 0.5], [p.x, p.y + p.d, p.roofLow - 0.5]], 0.1);
}

/** Hip roof over the covered part of the deck, tucked against the rear wall. */
function deckCover(B, M) {
  const c = exterior.deck.cover;
  if (!c) return;
  const oh = 1;
  const x0 = c.x - oh;
  const x1 = c.x + c.w + oh;
  const y0 = c.y - oh;
  const y1 = c.y + c.d;                    // the rear wall
  const E = exterior.deck.floor + c.eave - oh * (c.pitch / 12);
  const s = c.pitch / 12;
  const hd = (x1 - x0) / 2;
  const zr = E + Math.min(hd, y1 - y0) * s;
  const xm = (x0 + x1) / 2;
  const yr = y0 + (zr - E) / s;            // where the side slopes meet the ridge
  slabPoly(B, 'roof', M.roof, M.black, [[x0, y0, E], [x1, y0, E], [xm, yr, zr]]);
  slabPoly(B, 'roof', M.roof, M.black, [[x0, y1, E + (y1 - y0) * 0], [x0, y0, E], [xm, yr, zr], [xm, y1, zr]]);
  slabPoly(B, 'roof', M.roof, M.black, [[x1, y0, E], [x1, y1, E], [xm, y1, zr], [xm, yr, zr]]);
  // cedar ceiling under it
  B.box('roof', M.cedar, c.x, c.x + c.w, c.y, y1, E + 0.6, E + 0.7);
}

