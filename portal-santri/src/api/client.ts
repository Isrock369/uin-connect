import { transactionFetch } from './transaction'
// Portal Santri PUBLIK — tidak pernah mengirim token/login, hanya konsumsi
// endpoint publik backend (kamar, tarif-sampah) dan kirim setoran baru.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function rawFetch<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const { method = 'GET', body } = options
  const res = await fetch(`${API_URL}${path}`, {
    signal: AbortSignal.timeout(path.startsWith('/kamera/') ? 8000 : 30000),
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json() : null
  if (!res.ok) {
    throw new ApiError(data?.message || 'Terjadi kesalahan pada server.', res.status)
  }
  return data as T
}


export function apiFetch<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  if (options.method === 'POST' && ['/setoran', '/penukaran', '/penjualan', '/kas'].includes(path)) {
    return transactionFetch<T>(`${API_URL}${path}:public`, options.body, body => rawFetch<T>(path, { ...options, body }))
  }
  return rawFetch<T>(path, options)
}
