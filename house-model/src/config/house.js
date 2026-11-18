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
//
// FINISHES     Each floor has a `finish` level ('good' | 'better'), defined in
//              `finishLevels` below. Rooms with finished: false use the
//              'unfinished' level; a room can override with
//              finish: { floor, walls, roughIn }.
// ─────────────────────────────────────────────────────────────────────────────

export const meta = {
  name: 'Modern White Farmhouse',
  frontFaces: 'east',
  // finished sq ft targets per floor (≈ 5,500 total)
  targetAreas: { main: 2860, upper: 1630, basement: 1100 },
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
const MAIN_BLOCK = { x: 0, y: 0, w: 52, d: 40 };  // two-story block
const WING = { x: 52, y: 0, w: 26, d: 30 };       // one-story primary wing, flush with the rear, crawlspace below
const STAIR_BOX = { id: 'stair', name: 'Stairs', use: 'circ', stair: true,
  x: stair.x, y: stair.y, w: stair.w, d: stair.d };

// Finish levels -----------------------------------------------------------------
// Material names refer to src/app/materials.js.
export const finishLevels = {
  good: {
    label: 'Good',
    floors: { bed: 'carpet', living: 'carpet', circ: 'carpet', work: 'carpet', bath: 'lvpGray', service: 'lvpGray', default: 'carpet' },
    cabinets: 'cabinetWhite', island: 'cabinetWhite', counters: 'laminateWhite',
    fixtures: 'chrome', tub: 'fiberglass',
  },
  better: {
    label: 'Better',
    floors: { default: 'oakLVP', garage: 'concrete' },
    cabinets: 'shakerWhite', island: 'navy', counters: 'quartzWhite',
    fixtures: 'matteBlack', tub: 'acrylic',
  },
  unfinished: {
    label: 'Unfinished',
    floors: { default: 'sealedConcrete' },
    walls: 'bareDrywall', ceiling: 'bareDrywall',
    cabinets: 'cabinetWhite', island: 'cabinetWhite', counters: 'laminateWhite',
    fixtures: 'chrome', tub: 'fiberglass',
  },
};
export const doors = { height: 8, color: 'black' };  // all interior doors

// Floors ----------------------------------------------------------------------
// floor = finished-floor elevation, ceiling = clear ceiling height.
export const floors = {
  // ═══════════════════════════ MAIN FLOOR ═══════════════════════════════════
  main: {
    name: 'Main Floor',
    finish: 'better',
    floor: 0,
    ceiling: 10,
    footprint: [MAIN_BLOCK, WING],
    rooms: [
      // — left side: back entry from the garage, stairs, office —
      { id: 'mudroom',  name: 'Mudroom',        use: 'service', x: 0,  y: 0,  w: 6,  d: 17,
        finish: { floor: 'slateTile' } },
      // butler's pantry: counter run with coffee bar + prep sink, open shelves, cased opening to the kitchen
      { id: 'pantry',   name: "Butler's Pantry", use: 'service', x: 6, y: 0,  w: 8,  d: 11 },
      { ...STAIR_BOX },
      { id: 'office',   name: 'Shared Office',  use: 'work',    x: 0,  y: 26, w: 14, d: 14 },
      // — rear wall: kitchen and dining side by side, both facing the deck —
      { id: 'kitchen', name: 'Kitchen',     use: 'living', x: 14, y: 0,  w: 18, d: 16, labelDy: -3 },
      { id: 'dining',  name: 'Dining',      use: 'living', x: 32, y: 0,  w: 20, d: 16, labelDy: 3.5,
        note: "glass to the deck · sunset" },
      // — center: the front door opens into the two-story living room —
      { id: 'living', name: 'Living Room',  use: 'living', x: 18, y: 16, w: 20, d: 15, labelDx: 5, labelDy: -2.5,
        note: 'two-story · fireplace' },
      { id: 'foyer',  name: 'Foyer',        use: 'circ',   x: 20, y: 31, w: 12, d: 9,
        vaulted: true, note: 'open to above' },
      { id: 'coat',   name: 'Coat',         use: 'service', x: 32, y: 31, w: 6, d: 9 },
      // — right side: powder, den; hall in front of the living room leads to the wing —
      { id: 'powder', name: 'Powder Room',  use: 'bath',   x: 46, y: 20, w: 6,  d: 6 },
      { id: 'wetBar', name: 'Wet Bar',      use: 'living', x: 41, y: 20, w: 5,  d: 6, note: 'open to the hall' },
      { id: 'den',    name: 'TV Den',       use: 'living', x: 38, y: 26, w: 14, d: 14 },
      // — primary wing (flush with the rear wall) —
      { id: 'primaryBed',    name: 'Primary Bedroom', use: 'bed',     x: 52, y: 0,  w: 16, d: 16 },
      { id: 'primaryBath',   name: 'Primary Bath',    use: 'bath',    x: 68, y: 0,  w: 10, d: 16,
        note: 'curbless shower · grab-bar blocking' },
      { id: 'primaryCloset', name: 'Primary Closet',  use: 'service', x: 64, y: 16, w: 14, d: 14,
        note: 'double hang, raised rods' },
      { id: 'laundry',       name: 'Laundry',         use: 'service', x: 52, y: 20, w: 12, d: 10 },
      // private entry: the wing hall closes off from the house with a pocket door
      { id: 'primaryEntry', name: 'Primary Entry', use: 'circ', x: 52, y: 16, w: 12, d: 4 },
      // (the 3-car garage is its own angled building: exterior.garage)
    ],
    openPlan: [
      ['kitchen', 'living'], ['kitchen', 'dining'], ['living', 'dining'],
      ['kitchen', '_hall'], ['living', '_hall'], ['dining', '_hall'],
      ['foyer', '_hall'], ['stair', '_hall'],
    ],
    openings: [
      // rear wall (y = 0) — glass onto the deck
      { kind: 'window',      on: 'y', at: 0, from: 1.5, to: 4.5, sill: 4 },     // mudroom
      { kind: 'window',      on: 'y', at: 0, from: 8.5, to: 11.5, sill: 4.5 },  // butler's pantry, over the counter
      { kind: 'passthrough', on: 'y', at: 0, from: 19, to: 29, sill: 3.5, head: 8 },   // 10 ft: fridge on one side, ovens on the other
      { kind: 'glassdoor',   on: 'y', at: 0, from: 35, to: 49, head: 9 },      // dining → deck
      { kind: 'glassdoor',   on: 'y', at: 0, from: 54.5, to: 60.5 },          // primary bedroom → deck
      { kind: 'window',      on: 'y', at: 0, from: 62, to: 66, sill: 1.5 },    // primary bedroom
      { kind: 'window',      on: 'y', at: 0, from: 71, to: 75, sill: 5 },
      // front wall (y = 40 main block, y = 30 wing)
      { kind: 'entry',  on: 'y', at: 40, from: 23, to: 29 },
      { kind: 'window', on: 'y', at: 40, from: 3,  to: 9 },                     // office desk → porch
      { kind: 'window', on: 'y', at: 40, from: 41, to: 49 },                    // den → porch
      { kind: 'window', on: 'y', at: 30, from: 55, to: 61 },                    // laundry
      { kind: 'window', on: 'y', at: 30, from: 69, to: 73, sill: 6 },           // closet, high
      // side walls (x = 0: the garage is attached along this wall)
      { kind: 'door',   on: 'x', at: 0,  from: 13.5, to: 16.5 },               // mudroom → garage
      { kind: 'window', on: 'x', at: 78, from: 3,  to: 7,  sill: 5 },
      { kind: 'window', on: 'x', at: 78, from: 10, to: 14, sill: 5 },
      // interior — left
      { kind: 'door', on: 'x', at: 6,  from: 12.5, to: 15.5 },                  // mudroom → back hall
      { kind: 'door', on: 'y', at: 11, from: 7.5,  to: 10.5 },                  // pantry → back hall (groceries from the mudroom)
      { kind: 'opening', on: 'x', at: 14, from: 3.5, to: 7.5 },                 // pantry ↔ kitchen, cased opening
      { kind: 'opening', on: 'y', at: 31, from: 20.5, to: 31.5 },               // foyer → living: 11 ft cased opening
      { kind: 'glassdoor', on: 'x', at: 14, from: 31.5, to: 36.5 },            // office → front hall, glass French doors
      // interior — right
      { kind: 'door', on: 'x', at: 32, from: 33,   to: 36 },                    // coat closet (off the foyer)
      { kind: 'door', on: 'y', at: 20, from: 47.5, to: 50, swing: -1 },        // powder
      { kind: 'opening', on: 'y', at: 20, from: 41.4, to: 45.6 },              // wet bar nook, open to the hall
      { kind: 'door', on: 'y', at: 26, from: 38.25, to: 40.75, swing: -1 },    // den, from the gallery
      // interior — primary wing
      { kind: 'door', on: 'x', at: 52, from: 16.5, to: 19.5 },                  // house → primary entry (pocket door)
      { kind: 'door', on: 'y', at: 16, from: 54, to: 57, swing: -1 },         // hall → bedroom
      { kind: 'door', on: 'x', at: 68, from: 2,  to: 5 },                     // bed → bath
      { kind: 'door', on: 'y', at: 16, from: 70.5, to: 73.5 },                // bath → closet
      { kind: 'door', on: 'x', at: 64, from: 22, to: 25, swing: -1 },         // closet → laundry
      { kind: 'door', on: 'y', at: 20, from: 55, to: 58 },                    // hall → laundry
    ],
    furniture: [
      // kitchen — rear wall: fridge | sink run under the pass-through | double wall ovens;
      // island with a 36" gas cooktop and a pop-up downdraft vent, centered on the pass-through
      { type: 'tall',    x: 14.3, y: 0.3,  w: 3,    d: 2.6, h: 7.5, label: 'Fridge' },
      { type: 'counter', x: 17.3, y: 0.3,  w: 11.9, d: 2,   h: 3, sink: true }, // under the pass-through
      { type: 'oven',    x: 29.2, y: 0.3,  w: 2.6,  d: 2.2, h: 7.5, label: 'Double ovens' },
      // 13 ft island: gas cooktop + pop-up downdraft on the work side, raised bar ledge
      // (42" high) on the east / dining side so stools sit away from the burners
      { type: 'island',  x: 17.5, y: 6,    w: 13,   d: 5.6, h: 3, cooktop: { w: 3, d: 1.75 }, downdraft: true,
        ledge: { side: '+y', d: 1.5, h: 3.5, stools: 4 }, label: 'Island · bar ledge', noSqueeze: true },
      // butler's pantry — counter on the rear wall under the window, open shelves opposite the kitchen
      { type: 'counter', x: 6.3,  y: 0.3,  w: 7.4,  d: 2,   h: 3, sink: true, uppers: true, label: 'Coffee bar · prep sink' },
      { type: 'tall',    x: 6.3,  y: 3,    w: 1.3,  d: 7.7, h: 7.5, label: 'Open shelves' },
      { type: 'tall',    x: 12.2, y: 8.2,  w: 1.5,  d: 2.5, h: 7.5 },            // pantry cabinet beside the opening
      // dining — by the deck glass, next to the kitchen; buffet on the end wall
      { type: 'table',   x: 37.5, y: 5,    w: 9,   d: 3.5, h: 2.5, chairs: 8, label: 'Table', noSqueeze: true },
      { type: 'dresser', x: 50.2, y: 3.5,  w: 1.8, d: 7,   h: 3,   label: 'Buffet', noSqueeze: true },
      // living — under the two-story space: stone fireplace on the wall toward the den,
      // sofa facing it, chairs either end; walks left (to the kitchen) and right (to the wing)
      { type: 'fireplace', x: 36.2, y: 17.5, w: 1.8, d: 6,   h: 10, noTv: true, noSqueeze: true },
      { type: 'sofa',      x: 22.5, y: 16.2, w: 3.3, d: 8.6, h: 2.8, faces: '+x', label: 'Sofa', noSqueeze: true },
      { type: 'table',     x: 27.2, y: 18.3, w: 2.5, d: 4.5, h: 1.4, noSqueeze: true },
      { type: 'chair',     x: 27,   y: 14.5, w: 3,   d: 3,   h: 2.7, faces: '+y', noSqueeze: true },
      { type: 'chair',     x: 27,   y: 23.6, w: 3,   d: 3,   h: 2.7, faces: '-y', noSqueeze: true },
      // foyer
      { type: 'table', x: 20.4, y: 33, w: 1.4, d: 5, h: 2.8 },
      // office — each desk faces its own window (front wall and left side wall)
      { type: 'desk',  x: 3,   y: 37.2, w: 6,   d: 2.5, h: 2.5 },
      { type: 'chair', x: 5,   y: 34.6, w: 2,   d: 2,   h: 3 },
      { type: 'desk',  x: 0.5, y: 29,   w: 2.5, d: 6,   h: 2.5 },
      { type: 'chair', x: 3.4, y: 31,   w: 2,   d: 2,   h: 3 },
      { type: 'tall',  x: 6,   y: 26.3, w: 7,   d: 1.2, h: 7 },
      // mudroom / pantry
      // mudroom built-ins: dog wash under the window, lockers with a bench, charging + hooks
      { type: 'tub',     x: 0.3, y: 0.3, w: 3.6, d: 2.8, h: 2,   label: 'Dog wash', noSqueeze: true },
      { type: 'tall',    x: 0.3, y: 3.4, w: 1.8, d: 7.4, h: 7,   label: 'Lockers + bench', noSqueeze: true },
      { type: 'counter', x: 5,   y: 3.6, w: 0.9, d: 6,   h: 3.5, label: 'Charging + hooks', noSqueeze: true },
      // den — TV on the back wall, sofa facing it, window to the porch behind
      { type: 'tv',    x: 43,   y: 26.3, w: 6, d: 1.5, h: 2 },
      { type: 'sofa',  x: 42.5, y: 34,   w: 8, d: 3.5, h: 2.8, faces: '-y' },
      { type: 'table', x: 44.5, y: 30,   w: 4, d: 2.5, h: 1.3 },
      // powder / coat
      { type: 'counter', x: 46.3, y: 23.9, w: 3.2, d: 1.8, h: 3, sink: true },
      { type: 'toilet',  x: 50.1, y: 22.4, w: 1.7, d: 2.3, h: 1.4 },
      { type: 'counter', x: 41.3, y: 23.8, w: 4.4, d: 2,   h: 3, sink: true, uppers: true, label: 'Wet bar · bev fridge' },
      { type: 'tall',    x: 36.1, y: 31.3, w: 1.7, d: 8.4, h: 7 },
      // primary suite
      { type: 'bed',     x: 60.5, y: 4.5,  w: 7.2, d: 6.5, h: 2.2, label: 'King' },
      { type: 'table',   x: 65.8, y: 2.3,  w: 1.9, d: 2,   h: 2 },
      { type: 'table',   x: 65.8, y: 11.2, w: 1.9, d: 2,   h: 2 },
      { type: 'dresser', x: 52.3, y: 5,    w: 1.8, d: 6,   h: 3 },
      { type: 'chair',   x: 54.5, y: 11.5, w: 3,   d: 3,   h: 2.7 },
      { type: 'counter', x: 70,   y: 0.3,  w: 7,   d: 2,   h: 3, sink: 2 },   // double vanity
      { type: 'tub',     x: 74.8, y: 4.5,  w: 2.9, d: 5.5, h: 2 },
      { type: 'shower',  x: 68.3, y: 10.8, w: 4.5, d: 4.9, h: 7.5 },
      { type: 'toilet',  x: 75.4, y: 14,   w: 2.3, d: 1.7, h: 1.4 },
      // primary closet — double hanging on both long walls, rods raised for tall owners
      { type: 'hanging', x: 64.3, y: 18,   w: 2, d: 11.7, h: 9, rods: [46 / 12, 92 / 12], label: 'Double hang' },
      { type: 'hanging', x: 75.7, y: 18,   w: 2, d: 11.7, h: 9, rods: [46 / 12, 92 / 12], label: 'Double hang' },
      { type: 'island',  x: 69.5, y: 21,   w: 3, d: 5,    h: 3 },
      { type: 'appliance', x: 53,   y: 27.2, w: 5.4, d: 2.5, h: 3.3 },         // washer / dryer
      { type: 'counter',   x: 58.8, y: 27.7, w: 4.8, d: 2,   h: 3, sink: true },
      { type: 'tall',      x: 52.3, y: 21,   w: 1.7, d: 5,   h: 7 },
    ],
  },

  // ═══════════════════════════ UPPER FLOOR ══════════════════════════════════
  upper: {
    name: 'Upper Floor',
    finish: 'good',
    floor: UPPER_FLOOR,
    ceiling: 9,
    footprint: [MAIN_BLOCK],
    noSqueeze: true,              // drawn at the final (5,000 sq ft) size
    rooms: [
      // — right: bedrooms 1 and 2 share a Jack-and-Jill bath between them —
      { id: 'bed1',   name: 'Bedroom 1', use: 'bed',  x: 36, y: 0,  w: 16, d: 12 },
      { id: 'jjBath', name: 'Jack & Jill Bath', use: 'bath', x: 40, y: 12, w: 12, d: 8 },
      { id: 'linen2', name: 'Linen',     use: 'service', x: 36, y: 12, w: 4, d: 8 },
      { id: 'bed2',   name: 'Bedroom 2', use: 'bed',  x: 36, y: 20, w: 16, d: 16, note: 'incl. closet' },
      // — left: enclosed bonus room (closet + egress window: a bedroom or study later),
      //   kids' laundry, stairs, bedroom 3 with its own bath at the front —
      { id: 'bonus',    name: "Kids' Hangout", use: 'living', x: 0, y: 0, w: 14, d: 11,
        note: 'bonus room · future bedroom / study' },
      { id: 'bonusCloset', name: 'Closet',     use: 'service', x: 0, y: 11, w: 5, d: 4 },
      { id: 'laundry2', name: "Kids' Laundry", use: 'service', x: 5, y: 11, w: 9, d: 4 },
      { ...STAIR_BOX, y: 15, finished: false },
      { id: 'bed3',   name: 'Bedroom 3', use: 'bed',  x: 0,  y: 24, w: 14, d: 12, note: 'incl. closet' },
      { id: 'bath3',  name: 'Bath 3',    use: 'bath', x: 14, y: 28, w: 6,  d: 8 },
      // — center: open to below — the kitchen and the dining room get double-height
      //   space and the gable glass; a 4 ft bridge crosses between them —
      { id: 'kitchenVoid', name: 'Open to Kitchen', use: 'void', x: 18, y: 0,  w: 14, d: 14, void: true },
      { id: 'diningVoid',  name: 'Open to Living',  use: 'void', x: 20, y: 18, w: 12, d: 9,  void: true },
      { id: 'foyerVoid',   name: 'Open to Foyer',   use: 'void', x: 20, y: 27, w: 12, d: 9,  void: true },
    ],
    openPlan: [['stair', '_hall'], ['diningVoid', 'foyerVoid']],
    openings: [
      // railings where the halls and the bridge overlook the kitchen, dining and foyer
      { kind: 'railing', on: 'x', at: 18, from: 0,  to: 14 },
      { kind: 'railing', on: 'y', at: 14, from: 18, to: 32 },
      { kind: 'railing', on: 'x', at: 32, from: 0,  to: 14 },
      { kind: 'railing', on: 'y', at: 18, from: 20, to: 32 },
      { kind: 'railing', on: 'x', at: 20, from: 18, to: 28 },
      { kind: 'railing', on: 'x', at: 32, from: 18, to: 36 },
      // doors
      { kind: 'door', on: 'x', at: 36, from: 8.5, to: 11.5 },              // bed 1
      { kind: 'door', on: 'y', at: 12, from: 41, to: 43.5, swing: -1 },     // bed 1 → J&J
      { kind: 'door', on: 'y', at: 20, from: 41, to: 43.5 },                // bed 2 → J&J
      { kind: 'door', on: 'x', at: 36, from: 14.5, to: 17 },                // linen
      { kind: 'door', on: 'x', at: 36, from: 21, to: 24 },                  // bed 2
      { kind: 'door', on: 'x', at: 14, from: 24.5, to: 27.5, swing: -1 },   // bed 3
      { kind: 'door', on: 'x', at: 14, from: 30, to: 32.5 },                // bed 3 → bath 3
      { kind: 'door', on: 'x', at: 14, from: 6.5, to: 9.5, swing: -1 },    // bonus room
      { kind: 'door', on: 'y', at: 11, from: 1, to: 3.5 },                  // bonus closet
      { kind: 'door', on: 'x', at: 14, from: 11.5, to: 14.5, swing: -1 },  // kids' laundry
      // windows — rear (sunset)
      { kind: 'window', on: 'y', at: 0, from: 3,  to: 10 },                 // bonus room (egress size)
      { kind: 'window', on: 'y', at: 0, from: 20, to: 32, sill: 1.5 },      // rear gable glass → kitchen below
      { kind: 'window', on: 'y', at: 0, from: 40, to: 47 },                 // bed 1
      // windows — front
      { kind: 'window', on: 'y', at: 36, from: 4,  to: 10 },                // bed 3
      { kind: 'window', on: 'y', at: 36, from: 22, to: 30, sill: 1.5 },     // front gable glass
      { kind: 'window', on: 'y', at: 36, from: 41, to: 47 },                // bed 2
      // windows — sides
      { kind: 'window', on: 'x', at: 0,  from: 6,  to: 10 },                // bonus room
      { kind: 'window', on: 'x', at: 0,  from: 17.5, to: 21.5, sill: 5 },   // stair
      { kind: 'window', on: 'x', at: 0,  from: 27, to: 33 },                // bed 3
      { kind: 'window', on: 'x', at: 52, from: 14, to: 17, sill: 5 },       // J&J, high
      { kind: 'window', on: 'x', at: 52, from: 25, to: 31 },                // bed 2
    ],
    furniture: [
      // bedroom 1
      { type: 'bed',  x: 42,   y: 4,    w: 5,   d: 6.7, h: 2.2, label: 'Queen' },
      { type: 'desk', x: 36.5, y: 0.3,  w: 4,   d: 2,   h: 2.5 },
      { type: 'tall', x: 48,   y: 10.1, w: 2,   d: 1.7, h: 7 },
      { type: 'chimney', x: 50.2, y: 3, w: 1.8, d: 6, h: 9, label: 'Chimney' },  // from the living-room fireplace
      // Jack & Jill: double vanity, tub/shower, toilet
      { type: 'counter', x: 44.5, y: 12.3, w: 7.2, d: 1.9, h: 3, sink: 2 },
      { type: 'tub',     x: 49,   y: 14.6, w: 2.7, d: 5.1, h: 1.8 },
      { type: 'toilet',  x: 45.5, y: 17.4, w: 1.7, d: 2.3, h: 1.4 },
      // bedroom 2 (closet along the hall wall)
      { type: 'bed',  x: 42,   y: 26,   w: 5,   d: 6.7, h: 2.2, label: 'Queen' },
      { type: 'desk', x: 46,   y: 33.7, w: 5,   d: 2,   h: 2.5 },
      { type: 'tall', x: 36.3, y: 27,   w: 2,   d: 6,   h: 7 },
      // bedroom 3 + bath 3
      { type: 'bed',  x: 0.3,  y: 28,   w: 6.7, d: 5,   h: 2.2, label: 'Queen' },
      { type: 'desk', x: 8,    y: 33.7, w: 5,   d: 2,   h: 2.5 },
      { type: 'tall', x: 6.5,  y: 24.3, w: 5,   d: 2,   h: 7 },
      { type: 'shower',  x: 14.3, y: 33,   w: 3.4, d: 2.7, h: 7.5 },
      { type: 'counter', x: 17.9, y: 28.3, w: 1.8, d: 3.2, h: 3, sink: true },
      { type: 'toilet',  x: 18,   y: 31.8, w: 1.7, d: 2.3, h: 1.4 },
      // kids' hangout: TV + gaming wall, L sectional, bean bags, a desk by the window
      { type: 'tv',    x: 0.3, y: 2.5,  w: 1.5, d: 5.5, h: 2, label: 'TV + games' },
      { type: 'sofa',  x: 7.5, y: 1.5,  w: 3.2, d: 7,   h: 2.8, faces: '-x', label: 'Sectional' },
      { type: 'sofa',  x: 3,   y: 7.4,  w: 7.7, d: 3.2, h: 2.8, faces: '-y' },
      { type: 'chair', x: 3.5, y: 3.5,  w: 2.4, d: 2.4, h: 1.6, label: 'Bean bags' },
      { type: 'desk',  x: 11,  y: 0.3,  w: 2.7, d: 4,   h: 2.5 },
      { type: 'tall',  x: 0.3, y: 12.6, w: 4.4, d: 2.1, h: 7 },
      { type: 'appliance', x: 5.5, y: 12.2, w: 5, d: 2.5, h: 3.3 },
    ],
  },

  // ═════════════════════════ WALKOUT BASEMENT ═══════════════════════════════
  basement: {
    name: 'Walkout Basement',
    finish: 'better',
    floor: BASEMENT_FLOOR,
    ceiling: 9,
    noSqueeze: true,              // drawn at the final (5,000 sq ft) size
    footprint: [MAIN_BLOCK, WING],   // dug out under the primary wing for the gym
    rooms: [
      // rear (y = 0) walks out to the covered patio; the other sides are below grade
      // — left: guest suite with its own patio door; its bath also opens to the
      //   hall, which has an outside door for pool guests —
      { id: 'guest',      name: 'Guest Suite',  use: 'bed',     x: 0, y: 0,   w: 14, d: 9.5 },
      { id: 'guestCloset',name: 'Closet',       use: 'service', x: 0, y: 9.5, w: 5,  d: 5.5 },
      { id: 'guestBath',  name: 'Guest / Pool Bath', use: 'bath', x: 5, y: 9.5, w: 9, d: 5.5 },
      { ...STAIR_BOX, y: 15, finished: false },
      { id: 'mechanical', name: 'Mechanical',   use: 'service', x: 0,  y: 24, w: 18, d: 12, finished: false,
        finish: { walls: 'paintedBlock' } },
      // — center/right: lounge and bar on the walkout side, theater and sim behind —
      { id: 'lounge',  name: 'Sports Lounge', use: 'rec', x: 18, y: 0,  w: 17, d: 18, labelDy: 4.8 },
      { id: 'bar',     name: 'Bar & Game Room', use: 'rec', x: 35, y: 0, w: 17, d: 12, labelDy: -3 },
      // gym in the dug-out space under the primary wing: unfinished, stall mats after move-in
      { id: 'gym',     name: 'Gym',           use: 'rec', x: 52, y: 0,  w: 26, d: 16, finished: false,
        note: 'unfinished · stall mats', finish: { floor: 'stallMats', walls: 'paintedBlock' } },
      // storm shelter under the wing: poured-concrete walls and its own concrete lid
      { id: 'safe',        name: 'Storm Shelter', use: 'service', x: 52, y: 16, w: 12, d: 10, finished: false,
        note: 'concrete walls + lid', finish: { walls: 'paintedBlock' } },
      { id: 'wingStorage', name: 'Storage',   use: 'service', x: 64, y: 16, w: 14, d: 10, finished: false,
        finish: { walls: 'paintedBlock' } },
      { id: 'sim',     name: 'Golf Sim Bay',  use: 'rec', x: 36, y: 12, w: 16, d: 24,
        floorOffset: -2, ceiling: 11, note: "11' ceiling, slab dropped 2'", finish: { floor: 'turf' } },
      // Phase 1 leaves the theater an unfinished shell with rough-in; Phase 2 finishes it
      { id: 'theater', name: 'Theater',       use: 'rec', x: 18, y: 18, w: 18, d: 18, finished: false,
        note: 'finished in Phase 2', finish: { roughIn: true },
        phase2: { finished: true, note: 'Phase 2', finish: { floor: 'theaterCarpet', walls: 'acoustic', ceiling: 'acousticCeiling' } } },
    ],
    openPlan: [['lounge', '_hall'], ['stair', '_hall'], ['lounge', 'bar']],
    openings: [
      // walkout wall (y = 0)
      { kind: 'glassdoor', on: 'y', at: 0, from: 2,    to: 10 },            // guest suite (also its egress)
      { kind: 'door',      on: 'y', at: 0, from: 14.5, to: 17.5 },          // pool entry → hall → pool bath
      { kind: 'glassdoor', on: 'y', at: 0, from: 20,   to: 33 },            // lounge
      { kind: 'window',    on: 'y', at: 0, from: 36,   to: 39.5 },          // bar & game room
      { kind: 'glassdoor', on: 'y', at: 0, from: 42,   to: 50 },            // bar & game room
      { kind: 'glassdoor', on: 'y', at: 0, from: 60,   to: 68 },            // gym (the one opening; also egress / move-in)
      // guest suite + bath
      { kind: 'door', on: 'x', at: 14,  from: 5.5,  to: 8.5, swing: -1 },   // hall → guest suite
      { kind: 'door', on: 'y', at: 9.5, from: 1,    to: 3.5 },              // guest closet
      { kind: 'door', on: 'y', at: 9.5, from: 10.5, to: 13 },               // guest suite → bath
      { kind: 'door', on: 'x', at: 14,  from: 10.5, to: 13 },               // hall → bath (pool guests)
      // utility
      { kind: 'door', on: 'y', at: 24,  from: 14.5, to: 17.5 },             // mechanical
      // rec
      { kind: 'door',    on: 'x', at: 18, from: 20, to: 23, swing: -1 },    // theater
      { kind: 'opening', on: 'y', at: 12, from: 36.5, to: 39.5 },           // sim (steps down from the bar)
      { kind: 'opening', on: 'x', at: 52, from: 1,  to: 6 },               // bar & game room → gym
      { kind: 'door',    on: 'y', at: 16, from: 55, to: 58 },               // gym → storm shelter (steel)
      { kind: 'door',    on: 'y', at: 16, from: 70, to: 73 },               // gym → storage
    ],
    furniture: [
      // theater (Phase 2) — screen on the front wall, two rows of four recliners
      { type: 'screen',   x: 21,   y: 35.4, w: 12, d: 0.3, h: 7, elev: 1.5, label: 'Screen', phase: 2 },
      { type: 'recliner', x: 21.5, y: 27,   w: 12, d: 3.3, h: 3.3, seats: 4, faces: '+y', phase: 2 },
      { type: 'platform', x: 20,   y: 18.3, w: 14, d: 6, h: 1, phase: 2 },
      { type: 'recliner', x: 21.5, y: 20,   w: 12, d: 3.3, h: 3.3, seats: 4, faces: '+y', elev: 1, phase: 2 },
      // golf sim — 16 x 24, hitting toward the front wall, seating behind
      { type: 'screen', x: 37.5, y: 35.4, w: 13, d: 0.3, h: 9.5, elev: 0.5, label: 'Impact screen' },
      { type: 'mat',    x: 41.5, y: 21.5, w: 5,  d: 5,   h: 0.15, label: 'Hitting mat' },
      { type: 'steps',  x: 36.5, y: 12.3, w: 3,  d: 4,   h: 2 },
      { type: 'sofa',   x: 42,   y: 12.5, w: 7,  d: 3,   h: 2.6, faces: '+y' },
      // sports lounge — TV on the theater wall, sectional + recliner facing it
      { type: 'tv',       x: 22.5, y: 16.3, w: 8,   d: 1.5, h: 2, screenH: 4.2, label: '98" TV' },
      { type: 'sofa',     x: 19.5, y: 4,    w: 11,  d: 3.5, h: 2.8, faces: '+y', label: 'Sectional' },
      { type: 'sofa',     x: 18.3, y: 4,    w: 3.5, d: 8.5, h: 2.8, faces: '+x' },
      { type: 'recliner', x: 28.7, y: 9,    w: 3.3, d: 3.6, h: 3.4, faces: '+y', label: 'Recliner' },
      { type: 'table',    x: 23,   y: 8.5,  w: 5,   d: 2.5, h: 1.4 },
      // bar & game room — back bar on the sim wall, bar top, game table by the glass
      { type: 'counter',  x: 40.5, y: 10.2, w: 8,   d: 1.8, h: 3, label: 'Wet bar', sink: true, uppers: true },
      { type: 'island',   x: 40.5, y: 5.5,  w: 8,   d: 2,   h: 3.5, label: 'Bar top' },
      { type: 'table',    x: 36,   y: 1.5,  w: 4,   d: 4,   h: 2.5, chairs: 4, label: 'Games' },
      // gym (26 x 16, unfinished: sealed concrete, stall mats after move-in)
      { type: 'mat',       x: 53,   y: 2,   w: 8,   d: 8,   h: 0.15, label: 'Lifting platform' },
      { type: 'equipment', x: 54.5, y: 2.3, w: 5,   d: 4,   h: 7.5, label: 'Rack' },
      { type: 'bench',     x: 56.1, y: 6.8, w: 1.8, d: 4.5, h: 1.5 },
      { type: 'equipment', x: 71,   y: 2,   w: 3,   d: 7,   h: 4.5, label: 'Treadmill' },
      { type: 'equipment', x: 75,   y: 2,   w: 2.5, d: 4.5, h: 4,   label: 'Bike' },
      { type: 'equipment', x: 63,   y: 12.5, w: 8,  d: 2,   h: 1.5, label: 'Rower' },
      { type: 'equipment', x: 53,   y: 12,  w: 6,   d: 3.5, h: 3,   label: 'Dumbbells' },
      // guest suite + bath
      { type: 'bed',     x: 0.3, y: 3,    w: 6.7, d: 5,   h: 2.2, label: 'Queen' },
      { type: 'dresser', x: 7.5, y: 7.6,  w: 4.5, d: 1.7, h: 3 },
      { type: 'shower',  x: 5.3, y: 9.8,  w: 3.5, d: 5,   h: 7.5 },
      { type: 'counter', x: 9,   y: 13.1, w: 3,   d: 1.8, h: 3, sink: true },
      { type: 'toilet',  x: 12.2, y: 12.6, w: 1.7, d: 2.3, h: 1.4 },
      // mechanical (14 x 12: two HVAC systems, water heaters, well tank + softener, panels, generator transfer)
      { type: 'appliance', x: 0.5, y: 24.5, w: 3,   d: 3,   h: 6 },
      { type: 'appliance', x: 4.5, y: 24.5, w: 3,   d: 3,   h: 6 },
      { type: 'appliance', x: 8.5, y: 24.5, w: 2.2, d: 2.2, h: 5.5 },
      { type: 'appliance', x: 0.5, y: 33,   w: 2.5, d: 2.5, h: 5.5 },
      { type: 'appliance', x: 8,   y: 34,   w: 5.5, d: 1.5, h: 6 },          // electrical panels
      { type: 'appliance', x: 14.5, y: 32,  w: 3,   d: 3,   h: 6 },          // generator transfer / Starlink + network rack
      { type: 'bench',     x: 52.3, y: 24,  w: 11,  d: 1.7, h: 1.5 },        // storm shelter bench
    ],
  },
};

// Exterior structures ----------------------------------------------------------
export const exterior = {
  porch: {
    x: 0, y: 40, w: 52, d: 10, floor: -0.5,     // 10 ft: room for rockers and the walk
    postSpacing: 10.4, postSize: 0.8,       // cedar posts on stone bases
    steps: { x: 22, w: 8 },                 // centered on the front door
    roofLow: 10, roofHigh: 11.5,            // shed roof under the upper windows
  },
  deck: {
    x: 0, y: -14, w: 78, d: 14, floor: -0.15,      // runs across the primary wing too
    pierSpacing: 13, pierSize: 2,           // stone piers down to the patio
    railing: 'cable', railHeight: 3.5,
    // L-shaped stair down to the pool deck at the wing end: down toward the pool
    // (west), a 4 x 4 landing, then back south to the patio
    stairs: { x: 48, w: 4, firstRun: 8, riser: 7.25 / 12, tread: 10 / 12 },
    // covered section over the outdoor dining area: hip roof on cedar posts
    cover: { x: 16, y: -12.5, w: 18, d: 12.5, eave: 9.5, pitch: 4 },  // ridge stays below the upper rear window
    // outdoor kitchen on the open garage-side end, next to the pass-through:
    // L-shaped stone counter (9.5 ft main run + 5 ft return), built-in gas grill,
    // undercounter fridge, raised bar ledge on the yard side with 3 stools,
    // heat-resistant porcelain pad under the cooking area.
    kitchen: { x: 3, y: -7.5, len: 9.5, depth: 2.5, returnLen: 5, returnDepth: 2.5,
      grillAt: 4.5, grillW: 3, ledgeDepth: 1.3, ledgeH: 3.5, stools: 3, minWalk: 3 },
    barCounter: { x: 19, y: -1.8, w: 10, d: 1.5, h: 3.5 }, // outside the pass-through
  },
  // (no breezeway: the garage attaches straight to the house at the mudroom)
  breezeway: null,
  // 3-car garage attached to the house's south wall, doors facing the motor court at the
  // rear (side-load: nothing faces the street). Door from the garage into the mudroom.
  garage: {
    name: '3-Car Garage',
    noSqueeze: true,                        // drawn at the final size: 24 ft deep
    finish: 'better',
    floor: -1,
    ceiling: 10,
    wallTop: 11,                            // eave 10 ft above the main floor
    place: { anchor: [0, 22], at: [0, 22], angle: 0 },
    footprint: [{ x: -36, y: 10, w: 36, d: 24 }],
    rooms: [{ id: 'garage', name: '3-Car Garage', use: 'garage', x: -36, y: 10, w: 36, d: 24, finished: false,
      note: 'attic storage above · pull-down stairs' }],
    openings: [
      { kind: 'garage', on: 'y', at: 10, from: -34, to: -25 },    // doors face the motor court
      { kind: 'garage', on: 'y', at: 10, from: -23, to: -14 },
      { kind: 'garage', on: 'y', at: 10, from: -12, to: -3 },
      { kind: 'door',   on: 'x', at: 0,   from: 11.5, to: 14.5 }, // into the mudroom (fire-rated, self-closing)
      { kind: 'window', on: 'y', at: 34, from: -31, to: -27 },
      { kind: 'window', on: 'y', at: 34, from: -20, to: -16 },
      { kind: 'window', on: 'y', at: 34, from: -9, to: -5 },
      { kind: 'window', on: 'x', at: -36, from: 19, to: 25 },
    ],
    furniture: [
      { type: 'tall', x: -35.7, y: 30.2, w: 20, d: 2.5, h: 7, label: 'Storage + workbench wall' },
      { type: 'car', x: -32.5, y: 13, w: 6, d: 16, h: 5 },        // three cars, pulled in nose-first
      { type: 'car', x: -21.5, y: 13, w: 6, d: 16, h: 5 },
      { type: 'car', x: -10.5, y: 13, w: 6, d: 16, h: 5 },
    ],
    roof: { id: 'garage', type: 'gable', x: -36, y: 10, w: 36, d: 24, ridge: 'x', eave: 10, pitch: 8, overhang: 1.5 },
  },
  roofs: [
    // eave = height of the eave line above main floor. pitch = rise per 12.
    { id: 'main',   type: 'gable', x: 0,   y: 0,  w: 52, d: 40, ridge: 'x', eave: 20.5, pitch: 8,  overhang: 1.5 },
    // center gable, front and rear, over the foyer / dining / loft
    { id: 'center', type: 'crossGable', centerX: 26, width: 22, eave: 20.5, pitch: 12, overhang: 1.5, brackets: 'cedar' },
    { id: 'wing',   type: 'gable', x: 52,  y: 0,  w: 26, d: 30, ridge: 'y', eave: 11, pitch: 8, overhang: 1.5 },
  ],
  wainscotHeight: 3.5,   // stone veneer band on the main-level walls
  // landing inside the garage at the mudroom door, one step up from the garage floor
  stoop: { x: -4, y: 13, w: 4, d: 5, top: -0.05 },
};

/** The garage's local plan → site plan (rotated and moved into place), and back. */
export function garageFrame() {
  const { anchor: [lx, ly], at: [tx, ty], angle } = exterior.garage.place;
  const t = (angle * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  return {
    angle,
    toWorld: ([x, y]) => [tx + (x - lx) * c - (y - ly) * s, ty + (x - lx) * s + (y - ly) * c],
    toLocal: (x, y) => [lx + (x - tx) * c + (y - ty) * s, ly - (x - tx) * s + (y - ty) * c],
    svg: `translate(${tx} ${ty}) rotate(${angle}) translate(${-lx} ${-ly})`,
  };
}

/**
 * The garage link's outline: from the breezeway's far wall to the angled garage
 * wall, between y0 and y1. Also returns where the garage wall crosses any y.
 */
export function garageLink() {
  if (!exterior.garage.link) return null;
  const G = garageFrame();
  const g = exterior.garage;
  const f = g.footprint[0];
  const [ax, ay] = G.toWorld([f.x + f.w, f.y]);
  const [bx, by] = G.toWorld([f.x + f.w, f.y + f.d]);
  const xg = (y) => ax + ((y - ay) / (by - ay)) * (bx - ax);   // garage east wall at y
  const { y0, y1 } = g.link;
  const xb = exterior.breezeway.x;
  return { ...g.link, xb, xg, poly: [[xb, y0], [xg(y0), y0], [xg(y1), y1], [xb, y1]] };
}

/** Convex hull of points (for paved areas given as a handful of corners). */
function hull(pts) {
  const P = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const p of P) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  const up = [];
  for (const p of P.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

/**
 * The motor court: one paved area from the house's south wall and the garage
 * doors out to the retaining wall line (room to turn a truck around). Its edge
 * is held up by a retaining wall where the ground drops away toward the
 * patio and pool; the wall tapers out away from them (see retainingWalls()).
 */
function motorCourt() {
  // drawn at the final size: an apron across the garage doors and the arch
  // (22 ft to back out), and a hammerhead arm to back into, so a truck can
  // come up the drive past the garage, turn and pull nose-first into any bay. The
  // apron's corner by the house is clipped so the retaining wall is one short
  // run from the house corner, tapering out.
  return [
    { poly: hull([[0, 10], [0, 0], [-16, -12], [-58, -12], [-58, 10]]), wall: true, noSqueeze: true },
    { x: -49, y: 10, w: 12, d: 30, noSqueeze: true, name: 'drive' },   // drive along the garage's end wall
    { poly: hull([[-52, -12], [-38, -12], [-38, -32], [-52, -32]]), wall: true, noSqueeze: true, name: 'hammerhead' },
  ];
}

// Site ---------------------------------------------------------------------------
export const site = {
  lot: { x: -110, y: -120, w: 240, d: 290 },
  terrain: {
    frontGrade: -1.5,       // lawn grade in front of the house
    courtGrade: -1.25,      // motor court, breezeway and garage apron: main-floor level
    walkoutGrade: -10.5,    // patio level = basement floor
    // Side yards are graded lawn at up to `maxSlope` (run : rise). Garage side:
    // the motor court, breezeway and garage sit at main-floor level; the lawn
    // falls away from them and rises from the patio / pool deck level, and
    // where those meet a retaining wall holds the court's edge (tallest at the
    // patio corner, tapering out away from the house and pool).
    // Wing side: main-floor level forward of `north.highY`, falling toward the rear.
    maxSlope: 3,
    north: { highY: 28 },
    westFall: 0.035,        // continued fall past the pool, ft per ft
    rollAmplitude: 1.8,     // gentle rolling away from the house
  },
  road:      { y: 156, width: 22 },
  driveway:  { width: 12, path: [[-43, 145], [-43, 10]] },        // past the garage's end wall to the court
  // motor court at main-floor level: come up the drive past the garage, turn around
  // and pull nose-first into the garage.
  // Entries are rectangles, or { poly } (convex) for curved / angled paving.
  courtyard: motorCourt(),

  coveredPatio: { x: 0, y: -14, w: 52, d: 14 },                 // under the deck
  // Large concrete pavers in a grid with grass strips, patio → pool deck
  // The graded rear yard, flat at patio level. Phase 1 is lawn; Phase 2 paves it as the pool deck.
  poolDeck:  { x: 0, y: -90, w: 74, d: 64 },
  furniture: [
    { type: 'table',   x: 40, y: -9,  w: 7,   d: 3.5, h: 2.5, elev: 'deck', chairs: 6 },
    { type: 'sofa',    x: 21, y: -12.3, w: 8, d: 3,   h: 2.6, elev: 'deck', faces: '+y' },  // under the covered section
    // outdoor rinse shower by the basement pool door
    { type: 'shower',  x: 11.2, y: -3.2, w: 3, d: 3, h: 7.5, label: 'Rinse shower', noSqueeze: true },
    // private sitting area off the primary suite, facing the sunset
    { type: 'sofa',    x: 63, y: -4.4, w: 6,   d: 3,   h: 2.6, elev: 'deck', faces: '-y', label: 'Sitting area' },
    { type: 'table',   x: 64.5, y: -8, w: 3,   d: 2,   h: 1.4, elev: 'deck' },
    { type: 'chair',   x: 62, y: -12.3, w: 2.6, d: 2.6, h: 2.7, elev: 'deck', faces: '+y' },
    { type: 'chair',   x: 67.5, y: -12.3, w: 2.6, d: 2.6, h: 2.7, elev: 'deck', faces: '+y' },
  ],
  // Utility stub-outs installed in Phase 1 for the Phase 2 pool and pool house.
  stubOuts: [
    { id: 'S1', name: 'Pool house', services: 'water · sewer · power · data', x: 73, y: -66 },
    { id: 'S2', name: 'Pool equipment pad', services: '240V power · gas · water', x: 47, y: -102 },
    { id: 'S3', name: 'Hot tub', services: 'power · gas', x: 33, y: -35.5 },
  ],
};

// Phases ---------------------------------------------------------------------------
// Phase 1 = the initial build. Phase 2 (a few years later) adds the pool,
// raised hot tub, pool deck and pool house. The 3D view has a Phase toggle;
// the site plan draws Phase 2 as dashed outlines.
export const phases = {
  default: 1,
  1: {
    label: 'Phase 1 · initial build',
    // grass-strip paver grid off the covered patio, extended toward the yard; lawn beyond
    paverGrid: { x: 6, y: -32, w: 40, d: 18, paver: 3.5, grass: 0.5 },
  },
  2: {
    label: 'Phase 2 · pool + pool house',
    paverGrid: { x: 6, y: -26, w: 40, d: 12, paver: 3.5, grass: 0.5 },
    pool:   { x: 18, y: -70, w: 16, d: 36, depth: 5,
      // sundeck (tanning ledge) at the far end, ~9" of water, three in-pool loungers
      sundeck: { d: 10, water: 0.75, loungers: 3 } },
    hotTub: { x: 22, y: -34, w: 8, d: 8, raised: 1.5 },      // house end, spills into the pool
    furniture: [
      // fire pit beside the pool (garage side) inside a big U-shaped outdoor couch, open toward the pool
      { type: 'firepit', x: 6,   y: -46.5, w: 4,  d: 4,  h: 1.3 },
      { type: 'sofa',    x: 0.5, y: -51,   w: 3,  d: 13, h: 2.7, faces: '+x', label: 'U couch' },
      { type: 'sofa',    x: 3.5, y: -41,   w: 9,  d: 3,  h: 2.7, faces: '-y' },
      { type: 'sofa',    x: 3.5, y: -51,   w: 9,  d: 3,  h: 2.7, faces: '+y' },
      // pool loungers, backs to the lawn, facing the pool
      { type: 'lounger', x: 8, y: -61,   w: 6.5, d: 2.5, h: 1.2, back: '-x' },
      { type: 'lounger', x: 8, y: -66,   w: 6.5, d: 2.5, h: 1.2, back: '-x' },
      { type: 'lounger', x: 8, y: -71,   w: 6.5, d: 2.5, h: 1.2, back: '-x' },
    ],
    // ~800 sq ft pool house on the north side of the pool (the wing side), porch
    // facing the pool; the slope down from the garage stays open for sledding.
    // White board-and-batten, black metal roof, vaulted gathering room, wet bar
    // (no kitchen), pool bath off the porch, and a pool storage room.
    poolHouse: {
      name: 'Pool House',
      finish: 'better',
      floor: -10,                 // 6" above the pool deck
      ceiling: 9,                 // bath ceiling; the great room is vaulted to the roof
      wallTop: 10,                // eave height above its floor
      footprint: [{ x: 50, y: -72, w: 25, d: 32 }],   // 25 x 32 = 800 sq ft
      rooms: [
        { id: 'phGreat',   name: 'Gathering Room', use: 'living',  x: 50, y: -64, w: 25, d: 24, finish: { floor: 'slateTile' } },
        // bath on the porch side: swimmers use the outside door, no wet feet through the room
        { id: 'phBath',    name: 'Pool Bath',      use: 'bath',    x: 50, y: -72, w: 10, d: 8 },
        { id: 'phTowel',   name: 'Towels',         use: 'living',  x: 60, y: -72, w: 7,  d: 8, finish: { floor: 'slateTile' } },
        // pool toys + cushions, its own door on the outside
        { id: 'phStorage', name: 'Pool Storage',   use: 'service', x: 67, y: -72, w: 8,  d: 8, finished: false },
      ],
      openPlan: [['phGreat', 'phTowel']],
      openings: [
        // porch wall (x = 50), facing the pool
        { kind: 'door',      on: 'x', at: 50,  from: -69,  to: -66 },            // bath, straight off the porch
        { kind: 'glassdoor', on: 'x', at: 50,  from: -63,  to: -57.5 },
        { kind: 'glassdoor', on: 'x', at: 50,  from: -56,  to: -44 },
        // house-side end (y = -40): solid behind the TV, one window
        { kind: 'window',    on: 'y', at: -40, from: 64,   to: 70 },
        // far end (y = -72): bath window, storage door
        { kind: 'window',    on: 'y', at: -72, from: 54.5, to: 58.5, sill: 5.5 }, // bath, high
        { kind: 'door',      on: 'y', at: -72, from: 69,   to: 73 },              // pool storage, from outside
        // back wall (x = 75)
        { kind: 'window',    on: 'x', at: 75,  from: -54,  to: -46, sill: 4.5 },  // over the wet bar
        { kind: 'window',    on: 'x', at: 75,  from: -69.5, to: -66.5, sill: 5.5 }, // storage, high
        // inside
        { kind: 'door',      on: 'x', at: 60,  from: -71,  to: -68.5 },           // bath, from the towel nook
      ],
      furniture: [
        // wet bar on the back wall (sink + undercounter fridge, no cooking)
        { type: 'counter',   x: 72.7, y: -56,   w: 2,   d: 12,  h: 3, label: 'Wet bar', sink: true },
        { type: 'appliance', x: 72.7, y: -47,   w: 1.9, d: 2,   h: 2.8 },
        { type: 'island',    x: 67.5, y: -55,   w: 2.5, d: 9,   h: 3.5 },
        // gathering area: sectional facing the porch, TV on the house-side end wall
        { type: 'sofa',      x: 58.7, y: -62,   w: 3.3, d: 10,  h: 2.8, faces: '-x', label: 'Sectional' },
        { type: 'sofa',      x: 54,   y: -63.7, w: 8,   d: 3.3, h: 2.8, faces: '+y' },
        { type: 'table',     x: 54.5, y: -59,   w: 3,   d: 5,   h: 1.4 },
        { type: 'chair',     x: 55,   y: -51.5, w: 3,   d: 3,   h: 2.7, faces: '+x' },
        { type: 'tv',        x: 54,   y: -41.7, w: 6,   d: 1.5, h: 2 },
        { type: 'table',     x: 62.5, y: -46.5, w: 4,   d: 4,   h: 2.5, chairs: 4 },
        // pool bath: shower, vanity, toilet
        { type: 'shower',    x: 56.2, y: -68.2, w: 3.5, d: 3.9, h: 7.5 },
        { type: 'counter',   x: 52.5, y: -71.7, w: 4.5, d: 1.8, h: 3, sink: true },
        { type: 'toilet',    x: 52.5, y: -66.1, w: 2.3, d: 1.8, h: 1.4 },
        // towel cabinet, and cushion / toy shelving in the storage room
        { type: 'tall',      x: 65.3, y: -71.5, w: 1.6, d: 6,   h: 7, label: 'Towels' },
        { type: 'tall',      x: 72.8, y: -71.7, w: 1.9, d: 7.4, h: 7, label: 'Cushions / toys' },
      ],
      porch: { x: 42, y: -72, w: 8, d: 32, faces: '-x' },
      roof: { id: 'poolHouse', type: 'gable', x: 42, y: -72, w: 33, d: 32, ridge: 'x', eave: 0, pitch: 8, overhang: 1.5 },
    },
  },
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
  { id: 'front',   name: 'Front approach',  type: 'orbit', eye: [26, 118, 4],    target: [26, 18, 12] },
  { id: 'pool',    name: 'Rear from pool',  type: 'orbit', eye: [26, -78, -3], target: [26, 0, 0] },
  { id: 'kitchen', name: 'Kitchen → pass-through', type: 'walk', level: 'main', at: [22, 19], look: [22, -20], pitch: -0.17 },
  { id: 'entry',   name: 'Front door → living', type: 'walk', level: 'main', at: [26, 33], look: [26, 0], pitch: 0.05 },
  { id: 'living',  name: 'Living room',     type: 'walk', level: 'main', at: [20, 25], look: [38, 19] },
  { id: 'dining',  name: 'Dining',          type: 'walk', level: 'main', at: [36, 12.5], look: [46, -10], pitch: -0.1 },
  { id: 'sim',     name: 'Golf sim',        type: 'walk', level: 'basement', at: [25, 22.5], look: [25, 40], pitch: -0.22 },
  { id: 'theater', name: 'Theater',         type: 'walk', level: 'basement', at: [42, 23.5], look: [42, 40], pitch: -0.2 },
];

export default { meta, build, stair, floors, exterior, site, phases, sun, views, finishLevels, doors };

// ── Size study: take depth out of the house ─────────────────────────────────
// Removes front-to-back strips across the whole site plan: everything past a
// strip moves toward the rear by its width, rooms that cross it get that much
// shorter. Placed to miss the stairs so all floors stay stacked. [start y, width]
export const SQUEEZE = [[6, 2], [27, 2]];
squeezeY(SQUEEZE);
fitFurniture();
// pieces that met after the rooms got shorter
{
  const F = (lvl, pred) => floors[lvl].furniture.find(pred) || {};
  Object.assign(F('main', (f) => f.label === 'King'), { y: 4.4 });
  Object.assign(F('main', (f) => f.type === 'table' && f.x === 65.8 && f.y > 8), { y: 10.9 });
  Object.assign(F('main', (f) => f.label === 'Open shelves'), { y: 2.6, d: 6.1 });
  Object.assign(F('main', (f) => f.type === 'appliance' && f.x === 53), { x: 54.2, w: 4.9 });
  Object.assign(F('main', (f) => f.type === 'counter' && f.x === 58.8), { x: 59.2, w: 4.5 });
}

/** Keep every piece of furniture inside the room it stands in (rooms got shorter). */
function fitFurniture() {
  for (const lvl of Object.values(floors)) {
    for (const f of lvl.furniture || []) {
      const cx = f.x + f.w / 2;
      const cy = f.y + f.d / 2;
      const r = lvl.rooms.find((r) => cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.d);
      if (!r || f.elev) continue;
      const pad = 0.3;
      if (f.d > r.d - 2 * pad) f.d = r.d - 2 * pad;
      if (f.y < r.y + pad - 0.3) f.y = r.y + pad;
      if (f.y + f.d > r.y + r.d - pad + 0.3) f.y = r.y + r.d - pad - f.d;
    }
  }
}

function squeezeY(cuts) {
  const map = (y) => {
    let s = 0;
    for (const [a, w] of cuts) s += y >= a + w ? w : y > a ? y - a : 0;
    return y - s;
  };
  const pt = (p) => { if (Array.isArray(p) && typeof p[1] === 'number') p[1] = map(p[1]); };
  const isFurniture = (o) => typeof o.type === 'string' && !o.ridge;
  const seen = new WeakSet();               // shared objects (e.g. the main block footprint) move once
  const visit = (o, key) => {
    if (!o || typeof o !== 'object' || seen.has(o) || o.noSqueeze) return;
    seen.add(o);
    if (Array.isArray(o)) {
      if (['path', 'poly', 'pts'].includes(key)) { o.forEach(pt); return; }
      if (key === 'sideWall') { o[0] = map(o[0]); o[1] = map(o[1]); return; }
      o.forEach((v) => visit(v, key));
      return;
    }
    if (o.on && typeof o.at === 'number') {                                     // an opening
      if (o.on === 'y') o.at = map(o.at);
      else { o.from = map(o.from); o.to = map(o.to); }
    } else if (typeof o.y === 'number' && typeof o.d === 'number') {
      if (isFurniture(o)) { const c = map(o.y + o.d / 2); o.y = c - o.d / 2; }   // furniture keeps its size
      else { const y1 = map(o.y + o.d); o.y = map(o.y); o.d = y1 - o.y; }       // rooms, footprints, roofs…
    } else if (typeof o.y === 'number') o.y = map(o.y);                          // points
    for (const k of ['y0', 'y1']) if (typeof o[k] === 'number') o[k] = map(o[k]);
    for (const [k, v] of Object.entries(o)) {
      if ((k === 'anchor' || k === 'at') && Array.isArray(v)) { pt(v); continue; }
      if (k !== 'y' && typeof v === 'object') visit(v, k);
    }
  };
  for (const root of [floors, exterior, site, phases, stair]) visit(root);
  for (const v of views) for (const k of ['eye', 'target', 'look']) if (v[k]) v[k][1] = map(v[k][1]);
}
