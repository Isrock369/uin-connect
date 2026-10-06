// ============================================================
//  KAMERA SETORAN - ESP32-CAM (AI Thinker) + kamera RHYX M21-45 (GC2145)
//
//  Cara kerja:
//   1. Santri menekan "Kirim Setoran" di Portal -> backend mencatat "minta foto".
//   2. Kamera ini bertanya ke backend tiap ~0,8 detik: "ada tugas foto?"
//   3. Kalau ada, kamera memotret (RGB565 -> JPEG di ESP32) lalu mengunggahnya.
//   4. Admin melihat foto itu di halaman Verifikasi Setoran.
//
//  Kamera ini juga punya halaman pratinjau (http://IP-kamera/) untuk
//  mengatur sudut dan jarak kamera. Alamat IP muncul di Serial Monitor.
//
//  Pengaturan Arduino IDE (menu Tools):
//    Board            : AI Thinker ESP32-CAM
//    PSRAM            : Enabled  (WAJIB)
//    Partition Scheme : Huge APP (3MB No OTA/1MB SPIFFS)
//    Upload Speed     : 115200
// ============================================================
#include "esp_camera.h"
#include "img_converters.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WebServer.h>

// ---------- ISI BAGIAN INI (sudah terisi sesuai punyamu) ----------
const char* WIFI_SSID = "Isrock";                                // hotspot HP (2.4 GHz)
const char* WIFI_PASS = "jancuklu";
const char* API_HOST  = "uin-connect-production.up.railway.app"; // domain Railway, TANPA https://
const char* KUNCI_PERANGKAT = "kunciRahasia48xk2m";              // sama dengan TIMBANGAN_KEY di Railway
// ------------------------------------------------------------------

#define KUALITAS_JPEG    75      // 0-100, makin besar makin tajam tapi makin berat dikirim
#define POLL_MS          800     // seberapa sering menanyakan tugas foto ke server
#define LAMPU_SAAT_FOTO  false   // true = lampu flash putih menyala sebentar saat memotret

// Pin kamera untuk ESP32-CAM AI Thinker
#define PWDN_GPIO_NUM   32
#define RESET_GPIO_NUM  -1
#define XCLK_GPIO_NUM    0
#define SIOD_GPIO_NUM   26
#define SIOC_GPIO_NUM   27
#define Y9_GPIO_NUM     35
#define Y8_GPIO_NUM     34
#define Y7_GPIO_NUM     39
#define Y6_GPIO_NUM     36
#define Y5_GPIO_NUM     21
#define Y4_GPIO_NUM     19
#define Y3_GPIO_NUM     18
#define Y2_GPIO_NUM      5
#define VSYNC_GPIO_NUM  25
#define HREF_GPIO_NUM   23
#define PCLK_GPIO_NUM   22
#define PIN_LAMPU        4   // lampu flash putih di badan ESP32-CAM

WebServer server(80);
WiFiClientSecure klien;
HTTPClient http;

bool kameraSiap = false;
unsigned long terakhirCek = 0;
unsigned long tundaSampai = 0;
unsigned long terakhirWifi = 0;
int gagalBerturut = 0;

// ---------------- kamera ----------------
bool mulaiKamera() {
  camera_config_t c;
  memset(&c, 0, sizeof(c));
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer   = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM;  c.pin_d1 = Y3_GPIO_NUM;
  c.pin_d2 = Y4_GPIO_NUM;  c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM;  c.pin_d5 = Y7_GPIO_NUM;
  c.pin_d6 = Y8_GPIO_NUM;  c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk  = XCLK_GPIO_NUM;
  c.pin_pclk  = PCLK_GPIO_NUM;
  c.pin_vsync = VSYNC_GPIO_NUM;
  c.pin_href  = HREF_GPIO_NUM;
#if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
  c.pin_sccb_sda = SIOD_GPIO_NUM;
  c.pin_sccb_scl = SIOC_GPIO_NUM;
#else
  c.pin_sscb_sda = SIOD_GPIO_NUM;
  c.pin_sscb_scl = SIOC_GPIO_NUM;
#endif
  c.pin_pwdn  = PWDN_GPIO_NUM;
  c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 20000000;
  c.pixel_format = PIXFORMAT_RGB565;     // GC2145 tidak mendukung JPEG langsung

  if (psramFound()) {
    c.frame_size   = FRAMESIZE_VGA;      // 640x480
    c.jpeg_quality = 12;                 // tidak dipakai di mode RGB565
    c.fb_count     = 2;
    c.fb_location  = CAMERA_FB_IN_PSRAM;
    c.grab_mode    = CAMERA_GRAB_LATEST;
  } else {
    Serial.println("PERINGATAN: PSRAM tidak terdeteksi, resolusi diturunkan.");
    Serial.println("Aktifkan PSRAM di menu Tools bila ada pilihannya.");
    c.frame_size   = FRAMESIZE_QQVGA;    // 160x120
    c.jpeg_quality = 15;
    c.fb_count     = 1;
    c.fb_location  = CAMERA_FB_IN_DRAM;
  }

  esp_err_t err = esp_camera_init(&c);
  if (err != ESP_OK) {
    Serial.printf("GAGAL menyalakan kamera, kode: 0x%x\n", err);
    if (err == 0x105) {
      Serial.println("-> Kamera tidak terdeteksi. Cek pita kabel kamera.");
    } else if (err == 0x106) {
      Serial.println("-> Sensor tidak didukung. Update core 'esp32 by Espressif'.");
    } else {
      Serial.println("-> Cabut-colok USB, pastikan board 'AI Thinker ESP32-CAM', PSRAM Enabled, dan daya cukup.");
    }
    return false;
  }

  sensor_t* s = esp_camera_sensor_get();
  if (s) {
    Serial.printf("Sensor terdeteksi, PID: 0x%04x %s\n", s->id.PID,
                  s->id.PID == 0x2145 ? "(GC2145, sesuai M21-45)" : "(bukan GC2145, cek modul kamera)");
    s->set_vflip(s, 0);       // ubah ke 1 kalau gambar terbalik atas-bawah
    s->set_hmirror(s, 0);     // ubah ke 1 kalau gambar terbalik kiri-kanan
  }
  return true;
}

// Ambil satu foto dan ubah jadi JPEG. Hasilnya (jpg) harus di-free() oleh pemanggil.
bool ambilFotoJpeg(uint8_t** jpg, size_t* len) {
  *jpg = nullptr;
  *len = 0;
  // Buang 1 frame lama supaya gambar sesuai kondisi saat ini
  camera_fb_t* lama = esp_camera_fb_get();
  if (lama) esp_camera_fb_return(lama);
  delay(60);

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) return false;
  bool ok = frame2jpg(fb, KUALITAS_JPEG, jpg, len);
  esp_camera_fb_return(fb);
  return ok && *jpg != nullptr && *len > 0;
}

// ---------------- komunikasi ke backend ----------------
String urlApi(const char* path) {
  return String("https://") + API_HOST + path;
}

// Tanya backend: adakah tugas foto? Mengembalikan id setoran, atau -1 kalau tidak ada / gagal.
long cekTugas() {
  static bool pernahOk = false;
  http.setTimeout(5000);
  if (!http.begin(klien, urlApi("/api/kamera/tugas"))) return -1;
  http.addHeader("X-Device-Key", KUNCI_PERANGKAT);
  int kode = http.GET();

  long id = -1;
  if (kode == 200) {
    if (!pernahOk || gagalBerturut > 0) {
      Serial.println("Tersambung ke server. Menunggu tugas foto...");
      pernahOk = true;
    }
    gagalBerturut = 0;
    String isi = http.getString();
    if (isi.indexOf("\"ada\":true") >= 0) {
      int p = isi.indexOf("\"setoranId\":");
      if (p >= 0) id = isi.substring(p + 12).toInt();
    }
  } else {
    gagalBerturut++;
    Serial.printf("Cek tugas gagal, kode: %d\n", kode);
    if (kode == 401) Serial.println("-> Kunci salah. KUNCI_PERANGKAT harus sama dengan TIMBANGAN_KEY di Railway.");
    if (gagalBerturut >= 3) tundaSampai = millis() + 3000;   // jeda dulu kalau server bermasalah
  }
  http.end();
  return id;
}

bool kirimFoto(long id, uint8_t* jpg, size_t len) {
  for (int percobaan = 1; percobaan <= 3; percobaan++) {
    http.setTimeout(15000);
    if (http.begin(klien, urlApi("/api/kamera/foto?setoranId=") + String(id))) {
      http.addHeader("Content-Type", "image/jpeg");
      http.addHeader("X-Device-Key", KUNCI_PERANGKAT);
      int kode = http.POST(jpg, len);
      http.end();
      if (kode == 200) return true;
      Serial.printf("Kirim foto gagal (percobaan %d), kode: %d\n", percobaan, kode);
    }
    delay(400);
  }
  return false;
}

void prosesTugas(long id) {
  Serial.printf("Tugas foto untuk setoran #%ld\n", id);
  unsigned long mulai = millis();

  if (LAMPU_SAAT_FOTO) { digitalWrite(PIN_LAMPU, HIGH); delay(250); }
  uint8_t* jpg = nullptr;
  size_t len = 0;
  bool ok = ambilFotoJpeg(&jpg, &len);
  if (LAMPU_SAAT_FOTO) digitalWrite(PIN_LAMPU, LOW);

  if (!ok) {
    Serial.println("Gagal memotret / mengubah ke JPEG.");
    if (jpg) free(jpg);
    return;
  }
  Serial.printf("Foto siap: %u byte, mengirim...\n", (unsigned)len);
  bool terkirim = kirimFoto(id, jpg, len);
  free(jpg);
  Serial.printf(terkirim ? "Foto terkirim (%lu ms)\n" : "Foto GAGAL terkirim (%lu ms)\n", millis() - mulai);
}

// ---------------- halaman pratinjau (untuk mengatur sudut kamera) ----------------
const char HALAMAN[] PROGMEM = R"HTML(
<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pratinjau Kamera</title>
<style>
 body{font-family:sans-serif;max-width:720px;margin:16px auto;padding:0 12px;background:#111;color:#eee}
 img{width:100%;border-radius:8px;background:#000}
 button{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:10px 14px;margin:6px 6px 0 0;font-size:15px}
 small{color:#9ca3af}
</style></head><body>
<h2>Pratinjau Kamera Setoran</h2>
<img id="foto" src="/capture">
<div>
 <button onclick="lampu(1)">Lampu ON</button>
 <button onclick="lampu(0)">Lampu OFF</button>
</div>
<p><small>Gambar diperbarui otomatis tiap 2 detik. Pakai halaman ini untuk mengatur sudut dan jarak kamera.</small></p>
<script>
 function ambil(){document.getElementById('foto').src='/capture?t='+Date.now();}
 function lampu(n){fetch('/lampu?on='+n);}
 setInterval(ambil, 2000);
</script></body></html>
)HTML";

void kirimPratinjau() {
  uint8_t* jpg = nullptr;
  size_t len = 0;
  if (!ambilFotoJpeg(&jpg, &len)) {
    if (jpg) free(jpg);
    server.send(500, "text/plain", "Gagal mengambil foto");
    return;
  }
  server.sendHeader("Cache-Control", "no-store");
  server.setContentLength(len);
  server.send(200, "image/jpeg", "");
  server.client().write(jpg, len);
  free(jpg);
}

// ---------------- setup & loop ----------------
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== KAMERA SETORAN ESP32-CAM ===");

  pinMode(PIN_LAMPU, OUTPUT);
  digitalWrite(PIN_LAMPU, LOW);

  kameraSiap = mulaiKamera();
  if (!kameraSiap) {
    Serial.println("Berhenti. Perbaiki kamera lalu tekan tombol RST.");
    return;
  }

  Serial.printf("Menyambung ke WiFi \"%s\" ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long mulai = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - mulai < 20000) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi tersambung.");
    Serial.print("Pratinjau kamera di browser:  http://");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("WiFi belum tersambung. Akan dicoba lagi otomatis. Pastikan hotspot menyala dan 2.4 GHz.");
  }

  klien.setInsecure();       // koneksi tetap terenkripsi (https); sertifikat server tidak diperiksa
  http.setReuse(true);

  server.on("/", []() { server.send_P(200, "text/html", HALAMAN); });
  server.on("/capture", kirimPratinjau);
  server.on("/lampu", []() {
    digitalWrite(PIN_LAMPU, server.arg("on") == "1" ? HIGH : LOW);
    server.send(200, "text/plain", "ok");
  });
  server.begin();
}

void loop() {
  if (!kameraSiap) {
    delay(1000);
    return;
  }

  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - terakhirWifi > 10000) {
      terakhirWifi = millis();
      Serial.println("WiFi belum tersambung, mencoba menyambung ulang...");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASS);
    }
    delay(200);
    return;
  }

  server.handleClient();

  if (millis() >= tundaSampai && millis() - terakhirCek >= POLL_MS) {
    terakhirCek = millis();
    long id = cekTugas();
    if (id > 0) prosesTugas(id);
  }
  delay(2);
}
