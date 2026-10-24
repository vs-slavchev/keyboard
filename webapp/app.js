import { GROUP_ORDER } from './keycodes.js';
import { PRESETS, DEFAULT_PRESET } from './presets.js';
import { OS_LAYOUTS, keyInfo, detectLayout } from './os-layouts.js';

// ── BLE constants ─────────────────────────────────────────────────────────────
const CONFIG_SERVICE_UUID   = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CONTROL_CHAR_UUID     = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const DATA_CHAR_UUID        = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const READ_LAYOUT_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const CMD_ENTER_CONFIG      = 0x01;
const CMD_EXIT_CONFIG       = 0x02;
const CMD_COMMIT            = 0x03;
const CHUNK_DATA_BYTES      = 18;

// ── State ─────────────────────────────────────────────────────────────────────
let layout       = deepClone(PRESETS[DEFAULT_PRESET]);
let savedLayout  = deepClone(PRESETS[DEFAULT_PRESET]);
let selectedCell = null;
let bleDevice    = null;
let controlChar  = null;
let dataChar     = null;
let currentLayer = 0;
let osLayout     = 'us';   // computer layout used for labels and the picker
let detectedOsLayout = null; // last auto-detection result (null = not detected)
let detectedMacIso   = null; // whether detection saw the macOS ISO key swap

// ── Helpers ───────────────────────────────────────────────────────────────────
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function keyEqual(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function hasChanges() {
  for (let l = 0; l < 2; l++)
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 12; c++)
        if (!keyEqual(layout[l][r][c], savedLayout[l][r][c])) return true;
  return false;
}

function countChanges() {
  let n = 0;
  for (let l = 0; l < 2; l++)
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 12; c++)
        if (!keyEqual(layout[l][r][c], savedLayout[l][r][c])) n++;
  return n;
}

// ── Toast notifications ───────────────────────────────────────────────────────
let toastTimer = null;

function showToast(msg, type = 'info', duration = 3200) {
  const el = document.getElementById('status-toast');
  el.textContent = msg;
  el.className = 'status-toast ' + type;
  el.hidden = false;
  if (toastTimer) clearTimeout(toastTimer);
  if (duration > 0) {
    toastTimer = setTimeout(() => { el.hidden = true; }, duration);
  }
}

// ── View switching ────────────────────────────────────────────────────────────
function showView(id) {
  document.getElementById('view-connect').hidden  = (id !== 'connect');
  document.getElementById('view-keyboard').hidden = (id !== 'keyboard');
}

// ── Save bar ──────────────────────────────────────────────────────────────────
function updateSaveBar() {
  const n       = countChanges();
  const countEl = document.getElementById('change-count');
  const saveBtn = document.getElementById('btn-save');
  const resetBtn = document.getElementById('btn-reset');

  if (n === 0) {
    countEl.hidden   = true;
    resetBtn.hidden  = true;
    saveBtn.disabled = true;
  } else {
    countEl.textContent = n === 1 ? '1 key modified' : `${n} keys modified`;
    countEl.hidden      = false;
    resetBtn.hidden     = false;
    saveBtn.disabled    = false;
  }
}

// ── BLE status ────────────────────────────────────────────────────────────────
function setBleConnected(connected) {
  if (connected) {
    showView('keyboard');
    const headerDevice = document.getElementById('header-device');
    headerDevice.hidden = false;
    document.getElementById('device-name').textContent = bleDevice?.name || 'Keyboard';
  } else {
    showView('connect');
    document.getElementById('header-device').hidden = true;
    const btn = document.getElementById('btn-connect');
    btn.disabled = false;
    btn.classList.remove('loading');
    document.getElementById('btn-connect-label').textContent = 'Connect via Bluetooth';
    document.getElementById('btn-connect-spinner').hidden = true;
  }
}

// ── Platform detection ────────────────────────────────────────────────────────
const IS_MAC          = /Mac/.test(navigator.platform) && !/iPhone|iPad|iPod/.test(navigator.userAgent);
const OS_PLATFORM     = IS_MAC ? 'mac' : 'pc';
const FALLBACK_LAYOUT = IS_MAC ? 'us-mac' : 'us';
const HAS_LAYOUT_MAP  = !!navigator.keyboard?.getLayoutMap;

function getPlatformInfo() {
  const ua        = navigator.userAgent;
  const isIOS     = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isWindows = /Win/.test(navigator.platform);
  const isLinux   = /Linux/.test(navigator.platform) && !isAndroid;
  const isFirefox = /Firefox/.test(ua);
  const isSafari  = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome  = /Chrome/.test(ua) && !/Edg/.test(ua);
  const isEdge    = /Edg/.test(ua);

  if (isIOS)
    return { type: 'err', text: 'Web Bluetooth is not supported on iOS. Use Chrome or Edge on a Mac, Windows PC, or Android device.' };
  if (isFirefox)
    return { type: 'err', text: 'Web Bluetooth is not supported in Firefox. Please open this page in Chrome or Edge.' };
  if (isSafari)
    return { type: 'err', text: 'Web Bluetooth is not supported in Safari. Please open this page in Chrome or Edge.' };
  if (isLinux && !navigator.bluetooth)
    return { type: 'warn', text: 'On Linux, Web Bluetooth may need to be enabled first: open chrome://flags/#enable-experimental-web-platform-features and set it to Enabled, then relaunch Chrome.' };
  if (isAndroid)
    return { type: 'ok', text: 'Chrome on Android is supported. Make sure Bluetooth is enabled in system Settings before connecting.' };
  if (IS_MAC && (isChrome || isEdge))
    return { type: 'ok', text: 'Chrome / Edge on Mac is supported. macOS may show a Bluetooth permission prompt the first time — click OK to allow it.' };
  if (isWindows && (isChrome || isEdge))
    return { type: 'ok', text: 'Chrome / Edge on Windows is supported. Make sure Bluetooth is turned on in Windows Settings.' };
  return null;
}

function getConnectSubtext() {
  const ua    = navigator.userAgent;
  if (IS_MAC)             return 'Make sure the keyboard is on and in range. macOS may ask for Bluetooth permission the first time.';
  if (/Android/.test(ua)) return 'Make sure the keyboard is on and Bluetooth is enabled on your device.';
  return 'Make sure the keyboard is powered on and in range.';
}

// ── Layout serialization ──────────────────────────────────────────────────────
function parseLayoutFromBytes(dataView) {
  const result = [];
  let idx = 0;
  for (let l = 0; l < 2; l++) {
    result[l] = [];
    for (let r = 0; r < 4; r++) {
      result[l][r] = [];
      for (let c = 0; c < 12; c++) {
        result[l][r][c] = [dataView.getUint8(idx++), dataView.getUint8(idx++)];
      }
    }
  }
  return result;
}

function serializeLayout() {
  const buf = new Uint8Array(192);
  let idx = 0;
  for (let l = 0; l < 2; l++)
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 12; c++) {
        buf[idx++] = layout[l][r][c][0];
        buf[idx++] = layout[l][r][c][1];
      }
  return buf;
}

// ── BLE connect ───────────────────────────────────────────────────────────────
async function connect() {
  if (bleDevice) { bleDevice.gatt.disconnect(); return; }

  const btn        = document.getElementById('btn-connect');
  const btnLabel   = document.getElementById('btn-connect-label');
  const btnSpinner = document.getElementById('btn-connect-spinner');

  btn.disabled      = true;
  btn.classList.add('loading');
  btnSpinner.hidden = false;

  try {
    btnLabel.textContent = 'Scanning…';
    bleDevice = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [CONFIG_SERVICE_UUID],
    });
    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

    btnLabel.textContent = 'Connecting…';
    const server  = await bleDevice.gatt.connect();
    const service = await server.getPrimaryService(CONFIG_SERVICE_UUID);
    controlChar   = await service.getCharacteristic(CONTROL_CHAR_UUID);
    dataChar      = await service.getCharacteristic(DATA_CHAR_UUID);
    const readChar = await service.getCharacteristic(READ_LAYOUT_CHAR_UUID);

    btnLabel.textContent = 'Reading layout…';
    const value = await readChar.readValue();
    layout      = parseLayoutFromBytes(value);
    savedLayout = deepClone(layout);

    currentLayer = 0;
    setBleConnected(true);
    renderGrid();
    showToast('Connected to ' + bleDevice.name, 'ok');

  } catch (err) {
    bleDevice   = null;
    controlChar = null;
    dataChar    = null;
    setBleConnected(false);
    // NotFoundError / AbortError = user cancelled the picker — no toast needed
    if (err.name !== 'NotFoundError' && err.name !== 'AbortError') {
      showToast(err.message || 'Connection failed', 'error', 5000);
    }
  }
}

function onDisconnected() {
  bleDevice   = null;
  controlChar = null;
  dataChar    = null;
  setBleConnected(false);
  showToast('Keyboard disconnected', 'error', 5000);
}

// ── BLE send layout ───────────────────────────────────────────────────────────
async function sendLayout() {
  if (!controlChar || !dataChar) return;

  const buf         = serializeLayout();
  const saveBtn     = document.getElementById('btn-save');
  const progressEl  = document.getElementById('save-progress');
  const progressBar = document.getElementById('save-progress-bar');

  saveBtn.disabled        = true;
  progressEl.hidden       = false;
  progressBar.style.width = '4%';

  try {
    await controlChar.writeValueWithResponse(new Uint8Array([CMD_ENTER_CONFIG]));
    progressBar.style.width = '8%';

    for (let offset = 0; offset < buf.length; offset += CHUNK_DATA_BYTES) {
      const chunk  = buf.slice(offset, offset + CHUNK_DATA_BYTES);
      const packet = new Uint8Array(2 + chunk.length);
      packet[0] = (offset >> 8) & 0xFF;
      packet[1] = offset & 0xFF;
      packet.set(chunk, 2);
      await dataChar.writeValueWithResponse(packet);

      const pct = 8 + Math.round(((offset + chunk.length) / buf.length) * 84);
      progressBar.style.width = pct + '%';
    }

    await controlChar.writeValueWithResponse(new Uint8Array([CMD_COMMIT]));
    progressBar.style.width = '100%';

    savedLayout = deepClone(layout);
    renderGrid();
    showToast('Layout saved to keyboard', 'ok');

    setTimeout(() => {
      progressEl.hidden       = true;
      progressBar.style.width = '0%';
    }, 700);

  } catch (err) {
    try { await controlChar.writeValueWithResponse(new Uint8Array([CMD_EXIT_CONFIG])); } catch (_) {}
    showToast('Save failed: ' + (err.message || 'unknown error'), 'error', 6000);
    progressEl.hidden = true;
  } finally {
    saveBtn.disabled = !hasChanges();
  }
}

// ── Keyboard grid ─────────────────────────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('keyboard-grid');
  grid.innerHTML = '';

  const l = currentLayer;
  for (let r = 0; r < 4; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'key-row';

    for (let c = 0; c < 12; c++) {
      const [code, modmask] = layout[l][r][c];
      const cell = document.createElement('button');
      cell.className = 'key-cell';
      cell.dataset.layer = l;
      cell.dataset.row   = r;
      cell.dataset.col   = c;

      if (selectedCell &&
          selectedCell.layer === l &&
          selectedCell.row   === r &&
          selectedCell.col   === c)
        cell.classList.add('selected');

      if (!keyEqual(layout[l][r][c], savedLayout[l][r][c]))
        cell.classList.add('modified');

      const { label: keyLabel, dead } = keyInfo(code, modmask, osLayout);
      cell.textContent = keyLabel;
      if (keyLabel.length > 5) cell.classList.add('long-label');
      if (dead) cell.classList.add('dead');

      cell.addEventListener('click', () => openPicker(l, r, c));
      rowEl.appendChild(cell);
    }

    grid.appendChild(rowEl);
  }

  updateSaveBar();
}

// ── Layer tabs ────────────────────────────────────────────────────────────────
function setLayer(l) {
  currentLayer = l;
  document.querySelectorAll('.layer-tab').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.layer) === l);
  });
  selectedCell = null;
  renderGrid();
}

// ── Preset selector ───────────────────────────────────────────────────────────
function initPresetSelector() {
  const sel = document.getElementById('preset-select');
  for (const name of Object.keys(PRESETS)) {
    const opt = document.createElement('option');
    opt.value       = name;
    opt.textContent = name;
    if (name === DEFAULT_PRESET) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => {
    layout       = deepClone(PRESETS[sel.value]);
    selectedCell = null;
    closePicker();
    renderGrid();
  });
}

// ── Key picker ────────────────────────────────────────────────────────────────
const LAYER_SHORT = ['Base', 'Num/Nav'];

function buildPicker(filter = '') {
  const groups    = OS_LAYOUTS[osLayout].groups;
  const container = document.getElementById('picker-groups');
  container.innerHTML = '';

  const q = filter.trim().toLowerCase();
  let totalVisible = 0;

  for (const groupName of GROUP_ORDER) {
    const keys = (groups[groupName] || []).filter(
      k => !q || k.label.toLowerCase().includes(q)
    );
    if (keys.length === 0) continue;
    totalVisible += keys.length;

    const section = document.createElement('div');
    section.className = 'picker-group';

    const heading = document.createElement('div');
    heading.className   = 'picker-group-label';
    heading.textContent = groupName;
    section.appendChild(heading);

    const keysEl = document.createElement('div');
    keysEl.className = 'picker-keys';

    for (const key of keys) {
      const btn = document.createElement('button');
      btn.className       = 'picker-key';
      btn.textContent     = key.label;
      btn.dataset.code    = key.code;
      btn.dataset.modmask = key.modmask;
      if (key.title) btn.title = key.title;
      if (key.dead)  btn.classList.add('dead');

      if (selectedCell) {
        const [curCode, curMod] = layout[selectedCell.layer][selectedCell.row][selectedCell.col];
        if (key.code === curCode && key.modmask === curMod)
          btn.classList.add('current');
      }

      btn.addEventListener('click', () => assignKey(key.code, key.modmask));
      keysEl.appendChild(btn);
    }

    section.appendChild(keysEl);

    if (groupName === 'Symbols' && !q) {
      const { unavailable, dead } = OS_LAYOUTS[osLayout].notes;
      const name = OS_LAYOUTS[osLayout].name;
      if (dead.length)
        appendPickerNote(section, `Dead keys on ${name} (the character appears after the next key press): ${dead.join(' ')}`);
      if (unavailable.length)
        appendPickerNote(section, `Not typeable on ${name}: ${unavailable.join(' ')}`);
    }

    container.appendChild(section);
  }

  let noResults = document.getElementById('picker-no-results');
  if (totalVisible === 0) {
    if (!noResults) {
      noResults    = document.createElement('p');
      noResults.id = 'picker-no-results';
    }
    noResults.textContent = `No keys matching "${filter}"`;
    container.appendChild(noResults);
  }
}

function appendPickerNote(section, text) {
  const note = document.createElement('p');
  note.className   = 'picker-note';
  note.textContent = text;
  section.appendChild(note);
}

function updatePickerHeader() {
  const { layer, row, col } = selectedCell;
  const [code, modmask]     = layout[layer][row][col];

  document.getElementById('picker-context').textContent =
    `${LAYER_SHORT[layer]} — Row ${row + 1}, Col ${col + 1}`;
  document.getElementById('picker-current-label').textContent =
    `Currently: ${keyInfo(code, modmask, osLayout).label}`;
}

function openPicker(layer, row, col) {
  selectedCell = { layer, row, col };
  renderGrid();
  updatePickerHeader();

  const search = document.getElementById('picker-search');
  search.value = '';
  buildPicker();

  document.getElementById('picker-overlay').classList.add('open');
  search.focus();

  // The computer's layout may have been switched since the last check
  autoRedetectOsLayout();
}

function closePicker() {
  selectedCell = null;
  document.getElementById('picker-overlay').classList.remove('open');
  renderGrid();
}

function assignKey(code, modmask) {
  if (!selectedCell) return;
  layout[selectedCell.layer][selectedCell.row][selectedCell.col] = [code, modmask];
  closePicker();
}

// ── Computer layout selector ───────────────────────────────────────────────────
const OS_LAYOUT_STORAGE_KEY = 'osLayout';
const MAC_ISO_STORAGE_KEY   = 'osLayoutMacIso';
const PLATFORM_NAMES        = { pc: 'Windows / Linux', mac: 'macOS' };

function loadOsLayoutChoice() {
  try {
    const v = localStorage.getItem(OS_LAYOUT_STORAGE_KEY);
    if (v === 'auto' || (Object.hasOwn(OS_LAYOUTS, v) && !OS_LAYOUTS[v].hidden)) return v;
  } catch (_) {}
  return 'auto';
}

function saveOsLayoutChoice(v) {
  try { localStorage.setItem(OS_LAYOUT_STORAGE_KEY, v); } catch (_) {}
}

// Manual ISO checkbox setting: true / false, or null when never set
function loadMacIsoOverride() {
  try {
    const v = localStorage.getItem(MAC_ISO_STORAGE_KEY);
    if (v === '1' || v === '0') return v === '1';
  } catch (_) {}
  return null;
}

function saveMacIsoOverride(on) {
  try { localStorage.setItem(MAC_ISO_STORAGE_KEY, on ? '1' : '0'); } catch (_) {}
}

function macIso() {
  return loadMacIsoOverride() ?? detectedMacIso ?? false;
}

function resolveOsLayout(choice) {
  const id = choice === 'auto' ? (detectedOsLayout || FALLBACK_LAYOUT) : choice;
  return OS_LAYOUTS[id].platform === 'mac' && macIso() ? `${id}-iso` : id;
}

function setOsLayout(id) {
  document.getElementById('os-iso-toggle').hidden = OS_LAYOUTS[id].platform !== 'mac';
  if (id === osLayout) return;
  osLayout = id;
  renderGrid();
  if (document.getElementById('picker-overlay').classList.contains('open')) {
    updatePickerHeader();
    buildPicker(document.getElementById('picker-search').value);
  }
}

function updateLayoutControls() {
  const opt = document.querySelector('#os-layout-select option[value="auto"]');
  opt.textContent = detectedOsLayout
    ? `Auto (${OS_LAYOUTS[detectedOsLayout].name})`
    : `Auto (not detected – ${OS_LAYOUTS[FALLBACK_LAYOUT].name})`;
  document.getElementById('os-layout-iso').checked = macIso();
}

// Re-run detection and follow it when "Auto" is selected. Concurrent callers
// share the in-flight run, so a stale result can't land after a newer one.
let detecting = null;

function redetectOsLayout() {
  detecting ??= detectLayout(OS_PLATFORM).then(result => {
    detecting = null;
    detectedOsLayout = result?.id ?? null;
    detectedMacIso   = result?.iso ?? null;
    updateLayoutControls();
    setOsLayout(resolveOsLayout(document.getElementById('os-layout-select').value));
  });
  return detecting;
}

// Browsers have no layout-change event, so with "Auto" selected this runs on
// window focus and picker open to catch an OS layout switch.
function autoRedetectOsLayout() {
  if (HAS_LAYOUT_MAP && document.getElementById('os-layout-select').value === 'auto')
    redetectOsLayout();
}

function initOsLayoutSelector() {
  const sel = document.getElementById('os-layout-select');

  const autoOpt = document.createElement('option');
  autoOpt.value = 'auto';
  sel.appendChild(autoOpt);

  // Current platform's layouts first
  for (const platform of IS_MAC ? ['mac', 'pc'] : ['pc', 'mac']) {
    const group = document.createElement('optgroup');
    group.label = PLATFORM_NAMES[platform];
    for (const [id, l] of Object.entries(OS_LAYOUTS)) {
      if (l.platform !== platform || l.hidden) continue;
      const opt = document.createElement('option');
      opt.value       = id;
      opt.textContent = l.name;
      group.appendChild(opt);
    }
    sel.appendChild(group);
  }

  sel.value = loadOsLayoutChoice();
  updateLayoutControls();
  setOsLayout(resolveOsLayout(sel.value));

  sel.addEventListener('change', () => {
    saveOsLayoutChoice(sel.value);
    setOsLayout(resolveOsLayout(sel.value));
    autoRedetectOsLayout();
  });

  document.getElementById('os-layout-iso').addEventListener('change', e => {
    saveMacIsoOverride(e.target.checked);
    setOsLayout(resolveOsLayout(sel.value));
  });

  const detectBtn = document.getElementById('os-layout-detect');
  if (!HAS_LAYOUT_MAP) {
    detectBtn.hidden = true;
    return;
  }
  detectBtn.addEventListener('click', async () => {
    await redetectOsLayout();
    showToast(detectedOsLayout
      ? `Detected ${OS_LAYOUTS[detectedOsLayout].name}`
      : 'Could not detect the computer layout', 'info', 2000);
  });
  window.addEventListener('focus', autoRedetectOsLayout);
  redetectOsLayout();
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  if (!navigator.bluetooth) {
    const btn = document.getElementById('btn-connect');
    btn.disabled = true;
    const tip = document.getElementById('platform-tip');
    tip.textContent = 'Web Bluetooth is not available. Open this page in Chrome or Edge.';
    tip.className   = 'platform-tip err';
    tip.hidden      = false;
  }

  const tip = getPlatformInfo();
  if (tip) {
    const el      = document.getElementById('platform-tip');
    el.textContent = tip.text;
    el.className   = 'platform-tip ' + tip.type;
    el.hidden      = false;
  }

  document.getElementById('connect-sub').textContent = getConnectSubtext();

  showView('connect');

  document.querySelectorAll('.layer-tab').forEach(btn => {
    btn.addEventListener('click', () => setLayer(parseInt(btn.dataset.layer)));
  });

  initPresetSelector();
  initOsLayoutSelector();

  const pairingToggle = document.getElementById('pairing-toggle');
  const pairingPanel  = document.getElementById('pairing-instructions');

  pairingToggle.addEventListener('click', () => {
    const expanded = pairingToggle.getAttribute('aria-expanded') === 'true';
    pairingToggle.setAttribute('aria-expanded', String(!expanded));
    pairingPanel.hidden = expanded;
  });

  document.getElementById('btn-connect').addEventListener('click', connect);

  document.getElementById('btn-disconnect').addEventListener('click', () => {
    if (bleDevice) bleDevice.gatt.disconnect();
  });

  document.getElementById('btn-save').addEventListener('click', sendLayout);

  document.getElementById('btn-reset').addEventListener('click', () => {
    layout       = deepClone(savedLayout);
    selectedCell = null;
    closePicker();
    renderGrid();
  });

  document.getElementById('picker-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closePicker();
  });
  document.getElementById('picker-close').addEventListener('click', closePicker);
  document.getElementById('picker-search').addEventListener('input', e => {
    buildPicker(e.target.value);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePicker();
  });
}

document.addEventListener('DOMContentLoaded', init);
