// First-person walkthrough: WASD / arrows to move, mouse to look (pointer
// lock, or click-and-drag), Shift to run. On touch screens: drag the view to
// look and use the on-screen joystick (`walker.joy`) to move. Collides with walls, railings and
// glass; follows floors, stairs, steps and terrain.
import { build } from '../config/house.js';
import { grade, terrainHoles, poolHole } from '../model/terrain.js';

const STEP = 1.15;     // tallest step you can walk up, ft
const RADIUS = 0.7;    // body half-width, ft
const WALK = 5;        // ft/s
const RUN = 11;

export class Walker {
  constructor(camera, dom, { colliders, surfaces }) {
    this.camera = camera;
    this.dom = dom;
    this.colliders = colliders;
    this.surfaces = surfaces;
    this.active = false;
    this.keys = new Set();
    this.pos = { x: 0, y: 0 };
    this.feet = 0;
    this.eyeZ = 0;
    this.vz = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.locked = false;
    this.dragging = false;
    this.onChange = () => {};
    this.phase = 1;   // colliders / surfaces tagged with another phase are ignored
    this.joy = { x: 0, y: 0 };   // on-screen joystick, -1..1 (y < 0 = forward)
    this.lookId = null;          // pointer currently dragging the view
    this.lastPointerType = 'mouse';

    addEventListener('keydown', (e) => {
      if (!this.active) return;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        this.keys.add(e.code);
        e.preventDefault();
      }
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    dom.addEventListener('click', () => {
      if (this.active && !this.locked && this.lastPointerType === 'mouse' && dom.requestPointerLock) {
        try { const p = dom.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch { /* not allowed in this frame */ }
      }
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === dom;
      this.onChange();
    });
    dom.addEventListener('pointerdown', (e) => {
      this.lastPointerType = e.pointerType;
      if (this.active && !this.locked && this.lookId === null) {
        this.dragging = true; this.lookId = e.pointerId; this.lastX = e.clientX; this.lastY = e.clientY;
      }
    });
    const release = (e) => { if (e.pointerId === this.lookId) { this.dragging = false; this.lookId = null; } };
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);
    addEventListener('pointermove', (e) => {
      if (!this.active) return;
      let dx = 0;
      let dy = 0;
      if (this.locked) { dx = e.movementX; dy = e.movementY; }
      else if (this.dragging && e.pointerId === this.lookId) { dx = e.clientX - this.lastX; dy = e.clientY - this.lastY; this.lastX = e.clientX; this.lastY = e.clientY; }
      else return;
      const k = e.pointerType === 'touch' ? 0.0042 : 0.0024;
      this.yaw += dx * k;
      this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch - dy * k));
    });
  }

  /** Highest walkable height at (x, y) no more than one step above `ref`. */
  groundAt(x, y, ref) {
    let best = -Infinity;
    const consider = (h) => { if (h <= ref + STEP && h > best) best = h; };
    let indoors = false;
    for (const s of this.surfaces) {
      if (s.phase && s.phase !== this.phase) continue;
      if (x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1) {
        consider(typeof s.h === 'function' ? s.h(x, y) : s.h);
      }
    }
    for (const r of terrainHoles) if (x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.d) indoors = true;
    const p = poolHole;
    if (this.phase === 2 && x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.d) indoors = true;
    if (!indoors) consider(grade(x, y));
    return best;
  }

  blocked(x, y, feet) {
    const z0 = feet + STEP + 0.05;
    const z1 = feet + build.eyeHeight + 0.2;
    for (const c of this.colliders) {
      if (c.phase && c.phase !== this.phase) continue;
      if (x + RADIUS > c.x0 && x - RADIUS < c.x1 && y + RADIUS > c.y0 && y - RADIUS < c.y1 && z1 > c.z0 && z0 < c.z1) return true;
    }
    return false;
  }

  /** Stand at plan point `at` near elevation `refZ`, facing plan point `look`. */
  enter(at, look, refZ, pitch = -0.04) {
    this.active = true;
    this.pos = { x: at[0], y: at[1] };
    const g = this.groundAt(at[0], at[1], refZ + 0.5);
    this.feet = Number.isFinite(g) ? g : refZ;
    this.eyeZ = this.feet + build.eyeHeight;
    this.vz = 0;
    this.yaw = Math.atan2(look[1] - at[1], look[0] - at[0]);
    this.pitch = pitch;
    this.apply();
  }

  exit() {
    this.active = false;
    this.keys.clear();
    this.joy = { x: 0, y: 0 };
    this.dragging = false;
    this.lookId = null;
    if (document.pointerLockElement === this.dom) document.exitPointerLock();
  }

  update(dt) {
    if (!this.active) return;
    dt = Math.min(dt, 0.05);
    const k = this.keys;
    const fwd = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - this.joy.y;
    const side = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) + this.joy.x;
    const turn = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0);
    this.yaw += turn * dt * 1.8;
    // a full joystick push walks a little faster than the keyboard walk
    const joyMag = Math.hypot(this.joy.x, this.joy.y);
    const base = k.has('ShiftLeft') || k.has('ShiftRight') ? RUN : joyMag > 0.92 ? WALK * 1.5 : WALK;
    const speed = base * dt;
    const fx = Math.cos(this.yaw);
    const fy = Math.sin(this.yaw);
    let mx = (fx * fwd - fy * side);
    let my = (fy * fwd + fx * side);
    const len = Math.hypot(mx, my);
    if (len > 0.04) {
      const throttle = Math.min(1, len);   // keys = full speed, joystick = analog
      mx = (mx / len) * speed * throttle;
      my = (my / len) * speed * throttle;
      // move in small sub-steps so fast movement can't tunnel through thin walls
      const n = Math.ceil(Math.max(Math.abs(mx), Math.abs(my)) / 0.2);
      for (let i = 0; i < n; i++) {
        const nx = this.pos.x + mx / n;
        if (!this.blocked(nx, this.pos.y, this.feet) && Number.isFinite(this.groundAt(nx, this.pos.y, this.feet))) this.pos.x = nx;
        const ny = this.pos.y + my / n;
        if (!this.blocked(this.pos.x, ny, this.feet) && Number.isFinite(this.groundAt(this.pos.x, ny, this.feet))) this.pos.y = ny;
        const g = this.groundAt(this.pos.x, this.pos.y, this.feet);
        if (g > this.feet) { this.feet = g; this.vz = 0; }
      }
    }
    // gravity
    const g = this.groundAt(this.pos.x, this.pos.y, this.feet);
    if (g < this.feet - 1e-3) {
      this.vz -= 32 * dt;
      this.feet = Math.max(g, this.feet + this.vz * dt);
    } else {
      this.feet = Math.max(this.feet, g);
      this.vz = 0;
    }
    this.eyeZ += (this.feet + build.eyeHeight - this.eyeZ) * Math.min(1, dt * 14);
    this.apply();
  }

  apply() {
    const c = this.camera;
    c.position.set(this.pos.x, this.eyeZ, this.pos.y);
    const cp = Math.cos(this.pitch);
    c.lookAt(this.pos.x + Math.cos(this.yaw) * cp, this.eyeZ + Math.sin(this.pitch), this.pos.y + Math.sin(this.yaw) * cp);
  }
}
