import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, Recycle } from 'lucide-react'
import { getTarifSampah, createTarifSampah, updateTarifSampah, deleteTarifSampah } from '../api/services'
import { ApiError } from '../api/client'
import type { TarifSampah } from '../types'

// Kategori bawaan, hanya dipakai sebagai starting point / saran awal.
// Kategori BARU yang diketik user di form akan otomatis tergabung ke sini
// begitu tersimpan di database (kolom `kategori` di tabel tarif_sampah
// memang sudah bertipe teks bebas, jadi tidak perlu migrasi apa pun).
const defaultKategori = ['Plastik', 'Kertas', 'Logam', 'Kaca', 'Lainnya']

// Nama kategori (bawaan) yang pernah dihapus lewat tombol ✕ di UI,
// disimpan di browser admin ini supaya tidak muncul lagi lain kali.
const HIDDEN_KEY = 'kategoriSampah_hidden'

function loadHiddenKategori(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]')
  } catch {
    return []
  }
}

const kategoriColor: Record<string, string> = {
  Plastik: 'var(--color-accent)',
  Kertas: 'var(--color-primary-light)',
  Logam: '#6B7280',
  Kaca: '#60A5FA',
  Lainnya: 'var(--color-muted-foreground)',
}

interface TarifForm {
  jenis: string
  kategori: string
  poinPerKg: number
  keterangan: string
}

const emptyForm: TarifForm = { jenis: '', kategori: 'Plastik', poinPerKg: 0, keterangan: '' }

export default function KategoriSampah() {
  const [tarif, setTarif] = useState<TarifSampah[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [filterKategori, setFilterKategori] = useState('Semua')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<TarifSampah | null>(null)
  const [form, setForm] = useState<TarifForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [hiddenKategori, setHiddenKategori] = useState<string[]>(loadHiddenKategori)
  const [kategoriCustom, setKategoriCustom] = useState(false)

  const KATEGORI_BARU_SENTINEL = '__kategori_baru__'

  function hapusKategoriDariUI(nama: string) {
    setHiddenKategori((prev) => {
      const next = [...prev, nama]
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(next))
      return next
    })
    if (filterKategori === nama) setFilterKategori('Semua')
  }

  function loadAll() {
    setLoading(true)
    getTarifSampah()
      .then(setTarif)
      .catch((e) => setErrorMsg(e instanceof ApiError ? e.message : 'Gagal memuat data tarif sampah.'))
      .finally(() => setLoading(false))
  }

  useEffect(loadAll, [])

  // Gabungkan kategori bawaan + kategori baru apa pun yang sudah pernah
  // dipakai di data (misalnya diketik manual oleh admin sebelumnya).
  // Diurutkan alfabetis supaya konsisten.
  const kategoriDinamis = Array.from(
    new Set([...defaultKategori, ...tarif.map((t) => t.kategori)])
  )
    .filter((k) => !hiddenKategori.includes(k))
    .sort((a, b) => a.localeCompare(b))

  const kategoriList = ['Semua', ...kategoriDinamis]

  const filtered =
    filterKategori === 'Semua' ? tarif : tarif.filter((t) => t.kategori === filterKategori)

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm)
    setKategoriCustom(false)
    setShowModal(true)
  }

  function openEdit(t: TarifSampah) {
    setEditTarget(t)
    setForm({ jenis: t.jenis, kategori: t.kategori, poinPerKg: t.poinPerKg, keterangan: t.keterangan })
    // Kalau kategori item ini bukan salah satu dari daftar saran, otomatis
    // buka dalam mode "ketik sendiri" supaya nilainya tidak berubah diam-diam.
    setKategoriCustom(!kategoriDinamis.includes(t.kategori))
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.jenis || form.poinPerKg <= 0) return
    setErrorMsg(null)
    try {
      if (editTarget) {
        await updateTarifSampah(editTarget.id, form)
      } else {
        await createTarifSampah(form)
      }
      setShowModal(false)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal menyimpan jenis sampah.')
    }
  }

  async function handleDelete(id: string) {
    setErrorMsg(null)
    try {
      await deleteTarifSampah(id)
      setDeleteTarget(null)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal menghapus jenis sampah.')
    }
  }

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Memuat kategori sampah...</p>
  }

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {kategoriList.map((k) => {
            const jumlahItem = k === 'Semua' ? -1 : tarif.filter((t) => t.kategori === k).length
            const bisaDihapus = k !== 'Semua' && jumlahItem === 0
            return (
              <div key={k} className="relative group">
                <button
                  onClick={() => setFilterKategori(k)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: filterKategori === k ? 'var(--color-primary)' : 'var(--color-muted)',
                    color: filterKategori === k ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
                    paddingRight: bisaDihapus ? '1.5rem' : undefined,
                  }}
                >
                  {k}
                </button>
                {bisaDihapus && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Hapus kategori "${k}" dari daftar? (Tidak ada jenis sampah yang memakainya)`)) {
                        hapusKategoriDariUI(k)
                      }
                    }}
                    title={`Hapus kategori "${k}"`}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'var(--color-error)', color: 'white' }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
        >
          <Plus size={15} />
          Tambah Jenis Sampah
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl border border-[--color-border] p-5 flex flex-col gap-3 transition-all hover:shadow-sm"
            style={{ background: 'var(--color-card)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-muted)' }}
            >
              <Recycle size={20} style={{ color: kategoriColor[t.kategori] ?? 'var(--color-primary)' }} />
            </div>

            <div className="flex-1">
              <h4 className="font-semibold text-sm text-[--color-foreground] leading-tight mb-0.5">{t.jenis}</h4>
              <span
                className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: 'var(--color-muted)',
                  color: kategoriColor[t.kategori] ?? 'var(--color-muted-foreground)',
                }}
              >
                {t.kategori}
              </span>
              <p className="text-xs mt-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                {t.keterangan}
              </p>
            </div>

            <div className="flex items-end justify-between">
              <div
                className="text-lg font-bold leading-none"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}
              >
                {t.poinPerKg} pt/kg
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => openEdit(t)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                  style={{ background: 'var(--color-muted)' }}
                >
                  <Pencil size={12} style={{ color: 'var(--color-muted-foreground)' }} />
                </button>
                <button
                  onClick={() => setDeleteTarget(t.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                  style={{ background: 'var(--color-error-bg)' }}
                >
                  <Trash2 size={12} style={{ color: 'var(--color-error)' }} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-4 py-12 text-center" style={{ color: 'var(--color-muted-foreground)' }}>
            <Recycle size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Belum ada jenis sampah di kategori ini.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,18,8,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ background: 'var(--color-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                {editTarget ? 'Edit Jenis Sampah' : 'Tambah Jenis Sampah Baru'}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Jenis Sampah
                </label>
                <input
                  type="text"
                  value={form.jenis}
                  onChange={(e) => setForm((f) => ({ ...f, jenis: e.target.value }))}
                  placeholder="Botol PET"
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none focus:ring-2"
                  style={{
                    background: 'var(--color-background)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-foreground)',
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Kategori
                </label>

                {!kategoriCustom ? (
                  <select
                    value={form.kategori}
                    onChange={(e) => {
                      if (e.target.value === KATEGORI_BARU_SENTINEL) {
                        setKategoriCustom(true)
                        setForm((f) => ({ ...f, kategori: '' }))
                      } else {
                        setForm((f) => ({ ...f, kategori: e.target.value }))
                      }
                    }}
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                    style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                  >
                    {kategoriDinamis.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                    <option value={KATEGORI_BARU_SENTINEL}>✏️ Kategori baru...</option>
                  </select>
                ) : (
                  <>
                    <input
                      type="text"
                      autoFocus
                      value={form.kategori}
                      onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value }))}
                      placeholder="Ketik nama kategori baru"
                      className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none focus:ring-2"
                      style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setKategoriCustom(false)
                        setForm((f) => ({ ...f, kategori: kategoriDinamis[0] ?? '' }))
                      }}
                      className="text-xs mt-1.5 font-medium hover:underline"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      ← Pilih dari daftar yang sudah ada
                    </button>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Poin per Kg
                </label>
                <input
                  type="number"
                  value={form.poinPerKg || ''}
                  onChange={(e) => setForm((f) => ({ ...f, poinPerKg: Number(e.target.value) }))}
                  placeholder="50"
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Keterangan
                </label>
                <input
                  type="text"
                  value={form.keterangan}
                  onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Plastik PET harus bersih dan tidak terlipat"
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
              >
                <Check size={14} />
                {editTarget ? 'Simpan Perubahan' : 'Tambahkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,18,8,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-xl" style={{ background: 'var(--color-card)' }}>
            <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center mx-auto" style={{ background: 'var(--color-error-bg)' }}>
              <Trash2 size={22} style={{ color: 'var(--color-error)' }} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
              Hapus Jenis Sampah?
            </h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--color-muted-foreground)' }}>
              Jenis sampah yang dihapus tidak dapat dikembalikan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium hover:opacity-80"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
                style={{ background: 'var(--color-error)', color: 'white' }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
