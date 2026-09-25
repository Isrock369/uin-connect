-- =====================================================================
-- SKEMA DATABASE - BANK SAMPAH PESANTREN
-- =====================================================================
-- Cara pakai:
--   mysql -u root -p < schema.sql
-- File ini akan MEMBUAT database baru bernama `bank_sampah_pesantren`,
-- semua tabel, relasi (foreign key), serta data contoh (seed) yang
-- sama dengan data dummy yang ada di src/data.ts pada versi frontend
-- lama, supaya tampilan website tidak kosong saat pertama dicoba.
-- =====================================================================

DROP DATABASE IF EXISTS bank_sampah_pesantren;
CREATE DATABASE bank_sampah_pesantren
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bank_sampah_pesantren;

-- ---------------------------------------------------------------------
-- 1. USERS (akun login pengurus/admin untuk WEBSITE)
--    Portal Santri (kiosk timbang) TIDAK menggunakan tabel ini —
--    portal itu memang dibuat bebas diakses karena dipakai langsung
--    di alat timbang oleh santri piket.
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama          VARCHAR(100) NOT NULL,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,      -- scrypt hash "salt:hash", lihat backend/src/utils/password.js
  role          ENUM('admin','pengurus') NOT NULL DEFAULT 'pengurus',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. ASRAMA & KAMAR
-- ---------------------------------------------------------------------
CREATE TABLE asrama (
  id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama  VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE kamar (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama           VARCHAR(100) NOT NULL,
  asrama_id      INT UNSIGNED NOT NULL,
  jumlah_santri  INT UNSIGNED NOT NULL DEFAULT 0,
  poin           INT NOT NULL DEFAULT 0,          -- saldo poin kamar (dipegang & dikelola pengurus)
  last_setoran   DATE NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_kamar_asrama FOREIGN KEY (asrama_id) REFERENCES asrama(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. TARIF SAMPAH (jenis + poin/kg, dipakai Portal Santri & Verifikasi)
-- ---------------------------------------------------------------------
CREATE TABLE tarif_sampah (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  jenis        VARCHAR(50) NOT NULL UNIQUE,
  kategori     VARCHAR(50) NOT NULL,
  poin_per_kg  INT UNSIGNED NOT NULL DEFAULT 0,
  keterangan   VARCHAR(255) NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. SETORAN SAMPAH
--    Dibuat dari Portal Santri (status awal selalu 'menunggu'),
--    lalu diverifikasi oleh pengurus lewat Website (halaman Verifikasi).
-- ---------------------------------------------------------------------
CREATE TABLE setoran (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kamar_id         INT UNSIGNED NOT NULL,
  tarif_sampah_id  INT UNSIGNED NOT NULL,
  piket            VARCHAR(100) NOT NULL,
  tanggal          DATE NOT NULL,
  berat_kg         DECIMAL(6,2) NOT NULL,
  poin             INT NOT NULL DEFAULT 0,
  status           ENUM('menunggu','disetujui','ditolak') NOT NULL DEFAULT 'menunggu',
  catatan          VARCHAR(255) NULL,
  diverifikasi_oleh INT UNSIGNED NULL,
  diverifikasi_at   DATETIME NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_setoran_kamar FOREIGN KEY (kamar_id) REFERENCES kamar(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_setoran_tarif FOREIGN KEY (tarif_sampah_id) REFERENCES tarif_sampah(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_setoran_verifikator FOREIGN KEY (diverifikasi_oleh) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  INDEX idx_setoran_status (status),
  INDEX idx_setoran_kamar (kamar_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. KATALOG BARANG (poin ditukar barang, BUKAN uang)
-- ---------------------------------------------------------------------
CREATE TABLE barang_katalog (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama        VARCHAR(150) NOT NULL,
  kategori    VARCHAR(50) NOT NULL,
  harga_poin  INT UNSIGNED NOT NULL,
  stok        INT UNSIGNED NOT NULL DEFAULT 0,
  deskripsi   VARCHAR(255) NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. PENUKARAN (kamar menukar poin dengan barang)
-- ---------------------------------------------------------------------
CREATE TABLE penukaran (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kamar_id         INT UNSIGNED NOT NULL,
  barang_id        INT UNSIGNED NOT NULL,
  jumlah           INT UNSIGNED NOT NULL,
  poin_digunakan   INT UNSIGNED NOT NULL,
  tanggal          DATE NOT NULL,
  diproses_oleh    INT UNSIGNED NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_penukaran_kamar FOREIGN KEY (kamar_id) REFERENCES kamar(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_penukaran_barang FOREIGN KEY (barang_id) REFERENCES barang_katalog(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_penukaran_user FOREIGN KEY (diproses_oleh) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. PENJUALAN HASIL OLAHAN ORGANIK (kompos / pakan maggot -> ke masyarakat)
--    Hasil penjualan MASUK KAS PONDOK, bukan reward santri.
-- ---------------------------------------------------------------------
CREATE TABLE penjualan_organik (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tanggal       DATE NOT NULL,
  pembeli       VARCHAR(150) NOT NULL,
  produk        VARCHAR(100) NOT NULL,          -- Kompos / Pakan Maggot / dst
  jumlah_kg     DECIMAL(8,2) NOT NULL,
  harga_per_kg  INT UNSIGNED NOT NULL,
  total         INT UNSIGNED GENERATED ALWAYS AS (jumlah_kg * harga_per_kg) STORED,
  dicatat_oleh  INT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_penjualan_user FOREIGN KEY (dicatat_oleh) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. KAS PONDOK (buku kas masuk/keluar)
-- ---------------------------------------------------------------------
CREATE TABLE transaksi_kas (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tanggal               DATE NOT NULL,
  keterangan            VARCHAR(255) NOT NULL,
  jenis                 ENUM('masuk','keluar') NOT NULL,
  jumlah                INT UNSIGNED NOT NULL,
  penjualan_organik_id  INT UNSIGNED NULL,       -- terisi otomatis jika berasal dari penjualan
  dicatat_oleh          INT UNSIGNED NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_kas_penjualan FOREIGN KEY (penjualan_organik_id) REFERENCES penjualan_organik(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_kas_user FOREIGN KEY (dicatat_oleh) REFERENCES users(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. MODUL EDUKASI (Panduan)
-- ---------------------------------------------------------------------
CREATE TABLE modul_edukasi (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  judul           VARCHAR(150) NOT NULL,
  kategori        VARCHAR(50) NOT NULL,
  deskripsi       VARCHAR(255) NOT NULL,
  konten          TEXT NOT NULL,
  durasi_menit    INT UNSIGNED NOT NULL DEFAULT 5,
  status          ENUM('published','draft') NOT NULL DEFAULT 'draft',
  icon            VARCHAR(10) NULL,
  tanggal_dibuat  DATE NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. KAMPANYE MITRA
-- ---------------------------------------------------------------------
CREATE TABLE kampanye_mitra (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mitra             VARCHAR(150) NOT NULL,
  logo_emoji        VARCHAR(10) NULL,
  judul_kampanye    VARCHAR(150) NOT NULL,
  deskripsi         TEXT NOT NULL,
  jenis_sampah      JSON NOT NULL,              -- contoh: ["Anorganik","Sampah Kertas"]
  bonus_keterangan  VARCHAR(255) NOT NULL,
  periode_mulai     DATE NOT NULL,
  periode_selesai   DATE NOT NULL,
  status            ENUM('aktif','mendatang','selesai') NOT NULL,
  kontak            VARCHAR(150) NOT NULL,
  syarat            VARCHAR(500) NOT NULL
) ENGINE=InnoDB;

-- =====================================================================
-- SEED DATA (data contoh, boleh dihapus/diganti sesuai data asli pesantren)
-- =====================================================================

INSERT INTO asrama (nama) VALUES ('Asrama A'), ('Asrama B'), ('Asrama C'), ('Asrama D');

INSERT INTO tarif_sampah (jenis, kategori, poin_per_kg, keterangan) VALUES
('Organik',        'Organik',  50,  'Sisa makanan, sayuran, buah, daun'),
('Anorganik',       'Anorganik',200, 'Plastik, kaleng, kaca, logam'),
('Sampah B3',       'B3',       75,  'Baterai, lampu, obat-obatan, bahan kimia'),
('Sampah Kertas',   'Kertas',   150, 'Kertas, kardus, koran, buku bekas'),
('Residu',          'Residu',   0,   'Sampah campuran yang tidak dapat dipilah');

INSERT INTO kamar (nama, asrama_id, jumlah_santri, poin, last_setoran) VALUES
('Al-Amanah', 3, 7,  1890, '2026-09-12'),
('Al-Kautsar',2, 8,  1560, '2026-09-13'),
('Al-Fatih',  1, 8,  1240, '2026-09-14'),
('Al-Furqon', 4, 9,  1120, '2026-09-15'),
('Al-Ikhlas', 1, 9,  980,  '2026-09-15'),
('Al-Huda',   4, 8,  850,  '2026-09-16'),
('Ar-Rahman', 2, 10, 720,  '2026-09-11'),
('Al-Barakah',3, 8,  640,  '2026-09-17');

INSERT INTO setoran (kamar_id, tarif_sampah_id, piket, tanggal, berat_kg, poin, status, catatan) VALUES
(4, 2, 'Ahmad Yusuf',    '2026-09-15', 2.3, 460, 'menunggu', NULL),
(5, 4, 'Rizky Maulana',  '2026-09-15', 5.0, 750, 'menunggu', NULL),
(7, 2, 'Fauzan Hakim',   '2026-09-16', 1.5, 300, 'menunggu', NULL),
(6, 2, 'Dimas Saputra',  '2026-09-16', 3.2, 640, 'menunggu', NULL),
(8, 4, 'Ilham Ramadhan', '2026-09-17', 4.0, 600, 'menunggu', NULL),
(1, 2, 'Ridwan Fathur',  '2026-09-12', 1.2, 240, 'disetujui', NULL),
(2, 2, 'Bagas Pratama',  '2026-09-13', 3.5, 700, 'disetujui', NULL),
(3, 1, 'Fikri Anwar',    '2026-09-14', 2.0, 100, 'disetujui', NULL),
(8, 5, 'Ilham Ramadhan', '2026-09-10', 2.0, 0,   'ditolak', 'Sampah masih bercampur, perlu dipilah ulang sebelum disetor.'),
(7, 3, 'Fauzan Hakim',   '2026-09-11', 1.0, 0,   'ditolak', 'Sampah B3 harus diserahkan dalam wadah tertutup dan berlabel.');

INSERT INTO barang_katalog (nama, kategori, harga_poin, stok, deskripsi) VALUES
('Sabun Mandi Batang',      'Kebutuhan Mandi', 200, 48, 'Sabun mandi batang 75g'),
('Pasta Gigi',              'Kebutuhan Mandi', 150, 52, 'Pasta gigi 65ml'),
('Sampo Sachet (10 pcs)',   'Kebutuhan Mandi', 280, 35, 'Sampo sachet isi 10'),
('Sikat Gigi',              'Kebutuhan Mandi', 80,  60, 'Sikat gigi medium bristle'),
('Buku Tulis (10 pcs)',     'Alat Tulis',       200, 40, 'Buku tulis 38 lembar, isi 10 buah'),
('Pena Ballpoint (5 pcs)',  'Alat Tulis',       120, 75, 'Pena hitam isi 5 buah'),
('Deterjen Sachet (5 pcs)', 'Kebersihan',       350, 28, 'Deterjen bubuk sachet isi 5'),
('Snack Paket',             'Makanan',          300, 20, 'Paket snack campur 5 pcs');

INSERT INTO penukaran (kamar_id, barang_id, jumlah, poin_digunakan, tanggal) VALUES
(1, 7, 2, 700, '2026-09-08'),
(2, 1, 3, 600, '2026-09-09'),
(3, 5, 2, 400, '2026-09-11'),
(1, 8, 1, 300, '2026-09-14');

INSERT INTO penjualan_organik (tanggal, pembeli, produk, jumlah_kg, harga_per_kg) VALUES
('2026-09-03', 'Pak Slamet Widodo', 'Kompos',       20, 3000),
('2026-09-07', 'Bu Ani Rahayu',     'Pakan Maggot', 15, 5000),
('2026-09-10', 'Pak Budi Santoso',  'Kompos',       30, 3000),
('2026-09-14', 'Bu Dewi Kartika',   'Pakan Maggot', 10, 5000),
('2026-09-17', 'Pak Slamet Widodo', 'Kompos',       25, 3000);

INSERT INTO transaksi_kas (tanggal, keterangan, jenis, jumlah, penjualan_organik_id) VALUES
('2026-09-01', 'Saldo awal September', 'masuk', 1100000, NULL),
('2026-09-03', 'Penjualan kompos — Pak Slamet Widodo', 'masuk', 60000, 1),
('2026-09-05', 'Biaya operasional bank sampah (karung, sarung tangan)', 'keluar', 50000, NULL),
('2026-09-07', 'Penjualan pakan maggot — Bu Ani Rahayu', 'masuk', 75000, 2),
('2026-09-10', 'Penjualan kompos — Pak Budi Santoso', 'masuk', 90000, 3),
('2026-09-10', 'Pembelian karung goni baru (10 pcs)', 'keluar', 75000, NULL),
('2026-09-14', 'Penjualan pakan maggot — Bu Dewi Kartika', 'masuk', 50000, 4),
('2026-09-15', 'Perbaikan timbangan digital', 'keluar', 120000, NULL),
('2026-09-17', 'Penjualan kompos — Pak Slamet Widodo', 'masuk', 75000, 5);

INSERT INTO modul_edukasi (judul, kategori, deskripsi, konten, durasi_menit, status, icon, tanggal_dibuat) VALUES
('Cara Memilah Sampah Organik & Anorganik', 'Cara Pilah',
 'Panduan dasar memisahkan sampah organik dan anorganik sebelum dibuang agar proses bank sampah berjalan lancar.',
 'Apa itu sampah organik? Sampah yang berasal dari makhluk hidup dan dapat terurai alami. Apa itu sampah anorganik? Sampah yang tidak terurai dalam waktu singkat.',
 5, 'published', '♻️', '2026-08-01'),
('Jadwal & Tata Tertib Bank Sampah', 'Cara Setor',
 'Aturan operasional, jadwal buka, dan tata tertib yang wajib dipatuhi oleh setiap kamar saat menyetor sampah.',
 'Jadwal operasional: Senin 06.30-07.30 Asrama A&B, Rabu 06.30-07.30 Asrama C&D, Sabtu 08.00-10.00 semua asrama.',
 3, 'draft', '📋', '2026-09-01');

INSERT INTO kampanye_mitra (mitra, logo_emoji, judul_kampanye, deskripsi, jenis_sampah, bonus_keterangan, periode_mulai, periode_selesai, status, kontak, syarat) VALUES
('Bank Sampah Nusantara', '🏦', 'Bonus Poin 2x untuk Plastik PET',
 'Dalam rangka mendorong pengumpulan plastik PET berkualitas, kami memberikan bonus poin 2x lipat untuk setiap setoran plastik PET selama bulan September 2026.',
 JSON_ARRAY('Anorganik'), '2x poin untuk Anorganik (400 pt/kg, berlaku sebulan)',
 '2026-09-01', '2026-09-30', 'aktif', 'banksampah.nusantara@gmail.com / 0812-3456-7890',
 'Berlaku untuk semua kamar. Plastik PET harus bersih dan tidak terlipat. Minimum setor 1 kg.'),
('Unilever Indonesia', '🧴', 'Kembalikan Kemasan Sabun & Sampo',
 'Program buyback kemasan plastik produk Unilever. Setiap kemasan yang dikembalikan mendapatkan poin tambahan.',
 JSON_ARRAY('Anorganik'), '+50 poin per kg kemasan produk Unilever',
 '2026-09-15', '2026-10-31', 'aktif', 'sustainability@unilever.com / 021-5789-0000',
 'Kemasan harus bersih dan kering. Label produk Unilever masih terbaca.');

-- ---------------------------------------------------------------------
-- Catatan penting:
-- * Akun login default untuk pengurus DIBUAT lewat script
--   `backend/src/utils/seedAdmin.js` (bukan lewat SQL ini), supaya
--   password di-hash dengan aman. Jalankan: `npm run seed` di folder backend.
-- ---------------------------------------------------------------------
