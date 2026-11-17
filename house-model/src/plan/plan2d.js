// Top-down SVG plan, drawn straight from the config. Front of the house is at
// the bottom of the page; the rear (west, pool side) is at the top.
import { floors, exterior, site, build } from '../config/house.js';
import { deriveWalls, solidSpans, allRooms, fmtFeet } from '../model/layout.js';

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

function drawStair(r, levelKey) {
  // two flights side by side running along x, landing at the far (x = r.x) end,
  // entered from the x = r.x + r.w side
  const land = 3.5;
  const half = r.d / 2;
  let s = rect(r.x, r.y, r.w, r.d, `fill="${FILL.circ}"`);
  s += line(r.x + land, r.y + half, r.x + r.w, r.y + half, `stroke="${INK}" stroke-width="0.2"`);
  const treads = 8;
  for (let i = 0; i <= treads; i++) {
    const xx = r.x + land + ((r.w - land) * i) / (treads + 1);
    s += line(xx, r.y, xx, r.y + r.d, `stroke="${FURN}" stroke-width="0.07"`);
  }
  const lab = { basement: ['UP', ''], main: ['UP', 'DN'], upper: ['DN', ''] }[levelKey];
  const a = `text-anchor="middle" dominant-baseline="central" fill="${INK}" class="halo"`;
  s += text(r.x + r.w - 2.2, r.y + half / 2, lab[0], 0.8, a);
  if (lab[1]) s += text(r.x + r.w - 2.2, r.y + half * 1.5, lab[1], 0.8, a);
  return s;
}

function drawFurniture(list = []) {
  let s = '';
  for (const f of list) {
    const strong = ['screen', 'mat', 'island', 'bed', 'car'].includes(f.type);
    s += rect(f.x, f.y, f.w, f.d,
      `fill="${f.type === 'mat' ? '#cfe3c4' : '#ffffff'}" fill-opacity="0.7" stroke="${FURN}" stroke-width="${strong ? 0.14 : 0.09}" rx="0.15"`);
    if (f.type === 'bed') {
      // pillow end = the end against the nearest wall is unknown here; just mark a band
      const along = f.d >= f.w;
      s += along
        ? line(f.x, f.y + 1.6, f.x + f.w, f.y + 1.6, `stroke="${FURN}" stroke-width="0.07"`)
        : line(f.x + (f.x > 26 ? f.w - 1.6 : 1.6), f.y, f.x + (f.x > 26 ? f.w - 1.6 : 1.6), f.y + f.d, `stroke="${FURN}" stroke-width="0.07"`);
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

function wrap(body, [x0, y0, x1, y1]) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(x0)} ${n(y0)} ${n(x1 - x0)} ${n(y1 - y0)}" font-family="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif">
  <style>.halo{paint-order:stroke;stroke:#fff;stroke-opacity:.82;stroke-width:.32px;stroke-linejoin:round}</style>
  ${body}</svg>`;
}

function piers(deck) {
  let s = '';
  for (let x = deck.x; x <= deck.x + deck.w + 0.01; x += deck.pierSpacing) {
    s += rect(Math.min(Math.max(x - 1, deck.x), deck.x + deck.w - 2), deck.y, 2, 2, `fill="#b5b0a4" stroke="#77746b" stroke-width="0.06"`);
  }
  return s;
}

export function floorPlanSVG(key) {
  const floor = floors[key];
  const { walls } = deriveWalls(floor);
  const { porch, deck, breezeway: bw } = exterior;
  let s = '';
  let bounds;
  const note = (x, y, str, size = 0.9, extra = '') =>
    text(x, y, str, size, `text-anchor="middle" dominant-baseline="central" fill="#77746b" ${extra}`);

  if (key === 'main') {
    bounds = [-58, -34, 84, 54];
    // porch
    s += rect(porch.x, porch.y, porch.w, porch.d, `fill="#efe9dc" stroke="${INK}" stroke-width="0.12"`);
    s += rect(porch.steps.x, porch.y + porch.d, porch.steps.w, 2.5, `fill="#e7e2d6" stroke="${INK}" stroke-width="0.1"`);
    for (let x = porch.x; x <= porch.x + porch.w + 0.01; x += porch.postSpacing) {
      s += rect(Math.min(Math.max(x - 0.4, 0), porch.w - 0.8), porch.y + porch.d - 0.8, 0.8, 0.8, `fill="#a8733f"`);
    }
    s += note(9, 42, `Front porch · ${fmtFeet(porch.w)} × ${fmtFeet(porch.d)}`);
    // deck
    s += rect(deck.x, deck.y, deck.w, deck.d, `fill="#e9dcc6" stroke="${INK}" stroke-width="0.12"`);
    s += piers(deck);
    const st = deck.stairs;
    s += rect(st.x, st.y, st.w, st.d, `fill="#efe6d5" stroke="${INK}" stroke-width="0.1"`);
    for (let y = st.y + 1; y < st.y + st.d; y += 1) s += line(st.x, y, st.x + st.w, y, `stroke="${FURN}" stroke-width="0.06"`);
    s += text(st.x + st.w + 0.8, st.y + 8, 'DN to patio + pool', 0.8, `fill="#77746b" dominant-baseline="central"`);
    s += note(26, -9.5, `Deck · ${fmtFeet(deck.w)} × ${fmtFeet(deck.d)} · cable rail, stone piers`, 0.9);
    s += text(26, -3.2, 'Pass-through bar', 0.8, `text-anchor="middle" fill="${GLASS}"`);
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
    s += `<path d="M-8,50 L-8,-20 M-8,-20 l-0.9,1.6 M-8,-20 l0.9,1.6" stroke="#9a968b" stroke-width="0.15" fill="none" stroke-dasharray="1 0.7"/>`;
    s += note(-8, 51.5, 'driveway from street', 0.8);
    s += note(-34, -15, 'Rear motor court', 0.95);
    s += note(-34, -13.3, 'garage doors face this side', 0.75);
  } else {
    bounds = key === 'upper' ? [-8, -8, 62, 46] : [-8, -24, 62, 46];
    s += mainFootprintGhost();
  }

  if (key === 'upper') {
    s += note(65, 21, 'primary wing', 0.8);
    s += note(65, 22.3, 'roof below', 0.8);
    s += note(9, 41, 'porch roof below', 0.8);
  }
  if (key === 'basement') {
    s += rect(deck.x, deck.y, deck.w, deck.d, `fill="#eeeae0" stroke="#9a968b" stroke-width="0.12" stroke-dasharray="0.7 0.5"`);
    s += piers(deck);
    s += note(26, -8, `Covered pool patio · ${fmtFeet(deck.w)} × ${fmtFeet(deck.d)} · under the deck`, 0.9);
    s += note(26, -18, '↑ hot tub and pool', 0.85);
    s += note(26, 41, 'front wall fully below grade', 0.8);
    s += note(65, 21, 'crawlspace', 0.75);
    s += note(65, 22.2, 'under wing', 0.75);
  }

  // room fills
  s += `<pattern id="hatch" width="1.4" height="1.4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.4" stroke="#d9d5c8" stroke-width="0.18"/></pattern>`;
  for (const r of allRooms(floor)) {
    if (r.void) s += rect(r.x, r.y, r.w, r.d, `fill="url(#hatch)"`);
    else if (r.stair) s += drawStair(r, key);
    else s += rect(r.x, r.y, r.w, r.d, `fill="${FILL[r.use] || '#f4f2ec'}" stroke="${FILL[r.use] || '#f4f2ec'}" stroke-width="0.05"${r.finished === false && r.use !== 'garage' ? ' fill-opacity="0.55"' : ''}`);
  }
  s += drawFurniture(floor.furniture);
  for (const w of walls.filter((w) => w.kind === 'interior')) s += drawWall(w);
  for (const w of walls.filter((w) => w.kind === 'exterior')) s += drawWall(w);
  for (const r of floor.rooms) s += roomLabel(r);

  // overall dimensions
  const fp = floor.footprint;
  const minX = Math.min(...fp.map((r) => r.x));
  const maxX = Math.max(...fp.map((r) => r.x + r.w));
  const dimY = key === 'main' ? 50 : 43.5;
  s += dimLine(minX, dimY, maxX, dimY, fmtFeet(maxX - minX), 1);
  s += dimLine(maxX + 3.5, 0, maxX + 3.5, 38, fmtFeet(38), -1);

  s += compass(bounds[2] - 8, bounds[1] + 6);
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
    <stop offset="0" stop-color="#c3d4b0"/><stop offset="0.55" stop-color="#d6e2c4"/><stop offset="1" stop-color="#dfe8cf"/></linearGradient></defs>`;
  s += rect(b[0], b[1], site.lot.w, site.lot.d, `fill="url(#fall)"`);
  for (let y = 30; y >= b[1] + 6; y -= 9) {
    const amp = 3 + (Math.abs(y) % 4);
    s += `<path d="M${b[0]},${y} C${b[0] + 60},${y + amp} ${-20},${y - amp} ${40},${y + amp * 0.6} S${b[2] - 30},${y - amp} ${b[2]},${y + 2}" fill="none" stroke="#b3c49e" stroke-width="0.25"/>`;
  }
  // road + driveway
  s += rect(b[0], site.road.y - site.road.width / 2, site.lot.w, site.road.width, `fill="#bdbbb4"`);
  s += lab(60, site.road.y, 'Road', 2.6);
  const [[dx, dy0], [, dy1]] = site.driveway.path;
  s += rect(dx - site.driveway.width / 2, dy1, site.driveway.width, dy0 - dy1, `fill="#cfccc4"`);
  const c = site.courtyard;
  s += rect(c.x, c.y, c.w, c.d, `fill="#cfccc4"`);
  s += lab(c.x + c.w / 2, c.y + c.d / 2 - 2, 'Motor court');
  s += lab(c.x + c.w / 2, c.y + c.d / 2 + 2.5, `grade ${t.courtyardGrade}'`, 2);
  // patio, pool, hot tub, pavilion
  const p = site.patio;
  s += rect(p.x, p.y, p.w, p.d, `fill="#e4dccb" stroke="#b9b09b" stroke-width="0.2"`);
  const pool = site.pool;
  s += rect(pool.x, pool.y, pool.w, pool.d, `fill="#7fc4dc" stroke="#f5f2ea" stroke-width="1.2"`);
  s += lab(pool.x + pool.w / 2, pool.y + pool.d / 2 - 2, 'Pool');
  s += lab(pool.x + pool.w / 2, pool.y + pool.d / 2 + 2.5, `${pool.w}' × ${pool.d}'`, 2);
  const h = site.hotTub;
  s += rect(h.x, h.y, h.w, h.d, `fill="#5fb0cf" stroke="#8b8577" stroke-width="0.9"`);
  s += text(h.x - 1.5, h.y + h.d / 2, 'Raised hot tub', 2, `text-anchor="end" dominant-baseline="central" fill="#3d3c38" class="halo"`);
  const pv = site.pavilion;
  s += rect(pv.x, pv.y, pv.w, pv.d, `fill="#3b3b3b" fill-opacity="0.85" stroke="${INK}" stroke-width="0.3"`);
  s += text(pv.x + pv.w / 2, pv.y + pv.d / 2 - 1.5, 'Outdoor kitchen', 2, `text-anchor="middle" dominant-baseline="central" fill="#fff"`);
  s += text(pv.x + pv.w / 2, pv.y + pv.d / 2 + 1.5, 'pavilion', 2, `text-anchor="middle" dominant-baseline="central" fill="#fff"`);
  s += lab(8, -70, 'Paver', 2.2);
  s += lab(8, -67, 'patio', 2.2);
  s += lab(8, -63.5, `${t.walkoutGrade}'`, 1.9);
  // retaining wall
  const rw = site.retainingWall.path;
  s += `<polyline points="${rw.map(([x, y]) => `${x},${y}`).join(' ')}" fill="none" stroke="#7d786c" stroke-width="1"/>`;
  s += text(-28, -50, 'stone retaining wall', 1.9, `text-anchor="middle" fill="#55534d" class="halo"`);
  // deck + porch
  const { deck, porch, breezeway: bw } = exterior;
  s += rect(deck.x, deck.y, deck.w, deck.d, `fill="#d9c39d" stroke="${INK}" stroke-width="0.2"`);
  s += rect(deck.stairs.x, deck.stairs.y, deck.stairs.w, deck.stairs.d, `fill="#d9c39d" stroke="${INK}" stroke-width="0.2"`);
  s += lab(deck.x + deck.w / 2, deck.y + deck.d / 2, 'Deck (main level)', 2.2);
  s += rect(porch.x, porch.y, porch.w, porch.d, `fill="#e9e3d5" stroke="${INK}" stroke-width="0.2"`);
  // roofs as dark footprints with ridge lines
  s += rect(bw.x, bw.y, bw.w, bw.d, `fill="#3b3b3b"`);
  for (const f of floors.main.footprint) s += rect(f.x, f.y, f.w, f.d, `fill="#2e2e2e" stroke="#2e2e2e" stroke-width="0.5"`);
  const g = floors.main.rooms.find((r) => r.id === 'garage');
  s += rect(g.x, g.y, g.w, g.d, `fill="#2e2e2e"`);
  const ridge = `stroke="#7a7a7a" stroke-width="0.25"`;
  s += line(0, 19, 52, 19, ridge) + line(26, 0, 26, 38, ridge) + line(65, 4, 65, 38, ridge);
  s += line(g.x, g.y + g.d / 2, g.x + g.w, g.y + g.d / 2, ridge) + line(-8, 1, -8, 17, ridge);
  const w = (x, y, str, size = 2.2) => text(x, y, str, size, `text-anchor="middle" dominant-baseline="central" fill="#fff"`);
  s += w(13, 10, 'Main block') + w(13, 13, '(2-story)', 1.9);
  s += w(65.5, 18, 'Primary') + w(65.5, 21, 'wing', 2.2);
  s += w(-34, 2, '3-car garage');
  s += lab(26, 50, `Front porch · grade ${t.frontGrade}'`, 2.2);
  s += lab(-8, 95, 'Driveway', 2.2);
  s += lab(-8, 23, 'breezeway', 1.8);
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
