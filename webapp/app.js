import { KEYS, GROUP_ORDER, getLabel, getKeysByGroup } from './keycodes.js';
import { PRESETS, DEFAULT_PRESET } from './presets.js';

// ── BLE constants ─────────────────────────────────────────────────────────────
const CONFIG_SERVICE_UUID  = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CONTROL_CHAR_UUID    = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const DATA_CHAR_UUID       = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const READ_LAYOUT_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const CMD_ENTER_CONFIG     = 0x01;
const CMD_EXIT_CONFIG      = 0x02;
const CMD_COMMIT           = 0x03;
const CHUNK_DATA_BYTES     = 18;

// ── State ─────────────────────────────────────────────────────────────────────
let layout = deepClone(PRESETS[DEFAULT_PRESET]);
let savedLayout = deepClone(PRESETS[DEFAULT_PRESET]);
let selectedCell = null;
let bleDevice = null;
let controlChar = null;
let dataChar = null;

// ── Helpers ───────────────────────────────────────────────────────────────────
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function setStatus(msg, type = 'info') {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status ' + type;
}

function setBleStatus(connected) {
  const btn = document.getElementById('btn-connect');
  btn.textContent = connected ? 'Disconnect' : 'Connect';
  btn.classList.toggle('connected', connected);
  document.getElementById('btn-save').disabled = !connected;
}

function keyEqual(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

// ── Platform detection ────────────────────────────────────────────────────────
function getPlatformInfo() {
  const ua = navigator.userAgent;
  const isIOS     = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMac     = /Mac/.test(navigator.platform) && !isIOS;
  const isWindows = /Win/.test(navigator.platform);
  const isLinux   = /Linux/.test(navigator.platform) && !isAndroid;
  const isFirefox = /Firefox/.test(ua);
  const isSafari  = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome  = /Chrome/.test(ua) && !/Edg/.test(ua);
  const isEdge    = /Edg/.test(ua);

  if (isIOS)
    return { type: 'err', text: '⚠️ Web Bluetooth is not supported on iOS. Use Chrome or Edge on a Mac, Windows PC, or Android device.' };
  if (isFirefox)
    return { type: 'err', text: '⚠️ Web Bluetooth is not supported in Firefox. Please open this page in Chrome or Edge.' };
  if (isSafari)
    return { type: 'err', text: '⚠️ Web Bluetooth is not supported in Safari. Please open this page in Chrome or Edge.' };
  if (isLinux)
    return navigator.bluetooth
      ? null
      : { type: 'warn', text: '💡 On Linux, Web Bluetooth may need to be enabled first: open chrome://flags/#enable-experimental-web-platform-features and set it to Enabled, then relaunch Chrome.' };
  if (isAndroid)
    return { type: 'ok', text: '✓ Chrome on Android is supported. Make sure Bluetooth is enabled in system Settings before connecting.' };
  if (isMac && (isChrome || isEdge))
    return { type: 'ok', text: '✓ Chrome / Edge on Mac is supported. macOS may show a Bluetooth permission prompt the first time — click OK to allow it.' };
  if (isWindows && (isChrome || isEdge))
    return { type: 'ok', text: '✓ Chrome / Edge on Windows is supported. Make sure Bluetooth is turned on in Windows Settings.' };

  return null;
}

function getConnectInstructions() {
  const ua = navigator.userAgent;
  const isMac = /Mac/.test(navigator.platform) && !/iPhone|iPad|iPod/.test(ua);
  if (isMac) return 'Click Connect → allow Bluetooth access → select Изумруд';
  if (/Android/.test(ua)) return 'Click Connect → enable Bluetooth if prompted → select Изумруд';
  return 'Click Connect → select Изумруд from the browser popup';
}

function initGuide() {
  const tip = getPlatformInfo();
  if (tip) {
    const el = document.getElementById('platform-tip');
    el.textContent = tip.text;
    el.className = 'platform-tip ' + tip.type;
    el.hidden = false;
  }

  document.getElementById('step-connect-desc').textContent = getConnectInstructions();

  const guide = document.getElementById('guide');
  document.querySelector('.guide-header').addEventListener('click', () => {
    guide.classList.toggle('collapsed');
  });
}

// ── Layout serialization / deserialization ────────────────────────────────────
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

// ── BLE ───────────────────────────────────────────────────────────────────────
async function connect() {
  if (bleDevice) {
    bleDevice.gatt.disconnect();
    return;
  }
  try {
    setStatus('Scanning…');
    bleDevice = await navigator.bluetooth.requestDevice({
      filters: [{ name: 'Изумруд' }],
      optionalServices: [CONFIG_SERVICE_UUID],
    });
    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

    setStatus('Connecting…');
    const server   = await bleDevice.gatt.connect();
    const service  = await server.getPrimaryService(CONFIG_SERVICE_UUID);
    controlChar    = await service.getCharacteristic(CONTROL_CHAR_UUID);
    dataChar       = await service.getCharacteristic(DATA_CHAR_UUID);
    const readChar = await service.getCharacteristic(READ_LAYOUT_CHAR_UUID);

    setStatus('Reading layout from keyboard…');
    const value = await readChar.readValue();
    layout = parseLayoutFromBytes(value);
    savedLayout = deepClone(layout);
    renderGrid();

    setBleStatus(true);
    setStatus('Connected to ' + bleDevice.name, 'ok');
  } catch (err) {
    bleDevice = null;
    controlChar = null;
    dataChar = null;
    setBleStatus(false);
    setStatus(err.message || 'Connection failed', 'error');
  }
}

function onDisconnected() {
  bleDevice = null;
  controlChar = null;
  dataChar = null;
  setBleStatus(false);
  setStatus('Disconnected', 'error');
}

async function sendLayout() {
  if (!controlChar || !dataChar) return;

  const buf = serializeLayout();
  document.getElementById('btn-save').disabled = true;

  try {
    setStatus('Entering config mode…');
    await controlChar.writeValueWithResponse(new Uint8Array([CMD_ENTER_CONFIG]));

    setStatus('Sending layout…');
    for (let offset = 0; offset < buf.length; offset += CHUNK_DATA_BYTES) {
      const chunk = buf.slice(offset, offset + CHUNK_DATA_BYTES);
      const packet = new Uint8Array(2 + chunk.length);
      packet[0] = (offset >> 8) & 0xFF;
      packet[1] = offset & 0xFF;
      packet.set(chunk, 2);
      await dataChar.writeValueWithResponse(packet);

      const pct = Math.round(((offset + chunk.length) / buf.length) * 100);
      setStatus(`Sending layout… ${pct}%`);
    }

    setStatus('Committing…');
    await controlChar.writeValueWithResponse(new Uint8Array([CMD_COMMIT]));

    savedLayout = deepClone(layout);
    renderGrid();
    setStatus('Layout saved to keyboard!', 'ok');
  } catch (err) {
    try {
      await controlChar.writeValueWithResponse(new Uint8Array([CMD_EXIT_CONFIG]));
    } catch (_) {}
    setStatus('Send failed: ' + err.message, 'error');
  } finally {
    document.getElementById('btn-save').disabled = !bleDevice;
  }
}

// ── Grid rendering ────────────────────────────────────────────────────────────
const LAYER_NAMES = [
  'Layer 0 — Base (Keys and Modifiers)',
  'Layer 1 — Numbers / Function keys',
];

function renderGrid() {
  const grid = document.getElementById('keyboard-grid');
  grid.innerHTML = '';

  for (let l = 0; l < 2; l++) {
    const label = document.createElement('div');
    label.className = 'layer-label';
    label.textContent = LAYER_NAMES[l];
    grid.appendChild(label);

    for (let r = 0; r < 4; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'key-row';

      for (let c = 0; c < 12; c++) {
        const [code, modmask] = layout[l][r][c];
        const cell = document.createElement('button');
        cell.className = 'key-cell';
        cell.dataset.layer = l;
        cell.dataset.row = r;
        cell.dataset.col = c;

        if (selectedCell && selectedCell.layer === l && selectedCell.row === r && selectedCell.col === c)
          cell.classList.add('selected');

        if (!keyEqual(layout[l][r][c], savedLayout[l][r][c]))
          cell.classList.add('modified');

        const keyLabel = getLabel(code, modmask);
        cell.textContent = keyLabel;
        if (keyLabel.length > 5) cell.classList.add('long-label');

        cell.addEventListener('click', () => openPicker(l, r, c));
        rowEl.appendChild(cell);
      }

      grid.appendChild(rowEl);
    }

    if (l < 1) {
      const sep = document.createElement('div');
      sep.className = 'layer-sep';
      grid.appendChild(sep);
    }
  }
}

// ── Preset selector ───────────────────────────────────────────────────────────
function initPresetSelector() {
  const sel = document.getElementById('preset-select');
  for (const name of Object.keys(PRESETS)) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === DEFAULT_PRESET) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => {
    layout = deepClone(PRESETS[sel.value]);
    selectedCell = null;
    closePicker();
    renderGrid();
  });
}

// ── Key picker ────────────────────────────────────────────────────────────────
function buildPicker(filter = '') {
  const groups = getKeysByGroup();
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

    const heading = document.createElement('h3');
    heading.textContent = groupName;
    section.appendChild(heading);

    const keysEl = document.createElement('div');
    keysEl.className = 'picker-keys';

    for (const key of keys) {
      const btn = document.createElement('button');
      btn.className = 'picker-key';
      btn.textContent = key.label;
      btn.dataset.code = key.code;
      btn.dataset.modmask = key.modmask;

      if (selectedCell) {
        const [curCode, curMod] = layout[selectedCell.layer][selectedCell.row][selectedCell.col];
        if (key.code === curCode && key.modmask === curMod)
          btn.classList.add('current');
      }

      btn.addEventListener('click', () => assignKey(key.code, key.modmask));
      keysEl.appendChild(btn);
    }

    section.appendChild(keysEl);
    container.appendChild(section);
  }

  let noResults = document.getElementById('picker-no-results');
  if (totalVisible === 0) {
    if (!noResults) {
      noResults = document.createElement('p');
      noResults.id = 'picker-no-results';
    }
    noResults.textContent = `No keys matching "${filter}"`;
    container.appendChild(noResults);
  }
}

function openPicker(layer, row, col) {
  selectedCell = { layer, row, col };
  renderGrid();

  const [code, modmask] = layout[layer][row][col];
  const keyLabel = getLabel(code, modmask);
  document.getElementById('picker-title').textContent =
    `${LAYER_NAMES[layer]}, Row ${row + 1}, Col ${col + 1}  —  currently: ${keyLabel}`;

  const search = document.getElementById('picker-search');
  search.value = '';
  buildPicker();

  document.getElementById('picker-overlay').classList.add('open');
  search.focus();
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

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  if (!navigator.bluetooth) {
    setStatus('Web Bluetooth not supported. Use Chrome or Edge.', 'error');
    document.getElementById('btn-connect').disabled = true;
  }

  initGuide();
  initPresetSelector();
  renderGrid();

  document.getElementById('btn-connect').addEventListener('click', connect);
  document.getElementById('btn-save').addEventListener('click', sendLayout);

  document.getElementById('picker-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closePicker();
  });
  document.getElementById('picker-close').addEventListener('click', closePicker);

  document.getElementById('picker-search').addEventListener('input', e => {
    buildPicker(e.target.value);
  });
}

document.addEventListener('DOMContentLoaded', init);
