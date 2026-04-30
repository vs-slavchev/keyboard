# Custom BLE keyboard

A handwired 4×12 ortholinear keyboard built around an ESP32 WROOM module.
Keys are remappable wirelessly via a browser-based webapp — no reflashing required.

## Repository layout

```
src/firmware_BLE/   Arduino sketch (ESP32 BLE HID keyboard)
webapp/             Browser webapp for wireless key remapping
svg/                Laser-cutter paths for the case
3D_models/          3D-printable case parts, switch plate, keycaps
```

## Firmware

### Dependencies

- **Arduino IDE** with the **ESP32 board package** (tested on 2.0.x and 3.x)
- No external libraries — BLE HID is implemented directly in `ble_hid_keyboard.h`

### Flash

Open `src/firmware_BLE/firmware_BLE.ino` in the Arduino IDE, select board
**ESP32 Dev Module**, and upload. First flash must be done over USB; all
subsequent key layout changes are wireless.

### Layout storage

The key layout is stored in ESP32 NVS (non-volatile storage) and survives
power cycles. If no valid layout is found on boot the compiled-in default
(Colemak-based Emerald layout) is used.

## Webapp — wireless key remapper

Open `webapp/index.html` in **Chrome or Edge** (Web Bluetooth required).

### How to remap keys

1. **Power on** the keyboard.
2. **Pair** *(first time or new device only)*
   Hold **all 4 keys of the leftmost column** simultaneously until the LEDs
   light up. The keyboard is now discoverable. Pair, then release the keys. 
3. **Connect** — click **Connect** in the webapp and select your keyboard from
   the browser popup.
   On first connection the webapp reads the current layout directly from the
   keyboard so you always start from the actual configuration.
4. **Remap** — click any key on the grid to open the key picker. Search or
   browse by group. The current assignment is highlighted.
5. **Save** — click **Save to Keyboard**. The layout is sent over BLE and
   written to NVS. Modified keys are shown with an amber border until saved.

### Presets

The preset selector loads one of four built-in starting points (Emerald,
QWERTY, Dvorak, Colemak) into the editor without touching the keyboard — useful
as a starting point before customising and saving.

### Browser support

| Browser | OS | Status |
|---|---|---|
| Chrome / Edge | Windows, macOS, Android | ✓ supported |
| Chrome | Linux | requires `chrome://flags/#enable-experimental-web-platform-features` |
| Firefox | any | ✗ no Web Bluetooth |
| Safari | any | ✗ no Web Bluetooth |
| Any | iOS | ✗ no Web Bluetooth on iOS |

## Security — pairing gate

By default the keyboard only allows connections from previously bonded devices.
New devices can only pair while **all 4 keys of the leftmost column are held** (LEDs on).
This prevents anyone nearby from silently pairing and remapping keys.

- Already-bonded devices (your PC, your phone running the webapp) reconnect
  automatically on every power-on — no combo needed.
- To add a new device later, hold the combo again.
- To remove all bonds, reflash the firmware (or clear NVS via the Arduino
  `Preferences` library).

## Hardware

- **MCU**: ESP32 WROOM-32
- **Matrix**: 4 rows × 12 columns (48 keys)
- **Row pins**: 15, 23, 4, 16
- **Col pins**: 32, 33, 25, 26, 27, 14, 12, 13, 19, 18, 5, 17
- **Battery gauge**: pin 35 (ADC, voltage divider to Li-Po cell)
- **Battery LEDs**: pins 22 (left), 21 (right)

Press the **Fn key** (row 3, col 4) to access layer 2: navigation cluster,
number row, function keys, and Ctrl+Alt+Del.

## Blog posts

- https://vslavchev.blogspot.com/2019/06/keyboard-figuring-out-what-to-do.html
- https://vslavchev.blogspot.com/2019/06/keyboard-detecting-keys.html
