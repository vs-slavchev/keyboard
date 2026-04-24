#include <BleKeyboard.h>
#include <esp_wifi.h>
#include "driver/adc.h"

// symbols
#define K_SPC 0x20 //space
#define K_DQO 0x22 //"
#define K_SQO 0x27 //'
#define K_OPR 0x28 //(
#define K_CPR 0x29 //)
#define K_CMA 0x2C //,
#define K_MIN 0x2D //-
#define K_DOT 0x2E
#define K_FSL 0x2F //forward slash
#define K_SCL 0x3B //;
#define K_EQU 0x3D //=
#define K_OSB 0x5B //[
#define K_CSB 0x5D //]
#define K_BSL 0x5C //backslash
#define K_OCB 0x7B //{
#define K_CCB 0x7D //}
#define K_BTK 0x60 //`backtick

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
#define K_RHT 0xD7 //right arrow
#define K_LFT 0xD8 //left arrow
#define K_DWN 0xD9 //down arrow
#define K_AUP 0xDA //up arrow
#define K_CPS 0xC1 //caps lock
#define K_INS 0xD1 //insert
#define K_DEL 0xD4 //delete
#define K_HOM 0xD2 //home
#define K_END 0xD5
#define K_PUP 0xD3 //page up
#define K_PDN 0xD6 //page down
#define K_F04 0xC5
#define K_F05 0xC6
#define K_F06 0xC7

// meta
#define K_NON 0x00
#define FIRST_META_KEY 0xF0
#define CTALD 0xF1 //Ctrl Alt Delete
#define BATLV 0xF2 //battery level
#define HIGHR 0xFF

#define BATTERY_GAUGE_PIN 35
#define LED_BATTERY_PIN_L 22
#define LED_BATTERY_PIN_R 21

#define DEBOUNCE_DELAY 15
#define LEDS_DURATION_MS 300
#define BATTERY_UPDATE_INTERVAL_MS 60000

BleKeyboard keyboard("Изумруд", "Vesi", 100);

const byte NUM_ROWS = 4;
const byte NUM_COLS = 12;
const byte NUM_LAYOUT_LEVELS = 2;
byte layout_level = 0;

bool ledsOn = false;
unsigned long ledsOnEndTime;
unsigned long lastBatteryUpdateTime = 0;

// PCB v3 - working pins
byte row_pins[NUM_ROWS] = {15, 23, 4, 16};
byte col_pins[NUM_COLS] = {32, 33, 25, 26, 27, 14, 12, 13, 19, 18, 5, 17};

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
  Serial.begin(9600);
  Serial.println("Started.");

  turn_leds_on_for(LEDS_DURATION_MS);
}

void loop() {
  scan_switches();
  if (keyboard.isConnected()) {
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
  if (ledsOn && (ledsOnEndTime < millis())) {
    digitalWrite(LED_BATTERY_PIN_L, LOW);
    digitalWrite(LED_BATTERY_PIN_R, LOW);
    ledsOn = false;
  }
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
  bool is_normal_key = get_layout_code(row, col) < FIRST_META_KEY;
  if (is_normal_key) {
    keyboard.press(get_layout_code(row, col));
  } else {
    switch (get_layout_code(row, col)) {
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
  bool is_normal_key = get_layout_code(row, col) < FIRST_META_KEY;
  if (is_normal_key) {
    keyboard.release(get_layout_code(row, col));
  } else {
    switch (get_layout_code(row, col)) {
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

/*
 * Get the keycode from the layout array for the current level.
 */
byte get_layout_code(byte row, byte col) {
  return layout[layout_level][row][col];
}
