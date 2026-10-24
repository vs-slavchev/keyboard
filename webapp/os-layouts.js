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
//                        (0x81 Shift L, 0x86 Alt R = AltGr / Option, ...)
//
// Mac tables use Chrome's KeyboardEvent.code names on macOS, where Backquote
// is the ANSI grave key and IntlBackslash the ISO section key — the same names
// getLayoutMap() reports, so detection and tables agree.

import { getLabel, getKeysByGroup } from './keycodes.js';

const RAW_BASE   = 0x88;
const MOD_SHIFT   = 0x81;
const MOD_SHIFT_R = 0x85;
const MOD_ALTGR   = 0x86;

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
// Each entry: [plain, shift, altgr/option?] — '' means nothing on that level.
// `dead` lists [key, level] pairs that are dead keys (accent + next key).
// Mac tables only list single-Option characters; Shift+Option ones can't be
// sent with one modifier and show up as "not typeable".
const LAYOUT_DEFS = {
  us: {
    name: 'English (US)',
    platform: 'pc',
    keys: {
      Backquote: ['`', '~'], Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'],
      Digit4: ['4', '$'], Digit5: ['5', '%'], Digit6: ['6', '^'], Digit7: ['7', '&'],
      Digit8: ['8', '*'], Digit9: ['9', '('], Digit0: ['0', ')'], Minus: ['-', '_'],
      Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
      Backslash: ['\\', '|'], Semicolon: [';', ':'], Quote: ["'", '"'],
      Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?'],
      IntlBackslash: ['\\', '|'],
    },
    dead: [],
  },
  gb: {
    name: 'English (UK)',
    platform: 'pc',
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
    platform: 'pc',
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
    platform: 'pc',
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
    platform: 'pc',
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
    platform: 'pc',
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

  'us-mac': {
    name: 'English (US, Mac)',
    platform: 'mac',
    keys: {
      Backquote: ['`', '~'], Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'],
      Digit4: ['4', '$'], Digit5: ['5', '%'], Digit6: ['6', '^'], Digit7: ['7', '&'],
      Digit8: ['8', '*'], Digit9: ['9', '('], Digit0: ['0', ')'], Minus: ['-', '_'],
      Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
      Backslash: ['\\', '|'], Semicolon: [';', ':'], Quote: ["'", '"'],
      Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?'],
      IntlBackslash: ['§', '±'],
    },
    dead: [],
  },
  'gb-mac': {
    name: 'English (UK, Mac)',
    platform: 'mac',
    keys: {
      Backquote: ['`', '~'], Digit1: ['1', '!'], Digit2: ['2', '@', '€'], Digit3: ['3', '£', '#'],
      Digit4: ['4', '$'], Digit5: ['5', '%'], Digit6: ['6', '^'], Digit7: ['7', '&'],
      Digit8: ['8', '*'], Digit9: ['9', '('], Digit0: ['0', ')'], Minus: ['-', '_'],
      Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
      Backslash: ['\\', '|'], Semicolon: [';', ':'], Quote: ["'", '"'],
      Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?'],
      IntlBackslash: ['§', '±'],
    },
    dead: [],
  },
  'de-mac': {
    name: 'German (Mac)',
    platform: 'mac',
    keys: {
      Backquote: ['<', '>'], Digit1: ['1', '!'], Digit2: ['2', '"'], Digit3: ['3', '§'],
      Digit4: ['4', '$'], Digit5: ['5', '%', '['], Digit6: ['6', '&', ']'],
      Digit7: ['7', '/', '|'], Digit8: ['8', '(', '{'], Digit9: ['9', ')', '}'],
      Digit0: ['0', '='], Minus: ['ß', '?'], Equal: ['´', '`'],
      KeyY: ['z', 'Z'], KeyZ: ['y', 'Y'],
      KeyE: ['e', 'E', '€'], KeyL: ['l', 'L', '@'], KeyN: ['n', 'N', '~'],
      BracketLeft: ['ü', 'Ü'], BracketRight: ['+', '*'], Backslash: ['#', "'"],
      Semicolon: ['ö', 'Ö'], Quote: ['ä', 'Ä'],
      Comma: [',', ';'], Period: ['.', ':'], Slash: ['-', '_'],
      IntlBackslash: ['^', '°'],
    },
    dead: [['IntlBackslash', 0], ['Equal', 0], ['Equal', 1], ['KeyN', 2]],
  },
  'fr-mac': {
    name: 'French (Mac)',
    platform: 'mac',
    keys: {
      Backquote: ['<', '>'], Digit1: ['&', '1'], Digit2: ['é', '2'], Digit3: ['"', '3'],
      Digit4: ["'", '4'], Digit5: ['(', '5', '{'], Digit6: ['§', '6'],
      Digit7: ['è', '7'], Digit8: ['!', '8'], Digit9: ['ç', '9'], Digit0: ['à', '0'],
      Minus: [')', '°', '}'], Equal: ['-', '_'],
      KeyA: ['q', 'Q'], KeyQ: ['a', 'A'], KeyZ: ['w', 'W'], KeyW: ['z', 'Z'],
      KeyM: [',', '?'], KeyN: ['n', 'N', '~'],
      BracketLeft: ['^', '¨'], BracketRight: ['$', '*', '€'], Backslash: ['`', '£'],
      Semicolon: ['m', 'M'], Quote: ['ù', '%'],
      Comma: [';', '.'], Period: [':', '/'], Slash: ['=', '+'],
      IntlBackslash: ['@', '#'],
    },
    dead: [['BracketLeft', 0], ['BracketLeft', 1], ['Backslash', 0], ['KeyN', 2]],
  },
};

// Expand each definition into a list of { phys, hid, level, char, dead } entries
// and a lookup from "hid:level" to entry.
function buildLayout(def) {
  const keys = { Space: [' ', ' '] };
  for (let i = 0; i < 26; i++) {
    const c = String.fromCharCode(97 + i);
    keys['Key' + c.toUpperCase()] = [c, c.toUpperCase()];
  }
  Object.assign(keys, def.keys);

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
  return {
    name: def.name,
    platform: def.platform,
    entries,
    byHid,
    levelMods: ['', 'Shift', def.platform === 'mac' ? 'Option' : 'AltGr'],
    hasAltGr: entries.some(e => e.level === 2),
  };
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
// Right Alt only counts as AltGr/Option on layouts that have that level.
function decodeKey(code, modmask, layout) {
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
  if (modmask === MOD_SHIFT || modmask === MOD_SHIFT_R) {
    if (level !== 0) return null;
    level = 1;
  } else if (modmask === MOD_ALTGR && layout.hasAltGr) {
    if (level !== 0) return null;
    level = 2;
  } else if (modmask) {
    if (modmask < 0x80 || modmask > 0x87) return null;
    otherMod = getLabel(modmask, 0).split(' ')[0];
  }
  return { hid, level, otherMod };
}

// Letters show as capitals like the original key labels, so a typed capital
// gets an explicit Shift+ to stay distinguishable.
function charLabel(char) {
  if (char === ' ') return 'Space';
  if (/^[a-z]$/.test(char)) return char.toUpperCase();
  if (/^[A-Z]$/.test(char)) return `Shift+${char}`;
  return char;
}

// Label (and dead-key flag) for a stored key as it types on a computer layout.
export function keyInfo(code, modmask, layoutId) {
  const layout = OS_LAYOUTS[layoutId] || OS_LAYOUTS.us;
  const key    = decodeKey(code, modmask, layout);
  if (!key) return { label: getLabel(code, modmask), dead: false };

  const prefix = key.otherMod ? `${key.otherMod}+` : '';
  const entry  = layout.byHid.get(`${key.hid}:${key.level}`);
  if (entry) return { label: prefix + charLabel(entry.char), dead: entry.dead };

  // No character on this level — show the modifiers plus the plain key
  const plain = layout.byHid.get(`${key.hid}:0`);
  if (plain && key.level)
    return { label: `${prefix}${layout.levelMods[key.level]}+${charLabel(plain.char)}`, dead: false };
  return { label: getLabel(code, modmask), dead: false };
}

export function displayLabel(code, modmask, layoutId) {
  return keyInfo(code, modmask, layoutId).label;
}

function describeEntry(entry, layout) {
  const mod = layout.levelMods[entry.level];
  const pos = entry.phys === 'IntlBackslash'
    ? 'ISO key left of Z'
    : `US "${charLabel(OS_LAYOUTS.us.byHid.get(`${entry.hid}:0`).char)}" key`;
  let text = `${mod ? mod + ' + ' : ''}${pos} on ${layout.name}`;
  if (entry.dead) text += ' · dead key (combine with the next key)';
  return text;
}

// Picker groups per layout. The tables are static, so each layout's groups are
// built once on first use and reused (callers must not mutate them).
const groupsCache = new Map();

export function getLayoutKeysByGroup(layoutId) {
  if (!groupsCache.has(layoutId)) groupsCache.set(layoutId, buildKeyGroups(layoutId));
  return groupsCache.get(layoutId);
}

// US keeps the original KEYS; other layouts get their own Letters / Digits /
// Symbols built from the layout table.
function buildKeyGroups(layoutId) {
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
    const ascii = KEY_TO_ASCII.get(`${e.hid}:${e.level}`);
    const key = ascii !== undefined
      ? { code: ascii, modmask: 0 }
      : { code: RAW_BASE + e.hid, modmask: [0, MOD_SHIFT, MOD_ALTGR][e.level] };
    key.label = charLabel(e.char);
    key.title = describeEntry(e, layout);
    key.dead  = e.dead;
    if (/^[a-z]$/.test(e.char))      letters.push(key);
    else if (/^[0-9]$/.test(e.char)) digits.push(key);
    else                             symbols.push(key);
  }
  letters.sort((a, b) => a.label.localeCompare(b.label));
  digits.sort((a, b) => a.label.localeCompare(b.label));

  groups.Letters = letters;
  groups.Digits  = digits;
  groups.Symbols = symbols;
  groups.Combos  = groups.Combos.map(k => ({ ...k, label: displayLabel(k.code, k.modmask, layoutId) }));
  return groups;
}

// Printable ASCII characters a layout can't type with a single modifier, and
// characters it only has as dead keys (they appear after the next key press).
const notesCache = new Map();

export function layoutNotes(layoutId) {
  if (notesCache.has(layoutId)) return notesCache.get(layoutId);
  const layout   = OS_LAYOUTS[layoutId] || OS_LAYOUTS.us;
  const live     = new Set(layout.entries.filter(e => !e.dead).map(e => e.char));
  const deadOnly = new Set(layout.entries.filter(e => e.dead && !live.has(e.char)).map(e => e.char));
  const unavailable = [];
  for (let c = 0x21; c < 0x7F; c++) {
    const ch = String.fromCharCode(c);
    if (!live.has(ch) && !deadOnly.has(ch)) unavailable.push(ch);
  }
  const notes = { unavailable, dead: [...deadOnly] };
  notesCache.set(layoutId, notes);
  return notes;
}

// Guess the computer's layout from the browser (Chrome/Edge desktop only),
// considering only layouts for the given platform ('pc' or 'mac').
// Returns a layout id, or null when unavailable or not confidently matched.
export async function detectLayout(platform) {
  try {
    if (!navigator.keyboard?.getLayoutMap) return null;
    const map = await navigator.keyboard.getLayoutMap();
    let best = null, bestScore = 0;
    for (const [id, layout] of Object.entries(OS_LAYOUTS)) {
      if (layout.platform !== platform) continue;
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
