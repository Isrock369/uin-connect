import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, Recycle } from 'lucide-react'
import { getTarifSampah, createTarifSampah, updateTarifSampah, deleteTarifSampah } from '../api/services'
import { ApiError } from '../api/client'
import type { TarifSampah } from '../types'

// Kategori bawaan, hanya dipakai sebagai starting point / saran awal.
// Kategori BARU yang diketik user di form akan otomatis tergabung ke sini
// begitu tersimpan di database (kolom `kategori` di tabel tarif_sampah
// memang sudah bertipe teks bebas, jadi tidak perlu migrasi apa pun).
// Dipakai sebagai SARAN di dropdown form tambah/edit saja (supaya admin
// tetap gampang pilih kategori umum walau belum ada itemnya sama sekali).
// TIDAK dipakai untuk filter atas — filter atas murni ikut data asli.
const defaultKategori = ['Plastik', 'Kertas', 'Logam', 'Kaca', 'Lainnya']

// Kategori bawaan yang pernah dihapus lewat modal "Kelola Kategori" (hanya
// berlaku untuk kategori yang belum punya item sama sekali), disimpan di
// browser admin ini supaya tidak muncul lagi jadi saran di form.
const HIDDEN_KEY = 'kategoriSampah_hidden'
function loadHiddenKategori(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]')
  } catch {
    return []
  }
}

// Kalau kategori bawaan (yang masih kosong, belum ada itemnya) di-rename
// lewat modal "Kelola Kategori", tidak ada baris data yang bisa diupdate ke
// API, jadi pemetaan nama lama -> nama baru disimpan di sini.
const RENAME_KEY = 'kategoriSampah_renames'
function loadKategoriRenames(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(RENAME_KEY) || '{}')
  } catch {
    return {}
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
  // deleteTarget sekarang menyimpan id item yang popover konfirmasinya sedang terbuka
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [kategoriCustom, setKategoriCustom] = useState(false)
  const [hiddenKategori, setHiddenKategori] = useState<string[]>(loadHiddenKategori)
  const [kategoriRenames, setKategoriRenames] = useState<Record<string, string>>(loadKategoriRenames)

  const [showKelolaKategori, setShowKelolaKategori] = useState(false)
  const [editingKategori, setEditingKategori] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [kelolaError, setKelolaError] = useState<string | null>(null)
  const [kelolaBusy, setKelolaBusy] = useState<string | null>(null)

  const KATEGORI_BARU_SENTINEL = '__kategori_baru__'

  function loadAll() {
    setLoading(true)
    getTarifSampah()
      .then(setTarif)
      .catch((e) => setErrorMsg(e instanceof ApiError ? e.message : 'Gagal memuat data tarif sampah.'))
      .finally(() => setLoading(false))
  }

  useEffect(loadAll, [])

  // Filter atas: HANYA kategori yang benar-benar sedang dipakai (punya
  // minimal 1 item). Otomatis hilang sendiri kalau item terakhirnya
  // dihapus/diganti kategori lain — tidak perlu tombol hapus manual.
  const kategoriTerpakai = Array.from(new Set(tarif.map((t) => t.kategori))).sort((a, b) =>
    a.localeCompare(b)
  )
  const kategoriList = ['Semua', ...kategoriTerpakai]

  // Saran di dropdown form: gabungan preset umum (dengan nama barunya kalau
  // pernah di-rename, dan dikecualikan kalau pernah dihapus) + kategori yang
  // sudah pernah dipakai di data, supaya admin tetap bisa pilih kategori
  // umum meski belum ada itemnya.
  const namaDefaultTampil = defaultKategori
    .map((k) => kategoriRenames[k] ?? k)
    .filter((k) => !hiddenKategori.includes(k))

  const kategoriSaranForm = Array.from(new Set([...namaDefaultTampil, ...kategoriTerpakai])).sort(
    (a, b) => a.localeCompare(b)
  )

  function mulaiEditKategori(nama: string) {
    setKelolaError(null)
    setEditingKategori(nama)
    setRenameValue(nama)
  }

  async function simpanRenameKategori(oldName: string) {
    const newName = renameValue.trim()
    if (!newName) {
      setKelolaError('Nama kategori tidak boleh kosong.')
      return
    }
    if (newName === oldName) {
      setEditingKategori(null)
      return
    }
    if (kategoriSaranForm.includes(newName)) {
      setKelolaError(`Kategori "${newName}" sudah ada.`)
      return
    }

    setKelolaError(null)
    setKelolaBusy(oldName)
    try {
      // Semua jenis sampah yang sedang memakai kategori ini ikut diupdate ke nama baru.
      const items = tarif.filter((t) => t.kategori === oldName)
      for (const item of items) {
        await updateTarifSampah(item.id, {
          jenis: item.jenis,
          kategori: newName,
          poinPerKg: item.poinPerKg,
          keterangan: item.keterangan,
        })
      }

      // Kalau nama lama itu salah satu kategori bawaan (mungkin belum punya
      // data sama sekali), simpan pemetaan nama barunya juga.
      const namaAsli = Object.keys(kategoriRenames).find((k) => (kategoriRenames[k] ?? k) === oldName) ?? oldName
      if (defaultKategori.includes(namaAsli)) {
        setKategoriRenames((prev) => {
          const next = { ...prev, [namaAsli]: newName }
          localStorage.setItem(RENAME_KEY, JSON.stringify(next))
          return next
        })
      }

      if (items.length > 0) loadAll()
      if (filterKategori === oldName) setFilterKategori('Semua')
      setEditingKategori(null)
    } catch (e) {
      setKelolaError(e instanceof ApiError ? e.message : 'Gagal mengubah nama kategori.')
    } finally {
      setKelolaBusy(null)
    }
  }

  function handleHapusKategoriSaran(nama: string) {
    const jumlah = tarif.filter((t) => t.kategori === nama).length
    if (jumlah > 0) {
      setKelolaError(`Tidak bisa dihapus — masih dipakai ${jumlah} jenis sampah. Ubah dulu kategorinya, atau ganti namanya lewat tombol edit.`)
      return
    }
    setKelolaError(null)
    setHiddenKategori((prev) => {
      const next = [...prev, nama]
      localStorage.setItem(HIDDEN_KEY, JSON.stringify(next))
      return next
    })
  }

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
    setKategoriCustom(!kategoriSaranForm.includes(t.kategori))
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
          {kategoriList.map((k) => (
            <button
              key={k}
              onClick={() => setFilterKategori(k)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: filterKategori === k ? 'var(--color-primary)' : 'var(--color-muted)',
                color: filterKategori === k ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
              }}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => {
              setKelolaError(null)
              setEditingKategori(null)
              setShowKelolaKategori(true)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)', background: 'var(--color-card)' }}
          >
            <Pencil size={14} />
            Kelola Kategori
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
          >
            <Plus size={15} />
            Tambah Jenis Sampah
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="relative rounded-2xl border border-[--color-border] p-5 flex flex-col gap-3 transition-all hover:shadow-sm"
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
                  onClick={() => setDeleteTarget(deleteTarget === t.id ? null : t.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                  style={{ background: 'var(--color-error-bg)' }}
                >
                  <Trash2 size={12} style={{ color: 'var(--color-error)' }} />
                </button>
              </div>
            </div>

            {deleteTarget === t.id && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDeleteTarget(null)} />
                <div
                  className="absolute z-50 right-0 bottom-14 w-56 rounded-xl border p-3 shadow-lg"
                  style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-xs mb-3" style={{ color: 'var(--color-foreground)' }}>
                    Hapus <strong>{t.jenis}</strong>? Tidak bisa dikembalikan.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium hover:opacity-80"
                      style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80"
                      style={{ background: 'var(--color-error)', color: 'white' }}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-4 py-12 text-center" style={{ color: 'var(--color-muted-foreground)' }}>
            <Recycle size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Belum ada jenis sampah di kategori ini.</p>
          </div>
        )}
      </div>

      {showKelolaKategori && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,18,8,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ background: 'var(--color-card)' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Kelola Kategori
              </h3>
              <button onClick={() => setShowKelolaKategori(false)}>
                <X size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--color-muted-foreground)' }}>
              Ubah nama atau hapus kategori yang tidak dipakai lagi.
            </p>

            {kelolaError && (
              <div className="rounded-xl p-3 text-sm mb-3" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
                {kelolaError}
              </div>
            )}

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {kategoriSaranForm.map((k) => {
                const jumlahItem = tarif.filter((t) => t.kategori === k).length
                const sedangEdit = editingKategori === k
                const sedangProses = kelolaBusy === k
                return (
                  <div
                    key={k}
                    className="flex items-center gap-2 rounded-xl border px-3 py-2.5"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
                  >
                    {sedangEdit ? (
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') simpanRenameKategori(k)
                          if (e.key === 'Escape') setEditingKategori(null)
                        }}
                        className="flex-1 text-sm px-2 py-1 rounded-lg border focus:outline-none focus:ring-2"
                        style={{ background: 'var(--color-card)', borderColor: 'var(--color-primary)', color: 'var(--color-foreground)' }}
                      />
                    ) : (
                      <div className="flex-1 text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                        {k}
                        <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-muted-foreground)' }}>
                          {jumlahItem > 0 ? `· ${jumlahItem} jenis` : '· belum dipakai'}
                        </span>
                      </div>
                    )}

                    {sedangEdit ? (
                      <>
                        <button
                          onClick={() => simpanRenameKategori(k)}
                          disabled={sedangProses}
                          title="Simpan"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-50"
                          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingKategori(null)}
                          title="Batal"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                          style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => mulaiEditKategori(k)}
                          title="Ubah nama"
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80"
                          style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleHapusKategoriSaran(k)}
                          disabled={jumlahItem > 0}
                          title={jumlahItem > 0 ? 'Tidak bisa dihapus, masih dipakai' : 'Hapus kategori'}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:opacity-30"
                          style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}

              {kategoriSaranForm.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--color-muted-foreground)' }}>
                  Belum ada kategori.
                </p>
              )}
            </div>

            <div className="flex justify-end mt-5">
              <button
                onClick={() => setShowKelolaKategori(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
                style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

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
                    {kategoriSaranForm.map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                    <option value={KATEGORI_BARU_SENTINEL}>Kategori baru</option>
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
                        setForm((f) => ({ ...f, kategori: kategoriSaranForm[0] ?? '' }))
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
    </div>
  )
}
