export type PageId =
  | 'ringkasan'
  | 'verifikasi'
  | 'poin-kamar'
  | 'katalog'
  | 'penjualan-kas'
  | 'laporan'
  | 'panduan'
  | 'kampanye'

export interface Kamar {
  id: string
  nama: string
  asrama: string
  jumlahSantri: number
  poin: number
  lastSetoran: string | null
}

export type StatusSetoran = 'menunggu' | 'disetujui' | 'ditolak'

export interface Setoran {
  id: string
  kamarId: string
  kamarNama: string
  piket: string
  tanggal: string
  jenisSampah: string
  berat: number
  poin: number
  status: StatusSetoran
  catatan?: string
}

export interface BarangKatalog {
  id: string
  nama: string
  kategori: string
  hargaPoin: number
  stok: number
  deskripsi: string
}

export interface Penukaran {
  id: string
  kamarId: string
  kamarNama: string
  barangId: string
  barangNama: string
  jumlah: number
  poinDigunakan: number
  tanggal: string
}

export interface PenjualanOrganik {
  id: string
  tanggal: string
  pembeli: string
  produk: string
  jumlah: number
  hargaPerKg: number
  total: number
}

export interface TransaksiKas {
  id: string
  tanggal: string
  keterangan: string
  jenis: 'masuk' | 'keluar'
  jumlah: number
  referensi?: string
}

export interface TarifSampah {
  id: string
  jenis: string
  kategori: string
  poinPerKg: number
  keterangan: string
}

export type StatusModul = 'published' | 'draft'

export interface Modul {
  id: string
  judul: string
  kategori: string
  deskripsi: string
  konten: string
  durasi: number
  status: StatusModul
  tanggalDibuat: string
  icon: string
}

export type StatusKampanye = 'aktif' | 'mendatang' | 'selesai'

export interface Kampanye {
  id: string
  mitra: string
  logoEmoji: string
  judulKampanye: string
  deskripsi: string
  jenisSampah: string[]
  bonusKeterangan: string
  periodeMultai: string
  periodeSelesai: string
  status: StatusKampanye
  kontak: string
  syarat: string
}
