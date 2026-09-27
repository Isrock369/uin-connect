// Jalankan sekali via: `npm run reset-transaksi`
// Mengosongkan SEMUA data transaksi (kamar, setoran, penukaran, kas,
// penjualan organik) supaya bisa mulai dari 0.
//
// TIDAK DIHAPUS (tetap ada seperti sekarang):
//   - users (akun login pengurus/admin)
//   - asrama (daftar asrama)
//   - tarif_sampah (kategori sampah & poin/kg)
//   - barang_katalog (katalog barang penukaran)
//   - modul_edukasi, kampanye_mitra
//
// PERINGATAN: operasi ini permanen dan tidak bisa dibatalkan.
require('dotenv').config()
const { pool } = require('../config/db')

async function run() {
  const conn = await pool.getConnection()
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0')

    await conn.query('TRUNCATE TABLE transaksi_kas')
    console.log('✅ transaksi_kas dikosongkan')

    await conn.query('TRUNCATE TABLE penjualan_organik')
    console.log('✅ penjualan_organik dikosongkan')

    await conn.query('TRUNCATE TABLE penukaran')
    console.log('✅ penukaran dikosongkan')

    await conn.query('TRUNCATE TABLE setoran')
    console.log('✅ setoran dikosongkan')

    await conn.query('TRUNCATE TABLE kamar')
    console.log('✅ kamar dikosongkan')

    await conn.query('SET FOREIGN_KEY_CHECKS = 1')

    console.log('')
    console.log('🎉 Reset selesai! Data yang TETAP ADA: asrama, kategori sampah, katalog barang, akun login.')
    console.log('   Silakan mulai tambah kamar baru lewat halaman Poin per Kamar.')
    process.exit(0)
  } catch (err) {
    console.error('Gagal reset data:', err)
    process.exit(1)
  } finally {
    conn.release()
  }
}

run()
