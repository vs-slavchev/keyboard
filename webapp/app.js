import { KEYS, GROUP_ORDER, getLabel, getKeysByGroup } from './keycodes.js';
import { PRESETS, DEFAULT_PRESET } from './presets.js';

// ── BLE constants ─────────────────────────────────────────────────────────────
const CONFIG_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CONTROL_CHAR_UUID   = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const DATA_CHAR_UUID      = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const CMD_ENTER_CONFIG    = 0x01;
const CMD_EXIT_CONFIG     = 0x02;
const CMD_COMMIT          = 0x03;
const CHUNK_DATA_BYTES    = 18; // 20 byte BLE payload - 2 byte offset header

// ── State ─────────────────────────────────────────────────────────────────────
let layout = deepClone(PRESETS[DEFAULT_PRESET]);
let activeLayer = 0;
let selectedCell = null; // { row, col }
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
  document.getElementById('btn-send').disabled = !connected;
}

// ── Layout serialization ──────────────────────────────────────────────────────
function serializeLayout() {
  const buf = new Uint8Array(192);
  let idx = 0;
  for (let l = 0; l < 2; l++)
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 12; c++) {
        buf[idx++] = layout[l][r][c][0]; // keycode
        buf[idx++] = layout[l][r][c][1]; // modmask
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
    const server  = await bleDevice.gatt.connect();
    const service = await server.getPrimaryService(CONFIG_SERVICE_UUID);
    controlChar   = await service.getCharacteristic(CONTROL_CHAR_UUID);
    dataChar      = await service.getCharacteristic(DATA_CHAR_UUID);

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
  document.getElementById('btn-send').disabled = true;

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

    setStatus('Layout saved to keyboard!', 'ok');
  } catch (err) {
    try {
      await controlChar.writeValueWithResponse(new Uint8Array([CMD_EXIT_CONFIG]));
    } catch (_) {}
    setStatus('Send failed: ' + err.message, 'error');
  } finally {
    document.getElementById('btn-send').disabled = false;
  }
}

// ── Grid rendering ────────────────────────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('keyboard-grid');
  grid.innerHTML = '';

  for (let r = 0; r < 4; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'key-row';

    for (let c = 0; c < 12; c++) {
      const [code, modmask] = layout[activeLayer][r][c];
      const cell = document.createElement('button');
      cell.className = 'key-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      if (selectedCell && selectedCell.row === r && selectedCell.col === c)
        cell.classList.add('selected');

      const label = getLabel(code, modmask);
      cell.textContent = label;
      if (label.length > 5) cell.classList.add('long-label');

      cell.addEventListener('click', () => openPicker(r, c));
      rowEl.appendChild(cell);
    }

    grid.appendChild(rowEl);
  }
}

// ── Layer tabs ────────────────────────────────────────────────────────────────
function initLayerTabs() {
  document.querySelectorAll('.layer-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeLayer = parseInt(tab.dataset.layer);
      document.querySelectorAll('.layer-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedCell = null;
      closePicker();
      renderGrid();
    });
  });
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
function buildPicker() {
  const groups = getKeysByGroup();
  const container = document.getElementById('picker-groups');
  container.innerHTML = '';

  for (const groupName of GROUP_ORDER) {
    const keys = groups[groupName];
    if (!keys || keys.length === 0) continue;

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
      btn.addEventListener('click', () => assignKey(key.code, key.modmask));
      keysEl.appendChild(btn);
    }

    section.appendChild(keysEl);
    container.appendChild(section);
  }
}

function openPicker(row, col) {
  selectedCell = { row, col };
  renderGrid();

  const [code, modmask] = layout[activeLayer][row][col];

  // Highlight currently assigned key in picker
  document.querySelectorAll('.picker-key').forEach(btn => {
    btn.classList.toggle(
      'current',
      parseInt(btn.dataset.code) === code && parseInt(btn.dataset.modmask) === modmask
    );
  });

  const label = getLabel(code, modmask);
  document.getElementById('picker-title').textContent =
    `Row ${row + 1}, Col ${col + 1}  —  currently: ${label}`;

  document.getElementById('picker-overlay').classList.add('open');
}

function closePicker() {
  selectedCell = null;
  document.getElementById('picker-overlay').classList.remove('open');
  renderGrid();
}

function assignKey(code, modmask) {
  if (!selectedCell) return;
  layout[activeLayer][selectedCell.row][selectedCell.col] = [code, modmask];
  closePicker();
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  if (!navigator.bluetooth) {
    setStatus('Web Bluetooth not supported. Use Chrome or Edge.', 'error');
    document.getElementById('btn-connect').disabled = true;
  }

  initLayerTabs();
  initPresetSelector();
  buildPicker();
  renderGrid();

  document.getElementById('btn-connect').addEventListener('click', connect);
  document.getElementById('btn-send').addEventListener('click', sendLayout);

  document.getElementById('picker-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closePicker();
  });
  document.getElementById('picker-close').addEventListener('click', closePicker);
}

document.addEventListener('DOMContentLoaded', init);
