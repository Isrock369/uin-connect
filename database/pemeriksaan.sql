-- Semua perintah hanya membaca data. Jalankan satu per satu di Railway Query.
-- Tidak mengambil isi PDF atau konten panduan.

SELECT COUNT(*) AS total_panduan,
       COALESCE(SUM(file_data IS NOT NULL), 0) AS panduan_dengan_file
FROM bank_sampah_pesantren.modul_edukasi;

-- Hasil yang diharapkan: 0. Memeriksa relasi yang mungkin pernah diimpor
-- saat pengecekan foreign key dinonaktifkan.
SELECT COUNT(*) AS panduan_tanpa_kategori_valid
FROM bank_sampah_pesantren.modul_edukasi AS m
LEFT JOIN bank_sampah_pesantren.kategori_panduan AS k ON k.id = m.kategori_id
WHERE k.id IS NULL;

-- Hasil yang diharapkan: 0. Nama dan isi file seharusnya sama-sama ada/kosong.
SELECT COUNT(*) AS lampiran_tidak_lengkap
FROM bank_sampah_pesantren.modul_edukasi
WHERE (file_name IS NULL AND file_data IS NOT NULL)
   OR (file_name IS NOT NULL AND file_data IS NULL)
   OR (file_data IS NOT NULL AND OCTET_LENGTH(file_data) = 0)
   OR (file_name IS NOT NULL AND TRIM(file_name) = '');

SELECT k.id, k.nama, COUNT(m.id) AS jumlah_panduan
FROM bank_sampah_pesantren.kategori_panduan AS k
LEFT JOIN bank_sampah_pesantren.modul_edukasi AS m ON m.kategori_id = k.id
GROUP BY k.id, k.nama ORDER BY k.nama;
