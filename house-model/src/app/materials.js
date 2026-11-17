// Procedural textures and shared materials. Textures are drawn on canvases at
// a known size in feet; geometry carries UVs in feet (see builder.js), so
// `repeat = 1 / tileFeet` keeps every surface at true scale.
import * as THREE from 'three';

function canvasTexture(px, py, draw, tileFtX, tileFtY = tileFtX, srgb = true) {
  const c = document.createElement('canvas');
  c.width = px;
  c.height = py;
  const g = c.getContext('2d');
  draw(g, px, py);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tileFtX, 1 / tileFtY);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// deterministic pseudo-random
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const tex = {
  // white board-and-batten: 1x3 battens every 16"
  siding: () => canvasTexture(256, 64, (g, w, h) => {
    g.fillStyle = '#f4f2ec';
    g.fillRect(0, 0, w, h);
    const batten = w * (2.5 / 16);
    const grad = g.createLinearGradient(0, 0, batten, 0);
    grad.addColorStop(0, '#d9d6cd');
    grad.addColorStop(0.25, '#fbfaf6');
    grad.addColorStop(0.8, '#f1efe8');
    grad.addColorStop(1, '#cfccc2');
    g.fillStyle = grad;
    g.fillRect(0, 0, batten, h);
  }, 16 / 12, 4),
  // ledgestone veneer
  stone: () => canvasTexture(512, 512, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = '#8f8778';
    g.fillRect(0, 0, w, h);
    let y = 0;
    while (y < h) {
      const ch = 18 + r() * 34;
      let x = -r() * 60;
      while (x < w) {
        const cw = 40 + r() * 110;
        const tone = 150 + r() * 70;
        g.fillStyle = `rgb(${tone + 18},${tone + 8},${tone - 12})`;
        g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
        g.fillStyle = 'rgba(0,0,0,0.08)';
        g.fillRect(x + 2, y + ch - 7, cw - 4, 5);
        x += cw;
      }
      y += ch;
    }
  }, 6, 6),
  // black standing-seam metal: seams every 16"
  seam: () => canvasTexture(64, 16, (g, w, h) => {
    g.fillStyle = '#2a2c30';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#4a4e55';
    g.fillRect(0, 0, 3, h);
    g.fillStyle = '#18191b';
    g.fillRect(3, 0, 2, h);
  }, 16 / 12, 4),
  cedar: () => canvasTexture(256, 64, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = '#a8703f';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(${90 + r() * 40},${50 + r() * 20},20,${0.12 + r() * 0.15})`;
      g.fillRect(0, r() * h, w, 1 + r() * 2);
    }
  }, 4, 1),
  oak: () => canvasTexture(512, 512, (g, w, h) => {
    const r = rng(11);
    const plank = h / 8;
    for (let i = 0; i < 8; i++) {
      let x = -r() * w;
      while (x < w) {
        const len = w * (0.4 + r() * 0.5);
        const t = 180 + r() * 30;
        g.fillStyle = `rgb(${t + 25},${t - 5},${t - 55})`;
        g.fillRect(x, i * plank, len, plank);
        g.fillStyle = 'rgba(60,40,20,0.35)';
        g.fillRect(x, i * plank, 2, plank);
        g.fillRect(x, i * plank, len, 1.5);
        x += len;
      }
    }
  }, 5.33),
  tile: () => canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#c9c7c2';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#e8e6e1';
    g.fillRect(3, 3, w / 2 - 6, h - 6);
    g.fillRect(w / 2 + 3, 3, w / 2 - 6, h - 6);
  }, 4, 2),
  carpet: () => canvasTexture(128, 128, (g, w, h) => {
    const r = rng(5);
    g.fillStyle = '#c9bfae';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1600; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? 255 : 90},${r() > 0.5 ? 245 : 80},230,0.06)`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
  }, 2),
  deck: () => canvasTexture(256, 256, (g, w, h) => {
    const r = rng(9);
    const b = h / 12;
    for (let i = 0; i < 12; i++) {
      const t = 105 + r() * 25;
      g.fillStyle = `rgb(${t + 20},${t - 10},${t - 45})`;
      g.fillRect(0, i * b, w, b - 2);
    }
  }, 6),
  // wide-plank light oak LVP: 9" x 6' planks, staggered
  oakLVP: () => canvasTexture(512, 512, (g, w, h) => {
    const r = rng(17);
    const rows = 8;                      // 8 x 9" = 6 ft tile
    const ph = h / rows;
    for (let i = 0; i < rows; i++) {
      let x = -((i * 0.37) % 1) * w * 0.5;
      while (x < w) {
        const len = w * (0.55 + r() * 0.3);
        const t = 200 + r() * 18;
        g.fillStyle = `rgb(${t + 18},${t - 2},${t - 38})`;
        g.fillRect(x, i * ph, len, ph);
        for (let k = 0; k < 6; k++) {
          g.fillStyle = `rgba(150,110,70,${0.06 + r() * 0.08})`;
          g.fillRect(x, i * ph + r() * ph, len, 1);
        }
        g.fillStyle = 'rgba(90,65,40,0.35)';
        g.fillRect(x, i * ph, 1.5, ph);
        x += len;
      }
      g.fillStyle = 'rgba(90,65,40,0.3)';
      g.fillRect(0, i * ph, w, 1);
    }
  }, 6),
  lvpGray: () => canvasTexture(512, 512, (g, w, h) => {
    const r = rng(19);
    const rows = 8;
    const ph = h / rows;
    for (let i = 0; i < rows; i++) {
      let x = -r() * w * 0.5;
      while (x < w) {
        const len = w * (0.5 + r() * 0.35);
        const t = 168 + r() * 16;
        g.fillStyle = `rgb(${t},${t - 2},${t - 6})`;
        g.fillRect(x, i * ph, len, ph);
        g.fillStyle = 'rgba(60,60,60,0.3)';
        g.fillRect(x, i * ph, 1.5, ph);
        x += len;
      }
      g.fillStyle = 'rgba(60,60,60,0.25)';
      g.fillRect(0, i * ph, w, 1);
    }
  }, 5),
  // slate-look tile, 12 x 24
  slate: () => canvasTexture(256, 256, (g, w, h) => {
    const r = rng(23);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const off = (i % 2) * 0.5;
      for (const k of [-1, 0, 1]) {
        const t = 62 + r() * 18;
        g.fillStyle = `rgb(${t},${t + 3},${t + 6})`;
        g.fillRect(((j + off + k) * w) / 2 + 2, (i * h) / 4 + 2, w / 2 - 4, h / 4 - 4);
      }
    }
    for (let n = 0; n < 900; n++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 2, 1); }
  }, 4),
  sealed: () => canvasTexture(256, 256, (g, w, h) => {
    const r = rng(29);
    g.fillStyle = '#a7a59f';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const v = r() > 0.5 ? 255 : 0;
      g.fillStyle = `rgba(${v},${v},${v},0.018)`;
      g.beginPath(); g.arc(r() * w, r() * h, 10 + r() * 40, 0, 7); g.fill();
    }
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, 0, w, 1);   // saw-cut control joints every 10 ft
    g.fillRect(0, 0, 1, h);
  }, 10),
  // 4 x 6 ft black rubber horse-stall mats
  stallMats: () => canvasTexture(256, 384, (g, w, h) => {
    const r = rng(31);
    g.fillStyle = '#1f2021';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.04})`; g.fillRect(r() * w, r() * h, 2, 2); }
    g.fillStyle = '#0b0b0c';
    g.fillRect(0, 0, w, 3);
    g.fillRect(0, 0, 3, h);
  }, 4, 6),
  // painted concrete block, 8 x 16
  block: () => canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#dcdad4';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#c4c1b9';
    const rows = 6; // 6 x 8" = 4 ft tile
    for (let i = 0; i < rows; i++) {
      const y = (i * h) / rows;
      g.fillRect(0, y, w, 3);
      const off = (i % 2) * (w / 6);
      for (let k = 0; k < 4; k++) g.fillRect(off + (k * w) / 3, y, 3, h / rows);
    }
  }, 4),
  // bare drywall: taped joints every 4 ft, screw spots
  drywallBare: () => canvasTexture(256, 512, (g, w, h) => {
    const r = rng(37);
    g.fillStyle = '#d9d6cf';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#ecebe6';
    g.fillRect(0, 0, 14, h);
    g.fillRect(0, h / 2 - 7, w, 14);
    g.fillStyle = 'rgba(120,120,110,0.35)';
    for (let x = 32; x < w; x += 64) for (let y = 16; y < h; y += 48) g.fillRect(x + r() * 2, y, 3, 3);
  }, 4, 8),
  shaker: () => canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,0.16)';
    g.lineWidth = 3;
    g.strokeRect(14, 14, w - 28, h - 28);
    g.strokeStyle = 'rgba(0,0,0,0.25)';
    g.lineWidth = 2;
    g.strokeRect(1, 1, w - 2, h - 2);
  }, 1.5, 2.5, false),
  quartz: () => canvasTexture(256, 256, (g, w, h) => {
    const r = rng(41);
    g.fillStyle = '#f4f3ef';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(150,150,150,0.25)';
    for (let i = 0; i < 6; i++) {
      g.lineWidth = 0.5 + r() * 1.5;
      g.beginPath();
      let x = r() * w;
      let y = 0;
      g.moveTo(x, y);
      while (y < h) { x += (r() - 0.5) * 40; y += 20 + r() * 20; g.lineTo(x, y); }
      g.stroke();
    }
  }, 4),
  concrete: () => canvasTexture(128, 128, (g, w, h) => {
    const r = rng(13);
    g.fillStyle = '#b9b6ae';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(0,0,0,${r() * 0.05})`;
      g.fillRect(r() * w, r() * h, 2, 2);
    }
  }, 6),
};

/** Picture for the sim and theater screens (mapped once across the whole screen). */
function screenTexture(kind) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 288;
  const g = c.getContext('2d');
  if (kind === 'golf') {
    const sky = g.createLinearGradient(0, 0, 0, 160);
    sky.addColorStop(0, '#6fa8dc');
    sky.addColorStop(1, '#cfe6f5');
    g.fillStyle = sky;
    g.fillRect(0, 0, 512, 160);
    g.fillStyle = '#3d6b35';
    g.fillRect(0, 140, 512, 148);
    g.fillStyle = '#5d9a46';
    g.beginPath(); g.moveTo(200, 288); g.lineTo(312, 288); g.lineTo(266, 140); g.lineTo(246, 140); g.closePath(); g.fill();
    g.fillStyle = '#2f4f2a';
    for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(i * 30 + 10, 140, 14 + (i % 3) * 5, Math.PI, 0); g.fill(); }
    g.fillStyle = '#fff';
    g.fillRect(255, 128, 2, 14);
    g.fillStyle = '#e33';
    g.fillRect(257, 128, 8, 5);
  } else {
    const grd = g.createLinearGradient(0, 0, 512, 288);
    grd.addColorStop(0, '#1c2a4a');
    grd.addColorStop(0.55, '#c0672e');
    grd.addColorStop(1, '#f2c26b');
    g.fillStyle = grd;
    g.fillRect(0, 0, 512, 288);
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.beginPath(); g.moveTo(0, 220); g.lineTo(140, 150); g.lineTo(260, 200); g.lineTo(380, 130); g.lineTo(512, 190); g.lineTo(512, 288); g.lineTo(0, 288); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.userData.screen = true;
  return t;
}

const cache = {};
const texture = (name) => (cache[name] ||= tex[name]());

const std = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...opts });

export function makeMaterials() {
  const M = {
    siding: std({ map: texture('siding'), roughness: 0.75 }),
    trimWhite: std({ color: '#f6f4ef', roughness: 0.7 }),
    drywall: std({ color: '#f1eee7', roughness: 0.95 }),
    stone: std({ map: texture('stone'), roughness: 0.95 }),
    roof: std({ map: texture('seam'), roughness: 0.55, metalness: 0.25, color: '#9a9ca0' }),
    black: std({ color: '#1b1c1e', roughness: 0.5, metalness: 0.3 }),
    cedar: std({ map: texture('cedar'), roughness: 0.7 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#9fb3bd', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.28,
      emissive: '#ffb45a', emissiveIntensity: 0, depthWrite: false,
    }),
    oak: std({ map: texture('oak'), roughness: 0.6 }),
    tile: std({ map: texture('tile'), roughness: 0.4 }),
    carpet: std({ map: texture('carpet'), roughness: 1 }),
    concrete: std({ map: texture('concrete'), roughness: 0.95 }),
    deck: std({ map: texture('deck'), roughness: 0.8 }),
    rubber: std({ color: '#2f3331', roughness: 1 }),
    garageDoor: std({ color: '#2b2d30', roughness: 0.5, metalness: 0.4 }),
    water: new THREE.MeshPhysicalMaterial({
      color: '#2f9fc4', roughness: 0.08, metalness: 0, transparent: true, opacity: 0.82,
      clearcoat: 1, depthWrite: false,
    }),
    poolTile: std({ color: '#7fc6dc', roughness: 0.5 }),
    // furniture
    fabric: std({ color: '#d8d2c6', roughness: 1 }),
    leather: std({ color: '#7a4b2c', roughness: 0.6 }),
    wood: std({ color: '#7c5a3c', roughness: 0.6 }),
    cabinet: std({ color: '#f2f0ea', roughness: 0.6 }),
    island: std({ color: '#2b2e33', roughness: 0.5 }),
    counterTop: std({ color: '#efede8', roughness: 0.3 }),
    bedding: std({ color: '#fbfaf7', roughness: 1 }),
    steel: std({ color: '#b9bcc0', roughness: 0.35, metalness: 0.8 }),
    screen: std({ color: '#fafafa', roughness: 1, emissive: '#ffffff', emissiveIntensity: 0.05 }),
    turf: std({ color: '#3f7d3a', roughness: 1 }),
    car: std({ color: '#5b6670', roughness: 0.35, metalness: 0.6 }),
    porcelain: std({ color: '#ffffff', roughness: 0.25 }),
    tv: std({ color: '#0e0f11', roughness: 0.3, metalness: 0.2 }),
    rail: std({ color: '#141516', roughness: 0.4, metalness: 0.6 }),
    leaf: std({ color: '#5d7a3a', roughness: 1 }),
    leafDark: std({ color: '#3f5a2e', roughness: 1 }),
    bark: std({ color: '#5a4636', roughness: 1 }),
    lantern: std({ color: '#f3e3c0', roughness: 0.4, emissive: '#ffc070', emissiveIntensity: 0 }),
    matTurf: std({ color: '#7fbf5a', roughness: 1 }),
    screenGolf: new THREE.MeshBasicMaterial({ map: screenTexture('golf') }),
    screenMovie: new THREE.MeshBasicMaterial({ map: screenTexture('movie') }),
  };
  // finish-level materials (names used in config.finishLevels)
  Object.assign(M, {
    oakLVP: std({ map: texture('oakLVP'), roughness: 0.55 }),
    lvpGray: std({ map: texture('lvpGray'), roughness: 0.55 }),
    slateTile: std({ map: texture('slate'), roughness: 0.6 }),
    sealedConcrete: std({ map: texture('sealed'), roughness: 0.45, metalness: 0.05 }),
    stallMats: std({ map: texture('stallMats'), roughness: 0.95 }),
    paintedBlock: std({ map: texture('block'), roughness: 0.9 }),
    bareDrywall: std({ map: texture('drywallBare'), roughness: 1 }),
    shakerWhite: std({ map: texture('shaker'), roughness: 0.55 }),
    cabinetWhite: std({ color: '#f4f3ef', roughness: 0.6 }),
    navy: std({ color: '#1f2d47', roughness: 0.5, map: texture('shaker') }),
    quartzWhite: std({ map: texture('quartz'), roughness: 0.25 }),
    laminateWhite: std({ color: '#ebe9e3', roughness: 0.5 }),
    matteBlack: std({ color: '#161718', roughness: 0.8, metalness: 0.2 }),
    chrome: std({ color: '#d4d7da', roughness: 0.15, metalness: 1 }),
    fiberglass: std({ color: '#fbfbf8', roughness: 0.3 }),
    acrylic: std({ color: '#ffffff', roughness: 0.2 }),
    duct: std({ color: '#c9ccce', roughness: 0.45, metalness: 0.25 }),
    eBox: std({ color: '#2b5fae', roughness: 0.6 }),
    wire: std({ color: '#e4c24a', roughness: 0.6 }),
  });
  M.navy.color.set('#2a3d60');
  M.get = (name) => {
    if (!M[name]) throw new Error(`unknown material "${name}" in config`);
    return M[name];
  };
  return M;
}

/** Top-down ground paint for the site, `ppf` pixels per foot. */
export function siteTexture(site, extent, ppf = 4) {
  const [x0, y0, x1, y1] = extent;
  const c = document.createElement('canvas');
  c.width = Math.round((x1 - x0) * ppf);
  c.height = Math.round((y1 - y0) * ppf);
  const g = c.getContext('2d');
  const R = (x, y, w, d, fill) => { g.fillStyle = fill; g.fillRect((x - x0) * ppf, (y - y0) * ppf, w * ppf, d * ppf); };
  const r = rng(21);
  // grass with mowing stripes and noise
  g.fillStyle = '#5f8a3c';
  g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < c.width; i += 8 * ppf) {
    g.fillStyle = (i / (8 * ppf)) % 2 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.03)';
    g.fillRect(i, 0, 8 * ppf, c.height);
  }
  for (let i = 0; i < 26000; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? 40 : 120},${90 + r() * 60},30,0.12)`;
    g.fillRect(r() * c.width, r() * c.height, 2, 2);
  }
  // road, driveway, motor court
  R(x0, site.road.y - site.road.width / 2, x1 - x0, site.road.width, '#47494b');
  R(x0, site.road.y - 0.4, x1 - x0, 0.8, '#d8c25a');
  const [[dx, dy0], [, dy1]] = site.driveway.path;
  R(dx - site.driveway.width / 2, dy1, site.driveway.width, dy0 - dy1 + site.road.width / 2, '#cfc8b8');
  // gravel motor court + drive under the breezeway arch
  for (const ct of [].concat(site.courtyard)) R(ct.x, ct.y, ct.w, ct.d, '#cfc8b8');
  R(-14, 24, 12, 16, '#cfc8b8');
  // front walk from the porch steps to the driveway
  R(-2, 50, 32, 5, '#cdc9bf');
  // pool deck (travertine-look pavers)
  const pd = site.poolDeck;
  R(pd.x, pd.y, pd.w, pd.d, '#ddd0b6');
  g.strokeStyle = 'rgba(150,130,100,0.35)';
  g.lineWidth = 1;
  for (let x = pd.x; x <= pd.x + pd.w; x += 2) {
    g.beginPath(); g.moveTo((x - x0) * ppf, (pd.y - y0) * ppf); g.lineTo((x - x0) * ppf, (pd.y + pd.d - y0) * ppf); g.stroke();
  }
  for (let y = pd.y; y <= pd.y + pd.d; y += 2) {
    g.beginPath(); g.moveTo((pd.x - x0) * ppf, (y - y0) * ppf); g.lineTo((pd.x + pd.w - x0) * ppf, (y - y0) * ppf); g.stroke();
  }
  // covered patio
  const cp = site.coveredPatio;
  R(cp.x, cp.y, cp.w, cp.d, '#c9c4b8');
  // concrete pavers with grass strips
  const pg = site.paverGrid;
  R(pg.x, pg.y, pg.w, pg.d, '#5f8a3c');
  const pitch = pg.paver + pg.grass;
  const nx = Math.floor((pg.w + pg.grass) / pitch);
  const ny = Math.floor((pg.d + pg.grass) / pitch);
  const ox = pg.x + (pg.w - (nx * pitch - pg.grass)) / 2;
  const oy = pg.y + (pg.d - (ny * pitch - pg.grass)) / 2;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) R(ox + i * pitch, oy + j * pitch, pg.paver, pg.paver, '#d3d0c8');
  // pool coping
  const p = site.pool;
  R(p.x - 1.5, p.y - 1.5, p.w + 3, p.d + 3, '#efe9dc');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
