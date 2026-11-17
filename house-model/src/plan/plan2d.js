// Top-down SVG plan, drawn straight from the config. Front of the house is at
// the bottom of the page; the rear (west, pool side) is at the top.
import { floors, exterior, site, build, stair, phases } from '../config/house.js';
import { deriveWalls, solidSpans, allRooms, roomAt, fmtFeet } from '../model/layout.js';
import { patioEdgeWall } from '../model/terrain.js';

const FILL = {
  living: '#f3ead7', bed: '#e3ebf3', bath: '#dcefe9', service: '#ecebe6',
  circ: '#f8f6f1', work: '#ece4f1', rec: '#f4e3d6', garage: '#e6e6e3', void: 'none',
};
const INK = '#1d1d1b';
const GLASS = '#2f7fb8';
const FURN = '#8d8a80';

const Y = (v) => v; // plan y grows toward the front = down the page
const n = (v) => +v.toFixed(3);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function rect(x, y, w, d, attrs = '') {
  return `<rect x="${n(x)}" y="${n(Math.min(Y(y), Y(y + d)))}" width="${n(w)}" height="${n(d)}" ${attrs}/>`;
}
function line(x1, y1, x2, y2, attrs = '') {
  return `<line x1="${n(x1)}" y1="${n(Y(y1))}" x2="${n(x2)}" y2="${n(Y(y2))}" ${attrs}/>`;
}
function text(x, y, str, size, attrs = '') {
  return `<text x="${n(x)}" y="${n(Y(y))}" font-size="${n(size)}" ${attrs}>${esc(str)}</text>`;
}
// point on a wall: `t` along the wall, `off` perpendicular to it
const wp = (w, t, off = 0) => (w.axis === 'y' ? [t, w.at + off] : [w.at + off, t]);

function drawWall(w) {
  const sw = w.kind === 'exterior' ? build.exteriorWall + 0.25 : build.interiorWall;
  let s = '';
  for (const [a, b] of solidSpans(w)) {
    const [x1, y1] = wp(w, a);
    const [x2, y2] = wp(w, b);
    s += line(x1, y1, x2, y2, `stroke="${INK}" stroke-width="${sw}" stroke-linecap="square"`);
  }
  for (const o of w.openings) s += drawOpening(w, o, sw);
  return s;
}

function drawOpening(w, o, sw) {
  const [x1, y1] = wp(w, o.from);
  const [x2, y2] = wp(w, o.to);
  const width = o.to - o.from;
  const thin = `stroke-width="0.12" fill="none"`;
  switch (o.kind) {
    case 'window':
    case 'passthrough':
    case 'glassdoor': {
      const heavy = o.kind === 'glassdoor' ? 0.3 : 0.18;
      let s = line(x1, y1, x2, y2, `stroke="#fff" stroke-width="${sw}"`);
      s += line(x1, y1, x2, y2, `stroke="${GLASS}" stroke-width="${heavy}"`);
      for (const t of [o.from, o.to]) {
        const [ax, ay] = wp(w, t, -sw / 2);
        const [bx, by] = wp(w, t, sw / 2);
        s += line(ax, ay, bx, by, `stroke="${INK}" stroke-width="0.15"`);
      }
      if (o.kind === 'passthrough') {
        // counter sill on both sides
        const [ax, ay] = wp(w, o.from, -1.8);
        const [bx, by] = wp(w, o.to, 0.3);
        s += rect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay),
          `fill="none" stroke="${GLASS}" stroke-width="0.1" stroke-dasharray="0.4 0.3"`);
      }
      return s;
    }
    case 'garage':
      return line(x1, y1, x2, y2, `stroke="${INK}" stroke-width="0.2" stroke-dasharray="0.8 0.5"`);
    case 'railing':
      return line(x1, y1, x2, y2, `stroke="${INK}" stroke-width="0.14" stroke-dasharray="0.25 0.35"`);
    case 'opening':
      return line(x1, y1, x2, y2, `stroke="${INK}" stroke-width="0.08" stroke-dasharray="0.3 0.3"`);
    case 'door':
    case 'entry': {
      const dir = o.swing === -1 ? -1 : 1;
      const leaves = width > 4 ? [[o.from, 1, width / 2], [o.to, -1, width / 2]] : [[o.from, 1, width]];
      let s = '';
      for (const [hinge, along, r] of leaves) {
        const [hx, hy] = wp(w, hinge);
        const [tx, ty] = wp(w, hinge, dir * r);          // open leaf tip
        const [ex, ey] = wp(w, hinge + along * r);       // closed position
        const cross = (tx - hx) * (Y(ey) - Y(hy)) - (Y(ty) - Y(hy)) * (ex - hx);
        s += line(hx, hy, tx, ty, `stroke="${INK}" stroke-width="${o.kind === 'entry' ? 0.3 : 0.18}"`);
        s += `<path d="M${n(tx)},${n(Y(ty))} A${n(r)},${n(r)} 0 0 ${cross > 0 ? 1 : 0} ${n(ex)},${n(Y(ey))}" stroke="${INK}" ${thin} stroke-dasharray="0.2 0.2"/>`;
      }
      return s;
    }
    default:
      return '';
  }
}

// U-stair: two flights side by side (split across y), mid landing at the x0
// end, both flights start/finish at the open x1 end.
function drawStair(r, levelKey) {
  const half = r.d / 2;
  const land = stair.landing;
  let s = rect(r.x, r.y, r.w, r.d, `fill="${FILL.circ}"`);
  s += rect(r.x, r.y, land, r.d, `fill="#efece4" stroke="${FURN}" stroke-width="0.07"`);
  s += line(r.x + land, r.y + half, r.x + r.w - 0.5, r.y + half, `stroke="${INK}" stroke-width="0.2"`);
  const flights = (risers) => [Math.ceil(risers / 2) - 1, Math.floor(risers / 2) - 1]; // treads per flight
  const drawFlight = (treads, y0) => {
    let t = '';
    for (let i = 0; i <= treads; i++) {
      const xx = r.x + land + i * stair.tread;
      t += line(xx, y0, xx, y0 + half, `stroke="${FURN}" stroke-width="0.07"`);
    }
    return t;
  };
  const up = levelKey !== 'upper' ? (levelKey === 'main' ? stair.risers.mainToUpper : stair.risers.basementToMain) : stair.risers.mainToUpper;
  const [f1, f2] = flights(up);
  s += drawFlight(f1, r.y) + drawFlight(f2, r.y + half);
  const a = `text-anchor="middle" dominant-baseline="central" fill="${INK}" class="halo"`;
  const ax = r.x + r.w - 1.2;
  if (levelKey === 'upper') {
    s += text(ax, r.y + half * 1.5, 'DN', 0.8, a);
  } else {
    s += text(ax, r.y + half / 2, 'UP', 0.8, a);
    if (levelKey === 'main') s += text(ax, r.y + half * 1.5, 'DN', 0.8, a);
  }
  s += text(r.x + land / 2, r.y + half, 'landing', 0.6, `${a} fill="#77746b" transform="rotate(-90 ${n(r.x + land / 2)} ${n(r.y + half)})"`);
  return s;
}

function drawFurniture(list = [], rooms = []) {
  let s = '';
  for (const f of list) {
    const strong = ['screen', 'mat', 'island', 'bed', 'car', 'hanging'].includes(f.type);
    // Phase 2 furniture is drawn dashed blue, like the other Phase 2 items
    const stroke = f.phase === 2 ? `stroke="#2f7fb8" stroke-dasharray="0.4 0.3"` : `stroke="${FURN}"`;
    s += rect(f.x, f.y, f.w, f.d,
      `fill="${f.type === 'mat' ? '#cfe3c4' : '#ffffff'}" fill-opacity="0.7" ${stroke} stroke-width="${strong ? 0.14 : 0.09}" rx="0.15"`);
    if (f.type === 'bed') {
      // pillow end = the end against the nearest wall is unknown here; just mark a band
      // pillow band at whichever end of the bed sits against a room wall
      const r = roomAt(rooms, f.x + f.w / 2, f.y + f.d / 2) || f;
      const st = `stroke="${FURN}" stroke-width="0.07"`;
      if (f.w > f.d) {
        const xx = Math.abs(f.x - r.x) < Math.abs(r.x + r.w - f.x - f.w) ? f.x + 1.6 : f.x + f.w - 1.6;
        s += line(xx, f.y, xx, f.y + f.d, st);
      } else {
        const yy = Math.abs(f.y - r.y) < Math.abs(r.y + r.d - f.y - f.d) ? f.y + 1.6 : f.y + f.d - 1.6;
        s += line(f.x, yy, f.x + f.w, yy, st);
      }
    }
    if (f.rods) {
      const st = `stroke="${FURN}" stroke-width="0.06" stroke-dasharray="0.3 0.2"`;
      for (const k of [0.35, 0.65]) {
        s += f.d > f.w ? line(f.x + f.w * k, f.y, f.x + f.w * k, f.y + f.d, st) : line(f.x, f.y + f.d * k, f.x + f.w, f.y + f.d * k, st);
      }
    }
    if (f.seats) {
      for (let i = 1; i < f.seats; i++) {
        const xx = f.x + (f.w * i) / f.seats;
        s += line(xx, f.y, xx, f.y + f.d, `stroke="${FURN}" stroke-width="0.07"`);
      }
    }
    if (f.label) {
      const fs = Math.min(0.75, (Math.max(f.w, f.d) - 0.3) / (f.label.length * 0.55));
      const rot = f.d > f.w * 1.3;
      const cx = f.x + f.w / 2;
      const cy = f.y + f.d / 2;
      const outside = Math.min(f.w, f.d) < 1;
      const [lx, ly] = outside ? (f.w > f.d ? [cx, cy + 1.1] : [cx + 1.1, cy]) : [cx, cy];
      s += text(lx, ly, f.label, Math.max(fs, 0.5),
        `text-anchor="middle" dominant-baseline="central" fill="#6b685f" ${rot ? `transform="rotate(-90 ${n(lx)} ${n(Y(ly))})"` : ''}`);
    }
  }
  return s;
}

function roomLabel(r) {
  if (r.stair || r.hall) return '';
  const lines = [r.name];
  if (!r.void) lines.push(`${fmtFeet(r.w)} × ${fmtFeet(r.d)}`);
  if (r.note) lines.push(r.note);
  const longest = Math.max(...lines.map((l, i) => l.length * (i ? 0.8 : 1)));
  const fit = (span) => (span - 0.8) / (0.56 * longest);
  let rot = false;
  let fs = fit(r.w);
  if (fs < 0.8 && r.d > r.w) { rot = true; fs = fit(r.d); }
  fs = Math.max(0.55, Math.min(1.25, fs));
  const cx = r.x + r.w / 2 + (r.labelDx || 0);
  const cy = r.y + r.d / 2 + (r.labelDy || 0);
  const lh = fs * 1.15;
  let s = '';
  lines.forEach((l, i) => {
    const off = (i - (lines.length - 1) / 2) * lh;
    const size = i ? fs * 0.78 : fs;
    const attrs = `text-anchor="middle" dominant-baseline="central" fill="${i ? '#55534d' : INK}" ${i ? '' : 'font-weight="650"'} class="halo"`;
    s += rot
      ? `<text x="${n(cx + off)}" y="${n(Y(cy))}" font-size="${n(size)}" ${attrs} transform="rotate(-90 ${n(cx + off)} ${n(Y(cy))})">${esc(l)}</text>`
      : `<text x="${n(cx)}" y="${n(Y(cy) + off)}" font-size="${n(size)}" ${attrs}>${esc(l)}</text>`;
  });
  return s;
}

function dimLine(x1, y1, x2, y2, label, side = 1) {
  const horiz = y1 === y2;
  const tick = 0.6;
  let s = line(x1, y1, x2, y2, `stroke="#77746b" stroke-width="0.08"`);
  for (const [x, y] of [[x1, y1], [x2, y2]]) {
    s += horiz
      ? line(x, y - tick, x, y + tick, `stroke="#77746b" stroke-width="0.08"`)
      : line(x - tick, y, x + tick, y, `stroke="#77746b" stroke-width="0.08"`);
  }
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  s += horiz
    ? text(mx, my + side * 1.3, label, 1, `text-anchor="middle" dominant-baseline="central" fill="#55534d"`)
    : `<text x="${n(mx - side * 1.3)}" y="${n(Y(my))}" font-size="1" text-anchor="middle" dominant-baseline="central" fill="#55534d" transform="rotate(-90 ${n(mx - side * 1.3)} ${n(Y(my))})">${esc(label)}</text>`;
  return s;
}

function compass(x, y) {
  // front faces east → east is down the page, north is to the right
  return `<g transform="translate(${n(x)} ${n(Y(y))})" font-size="1" fill="${INK}" text-anchor="middle">
    <circle r="2.6" fill="#fff" stroke="${INK}" stroke-width="0.1"/>
    <path d="M-1.6,0 L1.9,0 M1.9,0 l-1,-0.6 M1.9,0 l-1,0.6" stroke="${INK}" stroke-width="0.18" fill="none"/>
    <text x="3.6" y="0.35" font-weight="700">N</text>
    <text x="0" y="-3.1" fill="#77746b">W · rear</text>
    <text x="0" y="3.9" fill="#77746b">E · street</text>
  </g>`;
}

function scaleBar(x, y) {
  let s = '';
  for (let i = 0; i < 4; i++) s += rect(x + i * 5, y, 5, 0.5, `fill="${i % 2 ? '#fff' : INK}" stroke="${INK}" stroke-width="0.06"`);
  for (const v of [0, 10, 20]) s += text(x + v, y - 1.3, `${v}'`, 0.9, `text-anchor="middle" fill="#55534d"`);
  return s;
}

function mainFootprintGhost() {
  return floors.main.footprint.map((f) => rect(f.x, f.y, f.w, f.d,
    `fill="none" stroke="#b9b6ab" stroke-width="0.12" stroke-dasharray="0.6 0.5"`)).join('');
}

const MB = floors.main.footprint[0];          // main block
const WG = floors.main.footprint[1];          // primary wing
const MID = MB.x + MB.w / 2;
const WCX = WG.x + WG.w / 2;
const WCY = WG.y + WG.d / 2;

function wrap(body, [x0, y0, x1, y1]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(x0)} ${n(y0)} ${n(x1 - x0)} ${n(y1 - y0)}" font-family="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif">
  <style>.halo{paint-order:stroke;stroke:#fff;stroke-opacity:.82;stroke-width:.32px;stroke-linejoin:round}</style>
  ${body}</svg>`;
}

function piers(deck) {
  const count = Math.round(deck.w / deck.pierSpacing);
  let s = '';
  for (let i = 0; i <= count; i++) {
    const x = deck.x + (deck.w - deck.pierSize) * (i / count);
    s += rect(x, deck.y, deck.pierSize, deck.pierSize, `fill="#b5b0a4" stroke="#77746b" stroke-width="0.06"`);
  }
  return s;
}

function paverGrid(g, strokeW = 0.05) {
  let s = rect(g.x, g.y, g.w, g.d, `fill="#b9cf9c"`);
  const pitch = g.paver + g.grass;
  const nx = Math.floor((g.w + g.grass) / pitch);
  const ny = Math.floor((g.d + g.grass) / pitch);
  const ox = g.x + (g.w - (nx * pitch - g.grass)) / 2;
  const oy = g.y + (g.d - (ny * pitch - g.grass)) / 2;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      s += rect(ox + i * pitch, oy + j * pitch, g.paver, g.paver, `fill="#dcd8cf" stroke="#b1ab9d" stroke-width="${strokeW}"`);
    }
  }
  return s;
}

/** Deck outdoor kitchen footprint (L counter, grill, bar ledge, stools). */
function kitchenSVG(sw, labels = false) {
  const k = exterior.deck.kitchen;
  if (!k) return '';
  const st = `fill="#c9c1b0" stroke="${INK}" stroke-width="${sw}"`;
  let s = rect(k.x, k.y - k.ledgeDepth, k.len, k.depth + k.ledgeDepth, st);
  s += rect(k.x, k.y + k.depth, k.returnDepth, k.returnLen - k.depth, st);
  s += rect(k.x + k.grillAt - k.grillW / 2, k.y + 0.15, k.grillW, k.depth - 0.25, `fill="#9aa0a5" stroke="${INK}" stroke-width="${sw * 0.7}"`);
  for (let i = 0; i < k.stools; i++) {
    const cx = k.x + (k.len * (i + 0.5)) / k.stools;
    s += `<circle cx="${n(cx)}" cy="${n(k.y - k.ledgeDepth - 0.75)}" r="0.65" fill="#fff" stroke="${FURN}" stroke-width="${sw * 0.6}"/>`;
  }
  if (labels) {
    s += text(k.x + k.len / 2, k.y + k.depth / 2 - 0.1, 'Outdoor kitchen · grill', 0.7, `text-anchor="middle" dominant-baseline="central" fill="${INK}" class="halo"`);
    s += text(k.x + k.returnDepth / 2, k.y + k.depth + 1.4, 'fridge', 0.55, `text-anchor="middle" dominant-baseline="central" fill="${INK}" class="halo"`);
  }
  return s;
}

function patioWallSVG(width = 0.6) {
  const w = patioEdgeWall();
  if (w.y1 - w.y0 < 0.5) return '';
  return line(w.x - width / 2, w.y0, w.x - width / 2, w.y1, `stroke="#7d786c" stroke-width="${width}"`);
}

/** Down-slope arrows + label for the 3:1 side lawns. */
function slopeArrows(size = 0.9) {
  const t = site.terrain;
  const nY = t.north.highY;
  const run = (t.courtGrade - t.walkoutGrade) * t.maxSlope;
  const arrow = (x, y0, y1) => `<path d="M${x},${y0} L${x},${y1} m0,0 l-0.8,1.4 m0.8,-1.4 l0.8,1.4" stroke="#6f8558" stroke-width="0.18" fill="none"/>`;
  let s = arrow(-30, -2, -20) + arrow(-8, 17, 4) + arrow(84, nY - 2, nY - run + 2);
  s += text(-31, -11, `lawn ${t.maxSlope}:1`, size, `text-anchor="end" dominant-baseline="central" fill="#55683f" class="halo"`);
  s += text(86, nY - run / 2, `lawn ${t.maxSlope}:1`, size, `dominant-baseline="central" fill="#55683f" class="halo"`);
  return s;
}

export function floorPlanSVG(key) {
  const floor = floors[key];
  const { walls } = deriveWalls(floor);
  const { porch, deck, breezeway: bw } = exterior;
  const rooms = allRooms(floor);
  let s = '';
  let bounds;
  const note = (x, y, str, size = 0.9, extra = '') =>
    text(x, y, str, size, `text-anchor="middle" dominant-baseline="central" fill="#77746b" class="halo" ${extra}`);

  if (key === 'main') {
    bounds = [-58, -36, 92, 76];
    // porch
    s += rect(porch.x, porch.y, porch.w, porch.d, `fill="#efe9dc" stroke="${INK}" stroke-width="0.12"`);
    s += rect(porch.steps.x, porch.y + porch.d, porch.steps.w, 2.5, `fill="#e7e2d6" stroke="${INK}" stroke-width="0.1"`);
    const posts = Math.round(porch.w / porch.postSpacing);
    for (let i = 0; i <= posts; i++) {
      s += rect((porch.w - porch.postSize) * (i / posts), porch.y + porch.d - porch.postSize, porch.postSize, porch.postSize, `fill="#a8733f"`);
    }
    s += note(11, 44, `Front porch · ${fmtFeet(porch.w)} × ${fmtFeet(porch.d)}`);
    // deck
    s += rect(deck.x, deck.y, deck.w, deck.d, `fill="#e9dcc6" stroke="${INK}" stroke-width="0.12"`);
    s += piers(deck);
    const st = deck.stairs;
    s += rect(st.x, st.y, st.w, st.d, `fill="#efe6d5" stroke="${INK}" stroke-width="0.1"`);
    for (let y = st.y + 1; y < st.y + st.d; y += 10 / 12) s += line(st.x, y, st.x + st.w, y, `stroke="${FURN}" stroke-width="0.05"`);
    s += text(st.x - 0.8, st.y + 4, 'DN to pool deck', 0.8, `text-anchor="end" fill="#77746b" dominant-baseline="central"`);
    s += kitchenSVG(0.1, true);
    if (deck.cover) {
      const c = deck.cover;
      s += rect(c.x, c.y, c.w, c.d, `fill="none" stroke="#8d6a45" stroke-width="0.12" stroke-dasharray="0.6 0.4"`);
      s += note(c.x + c.w / 2, c.y + 2.2, 'covered', 0.75);
    }
    s += note(MID, -9.5, `Deck · ${fmtFeet(deck.w)} × ${fmtFeet(deck.d)} · cable rail, stone piers`, 0.9);
    s += text(exterior.deck.barCounter.x + exterior.deck.barCounter.w / 2, -3.2, 'Pass-through bar', 0.8, `text-anchor="middle" fill="${GLASS}"`);
    // breezeway
    s += rect(bw.x, bw.y, bw.w, bw.d, `fill="#dedcd4" stroke="none"`);
    for (const yy of [bw.y, bw.y + bw.d]) {
      const side = (bw.w - bw.archWidth) / 2;
      s += line(bw.x, yy, bw.x + side, yy, `stroke="${INK}" stroke-width="0.75"`);
      s += line(bw.x + bw.w - side, yy, bw.x + bw.w, yy, `stroke="${INK}" stroke-width="0.75"`);
      s += line(bw.x + side, yy, bw.x + bw.w - side, yy, `stroke="${INK}" stroke-width="0.1" stroke-dasharray="0.5 0.4"`);
    }
    s += note(bw.x + bw.w / 2, bw.y + bw.d / 2 - 0.7, 'Breezeway', 0.95, `fill="${INK}" font-weight="650"`);
    s += note(bw.x + bw.w / 2, bw.y + bw.d / 2 + 0.7, `${fmtFeet(bw.w)} × ${fmtFeet(bw.d)} drive-through`, 0.7);
    const courts = [].concat(site.courtyard);
    for (const c of courts) s += rect(c.x, c.y, c.w, c.d, `fill="#ebe8e1" stroke="none"`);
    const ct = courts[0];
    const stp = exterior.stoop;
    if (stp) s += rect(stp.x, stp.y, stp.w, stp.d + 1, `fill="#d9d4c8" stroke="#9a968b" stroke-width="0.1"`);
    s += `<path d="M-8,${bw.y + bw.d + 14} L-8,${bw.y - 2} Q-8,${bw.y - 6} -14,${bw.y - 6} L-24,${bw.y - 6} m0,0 l1.6,-0.9 m-1.6,0.9 l1.6,0.9" stroke="#9a968b" stroke-width="0.15" fill="none" stroke-dasharray="1 0.7"/>`;
    s += note(-8, bw.y + bw.d + 15.5, 'driveway from street', 0.8);
    s += note(ct.x + ct.w / 2, ct.y + ct.d / 2 - 2, 'Motor court', 0.95);
    s += note(ct.x + ct.w / 2, ct.y + ct.d / 2 - 0.3, `main-floor level · garage doors face it`, 0.75);
    s += patioWallSVG(0.6) + slopeArrows(0.85);
    s += text(-1.2, -4, 'low wall ≤ 3\'', 0.75, `text-anchor="end" fill="#77746b" class="halo"`);
  } else {
    bounds = key === 'upper' ? [-8, -8, 90, 50] : [-8, -40, 90, 52];
    s += mainFootprintGhost();
  }

  if (key === 'upper') {
    s += note(WCX, WCY, 'primary wing roof below', 0.85);
    s += note(MID, 44, 'porch roof below', 0.85);
  }
  if (key === 'basement') {
    // covered patio under the deck, then the Phase 1 paver grid with lawn beyond
    s += paverGrid(phases[1].paverGrid, 0.04);
    const cp = site.coveredPatio;
    s += rect(cp.x, cp.y, cp.w, cp.d, `fill="#e4ddcc" stroke="#9a968b" stroke-width="0.12" stroke-dasharray="0.7 0.5"`);
    s += piers(deck);
    const h = phases[2].hotTub;
    s += rect(h.x, h.y, h.w, h.d, `fill="none" stroke="#2f7fb8" stroke-width="0.14" stroke-dasharray="0.6 0.4"`);
    s += note(h.x + h.w / 2, h.y + h.d / 2, 'Phase 2 hot tub', 0.7, `fill="#2f7fb8"`);
    s += note(MID, -7, `Covered pool patio · ${fmtFeet(cp.w)} × ${fmtFeet(cp.d)} · under the deck`, 0.9);
    s += note(14, -20, 'concrete pavers + grass strips', 0.8);
    s += note(h.x + h.w / 2, h.y - 2, '↑ Phase 2 pool 16 × 36', 0.8, `fill="#2f7fb8"`);
    s += patioWallSVG(0.6) + slopeArrows(0.85);
    s += text(-1.2, -4, 'low wall ≤ 3\'', 0.75, `text-anchor="end" fill="#77746b" class="halo"`);
    s += note(36, 41.5, 'front wall fully below grade', 0.8);
    s += note(WCX, WCY - 0.6, 'crawlspace under', 0.8);
    s += note(WCX, WCY + 0.7, 'primary wing', 0.8);
  }

  // room fills
  s += `<pattern id="hatch" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.4" stroke="#d9d5c8" stroke-width="0.18"/></pattern>`;
  for (const r of rooms) {
    if (r.void) s += rect(r.x, r.y, r.w, r.d, `fill="url(#hatch)"`);
    else if (r.stair) s += drawStair(r, key);
    else s += rect(r.x, r.y, r.w, r.d, `fill="${FILL[r.use] || '#f4f2ec'}" stroke="${FILL[r.use] || '#f4f2ec'}" stroke-width="0.05"${r.finished === false && r.use !== 'garage' ? ' fill-opacity="0.55"' : ''}`);
  }
  s += drawFurniture(floor.furniture, rooms);
  for (const w of walls.filter((w) => w.kind === 'interior')) s += drawWall(w);
  for (const w of walls.filter((w) => w.kind === 'exterior')) s += drawWall(w);
  for (const r of floor.rooms) s += roomLabel(r);

  // overall dimensions
  const fp = floor.footprint;
  const minX = Math.min(...fp.map((r) => r.x));
  const maxX = Math.max(...fp.map((r) => r.x + r.w));
  const maxY = Math.max(...fp.map((r) => r.y + r.d));
  const dimY = key === 'main' ? 53 : key === 'basement' ? 49.5 : 45;
  s += dimLine(minX, dimY, maxX, dimY, fmtFeet(maxX - minX), 1);
  if (key === 'main') s += dimLine(MB.x, dimY - 2.6, MB.x + MB.w, dimY - 2.6, fmtFeet(MB.w) + ' main block', 1);
  s += dimLine(maxX + 3.5, 0, maxX + 3.5, maxY, fmtFeet(maxY), -1);

  s += compass(bounds[2] - 7, bounds[1] + 5.5);
  s += scaleBar(bounds[0] + 3, bounds[1] + 3);
  return wrap(s, bounds);
}

export function sitePlanSVG() {
  const b = [site.lot.x, site.lot.y, site.lot.x + site.lot.w, site.lot.y + site.lot.d];
  const t = site.terrain;
  let s = '';
  const lab = (x, y, str, size = 2.6, extra = '') =>
    text(x, y, str, size, `text-anchor="middle" dominant-baseline="central" fill="#3d3c38" class="halo" ${extra}`);

  s += `<defs><linearGradient id="fall" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#c3d4b0"/><stop offset="0.55" stop-color="#d6e2c4"/><stop offset="1" stop-color="#dfe8cf"/></linearGradient>
    <pattern id="slope" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(90)"><line x1="0" y1="0" x2="0" y2="3" stroke="#a9bd93" stroke-width="0.35"/></pattern></defs>`;
  s += rect(b[0], b[1], site.lot.w, site.lot.d, `fill="url(#fall)"`);
  for (let y = 34; y >= b[1] + 6; y -= 9) {
    const amp = 3 + (Math.abs(y) % 4);
    s += `<path d="M${b[0]},${y} C${b[0] + 60},${y + amp} ${-20},${y - amp} ${40},${y + amp * 0.6} S${b[2] - 30},${y - amp} ${b[2]},${y + 2}" fill="none" stroke="#b3c49e" stroke-width="0.25"/>`;
  }
  // road + driveway + motor court
  s += rect(b[0], site.road.y - site.road.width / 2, site.lot.w, site.road.width, `fill="#bdbbb4"`);
  s += lab(60, site.road.y, 'Road', 2.6);
  const [[dx, dy0], [, dy1]] = site.driveway.path;
  s += rect(dx - site.driveway.width / 2, dy1, site.driveway.width, dy0 - dy1, `fill="#cfccc4"`);
  const courts = [].concat(site.courtyard);
  for (const cc of courts) s += rect(cc.x, cc.y, cc.w, cc.d, `fill="#cfccc4"`);
  s += rect(-14, exterior.breezeway.y, 12, exterior.breezeway.d, `fill="#cfccc4"`);
  const c = courts[0];
  s += lab(c.x + c.w / 2, c.y + c.d / 2 - 4, 'Motor court');
  s += lab(c.x + c.w / 2, c.y + c.d / 2, `main-floor level · ${fmtFeet(t.courtGrade)}`, 2);
  // Phase 1 (built): paver grid off the covered patio, fire pit, lawn beyond
  s += paverGrid(phases[1].paverGrid, 0.08);
  const cp = site.coveredPatio;
  s += rect(cp.x, cp.y, cp.w, cp.d, `fill="#d8cfbd"`);
  const fp = site.furniture.find((f) => f.type === 'firepit');
  if (fp) s += `<circle cx="${n(fp.x + fp.w / 2)}" cy="${n(fp.y + fp.d / 2)}" r="${n(fp.w / 2)}" fill="#8b8577" stroke="#5d594f" stroke-width="0.2"/>`;
  s += lab(MID + 6, phases[1].paverGrid.y + 3, 'pavers + grass · fire pit', 1.8);
  s += lab(9, -60, `lawn · graded flat at ${fmtFeet(t.walkoutGrade)}`, 1.8, 'text-anchor="start"');
  // Phase 2 (future): dashed outlines
  const P2 = phases[2];
  const dash = (r, extra = '') => rect(r.x, r.y, r.w, r.d, `fill="none" stroke="#2f7fb8" stroke-width="0.45" stroke-dasharray="1.6 1" ${extra}`);
  const p2lab = (x, y, str, size = 2) => text(x, y, str, size, `text-anchor="middle" dominant-baseline="central" fill="#2f7fb8" class="halo"`);
  const pd = site.poolDeck;
  s += dash(pd);
  const pool = P2.pool;
  s += dash(pool);
  s += p2lab(pool.x + pool.w / 2, pool.y + pool.d / 2 - 2, 'Phase 2 pool');
  s += p2lab(pool.x + pool.w / 2, pool.y + pool.d / 2 + 1.5, `${pool.w}' × ${pool.d}'`, 1.8);
  const h = P2.hotTub;
  s += dash(h);
  s += p2lab(h.x + h.w + 9, h.y + h.d / 2, 'Phase 2 hot tub', 1.7);
  const ph = P2.poolHouse;
  const phf = ph.footprint[0];
  s += dash(phf);
  s += dash(ph.porch, 'stroke-opacity="0.7"');
  s += p2lab(phf.x + phf.w / 2, phf.y + phf.d / 2 - 1.5, 'Phase 2 pool house');
  s += p2lab(phf.x + phf.w / 2, phf.y + phf.d / 2 + 1.5, `${phf.w}' × ${phf.d}' · ${phf.w * phf.d} sq ft`, 1.7);
  s += p2lab(ph.porch.x + ph.porch.w / 2, ph.porch.y + ph.porch.d / 2, 'covered porch', 1.6);
  s += p2lab(pd.x + pd.w - 10, pd.y + pd.d - 6, 'Phase 2 pool deck', 1.8);
  // utility stub-outs (installed in Phase 1)
  for (const so of site.stubOuts) {
    s += `<g transform="translate(${n(so.x)} ${n(so.y)})"><circle r="1.3" fill="#fff" stroke="#c0392b" stroke-width="0.35"/><path d="M-0.8,0 L0.8,0 M0,-0.8 L0,0.8" stroke="#c0392b" stroke-width="0.3"/></g>`;
    s += text(so.x + 2, so.y - 0.6, `${so.id} ${so.name} stub-out`, 1.6, `fill="#8e2a1f" class="halo"`);
    s += text(so.x + 2, so.y + 1.4, so.services, 1.4, `fill="#8e2a1f" class="halo"`);
  }
  // legend
  {
    const lx = b[0] + 8;
    const ly = b[1] + 16;
    s += line(lx, ly, lx + 6, ly, `stroke="#2f7fb8" stroke-width="0.45" stroke-dasharray="1.6 1"`);
    s += text(lx + 8, ly, 'Phase 2 (future): pool, hot tub, pool deck, pool house', 1.8, `dominant-baseline="central" fill="#2f7fb8"`);
    s += `<g transform="translate(${n(lx + 3)} ${n(ly + 4)})"><circle r="1.1" fill="#fff" stroke="#c0392b" stroke-width="0.3"/><path d="M-0.7,0 L0.7,0 M0,-0.7 L0,0.7" stroke="#c0392b" stroke-width="0.25"/></g>`;
    s += text(lx + 8, ly + 4, 'utility stub-out installed in Phase 1', 1.8, `dominant-baseline="central" fill="#8e2a1f"`);
  }
  // low wall at the patio corner + 3:1 lawn slopes on both sides
  s += patioWallSVG(1.2);
  {
    const run = (t.courtGrade - t.walkoutGrade) * t.maxSlope;
    const band = (x0, x1, yHi) => rect(x0, yHi - run, x1 - x0, run, `fill="url(#slope)"`);
    s += band(WG.x + WG.w, b[2], t.north.highY);
    s += lab(-38, -12, `lawn slope ${t.maxSlope}:1 ↓ to patio`, 1.9);
    s += lab(104, t.north.highY - run / 2, `lawn slope ${t.maxSlope}:1 ↓`, 1.9);
    s += text(-2, -6, 'low wall ≤ 3\'', 1.6, `text-anchor="end" fill="#55534d" class="halo"`);
  }
  // deck + porch
  const { deck, porch, breezeway: bw } = exterior;
  s += rect(deck.x, deck.y, deck.w, deck.d, `fill="#d9c39d" stroke="${INK}" stroke-width="0.2"`);
  s += rect(deck.stairs.x, deck.stairs.y, deck.stairs.w, deck.stairs.d, `fill="#d9c39d" stroke="${INK}" stroke-width="0.2"`);
  s += kitchenSVG(0.15);
  s += lab(deck.x + deck.w / 2, deck.y + deck.d / 2, 'Deck (main level), covered patio below', 2);
  s += rect(porch.x, porch.y, porch.w, porch.d, `fill="#e9e3d5" stroke="${INK}" stroke-width="0.2"`);
  // roofs as dark footprints with ridge lines
  s += rect(bw.x, bw.y, bw.w, bw.d, `fill="#3b3b3b"`);
  for (const f of floors.main.footprint) s += rect(f.x, f.y, f.w, f.d, `fill="#2e2e2e" stroke="#2e2e2e" stroke-width="0.5"`);
  const g = floors.main.rooms.find((r) => r.id === 'garage');
  s += rect(g.x, g.y, g.w, g.d, `fill="#2e2e2e"`);
  const ridge = `stroke="#7a7a7a" stroke-width="0.25"`;
  const cg = exterior.roofs.find((r) => r.id === 'center');
  s += line(MB.x, MB.y + MB.d / 2, MB.x + MB.w, MB.y + MB.d / 2, ridge) + line(cg.centerX, MB.y, cg.centerX, MB.y + MB.d, ridge) + line(WCX, WG.y, WCX, WG.y + WG.d, ridge);
  s += line(g.x, g.y + g.d / 2, g.x + g.w, g.y + g.d / 2, ridge) + line(bw.x + bw.w / 2, bw.y, bw.x + bw.w / 2, bw.y + bw.d, ridge);
  const w = (x, y, str, size = 2.2) => text(x, y, str, size, `text-anchor="middle" dominant-baseline="central" fill="#fff"`);
  s += w(14, 10, 'Main block') + w(14, 13, '(2-story)', 1.9);
  s += w(WCX, WCY - 1.5, 'Primary') + w(WCX, WCY + 1.5, 'wing', 2.2);
  s += w(g.x + g.w / 2, g.y + g.d / 2, '3-car garage');
  s += lab(MID, 52, `Front porch · grade ${fmtFeet(t.frontGrade)}`, 2.2);
  s += lab(-8, 95, 'Driveway', 2.2);
  s += lab(bw.x + bw.w / 2, bw.y + bw.d / 2, 'breezeway', 1.8);
  for (const x of [-92, 112]) {
    s += `<path d="M${x},80 L${x},-10 m0,0 l-2,4 m2,-4 l2,4" stroke="#6f8558" stroke-width="0.5" fill="none"/>`;
    s += text(x, 86, 'slopes down', 2, `text-anchor="middle" fill="#55683f"`);
    s += text(x, 89.5, 'to the west', 2, `text-anchor="middle" fill="#55683f"`);
  }
  s += `<g transform="translate(${b[2] - 24} ${b[1] + 18}) scale(2.6)">${compass(0, 0).replace(/<g transform="[^"]*"/, '<g')}</g>`;
  for (let i = 0; i < 4; i++) s += rect(b[0] + 8 + i * 10, b[1] + 8, 10, 1.2, `fill="${i % 2 ? '#fff' : INK}" stroke="${INK}" stroke-width="0.15"`);
  for (const v of [0, 20, 40]) s += text(b[0] + 8 + v, b[1] + 6.5, `${v}'`, 2.2, `text-anchor="middle" fill="#3d3c38"`);
  return wrap(s, b);
}
