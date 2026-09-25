// Kumpulan fungsi pemanggil setiap endpoint backend.
// Setiap halaman (pages/*) cukup import fungsi dari sini — tidak perlu
// tahu detail fetch/URL/token sama sekali.
import { apiFetch } from './client'
import type {
  Kamar, Setoran, StatusSetoran, BarangKatalog, Penukaran,
  PenjualanOrganik, TransaksiKas, TarifSampah, Modul, Kampanye,
} from '../types'

// ---------- AUTH ----------
export interface LoginResponse {
  token: string
  user: { id: number; username: string; nama: string; role: 'admin' | 'pengurus' }
}
export function login(username: string, password: string) {
  return apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: { username, password }, auth: false })
}
export function getMe() {
  return apiFetch<{ user: LoginResponse['user'] }>('/auth/me')
}

// ---------- ASRAMA ----------
export interface Asrama { id: string; nama: string }
export function getAsrama() {
  return apiFetch<Asrama[]>('/asrama', { auth: false })
}

// ---------- KAMAR ----------
export function getKamar() {
  return apiFetch<Kamar[]>('/kamar')
}
export function createKamar(data: { nama: string; asramaId: string; jumlahSantri: number }) {
  return apiFetch<{ id: number }>('/kamar', { method: 'POST', body: data })
}
export function updateKamar(id: string, data: { nama: string; asramaId: string; jumlahSantri: number }) {
  return apiFetch<{ message: string }>(`/kamar/${id}`, { method: 'PUT', body: data })
}
export function deleteKamar(id: string) {
  return apiFetch<{ message: string }>(`/kamar/${id}`, { method: 'DELETE' })
}

// ---------- TARIF SAMPAH ----------
export function getTarifSampah() {
  return apiFetch<TarifSampah[]>('/tarif-sampah')
}

// ---------- SETORAN ----------
export function getSetoran(status?: StatusSetoran) {
  const qs = status ? `?status=${status}` : ''
  return apiFetch<Setoran[]>(`/setoran${qs}`)
}
export function verifikasiSetoran(id: string, status: 'disetujui' | 'ditolak', catatan?: string) {
  return apiFetch<{ message: string }>(`/setoran/${id}/verifikasi`, { method: 'PUT', body: { status, catatan } })
}

// ---------- KATALOG BARANG ----------
export function getKatalog() {
  return apiFetch<BarangKatalog[]>('/katalog')
}
export function createBarang(barang: Omit<BarangKatalog, 'id'>) {
  return apiFetch<{ id: number }>('/katalog', { method: 'POST', body: barang })
}
export function updateBarang(id: string, barang: Omit<BarangKatalog, 'id'>) {
  return apiFetch<{ message: string }>(`/katalog/${id}`, { method: 'PUT', body: barang })
}
export function deleteBarang(id: string) {
  return apiFetch<{ message: string }>(`/katalog/${id}`, { method: 'DELETE' })
}

// ---------- PENUKARAN ----------
export function getPenukaran() {
  return apiFetch<Penukaran[]>('/penukaran')
}
export function createPenukaran(kamarId: string, barangId: string, jumlah: number) {
  return apiFetch<{ id: number; poinDigunakan: number }>('/penukaran', {
    method: 'POST', body: { kamarId, barangId, jumlah },
  })
}

// ---------- PENJUALAN ORGANIK ----------
export function getPenjualan() {
  return apiFetch<PenjualanOrganik[]>('/penjualan')
}
export function createPenjualan(data: Omit<PenjualanOrganik, 'id' | 'total'>) {
  return apiFetch<{ id: number; total: number }>('/penjualan', { method: 'POST', body: data })
}

// ---------- KAS ----------
export function getKas() {
  return apiFetch<TransaksiKas[]>('/kas')
}
export function createKas(data: Omit<TransaksiKas, 'id'>) {
  return apiFetch<{ id: number }>('/kas', { method: 'POST', body: data })
}

// ---------- MODUL EDUKASI (Panduan) ----------
export interface ModulInput {
  judul: string
  kategori: string
  deskripsi: string
  konten: string
  durasi: number
  status: Modul['status']
  icon: string
}
export function getModul() {
  return apiFetch<Modul[]>('/modul', { auth: false })
}
export function createModul(data: ModulInput) {
  return apiFetch<{ id: number }>('/modul', { method: 'POST', body: data })
}
export function updateModul(id: string, data: ModulInput) {
  return apiFetch<{ message: string }>(`/modul/${id}`, { method: 'PUT', body: data })
}
export function deleteModul(id: string) {
  return apiFetch<{ message: string }>(`/modul/${id}`, { method: 'DELETE' })
}

// ---------- KAMPANYE MITRA ----------
export function getKampanye() {
  return apiFetch<Kampanye[]>('/kampanye', { auth: false })
}
export function createKampanye(data: Omit<Kampanye, 'id'>) {
  return apiFetch<{ id: number }>('/kampanye', { method: 'POST', body: data })
}
export function updateKampanye(id: string, data: Omit<Kampanye, 'id'>) {
  return apiFetch<{ message: string }>(`/kampanye/${id}`, { method: 'PUT', body: data })
}
export function deleteKampanye(id: string) {
  return apiFetch<{ message: string }>(`/kampanye/${id}`, { method: 'DELETE' })
}

// ---------- LAPORAN / DASHBOARD ----------
export interface Ringkasan {
  totalPoinAktif: number
  totalSetoranMenunggu: number
  totalBeratBulanIni: number
  saldoKas: number
  topKamar: { nama: string; poin: number }[]
}
export function getRingkasan() {
  return apiFetch<Ringkasan>('/laporan/ringkasan')
}
