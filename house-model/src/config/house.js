// ─────────────────────────────────────────────────────────────────────────────
// HOUSE PLAN CONFIG — the single source of truth for every dimension.
// Edit numbers here; the plan view and the 3D model both rebuild from this file.
//
// UNITS        Feet (decimals: 2.5 = 2'-6").
//
// PLAN AXES    x = distance from the house's LEFT exterior wall, left as seen
//                  from the front (south → north).
//              y = distance from the REAR (west) wall toward the FRONT (east).
//                  The pool is at negative y, the street at large positive y.
//
// ELEVATIONS   Relative to the main-floor finished floor (= 0). Up is positive.
//
// ROOMS        { id, name, x, y, w, d } — x,y is the corner nearest the origin,
//              w is width (x), d is depth (y).
//              Walls are generated automatically around every room.
//              Any part of a floor's `footprint` not covered by a room becomes
//              hallway (id '_hall') automatically.
//
// OPEN PLAN    openPlan: [['kitchen','dining']] removes the wall between two
//              rooms entirely. Use '_hall' for the hallway.
//
// OPENINGS     { kind, on, at, from, to }
//              on:'y', at:0, from:20, to:32 → a hole in the wall lying on the
//              line y = 0, running from x = 20 to x = 32.
//              on:'x', at:16, ...           → wall on the line x = 16, running
//              from y = from to y = to.
//              kinds: door, entry, glassdoor, window, passthrough, opening
//              (cased, no door), railing (open with guard rail), garage.
//              Optional: sill, head (ft above that floor), swing: -1 to flip.
// ─────────────────────────────────────────────────────────────────────────────

export const meta = {
  name: 'Modern White Farmhouse',
  frontFaces: 'east',
  targetAreas: { main: 2860, upper: 1330, basement: 1830 },
};

// Structure / defaults -------------------------------------------------------
export const build = {
  exteriorWall: 0.5,
  interiorWall: 0.375,
  floorStructure: 1.5,    // joists + subfloor between levels
  doorHeight: 8,
  windowSill: 2.5,
  windowHead: 8,
  eyeHeight: 6 + 2 / 12,  // walkthrough camera, 6'-2"
};

const MAIN_BLOCK = { x: 0, y: 0, w: 52, d: 38 };
const WING = { x: 52, y: 4, w: 26, d: 34 };

// Floors ----------------------------------------------------------------------
// floor = finished-floor elevation, ceiling = clear ceiling height.
export const floors = {
  // ═══════════════════════════ MAIN FLOOR ═══════════════════════════════════
  main: {
    name: 'Main Floor',
    floor: 0,
    ceiling: 10,
    footprint: [MAIN_BLOCK, WING],
    rooms: [
      // — two-story main block —
      { id: 'mudroom', name: 'Mudroom',        use: 'service', x: 0,  y: 0,  w: 10, d: 12 },
      { id: 'pantry',  name: 'Pantry',         use: 'service', x: 10, y: 0,  w: 6,  d: 10 },
      { id: 'kitchen', name: 'Kitchen',        use: 'living',  x: 16, y: 0,  w: 20, d: 15 },
      { id: 'dining',  name: 'Dining',         use: 'living',  x: 36, y: 0,  w: 16, d: 14 },
      { id: 'halfBath',name: 'Half Bath',      use: 'bath',    x: 0,  y: 13, w: 6,  d: 6 },
      { id: 'stair',   name: 'Stairs',         use: 'circ',    x: 7,  y: 12, w: 9,  d: 9, stair: true },
      { id: 'living',  name: 'Living Room',    use: 'living',  x: 16, y: 15, w: 20, d: 16,
        vaulted: true, note: 'vaulted, open to above' },
      { id: 'den',     name: 'TV Den',         use: 'living',  x: 39, y: 15, w: 13, d: 12 },
      { id: 'office',  name: 'Shared Office',  use: 'work',    x: 0,  y: 24, w: 16, d: 14 },
      { id: 'foyer',   name: 'Foyer',          use: 'circ',    x: 20, y: 31, w: 12, d: 7,
        vaulted: true, note: 'open to above' },
      { id: 'powder',  name: 'Powder Room',    use: 'bath',    x: 39, y: 27, w: 6,  d: 11 },
      { id: 'coat',    name: 'Coat Closet',    use: 'service', x: 45, y: 27, w: 7,  d: 11 },
      // — one-story primary wing (crawlspace below) —
      { id: 'primaryBed',    name: 'Primary Bedroom', use: 'bed',     x: 52, y: 4,  w: 16, d: 16 },
      { id: 'primaryCloset', name: 'Primary Closet',  use: 'service', x: 68, y: 4,  w: 10, d: 9 },
      { id: 'primaryBath',   name: 'Primary Bath',    use: 'bath',    x: 68, y: 13, w: 10, d: 14 },
      { id: 'laundry',       name: 'Laundry',         use: 'service', x: 52, y: 28, w: 9,  d: 10 },
      { id: 'coffee',        name: 'Coffee Bar / Sitting', use: 'living', x: 61, y: 28, w: 17, d: 10 },
      // — 3-car garage (suggested position; slab 1 ft below main floor) —
      { id: 'garage', name: '3-Car Garage', use: 'garage', x: -52, y: -7, w: 36, d: 24,
        floorOffset: -1, finished: false },
    ],
    openPlan: [
      ['kitchen', 'dining'], ['kitchen', 'living'], ['kitchen', '_hall'],
      ['dining', '_hall'], ['living', '_hall'], ['living', 'foyer'],
      ['foyer', '_hall'], ['coffee', '_hall'],
    ],
    openings: [
      // rear wall (y = 0) — glass onto the deck
      { kind: 'window',      on: 'y', at: 0, from: 2,  to: 8 },
      { kind: 'passthrough', on: 'y', at: 0, from: 20, to: 32, sill: 3.5, head: 8 },
      { kind: 'glassdoor',   on: 'y', at: 0, from: 38, to: 50 },
      { kind: 'window',      on: 'y', at: 4, from: 55, to: 65, sill: 1.5 },   // primary bedroom
      { kind: 'window',      on: 'y', at: 4, from: 71, to: 75, sill: 5 },
      // front wall (y = 38)
      { kind: 'entry',  on: 'y', at: 38, from: 23, to: 29 },
      { kind: 'window', on: 'y', at: 38, from: 3,  to: 7 },
      { kind: 'window', on: 'y', at: 38, from: 9,  to: 13 },
      { kind: 'window', on: 'y', at: 38, from: 41, to: 43, sill: 4.5 },
      { kind: 'window', on: 'y', at: 38, from: 54.5, to: 58.5, sill: 3.5 },
      { kind: 'window', on: 'y', at: 38, from: 64, to: 75 },
      // side walls
      { kind: 'window', on: 'x', at: 0,  from: 28, to: 34 },                  // office
      { kind: 'window', on: 'x', at: 0,  from: 15, to: 17, sill: 4.5 },       // half bath
      { kind: 'door',   on: 'x', at: 0,  from: 5,  to: 8 },                   // mudroom ↔ breezeway
      { kind: 'window', on: 'x', at: 78, from: 18, to: 22, sill: 3.5 },
      { kind: 'window', on: 'x', at: 78, from: 31, to: 35 },
      // interior — main block
      { kind: 'door',    on: 'x', at: 10, from: 6,    to: 8.7 },              // mudroom ↔ pantry
      { kind: 'door',    on: 'x', at: 16, from: 6,    to: 8.7 },              // pantry ↔ kitchen
      { kind: 'opening', on: 'x', at: 10, from: 10.1, to: 11.9 },             // mudroom → kitchen nook
      { kind: 'opening', on: 'x', at: 16, from: 12.4, to: 20.6 },             // stairs
      { kind: 'door',    on: 'y', at: 19, from: 2,    to: 4.5, swing: -1 },   // half bath
      { kind: 'door',    on: 'y', at: 24, from: 2,    to: 5 },                // office (back hall)
      { kind: 'door',    on: 'x', at: 16, from: 32.5, to: 36.5, swing: -1 },  // office french doors
      { kind: 'opening', on: 'x', at: 39, from: 18,   to: 24 },               // den
      { kind: 'door',    on: 'x', at: 39, from: 29,   to: 31.7 },             // powder
      { kind: 'door',    on: 'y', at: 27, from: 46,   to: 49 },               // coat closet (from den)
      // interior — primary wing
      { kind: 'door',    on: 'x', at: 52, from: 23.7, to: 26.7 },             // den → wing hall
      { kind: 'door',    on: 'y', at: 20, from: 54,   to: 57, swing: -1 },    // bedroom
      { kind: 'door',    on: 'x', at: 68, from: 8,    to: 10.7 },             // closet
      { kind: 'door',    on: 'x', at: 68, from: 15,   to: 17.7 },             // bath
      { kind: 'door',    on: 'y', at: 28, from: 55,   to: 58 },               // laundry
      // garage — overhead doors face the rear courtyard
      { kind: 'garage', on: 'y', at: -7, from: -50, to: -41 },
      { kind: 'garage', on: 'y', at: -7, from: -39, to: -30 },
      { kind: 'garage', on: 'y', at: -7, from: -28, to: -19 },
      { kind: 'door',   on: 'x', at: -16, from: 6, to: 9, swing: -1 },        // garage ↔ breezeway
      { kind: 'window', on: 'y', at: 17, from: -45, to: -41 },
      { kind: 'window', on: 'y', at: 17, from: -36, to: -32 },
      { kind: 'window', on: 'y', at: 17, from: -27, to: -23 },
    ],
    furniture: [
      // kitchen
      { type: 'counter', x: 18,   y: 0.3, w: 16,  d: 2,   h: 3 },             // under pass-through
      { type: 'tall',    x: 16.3, y: 9.2, w: 2.4, d: 2.9, h: 7.5 },           // fridge
      { type: 'island',  x: 20,   y: 7.5, w: 12,  d: 4,   h: 3, label: 'Island' },
      // dining
      { type: 'table', x: 39.5, y: 5.5, w: 9, d: 3.5, h: 2.5, chairs: 8, label: 'Table' },
      // living
      { type: 'fireplace', x: 16.2, y: 24.5, w: 1.8, d: 6, h: 22 },
      { type: 'sofa',  x: 25,   y: 23.5, w: 3.3, d: 8, h: 2.8, faces: '-x', label: 'Sofa' },
      { type: 'table', x: 20.5, y: 25.5, w: 2.5, d: 4, h: 1.4 },
      { type: 'chair', x: 30.5, y: 17,   w: 3,   d: 3, h: 2.7 },
      { type: 'chair', x: 30.5, y: 21,   w: 3,   d: 3, h: 2.7 },
      // den
      { type: 'tv',    x: 42,   y: 15.3, w: 6,   d: 1.5, h: 2 },
      { type: 'sofa',  x: 48.2, y: 15.5, w: 3.5, d: 7.5, h: 2.8, faces: '-x' },
      { type: 'table', x: 43.5, y: 19,   w: 3,   d: 2.5, h: 1.3 },
      // office — two desks
      { type: 'desk',  x: 1.5,  y: 35,   w: 6, d: 2.5, h: 2.5 },
      { type: 'desk',  x: 8.5,  y: 35,   w: 6, d: 2.5, h: 2.5 },
      { type: 'chair', x: 3.5,  y: 32.6, w: 2, d: 2,   h: 3 },
      { type: 'chair', x: 10.5, y: 32.6, w: 2, d: 2,   h: 3 },
      // mudroom / pantry
      { type: 'tall',  x: 2,    y: 10.2, w: 6.5, d: 1.6, h: 7 },              // lockers
      { type: 'bench', x: 0.3,  y: 0.8,  w: 1.5, d: 3.5, h: 1.5 },
      { type: 'tall',  x: 10.3, y: 0.3,  w: 5.4, d: 1.5, h: 7 },
      // primary suite
      { type: 'bed',     x: 52.3, y: 8.5,  w: 7.2, d: 6.5, h: 2.2, label: 'King' },
      { type: 'table',   x: 52.3, y: 6.3,  w: 1.7, d: 2,   h: 2 },
      { type: 'table',   x: 52.3, y: 15.2, w: 1.7, d: 2,   h: 2 },
      { type: 'dresser', x: 60,   y: 18,   w: 6,   d: 1.8, h: 3 },
      { type: 'counter', x: 75.7, y: 14,   w: 2,   d: 8,   h: 3 },            // double vanity
      { type: 'tub',     x: 70.5, y: 23.8, w: 5.5, d: 2.9, h: 2 },
      { type: 'shower',  x: 68.3, y: 18.5, w: 3.5, d: 4.5, h: 7.5 },
      { type: 'tall',    x: 76,   y: 4.3,  w: 1.7, d: 8.4, h: 7 },
      { type: 'appliance', x: 52.3, y: 35.2, w: 5.4, d: 2.5, h: 3.3 },        // washer / dryer
      { type: 'counter', x: 75.7, y: 29,   w: 2,   d: 6,   h: 3 },            // coffee bar
      { type: 'chair',   x: 63,   y: 33,   w: 3,   d: 3,   h: 2.7 },
      { type: 'chair',   x: 67.5, y: 33,   w: 3,   d: 3,   h: 2.7 },
      // garage — three cars for scale
      { type: 'car', x: -48.5, y: -3, w: 6, d: 16, h: 5 },
      { type: 'car', x: -37.5, y: -3, w: 6, d: 16, h: 5 },
      { type: 'car', x: -26.5, y: -3, w: 6, d: 16, h: 5 },
    ],
  },

  // ═══════════════════════════ UPPER FLOOR ══════════════════════════════════
  upper: {
    name: 'Upper Floor',
    floor: 11.5,          // 10 ft main ceiling + 1.5 ft structure
    ceiling: 9,
    footprint: [MAIN_BLOCK],
    rooms: [
      // Bedroom 1 was listed 13 x 13, but that overlaps the stairs by 1 ft
      // (stairs start at y = 12) — trimmed to 13 x 12.
      { id: 'bed1',    name: 'Bedroom 1',     use: 'bed',     x: 0,  y: 0,  w: 13, d: 12 },
      { id: 'jjBath',  name: 'Jack & Jill Bath', use: 'bath', x: 0,  y: 14, w: 7,  d: 10 },
      { id: 'stair',   name: 'Stairs',        use: 'circ',    x: 7,  y: 12, w: 9,  d: 9, stair: true, finished: false },
      { id: 'bed2',    name: 'Bedroom 2',     use: 'bed',     x: 0,  y: 25, w: 13, d: 13 },
      { id: 'loft',    name: "Kids' Loft",    use: 'living',  x: 16, y: 0,  w: 20, d: 15 },
      { id: 'livingVoid', name: 'Open to Living Room', use: 'void', x: 16, y: 15, w: 20, d: 16, void: true },
      { id: 'foyerVoid',  name: 'Open to Foyer',       use: 'void', x: 20, y: 31, w: 12, d: 7,  void: true },
      { id: 'bed3',    name: 'Bedroom 3',     use: 'bed',     x: 39, y: 0,  w: 13, d: 13 },
      { id: 'bath2',   name: 'Bath 2',        use: 'bath',    x: 39, y: 14, w: 8,  d: 10 },
      { id: 'laundry2',name: 'Laundry',       use: 'service', x: 47, y: 14, w: 5,  d: 8 },
      { id: 'attic',   name: 'Attic Storage', use: 'service', x: 39, y: 25, w: 13, d: 13, finished: false, note: 'unfinished' },
    ],
    openPlan: [['loft', '_hall'], ['livingVoid', 'foyerVoid']],
    openings: [
      // guard rails around the open-to-below areas
      { kind: 'railing', on: 'y', at: 15, from: 16, to: 36 },                 // loft front edge
      { kind: 'railing', on: 'x', at: 36, from: 15, to: 31 },
      { kind: 'railing', on: 'x', at: 16, from: 21, to: 31 },
      { kind: 'railing', on: 'y', at: 31, from: 16, to: 20 },
      { kind: 'railing', on: 'x', at: 20, from: 31, to: 38 },
      { kind: 'railing', on: 'y', at: 31, from: 32, to: 36 },
      { kind: 'railing', on: 'x', at: 32, from: 31, to: 38 },
      // stairs: open to the loft and to the front hall
      { kind: 'opening', on: 'x', at: 16, from: 12.3, to: 14.7 },
      { kind: 'opening', on: 'y', at: 21, from: 12.5, to: 15.7 },
      // doors
      { kind: 'door', on: 'x', at: 13, from: 8,  to: 11 },                    // bed 1
      { kind: 'door', on: 'y', at: 12, from: 2,  to: 5, swing: -1 },          // bed 1 → bath
      { kind: 'door', on: 'y', at: 14, from: 2,  to: 4.5 },                   // J&J bath (rear)
      { kind: 'door', on: 'y', at: 24, from: 2,  to: 4.5, swing: -1 },        // J&J bath (front)
      { kind: 'door', on: 'y', at: 25, from: 2,  to: 5 },                     // bed 2 → bath
      { kind: 'door', on: 'x', at: 13, from: 28, to: 31 },                    // bed 2
      { kind: 'door', on: 'x', at: 39, from: 8,  to: 11, swing: -1 },         // bed 3
      { kind: 'door', on: 'x', at: 39, from: 15, to: 17.7, swing: -1 },       // bath 2
      { kind: 'door', on: 'y', at: 22, from: 48, to: 50.7, swing: -1 },       // laundry
      { kind: 'door', on: 'x', at: 39, from: 30, to: 32.7, swing: -1 },       // attic
      // windows — rear
      { kind: 'window', on: 'y', at: 0, from: 3,  to: 9 },
      { kind: 'window', on: 'y', at: 0, from: 19, to: 33, sill: 1.5 },        // rear gable glass
      { kind: 'window', on: 'y', at: 0, from: 42, to: 48 },
      // windows — front
      { kind: 'window', on: 'y', at: 38, from: 3,    to: 9 },
      { kind: 'window', on: 'y', at: 38, from: 22.5, to: 29.5, sill: 1.5 },   // front gable glass
      { kind: 'window', on: 'y', at: 38, from: 43,   to: 47, sill: 4 },
      // windows — sides
      { kind: 'window', on: 'x', at: 0,  from: 4,  to: 8 },
      { kind: 'window', on: 'x', at: 0,  from: 18, to: 20, sill: 4.5 },
      { kind: 'window', on: 'x', at: 0,  from: 30, to: 34 },
    ],
    furniture: [
      { type: 'bed',  x: 0.3, y: 3,    w: 6.7, d: 5, h: 2.2, label: 'Queen' },
      { type: 'desk', x: 4,   y: 0.3,  w: 5,   d: 2, h: 2.5 },
      { type: 'bed',  x: 0.3, y: 31.5, w: 6.7, d: 5, h: 2.2, label: 'Queen' },
      { type: 'desk', x: 4,   y: 35.7, w: 5,   d: 2, h: 2.5 },
      { type: 'bed',  x: 45,  y: 3,    w: 6.7, d: 5, h: 2.2, label: 'Queen' },
      { type: 'desk', x: 41,  y: 0.3,  w: 5,   d: 2, h: 2.5 },
      { type: 'sofa',  x: 22, y: 9.5, w: 8, d: 3.2, h: 2.8, faces: '-y', label: 'Sofa' },
      { type: 'table', x: 24, y: 5,   w: 4, d: 2.5, h: 1.4 },
      { type: 'tub',     x: 0.3,  y: 16.5, w: 2.7, d: 5,   h: 1.8 },
      { type: 'counter', x: 4.8,  y: 16.5, w: 1.9, d: 5,   h: 3 },
      { type: 'tub',     x: 41.5, y: 21,   w: 5,   d: 2.7, h: 1.8 },
      { type: 'counter', x: 44.8, y: 14.3, w: 1.9, d: 5,   h: 3 },
      { type: 'appliance', x: 47.3, y: 14.3, w: 4.4, d: 2.5, h: 3.3 },
    ],
  },

  // ═════════════════════════ WALKOUT BASEMENT ═══════════════════════════════
  basement: {
    name: 'Walkout Basement',
    floor: -10.5,         // 9 ft ceiling + 1.5 ft structure below the main floor
    ceiling: 9,
    footprint: [MAIN_BLOCK],
    rooms: [
      // rear (y = 0) walks out to the patio; front (y = 38) is below grade
      { id: 'guest',     name: 'Guest Suite',     use: 'bed',  x: 0,  y: 0,  w: 16, d: 12 },
      { id: 'guestBath', name: 'Guest / Pool Bath', use: 'bath', x: 0, y: 12, w: 7,  d: 8 },
      { id: 'stair',     name: 'Stairs',          use: 'circ', x: 7,  y: 12, w: 9,  d: 9, stair: true, finished: false },
      { id: 'lounge',    name: 'Sports Lounge & Bar', use: 'rec', x: 16, y: 0, w: 20, d: 18 },
      { id: 'gym',       name: 'Gym',             use: 'rec',  x: 36, y: 0,  w: 16, d: 16 },
      { id: 'sim',       name: 'Golf Sim Bay',    use: 'rec',  x: 36, y: 16, w: 16, d: 22,
        floorOffset: -2, ceiling: 11, note: "11' ceiling, slab dropped 2'" },
      { id: 'theater',   name: 'Theater',         use: 'rec',  x: 16, y: 18, w: 20, d: 20 },
      { id: 'mechanical',name: 'Mechanical',      use: 'service', x: 0, y: 22, w: 16, d: 9, finished: false },
      { id: 'safe',      name: 'Storm Safe Room', use: 'service', x: 0, y: 31, w: 16, d: 7, finished: false },
    ],
    openPlan: [],
    openings: [
      // walkout wall (y = 0) — glass onto the covered patio
      { kind: 'glassdoor', on: 'y', at: 0, from: 3,  to: 13 },
      { kind: 'glassdoor', on: 'y', at: 0, from: 18, to: 34 },
      { kind: 'glassdoor', on: 'y', at: 0, from: 38, to: 50 },
      // interior
      { kind: 'opening', on: 'x', at: 16, from: 12.4, to: 17.6 },             // stairs → lounge
      { kind: 'door',    on: 'x', at: 16, from: 8,    to: 11, swing: -1 },    // guest suite
      { kind: 'door',    on: 'y', at: 12, from: 2,    to: 4.7 },              // guest → bath
      { kind: 'door',    on: 'y', at: 20, from: 2.5,  to: 5.2 },              // bath → back hall
      { kind: 'opening', on: 'y', at: 21, from: 7.5,  to: 10.5 },             // back hall ↔ stairs
      { kind: 'opening', on: 'x', at: 36, from: 5,    to: 11 },               // gym
      { kind: 'opening', on: 'y', at: 16, from: 38,   to: 42 },               // sim bay (steps down)
      { kind: 'door',    on: 'y', at: 18, from: 17,   to: 20 },               // theater
      { kind: 'door',    on: 'y', at: 22, from: 11,   to: 14 },               // mechanical
      { kind: 'door',    on: 'y', at: 31, from: 6,    to: 9 },                // safe room (steel)
    ],
    furniture: [
      // theater — screen on the front wall, two rows of four recliners
      { type: 'screen',   x: 19.5, y: 37.4, w: 13, d: 0.3, h: 7.3, elev: 1.5, label: 'Screen' },
      { type: 'recliner', x: 22,   y: 26.5, w: 12, d: 3.3, h: 3.3, seats: 4, faces: '+y' },
      { type: 'platform', x: 21,   y: 18.5, w: 14, d: 5.5, h: 1 },
      { type: 'recliner', x: 22,   y: 19.6, w: 12, d: 3.3, h: 3.3, seats: 4, faces: '+y', elev: 1 },
      // golf sim — hitting toward the front wall
      { type: 'screen', x: 37.5, y: 37.2, w: 13, d: 0.3, h: 9.5, elev: 0.5, label: 'Impact screen' },
      { type: 'mat',    x: 41.5, y: 24,   w: 5,  d: 5,   h: 0.15, label: 'Hitting mat' },
      { type: 'steps',  x: 38,   y: 16,   w: 4,  d: 3,   h: 2 },
      { type: 'sofa',   x: 44,   y: 16.5, w: 7,  d: 3,   h: 2.6, faces: '+y' },
      // sports lounge
      { type: 'counter', x: 22,   y: 15.7, w: 13,  d: 2,   h: 3,   label: 'Wet bar' },
      { type: 'island',  x: 22,   y: 11.5, w: 13,  d: 2,   h: 3.5 },
      { type: 'tv',      x: 34.2, y: 0.8,  w: 1.5, d: 4,   h: 2 },
      { type: 'sofa',    x: 24,   y: 2,    w: 3.5, d: 7.5, h: 2.8, faces: '+x', label: 'Sofa' },
      { type: 'table',   x: 29,   y: 4,    w: 2.5, d: 3.5, h: 1.4 },
      // gym
      { type: 'equipment', x: 38, y: 12,  w: 6.5, d: 3,   h: 4.5 },
      { type: 'equipment', x: 46, y: 10.5, w: 5,  d: 4.5, h: 7.5 },
      { type: 'bench',     x: 44, y: 3,   w: 1.8, d: 5,   h: 1.5 },
      // guest suite
      { type: 'bed',     x: 0.3, y: 3.5,  w: 6.7, d: 5, h: 2.2, label: 'Queen' },
      { type: 'shower',  x: 0.3, y: 16.7, w: 3,   d: 3, h: 7.5 },
      { type: 'counter', x: 5,   y: 13.5, w: 1.7, d: 4, h: 3 },
      // mechanical
      { type: 'appliance', x: 1, y: 27, w: 3,   d: 3,   h: 6 },
      { type: 'appliance', x: 5, y: 28, w: 2.2, d: 2.2, h: 5.5 },
    ],
  },
};

// One 9 x 9 stair serves all three levels, entered from the x = 16 side.
export const stair = { x: 7, y: 12, w: 9, d: 9, landing: 3.5 };

// Exterior structures ----------------------------------------------------------
export const exterior = {
  porch: {
    x: 0, y: 38, w: 52, d: 8, floor: -0.5,
    postSpacing: 10.4, postSize: 0.8,       // cedar posts on stone bases
    steps: { x: 22, w: 8 },                 // centered on the front door
    roofLow: 10, roofHigh: 11.5,            // shed roof under the upper windows
  },
  deck: {
    x: 0, y: -14, w: 52, d: 14, floor: -0.15,
    pierSpacing: 13, pierSize: 2,           // stone piers down to the patio
    railing: 'cable', railHeight: 3.5,
    stairs: { x: 0, y: -30, w: 4, d: 16 },  // down to the patio, garage side
    barCounter: { x: 20, y: -1.8, w: 12, d: 1.5, h: 3.5 }, // outside the pass-through
  },
  // Arched drive-through between house and garage. Cars pass front → back.
  breezeway: {
    x: -16, y: 1, w: 16, d: 16,
    floorOffset: -1, wallHeight: 12,
    archWidth: 12, archSpring: 7.5, archTop: 10.5,
  },
  roofs: [
    // eave = height of the eave line above main floor. pitch = rise per 12.
    { id: 'main',   type: 'gable', x: 0,   y: 0,  w: 52, d: 38, ridge: 'x', eave: 20.5, pitch: 8,  overhang: 1.5 },
    // center gable, front and rear, over the foyer / living vault / loft
    { id: 'center', type: 'crossGable', centerX: 26, width: 22, eave: 20.5, pitch: 12, overhang: 1.5, brackets: 'cedar' },
    { id: 'wing',   type: 'gable', x: 52,  y: 4,  w: 26, d: 34, ridge: 'y', eave: 11, pitch: 8, overhang: 1.5 },
    { id: 'breezeway', type: 'gable', x: -16, y: 1, w: 16, d: 16, ridge: 'y', eave: 12, pitch: 8, overhang: 1 },
    { id: 'garage', type: 'gable', x: -52, y: -7, w: 36, d: 24, ridge: 'x', eave: 10, pitch: 8, overhang: 1.5 },
  ],
  wainscotHeight: 3.5,   // stone veneer band on the main-level walls
};

// Site ---------------------------------------------------------------------------
export const site = {
  lot: { x: -110, y: -120, w: 240, d: 290 },
  terrain: {
    frontGrade: -1.5,      // grade at the front wall
    walkoutGrade: -10.75,  // patio level, just below the basement floor
    slopeFrontY: 36,       // side yards fall between these two lines
    slopeRearY: 0,
    courtyardGrade: -1.25, // stays high on the garage side
    westFall: 0.035,       // continued fall past the patio, ft per ft
    rollAmplitude: 1.8,    // gentle rolling away from the house
  },
  road:      { y: 156, width: 22 },
  driveway:  { width: 12, path: [[-8, 145], [-8, -7]] },       // through the breezeway
  courtyard: { x: -56, y: -47, w: 56, d: 40 },                 // rear motor court
  retainingWall: { path: [[0, 0], [0, -47], [-56, -47]], top: -1 }, // holds the court above the patio
  patio:     { x: 0, y: -84, w: 66, d: 84 },
  pool:      { x: 16, y: -74, w: 20, d: 40, depth: 5 },
  hotTub:    { x: 22, y: -32, w: 8, d: 8, raised: 1.5 },       // house end, spills to pool
  pavilion: {
    x: 44, y: -62, w: 18, d: 16, postHeight: 9, pitch: 6,
    furniture: [
      { type: 'counter', x: 45, y: -48.5, w: 12, d: 2.5, h: 3, label: 'Grill + bar' },
      { type: 'table',   x: 49, y: -59,   w: 8,  d: 3.5, h: 2.5, chairs: 6 },
    ],
  },
  furniture: [
    { type: 'sofa',    x: 5,  y: -8,  w: 8,   d: 3,   h: 2.6, elev: 'deck' },
    { type: 'table',   x: 39, y: -9,  w: 7,   d: 3.5, h: 2.5, elev: 'deck', chairs: 6 },
    { type: 'lounger', x: 39, y: -80, w: 2.5, d: 6.5, h: 1.2 },
    { type: 'lounger', x: 43, y: -80, w: 2.5, d: 6.5, h: 1.2 },
  ],
};

export default { meta, build, floors, stair, exterior, site };
