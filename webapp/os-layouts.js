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
// Mac tables are written for macOS Keyboard Type = ANSI: HID 0x35 (Backquote)
// types the grave-position character and HID 0x64 (IntlBackslash) the section
// character. With Keyboard Type = ISO macOS swaps those two keys, so every Mac
// layout also gets a hidden "<id>-iso" variant with them swapped.

import { getLabel, getKeysByGroup } from './keycodes.js';

const RAW_BASE   = 0x88;
const MOD_SHIFT   = 0x81;
const MOD_ALT_L   = 0x82;
const MOD_SHIFT_R = 0x85;
const MOD_ALTGR   = 0x86;   // Right Alt: AltGr on PC, Option on Mac

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

// Every layout starts from Space, the letters as [x, X] and the US symbol keys,
// then overrides what differs.
// Each entry: [plain, shift, altgr/option?] — '' means nothing on that level.
const BASE_KEYS = { Space: [' '] };
for (let i = 0; i < 26; i++) {
  const c = String.fromCharCode(97 + i);
  BASE_KEYS['Key' + c.toUpperCase()] = [c, c.toUpperCase()];
}
Object.assign(BASE_KEYS, {
  Backquote: ['`', '~'], Digit1: ['1', '!'], Digit2: ['2', '@'], Digit3: ['3', '#'],
  Digit4: ['4', '$'], Digit5: ['5', '%'], Digit6: ['6', '^'], Digit7: ['7', '&'],
  Digit8: ['8', '*'], Digit9: ['9', '('], Digit0: ['0', ')'], Minus: ['-', '_'],
  Equal: ['=', '+'], BracketLeft: ['[', '{'], BracketRight: [']', '}'],
  Backslash: ['\\', '|'], Semicolon: [';', ':'], Quote: ["'", '"'],
  Comma: [',', '<'], Period: ['.', '>'], Slash: ['/', '?'],
  IntlBackslash: ['\\', '|'],
});

// `dead` lists [key, level] pairs that are dead keys (accent + next key).
// Mac tables only list single-Option characters; Shift+Option ones can't be
// sent with one modifier and show up as "not typeable".
const LAYOUT_DEFS = {
  us: { name: 'English (US)', platform: 'pc', regions: ['US'], keys: {} },
  gb: {
    name: 'English (UK)',
    platform: 'pc',
    regions: ['GB', 'IE'],
    keys: {
      Backquote: ['`', '¬', '¦'], Digit2: ['2', '"'], Digit3: ['3', '£'], Digit4: ['4', '$', '€'],
      Backslash: ['#', '~'], Quote: ["'", '@'],
    },
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
    regions: ['US'],
    keys: { IntlBackslash: ['§', '±'] },
  },
  'gb-mac': {
    name: 'English (UK, Mac)',
    platform: 'mac',
    regions: ['GB', 'IE'],
    keys: { Digit2: ['2', '@', '€'], Digit3: ['3', '£', '#'], IntlBackslash: ['§', '±'] },
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

// Expand each definition into a list of { phys, hid, level, char, dead } entries,
// a lookup from "hid:level" to entry, and which modifiers select which level.
// `iso` swaps the two keys macOS exchanges for ISO keyboards.
const ISO_SWAP = { Backquote: 'IntlBackslash', IntlBackslash: 'Backquote' };

function buildLayout(def, iso = false) {
  const keys = { ...BASE_KEYS, ...def.keys };
  let deadKeys = def.dead ?? [];
  if (iso) {
    [keys.Backquote, keys.IntlBackslash] = [keys.IntlBackslash, keys.Backquote];
    deadKeys = deadKeys.map(([k, lvl]) => [ISO_SWAP[k] ?? k, lvl]);
  }
  const dead    = new Set(deadKeys.map(([k, lvl]) => `${k}:${lvl}`));
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

  // Either Option key works on Mac; on PC only layouts with an AltGr level
  // treat Right Alt as AltGr (elsewhere it is plain Alt).
  const modLevels = { [MOD_SHIFT]: 1, [MOD_SHIFT_R]: 1 };
  if (def.platform === 'mac') modLevels[MOD_ALT_L] = modLevels[MOD_ALTGR] = 2;
  else if (entries.some(e => e.level === 2)) modLevels[MOD_ALTGR] = 2;

  return {
    name: def.name,
    platform: def.platform,
    regions: def.regions ?? [],
    hidden: iso,
    usRef: def.platform === 'mac' ? (iso ? 'us-mac-iso' : 'us-mac') : 'us',
    entries,
    byHid,
    modLevels,
    levelMods: ['', 'Shift', def.platform === 'mac' ? 'Option' : 'AltGr'],
  };
}

export const OS_LAYOUTS = {};
for (const [id, def] of Object.entries(LAYOUT_DEFS)) {
  OS_LAYOUTS[id] = buildLayout(def);
  if (def.platform === 'mac') OS_LAYOUTS[`${id}-iso`] = buildLayout(def, true);
}

// ASCII code → { hid, level } (US layout), and the reverse.
const ASCII_TO_KEY = new Map();
const KEY_TO_ASCII = new Map();
for (const e of OS_LAYOUTS.us.entries) {
  const code = e.char.charCodeAt(0);
  if (ASCII_TO_KEY.has(code)) continue;
  ASCII_TO_KEY.set(code, { hid: e.hid, level: e.level });
  KEY_TO_ASCII.set(`${e.hid}:${e.level}`, code);
}

// Resolve a stored [code, modmask] to the physical key and level it types on
// a layout, plus any other modifier held with it.
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
  const modLevel = layout.modLevels[modmask];
  if (modLevel && level === 0) {
    level = modLevel;
  } else if (modmask) {
    if (!isModifier(modmask)) return null;
    otherMod = modName(modmask, layout);
  }
  return { hid, level, otherMod };
}

function isModifier(modmask) {
  return modmask >= 0x80 && modmask <= 0x87;
}

// Name of a modifier as the layout uses it (Shift / AltGr / Option / Ctrl / ...)
function modName(modmask, layout) {
  const level = layout.modLevels[modmask];
  return level ? layout.levelMods[level] : getLabel(modmask, 0).split(' ')[0];
}

// Label for keys with no character on the layout: the exact KEYS label if there
// is one (Ctrl+F1), else the modifier plus the key's own name (Shift+Tab).
function fallbackLabel(code, modmask, layout) {
  const exact = getLabel(code, modmask);
  if (!modmask || !isModifier(modmask) || !exact.startsWith('0x')) return exact;
  return `${modName(modmask, layout)}+${getLabel(code, 0)}`;
}

// Latin letters, including accented ones (ü é ß ñ); not µ ª º
function isLetter(char) {
  return /^\p{Ll}$/u.test(char) && /^\p{Script=Latin}$/u.test(char);
}

// Letters show as capitals like keycaps and the original key labels, so a
// typed capital gets an explicit Shift+ to stay distinguishable.
function charLabel(char) {
  if (char === ' ') return 'Space';
  if (isLetter(char)) {
    const upper = char.toUpperCase();
    return upper.length === 1 ? upper : char;   // ß stays ß
  }
  if (/^\p{Lu}$/u.test(char) && /^\p{Script=Latin}$/u.test(char)) return `Shift+${char}`;
  return char;
}

// Label (and dead-key flag) for a stored key as it types on a computer layout.
export function keyInfo(code, modmask, layoutId) {
  const layout = OS_LAYOUTS[layoutId];
  const key    = decodeKey(code, modmask, layout);
  if (!key) return { label: fallbackLabel(code, modmask, layout), dead: false };

  const prefix = key.otherMod ? `${key.otherMod}+` : '';
  const entry  = layout.byHid.get(`${key.hid}:${key.level}`);
  if (entry) return { label: prefix + charLabel(entry.char), dead: entry.dead };

  // No character on this level — show the modifiers plus the plain key
  const plain = layout.byHid.get(`${key.hid}:0`);
  if (plain && key.level)
    return { label: `${prefix}${layout.levelMods[key.level]}+${charLabel(plain.char)}`, dead: false };
  return { label: fallbackLabel(code, modmask, layout), dead: false };
}

// Tooltip: the key named by what it types on this layout, plus the US key it
// sends (on the same platform) when that differs.
function describeEntry(entry, layout) {
  const mod   = layout.levelMods[entry.level];
  const own   = charLabel(layout.byHid.get(`${entry.hid}:0`)?.char ?? entry.char);
  const us    = OS_LAYOUTS[layout.usRef];
  const usKey = charLabel(us.byHid.get(`${entry.hid}:0`).char);

  let text = `${mod ? mod + ' + ' : ''}"${own}" key on ${layout.name}`;
  if (layout.platform === 'pc' && entry.phys === 'IntlBackslash')
    text += ' · extra ISO key next to left Shift';
  else if (usKey !== own)
    text += ` · ${layout.platform === 'mac' ? 'US Mac' : 'US'} "${usKey}" key`;
  if (entry.dead) text += ' · dead key (combine with the next key)';
  return text;
}

// US keeps the original KEYS; other layouts get their own Letters / Digits /
// Symbols built from the layout table.
function buildKeyGroups(layoutId) {
  const groups = getKeysByGroup();
  if (layoutId === 'us') return groups;

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
    if (isLetter(e.char))            letters.push(key);
    else if (/^[0-9]$/.test(e.char)) digits.push(key);
    else                             symbols.push(key);
  }
  letters.sort((a, b) => a.label.localeCompare(b.label));
  digits.sort((a, b) => a.label.localeCompare(b.label));

  groups.Letters = letters;
  groups.Digits  = digits;
  groups.Symbols = symbols;
  groups.Combos  = groups.Combos.map(k => ({ ...k, label: keyInfo(k.code, k.modmask, layoutId).label }));
  return groups;
}

// Printable ASCII characters a layout can't type with a single modifier, and
// characters it only has as dead keys (they appear after the next key press).
function buildNotes(layout) {
  const all  = new Set(layout.entries.map(e => e.char));
  const live = new Set(layout.entries.filter(e => !e.dead).map(e => e.char));
  const unavailable = [];
  for (let c = 0x21; c < 0x7F; c++) {
    const ch = String.fromCharCode(c);
    if (!all.has(ch)) unavailable.push(ch);
  }
  return { unavailable, dead: [...all].filter(ch => !live.has(ch)) };
}

// Guess the computer's layout from the browser (Chrome/Edge desktop only),
// considering only layouts for the given platform ('pc' or 'mac').
// Returns { id, iso } — iso is true/false when the Mac ISO key swap could be
// told from the map, else null — or null when not confidently matched.
// Layouts whose unshifted keys are identical (US/UK Mac) are told apart by the
// browser's language region; if that doesn't settle it, nothing is guessed.
export async function detectLayout(platform) {
  try {
    if (!navigator.keyboard?.getLayoutMap) return null;
    const map = await navigator.keyboard.getLayoutMap();
    const swapKeys = platform === 'mac' ? ISO_SWAP : {};
    let best = [], bestScore = 0;
    for (const [id, layout] of Object.entries(OS_LAYOUTS)) {
      if (layout.platform !== platform || layout.hidden) continue;
      let total = 0, hits = 0;
      for (const e of layout.entries) {
        if (e.level !== 0 || swapKeys[e.phys] || !map.has(e.phys)) continue;
        total++;
        if (map.get(e.phys).toLowerCase() === e.char.toLowerCase()) hits++;
      }
      const score = total ? hits / total : 0;
      if (score > bestScore) { best = [id]; bestScore = score; }
      else if (score === bestScore) best.push(id);
    }
    if (bestScore < 0.9) return null;

    let id = best[0];
    if (best.length > 1) {
      const regions = (navigator.languages ?? []).map(l => l.split('-')[1]?.toUpperCase());
      id = best.find(b => OS_LAYOUTS[b].regions.some(r => regions.includes(r)));
      if (!id) return null;
    }

    let iso = null;
    if (platform === 'mac') {
      const ansi = OS_LAYOUTS[id].byHid;
      const bq   = map.get('Backquote');
      const grave   = ansi.get(`${HID.Backquote}:0`)?.char;
      const section = ansi.get(`${HID.IntlBackslash}:0`)?.char;
      if (bq && grave !== section) iso = bq === section ? true : bq === grave ? false : null;
    }
    return { id, iso };
  } catch (_) {
    return null;
  }
}

// The tables are static, so each layout's picker groups and notes are built
// once here (callers must not mutate them).
for (const [id, layout] of Object.entries(OS_LAYOUTS)) {
  layout.groups = buildKeyGroups(id);
  layout.notes  = buildNotes(layout);
}
