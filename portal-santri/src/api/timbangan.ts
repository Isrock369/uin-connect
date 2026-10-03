// Membaca berat dari timbangan IoT (ESP32 + HX711).
//
// Ada 2 cara, dipilih otomatis lewat file .env / pengaturan Vercel:
//  1) LEWAT BACKEND (default, cocok untuk portal di Vercel):
//     ESP32 mengirim berat ke backend, portal membaca GET {VITE_API_URL}/timbangan.
//  2) LANGSUNG KE ESP32 (hanya untuk tes lokal, portal harus http://localhost):
//     isi VITE_TIMBANGAN_URL=http://192.168.1.50 maka portal membaca GET {url}/berat.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const LANGSUNG = String(import.meta.env.VITE_TIMBANGAN_URL || '').replace(/\/$/, '')

export const MODE_LANGSUNG = LANGSUNG !== ''
export const SUMBER_TIMBANGAN = MODE_LANGSUNG ? `${LANGSUNG}/berat` : `${API_URL}/timbangan`

export class TimbanganError extends Error {}

export interface BacaanTimbangan {
  berat: number // kg, 2 desimal, sama persis dengan yang tampil di LCD
  stabil: boolean // true kalau angka sudah terkunci (tidak berubah lagi)
  status: 'mengukur' | 'stabil'
  sensorOk: boolean // false kalau HX711 tidak terbaca
  online?: boolean // hanya ada lewat backend: false kalau ESP32 berhenti mengirim data
}

export async function bacaTimbangan(timeoutMs = 3000): Promise<BacaanTimbangan> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(SUMBER_TIMBANGAN, { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) throw new TimbanganError(`Server membalas error ${res.status}.`)
    return (await res.json()) as BacaanTimbangan
  } catch (e) {
    if (e instanceof TimbanganError) throw e
    throw new TimbanganError('Tidak bisa terhubung.')
  } finally {
    clearTimeout(timer)
  }
}
