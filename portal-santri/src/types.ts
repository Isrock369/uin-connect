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
