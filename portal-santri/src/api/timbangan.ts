// Membaca berat dari timbangan IoT (ESP32 + HX711) lewat WiFi lokal.
// Alamat timbangan bisa diatur lewat file .env di folder portal-santri:
//   VITE_TIMBANGAN_URL=http://192.168.1.50
// Kalau tidak diisi, dipakai http://timbangan.local (mDNS dari ESP32).
export const TIMBANGAN_URL = String(
  import.meta.env.VITE_TIMBANGAN_URL || 'http://timbangan.local',
).replace(/\/$/, '')

export class TimbanganError extends Error {}

export interface BacaanTimbangan {
  berat: number // kg, 2 desimal, sama persis dengan yang tampil di LCD
  stabil: boolean // true kalau angka sudah terkunci (tidak berubah lagi)
  status: 'mengukur' | 'stabil'
  sensorOk: boolean // false kalau HX711 tidak terbaca
}

export async function bacaTimbangan(timeoutMs = 2000): Promise<BacaanTimbangan> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${TIMBANGAN_URL}/berat`, { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) throw new TimbanganError(`Timbangan membalas error ${res.status}.`)
    return (await res.json()) as BacaanTimbangan
  } catch (e) {
    if (e instanceof TimbanganError) throw e
    throw new TimbanganError('Tidak bisa terhubung ke timbangan.')
  } finally {
    clearTimeout(timer)
  }
}
