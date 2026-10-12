export interface Kamar {
  id: string
  nama: string
  asrama: string
  jumlahSantri: number
  poin: number
  lastSetoran: string | null
}

export interface TarifSampah {
  id: string
  jenis: string
  kategori: string
  poinPerKg: number
  keterangan: string
}

export interface RiwayatSetoran {
  id: number
  tanggal: string // YYYY-MM-DD
  jenisSampah: string
  berat: number
  poin: number
  status: 'menunggu' | 'disetujui' | 'ditolak'
  catatan: string | null
}

export interface RiwayatKamar {
  poinMenunggu: number
  riwayat: RiwayatSetoran[]
}
