-- Tambah kolom minimal berat setoran pada campaign (jalankan sekali di database yang sudah ada)
ALTER TABLE kampanye_mitra
  ADD COLUMN minimal_berat DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER jenis_sampah;
