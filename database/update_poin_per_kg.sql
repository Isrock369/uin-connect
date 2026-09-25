-- =====================================================================
-- MIGRASI: Update poin_per_kg pada tabel tarif_sampah
-- =====================================================================
-- Jalankan file ini pada database yang sudah ada (tidak menghapus data)
-- untuk memperbarui nilai poin_per_kg ke nilai terbaru yang disepakati:
--   Organik        -> 10 poin/kg (sebelumnya 50)
--   Anorganik      -> 20 poin/kg (sebelumnya 200)
--   Sampah Kertas  -> 20 poin/kg (sebelumnya 150)
--   Sampah B3      -> 10 poin/kg (sebelumnya 75)
--   Residu         -> 4  poin/kg (sebelumnya 0)
--
-- Cara pakai:
--   mysql -u root -p bank_sampah_pesantren < update_poin_per_kg.sql
-- =====================================================================

USE bank_sampah_pesantren;

UPDATE tarif_sampah SET poin_per_kg = 10 WHERE jenis = 'Organik';
UPDATE tarif_sampah SET poin_per_kg = 20 WHERE jenis = 'Anorganik';
UPDATE tarif_sampah SET poin_per_kg = 20 WHERE jenis = 'Sampah Kertas';
UPDATE tarif_sampah SET poin_per_kg = 10 WHERE jenis = 'Sampah B3';
UPDATE tarif_sampah SET poin_per_kg = 4  WHERE jenis = 'Residu';
