export const BERAT_MIN_KG = 0.01

export function validasiSetoran(kamarValid: boolean, jenisValid: boolean, berat: number, stabil: boolean): string | null {
  if (!kamarValid) return 'Kamar belum dipilih atau tidak tersedia. Kembali ke pilihan kamar.'
  if (!jenisValid) return 'Jenis sampah belum dipilih atau tidak tersedia. Pilih kembali jenis sampah.'
  if (!Number.isFinite(berat) || berat < BERAT_MIN_KG) return 'Berat belum valid. Letakkan sampah minimal 0,01 kg, lalu timbang ulang.'
  if (!stabil) return 'Tunggu sampai berat stabil sebelum mengirim setoran.'
  return null
}

export function pesanGagalSetoran(error: unknown): string {
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0
  const message = error instanceof Error ? error.message : ''
  if (status === 429) return 'Terlalu banyak permintaan. Tunggu sebentar, lalu kirim ulang dengan kamar, jenis, dan berat yang sama.'
  if (status >= 400 && status < 500 && status !== 408) {
    return message || 'Data setoran ditolak. Periksa kamar, jenis sampah, dan berat sebelum mencoba lagi.'
  }
  return 'Hasil pengiriman belum dapat dipastikan; setoran mungkin sudah tercatat. Periksa koneksi, lalu tekan Kirim Setoran lagi dengan kamar, jenis, dan berat yang sama. Jangan timbang ulang dulu.'
}
