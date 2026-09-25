import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, Package, AlertTriangle } from 'lucide-react'
import { getKatalog, createBarang, updateBarang, deleteBarang } from '../api/services'
import { ApiError } from '../api/client'
import type { BarangKatalog } from '../types'

const kategoriList = ['Semua', 'Kebutuhan Mandi', 'Alat Tulis', 'Kebersihan', 'Makanan']

const kategoriColor: Record<string, string> = {
  'Kebutuhan Mandi': 'var(--color-primary)',
  'Alat Tulis': 'var(--color-accent)',
  'Kebersihan': '#6B7280',
  'Makanan': '#D97706',
}

interface BarangForm {
  nama: string
  kategori: string
  hargaPoin: number
  stok: number
  deskripsi: string
}

const emptyForm: BarangForm = { nama: '', kategori: 'Kebutuhan Mandi', hargaPoin: 0, stok: 0, deskripsi: '' }

export default function KatalogBarang() {
  const [barang, setBarang] = useState<BarangKatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [filterKategori, setFilterKategori] = useState('Semua')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<BarangKatalog | null>(null)
  const [form, setForm] = useState<BarangForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  function loadAll() {
    setLoading(true)
    getKatalog()
      .then(setBarang)
      .catch((e) => setErrorMsg(e instanceof ApiError ? e.message : 'Gagal memuat katalog.'))
      .finally(() => setLoading(false))
  }

  useEffect(loadAll, [])

  const filtered =
    filterKategori === 'Semua' ? barang : barang.filter((b) => b.kategori === filterKategori)

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(b: BarangKatalog) {
    setEditTarget(b)
    setForm({ nama: b.nama, kategori: b.kategori, hargaPoin: b.hargaPoin, stok: b.stok, deskripsi: b.deskripsi })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.nama || form.hargaPoin <= 0) return
    setErrorMsg(null)
    try {
      if (editTarget) {
        await updateBarang(editTarget.id, form)
      } else {
        await createBarang(form)
      }
      setShowModal(false)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal menyimpan barang.')
    }
  }

  async function handleDelete(id: string) {
    setErrorMsg(null)
    try {
      await deleteBarang(id)
      setDeleteTarget(null)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal menghapus barang.')
    }
  }

  const lowStockItems = barang.filter((b) => b.stok < 10).length

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Memuat katalog barang...</p>
  }

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
          {errorMsg}
        </div>
      )}
      {lowStockItems > 0 && (
        <div
          className="rounded-2xl border p-4 flex items-center gap-3"
          style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning)' }}
        >
          <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} className="shrink-0" />
          <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>
            <strong>{lowStockItems} barang</strong> memiliki stok di bawah 10. Segera restok.
          </p>
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
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
        >
          <Plus size={15} />
          Tambah Barang
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {filtered.map((b) => (
          <div
            key={b.id}
            className="rounded-2xl border border-[--color-border] p-5 flex flex-col gap-3 transition-all hover:shadow-sm"
            style={{ background: 'var(--color-card)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-muted)' }}
            >
              <Package size={20} style={{ color: kategoriColor[b.kategori] ?? 'var(--color-primary)' }} />
            </div>

            <div className="flex-1">
              <h4 className="font-semibold text-sm text-[--color-foreground] leading-tight mb-0.5">{b.nama}</h4>
              <span
                className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: 'var(--color-muted)',
                  color: kategoriColor[b.kategori] ?? 'var(--color-muted-foreground)',
                }}
              >
                {b.kategori}
              </span>
              <p className="text-xs mt-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                {b.deskripsi}
              </p>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div
                  className="text-lg font-bold leading-none"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}
                >
                  {b.hargaPoin} pt
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: b.stok < 10 ? 'var(--color-error)' : 'var(--color-muted-foreground)' }}
                >
                  Stok: {b.stok}
                  {b.stok < 10 && ' ⚠'}
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => openEdit(b)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:opacity-70"
                  style={{ background: 'var(--color-muted)' }}
                >
                  <Pencil size={12} style={{ color: 'var(--color-muted-foreground)' }} />
                </button>
                <button
                  onClick={() => setDeleteTarget(b.id)}
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
            <Package size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Tidak ada barang di kategori ini.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,18,8,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ background: 'var(--color-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                {editTarget ? 'Edit Barang' : 'Tambah Barang Baru'}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>

            <div className="space-y-4">
              {(
                [
                  { label: 'Nama Barang', key: 'nama', type: 'text', placeholder: 'Sabun mandi batang' },
                ] as const
              ).map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    value={String(form[key])}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none focus:ring-2"
                    style={{
                      background: 'var(--color-background)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-foreground)',
                    }}
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Kategori
                </label>
                <select
                  value={form.kategori}
                  onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value }))}
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                >
                  {kategoriList.filter((k) => k !== 'Semua').map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                    Harga Poin
                  </label>
                  <input
                    type="number"
                    value={form.hargaPoin || ''}
                    onChange={(e) => setForm((f) => ({ ...f, hargaPoin: Number(e.target.value) }))}
                    placeholder="200"
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                    style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                    Stok
                  </label>
                  <input
                    type="number"
                    value={form.stok || ''}
                    onChange={(e) => setForm((f) => ({ ...f, stok: Number(e.target.value) }))}
                    placeholder="50"
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                    style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Deskripsi
                </label>
                <input
                  type="text"
                  value={form.deskripsi}
                  onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
                  placeholder="Deskripsi singkat barang"
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
              Hapus Barang?
            </h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--color-muted-foreground)' }}>
              Barang yang dihapus tidak dapat dikembalikan.
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
