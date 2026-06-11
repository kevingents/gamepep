// De doolhof-levels.
// Teken je eigen level door deze tekens te gebruiken:
//   #  = muur (kun je niet doorheen)
//   .  = pad (hier loop je)
//   S  = startplek van Steve   (gebruik er precies 1 per level)
//   D  = diamant (verzamelen!)
//   C  = creeper (loopt rond, daar moet je vanaf blijven)
//
// Let op: elke regel moet even lang zijn (even veel tekens).
// Tip: zet diamanten en creepers altijd op een pad, niet in een muur.

export const LEVELS = [
  // Level 1 - rustig, 1 creeper
  [
    '###########',
    '#S........#',
    '#.#.#.#.#.#',
    '#....D....#',
    '#.#.#.#.#.#',
    '#...D.D...#',
    '#.#.#.#.#.#',
    '#....C...D#',
    '###########',
  ],

  // Level 2 - groter, 2 creepers
  [
    '#############',
    '#S..........#',
    '#.#.#.#.#.#.#',
    '#....D.D....#',
    '#.#.#.#.#.#.#',
    '#..D.....D..#',
    '#.#.#.#.#.#.#',
    '#.....D.....#',
    '#.#.#.#.#.#.#',
    '#C.........C#',
    '#.#.#.#.#.#.#',
    '#D...D...D..#',
    '#############',
  ],

  // Level 3 - vol met diamanten, 3 creepers
  [
    '#############',
    '#S.D.....D..#',
    '#.#.#.#.#.#.#',
    '#...D.C.D...#',
    '#.#.#.#.#.#.#',
    '#.D.......D.#',
    '#.#.#.#.#.#.#',
    '#C..D...D..C#',
    '#.#.#.#.#.#.#',
    '#...D.D.D...#',
    '#.#.#.#.#.#.#',
    '#D.........D#',
    '#############',
  ],
]
