// ---------- SETORAN ----------
export function getSetoran(status?: StatusSetoran) {
  const qs = status ? `?status=${status}` : ''
  return apiFetch<Setoran[]>(`/setoran${qs}`)
}
export function verifikasiSetoran(id: string, status: 'disetujui' | 'ditolak', catatan?: string) {
  return apiFetch<{ message: string }>(`/setoran/${id}/verifikasi`, { method: 'PUT', body: { status, catatan } })
}
export interface SetoranEditData {
  kamarId: string
  tarifSampahId: string
  piket: string
  tanggal: string
  berat: number
}
export function updateSetoran(id: string, data: SetoranEditData) {
  return apiFetch<{ message: string }>(`/setoran/${id}`, { method: 'PUT', body: data })
}
export function deleteSetoran(id: string) {
  return apiFetch<{ message: string }>(`/setoran/${id}`, { method: 'DELETE' })
}
