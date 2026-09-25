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
