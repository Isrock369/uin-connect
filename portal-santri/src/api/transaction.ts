// Kunci disimpan sebelum request. Retry setelah timeout/reload memakai kunci yang sama.
// Setelah respons sukses, transaksi baru dengan isi sama tetap diperbolehkan.
const active = new Map<string, Promise<unknown>>()
const memory = new Map<string, string>()
export async function transactionFetch<T>(scope: string, body: unknown, send: (body: unknown) => Promise<T>): Promise<T> {
  const bytes = new TextEncoder().encode(JSON.stringify([scope, body]))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const fingerprint = 'miu-pending-' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
  const pending = active.get(fingerprint)
  if (pending) return pending as Promise<T>
  let key = memory.get(fingerprint)
  try { key = sessionStorage.getItem(fingerprint) || key } catch { /* storage dibatasi browser */ }
  key ||= crypto.randomUUID()
  memory.set(fingerprint, key)
  try { sessionStorage.setItem(fingerprint, key) } catch { /* retry tetap dilindungi selama halaman terbuka */ }
  function clear() {
    memory.delete(fingerprint)
    try { sessionStorage.removeItem(fingerprint) } catch { /* storage dibatasi browser */ }
  }
  const request = send({ ...(body as Record<string, unknown>), requestId: key }).then(result => {
    const id = (result as { id?: unknown } | null)?.id
    if (!Number.isSafeInteger(id) || Number(id) <= 0) throw new Error('Respons transaksi belum dapat dikonfirmasi. Ulangi dengan data yang sama.')
    clear()
    return result
  }).catch(error => {
    // 4xx definitif belum menyimpan transaksi; 408/429 dan 5xx boleh diulang.
    if (error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status)) clear()
    throw error
  }).finally(() => active.delete(fingerprint))
  active.set(fingerprint, request)
  return request
}
