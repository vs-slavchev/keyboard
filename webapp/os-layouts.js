// Computer (OS) keyboard layouts.
//
// The keyboard sends physical key positions; the computer's layout decides
// which character each position types. These tables let the UI show — and
// bind — the characters a user actually gets on their layout.
//
// Encoding used by the firmware (no firmware changes needed):
//   code < 0x80          ASCII, mapped to a physical key via the US table
//                        (mirrors _asciimap in ble_hid_keyboard.h)
//   0x88 <= code < 0xF0  raw HID usage = code - 0x88
//   modmask              one modifier keycode held with the key
//                        (0x81 Shift L, 0x86 Alt R = AltGr, ...)

import { KEYS, getLabel, getKeysByGroup } from './keycodes.js';

const RAW_BASE   = 0x88;
const MOD_SHIFT  = 0x81;
const MOD_ALTGR  = 0x86;
const MOD_NAMES  = {
  0x80: 'Ctrl', 0x81: 'Shift', 0x82: 'Alt', 0x83: 'GUI',
  0x84: 'Ctrl', 0x85: 'Shift', 0x86: 'AltGr', 0x87: 'GUI',
};

// Physical key (KeyboardEvent.code name) → HID usage ID
const HID = {
  Backquote: 0x35, Minus: 0x2D, Equal: 0x2E,
  BracketLeft: 0x2F, BracketRight: 0x30, Backslash: 0x31,
  Semicolon: 0x33, Quote: 0x34, Comma: 0x36, Period: 0x37, Slash: 0x38,
  IntlBackslash: 0x64, Space: 0x2C,
};
for (let i = 0; i < 26; i++) HID['Key' + String.fromCharCode(65 + i)] = 0x04 + i;
for (let i = 1; i <= 9; i++) HID['Digit' + i] = 0x1D + i;
HID.Digit0 = 0x27;

// Letter keys default to [x, X]; tables list only what differs.
// Each entry: [plain, shift, altgr?] — '' means nothing on that level.
// `dead` lists [key, level] pairs that are dead keys (accent + next key).
const LAYOUT_DEFS = {
  us: {
    name: 'English (US)',
    keys: {
      Backquote: ['`', '~'], Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'],
      Digit4: ['4', '$'], Digit5: ['5', '%'], Digit6: ['6', '^'], Digit7: ['7', '&'],
      Digit8: ['8', '*'], Digit9: ['9', '('], Digit0: ['0', ')'], Minus: ['-', '_'],
      Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
      Backslash: ['\\', '|'], Semicolon: [';', ':'], Quote: ["'", '"'],
      Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?'],
    },
    dead: [],
  },
  gb: {
    name: 'English (UK)',
    keys: {
      Backquote: ['`', '¬', '¦'], Digit1: ['1', '!'], Digit2: ['2', '"'], Digit3: ['3', '£'],
      Digit4: ['4', '$', '€'], Digit5: ['5', '%'], Digit6: ['6', '^'], Digit7: ['7', '&'],
      Digit8: ['8', '*'], Digit9: ['9', '('], Digit0: ['0', ')'], Minus: ['-', '_'],
      Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
      Backslash: ['#', '~'], Semicolon: [';', ':'], Quote: ["'", '@'],
      Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?'],
      IntlBackslash: ['\\', '|'],
    },
    dead: [],
  },
  de: {
    name: 'German (QWERTZ)',
    keys: {
      Backquote: ['^', '°'], Digit1: ['1', '!'], Digit2: ['2', '"', '²'], Digit3: ['3', '§', '³'],
      Digit4: ['4', '$'], Digit5: ['5', '%'], Digit6: ['6', '&'], Digit7: ['7', '/', '{'],
      Digit8: ['8', '(', '['], Digit9: ['9', ')', ']'], Digit0: ['0', '=', '}'],
      Minus: ['ß', '?', '\\'], Equal: ['´', '`'],
      KeyQ: ['q', 'Q', '@'], KeyE: ['e', 'E', '€'], KeyM: ['m', 'M', 'µ'],
      KeyY: ['z', 'Z'], KeyZ: ['y', 'Y'],
      BracketLeft: ['ü', 'Ü'], BracketRight: ['+', '*', '~'], Backslash: ['#', "'"],
      Semicolon: ['ö', 'Ö'], Quote: ['ä', 'Ä'],
      Comma: [',', ';'], Period: ['.', ':'], Slash: ['-', '_'],
      IntlBackslash: ['<', '>', '|'],
    },
    dead: [['Backquote', 0], ['Equal', 0], ['Equal', 1]],
  },
  fr: {
    name: 'French (AZERTY)',
    keys: {
      Backquote: ['²', ''], Digit1: ['&', '1'], Digit2: ['é', '2', '~'], Digit3: ['"', '3', '#'],
      Digit4: ["'", '4', '{'], Digit5: ['(', '5', '['], Digit6: ['-', '6', '|'],
      Digit7: ['è', '7', '`'], Digit8: ['_', '8', '\\'], Digit9: ['ç', '9', '^'],
      Digit0: ['à', '0', '@'], Minus: [')', '°', ']'], Equal: ['=', '+', '}'],
      KeyA: ['q', 'Q'], KeyQ: ['a', 'A'], KeyZ: ['w', 'W'], KeyW: ['z', 'Z'],
      KeyE: ['e', 'E', '€'], KeyM: [',', '?'],
      BracketLeft: ['^', '¨'], BracketRight: ['$', '£', '¤'], Backslash: ['*', 'µ'],
      Semicolon: ['m', 'M'], Quote: ['ù', '%'],
      Comma: [';', '.'], Period: [':', '/'], Slash: ['!', '§'],
      IntlBackslash: ['<', '>'],
    },
    dead: [['Digit2', 2], ['Digit7', 2], ['BracketLeft', 0], ['BracketLeft', 1]],
  },
  es: {
    name: 'Spanish',
    keys: {
      Backquote: ['º', 'ª', '\\'], Digit1: ['1', '!', '|'], Digit2: ['2', '"', '@'],
      Digit3: ['3', '·', '#'], Digit4: ['4', '$', '~'], Digit5: ['5', '%'],
      Digit6: ['6', '&', '¬'], Digit7: ['7', '/'], Digit8: ['8', '('], Digit9: ['9', ')'],
      Digit0: ['0', '='], Minus: ["'", '?'], Equal: ['¡', '¿'],
      KeyE: ['e', 'E', '€'],
      BracketLeft: ['`', '^', '['], BracketRight: ['+', '*', ']'], Backslash: ['ç', 'Ç', '}'],
      Semicolon: ['ñ', 'Ñ'], Quote: ['´', '¨', '{'],
      Comma: [',', ';'], Period: ['.', ':'], Slash: ['-', '_'],
      IntlBackslash: ['<', '>'],
    },
    dead: [['Digit4', 2], ['BracketLeft', 0], ['BracketLeft', 1], ['Quote', 0], ['Quote', 1]],
  },
  it: {
    name: 'Italian',
    keys: {
      Backquote: ['\\', '|'], Digit1: ['1', '!'], Digit2: ['2', '"'], Digit3: ['3', '£'],
      Digit4: ['4', '$'], Digit5: ['5', '%', '€'], Digit6: ['6', '&'], Digit7: ['7', '/'],
      Digit8: ['8', '('], Digit9: ['9', ')'], Digit0: ['0', '='], Minus: ["'", '?'],
      Equal: ['ì', '^'], KeyE: ['e', 'E', '€'],
      BracketLeft: ['è', 'é', '['], BracketRight: ['+', '*', ']'], Backslash: ['ù', '§'],
      Semicolon: ['ò', 'ç', '@'], Quote: ['à', '°', '#'],
      Comma: [',', ';'], Period: ['.', ':'], Slash: ['-', '_'],
      IntlBackslash: ['<', '>'],
    },
    dead: [],
  },
};

const LEVEL_MODS = ['', 'Shift', 'AltGr'];

// Expand each definition into a list of { phys, hid, level, char, dead } entries
// and a lookup from "hid:level" to entry.
function buildLayout(def) {
  const keys = {};
  for (let i = 0; i < 26; i++) {
    const c = String.fromCharCode(97 + i);
    keys['Key' + c.toUpperCase()] = [c, c.toUpperCase()];
  }
  Object.assign(keys, def.keys);
  keys.Space = [' ', ' '];

  const dead    = new Set(def.dead.map(([k, lvl]) => `${k}:${lvl}`));
  const entries = [];
  const byHid   = new Map();
  for (const [phys, chars] of Object.entries(keys)) {
    chars.forEach((char, level) => {
      if (!char) return;
      const entry = { phys, hid: HID[phys], level, char, dead: dead.has(`${phys}:${level}`) };
      entries.push(entry);
      byHid.set(`${entry.hid}:${level}`, entry);
    });
  }
  return { name: def.name, entries, byHid };
}

export const OS_LAYOUTS = {};
for (const [id, def] of Object.entries(LAYOUT_DEFS)) OS_LAYOUTS[id] = buildLayout(def);

// ASCII code → { hid, level } (US layout), and the reverse.
const ASCII_TO_KEY = new Map();
const KEY_TO_ASCII = new Map();
for (const e of OS_LAYOUTS.us.entries) {
  const code = e.char.charCodeAt(0);
  if (ASCII_TO_KEY.has(code)) continue;
  ASCII_TO_KEY.set(code, { hid: e.hid, level: e.level });
  KEY_TO_ASCII.set(`${e.hid}:${e.level}`, code);
}

// Resolve a stored [code, modmask] to the physical key and modifiers it sends.
function decodeKey(code, modmask) {
  let hid, level;
  if (code < 0x80) {
    const k = ASCII_TO_KEY.get(code);
    if (!k) return null;
    ({ hid, level } = k);
  } else if (code >= RAW_BASE && code < 0xF0) {
    hid = code - RAW_BASE;
    level = 0;
  } else {
    return null;
  }

  let otherMod = null;
  if (modmask === MOD_SHIFT || modmask === 0x85) {
    if (level !== 0) return null;
    level = 1;
  } else if (modmask === MOD_ALTGR) {
    if (level !== 0) return null;
    level = 2;
  } else if (modmask) {
    otherMod = MOD_NAMES[modmask] || null;
    if (!otherMod) return null;
  }
  return { hid, level, otherMod };
}

function charLabel(char) {
  if (char === ' ') return 'Space';
  return /^[a-z]$/.test(char) ? char.toUpperCase() : char;
}

// Label for a stored key as it types on the given computer layout.
export function displayLabel(code, modmask, layoutId) {
  if (layoutId === 'us' && KEYS.some(k => k.code === code && k.modmask === modmask))
    return getLabel(code, modmask);

  const layout = OS_LAYOUTS[layoutId] || OS_LAYOUTS.us;
  const key    = decodeKey(code, modmask);
  if (!key) return getLabel(code, modmask);

  const entry = layout.byHid.get(`${key.hid}:${key.level}`);
  if (entry) {
    const label = charLabel(entry.char);
    return key.otherMod ? `${key.otherMod}+${label}` : label;
  }
  // No character on this level — show the modifier plus the plain key
  const plain = layout.byHid.get(`${key.hid}:0`);
  if (plain && key.level) return `${LEVEL_MODS[key.level]}+${charLabel(plain.char)}`;
  return getLabel(code, modmask);
}

function describeEntry(entry, layoutName) {
  const mod  = LEVEL_MODS[entry.level];
  const usKey = OS_LAYOUTS.us.byHid.get(`${entry.hid}:0`);
  const pos  = usKey ? `US "${charLabel(usKey.char)}" key` : 'ISO key left of Z';
  let text = `${mod ? mod + ' + ' : ''}${pos} on ${layoutName}`;
  if (entry.dead) text += ' · dead key (combine with the next key)';
  return text;
}

// Picker groups for a layout. US keeps the original KEYS; other layouts get
// their own Letters / Digits / Symbols built from the layout table.
export function getLayoutKeysByGroup(layoutId) {
  const groups = getKeysByGroup();
  if (layoutId === 'us' || !OS_LAYOUTS[layoutId]) return groups;

  const layout = OS_LAYOUTS[layoutId];
  const ranked = [...layout.entries].sort((a, b) =>
    (a.dead - b.dead) || (a.level - b.level));

  const seen = new Map();
  for (const e of ranked) {
    if (seen.has(e.char)) continue;
    // Shifted capitals of letter keys are just Shift + letter; skip them
    if (e.level === 1) {
      const plain = layout.byHid.get(`${e.hid}:0`);
      if (plain && plain.char.toUpperCase() === e.char && plain.char !== e.char) continue;
    }
    seen.set(e.char, e);
  }

  const letters = [], digits = [], symbols = [];
  for (const e of seen.values()) {
    const ascii = e.level < 2 ? KEY_TO_ASCII.get(`${e.hid}:${e.level}`) : undefined;
    const key = ascii !== undefined
      ? { code: ascii, modmask: 0 }
      : { code: RAW_BASE + e.hid, modmask: [0, MOD_SHIFT, MOD_ALTGR][e.level] };
    key.label = charLabel(e.char);
    key.title = describeEntry(e, layout.name);
    if (/^[a-z]$/.test(e.char))      letters.push(key);
    else if (/^[0-9]$/.test(e.char)) digits.push(key);
    else                             symbols.push(key);
  }
  letters.sort((a, b) => a.label.localeCompare(b.label));
  digits.sort((a, b) => a.label.localeCompare(b.label));
  symbols.sort((a, b) => (b.label === 'Space') - (a.label === 'Space'));

  groups.Letters = letters;
  groups.Digits  = digits;
  groups.Symbols = symbols;
  groups.Combos  = groups.Combos.map(k => ({ ...k, label: displayLabel(k.code, k.modmask, layoutId) }));
  return groups;
}

// Printable ASCII characters this layout cannot type with a single modifier.
export function unavailableChars(layoutId) {
  const layout = OS_LAYOUTS[layoutId];
  if (!layout) return [];
  const have = new Set(layout.entries.map(e => e.char));
  const missing = [];
  for (let c = 0x21; c < 0x7F; c++) {
    const ch = String.fromCharCode(c);
    if (!have.has(ch)) missing.push(ch);
  }
  return missing;
}

// Guess the computer's layout from the browser (Chrome/Edge desktop only).
// Returns a layout id, or null when unavailable or not confidently matched.
export async function detectLayout() {
  try {
    if (!navigator.keyboard?.getLayoutMap) return null;
    const map = await navigator.keyboard.getLayoutMap();
    let best = null, bestScore = 0;
    for (const [id, layout] of Object.entries(OS_LAYOUTS)) {
      let total = 0, hits = 0;
      for (const e of layout.entries) {
        if (e.level !== 0 || e.phys === 'Space' || !map.has(e.phys)) continue;
        total++;
        if (map.get(e.phys).toLowerCase() === e.char.toLowerCase()) hits++;
      }
      const score = total ? hits / total : 0;
      if (score > bestScore) { best = id; bestScore = score; }
    }
    return bestScore >= 0.9 ? best : null;
  } catch (_) {
    return null;
  }
}
