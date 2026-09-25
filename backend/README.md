# Backend — Bank Sampah Pesantren

Node.js + Express + MySQL (mysql2). Menyediakan REST API untuk 2 frontend:
- **website/** → dashboard pengurus (perlu login)
- **portal-santri/** → kiosk timbang di alat IoT (publik, tanpa login)

## Setup

1. Buat database & tabel:
   ```bash
   mysql -u root -p < ../database/schema.sql
   ```
2. Install dependency:
   ```bash
   npm install
   ```
3. Salin `.env.example` menjadi `.env`, sesuaikan kredensial MySQL Anda.
4. Buat akun login pengurus pertama:
   ```bash
   npm run seed
   ```
   → membuat akun `admin` / `admin123` (segera ganti setelah login pertama).
5. Jalankan server:
   ```bash
   npm run dev     # dengan nodemon (auto-restart)
   # atau
   npm start
   ```
   Default: `http://localhost:4000`

## Ringkasan endpoint

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | /api/auth/login | publik | login pengurus, balikin JWT |
| GET | /api/auth/me | login | data user yang sedang login |
| GET | /api/kamar | publik | daftar kamar + saldo poin |
| GET | /api/tarif-sampah | publik | daftar jenis sampah + poin/kg |
| POST | /api/setoran | **publik** | dikirim dari Portal Santri saat santri selesai timbang |
| GET | /api/setoran?status=menunggu | login | daftar setoran, dipakai halaman Verifikasi |
| PUT | /api/setoran/:id/verifikasi | login | setujui/tolak setoran → otomatis update poin kamar |
| GET/POST/PUT/DELETE | /api/katalog | campuran | katalog barang tukar poin |
| GET/POST | /api/penukaran | login | tukar poin kamar dengan barang |
| GET/POST | /api/penjualan | login | penjualan kompos/maggot → otomatis masuk kas |
| GET/POST | /api/kas | login | buku kas pondok |
| GET/POST/PUT/DELETE | /api/modul | campuran | modul edukasi (Panduan) |
| GET/POST | /api/kampanye | campuran | kampanye mitra eksternal |
| GET | /api/laporan/ringkasan | login | data agregat untuk Dashboard |
| GET | /api/laporan/poin-per-kamar | login | data untuk halaman Poin per Kamar |

Semua endpoint publik memang **sengaja tanpa login** karena dipakai oleh Portal Santri
yang berjalan di alat timbang dan harus bisa langsung dipakai santri piket.
