// Layout format: layout[layer][row][col] = [keycode, modmask]
// Layer 0 = base layer, Layer 1 = function/number layer (shared across all presets)
//
// Physical grid: 4 rows × 12 cols
// Row 0: Tab  [10 alpha keys]  Backspace
// Row 1: Esc  [10 alpha keys]  Enter
// Row 2: ShiftL [10 alpha/sym] ShiftR
// Row 3: Ctrl ] GUI Alt Layer Space ; { ( [ = /   (same for all presets)

// Modifier mask bits
const C = 0x01; // Ctrl L
const S = 0x02; // Shift L
const A = 0x04; // Alt L
const G = 0x08; // GUI L

// Frequently used keycodes
const TAB  = 0xB3, ETR = 0xB0, ESC = 0xB1, BKS = 0xB2;
const SHL  = 0x81, SHR = 0x85, CTL = 0x80, GUI = 0x83, ALT = 0x82;
const SPC  = 0x20, SCL = 0x3B, OCB = 0x7B, OPR = 0x28, OSB = 0x5B;
const EQU  = 0x3D, FSL = 0x2F, CSB = 0x5D;
const HIGHR = 0xFF, NON = 0x00;

// Shared function/number layer (layer 1) — same regardless of alpha layout
const LAYER1 = [
  // Row 0: ` Ins Del Home End PgUp PgDn 7 8 9 \ Bksp
  [[0x60,0],[0xD1,0],[0xD4,0],[0xD2,0],[0xD5,0],[0xD3,0],[0xD6,0],[0x37,0],[0x38,0],[0x39,0],[0x5C,0],[BKS,0]],
  // Row 1: Esc ` F4 F5 F6 — — 4 5 6 ' Enter
  [[ESC,0],[0x60,0],[0xC5,0],[0xC6,0],[0xC7,0],[NON,0],[NON,0],[0x34,0],[0x35,0],[0x36,0],[0x27,0],[ETR,0]],
  // Row 2: ShiftL — — — Battery — — 1 2 3 ↑ ShiftR
  [[SHL,0],[NON,0],[NON,0],[NON,0],[0xF2,0],[NON,0],[NON,0],[0x31,0],[0x32,0],[0x33,0],[0xDA,0],[SHR,0]],
  // Row 3: Ctrl — GUI Alt Layer Space Ctrl+Alt+Del CapsLk 0 ← ↓ →
  [[CTL,0],[NON,0],[GUI,0],[ALT,0],[HIGHR,0],[SPC,0],[0xF1,0],[0xC1,0],[0x30,0],[0xD8,0],[0xD9,0],[0xD7,0]],
];

// Shared bottom row for layer 0 (modifier/symbol row, layout-independent)
const BOTTOM_ROW = [[CTL,0],[CSB,0],[GUI,0],[ALT,0],[HIGHR,0],[SPC,0],[SCL,0],[OCB,0],[OPR,0],[OSB,0],[EQU,0],[FSL,0]];

function makeLayout(row0cols, row1cols, row2cols) {
  return [
    [
      [[TAB,0], ...row0cols, [BKS,0]],
      [[ESC,0], ...row1cols, [ETR,0]],
      [[SHL,0], ...row2cols, [SHR,0]],
      BOTTOM_ROW,
    ],
    LAYER1,
  ];
}

function k(code) { return [code, 0]; }

// ── Presets ───────────────────────────────────────────────────────────────────

// Standard QWERTY
const QWERTY = makeLayout(
  [k(0x71),k(0x77),k(0x65),k(0x72),k(0x74),k(0x79),k(0x75),k(0x69),k(0x6F),k(0x70)], // Q W E R T Y U I O P
  [k(0x61),k(0x73),k(0x64),k(0x66),k(0x67),k(0x68),k(0x6A),k(0x6B),k(0x6C),k(0x3B)], // A S D F G H J K L ;
  [k(0x7A),k(0x78),k(0x63),k(0x76),k(0x62),k(0x6E),k(0x6D),k(0x2C),k(0x2E),k(0x2F)], // Z X C V B N M , . /
);

// Standard Dvorak
const DVORAK = makeLayout(
  [k(0x27),k(0x2C),k(0x2E),k(0x70),k(0x79),k(0x66),k(0x67),k(0x63),k(0x72),k(0x6C)], // ' , . P Y F G C R L
  [k(0x61),k(0x6F),k(0x65),k(0x75),k(0x69),k(0x64),k(0x68),k(0x74),k(0x6E),k(0x73)], // A O E U I D H T N S
  [k(0x3B),k(0x71),k(0x6A),k(0x6B),k(0x78),k(0x62),k(0x6D),k(0x77),k(0x76),k(0x7A)], // ; Q J K X B M W V Z
);

// Standard Colemak
const COLEMAK = makeLayout(
  [k(0x71),k(0x77),k(0x66),k(0x70),k(0x67),k(0x6A),k(0x6C),k(0x75),k(0x79),k(0x3B)], // Q W F P G J L U Y ;
  [k(0x61),k(0x72),k(0x73),k(0x74),k(0x64),k(0x68),k(0x6E),k(0x65),k(0x69),k(0x6F)], // A R S T D H N E I O
  [k(0x7A),k(0x78),k(0x63),k(0x76),k(0x62),k(0x6B),k(0x6D),k(0x2C),k(0x2E),k(0x2F)], // Z X C V B K M , . /
);

// Custom modified Colemak ("Изумруд" / Emerald) — the original hardcoded layout
const EMERALD = makeLayout(
  [k(0x71),k(0x77),k(0x66),k(0x70),k(0x62),k(0x6A),k(0x6C),k(0x75),k(0x79),k(0x2D)], // Q W F P B J L U Y -
  [k(0x61),k(0x72),k(0x73),k(0x74),k(0x67),k(0x6B),k(0x6E),k(0x65),k(0x69),k(0x6F)], // A R S T G K N E I O
  [k(0x7A),k(0x78),k(0x63),k(0x76),k(0x64),k(0x6D),k(0x68),k(0x2C),k(0x2E),k(0x22)], // Z X C V D M H , . "
);

export const PRESETS = {
  'QWERTY':  QWERTY,
  'Dvorak':  DVORAK,
  'Colemak': COLEMAK,
  'Emerald': EMERALD,
};

export const DEFAULT_PRESET = 'QWERTY';
