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

export async function apiFetch<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const { method = 'GET', body } = options
  const res = await fetch(`${API_URL}${path}`, {
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
