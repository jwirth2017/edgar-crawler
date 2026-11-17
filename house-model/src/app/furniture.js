// Simple block furniture so room scale reads at a glance. Each item is the
// config's plan rectangle (x, y, w, d) and height h, standing on `base`.
import { exterior } from '../config/house.js';

/** Side of the rectangle that sits against a wall of `room` (for headboards etc.). */
function wallSide(f, room, anySide = false) {
  if (!room) return f.w > f.d ? '-x' : '-y';
  const gaps = {
    '-x': f.x - room.x,
    '+x': room.x + room.w - (f.x + f.w),
    '-y': f.y - room.y,
    '+y': room.y + room.d - (f.y + f.d),
  };
  const sides = anySide ? ['-x', '+x', '-y', '+y'] : (f.w > f.d ? ['-x', '+x'] : ['-y', '+y']);
  return sides.sort((a, b) => gaps[a] - gaps[b])[0];
}

/** Strip of the rectangle on a given side, `t` deep. */
function strip(f, side, t) {
  switch (side) {
    case '-x': return [f.x, f.x + t, f.y, f.y + f.d];
    case '+x': return [f.x + f.w - t, f.x + f.w, f.y, f.y + f.d];
    case '-y': return [f.x, f.x + f.w, f.y, f.y + t];
    default: return [f.x, f.x + f.w, f.y + f.d - t, f.y + f.d];
  }
}
const opposite = { '-x': '+x', '+x': '-x', '-y': '+y', '+y': '-y' };
const R = (f) => [f.x, f.x + f.w, f.y, f.y + f.d];

export function furniture(B, M, g, f, base, room, P) {
  P = P || { cabinet: M.cabinet, island: M.island, counter: M.counterTop, fixture: M.steel, tub: M.porcelain, tubKind: 'acrylic' };
  const h = f.h;
  const box = (mat, rect, z0, z1, opts) => B.box(g, mat, ...rect, base + z0, base + z1, opts);
  const inset = (r, d) => [r[0] + d, r[1] - d, r[2] + d, r[3] - d];

  switch (f.type) {
    case 'counter': {
      box(P.cabinet, inset(R(f), 0.05), 0, h - 0.15);
      box(P.counter, R(f), h - 0.15, h);
      if (f.label === 'Coffee station') box(P.cabinet, strip(f, wallSide(f, room, true), 1.1), 4.6, 7.3);
      if (f.sink) sinks(B, M, g, f, base, room, P);
      break;
    }
    case 'tall':
      box(P.cabinet, R(f), 0, h);
      break;
    case 'island':
      box(P.island, inset(R(f), 0.1), 0, h - 0.15);
      box(P.counter, R(f), h - 0.15, h);
      break;
    case 'table': {
      const top = h >= 2 ? h : h;
      box(M.wood, R(f), top - 0.15, top);
      const leg = 0.25;
      for (const [lx, ly] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const x = f.x + (f.w - leg) * lx;
        const y = f.y + (f.d - leg) * ly;
        box(M.wood, [x, x + leg, y, y + leg], 0, top - 0.15);
      }
      if (f.chairs) chairsAround(B, M, g, f, base);
      break;
    }
    case 'sofa': case 'recliner': {
      const mat = f.type === 'recliner' ? M.leather : M.fabric;
      const back = opposite[f.faces] || wallSide(f, room);
      const seats = f.seats || 1;
      const alongX = back === '-y' || back === '+y';
      for (let i = 0; i < seats; i++) {
        const part = alongX
          ? { ...f, x: f.x + (f.w / seats) * i, w: f.w / seats }
          : { ...f, y: f.y + (f.d / seats) * i, d: f.d / seats };
        const gap = seats > 1 ? 0.12 : 0;
        const pr = alongX ? [part.x + gap, part.x + part.w - gap, part.y, part.y + part.d] : [part.x, part.x + part.w, part.y + gap, part.y + part.d - gap];
        B.box(g, mat, ...pr, base, base + h * 0.5);
        const bs = strip({ x: pr[0], y: pr[2], w: pr[1] - pr[0], d: pr[3] - pr[2] }, back, 0.8);
        B.box(g, mat, ...bs, base, base + h);
      }
      if (f.type === 'sofa') {
        // arms
        const ends = alongX ? ['-x', '+x'] : ['-y', '+y'];
        for (const e of ends) box(mat, strip(f, e, 0.6), 0, h * 0.72);
      }
      break;
    }
    case 'chair':
      box(M.leather, R(f), 0, 1.5);
      box(M.leather, strip(f, f.faces ? opposite[f.faces] : '+y', 0.5), 0, h);
      break;
    case 'desk':
      box(M.wood, R(f), h - 0.12, h);
      box(M.wood, strip(f, f.w > f.d ? '-x' : '-y', 0.15), 0, h - 0.12);
      box(M.wood, strip(f, f.w > f.d ? '+x' : '+y', 0.15), 0, h - 0.12);
      break;
    case 'bench': case 'dresser':
      box(M.wood, R(f), 0, h);
      break;
    case 'tv': {
      box(M.cabinet, R(f), 0, h);
      const thin = f.w > f.d ? [f.x + 0.3, f.x + f.w - 0.3, f.y + f.d / 2 - 0.08, f.y + f.d / 2 + 0.08] : [f.x + f.d / 2 - 0.08, f.x + f.d / 2 + 0.08, f.y + 0.3, f.y + f.d - 0.3];
      box(M.tv, thin, h + 0.6, h + 3.4);
      break;
    }
    case 'toilet':
      box(M.porcelain, R(f), 0, h);
      box(M.porcelain, strip(f, wallSide(f, room, true), 0.6), 0, h + 1.2);
      break;
    case 'tub':
      box(P.tub, R(f), 0, h);
      if (P.tubKind === 'fiberglass') {
        // one-piece fiberglass tub/shower unit: molded surround on the wall side
        box(P.tub, strip(f, wallSide(f, room, true), 0.12), h, 6.2);
      }
      faucet(B, P, g, strip(f, wallSide(f, room, true), 0.3), base + h, 0.6);
      break;
    case 'shower':
      box(P.tub === M.fiberglass ? M.fiberglass : M.tile, R(f), 0, 0.3);
      box(M.glass, inset(R(f), 0.02), 0.3, h, { shadow: false });
      box(P.fixture, inset(R(f), 0.0), h - 0.08, h);           // frame / header bar
      faucet(B, P, g, strip(f, wallSide(f, room, true), 0.25), base + 6.2, 0.6);
      break;
    case 'bed': {
      const head = wallSide(f, room);
      box(M.wood, R(f), 0, 1.2);
      box(M.bedding, inset(R(f), 0.1), 1.2, h);
      box(M.fabric, strip(f, head, 0.35), 0, 4.2);
      const p = strip(f, head, 1.6);
      box(M.bedding, inset(p, 0.4), h, h + 0.45);
      break;
    }
    case 'appliance': case 'equipment':
      box(f.type === 'appliance' ? M.steel : M.rubber, R(f), 0, h);
      break;
    case 'car': {
      const alongY = f.d > f.w;
      box(M.car, inset(R(f), 0.05), 0.8, h * 0.55);
      const cab = alongY ? [f.x + 0.4, f.x + f.w - 0.4, f.y + f.d * 0.28, f.y + f.d * 0.72] : [f.x + f.w * 0.28, f.x + f.w * 0.72, f.y + 0.4, f.y + f.d - 0.4];
      box(M.glass, cab, h * 0.55, h, { shadow: false });
      box(M.car, cab, h - 0.15, h);
      for (const [u, v] of [[0.12, 0.18], [0.88, 0.18], [0.12, 0.82], [0.88, 0.82]]) {
        const cx = f.x + f.w * (alongY ? u : v);
        const cy = f.y + f.d * (alongY ? v : u);
        box(M.rubber, [cx - 0.45, cx + 0.45, cy - 0.45, cy + 0.45], 0, 1.3);
      }
      break;
    }
    case 'hanging': {
      // closet section: double-hang rods at the configured heights, clothes below each
      const back = wallSide(f, room, true);
      box(M.cabinet, strip(f, back, 0.15), 0, h);
      box(M.cabinet, R(f), (f.rods?.[1] ?? 7) + 0.6, (f.rods?.[1] ?? 7) + 0.75);
      for (const rod of f.rods || [7]) {
        const rr = f.w > f.d ? [f.x, f.x + f.w, f.y + f.d / 2 - 0.05, f.y + f.d / 2 + 0.05] : [f.x + f.w / 2 - 0.05, f.x + f.w / 2 + 0.05, f.y, f.y + f.d];
        box(M.steel, rr, rod - 0.05, rod + 0.05);
        box(M.fabric, inset(R(f), 0.15), rod - 3.1, rod - 0.15);
      }
      break;
    }
    case 'screen': {
      // black frame + a picture layer on the room side, stretched once across
      const golf = /impact/i.test(f.label || '');
      const mat = golf ? M.screenGolf : M.screenMovie;
      box(M.black, R(f), -0.2, h + 0.2);
      const intoRoom = room && f.y + f.d / 2 > room.y + room.d / 2 ? -1 : 1; // -1: faces -y
      const yf = intoRoom < 0 ? f.y - 0.03 : f.y + f.d + 0.03;
      box(mat, [f.x, f.x + f.w, Math.min(yf, yf - intoRoom * 0.04), Math.max(yf, yf - intoRoom * 0.04)], 0, h, { shadow: false });
      // UVs are world feet: map the screen rectangle onto 0..1 (mirrored when seen from -y side)
      const t = mat.map;
      if (intoRoom < 0) { t.repeat.set(-1 / f.w, 1 / h); t.offset.set((f.x + f.w) / f.w, -base / h); }
      else { t.repeat.set(1 / f.w, 1 / h); t.offset.set(-f.x / f.w, -base / h); }
      break;
    }
    case 'platform':
      box(M.carpet, R(f), 0, h);
      B.surface(f.x, f.x + f.w, f.y, f.y + f.d, base + h, 'platform');
      break;
    case 'mat':
      box(M.matTurf, R(f), 0, 0.15);
      box(M.rubber, [f.x + f.w / 2 - 0.6, f.x + f.w / 2 + 0.6, f.y + f.d / 2 - 0.6, f.y + f.d / 2 + 0.6], 0.15, 0.25);
      break;
    case 'steps': {
      // descends along +x from the top (room edge) to the room floor
      const n = 3;
      for (let k = 0; k < n; k++) {
        const top = h - ((k + 1) * h) / n;
        box(M.oak, [f.x + (f.w * k) / n, f.x + (f.w * (k + 1)) / n, f.y, f.y + f.d], -0.5, top + h / n);
      }
      B.surface(f.x - 0.01, f.x + f.w, f.y, f.y + f.d, (x) => base + h - ((x - f.x) / f.w) * h, 'steps');
      break;
    }
    case 'firepit':
      box(M.stone, R(f), 0, h);
      box(M.black, inset(R(f), 0.5), h - 0.1, h + 0.02);
      break;
    case 'lounger':
      box(M.rail, R(f), 0, 0.9);
      box(M.bedding, inset(R(f), 0.1), 0.9, h);
      box(M.bedding, strip(f, '-y', 1.8), 0.9, h + 1.1);
      break;
    case 'fireplace': {
      box(M.stone, R(f), 0, h, { collide: true });
      const face = opposite[wallSide(f, room, true)];
      const hearth = strip({ ...f, x: f.x - (face === '-x' ? 1.5 : 0), w: f.w + 1.5 }, face, 1.6);
      box(M.stone, hearth, 0, 1.2);
      const fb = strip(f, face, 0.06);
      const off = face === '-x' ? -0.04 : 0.04;
      const mid = f.d > f.w ? [fb[0] + off, fb[1] + off, f.y + f.d / 2 - 1.6, f.y + f.d / 2 + 1.6] : [f.x + f.w / 2 - 1.6, f.x + f.w / 2 + 1.6, fb[2], fb[3]];
      box(M.black, mid, 1.4, 4.0);
      const mantel = f.d > f.w ? [fb[0] - (face === '-x' ? 0.6 : 0), fb[1] + (face === '+x' ? 0.6 : 0), f.y + 0.2, f.y + f.d - 0.2] : [f.x + 0.2, f.x + f.w - 0.2, fb[2], fb[3]];
      box(M.cedar, mantel, 4.6, 5.0);
      box(M.tv, f.d > f.w ? [mid[0] - 0.1, mid[1], mid[2] - 0.7, mid[3] + 0.7] : mid, 5.6, 8.2);
      break;
    }
    default:
      box(M.fabric, R(f), 0, h);
  }
}

/** Small faucet: a riser on the wall side of a rectangle strip. */
function faucet(B, P, g, s, z, h) {
  const cx = (s[0] + s[1]) / 2;
  const cy = (s[2] + s[3]) / 2;
  B.box(g, P.fixture, cx - 0.07, cx + 0.07, cy - 0.07, cy + 0.07, z, z + h, { shadow: false });
}

/** One or two sink basins set into a counter, with faucets on the wall side. */
function sinks(B, M, g, f, base, room, P) {
  const n = f.sink === 2 ? 2 : 1;
  const wall = wallSide(f, room, true);
  const alongX = wall === '-y' || wall === '+y';
  const len = alongX ? f.w : f.d;
  for (let i = 0; i < n; i++) {
    const c = (len * (i + 0.5)) / n;
    const bw = 1.6;
    const r = alongX
      ? [f.x + c - bw / 2, f.x + c + bw / 2, f.y + 0.35, f.y + f.d - 0.35]
      : [f.x + 0.35, f.x + f.w - 0.35, f.y + c - bw / 2, f.y + c + bw / 2];
    B.box(g, f.label === 'Wet bar' || (room && room.id === 'kitchen') ? M.steel : M.porcelain, ...r, base + f.h - 0.02, base + f.h + 0.01, { shadow: false });
    const fs = strip({ x: r[0], y: r[2], w: r[1] - r[0], d: r[3] - r[2] }, wall, 0.15);
    const off = { '-x': -0.2, '+x': 0.2, '-y': -0.2, '+y': 0.2 }[wall];
    const shifted = alongX ? [fs[0], fs[1], fs[2] + off, fs[3] + off] : [fs[0] + off, fs[1] + off, fs[2], fs[3]];
    faucet(B, P, g, shifted, base + f.h, 1.0);
  }
}

function chairsAround(B, M, g, f, base) {
  const along = f.w >= f.d ? 'x' : 'y';
  const len = along === 'x' ? f.w : f.d;
  const perSide = Math.max(1, Math.floor(f.chairs / 2));
  const s = 1.5;
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < perSide; i++) {
      const t = (len / perSide) * (i + 0.5);
      let x0, y0;
      if (along === 'x') { x0 = f.x + t - s / 2; y0 = side ? f.y + f.d + 0.2 : f.y - s - 0.2; }
      else { y0 = f.y + t - s / 2; x0 = side ? f.x + f.w + 0.2 : f.x - s - 0.2; }
      B.box(g, M.fabric, x0, x0 + s, y0, y0 + s, base, base + 1.5);
      // chair back on the outer edge
      const bk = along === 'x'
        ? (side ? [x0, x0 + s, y0 + s - 0.25, y0 + s] : [x0, x0 + s, y0, y0 + 0.25])
        : (side ? [x0 + s - 0.25, x0 + s, y0, y0 + s] : [x0, x0 + 0.25, y0, y0 + s]);
      B.box(g, M.fabric, ...bk, base, base + 3.2);
    }
  }
}

export const deckFloor = exterior.deck.floor;
