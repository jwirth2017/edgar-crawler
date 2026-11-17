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
//              hallway (id '_hall') automatically. The plan view warns about
//              any hallway narrower than `build.minHall`, and about any room
//              that cannot be reached from the stairs.
//
// OPEN PLAN    openPlan: [['kitchen','dining']] removes the wall between two
//              rooms entirely. Use '_hall' for the hallway.
//
// OPENINGS     { kind, on, at, from, to }
//              on:'y', at:0, from:22, to:34 → a hole in the wall lying on the
//              line y = 0, running from x = 22 to x = 34.
//              on:'x', at:18, ...           → wall on the line x = 18, running
//              from y = from to y = to.
//              kinds: door, entry, glassdoor, window, passthrough, opening
//              (cased, no door), railing (open with guard rail), garage.
//              Optional: sill, head (ft above that floor), swing: -1 to flip.
//
// PARTITIONS   partitions: [{ on, at, from, to }] adds a wall even between
//              open-plan spaces (e.g. a fireplace wall).
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
  doorHeight: 8,
  windowSill: 2.5,
  windowHead: 8,
  eyeHeight: 6 + 2 / 12,  // walkthrough camera, 6'-2"
  minHall: 3.5,           // narrowest allowed hallway / gap
};

// Stairs -------------------------------------------------------------------------
// One U-shaped stair with a mid landing, stacked on all three levels.
// Floor-to-floor heights are whole numbers of risers, so the floor elevations
// below are derived from the riser count.
export const stair = {
  x: 0, y: 17, w: 14, d: 9,    // box: flights run along x, side by side in y
  landingAt: 'x0',             // mid landing against the left exterior wall
  landing: 4.5,                // landing depth (= flight width)
  riser: 7.25 / 12,            // 7-1/4"
  tread: 10 / 12,              // 10"
  risers: { basementToMain: 17, mainToUpper: 19 },
};
const UPPER_FLOOR = (stair.risers.mainToUpper * stair.riser);        // 11.48'
const BASEMENT_FLOOR = -(stair.risers.basementToMain * stair.riser); // -10.27'

// Footprints ------------------------------------------------------------------
const MAIN_BLOCK = { x: 0, y: 0, w: 56, d: 40 };  // two-story block (grew from 52 x 38)
const WING = { x: 56, y: 0, w: 26, d: 34 };       // one-story primary wing, flush with the rear, crawlspace below
const STAIR_BOX = { id: 'stair', name: 'Stairs', use: 'circ', stair: true,
  x: stair.x, y: stair.y, w: stair.w, d: stair.d };

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
      // — left side: back entry, stairs, office —
      { id: 'mudroom',  name: 'Mudroom',        use: 'service', x: 0,  y: 0,  w: 10, d: 11 },
      { id: 'pantry',   name: 'Walk-in Pantry', use: 'service', x: 10, y: 0,  w: 6,  d: 11 },
      { id: 'halfBath', name: 'Half Bath',      use: 'bath',    x: 0,  y: 11, w: 6,  d: 6 },
      { ...STAIR_BOX },
      { id: 'office',   name: 'Shared Office',  use: 'work',    x: 0,  y: 26, w: 18, d: 14 },
      // — rear wall: kitchen and living side by side, both facing the deck —
      { id: 'kitchen', name: 'Kitchen',     use: 'living', x: 16, y: 0,  w: 20, d: 16 },
      { id: 'living',  name: 'Living Room', use: 'living', x: 36, y: 0,  w: 20, d: 16,
        note: "10' flat ceiling" },
      // — center: dining, foyer (open to above), coat —
      { id: 'dining', name: 'Dining',       use: 'living', x: 18, y: 16, w: 20, d: 15,
        note: "10' flat ceiling" },
      { id: 'foyer',  name: 'Foyer',        use: 'circ',   x: 22, y: 31, w: 12, d: 9,
        vaulted: true, note: 'open to above' },
      { id: 'coat',   name: 'Coat',         use: 'service', x: 34, y: 31, w: 4, d: 9 },
      // — right side: powder, den; hall in front of the living room leads to the wing —
      { id: 'powder', name: 'Powder Room',  use: 'bath',   x: 45, y: 20, w: 11, d: 6 },
      { id: 'den',    name: 'TV Den',       use: 'living', x: 42, y: 26, w: 14, d: 14 },
      // — primary wing (flush with the rear wall) —
      { id: 'primaryBed',    name: 'Primary Bedroom', use: 'bed',     x: 56, y: 0,  w: 16, d: 16 },
      { id: 'primaryBath',   name: 'Primary Bath',    use: 'bath',    x: 72, y: 0,  w: 10, d: 20 },
      { id: 'primaryCloset', name: 'Primary Closet',  use: 'service', x: 68, y: 20, w: 14, d: 14,
        note: 'double hang, raised rods' },
      { id: 'laundry',       name: 'Laundry',         use: 'service', x: 56, y: 20, w: 12, d: 14 },
      // the 4 ft wing entry hall (x 56–72, y 16–20) is the auto-generated hallway
      // — 3-car garage (slab 1 ft below main floor) —
      { id: 'garage', name: '3-Car Garage', use: 'garage', x: -52, y: -7, w: 36, d: 24,
        floorOffset: -1, finished: false },
    ],
    openPlan: [
      ['kitchen', 'living'], ['kitchen', 'dining'], ['living', 'dining'],
      ['kitchen', '_hall'], ['living', '_hall'], ['dining', '_hall'],
      ['dining', 'foyer'], ['foyer', '_hall'], ['stair', '_hall'],
    ],
    openings: [
      // rear wall (y = 0) — glass onto the deck
      { kind: 'window',      on: 'y', at: 0, from: 2,  to: 7 },
      { kind: 'passthrough', on: 'y', at: 0, from: 22, to: 34, sill: 3.5, head: 8 },
      { kind: 'glassdoor',   on: 'y', at: 0, from: 39, to: 53, head: 9 },    // living → deck
      { kind: 'window',      on: 'y', at: 0, from: 59, to: 69, sill: 1.5 },  // primary bedroom
      { kind: 'window',      on: 'y', at: 0, from: 75, to: 79, sill: 5 },
      // front wall (y = 40 main block, y = 34 wing)
      { kind: 'entry',  on: 'y', at: 40, from: 25, to: 31 },
      { kind: 'window', on: 'y', at: 40, from: 4,  to: 10 },                  // office → porch
      { kind: 'window', on: 'y', at: 40, from: 39, to: 41, sill: 4 },         // gallery end
      { kind: 'window', on: 'y', at: 40, from: 45, to: 53 },                  // den → porch
      { kind: 'window', on: 'y', at: 34, from: 59, to: 65 },                  // laundry
      { kind: 'window', on: 'y', at: 34, from: 73, to: 77, sill: 6 },         // closet, high
      // side walls (x = 0 is covered by the breezeway from y = 1 to 17)
      { kind: 'door',   on: 'x', at: 0,  from: 3,  to: 6 },                   // mudroom ↔ breezeway
      { kind: 'window', on: 'x', at: 0,  from: 19.5, to: 23.5, sill: 5 },     // stair landing
      { kind: 'window', on: 'x', at: 0,  from: 29, to: 35 },                  // office side
      { kind: 'window', on: 'x', at: 82, from: 3,  to: 7,  sill: 5 },
      { kind: 'window', on: 'x', at: 82, from: 12, to: 16, sill: 5 },
      // interior — left
      { kind: 'door', on: 'y', at: 11, from: 6.5,  to: 9.5 },                 // mudroom → back hall
      { kind: 'door', on: 'y', at: 11, from: 11.5, to: 14.5 },                // pantry → back hall
      { kind: 'door', on: 'x', at: 6,  from: 12.5, to: 15, swing: -1 },       // half bath
      { kind: 'door', on: 'x', at: 18, from: 33,   to: 36, swing: -1 },       // office → foyer hall
      // interior — right
      { kind: 'door', on: 'x', at: 34, from: 34,   to: 37 },                  // coat closet
      { kind: 'door', on: 'y', at: 20, from: 46,   to: 48.7, swing: -1 },     // powder
      { kind: 'door', on: 'x', at: 42, from: 30,   to: 33, swing: -1 },       // den
      // interior — primary wing
      { kind: 'door', on: 'y', at: 16, from: 58, to: 61, swing: -1 },         // hall → bedroom
      { kind: 'door', on: 'x', at: 72, from: 2,  to: 5 },                     // bed → bath
      { kind: 'door', on: 'y', at: 20, from: 75, to: 78 },                    // bath → closet
      { kind: 'door', on: 'x', at: 68, from: 26, to: 29, swing: -1 },         // closet → laundry
      { kind: 'door', on: 'y', at: 20, from: 59, to: 62 },                    // hall → laundry
      // garage — overhead doors face the rear motor court
      { kind: 'garage', on: 'y', at: -7, from: -50, to: -41 },
      { kind: 'garage', on: 'y', at: -7, from: -39, to: -30 },
      { kind: 'garage', on: 'y', at: -7, from: -28, to: -19 },
      { kind: 'door',   on: 'x', at: -16, from: 6, to: 9, swing: -1 },        // garage ↔ breezeway
      { kind: 'window', on: 'y', at: 17, from: -45, to: -41 },
      { kind: 'window', on: 'y', at: 17, from: -36, to: -32 },
      { kind: 'window', on: 'y', at: 17, from: -27, to: -23 },
    ],
    furniture: [
      // kitchen — coffee station + fridge on the pantry wall, sink run under the pass-through
      { type: 'counter', x: 16.3, y: 1,   w: 2,   d: 6,   h: 3, label: 'Coffee station' }, // 6 ft built-in
      { type: 'tall',    x: 16.3, y: 7.5, w: 2.4, d: 3.5, h: 7.5 },           // fridge
      { type: 'counter', x: 20,   y: 0.3, w: 15,  d: 2,   h: 3 },             // under pass-through
      { type: 'island',  x: 21.5, y: 8,   w: 12,  d: 4,   h: 3, label: 'Island' },
      // living — stone fireplace on the right-hand wall, sofa facing it
      { type: 'fireplace', x: 54.2, y: 5,   w: 1.8, d: 6,   h: 10 },
      { type: 'sofa',      x: 44,   y: 3.5, w: 3.3, d: 9,   h: 2.8, faces: '+x', label: 'Sofa' },
      { type: 'table',     x: 48.5, y: 6,   w: 2.5, d: 4,   h: 1.4 },
      { type: 'chair',     x: 46.5, y: 12.4, w: 3,  d: 3,   h: 2.7 },
      { type: 'chair',     x: 50.5, y: 12.4, w: 3,  d: 3,   h: 2.7 },
      // dining
      { type: 'table', x: 23.5, y: 21.75, w: 9, d: 3.5, h: 2.5, chairs: 8, label: 'Table' },
      // foyer
      { type: 'table', x: 22.4, y: 33, w: 1.4, d: 5, h: 2.8 },
      // office — each desk faces its own window (front wall and left side wall)
      { type: 'desk',  x: 4,   y: 37.2, w: 6,   d: 2.5, h: 2.5 },
      { type: 'chair', x: 6,   y: 34.6, w: 2,   d: 2,   h: 3 },
      { type: 'desk',  x: 0.5, y: 29,   w: 2.5, d: 6,   h: 2.5 },
      { type: 'chair', x: 3.4, y: 31,   w: 2,   d: 2,   h: 3 },
      { type: 'tall',  x: 7,   y: 26.3, w: 9,   d: 1.2, h: 7 },
      // mudroom / pantry / half bath
      { type: 'tall',    x: 8.4,  y: 0.5,  w: 1.5, d: 9.5,  h: 7 },            // lockers
      { type: 'bench',   x: 0.3,  y: 6.5,  w: 1.5, d: 3.5,  h: 1.5 },
      { type: 'tall',    x: 10.3, y: 0.3,  w: 1.5, d: 10.4, h: 7 },
      { type: 'tall',    x: 11.8, y: 0.3,  w: 3.9, d: 1.5,  h: 7 },
      { type: 'toilet',  x: 0.4,  y: 13,   w: 2.3, d: 1.7,  h: 1.4 },
      { type: 'counter', x: 2.5,  y: 11.3, w: 3,   d: 1.7,  h: 3 },
      // den — TV on the back wall, sofa facing it, window to the porch behind
      { type: 'tv',    x: 46,   y: 26.3, w: 6, d: 1.5, h: 2 },
      { type: 'sofa',  x: 45.5, y: 34,   w: 8, d: 3.5, h: 2.8, faces: '-y' },
      { type: 'table', x: 47.5, y: 30,   w: 4, d: 2.5, h: 1.3 },
      // powder / coat
      { type: 'counter', x: 51,   y: 23.9, w: 4,   d: 1.8, h: 3 },
      { type: 'toilet',  x: 53.4, y: 20.3, w: 2.3, d: 1.7, h: 1.4 },
      { type: 'tall',    x: 36,   y: 31.3, w: 1.8, d: 8.4, h: 7 },
      // primary suite
      { type: 'bed',     x: 64.5, y: 4.5,  w: 7.2, d: 6.5, h: 2.2, label: 'King' },
      { type: 'table',   x: 69.8, y: 2.3,  w: 1.9, d: 2,   h: 2 },
      { type: 'table',   x: 69.8, y: 11.2, w: 1.9, d: 2,   h: 2 },
      { type: 'dresser', x: 56.3, y: 5,    w: 1.8, d: 6,   h: 3 },
      { type: 'chair',   x: 58.5, y: 11.5, w: 3,   d: 3,   h: 2.7 },
      { type: 'counter', x: 74,   y: 0.3,  w: 7,   d: 2,   h: 3 },             // double vanity
      { type: 'tub',     x: 78.8, y: 4.5,  w: 2.9, d: 5.5, h: 2 },
      { type: 'shower',  x: 72.3, y: 12,   w: 5,   d: 5,   h: 7.5 },
      { type: 'toilet',  x: 79.5, y: 17.6, w: 2.3, d: 1.7, h: 1.4 },
      { type: 'counter', x: 79.9, y: 11,   w: 1.8, d: 4,   h: 2.5 },           // makeup vanity
      // primary closet — double hanging on both long walls, rods raised for tall owners
      { type: 'hanging', x: 68.3, y: 22,   w: 2, d: 11.7, h: 9, rods: [46 / 12, 92 / 12], label: 'Double hang' },
      { type: 'hanging', x: 79.7, y: 22,   w: 2, d: 11.7, h: 9, rods: [46 / 12, 92 / 12], label: 'Double hang' },
      { type: 'island',  x: 73.5, y: 25,   w: 3, d: 5,    h: 3 },
      { type: 'appliance', x: 57,   y: 31.2, w: 5.4, d: 2.5, h: 3.3 },         // washer / dryer
      { type: 'counter',   x: 62.8, y: 31.7, w: 4.8, d: 2,   h: 3 },           // sink + folding
      { type: 'tall',      x: 56.3, y: 22,   w: 1.7, d: 7,   h: 7 },
      // garage — three cars for scale
      { type: 'car', x: -48.5, y: -3, w: 6, d: 16, h: 5 },
      { type: 'car', x: -37.5, y: -3, w: 6, d: 16, h: 5 },
      { type: 'car', x: -26.5, y: -3, w: 6, d: 16, h: 5 },
    ],
  },

  // ═══════════════════════════ UPPER FLOOR ══════════════════════════════════
  upper: {
    name: 'Upper Floor',
    floor: UPPER_FLOOR,
    ceiling: 9,
    footprint: [MAIN_BLOCK],
    rooms: [
      // — left: two kids' bedrooms sharing a Jack & Jill bath —
      { id: 'bed1',   name: 'Bedroom 1', use: 'bed',  x: 0,  y: 0,  w: 18, d: 12, note: 'incl. closet' },
      // the stairs now sit between bedrooms 1 and 2, so the shared bath opens
      // to bedroom 1 and to the hall (no longer a true Jack & Jill)
      { id: 'jjBath', name: 'Shared Bath', use: 'bath', x: 0, y: 12, w: 14, d: 5 },
      { id: 'bed2',   name: 'Bedroom 2', use: 'bed',  x: 0,  y: 26, w: 18, d: 14, note: 'incl. closet' },
      { ...STAIR_BOX, finished: false },
      // — center: loft at the rear, open to the living room and foyer below —
      // dining below is closed over; the loft runs front-to-back over it
      { id: 'loft',       name: "Kids' Loft",          use: 'living', x: 18, y: 0,  w: 20, d: 31,
        note: 'play + homework' },
      { id: 'foyerVoid',  name: 'Open to Foyer',       use: 'void',   x: 22, y: 31, w: 12, d: 9,  void: true },
      // — right: bedroom 3, bath, laundry, attic, off a 4 ft hall —
      { id: 'bed3',     name: 'Bedroom 3',     use: 'bed',     x: 42, y: 0,  w: 14, d: 13 },
      { id: 'bath2',    name: 'Bath 2',        use: 'bath',    x: 42, y: 13, w: 10, d: 8 },
      { id: 'linen2',   name: 'Linen',         use: 'service', x: 52, y: 13, w: 4,  d: 8 },
      { id: 'laundry2', name: "Kids' Laundry", use: 'service', x: 42, y: 21, w: 8,  d: 6 },
      { id: 'storage',  name: 'Storage',       use: 'service', x: 50, y: 21, w: 6,  d: 6, finished: false },
      { id: 'attic',    name: 'Attic Storage', use: 'service', x: 42, y: 27, w: 14, d: 13, finished: false, note: 'unfinished' },
    ],
    openPlan: [['loft', '_hall'], ['stair', '_hall']],
    openings: [
      // guard rails around the open-to-below areas
      { kind: 'railing', on: 'y', at: 31, from: 22, to: 34 },     // loft overlooks the foyer
      { kind: 'railing', on: 'x', at: 22, from: 31, to: 40 },
      { kind: 'railing', on: 'x', at: 34, from: 31, to: 40 },
      // doors — left
      { kind: 'door', on: 'x', at: 18, from: 7,  to: 10, swing: -1 },        // bed 1
      { kind: 'door', on: 'y', at: 12, from: 3,  to: 5.5, swing: -1 },       // bed 1 → shared bath
      { kind: 'door', on: 'x', at: 14, from: 12.3, to: 14.8 },               // hall → shared bath
      { kind: 'door', on: 'x', at: 18, from: 27, to: 30, swing: -1 },        // bed 2
      // doors — right
      { kind: 'door', on: 'x', at: 42, from: 8,    to: 11 },                 // bed 3
      { kind: 'door', on: 'x', at: 42, from: 15,   to: 17.7 },               // bath 2
      { kind: 'door', on: 'x', at: 52, from: 15,   to: 17.5 },               // linen (from bath)
      { kind: 'door', on: 'x', at: 42, from: 22,   to: 24.7 },               // laundry
      { kind: 'door', on: 'x', at: 50, from: 22.5, to: 25 },                 // storage (from laundry)
      { kind: 'door', on: 'x', at: 42, from: 32,   to: 35 },                 // attic
      // windows — rear
      { kind: 'window', on: 'y', at: 0, from: 4,  to: 10 },
      { kind: 'window', on: 'y', at: 0, from: 22, to: 34, sill: 1.5 },        // rear gable glass
      { kind: 'window', on: 'y', at: 0, from: 46, to: 52 },
      // windows — front
      { kind: 'window', on: 'y', at: 40, from: 4,  to: 10 },                  // bedroom 2
      { kind: 'window', on: 'y', at: 40, from: 24, to: 32, sill: 1.5 },       // front gable glass
      { kind: 'window', on: 'y', at: 40, from: 47, to: 51, sill: 4 },
      // windows — sides
      { kind: 'window', on: 'x', at: 0,  from: 3,  to: 8 },
      { kind: 'window', on: 'x', at: 0,  from: 14, to: 16, sill: 4.5 },
      { kind: 'window', on: 'x', at: 0,  from: 19.5, to: 23.5, sill: 5 },   // stair
      { kind: 'window', on: 'x', at: 0,  from: 30, to: 35 },
      { kind: 'window', on: 'x', at: 56, from: 4,  to: 9 },
    ],
    furniture: [
      { type: 'bed',  x: 0.3,  y: 3.5,  w: 6.7, d: 5,   h: 2.2, label: 'Queen' },
      { type: 'desk', x: 9,    y: 0.3,  w: 5,   d: 2,   h: 2.5 },
      { type: 'tall', x: 15.8, y: 0.3,  w: 1.9, d: 6,   h: 7 },
      { type: 'bed',  x: 0.3,  y: 30,   w: 6.7, d: 5,   h: 2.2, label: 'Queen' },
      { type: 'desk', x: 11,   y: 37.7, w: 5,   d: 2,   h: 2.5 },
      { type: 'tall', x: 15.8, y: 31,   w: 1.9, d: 6,   h: 7 },
      { type: 'bed',  x: 46,   y: 6,    w: 5,   d: 6.7, h: 2.2, label: 'Queen' },
      { type: 'desk', x: 43,   y: 0.3,  w: 5,   d: 2,   h: 2.5 },
      { type: 'chimney', x: 54.2, y: 5, w: 1.8, d: 6, h: 9, label: 'Chimney' },  // from the living-room fireplace
      { type: 'sofa',  x: 24, y: 9.5, w: 8, d: 3.2, h: 2.8, faces: '-y', label: 'Sofa' },
      { type: 'table', x: 26, y: 5,   w: 4, d: 2.5, h: 1.4 },
      { type: 'table', x: 25, y: 18,  w: 6, d: 4,   h: 2.5, chairs: 6, label: 'Game table' },
      { type: 'desk',  x: 35.7, y: 18, w: 2, d: 10, h: 2.5, label: 'Homework desks' },
      { type: 'tub',     x: 0.3,  y: 12.2, w: 2.6, d: 4.6, h: 1.8 },
      { type: 'counter', x: 6,    y: 14.8, w: 5,   d: 1.9, h: 3 },
      { type: 'toilet',  x: 11.5, y: 12.3, w: 1.7, d: 2.3, h: 1.4 },
      { type: 'tub',     x: 46.5, y: 18,   w: 5.2, d: 2.7, h: 1.8 },
      { type: 'counter', x: 45.5, y: 13.3, w: 5,   d: 1.9, h: 3 },
      { type: 'appliance', x: 44.5, y: 24.3, w: 5, d: 2.5, h: 3.3 },
    ],
  },

  // ═════════════════════════ WALKOUT BASEMENT ═══════════════════════════════
  basement: {
    name: 'Walkout Basement',
    floor: BASEMENT_FLOOR,
    ceiling: 9,
    footprint: [MAIN_BLOCK],
    rooms: [
      // rear (y = 0) walks out to the covered patio; front (y = 40) is below grade
      { id: 'guest',      name: 'Guest Suite',  use: 'bed',     x: 0,  y: 0,  w: 16, d: 12 },
      { id: 'guestCloset',name: 'Closet',       use: 'service', x: 0,  y: 12, w: 8,  d: 5 },
      { id: 'guestBath',  name: 'Guest / Pool Bath', use: 'bath', x: 8, y: 12, w: 8,  d: 5 },
      { id: 'mechanical', name: 'Mechanical',   use: 'service', x: 0,  y: 26, w: 16, d: 7, finished: false },
      { id: 'safe',       name: 'Storm Safe Room', use: 'service', x: 0, y: 33, w: 16, d: 7, finished: false },
      { ...STAIR_BOX, finished: false },
      { id: 'lounge',  name: 'Sports Lounge & Bar', use: 'rec', x: 20, y: 0,  w: 20, d: 18 },
      { id: 'gym',     name: 'Gym',            use: 'rec',  x: 40, y: 0,  w: 16, d: 20 },
      { id: 'sim',     name: 'Golf Sim Bay',   use: 'rec',  x: 20, y: 18, w: 16, d: 22,
        floorOffset: -2, ceiling: 11, note: "11' ceiling, slab dropped 2'" },
      { id: 'theater', name: 'Theater',        use: 'rec',  x: 36, y: 20, w: 20, d: 20 },
    ],
    openPlan: [['lounge', '_hall'], ['stair', '_hall']],
    openings: [
      // walkout wall (y = 0) — three sets of glass doors onto the covered patio
      { kind: 'glassdoor', on: 'y', at: 0, from: 3,  to: 13 },
      { kind: 'glassdoor', on: 'y', at: 0, from: 23, to: 37 },
      { kind: 'glassdoor', on: 'y', at: 0, from: 43, to: 53 },
      // hall doors
      { kind: 'door',    on: 'x', at: 16, from: 7,    to: 10, swing: -1 },    // guest suite
      { kind: 'door',    on: 'x', at: 16, from: 14.2, to: 16.8, swing: -1 },  // guest / pool bath
      { kind: 'door',    on: 'x', at: 16, from: 28,   to: 31, swing: -1 },    // mechanical
      { kind: 'door',    on: 'x', at: 16, from: 35,   to: 38, swing: -1 },    // safe room (steel)
      { kind: 'opening', on: 'x', at: 20, from: 20,   to: 24 },               // sim bay (steps down)
      // suite and lounge doors
      { kind: 'door',    on: 'y', at: 12, from: 2,    to: 5 },                // guest closet
      { kind: 'door',    on: 'y', at: 12, from: 11.5, to: 14 },               // guest → bath
      { kind: 'opening', on: 'x', at: 40, from: 5,    to: 12 },               // gym
      { kind: 'door',    on: 'y', at: 20, from: 36.6, to: 39.6 },             // theater (from lounge alcove)
    ],
    furniture: [
      // theater — screen on the buried front wall, two rows of four recliners
      { type: 'screen',   x: 39.5, y: 39.4, w: 13, d: 0.3, h: 7.3, elev: 1.5, label: 'Screen' },
      { type: 'recliner', x: 40,   y: 29,   w: 12, d: 3.3, h: 3.3, seats: 4, faces: '+y' },
      { type: 'platform', x: 40,   y: 20.3, w: 15.7, d: 6, h: 1 },
      { type: 'recliner', x: 40,   y: 22,   w: 12, d: 3.3, h: 3.3, seats: 4, faces: '+y', elev: 1 },
      // golf sim — hitting toward the front wall
      { type: 'screen', x: 21.5, y: 39.4, w: 13, d: 0.3, h: 9.5, elev: 0.5, label: 'Impact screen' },
      { type: 'mat',    x: 25.5, y: 27,   w: 5,  d: 5,   h: 0.15, label: 'Hitting mat' },
      { type: 'steps',  x: 20.3, y: 19.5, w: 3,  d: 5,   h: 2 },
      { type: 'sofa',   x: 27,   y: 18.5, w: 8,  d: 3,   h: 2.6, faces: '+y' },
      // sports lounge
      { type: 'counter', x: 21.5, y: 15.7, w: 13,  d: 2,   h: 3,   label: 'Wet bar' },
      { type: 'island',  x: 21.5, y: 11.5, w: 13,  d: 2,   h: 3.5 },
      { type: 'tv',      x: 38.2, y: 1,    w: 1.5, d: 4,   h: 2 },
      { type: 'sofa',    x: 29,   y: 2,    w: 3.5, d: 7.5, h: 2.8, faces: '+x', label: 'Sofa' },
      { type: 'table',   x: 33.5, y: 4,    w: 2.5, d: 3.5, h: 1.4 },
      // gym
      { type: 'equipment', x: 42, y: 13,  w: 6.5, d: 3,   h: 4.5 },
      { type: 'equipment', x: 50, y: 11,  w: 5,   d: 4.5, h: 7.5 },
      { type: 'bench',     x: 46, y: 4,   w: 1.8, d: 5,   h: 1.5 },
      // guest suite
      { type: 'bed',     x: 0.3, y: 3.5,  w: 6.7, d: 5,   h: 2.2, label: 'Queen' },
      { type: 'dresser', x: 9,   y: 10,   w: 5,   d: 1.7, h: 3 },
      { type: 'shower',  x: 8.3,  y: 12.3, w: 3,   d: 4.4, h: 7.5 },
      { type: 'counter', x: 11.8, y: 15,   w: 3,   d: 1.8, h: 3 },
      // mechanical
      { type: 'appliance', x: 0.5, y: 26.5, w: 3,   d: 3,   h: 6 },
      { type: 'appliance', x: 4.5, y: 26.5, w: 2.2, d: 2.2, h: 5.5 },
      { type: 'appliance', x: 8,   y: 26.5, w: 4,   d: 2.5, h: 5 },
      { type: 'bench',     x: 0.5, y: 37.8, w: 12,  d: 1.7, h: 1.5 },          // safe-room bench
    ],
  },
};

// Exterior structures ----------------------------------------------------------
export const exterior = {
  porch: {
    x: 0, y: 40, w: 56, d: 8, floor: -0.5,
    postSpacing: 11.2, postSize: 0.8,       // cedar posts on stone bases
    steps: { x: 24, w: 8 },                 // centered on the front door
    roofLow: 10, roofHigh: 11.5,            // shed roof under the upper windows
  },
  deck: {
    x: 0, y: -14, w: 56, d: 14, floor: -0.15,
    pierSpacing: 13.5, pierSize: 2,         // stone piers down to the patio
    railing: 'cable', railHeight: 3.5,
    stairs: { x: 0, y: -30, w: 4, d: 16 },  // down to the pool deck, garage side
    barCounter: { x: 22, y: -1.8, w: 12, d: 1.5, h: 3.5 }, // outside the pass-through
  },
  // Arched drive-through between house and garage. Cars pass front → back.
  breezeway: {
    x: -16, y: 1, w: 16, d: 16,
    floorOffset: -1, wallHeight: 12,
    archWidth: 12, archSpring: 7.5, archTop: 10.5,
  },
  roofs: [
    // eave = height of the eave line above main floor. pitch = rise per 12.
    { id: 'main',   type: 'gable', x: 0,   y: 0,  w: 56, d: 40, ridge: 'x', eave: 20.5, pitch: 8,  overhang: 1.5 },
    // center gable, front and rear, over the foyer / dining / loft
    { id: 'center', type: 'crossGable', centerX: 28, width: 22, eave: 20.5, pitch: 12, overhang: 1.5, brackets: 'cedar' },
    { id: 'wing',   type: 'gable', x: 56,  y: 0,  w: 26, d: 34, ridge: 'y', eave: 11, pitch: 8, overhang: 1.5 },
    { id: 'breezeway', type: 'gable', x: -16, y: 1, w: 16, d: 16, ridge: 'y', eave: 12, pitch: 8, overhang: 1 },
    { id: 'garage', type: 'gable', x: -52, y: -7, w: 36, d: 24, ridge: 'x', eave: 10, pitch: 8, overhang: 1.5 },
  ],
  wainscotHeight: 3.5,   // stone veneer band on the main-level walls
};

// Site ---------------------------------------------------------------------------
export const site = {
  lot: { x: -110, y: -120, w: 240, d: 290 },
  terrain: {
    frontGrade: -1.5,       // grade at the front wall
    walkoutGrade: -10.5,    // patio level = basement floor
    slopeFrontY: 40,        // side yards fall between these two lines
    slopeRearY: 0,
    courtyardGrade: -1.25,  // motor court stays up at the garage slab
    westFall: 0.035,        // continued fall past the pool, ft per ft
    rollAmplitude: 1.8,     // gentle rolling away from the house
  },
  road:      { y: 156, width: 22 },
  driveway:  { width: 12, path: [[-8, 145], [-8, -7]] },        // through the breezeway
  courtyard: { x: -56, y: -47, w: 56, d: 40 },                  // rear motor court
  // Stone retaining wall holding the motor court up above the patio / pool
  // level: along the court's patio side, then across its back edge.
  retainingWall: { path: [[0, 0], [0, -47], [-56, -47]], top: -1, thickness: 1.5 },
  coveredPatio: { x: 0, y: -14, w: 56, d: 14 },                 // under the deck
  // Large concrete pavers in a grid with grass strips, patio → pool deck
  paverGrid: { x: 6, y: -26, w: 44, d: 12, paver: 3.5, grass: 0.5 },
  poolDeck:  { x: 0, y: -84, w: 76, d: 58 },                    // travertine-look pavers
  pool:      { x: 20, y: -70, w: 16, d: 36, depth: 5 },
  hotTub:    { x: 24, y: -34, w: 8, d: 8, raised: 1.5 },        // house end, spills into pool
  pavilion: {
    x: 54, y: -66, w: 18, d: 16, postHeight: 9, pitch: 6,       // primary-wing side
    furniture: [
      { type: 'counter', x: 55,   y: -52.5, w: 12, d: 2.5, h: 3, label: 'Grill + bar' },
      { type: 'table',   x: 58.5, y: -63,   w: 8,  d: 3.5, h: 2.5, chairs: 6 },
    ],
  },
  furniture: [
    { type: 'sofa',    x: 5,  y: -9,  w: 8,   d: 3,   h: 2.6, elev: 'deck' },
    { type: 'table',   x: 44, y: -9,  w: 7,   d: 3.5, h: 2.5, elev: 'deck', chairs: 6 },
    { type: 'lounger', x: 40, y: -66, w: 2.5, d: 6.5, h: 1.2 },
    { type: 'lounger', x: 44, y: -66, w: 2.5, d: 6.5, h: 1.2 },
    { type: 'lounger', x: 40, y: -76, w: 2.5, d: 6.5, h: 1.2 },
  ],
};

// Sun & camera presets (3D view) ------------------------------------------------
// The sun is computed from latitude, date and time. Change `latitude` to the
// lot's real latitude for accurate shadows.
export const sun = {
  latitude: 36,          // degrees north
  month: 6, day: 21,     // default date (summer solstice)
  hour: 18.5,            // default time of day, 24 h clock (solar time)
};

// Camera presets. Exterior views orbit around `target`; interior views put
// you in walkthrough mode at eye height, standing at `at` on `level`, looking
// toward `look` (plan coordinates in feet), tilted by `pitch` radians.
export const views = [
  { id: 'front',   name: 'Front approach',  type: 'orbit', eye: [28, 118, 4],    target: [28, 18, 12] },
  { id: 'pool',    name: 'Rear from pool',  type: 'orbit', eye: [30, -96, -5.5], target: [30, 0, 2] },
  { id: 'kitchen', name: 'Kitchen → pass-through', type: 'walk', level: 'main', at: [28, 14], look: [28, -20] },
  { id: 'living',  name: 'Living room',     type: 'walk', level: 'main', at: [38.5, 14.5], look: [56, 2] },
  { id: 'sim',     name: 'Golf sim',        type: 'walk', level: 'basement', at: [28, 22.5], look: [28, 40], pitch: -0.22 },
  { id: 'theater', name: 'Theater',         type: 'walk', level: 'basement', at: [46, 23.5], look: [46, 40], pitch: -0.2 },
];

export default { meta, build, stair, floors, exterior, site, sun, views };
