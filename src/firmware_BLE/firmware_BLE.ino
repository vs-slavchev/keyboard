#include <BleKeyboard.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <Preferences.h>
#include <esp_wifi.h>
#include "driver/adc.h"

// symbols
#define K_SPC 0x20
#define K_DQO 0x22
#define K_SQO 0x27
#define K_OPR 0x28
#define K_CPR 0x29
#define K_CMA 0x2C
#define K_MIN 0x2D
#define K_DOT 0x2E
#define K_FSL 0x2F
#define K_SCL 0x3B
#define K_EQU 0x3D
#define K_OSB 0x5B
#define K_CSB 0x5D
#define K_BSL 0x5C
#define K_OCB 0x7B
#define K_CCB 0x7D
#define K_BTK 0x60

// letters
#define KEY_A 0x61
#define KEY_B 0x62
#define KEY_C 0x63
#define KEY_D 0x64
#define KEY_E 0x65
#define KEY_F 0x66
#define KEY_G 0x67
#define KEY_H 0x68
#define KEY_I 0x69
#define KEY_J 0x6A
#define KEY_K 0x6B
#define KEY_L 0x6C
#define KEY_M 0x6D
#define KEY_N 0x6E
#define KEY_O 0x6F
#define KEY_P 0x70
#define KEY_Q 0x71
#define KEY_R 0x72
#define KEY_S 0x73
#define KEY_T 0x74
#define KEY_U 0x75
#define KEY_V 0x76
#define KEY_W 0x77
#define KEY_X 0x78
#define KEY_Y 0x79
#define KEY_Z 0x7A

// digits
#define KEY_0 0x30
#define KEY_1 0x31
#define KEY_2 0x32
#define KEY_3 0x33
#define KEY_4 0x34
#define KEY_5 0x35
#define KEY_6 0x36
#define KEY_7 0x37
#define KEY_8 0x38
#define KEY_9 0x39

// modifiers (sent as standalone keys; also used by modifier mask bits)
#define K_C_L 0x80
#define K_S_L 0x81
#define K_A_L 0x82
#define K_G_L 0x83
#define K_C_R 0x84
#define K_S_R 0x85
#define K_A_R 0x86
#define K_G_R 0x87

// non-printable
#define K_ETR 0xB0
#define K_ESC 0xB1
#define K_BKS 0xB2
#define K_TAB 0xB3
#define K_F01 0xC2
#define K_F02 0xC3
#define K_F03 0xC4
#define K_F04 0xC5
#define K_F05 0xC6
#define K_F06 0xC7
#define K_F07 0xC8
#define K_F08 0xC9
#define K_F09 0xCA
#define K_F10 0xCB
#define K_F11 0xCC
#define K_F12 0xCD
#define K_CPS 0xC1
#define K_INS 0xD1
#define K_HOM 0xD2
#define K_PUP 0xD3
#define K_DEL 0xD4
#define K_END 0xD5
#define K_PDN 0xD6
#define K_RHT 0xD7
#define K_LFT 0xD8
#define K_DWN 0xD9
#define K_AUP 0xDA

// meta (>= FIRST_META_KEY; handled specially, not sent via keyboard.press)
#define K_NON 0x00
#define FIRST_META_KEY 0xF0
#define CTALD 0xF1
#define BATLV 0xF2
#define HIGHR 0xFF

// Modifier mask bits (used in layout_mod array)
// Bit 0=Ctrl L, 1=Shift L, 2=Alt L, 3=GUI L, 4=Ctrl R, 5=Shift R, 6=Alt R, 7=GUI R
#define MOD_C_L 0x01
#define MOD_S_L 0x02
#define MOD_A_L 0x04
#define MOD_G_L 0x08
#define MOD_C_R 0x10
#define MOD_S_R 0x20
#define MOD_A_R 0x40
#define MOD_G_R 0x80

// BLE config service
#define CONFIG_SERVICE_UUID "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CONTROL_CHAR_UUID   "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define DATA_CHAR_UUID      "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define CMD_ENTER_CONFIG    0x01
#define CMD_EXIT_CONFIG     0x02
#define CMD_COMMIT          0x03

#define LAYOUT_BYTES 192  // 2 layers * 4 rows * 12 cols * 2 bytes/key

#define BATTERY_GAUGE_PIN 35
#define LED_BATTERY_PIN_L 22
#define LED_BATTERY_PIN_R 21
#define DEBOUNCE_DELAY 15
#define LEDS_DURATION_MS 300

BleKeyboard keyboard("Изумруд", "Vesi", 100);

const byte NUM_ROWS = 4;
const byte NUM_COLS = 12;
const byte NUM_LAYOUT_LEVELS = 2;
byte layout_level = 0;

bool config_mode = false;
uint8_t incoming_buffer[LAYOUT_BYTES];

bool ledsOn = false;
unsigned long ledsOnEndTime;

byte row_pins[NUM_ROWS] = {15, 23, 4, 16};
byte col_pins[NUM_COLS] = {32, 33, 25, 26, 27, 14, 12, 13, 19, 18, 5, 17};

// layout[level][row][col] = keycode (low byte of the 2-byte key entry)
byte layout[NUM_LAYOUT_LEVELS][NUM_ROWS][NUM_COLS] = {
  {
    {K_TAB, KEY_Q, KEY_W, KEY_F, KEY_P, KEY_B, KEY_J, KEY_L, KEY_U, KEY_Y, K_MIN, K_BKS},
    {K_ESC, KEY_A, KEY_R, KEY_S, KEY_T, KEY_G, KEY_K, KEY_N, KEY_E, KEY_I, KEY_O, K_ETR},
    {K_S_L, KEY_Z, KEY_X, KEY_C, KEY_V, KEY_D, KEY_M, KEY_H, K_CMA, K_DOT, K_DQO, K_S_R},
    {K_C_L, K_CSB, K_G_L, K_A_L, HIGHR, K_SPC, K_SCL, K_OCB, K_OPR, K_OSB, K_EQU, K_FSL}
  },
  {
    {K_BTK, K_INS, K_DEL, K_HOM, K_END, K_PUP, K_PDN, KEY_7, KEY_8, KEY_9, K_BSL, K_BKS},
    {K_ESC, K_BTK, K_F04, K_F05, K_F06, K_NON, K_NON, KEY_4, KEY_5, KEY_6, K_SQO, K_ETR},
    {K_S_L, K_NON, K_NON, K_NON, BATLV, K_NON, K_NON, KEY_1, KEY_2, KEY_3, K_AUP, K_S_R},
    {K_C_L, K_NON, K_G_L, K_A_L, HIGHR, K_SPC, CTALD, K_CPS, KEY_0, K_LFT, K_DWN, K_RHT}
  }
};

// layout_mod[level][row][col] = modifier mask (high byte of the 2-byte key entry)
// All zero by default (no extra modifiers on any key)
byte layout_mod[NUM_LAYOUT_LEVELS][NUM_ROWS][NUM_COLS] = {};

bool pressed_switches[NUM_ROWS][NUM_COLS] = {
  {false, false, false, false, false, false, false, false, false, false, false, false},
  {false, false, false, false, false, false, false, false, false, false, false, false},
  {false, false, false, false, false, false, false, false, false, false, false, false},
  {false, false, false, false, false, false, false, false, false, false, false, false}
};

bool key_states[NUM_ROWS][NUM_COLS] = {
  {false, false, false, false, false, false, false, false, false, false, false, false},
  {false, false, false, false, false, false, false, false, false, false, false, false},
  {false, false, false, false, false, false, false, false, false, false, false, false},
  {false, false, false, false, false, false, false, false, false, false, false, false}
};

// ── NVS ──────────────────────────────────────────────────────────────────────

uint8_t compute_crc(uint8_t* buf, size_t len) {
  uint8_t crc = 0;
  for (size_t i = 0; i < len; i++) crc ^= buf[i];
  return crc;
}

void serialize_layout(uint8_t* buf) {
  int idx = 0;
  for (int l = 0; l < NUM_LAYOUT_LEVELS; l++)
    for (int r = 0; r < NUM_ROWS; r++)
      for (int c = 0; c < NUM_COLS; c++) {
        buf[idx++] = layout[l][r][c];
        buf[idx++] = layout_mod[l][r][c];
      }
}

void deserialize_layout(uint8_t* buf) {
  int idx = 0;
  for (int l = 0; l < NUM_LAYOUT_LEVELS; l++)
    for (int r = 0; r < NUM_ROWS; r++)
      for (int c = 0; c < NUM_COLS; c++) {
        layout[l][r][c]     = buf[idx++];
        layout_mod[l][r][c] = buf[idx++];
      }
}

void save_layout_to_nvs() {
  uint8_t buf[LAYOUT_BYTES];
  serialize_layout(buf);
  uint8_t crc = compute_crc(buf, LAYOUT_BYTES);

  Preferences prefs;
  prefs.begin("keyboard", false);
  prefs.putBytes("layout", buf, LAYOUT_BYTES);
  prefs.putUChar("crc", crc);
  prefs.end();
}

void load_layout_from_nvs() {
  Preferences prefs;
  prefs.begin("keyboard", true);
  uint8_t buf[LAYOUT_BYTES];
  size_t len = prefs.getBytes("layout", buf, LAYOUT_BYTES);
  uint8_t stored_crc = prefs.getUChar("crc", 0xFF);
  prefs.end();

  if (len != LAYOUT_BYTES) return;
  if (compute_crc(buf, LAYOUT_BYTES) != stored_crc) return;

  deserialize_layout(buf);
}

// ── BLE config service ────────────────────────────────────────────────────────

void apply_incoming_layout() {
  deserialize_layout(incoming_buffer);
}

class ControlCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) override {
    if (pChar->getLength() < 1) return;
    uint8_t cmd = pChar->getData()[0];
    switch (cmd) {
      case CMD_ENTER_CONFIG:
        config_mode = true;
        keyboard.releaseAll();
        break;
      case CMD_EXIT_CONFIG:
        config_mode = false;
        break;
      case CMD_COMMIT:
        apply_incoming_layout();
        save_layout_to_nvs();
        config_mode = false;
        break;
    }
  }
};

class DataCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) override {
    size_t len = pChar->getLength();
    if (len < 3) return;
    uint8_t* data = pChar->getData();
    uint16_t offset = ((uint16_t)data[0] << 8) | data[1];
    uint16_t data_len = len - 2;
    if (offset + data_len > LAYOUT_BYTES) return;
    memcpy(incoming_buffer + offset, data + 2, data_len);
  }
};

void init_ble_config_service() {
  BLEServer* pServer = keyboard.pServer;

  BLEService* pConfigService = pServer->createService(CONFIG_SERVICE_UUID);

  BLECharacteristic* pControlChar = pConfigService->createCharacteristic(
    CONTROL_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
  pControlChar->setCallbacks(new ControlCallback());

  BLECharacteristic* pDataChar = pConfigService->createCharacteristic(
    DATA_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
  pDataChar->setCallbacks(new DataCallback());

  pConfigService->start();
}

// ── Key processing ────────────────────────────────────────────────────────────

void press_modifiers(byte modmask) {
  if (modmask & MOD_C_L) keyboard.press(K_C_L);
  if (modmask & MOD_S_L) keyboard.press(K_S_L);
  if (modmask & MOD_A_L) keyboard.press(K_A_L);
  if (modmask & MOD_G_L) keyboard.press(K_G_L);
  if (modmask & MOD_C_R) keyboard.press(K_C_R);
  if (modmask & MOD_S_R) keyboard.press(K_S_R);
  if (modmask & MOD_A_R) keyboard.press(K_A_R);
  if (modmask & MOD_G_R) keyboard.press(K_G_R);
}

void release_modifiers(byte modmask) {
  if (modmask & MOD_C_L) keyboard.release(K_C_L);
  if (modmask & MOD_S_L) keyboard.release(K_S_L);
  if (modmask & MOD_A_L) keyboard.release(K_A_L);
  if (modmask & MOD_G_L) keyboard.release(K_G_L);
  if (modmask & MOD_C_R) keyboard.release(K_C_R);
  if (modmask & MOD_S_R) keyboard.release(K_S_R);
  if (modmask & MOD_A_R) keyboard.release(K_A_R);
  if (modmask & MOD_G_R) keyboard.release(K_G_R);
}

byte get_layout_code(byte row, byte col) {
  return layout[layout_level][row][col];
}

void press_key(byte row, byte col) {
  key_states[row][col] = true;
  byte keycode = get_layout_code(row, col);
  byte modmask = layout_mod[layout_level][row][col];

  if (keycode < FIRST_META_KEY) {
    press_modifiers(modmask);
    keyboard.press(keycode);
  } else {
    switch (keycode) {
      case HIGHR:
        keyboard.releaseAll();
        layout_level = 1;
        break;
      case CTALD:
        keyboard.press(K_C_L);
        keyboard.press(K_A_L);
        keyboard.press(K_DEL);
        break;
      case BATLV:
        turn_leds_on_for(get_battery_percent() * 10);
        break;
      default:
        break;
    }
  }
}

void release_key(byte row, byte col) {
  key_states[row][col] = false;
  byte keycode = get_layout_code(row, col);
  byte modmask = layout_mod[layout_level][row][col];

  if (keycode < FIRST_META_KEY) {
    keyboard.release(keycode);
    release_modifiers(modmask);
  } else {
    switch (keycode) {
      case HIGHR:
        keyboard.releaseAll();
        layout_level = 0;
        break;
      case CTALD:
        keyboard.releaseAll();
        break;
      case BATLV:
        break;
      default:
        break;
    }
  }
}

void process_keys() {
  for (byte row = 0; row < NUM_ROWS; row++) {
    for (byte col = 0; col < NUM_COLS; col++) {
      bool is_pressed = pressed_switches[row][col];
      if (is_pressed && !key_states[row][col]) {
        press_key(row, col);
      } else if (!is_pressed && key_states[row][col]) {
        release_key(row, col);
      }
    }
  }
}

// ── Hardware ──────────────────────────────────────────────────────────────────

void scan_switches() {
  for (byte col = 0; col < NUM_COLS; col++)
    pinMode(col_pins[col], INPUT_PULLUP);

  for (byte row = 0; row < NUM_ROWS; row++) {
    pinMode(row_pins[row], OUTPUT);
    digitalWrite(row_pins[row], LOW);
    for (byte col = 0; col < NUM_COLS; col++)
      pressed_switches[row][col] = !digitalRead(col_pins[col]);
    digitalWrite(row_pins[row], HIGH);
    pinMode(row_pins[row], INPUT);
  }
}

int get_battery_percent() {
  float batteryInput = analogRead(BATTERY_GAUGE_PIN);
  float input_voltage = (batteryInput * 4.2) / 4095.0;
  int input_voltage_millivolts = input_voltage * 1000;
  int battery_percentage = round(map(input_voltage_millivolts, 3300, 4200, 0, 100));
  keyboard.setBatteryLevel(battery_percentage);
  return battery_percentage;
}

void turn_leds_on_for(int millisOn) {
  if (millisOn < 0) return;
  ledsOn = true;
  ledsOnEndTime = millis() + millisOn;
  digitalWrite(LED_BATTERY_PIN_L, HIGH);
  digitalWrite(LED_BATTERY_PIN_R, HIGH);
}

void tick_battery_leds() {
  if (ledsOn && (ledsOnEndTime < millis())) {
    digitalWrite(LED_BATTERY_PIN_L, LOW);
    digitalWrite(LED_BATTERY_PIN_R, LOW);
    ledsOn = false;
  }
}

void init_battery_optimisations() {
  setCpuFrequencyMhz(80);
  esp_wifi_stop();
}

// ── Arduino entry points ──────────────────────────────────────────────────────

void setup() {
  pinMode(BATTERY_GAUGE_PIN, INPUT);
  pinMode(LED_BATTERY_PIN_L, OUTPUT);
  pinMode(LED_BATTERY_PIN_R, OUTPUT);
  init_battery_optimisations();
  keyboard.begin();
  load_layout_from_nvs();
  init_ble_config_service();
  Serial.begin(9600);
  Serial.println("Started.");
  turn_leds_on_for(LEDS_DURATION_MS);
}

void loop() {
  scan_switches();
  if (!config_mode && keyboard.isConnected()) {
    process_keys();
  }
  tick_battery_leds();
  delay(DEBOUNCE_DELAY);
}
