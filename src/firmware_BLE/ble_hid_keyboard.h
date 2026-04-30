#pragma once
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLEHIDDevice.h>
#include <BLESecurity.h>
#include <HIDTypes.h>
#include <esp_gap_ble_api.h>

#define HID_KEYBOARD_APPEARANCE 0x03C1

// Standard keyboard HID report descriptor (Report ID 1, 8-byte report)
static const uint8_t _hidReportDescriptor[] = {
  0x05, 0x01,  // Usage Page (Generic Desktop Ctrls)
  0x09, 0x06,  // Usage (Keyboard)
  0xA1, 0x01,  // Collection (Application)
  0x85, 0x01,  //   Report ID (1)
  0x05, 0x07,  //   Usage Page (Kbrd/Keypad)
  0x19, 0xE0,  //   Usage Minimum (0xE0 Left Ctrl)
  0x29, 0xE7,  //   Usage Maximum (0xE7 Right GUI)
  0x15, 0x00,  //   Logical Minimum (0)
  0x25, 0x01,  //   Logical Maximum (1)
  0x75, 0x01,  //   Report Size (1)
  0x95, 0x08,  //   Report Count (8)
  0x81, 0x02,  //   Input (Data,Var,Abs) -- modifier byte
  0x95, 0x01,  //   Report Count (1)
  0x75, 0x08,  //   Report Size (8)
  0x81, 0x01,  //   Input (Const) -- reserved byte
  0x95, 0x06,  //   Report Count (6)
  0x75, 0x08,  //   Report Size (8)
  0x15, 0x00,  //   Logical Minimum (0)
  0x25, 0x65,  //   Logical Maximum (101)
  0x05, 0x07,  //   Usage Page (Kbrd/Keypad)
  0x19, 0x00,  //   Usage Minimum (0x00)
  0x29, 0x65,  //   Usage Maximum (0x65)
  0x81, 0x00,  //   Input (Data,Array) -- 6-key array
  0xC0,        // End Collection
};

// ASCII (0x00-0x7F) to HID keycode.
// High bit set (0x80): Left Shift modifier needed.
// Low 7 bits: HID usage ID (0 = unmapped).
static const uint8_t _asciimap[128] = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 00-07
  0x2A,                                            // 08 BS → Backspace
  0x2B,                                            // 09 HT → Tab
  0x28,                                            // 0A LF → Enter
  0x00, 0x00,                                      // 0B-0C
  0x28,                                            // 0D CR → Enter
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00,             // 0E-13
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00,             // 14-19
  0x00,                                            // 1A
  0x29,                                            // 1B ESC → Escape
  0x00, 0x00, 0x00, 0x00,                          // 1C-1F
  0x2C,        // 20 Space
  0x9E,        // 21 !   Shift+1
  0xB4,        // 22 "   Shift+'
  0xA0,        // 23 #   Shift+3
  0xA1,        // 24 $   Shift+4
  0xA2,        // 25 %   Shift+5
  0xA4,        // 26 &   Shift+7
  0x34,        // 27 '
  0xA6,        // 28 (   Shift+9
  0xA7,        // 29 )   Shift+0
  0xA5,        // 2A *   Shift+8
  0xAE,        // 2B +   Shift+=
  0x36,        // 2C ,
  0x2D,        // 2D -
  0x37,        // 2E .
  0x38,        // 2F /
  0x27,        // 30 0
  0x1E,        // 31 1
  0x1F,        // 32 2
  0x20,        // 33 3
  0x21,        // 34 4
  0x22,        // 35 5
  0x23,        // 36 6
  0x24,        // 37 7
  0x25,        // 38 8
  0x26,        // 39 9
  0xB3,        // 3A :   Shift+;
  0x33,        // 3B ;
  0xB6,        // 3C <   Shift+,
  0x2E,        // 3D =
  0xB7,        // 3E >   Shift+.
  0xB8,        // 3F ?   Shift+/
  0x9F,        // 40 @   Shift+2
  0x84,        // 41 A   Shift+a
  0x85,        // 42 B
  0x86,        // 43 C
  0x87,        // 44 D
  0x88,        // 45 E
  0x89,        // 46 F
  0x8A,        // 47 G
  0x8B,        // 48 H
  0x8C,        // 49 I
  0x8D,        // 4A J
  0x8E,        // 4B K
  0x8F,        // 4C L
  0x90,        // 4D M
  0x91,        // 4E N
  0x92,        // 4F O
  0x93,        // 50 P
  0x94,        // 51 Q
  0x95,        // 52 R
  0x96,        // 53 S
  0x97,        // 54 T
  0x98,        // 55 U
  0x99,        // 56 V
  0x9A,        // 57 W
  0x9B,        // 58 X
  0x9C,        // 59 Y
  0x9D,        // 5A Z
  0x2F,        // 5B [
  0x31,        // 5C backslash
  0x30,        // 5D ]
  0xA3,        // 5E ^   Shift+6
  0xAD,        // 5F _   Shift+-
  0x35,        // 60 `
  0x04,        // 61 a
  0x05,        // 62 b
  0x06,        // 63 c
  0x07,        // 64 d
  0x08,        // 65 e
  0x09,        // 66 f
  0x0A,        // 67 g
  0x0B,        // 68 h
  0x0C,        // 69 i
  0x0D,        // 6A j
  0x0E,        // 6B k
  0x0F,        // 6C l
  0x10,        // 6D m
  0x11,        // 6E n
  0x12,        // 6F o
  0x13,        // 70 p
  0x14,        // 71 q
  0x15,        // 72 r
  0x16,        // 73 s
  0x17,        // 74 t
  0x18,        // 75 u
  0x19,        // 76 v
  0x1A,        // 77 w
  0x1B,        // 78 x
  0x1C,        // 79 y
  0x1D,        // 7A z
  0xAF,        // 7B {   Shift+[
  0xB1,        // 7C |   Shift+backslash
  0xB0,        // 7D }   Shift+]
  0xB5,        // 7E ~   Shift+`
  0x00,        // 7F DEL
};

class BleKeyboard : public BLEServerCallbacks {
public:
  BLEServer* pServer;

private:
  const char*        _name;
  const char*        _manufacturer;
  uint8_t            _batteryLevel;
  BLEHIDDevice*      _hid;
  BLECharacteristic* _input;
  bool               _connected;
  bool               _pairing_mode;
  uint8_t            _report[8]; // [modifier, reserved, k0..k5]

  // Rebuild the GAP whitelist from NVS-stored bonds so bonded devices can
  // reconnect without the pairing combo.
  void _rebuild_whitelist() {
    esp_ble_gap_clear_whitelist();
    int count = esp_ble_get_bond_device_num();
    if (count == 0) return;
    esp_ble_bond_dev_t* list = new esp_ble_bond_dev_t[count];
    esp_ble_get_bond_device_list(&count, list);
    for (int i = 0; i < count; i++) {
      esp_ble_gap_update_whitelist(true, list[i].bd_addr, BLE_WL_ADDR_TYPE_PUBLIC);
    }
    delete[] list;
  }

  // Handles completion of a new bond: rebuild the whitelist so the newly
  // bonded device can reconnect without the pairing combo in future.
  class SecCallbacks : public BLESecurityCallbacks {
    BleKeyboard* _kb;
  public:
    SecCallbacks(BleKeyboard* kb) : _kb(kb) {}
    void onAuthenticationComplete(esp_ble_auth_cmpl_t cmpl) override {
      if (cmpl.success) _kb->_rebuild_whitelist();
    }
    bool     onSecurityRequest()            override { return true; }
    uint32_t onPassKeyRequest()             override { return 0; }
    void     onPassKeyNotify(uint32_t)      override {}
    bool     onConfirmPIN(uint32_t)         override { return true; }
  };

  void onConnect(BLEServer* /*server*/) override {
    _connected = true;
  }

  void onDisconnect(BLEServer* /*server*/) override {
    _connected = false;
    // Restart advertising; the filter set by set_pairing_mode() is preserved
    // in the BLEAdvertising object across stop/start.
    pServer->getAdvertising()->start();
  }

public:
  BleKeyboard(const char* name = "BLE Keyboard",
              const char* manufacturer = "Arduino",
              uint8_t     batteryLevel = 100)
    : pServer(nullptr), _name(name), _manufacturer(manufacturer),
      _batteryLevel(batteryLevel), _hid(nullptr), _input(nullptr),
      _connected(false), _pairing_mode(false)
  {
    memset(_report, 0, sizeof(_report));
  }

  // Open or close pairing to new devices.
  // While closed only the GAP whitelist (bonded devices) can connect.
  void set_pairing_mode(bool allow) {
    _pairing_mode = allow;
    BLEAdvertising* pAdv = pServer->getAdvertising();
    pAdv->stop();
    // connectWhitelistOnly = !allow: bonded devices always reconnect freely;
    // new devices only get through when pairing is explicitly opened.
    pAdv->setScanFilter(false, !allow);
    pAdv->start();
  }

  void begin() {
    BLEDevice::init(_name);
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(this);

    _hid   = new BLEHIDDevice(pServer);
    _input = _hid->inputReport(1);

    _hid->manufacturer()->setValue(std::string(_manufacturer));
    _hid->pnp(0x02, 0xe502, 0xa111, 0x0210);
    _hid->hidInfo(0x00, 0x01);

    BLESecurity* pSecurity = new BLESecurity();
    pSecurity->setAuthenticationMode(ESP_LE_AUTH_BOND);
    pSecurity->setCapability(ESP_IO_CAP_NONE);
    pSecurity->setInitEncryptionKey(ESP_BLE_ENC_KEY_MASK | ESP_BLE_ID_KEY_MASK);
    BLEDevice::setSecurityCallbacks(new SecCallbacks(this));

    _hid->reportMap((uint8_t*)_hidReportDescriptor, sizeof(_hidReportDescriptor));
    _hid->startServices();
    _hid->setBatteryLevel(_batteryLevel);

    // Populate whitelist from any bonds already stored in NVS, then start
    // advertising locked: only whitelisted (bonded) devices can connect
    // until the pairing combo is held.
    _rebuild_whitelist();

    BLEAdvertising* pAdv = pServer->getAdvertising();
    pAdv->setAppearance(HID_KEYBOARD_APPEARANCE);
    pAdv->addServiceUUID(_hid->hidService()->getUUID());
    pAdv->setScanFilter(false, true); // whitelist-only connections at startup
    pAdv->start();
  }

  bool isConnected() { return _connected; }

  void setBatteryLevel(uint8_t level) {
    _batteryLevel = level;
    if (_hid) _hid->setBatteryLevel(level);
  }

  void press(uint8_t k) {
    if (k >= 0x88) {
      // Special key: offset maps exactly to HID usage
      _addKey(k - 0x88);
    } else if (k >= 0x80) {
      // Modifier key: bit position = k - 0x80
      _report[0] |= (1 << (k - 0x80));
    } else {
      // ASCII: look up translation table
      uint8_t entry = _asciimap[k];
      if (!entry) return;
      if (entry & 0x80) _report[0] |= 0x02; // Left Shift
      _addKey(entry & 0x7F);
    }
    _send();
  }

  void release(uint8_t k) {
    if (k >= 0x88) {
      _removeKey(k - 0x88);
    } else if (k >= 0x80) {
      _report[0] &= ~(1 << (k - 0x80));
    } else {
      uint8_t entry = _asciimap[k];
      if (!entry) return;
      if (entry & 0x80) _report[0] &= ~0x02;
      _removeKey(entry & 0x7F);
    }
    _send();
  }

  void releaseAll() {
    memset(_report, 0, sizeof(_report));
    _send();
  }

private:
  void _addKey(uint8_t hid) {
    for (int i = 2; i < 8; i++) {
      if (_report[i] == hid) return; // already held
      if (_report[i] == 0)  { _report[i] = hid; return; }
    }
    // 6-key rollover: silently drop if full
  }

  void _removeKey(uint8_t hid) {
    for (int i = 2; i < 8; i++) {
      if (_report[i] != hid) continue;
      // compact: shift remaining keys left
      for (int j = i; j < 7; j++) _report[j] = _report[j + 1];
      _report[7] = 0;
      return;
    }
  }

  void _send() {
    if (!_connected || !_input) return;
    _input->setValue(_report, sizeof(_report));
    _input->notify();
  }
};
