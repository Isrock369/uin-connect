# UIN Connect — Full Stack Platform

Proyek ini adalah **platform komunikasi & kolaborasi digital** yang menghubungkan mahasiswa, pengurus organisasi, dan administrator UIN dengan sistem terintegrasi.

Terdiri dari **3 bagian terpisah** yang saling terhubung melalui 1 backend:

```
uin-connect/
├── database/         → schema.sql (MySQL) — struktur database
├── backend/          → Node.js + Express + MySQL (REST API)
├── website/          → React — Dashboard Admin & Pengurus (perlu login)
└── portal-santri/    → React — Portal Publik Mahasiswa (tanpa login)
```

## 📋 Deskripsi Singkat

**UIN Connect** menyediakan ekosistem digital untuk:

- **Portal Santri (Mahasiswa)** = aplikasi publik tanpa login untuk mahasiswa mengakses informasi umum, berita, panduan, dan fitur dasar lainnya. Diakses melalui ponsel atau kiosk di kampus.
  
- **Website Admin/Pengurus** = dashboard administratif dengan akses penuh untuk pengelola organisasi, verifikasi data, manajemen konten, laporan, dan kontrol sistem. Memerlukan login dengan kredensial.

Kedua aplikasi ini adalah **proyek React terpisah** (masing-masing punya `package.json`, `node_modules`, `.env` sendiri), tetapi **berbagi satu backend & satu database yang sama**.

## 🔄 Alur Data & Arsitektur

```
Mahasiswa membuka aplikasi
        │
        ├─────────────────────────────────────┐
        │                                     │
        ▼                                     ▼
   [Portal Santri]               [Website Admin]
   (React - Publik)              (React - Login)
   - Baca berita                 - Kelola konten
   - Akses panduan               - Verifikasi data
   - Lihat info umum             - Generate laporan
   - Submit form                 - Manajemen user
        │                                │
        └──────────────┬──────────────────┘
                       │
                       ▼
         [Backend API — Node.js + Express]
         - Authentication (JWT)
         - Data validation
         - Business logic
                       │
                       ▼
           [MySQL Database]
           - Users & roles
           - Content & berita
           - Logs & audit trail
```

## 🚀 Cara Menjalankan (Development)

### 1️⃣ Database Setup

```bash
mysql -u root -p < database/schema.sql
```

### 2️⃣ Backend (Port 4000)

```bash
cd backend
npm install
cp .env.example .env      # sesuaikan kredensial MySQL
npm run seed              # buat akun login admin/admin123
npm run dev               # jalan di http://localhost:4000
```

**Kredensial default:**
- Username: `admin`
- Password: `admin123`
- ⚠️ Ganti password setelah login pertama

### 3️⃣ Website Admin/Pengurus (Port 5173)

```bash
cd website
npm install
cp .env.example .env      # set VITE_API_URL=http://localhost:4000
npm run dev               # jalan di http://localhost:5173
```

Akses dengan kredensial `admin / admin123` yang dibuat di step 2.

### 4️⃣ Portal Santri (Port 5174)

```bash
cd portal-santri
npm install
cp .env.example .env      # set VITE_API_URL=http://localhost:4000
npm run dev               # jalan di http://localhost:5174
```

Buka langsung tanpa login — tidak perlu autentikasi.

---

**Jalankan ketiganya (backend, website, portal-santri) bersamaan di 3 terminal berbeda saat development.**

## 📡 Endpoint API Utama

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | `/api/auth/login` | Publik | Login user, return JWT token |
| GET | `/api/auth/me` | Login | Data user yang sedang login |
| GET | `/api/berita` | Publik | Daftar berita/artikel |
| GET | `/api/berita/:id` | Publik | Detail berita |
| POST | `/api/berita` | Admin | Buat berita baru |
| PUT | `/api/berita/:id` | Admin | Edit berita |
| DELETE | `/api/berita/:id` | Admin | Hapus berita |
| GET | `/api/panduan` | Publik | Daftar panduan/tutorial |
| GET | `/api/user/profile` | Login | Profil user yang login |
| PUT | `/api/user/profile` | Login | Update profil user |
| GET | `/api/organisasi` | Publik | Daftar organisasi |
| GET | `/api/laporan` | Admin | Data ringkasan dashboard |

Endpoint yang ditandai **Publik** dapat diakses tanpa token, sementara **Login** memerlukan JWT token valid.

## ✅ Status Implementasi

- ✅ Database MySQL lengkap dengan relasi & seed data
- ✅ Backend REST API dengan JWT authentication
- ✅ Website: Login, dashboard, kelola konten (berita, panduan, dll)
- ✅ Portal Santri: Halaman publik, browsing konten
- ✅ CORS dan komunikasi antar aplikasi
- ✅ Responsive design dengan Tailwind CSS

## 🔐 Catatan Keamanan

Sebelum deployment ke production:

1. **Ganti JWT_SECRET** di `backend/.env` dengan string acak yang panjang:
   ```
   JWT_SECRET=your-super-secret-key-here-min-32-chars
   ```

2. **Ganti password admin** setelah login pertama (update langsung di database atau via halaman change password)

3. **Set environment variables** yang sesuai untuk masing-masing aplikasi:
   - Backend: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`
   - Website: `VITE_API_URL` (URL backend production)
   - Portal Santri: `VITE_API_URL` (URL backend production)

4. **Aktifkan HTTPS** saat production

5. **Setup rate limiting** di backend untuk mencegah brute force

## 📦 Tech Stack

- **Backend**: Node.js, Express.js, MySQL, JWT
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Icons**: Lucide React
- **Package Manager**: npm

## 🌐 Deployment

### Production Build

```bash
# Website
cd website && npm run build
# Output: dist/ → deploy ke server/CDN

# Portal Santri
cd portal-santri && npm run build
# Output: dist/ → deploy ke server/CDN

# Backend
# Jalankan di server dengan: npm start
# Atau gunakan PM2: pm2 start src/server.js
```

## 📧 Support & Kontribusi

Untuk pertanyaan atau kontribusi, silakan buka issue atau hubungi tim development.

---

**Made with ❤️ by UIN Connect Team**
