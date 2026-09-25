# Bank Sampah Pesantren — Full Stack

Proyek ini terdiri dari **3 bagian terpisah** yang saling terhubung lewat 1 backend:

```
BankSampahPesantren/
├── database/         → schema.sql (MySQL)
├── backend/           → Node.js + Express + MySQL (REST API)
├── website/           → React — Dashboard PENGURUS, WAJIB LOGIN
└── portal-santri/     → React — Kiosk timbang, PUBLIK tanpa login
```

## Kenapa dipisah?

- **Portal Santri** = tampilan monitor/kiosk yang dipasang di alat timbang. Santri piket
  langsung pakai ini untuk mencatat setoran — **tanpa login**, karena harus cepat diakses
  siapa saja yang piket hari itu.
- **Website** = wadah hasil dari Portal Santri. Di sini pengurus **login**, memverifikasi
  setoran yang masuk, mengelola poin, katalog barang, kas pondok, laporan, dsb.

Kedua aplikasi ini adalah **proyek React terpisah** (masing-masing punya `package.json`,
`node_modules`, `.env` sendiri), tetapi **berbagi satu backend & satu database yang sama**.

## Alur data

```
Santri piket timbang sampah
        │
        ▼
[Portal Santri]  ──POST /api/setoran (publik)──▶  [Backend + MySQL]
        │                                                │
        │                                    status: 'menunggu'
        │                                                │
                                                           ▼
                                          [Website] pengurus login,
                                          buka menu Verifikasi Setoran
                                                           │
                                          Setujui ──▶ poin otomatis masuk ke kamar
                                          Tolak   ──▶ tidak dapat poin
```

## Cara menjalankan (development)

1. **Database**
   ```bash
   mysql -u root -p < database/schema.sql
   ```

2. **Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env      # sesuaikan kredensial MySQL
   npm run seed               # buat akun login admin/admin123
   npm run dev                 # jalan di http://localhost:4000
   ```

3. **Website (admin, perlu login)**
   ```bash
   cd website
   npm install
   cp .env.example .env
   npm run dev                 # jalan di http://localhost:5173
   ```
   Login pakai `admin` / `admin123` (ganti setelah login pertama).

4. **Portal Santri (kiosk, publik)**
   ```bash
   cd portal-santri
   npm install
   cp .env.example .env
   npm run dev                 # jalan di http://localhost:5174
   ```
   Buka langsung tanpa login — ini yang dipasang di alat timbang.

Jalankan ketiganya (backend, website, portal-santri) **bersamaan** di 3 terminal berbeda
saat development. Saat production, masing-masing di-`build` (`npm run build`) dan
di-deploy sebagai static site terpisah (misal Portal Santri di komputer/tablet dekat
timbangan, Website di domain admin seperti `admin.pesantren.sch.id`).

## Yang sudah tersambung end-to-end

- ✅ Database MySQL lengkap dengan relasi & seed data (`database/schema.sql`)
- ✅ Backend REST API (Node/Express) dengan JWT login, transaksi DB untuk poin/stok
- ✅ Website: Login, semua 8 halaman (Dashboard, Verifikasi Setoran, Poin per Kamar,
  Katalog Barang, Penjualan & Kas, Laporan, Panduan, Kampanye) sudah membaca &
  menulis langsung ke backend — tidak ada lagi data dummy statis
- ✅ Portal Santri: pilih kamar & jenis sampah dari data backend, simulasi sensor IoT,
  kirim setoran langsung ke database lewat endpoint publik

## Catatan keamanan sebelum dipakai sungguhan

- Ganti `JWT_SECRET` di `backend/.env` dengan string acak yang panjang
- Ganti password akun `admin` setelah login pertama (belum ada halaman ganti password —
  bisa dilakukan langsung lewat `UPDATE users ...` di database atau tambahkan halaman ini)
- Portal Santri sengaja publik/tanpa login sesuai kebutuhan (dipakai di alat timbang fisik),
  tapi pastikan perangkat kiosknya berada di lokasi yang diawasi pengurus
