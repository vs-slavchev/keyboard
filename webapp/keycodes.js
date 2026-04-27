// Each entry: { code, modmask, label, group }
// code    = byte sent as the keycode (low byte of the 2-byte key entry)
// modmask = modifier bitmask (high byte): bits 0-7 = LCtrl LShift LAlt LGUI RCtrl RShift RAlt RGUI
// label   = human-readable name shown in the UI
// group   = picker group name

export const KEYS = [
  // ── Letters ────────────────────────────────────────────────────────────────
  { code: 0x61, modmask: 0, label: 'A', group: 'Letters' },
  { code: 0x62, modmask: 0, label: 'B', group: 'Letters' },
  { code: 0x63, modmask: 0, label: 'C', group: 'Letters' },
  { code: 0x64, modmask: 0, label: 'D', group: 'Letters' },
  { code: 0x65, modmask: 0, label: 'E', group: 'Letters' },
  { code: 0x66, modmask: 0, label: 'F', group: 'Letters' },
  { code: 0x67, modmask: 0, label: 'G', group: 'Letters' },
  { code: 0x68, modmask: 0, label: 'H', group: 'Letters' },
  { code: 0x69, modmask: 0, label: 'I', group: 'Letters' },
  { code: 0x6A, modmask: 0, label: 'J', group: 'Letters' },
  { code: 0x6B, modmask: 0, label: 'K', group: 'Letters' },
  { code: 0x6C, modmask: 0, label: 'L', group: 'Letters' },
  { code: 0x6D, modmask: 0, label: 'M', group: 'Letters' },
  { code: 0x6E, modmask: 0, label: 'N', group: 'Letters' },
  { code: 0x6F, modmask: 0, label: 'O', group: 'Letters' },
  { code: 0x70, modmask: 0, label: 'P', group: 'Letters' },
  { code: 0x71, modmask: 0, label: 'Q', group: 'Letters' },
  { code: 0x72, modmask: 0, label: 'R', group: 'Letters' },
  { code: 0x73, modmask: 0, label: 'S', group: 'Letters' },
  { code: 0x74, modmask: 0, label: 'T', group: 'Letters' },
  { code: 0x75, modmask: 0, label: 'U', group: 'Letters' },
  { code: 0x76, modmask: 0, label: 'V', group: 'Letters' },
  { code: 0x77, modmask: 0, label: 'W', group: 'Letters' },
  { code: 0x78, modmask: 0, label: 'X', group: 'Letters' },
  { code: 0x79, modmask: 0, label: 'Y', group: 'Letters' },
  { code: 0x7A, modmask: 0, label: 'Z', group: 'Letters' },

  // ── Digits ─────────────────────────────────────────────────────────────────
  { code: 0x30, modmask: 0, label: '0', group: 'Digits' },
  { code: 0x31, modmask: 0, label: '1', group: 'Digits' },
  { code: 0x32, modmask: 0, label: '2', group: 'Digits' },
  { code: 0x33, modmask: 0, label: '3', group: 'Digits' },
  { code: 0x34, modmask: 0, label: '4', group: 'Digits' },
  { code: 0x35, modmask: 0, label: '5', group: 'Digits' },
  { code: 0x36, modmask: 0, label: '6', group: 'Digits' },
  { code: 0x37, modmask: 0, label: '7', group: 'Digits' },
  { code: 0x38, modmask: 0, label: '8', group: 'Digits' },
  { code: 0x39, modmask: 0, label: '9', group: 'Digits' },

  // ── Symbols ────────────────────────────────────────────────────────────────
  { code: 0x20, modmask: 0, label: 'Space', group: 'Symbols' },
  { code: 0x21, modmask: 0, label: '!', group: 'Symbols' },
  { code: 0x22, modmask: 0, label: '"', group: 'Symbols' },
  { code: 0x23, modmask: 0, label: '#', group: 'Symbols' },
  { code: 0x24, modmask: 0, label: '$', group: 'Symbols' },
  { code: 0x25, modmask: 0, label: '%', group: 'Symbols' },
  { code: 0x26, modmask: 0, label: '&', group: 'Symbols' },
  { code: 0x27, modmask: 0, label: "'", group: 'Symbols' },
  { code: 0x28, modmask: 0, label: '(', group: 'Symbols' },
  { code: 0x29, modmask: 0, label: ')', group: 'Symbols' },
  { code: 0x2A, modmask: 0, label: '*', group: 'Symbols' },
  { code: 0x2B, modmask: 0, label: '+', group: 'Symbols' },
  { code: 0x2C, modmask: 0, label: ',', group: 'Symbols' },
  { code: 0x2D, modmask: 0, label: '-', group: 'Symbols' },
  { code: 0x2E, modmask: 0, label: '.', group: 'Symbols' },
  { code: 0x2F, modmask: 0, label: '/', group: 'Symbols' },
  { code: 0x3A, modmask: 0, label: ':', group: 'Symbols' },
  { code: 0x3B, modmask: 0, label: ';', group: 'Symbols' },
  { code: 0x3C, modmask: 0, label: '<', group: 'Symbols' },
  { code: 0x3D, modmask: 0, label: '=', group: 'Symbols' },
  { code: 0x3E, modmask: 0, label: '>', group: 'Symbols' },
  { code: 0x3F, modmask: 0, label: '?', group: 'Symbols' },
  { code: 0x40, modmask: 0, label: '@', group: 'Symbols' },
  { code: 0x5B, modmask: 0, label: '[', group: 'Symbols' },
  { code: 0x5C, modmask: 0, label: '\\', group: 'Symbols' },
  { code: 0x5D, modmask: 0, label: ']', group: 'Symbols' },
  { code: 0x5E, modmask: 0, label: '^', group: 'Symbols' },
  { code: 0x5F, modmask: 0, label: '_', group: 'Symbols' },
  { code: 0x60, modmask: 0, label: '`', group: 'Symbols' },
  { code: 0x7B, modmask: 0, label: '{', group: 'Symbols' },
  { code: 0x7C, modmask: 0, label: '|', group: 'Symbols' },
  { code: 0x7D, modmask: 0, label: '}', group: 'Symbols' },
  { code: 0x7E, modmask: 0, label: '~', group: 'Symbols' },

  // ── Modifiers ──────────────────────────────────────────────────────────────
  { code: 0x80, modmask: 0, label: 'Ctrl L',  group: 'Modifiers' },
  { code: 0x81, modmask: 0, label: 'Shift L', group: 'Modifiers' },
  { code: 0x82, modmask: 0, label: 'Alt L',   group: 'Modifiers' },
  { code: 0x83, modmask: 0, label: 'GUI L',   group: 'Modifiers' },
  { code: 0x84, modmask: 0, label: 'Ctrl R',  group: 'Modifiers' },
  { code: 0x85, modmask: 0, label: 'Shift R', group: 'Modifiers' },
  { code: 0x86, modmask: 0, label: 'Alt R',   group: 'Modifiers' },
  { code: 0x87, modmask: 0, label: 'GUI R',   group: 'Modifiers' },

  // ── Special ────────────────────────────────────────────────────────────────
  { code: 0xB3, modmask: 0, label: 'Tab',       group: 'Special' },
  { code: 0xB0, modmask: 0, label: 'Enter',     group: 'Special' },
  { code: 0xB1, modmask: 0, label: 'Esc',       group: 'Special' },
  { code: 0xB2, modmask: 0, label: 'Backspace', group: 'Special' },
  { code: 0xC1, modmask: 0, label: 'Caps Lock', group: 'Special' },

  // ── Navigation ─────────────────────────────────────────────────────────────
  { code: 0xD7, modmask: 0, label: '→',      group: 'Navigation' },
  { code: 0xD8, modmask: 0, label: '←',      group: 'Navigation' },
  { code: 0xD9, modmask: 0, label: '↓',      group: 'Navigation' },
  { code: 0xDA, modmask: 0, label: '↑',      group: 'Navigation' },
  { code: 0xD1, modmask: 0, label: 'Insert',  group: 'Navigation' },
  { code: 0xD4, modmask: 0, label: 'Delete',  group: 'Navigation' },
  { code: 0xD2, modmask: 0, label: 'Home',    group: 'Navigation' },
  { code: 0xD5, modmask: 0, label: 'End',     group: 'Navigation' },
  { code: 0xD3, modmask: 0, label: 'Page Up', group: 'Navigation' },
  { code: 0xD6, modmask: 0, label: 'Page Dn', group: 'Navigation' },

  // ── Function keys ──────────────────────────────────────────────────────────
  { code: 0xC2, modmask: 0, label: 'F1',  group: 'Function' },
  { code: 0xC3, modmask: 0, label: 'F2',  group: 'Function' },
  { code: 0xC4, modmask: 0, label: 'F3',  group: 'Function' },
  { code: 0xC5, modmask: 0, label: 'F4',  group: 'Function' },
  { code: 0xC6, modmask: 0, label: 'F5',  group: 'Function' },
  { code: 0xC7, modmask: 0, label: 'F6',  group: 'Function' },
  { code: 0xC8, modmask: 0, label: 'F7',  group: 'Function' },
  { code: 0xC9, modmask: 0, label: 'F8',  group: 'Function' },
  { code: 0xCA, modmask: 0, label: 'F9',  group: 'Function' },
  { code: 0xCB, modmask: 0, label: 'F10', group: 'Function' },
  { code: 0xCC, modmask: 0, label: 'F11', group: 'Function' },
  { code: 0xCD, modmask: 0, label: 'F12', group: 'Function' },

  // ── Meta ───────────────────────────────────────────────────────────────────
  { code: 0x00, modmask: 0, label: 'None',        group: 'Meta' },
  { code: 0xFF, modmask: 0, label: 'Layer',        group: 'Meta' },
  { code: 0xF1, modmask: 0, label: 'Ctrl+Alt+Del', group: 'Meta' },
  { code: 0xF2, modmask: 0, label: 'Battery',      group: 'Meta' },

  // ── Common combos ──────────────────────────────────────────────────────────
  { code: 0x63, modmask: 0x80, label: 'Ctrl+C', group: 'Combos' },
  { code: 0x76, modmask: 0x80, label: 'Ctrl+V', group: 'Combos' },
  { code: 0x78, modmask: 0x80, label: 'Ctrl+X', group: 'Combos' },
  { code: 0x7A, modmask: 0x80, label: 'Ctrl+Z', group: 'Combos' },
  { code: 0x79, modmask: 0x80, label: 'Ctrl+Y', group: 'Combos' },
  { code: 0x61, modmask: 0x80, label: 'Ctrl+A', group: 'Combos' },
  { code: 0x73, modmask: 0x80, label: 'Ctrl+S', group: 'Combos' },
  { code: 0x77, modmask: 0x80, label: 'Ctrl+W', group: 'Combos' },
  { code: 0x74, modmask: 0x80, label: 'Ctrl+T', group: 'Combos' },
  { code: 0x66, modmask: 0x80, label: 'Ctrl+F', group: 'Combos' },
  { code: 0x6E, modmask: 0x80, label: 'Ctrl+N', group: 'Combos' },
  { code: 0xC2, modmask: 0x80, label: 'Ctrl+F1', group: 'Combos' },
  { code: 0xC5, modmask: 0x80, label: 'Ctrl+F4', group: 'Combos' },
];

export const GROUP_ORDER = [
  'Letters', 'Digits', 'Symbols', 'Modifiers',
  'Special', 'Navigation', 'Function', 'Meta', 'Combos',
];

export function getLabel(code, modmask) {
  const key = KEYS.find(k => k.code === code && k.modmask === modmask);
  if (key) return key.label;
  if (code === 0x00) return 'None';
  return `0x${code.toString(16).padStart(2, '0')}`;
}

export function getKeysByGroup() {
  const groups = {};
  for (const g of GROUP_ORDER) groups[g] = [];
  for (const key of KEYS) {
    if (!groups[key.group]) groups[key.group] = [];
    groups[key.group].push(key);
  }
  return groups;
}
