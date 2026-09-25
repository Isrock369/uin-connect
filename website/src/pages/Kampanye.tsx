import { useEffect, useState } from 'react'
import { Plus, X, Check, Pencil, Trash2, Calendar, Phone, AlertCircle, Megaphone } from 'lucide-react'
import { formatTanggal } from '../lib/format'
import { getKampanye, createKampanye, updateKampanye, deleteKampanye } from '../api/services'
import { ApiError } from '../api/client'
import type { Kampanye, StatusKampanye } from '../types'

const statusConfig: Record<StatusKampanye, { label: string; bg: string; text: string; dot: string }> = {
  aktif: { label: 'Aktif', bg: 'var(--color-success-bg)', text: 'var(--color-success)', dot: '#1B7A40' },
  mendatang: { label: 'Mendatang', bg: 'var(--color-warning-bg)', text: 'var(--color-warning)', dot: '#C8962B' },
  selesai: { label: 'Selesai', bg: 'var(--color-muted)', text: 'var(--color-muted-foreground)', dot: '#9CA3AF' },
}

const jenisSampahOptions = [
  'Plastik PET', 'Plastik Keras', 'Plastik Campuran',
  'Kertas Kardus', 'Kertas Koran', 'Kaca', 'Logam', 'Kaleng Aluminium',
]

interface KampanyeForm {
  mitra: string
  logoEmoji: string
  judulKampanye: string
  deskripsi: string
  jenisSampah: string[]
  bonusKeterangan: string
  periodeMultai: string
  periodeSelesai: string
  status: StatusKampanye
  kontak: string
  syarat: string
}

const emptyForm: KampanyeForm = {
  mitra: '',
  logoEmoji: '🏢',
  judulKampanye: '',
  deskripsi: '',
  jenisSampah: [],
  bonusKeterangan: '',
  periodeMultai: '',
  periodeSelesai: '',
  status: 'mendatang',
  kontak: '',
  syarat: '',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-background)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-foreground)',
}

const logoOptions = ['🏢', '🏦', '🌿', '🧴', '📄', '🏛️', '🌍', '🔬', '💡', '🤝', '♻️', '🎯']

export default function Kampanye() {
  const [kampanye, setKampanye] = useState<Kampanye[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<'semua' | StatusKampanye>('semua')
  const [selected, setSelected] = useState<Kampanye | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Kampanye | null>(null)
  const [form, setForm] = useState<KampanyeForm>(emptyForm)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  function loadAll() {
    setLoading(true)
    getKampanye()
      .then(setKampanye)
      .catch((e) => setErrorMsg(e instanceof ApiError ? e.message : 'Gagal memuat kampanye.'))
      .finally(() => setLoading(false))
  }

  useEffect(loadAll, [])

  const filtered = filterStatus === 'semua' ? kampanye : kampanye.filter((k) => k.status === filterStatus)
  const aktif = kampanye.filter((k) => k.status === 'aktif').length
  const mendatang = kampanye.filter((k) => k.status === 'mendatang').length

  function openAdd() {
    setEditTarget(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(k: Kampanye) {
    setEditTarget(k)
    setForm({
      mitra: k.mitra,
      logoEmoji: k.logoEmoji,
      judulKampanye: k.judulKampanye,
      deskripsi: k.deskripsi,
      jenisSampah: [...k.jenisSampah],
      bonusKeterangan: k.bonusKeterangan,
      periodeMultai: k.periodeMultai,
      periodeSelesai: k.periodeSelesai,
      status: k.status,
      kontak: k.kontak,
      syarat: k.syarat,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.mitra || !form.judulKampanye || !form.periodeMultai || !form.periodeSelesai) return
    setErrorMsg(null)
    try {
      if (editTarget) {
        await updateKampanye(editTarget.id, form)
      } else {
        await createKampanye(form)
      }
      setShowModal(false)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal menyimpan kampanye.')
    }
  }

  async function handleDelete(id: string) {
    setErrorMsg(null)
    try {
      await deleteKampanye(id)
      setDeleteTarget(null)
      if (selected?.id === id) setSelected(null)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal menghapus kampanye.')
    }
  }

  function toggleJenis(jenis: string) {
    setForm((f) => ({
      ...f,
      jenisSampah: f.jenisSampah.includes(jenis)
        ? f.jenisSampah.filter((j) => j !== jenis)
        : [...f.jenisSampah, jenis],
    }))
  }

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Memuat kampanye mitra...</p>
  }

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
          {errorMsg}
        </div>
      )}
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Kampanye Aktif', value: aktif, sub: 'sedang berjalan', color: 'var(--color-success)' },
          { label: 'Akan Datang', value: mendatang, sub: 'segera dimulai', color: 'var(--color-warning)' },
          { label: 'Total Mitra', value: new Set(kampanye.map((k) => k.mitra)).size, sub: 'terdaftar', color: 'var(--color-primary)' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-5 border border-[--color-border]" style={{ background: 'var(--color-card)' }}>
            <div className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-mono)', color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-sm font-medium text-[--color-foreground]">{stat.label}</div>
            <div className="text-xs text-[--color-muted-foreground]">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Active campaign banner */}
      {aktif > 0 && (
        <div
          className="rounded-2xl border p-4 flex items-start gap-3"
          style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-success)' }}
        >
          <Megaphone size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-success)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
              {aktif} kampanye mitra sedang aktif!
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
              Informasikan ke santri agar dapat memanfaatkan bonus poin dan reward dari mitra.
            </p>
          </div>
        </div>
      )}

      {/* Filter + Add */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {(['semua', 'aktif', 'mendatang', 'selesai'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
              style={{
                background: filterStatus === s ? 'var(--color-primary)' : 'var(--color-muted)',
                color: filterStatus === s ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
              }}
            >
              {s === 'semua' ? 'Semua' : statusConfig[s as StatusKampanye].label}
            </button>
          ))}
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity shrink-0"
          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
        >
          <Plus size={15} />
          Tambah Kampanye
        </button>
      </div>

      {/* Campaign cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {filtered.map((k) => {
          const cfg = statusConfig[k.status]
          return (
            <div
              key={k.id}
              className="rounded-2xl border border-[--color-border] overflow-hidden transition-all hover:shadow-sm cursor-pointer"
              style={{ background: 'var(--color-card)' }}
              onClick={() => setSelected(k)}
            >
              {/* Card header */}
              <div
                className="px-5 py-4 flex items-center justify-between border-b border-[--color-border]"
                style={{ background: k.status === 'aktif' ? 'var(--color-secondary)' : 'var(--color-muted)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ background: 'var(--color-card)' }}
                  >
                    {k.logoEmoji}
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                      {k.mitra}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ background: cfg.dot }}
                  />
                  <span className="text-xs font-semibold" style={{ color: cfg.text }}>
                    {cfg.label}
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div className="px-5 py-4">
                <h4
                  className="font-semibold text-base mb-1 leading-snug"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}
                >
                  {k.judulKampanye}
                </h4>
                <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--color-muted-foreground)' }}>
                  {k.deskripsi}
                </p>

                {/* Bonus highlight */}
                <div
                  className="rounded-xl px-3 py-2 mb-3 text-sm font-semibold"
                  style={{
                    background: k.status === 'aktif' ? 'var(--color-accent-light)' : 'var(--color-muted)',
                    color: k.status === 'aktif' ? 'var(--color-foreground)' : 'var(--color-muted-foreground)',
                  }}
                >
                  🎁 {k.bonusKeterangan}
                </div>

                {/* Period + waste types */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    <Calendar size={11} />
                    <span>
                      {formatTanggal(k.periodeMultai)} – {formatTanggal(k.periodeSelesai)}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {k.jenisSampah.slice(0, 2).map((j) => (
                      <span
                        key={j}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-secondary)', color: 'var(--color-secondary-foreground)' }}
                      >
                        {j}
                      </span>
                    ))}
                    {k.jenisSampah.length > 2 && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                      >
                        +{k.jenisSampah.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card footer */}
              <div className="px-5 py-3 border-t border-[--color-border] flex justify-end gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(k) }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium hover:opacity-70"
                  style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                >
                  <Pencil size={11} /> Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteTarget(k.id) }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium hover:opacity-70"
                  style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}
                >
                  <Trash2 size={11} /> Hapus
                </button>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-2 py-12 text-center" style={{ color: 'var(--color-muted-foreground)' }}>
            <Megaphone size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Tidak ada kampanye dengan status ini.</p>
          </div>
        )}
      </div>

      {/* ── Modal: Detail Kampanye ── */}
      {selected && !showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,18,8,0.55)' }}>
          <div className="w-full max-w-xl rounded-2xl shadow-xl flex flex-col max-h-[92vh]" style={{ background: 'var(--color-card)' }}>
            {/* Header */}
            <div
              className="px-6 py-5 border-b border-[--color-border] flex items-start gap-4"
              style={{ background: selected.status === 'aktif' ? 'var(--color-secondary)' : 'var(--color-muted)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{ background: 'var(--color-card)' }}>
                {selected.logoEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                  {selected.mitra}
                </div>
                <h3 className="text-lg font-semibold leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                  {selected.judulKampanye}
                </h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: statusConfig[selected.status].dot }} />
                  <span className="text-xs font-semibold" style={{ color: statusConfig[selected.status].text }}>
                    {statusConfig[selected.status].label}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="hover:opacity-60">
                <X size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-sm" style={{ color: 'var(--color-foreground)', lineHeight: 1.7 }}>
                {selected.deskripsi}
              </p>

              <div className="rounded-xl p-4" style={{ background: 'var(--color-accent-light)' }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-muted-foreground)' }}>
                  Reward / Bonus
                </div>
                <div className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                  🎁 {selected.bonusKeterangan}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted-foreground)' }}>
                    Periode
                  </div>
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-foreground)' }}>
                    <Calendar size={13} style={{ color: 'var(--color-primary)' }} />
                    {formatTanggal(selected.periodeMultai)} –<br />{formatTanggal(selected.periodeSelesai)}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--color-muted-foreground)' }}>
                    Jenis Sampah
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {selected.jenisSampah.map((j) => (
                      <span key={j} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--color-secondary)', color: 'var(--color-secondary-foreground)' }}>
                        {j}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {selected.syarat && (
                <div className="rounded-xl p-4 border border-[--color-border]" style={{ background: 'var(--color-background)' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertCircle size={13} style={{ color: 'var(--color-warning)' }} />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                      Syarat & Ketentuan
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-foreground)', lineHeight: 1.6 }}>
                    {selected.syarat}
                  </p>
                </div>
              )}

              {selected.kontak && (
                <div className="flex items-start gap-2">
                  <Phone size={13} className="mt-0.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                      Kontak Mitra
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>{selected.kontak}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-[--color-border] shrink-0">
              <button
                onClick={() => { openEdit(selected); setSelected(null) }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium hover:opacity-70"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                <Pencil size={13} /> Edit Kampanye
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-80"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Tambah / Edit Kampanye ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,18,8,0.55)' }}>
          <div className="w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[92vh]" style={{ background: 'var(--color-card)' }}>
            <div className="flex items-center justify-between px-6 py-5 border-b border-[--color-border] shrink-0">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                {editTarget ? 'Edit Kampanye' : 'Tambah Kampanye Mitra'}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Logo emoji */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Logo Mitra
                </label>
                <div className="flex gap-2 flex-wrap">
                  {logoOptions.map((ico) => (
                    <button
                      key={ico}
                      onClick={() => setForm((f) => ({ ...f, logoEmoji: ico }))}
                      className="w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 transition-all"
                      style={{
                        borderColor: form.logoEmoji === ico ? 'var(--color-primary)' : 'var(--color-border)',
                        background: form.logoEmoji === ico ? 'var(--color-secondary)' : 'var(--color-background)',
                      }}
                    >
                      {ico}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                    Nama Mitra
                  </label>
                  <input type="text" value={form.mitra} onChange={(e) => setForm((f) => ({ ...f, mitra: e.target.value }))}
                    placeholder="PT / Lembaga / Organisasi" className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                    Status Kampanye
                  </label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as StatusKampanye }))}
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none" style={inputStyle}>
                    <option value="mendatang">Mendatang</option>
                    <option value="aktif">Aktif</option>
                    <option value="selesai">Selesai</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Judul Kampanye
                </label>
                <input type="text" value={form.judulKampanye} onChange={(e) => setForm((f) => ({ ...f, judulKampanye: e.target.value }))}
                  placeholder="Bonus Poin 2× untuk Plastik PET…" className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none" style={inputStyle} />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Deskripsi
                </label>
                <textarea value={form.deskripsi} onChange={(e) => setForm((f) => ({ ...f, deskripsi: e.target.value }))}
                  placeholder="Jelaskan tujuan dan detail kampanye ini…" rows={3}
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none resize-none" style={inputStyle} />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Keterangan Bonus / Reward
                </label>
                <input type="text" value={form.bonusKeterangan} onChange={(e) => setForm((f) => ({ ...f, bonusKeterangan: e.target.value }))}
                  placeholder="2× poin untuk Plastik PET selama periode kampanye"
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none" style={inputStyle} />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Jenis Sampah yang Dicakup
                </label>
                <div className="flex gap-2 flex-wrap">
                  {jenisSampahOptions.map((j) => (
                    <button
                      key={j}
                      onClick={() => toggleJenis(j)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all"
                      style={{
                        borderColor: form.jenisSampah.includes(j) ? 'var(--color-primary)' : 'var(--color-border)',
                        background: form.jenisSampah.includes(j) ? 'var(--color-secondary)' : 'var(--color-background)',
                        color: form.jenisSampah.includes(j) ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                      }}
                    >
                      {j}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                    Periode Mulai
                  </label>
                  <input type="date" value={form.periodeMultai} onChange={(e) => setForm((f) => ({ ...f, periodeMultai: e.target.value }))}
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                    Periode Selesai
                  </label>
                  <input type="date" value={form.periodeSelesai} onChange={(e) => setForm((f) => ({ ...f, periodeSelesai: e.target.value }))}
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none" style={inputStyle} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Kontak Mitra
                </label>
                <input type="text" value={form.kontak} onChange={(e) => setForm((f) => ({ ...f, kontak: e.target.value }))}
                  placeholder="email@mitra.com / 08xx-xxxx-xxxx"
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none" style={inputStyle} />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                  Syarat & Ketentuan
                </label>
                <textarea value={form.syarat} onChange={(e) => setForm((f) => ({ ...f, syarat: e.target.value }))}
                  placeholder="Syarat partisipasi, batasan, dll…" rows={3}
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none resize-none" style={inputStyle} />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[--color-border] shrink-0">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={!form.mitra || !form.judulKampanye || !form.periodeMultai || !form.periodeSelesai}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                <Check size={14} />
                {editTarget ? 'Simpan Perubahan' : 'Tambah Kampanye'}
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
              Hapus Kampanye?
            </h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--color-muted-foreground)' }}>
              Data kampanye yang dihapus tidak dapat dikembalikan.
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
