# UIN Connect — Bank Sampah Pesantren

Sistem bank sampah untuk pesantren. Santri piket menimbang sampah di alat timbang IoT, poin masuk ke saldo kamar setelah diverifikasi pengurus, dan poin bisa ditukar dengan barang dari katalog. Di dalam aplikasi, namanya tampil sebagai **MIU Connect**.

## Komponen

```
uin-connect/
├── database/        schema.sql (MySQL) + skrip pembaruan
├── backend/         Node.js + Express + MySQL (REST API)
├── website/         React: dashboard pengurus (perlu login)
├── portal-santri/   React: layar kiosk di alat timbang (tanpa login)
└── kamera_web/      Firmware ESP32-CAM untuk foto bukti setoran
```

Firmware timbangan (ESP32 + load cell HX711) mengirim berat ke backend lewat `POST /api/timbangan`. Kodenya tidak termasuk di repo ini.

## Alur kerja

1. Santri piket memilih kamar dan jenis sampah di **Portal Santri**, lalu menaruh sampah di timbangan.
2. Portal membaca berat dari backend (dikirim ESP32). Setelah angka stabil, setoran dikirim dan ESP32-CAM memotret sebagai bukti.
3. Setoran masuk dengan status `menunggu`.
4. Pengurus membuka halaman **Verifikasi Setoran** di website, melihat foto, lalu menyetujui atau menolak.
5. Jika disetujui, poin otomatis ditambahkan ke saldo kamar (dalam satu transaksi database).
6. Kamar menukar poin dengan barang dari katalog. Penjualan kompos/maggot masuk ke buku kas.

## Fitur website pengurus

Ringkasan, Verifikasi Setoran, Poin per Kamar (termasuk kelola asrama dan kamar, serta penukaran poin), Kategori Sampah (tarif poin/kg), Katalog Barang, Penjualan dan Kas, Kampanye mitra, Laporan, dan Panduan.

## Cara menjalankan (development)

Butuh Node.js 18+ dan MySQL.

**1. Database**

```bash
mysql -u root -p < database/schema.sql
```

Perintah ini membuat database `bank_sampah_pesantren` beserta data contoh. Database lama dengan nama yang sama akan terhapus.

**2. Backend (port 4000)**

```bash
cd backend
npm install
cp .env.example .env     # isi kredensial MySQL, JWT_SECRET, dan TIMBANGAN_KEY
npm run seed             # membuat akun admin awal
npm run dev
```

**3. Website pengurus (port 5173)**

```bash
cd website
npm install
cp .env.example .env
npm run dev
```

**4. Portal Santri (port 5174)**

```bash
cd portal-santri
npm install
cp .env.example .env
npm run dev
```

Jalankan ketiganya di terminal terpisah. Login website memakai akun hasil `npm run seed` (username `admin`). Password awalnya ada di `backend/src/utils/seedAdmin.js`, segera ganti setelah login pertama.

**5. Kamera (opsional)**

Buka `kamera_web/kamera_web.ino` di Arduino IDE. Salin `secrets.example.h` menjadi `secrets.h`, isi WiFi, domain backend, dan kunci perangkat. Pengaturan board ada di komentar bagian atas file `.ino`.

## Endpoint

Daftar lengkap ada di [backend/README.md](backend/README.md). Pembagian aksesnya:

| Kelompok | Akses | Contoh |
|---|---|---|
| Data yang dibaca portal | Publik | `GET /api/kamar`, `GET /api/tarif-sampah`, `GET /api/timbangan` |
| Kirim setoran dan minta foto | Publik | `POST /api/setoran`, `POST /api/kamera/minta` |
| ESP32 (timbangan dan kamera) | Header `X-Device-Key` | `POST /api/timbangan`, `POST /api/kamera/foto` |
| Dashboard pengurus | JWT | verifikasi, katalog, penukaran, kas, laporan |
| Debug data mentah | JWT + role admin | `GET /api/data`, `GET /api/data/:table` |

## Sebelum deploy ke produksi

1. Isi `JWT_SECRET` dengan string acak minimal 32 karakter.
2. Ganti password akun `admin`.
3. Isi `TIMBANGAN_KEY` dengan kunci acak dan samakan dengan firmware ESP32.
4. Jangan commit `.env` dan `kamera_web/secrets.h` (sudah ada di `.gitignore`).
5. Pakai HTTPS dan tambahkan rate limiting di endpoint login serta endpoint publik.
6. Set `CORS_ORIGIN_WEBSITE` dan `CORS_ORIGIN_PORTAL` ke domain produksi, dan `VITE_API_URL` di kedua frontend.

## Tech stack

- Backend: Node.js, Express, MySQL (`mysql2`), JWT
- Frontend: React 18, Vite, TypeScript, Tailwind CSS, Lucide
- Perangkat: ESP32, ESP32-CAM, load cell + HX711
