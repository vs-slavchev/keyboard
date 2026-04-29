#include "ble_hid_keyboard.h"
#include <esp_wifi.h>
#include "driver/adc.h"
#include "nvs_layout.h"

// modifiers
#define K_C_L 0x80
#define K_S_L 0x81
#define K_A_L 0x82
#define K_G_L 0x83
#define K_C_R 0x84
#define K_S_R 0x85
#define K_A_R 0x86
#define K_G_R 0x87

// non-printable
#define K_ETR 0xB0 //enter
#define K_ESC 0xB1
#define K_BKS 0xB2 //backspace
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
#define K_CPS 0xC1 //caps lock
#define K_INS 0xD1 //insert
#define K_HOM 0xD2 //home
#define K_PUP 0xD3 //page up
#define K_DEL 0xD4 //delete
#define K_END 0xD5
#define K_PDN 0xD6 //page down
#define K_RHT 0xD7 //right arrow
#define K_LFT 0xD8 //left arrow
#define K_DWN 0xD9 //down arrow
#define K_AUP 0xDA //up arrow

// meta
#define K_NON 0x00
#define FIRST_META_KEY 0xF0
#define CTALD 0xF1 //Ctrl Alt Delete
#define BATLV 0xF2 //battery level
#define HIGHR 0xFF

// BLE config service
#define CONFIG_SERVICE_UUID     "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CONTROL_CHAR_UUID       "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define DATA_CHAR_UUID          "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define READ_LAYOUT_CHAR_UUID   "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
#define CMD_ENTER_CONFIG        0x01
#define CMD_EXIT_CONFIG         0x02
#define CMD_COMMIT              0x03

#define BATTERY_GAUGE_PIN 35
#define LED_BATTERY_PIN_L 22
#define LED_BATTERY_PIN_R 21

#define DEBOUNCE_DELAY 15
#define LEDS_DURATION_MS 300
#define BATTERY_UPDATE_INTERVAL_MS 60000

// Pairing combo: top 3 keys of the leftmost column (rows 0-2, col 0).
// Hold all 3 with the left hand; right hand stays free for the mouse.
// Keypresses from these keys are suppressed while the combo is active so
// no HID output reaches the host regardless of what the keys are mapped to.
#define PAIRING_COMBO_COL  0
#define PAIRING_COMBO_SIZE 3
const byte PAIRING_COMBO_ROWS[PAIRING_COMBO_SIZE] = {0, 1, 2};

// forward declarations (avoids ctags prototype-generation issues)
void scan_switches();
void process_keys();
void press_key(byte row, byte col);
void release_key(byte row, byte col);
int  get_battery_percent();
void turn_leds_on_for(int millisOn);
void tick_battery_leds();
void init_battery_optimisations();
void init_ble_config_service();
byte get_layout_code(byte row, byte col);
void check_pairing_combo();
bool is_pairing_combo_key(byte row, byte col);

BleKeyboard keyboard("Изумруд", "Vesi", 100);

const byte NUM_ROWS = 4;
const byte NUM_COLS = 12;
const byte NUM_LAYOUT_LEVELS = 2;
byte layout_level = 0;

bool ledsOn = false;
bool ledsForcedOn = false;
unsigned long ledsOnEndTime;
unsigned long lastBatteryUpdateTime = 0;

bool pairing_allowed = false;
bool config_mode = false;
uint8_t incoming_buffer[LAYOUT_BYTES];

// PCB v3 - working pins
byte row_pins[NUM_ROWS] = {15, 23, 4, 16};
byte col_pins[NUM_COLS] = {32, 33, 25, 26, 27, 14, 12, 13, 19, 18, 5, 17};

byte layout[NUM_LAYOUT_LEVELS][NUM_ROWS][NUM_COLS] = {
  {
    {K_TAB, 0x71, 0x77, 0x66, 0x70, 0x62, 0x6A, 0x6C, 0x75, 0x79, 0x2D, K_BKS},
    {K_ESC, 0x61, 0x72, 0x73, 0x74, 0x67, 0x6B, 0x6E, 0x65, 0x69, 0x6F, K_ETR},
    {K_S_L, 0x7A, 0x78, 0x63, 0x76, 0x64, 0x6D, 0x68, 0x2C, 0x2E, 0x22, K_S_R},
    {K_C_L, 0x5D, K_G_L, K_A_L, HIGHR, 0x20, 0x3B, 0x7B, 0x28, 0x5B, 0x3D, 0x2F}
  },
  {
    {0x60, K_INS, K_DEL, K_HOM, K_END, K_PUP, K_PDN, 0x37, 0x38, 0x39, 0x5C, K_BKS},
    {K_ESC, 0x60, K_F04, K_F05, K_F06, K_NON, K_NON, 0x34, 0x35, 0x36, 0x27, K_ETR},
    {K_S_L, K_NON, K_NON, K_NON, BATLV, K_NON, K_NON, 0x31, 0x32, 0x33, K_AUP, K_S_R},
    {K_C_L, K_NON, K_G_L, K_A_L, HIGHR, 0x20, CTALD, K_CPS, 0x30, K_LFT, K_DWN, K_RHT}
  }
};

// layout_mod[level][row][col] = modifier keycode to hold while pressing the key
// 0x00 = no modifier; 0x80-0x87 = K_C_L/K_S_L/K_A_L/K_G_L/K_C_R/K_S_R/K_A_R/K_G_R
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

void setup() {
  pinMode(BATTERY_GAUGE_PIN, INPUT);
  pinMode(LED_BATTERY_PIN_L, OUTPUT);
  pinMode(LED_BATTERY_PIN_R, OUTPUT);
  init_battery_optimisations();
  keyboard.begin();
  load_layout_from_nvs();
  init_ble_config_service();
  get_battery_percent();
  lastBatteryUpdateTime = millis();
  Serial.begin(9600);
  Serial.println("Started.");

  turn_leds_on_for(LEDS_DURATION_MS);
}

void loop() {
  scan_switches();
  check_pairing_combo();
  if (!config_mode && keyboard.isConnected()) {
    process_keys();
    if (millis() - lastBatteryUpdateTime >= BATTERY_UPDATE_INTERVAL_MS) {
      get_battery_percent();
      lastBatteryUpdateTime = millis();
    }
  }
  tick_battery_leds();

  delay(DEBOUNCE_DELAY);
}

int get_battery_percent() {
  float batteryInput = analogRead(BATTERY_GAUGE_PIN);
  float input_voltage = (batteryInput * 4.2) / 4095.0;
  int input_voltage_millivolts = input_voltage * 1000;
  int battery_percentage = round(map(input_voltage_millivolts, 3300, 4200, 0, 100));
  //Serial.println((String)"bat input: " + batteryInput + (String)"; battery voltage [0-4.2V]: " + input_voltage + (String)"; % [0-100]: " + battery_percentage);
  keyboard.setBatteryLevel(battery_percentage);
  return battery_percentage;
}

void turn_leds_on_for(int millisOn) {
  if (millisOn < 0) { return; }
  ledsOn = true;
  ledsOnEndTime = millis() + millisOn;
  digitalWrite(LED_BATTERY_PIN_L, HIGH);
  digitalWrite(LED_BATTERY_PIN_R, HIGH);
}

void tick_battery_leds() {
  if (ledsForcedOn) return;
  if (ledsOn && (ledsOnEndTime < millis())) {
    digitalWrite(LED_BATTERY_PIN_L, LOW);
    digitalWrite(LED_BATTERY_PIN_R, LOW);
    ledsOn = false;
  }
}

bool is_pairing_combo_key(byte row, byte col) {
  if (col != PAIRING_COMBO_COL) return false;
  for (byte i = 0; i < PAIRING_COMBO_SIZE; i++)
    if (PAIRING_COMBO_ROWS[i] == row) return true;
  return false;
}

// Hold the top 3 keys of the leftmost column simultaneously to open pairing.
// LEDs stay on while the combo is held as a visual indicator.
// Keypresses from the combo keys are suppressed in process_keys() while
// pairing_allowed is true, so nothing reaches the host.
void check_pairing_combo() {
  bool combo = true;
  for (byte i = 0; i < PAIRING_COMBO_SIZE; i++)
    if (!pressed_switches[PAIRING_COMBO_ROWS[i]][PAIRING_COMBO_COL]) { combo = false; break; }
  if (combo == pairing_allowed) return;

  pairing_allowed = combo;
  if (pairing_allowed) {
    keyboard.releaseAll();
    memset(key_states, false, sizeof(key_states));
  }
  keyboard.set_pairing_mode(pairing_allowed);

  ledsForcedOn = pairing_allowed;
  digitalWrite(LED_BATTERY_PIN_L, pairing_allowed ? HIGH : LOW);
  digitalWrite(LED_BATTERY_PIN_R, pairing_allowed ? HIGH : LOW);
  ledsOn = false;
}

void scan_switches() {
  // reinitialise the column pins to allow sharing with other hardware
  for (byte col = 0; col < NUM_COLS; col++) {
    pinMode(col_pins[col], INPUT_PULLUP);
  }

  for (byte row = 0; row < NUM_ROWS; row++) {
    pinMode(row_pins[row], OUTPUT);
    digitalWrite(row_pins[row], LOW);

    for (byte col = 0; col < NUM_COLS; col++) {
      // reading low at the column means key is pressed
      bool is_pressed = !digitalRead(col_pins[col]);
      pressed_switches[row][col] = is_pressed;
    }
    // return the row to high
    digitalWrite(row_pins[row], HIGH);
    // stop treating as output
    pinMode(row_pins[row], INPUT);
  }
}

void init_battery_optimisations() {
  setCpuFrequencyMhz(80);
  //adc_power_off();
  esp_wifi_stop();
}

void process_keys() {
  for (byte row = 0; row < NUM_ROWS; row++) {
    for (byte col = 0; col < NUM_COLS; col++) {
      if (pairing_allowed && is_pairing_combo_key(row, col)) {
        // Keep key_states in sync so combo keys don't generate spurious
        // press/release events when the user slowly lets go of the combo.
        key_states[row][col] = pressed_switches[row][col];
        continue;
      }
      bool is_pressed_state = pressed_switches[row][col];
      if (is_pressed_state) {
        if (!key_states[row][col]) {
          press_key(row, col);
        }
      } else {
        if (key_states[row][col]) {
          release_key(row, col);
        }
      }
    }
  }
}

void press_key(byte row, byte col) {
  key_states[row][col] = true;
  byte keycode = get_layout_code(row, col);
  byte mod = layout_mod[layout_level][row][col];
  bool is_normal_key = keycode < FIRST_META_KEY;
  if (is_normal_key) {
    if (mod) keyboard.press(mod);
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
  byte mod = layout_mod[layout_level][row][col];
  bool is_normal_key = keycode < FIRST_META_KEY;
  if (is_normal_key) {
    keyboard.release(keycode);
    if (mod) keyboard.release(mod);
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

class ReadLayoutCallback : public BLECharacteristicCallbacks {
  void onRead(BLECharacteristic* pChar) override {
    uint8_t buf[LAYOUT_BYTES];
    get_layout_bytes(buf);
    pChar->setValue(buf, LAYOUT_BYTES);
  }
};

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
        apply_and_save_layout(incoming_buffer);
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

  BLECharacteristic* pReadChar = pConfigService->createCharacteristic(
    READ_LAYOUT_CHAR_UUID, BLECharacteristic::PROPERTY_READ);
  pReadChar->setCallbacks(new ReadLayoutCallback());

  BLECharacteristic* pControlChar = pConfigService->createCharacteristic(
    CONTROL_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
  pControlChar->setCallbacks(new ControlCallback());

  BLECharacteristic* pDataChar = pConfigService->createCharacteristic(
    DATA_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
  pDataChar->setCallbacks(new DataCallback());

  pConfigService->start();
}

/*
 * Get the keycode from the layout array for the current level.
 */
byte get_layout_code(byte row, byte col) {
  return layout[layout_level][row][col];
}
