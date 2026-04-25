#pragma once
#include <Preferences.h>

// 2 layers * 4 rows * 12 cols * 2 bytes/key
#define LAYOUT_BYTES 192

// Resolved against the arrays defined in the main sketch
extern byte layout[2][4][12];
extern byte layout_mod[2][4][12];

static inline uint8_t _nvs_crc(uint8_t* buf, size_t len) {
  uint8_t crc = 0;
  for (size_t i = 0; i < len; i++) crc ^= buf[i];
  return crc;
}

static inline void _nvs_serialize(uint8_t* buf) {
  int idx = 0;
  for (int l = 0; l < 2; l++)
    for (int r = 0; r < 4; r++)
      for (int c = 0; c < 12; c++) {
        buf[idx++] = layout[l][r][c];
        buf[idx++] = layout_mod[l][r][c];
      }
}

static inline void _nvs_deserialize(uint8_t* buf) {
  int idx = 0;
  for (int l = 0; l < 2; l++)
    for (int r = 0; r < 4; r++)
      for (int c = 0; c < 12; c++) {
        layout[l][r][c]     = buf[idx++];
        layout_mod[l][r][c] = buf[idx++];
      }
}

inline void save_layout_to_nvs() {
  uint8_t buf[LAYOUT_BYTES];
  _nvs_serialize(buf);
  uint8_t crc = _nvs_crc(buf, LAYOUT_BYTES);

  Preferences prefs;
  prefs.begin("keyboard", false);
  prefs.putBytes("layout", buf, LAYOUT_BYTES);
  prefs.putUChar("crc", crc);
  prefs.end();
}

inline void load_layout_from_nvs() {
  Preferences prefs;
  prefs.begin("keyboard", true);
  uint8_t buf[LAYOUT_BYTES];
  size_t len = prefs.getBytes("layout", buf, LAYOUT_BYTES);
  uint8_t stored_crc = prefs.getUChar("crc", 0xFF);
  prefs.end();

  if (len != LAYOUT_BYTES) return;
  if (_nvs_crc(buf, LAYOUT_BYTES) != stored_crc) return;

  _nvs_deserialize(buf);
}

inline void apply_and_save_layout(uint8_t* incoming) {
  _nvs_deserialize(incoming);
  save_layout_to_nvs();
}
