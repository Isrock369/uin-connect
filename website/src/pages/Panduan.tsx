import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Check, BookOpen, Clock, Eye, EyeOff } from 'lucide-react'
import { formatTanggal } from '../lib/format'
import { getModul, createModul, updateModul, deleteModul } from '../api/services'
import { ApiError } from '../api/client'
import type { Modul, StatusModul } from '../types'

const kategoriList = ['Semua', 'Cara Pilah', 'Cara Setor', 'Pengolahan Organik', 'Dampak Lingkungan']

const kategoriColor: Record<string, { bg: string; text: string }> = {
  'Cara Pilah': { bg: 'var(--color-secondary)', text: 'var(--color-secondary-foreground)' },
  'Cara Setor': { bg: 'var(--color-accent-light)', text: 'var(--color-foreground)' },
  'Pengolahan Organik': { bg: '#D1FAE5', text: '#065F46' },
  'Dampak Lingkungan': { bg: '#DBEAFE', text: '#1E3A8A' },
}

interface ModulForm {
  judul: string
  kategori: string
  deskripsi: string
  konten: string
  durasi: number
  status: StatusModul
  icon: string
}

const emptyForm: ModulForm = {
  judul: '',
  kategori: 'Cara Pilah',
  deskripsi: '',
  konten: '',
  durasi: 5,
  status: 'draft',
  icon: '📄',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-background)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-foreground)',
}

const iconOptions = ['📄', '♻️', '📦', '🔬', '🌱', '🐛', '🌍', '📋', '💡', '🎓', '⚠️', '✅']

export default function Panduan() {
  const [modul, setModul] = useState<Modul[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [filterKategori, setFilterKategori] = useState('Semua')
  const [selectedModul, setSelectedModul] = useState<Modul | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Modul | null>(null)
  const [form, setForm] = useState<ModulForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  function loadAll() {
    setLoading(true)
    getModul()
      .then(setModul)
      .catch((e) => setErrorMsg(e instanceof ApiError ? e.message : 'Gagal memuat modul.'))
      .finally(() => setLoading(false))
  }

  useEffect(loadAll, [])

  const filtered =
    filterKategori === 'Semua' ? modul : modul.filter((m) => m.kategori === filterKategori)
  const published = modul.filter((m) => m.status === 'published').length

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(m: Modul) {
    setEditTarget(m)
    setForm({
      judul: m.judul,
      kategori: m.kategori,
      deskripsi: m.deskripsi,
      konten: m.konten,
      durasi: m.durasi,
      status: m.status,
      icon: m.icon,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.judul || !form.deskripsi) return
    setErrorMsg(null)
    try {
      if (editTarget) {
        await updateModul(editTarget.id, form)
      } else {
        await createModul(form)
      }
      setShowModal(false)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal menyimpan modul.')
    }
  }

  async function handleDelete(id: string) {
    setErrorMsg(null)
    try {
      await deleteModul(id)
      setDeleteTarget(null)
      if (selectedModul?.id === id) setSelectedModul(null)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal menghapus modul.')
    }
  }

  async function toggleStatus(m: Modul) {
    setErrorMsg(null)
    try {
      const newStatus: StatusModul = m.status === 'published' ? 'draft' : 'published'
      await updateModul(m.id, { ...m, status: newStatus })
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal mengubah status modul.')
    }
  }

  function renderKonten(konten: string) {
    return konten.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={i} className="font-semibold mt-4 mb-1" style={{ color: 'var(--color-foreground)' }}>
            {line.slice(2, -2)}
          </p>
        )
      }
      if (line.match(/^\d+\./)) {
        return (
          <p key={i} className="ml-4 text-sm mb-1" style={{ color: 'var(--color-foreground)' }}>
            {line}
          </p>
        )
      }
      if (line.startsWith('-') || line.startsWith('✅') || line.startsWith('🔢') || line.startsWith('🦟') || line.startsWith('💧') || line.startsWith('🌡️') || line.startsWith('🌿')) {
        return (
          <p key={i} className="ml-2 text-sm mb-1" style={{ color: 'var(--color-foreground)' }}>
            {line}
          </p>
        )
      }
      if (line === '') return <div key={i} className="h-2" />
      return (
        <p key={i} className="text-sm mb-1" style={{ color: 'var(--color-foreground)' }}>
          {line}
        </p>
      )
    })
  }

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
          {errorMsg}
        </div>
      )}
      {loading && (
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Memuat modul edukasi...</p>
      )}
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Modul', value: modul.length, sub: 'tersedia' },
          { label: 'Dipublikasikan', value: published, sub: 'aktif untuk santri' },
          { label: 'Draft', value: modul.length - published, sub: 'belum dipublikasi' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-5 border border-[--color-border]"
            style={{ background: 'var(--color-card)' }}
          >
            <div
              className="text-2xl font-bold mb-1"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}
            >
              {stat.value}
            </div>
            <div className="text-sm font-medium text-[--color-foreground]">{stat.label}</div>
            <div className="text-xs text-[--color-muted-foreground]">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters + Add */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
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
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity shrink-0"
          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
        >
          <Plus size={15} />
          Tambah Modul
        </button>
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {filtered.map((m) => {
          const kat = kategoriColor[m.kategori] ?? { bg: 'var(--color-muted)', text: 'var(--color-muted-foreground)' }
          return (
            <div
              key={m.id}
              className="rounded-2xl border border-[--color-border] p-5 flex gap-4 transition-all hover:shadow-sm cursor-pointer"
              style={{ background: 'var(--color-card)', opacity: m.status === 'draft' ? 0.75 : 1 }}
              onClick={() => setSelectedModul(m)}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ background: 'var(--color-muted)' }}
              >
                {m.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4
                    className="font-semibold text-sm leading-tight"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}
                  >
                    {m.judul}
                  </h4>
                  {m.status === 'draft' && (
                    <span
                      className="shrink-0 text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                    >
                      Draft
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: kat.bg, color: kat.text }}
                  >
                    {m.kategori}
                  </span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    <Clock size={10} />
                    {m.durasi} menit baca
                  </span>
                </div>

                <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--color-muted-foreground)' }}>
                  {m.deskripsi}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedModul(m) }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium hover:opacity-70 transition-opacity"
                    style={{ background: 'var(--color-secondary)', color: 'var(--color-secondary-foreground)' }}
                  >
                    <BookOpen size={11} />
                    Baca
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleStatus(m) }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium hover:opacity-70 transition-opacity"
                    style={{
                      background: m.status === 'published' ? 'var(--color-success-bg)' : 'var(--color-muted)',
                      color: m.status === 'published' ? 'var(--color-success)' : 'var(--color-muted-foreground)',
                    }}
                  >
                    {m.status === 'published' ? <Eye size={11} /> : <EyeOff size={11} />}
                    {m.status === 'published' ? 'Publik' : 'Draft'}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(m) }}
                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity ml-auto"
                    style={{ background: 'var(--color-muted)' }}
                  >
                    <Pencil size={11} style={{ color: 'var(--color-muted-foreground)' }} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(m.id) }}
                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
                    style={{ background: 'var(--color-error-bg)' }}
                  >
                    <Trash2 size={11} style={{ color: 'var(--color-error)' }} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-2 py-12 text-center" style={{ color: 'var(--color-muted-foreground)' }}>
            <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Tidak ada modul di kategori ini.</p>
          </div>
        )}
      </div>

      {/* ── Modal: Baca Modul ── */}
      {selectedModul && !showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,18,8,0.55)' }}>
          <div
            className="w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]"
            style={{ background: 'var(--color-card)' }}
          >
            <div className="flex items-start justify-between p-6 border-b border-[--color-border]">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: 'var(--color-muted)' }}
                >
                  {selectedModul.icon}
                </div>
                <div>
                  <h3
                    className="text-lg font-semibold leading-tight"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}
                  >
                    {selectedModul.judul}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {(() => {
                      const kat = kategoriColor[selectedModul.kategori] ?? { bg: 'var(--color-muted)', text: 'var(--color-muted-foreground)' }
                      return (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: kat.bg, color: kat.text }}>
                          {selectedModul.kategori}
                        </span>
                      )
                    })()}
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      <Clock size={10} />
                      {selectedModul.durasi} menit baca · Dibuat {formatTanggal(selectedModul.tanggalDibuat)}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedModul(null)} className="p-1 hover:opacity-60">
                <X size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="leading-relaxed">{renderKonten(selectedModul.konten)}</div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-[--color-border]">
              <button
                onClick={() => { openEdit(selectedModul); setSelectedModul(null) }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-70"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                <Pencil size={13} />
                Edit Modul
              </button>
              <button
                onClick={() => setSelectedModul(null)}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-80"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Tambah / Edit Modul ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,18,8,0.55)' }}>
          <div
            className="w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[92vh]"
            style={{ background: 'var(--color-card)' }}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[--color-border] shrink-0">
              <h3
                className="text-lg font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}
              >
                {editTarget ? 'Edit Modul' : 'Tambah Modul Baru'}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Icon picker */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Ikon
                </label>
                <div className="flex gap-2 flex-wrap">
                  {iconOptions.map((ico) => (
                    <button
                      key={ico}
                      onClick={() => setForm((f) => ({ ...f, icon: ico }))}
                      className="w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 transition-all"
                      style={{
                        borderColor: form.icon === ico ? 'var(--color-primary)' : 'var(--color-border)',
                        background: form.icon === ico ? 'var(--color-secondary)' : 'var(--color-background)',
                      }}
                    >
                      {ico}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Judul Modul
                </label>
                <input
                  type="text"
                  value={form.judul}
                  onChange={(e) => setForm((f) => ({ ...f, judul: e.target.value }))}
                  placeholder="Cara Memilah Sampah Organik…"
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                    Kategori
                  </label>
                  <select
                    value={form.kategori}
                    onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value }))}
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                    style={inputStyle}
                  >
                    {kategoriList.filter((k) => k !== 'Semua').map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                    Durasi Baca (menit)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.durasi || ''}
                    onChange={(e) => setForm((f) => ({ ...f, durasi: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Deskripsi Singkat
                </label>
                <textarea
                  value={form.deskripsi}
                  onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
                  placeholder="Pengantar singkat isi modul…"
                  rows={2}
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none resize-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Konten Modul
                </label>
                <textarea
                  value={form.konten}
                  onChange={(e) => setForm((f) => ({ ...f, konten: e.target.value }))}
                  placeholder="Tulis isi modul di sini… Gunakan **teks** untuk judul, dan baris baru untuk paragraf."
                  rows={8}
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none resize-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['draft', 'published'] as StatusModul[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm((f) => ({ ...f, status: s }))}
                      className="py-2.5 rounded-xl text-sm font-semibold border-2 transition-all"
                      style={{
                        borderColor: form.status === s ? 'var(--color-primary)' : 'var(--color-border)',
                        background: form.status === s ? 'var(--color-secondary)' : 'var(--color-background)',
                        color: form.status === s ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                      }}
                    >
                      {s === 'draft' ? '📝 Draft' : '✅ Publikasikan'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[--color-border] shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={!form.judul || !form.deskripsi}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
              >
                <Check size={14} />
                {editTarget ? 'Simpan Perubahan' : 'Simpan Modul'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Hapus ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,18,8,0.5)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-xl" style={{ background: 'var(--color-card)' }}>
            <div className="w-12 h-12 rounded-full mb-4 flex items-center justify-center mx-auto" style={{ background: 'var(--color-error-bg)' }}>
              <Trash2 size={22} style={{ color: 'var(--color-error)' }} />
            </div>
            <h3 className="text-lg font-semibold text-center mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
              Hapus Modul?
            </h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--color-muted-foreground)' }}>
              Modul yang dihapus tidak dapat dikembalikan.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 rounded-xl text-sm font-medium hover:opacity-80" style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                Batal
              </button>
              <button onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2 rounded-xl text-sm font-semibold hover:opacity-80" style={{ background: 'var(--color-error)', color: 'white' }}>
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
