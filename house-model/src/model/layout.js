// Derives walls, hallways and plan checks from the room rectangles in the
// config. Shared by the 2D plan and the 3D model so both always agree.

const EPS = 1e-6;

export function roomAt(rooms, x, y) {
  return rooms.find((r) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.d) || null;
}

/** Rooms plus auto-generated hallway cells filling the rest of the footprint. */
export function allRooms(floor) {
  if (floor._all) return floor._all;
  const rooms = floor.rooms;
  const fp = floor.footprint || [];
  const uniq = (a) => [...new Set(a)].sort((p, q) => p - q);
  const xs = uniq([...rooms, ...fp].flatMap((r) => [r.x, r.x + r.w]));
  const ys = uniq([...rooms, ...fp].flatMap((r) => [r.y, r.y + r.d]));
  const cells = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      const cy = (ys[j] + ys[j + 1]) / 2;
      if (roomAt(fp, cx, cy) && !roomAt(rooms, cx, cy)) {
        cells.push({ id: '_hall', hall: true, use: 'circ', x: xs[i], y: ys[j], w: xs[i + 1] - xs[i], d: ys[j + 1] - ys[j] });
      }
    }
  }
  floor._all = [...rooms, ...cells];
  return floor._all;
}

const pairKey = (a, b) => [a, b].sort().join('|');

/**
 * Returns { walls, unplaced }.
 * wall = { axis, at, from, to, kind: 'exterior'|'interior', openings: [] }
 * axis 'x' means the wall lies on the line x = at and runs along y.
 */
export function deriveWalls(floor) {
  const rooms = allRooms(floor);
  const open = new Set((floor.openPlan || []).map((p) => pairKey(...p)));
  const parts = floor.partitions || [];
  const walls = [];

  for (const axis of ['x', 'y']) {
    const [pos, len, lo, sz] = axis === 'x' ? ['x', 'w', 'y', 'd'] : ['y', 'd', 'x', 'w'];
    const lines = [...new Set(rooms.flatMap((r) => [r[pos], r[pos] + r[len]]))];
    for (const c of lines) {
      const myParts = parts.filter((p) => p.on === axis && Math.abs(p.at - c) < EPS);
      const cuts = [...new Set([
        ...rooms
          .filter((r) => r[pos] <= c + EPS && r[pos] + r[len] >= c - EPS)
          .flatMap((r) => [r[lo], r[lo] + r[sz]]),
        ...myParts.flatMap((p) => [p.from, p.to]),
      ])].sort((a, b) => a - b);
      let run = null;
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i];
        const b = cuts[i + 1];
        const mid = (a + b) / 2;
        const side = (off) => (axis === 'x' ? roomAt(rooms, c + off, mid) : roomAt(rooms, mid, c + off));
        const A = side(-0.01);
        const B = side(0.01);
        let kind = null;
        if ((A && A.id) !== (B && B.id)) {
          if (!A || !B) kind = 'exterior';
          else if (!open.has(pairKey(A.id, B.id))) kind = 'interior';
        }
        if (!kind && A && B && myParts.some((p) => p.from <= a + EPS && p.to >= b - EPS)) kind = 'interior';
        if (kind && run && run.kind === kind && Math.abs(run.to - a) < EPS) {
          run.to = b;
        } else {
          if (run) walls.push(run);
          run = kind ? { axis, at: c, from: a, to: b, kind, openings: [] } : null;
        }
      }
      if (run) walls.push(run);
    }
  }

  const unplaced = [];
  for (const o of floor.openings || []) {
    const wall = walls.find(
      (w) => w.axis === o.on && Math.abs(w.at - o.at) < EPS && o.from >= w.from - EPS && o.to <= w.to + EPS,
    );
    if (wall) wall.openings.push(o);
    else unplaced.push(o);
  }
  for (const w of walls) w.openings.sort((a, b) => a.from - b.from);
  return { walls, unplaced };
}

/** Solid stretches of a wall once its openings are cut out. */
export function solidSpans(wall) {
  const spans = [];
  let cur = wall.from;
  for (const o of wall.openings) {
    if (o.from > cur + EPS) spans.push([cur, o.from]);
    cur = Math.max(cur, o.to);
  }
  if (cur < wall.to - EPS) spans.push([cur, wall.to]);
  return spans;
}

/** Gross (centerline) areas for a floor. Voids are excluded. */
export function floorAreas(floor) {
  let finished = 0;
  let unfinished = 0;
  for (const r of allRooms(floor)) {
    if (r.void) continue;
    if (r.finished === false) unfinished += r.w * r.d;
    else finished += r.w * r.d;
  }
  return { finished, unfinished };
}

/** Rooms that overlap each other — a config mistake worth flagging. */
export function overlaps(floor) {
  const out = [];
  const rs = floor.rooms;
  for (let i = 0; i < rs.length; i++) {
    for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i];
      const b = rs[j];
      if (a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.d - EPS && b.y < a.y + a.d - EPS) {
        out.push([a.id, b.id]);
      }
    }
  }
  return out;
}

/**
 * Hallway spots narrower than `min` ft. Open-plan rooms that adjoin the hall
 * count as walkable width (a 2 ft strip beside an open kitchen is fine).
 */
export function narrowHalls(floor, min) {
  const rooms = allRooms(floor);
  const open = new Set((floor.openPlan || []).map((p) => pairKey(...p)));
  const walkable = rooms.filter((r) => !r.void && (r.hall || open.has(pairKey(r.id, '_hall'))));
  const halls = rooms.filter((r) => r.hall);
  const step = 0.25;
  const inside = (r, x, y) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.d;
  const walk = (x, y) => walkable.some((r) => inside(r, x, y));
  const run = (x, y, dx, dy) => {
    let n = 1;
    for (let k = 1; k < 400 && walk(x + dx * k * step, y + dy * k * step); k++) n++;
    for (let k = 1; k < 400 && walk(x - dx * k * step, y - dy * k * step); k++) n++;
    return n * step;
  };
  const issues = [];
  for (const h of halls) {
    let worst = Infinity;
    for (let x = h.x + step / 2; x < h.x + h.w; x += step) {
      for (let y = h.y + step / 2; y < h.y + h.d; y += step) {
        worst = Math.min(worst, run(x, y, 1, 0), run(x, y, 0, 1));
      }
    }
    if (worst < min - 0.01) issues.push({ ...h, width: worst });
  }
  return issues;
}

/** Rooms that cannot be reached from the stairs through doors / open plan. */
export function unreachable(floor) {
  const rooms = allRooms(floor).filter((r) => !r.void);
  const id = (r) => (r ? r.id : '_outside');
  const adj = new Map();
  const link = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  };
  for (const [a, b] of floor.openPlan || []) link(a, b);
  const passable = ['door', 'entry', 'glassdoor', 'opening', 'garage'];
  for (const o of floor.openings || []) {
    if (!passable.includes(o.kind)) continue;
    const m = (o.from + o.to) / 2;
    const [p, q] = o.on === 'x' ? [[o.at - 0.3, m], [o.at + 0.3, m]] : [[m, o.at - 0.3], [m, o.at + 0.3]];
    link(id(roomAt(rooms, ...p)), id(roomAt(rooms, ...q)));
  }
  const seen = new Set(['stair']);
  const queue = ['stair'];
  while (queue.length) {
    for (const n of adj.get(queue.shift()) || []) {
      if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
  }
  return floor.rooms.filter((r) => !r.void && !seen.has(r.id));
}

export function fmtFeet(v) {
  const sign = v < 0 ? '-' : '';
  const a = Math.abs(v);
  let ft = Math.floor(a + 1e-9);
  let inch = Math.round((a - ft) * 12);
  if (inch === 12) { ft += 1; inch = 0; }
  return inch ? `${sign}${ft}'-${inch}"` : `${sign}${ft}'`;
}
