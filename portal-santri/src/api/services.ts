import { apiFetch } from './client'
import type { Kamar, TarifSampah } from '../types'

export function getKamar() {
  return apiFetch<Kamar[]>('/kamar')
}

export function getTarifSampah() {
  return apiFetch<TarifSampah[]>('/tarif-sampah')
}

export interface SetoranResponse {
  id: number
  poin: number
  jenisSampah: string
  tanggal: string
  status: string
}

export function kirimSetoran(kamarId: string, tarifSampahId: string, berat: number) {
  return apiFetch<SetoranResponse>('/setoran', {
    method: 'POST',
    body: { kamarId, tarifSampahId, piket: 'Santri (via Portal)', berat },
  })
}

export interface VerifikasiSetoranResponse {
  jenis: string
  beratKg: number
  poinPerKg: number
  totalPoin: number
}

// Menghitung estimasi poin (jenis + berat) tanpa menyimpan data — dipakai untuk
// menampilkan estimasi poin di layar sebelum santri konfirmasi kirim setoran.
export function verifikasiSetoranEstimasi(jenis: string, beratKg: number) {
  return apiFetch<VerifikasiSetoranResponse>('/verifikasi-setoran', {
    method: 'POST',
    body: { jenis, beratKg },
  })
}
