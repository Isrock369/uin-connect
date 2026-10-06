import { useEffect, useState } from 'react'
import { Check, X, AlertCircle, Filter, Plus, Pencil, Trash2, Camera } from 'lucide-react'
import { formatTanggal } from '../lib/format'
import { getSetoran, getKamar, getTarifSampah, verifikasiSetoran, updateSetoran, deleteSetoran, getFotoSetoranIds, getFotoSetoran } from '../api/services'
import { ApiError } from '../api/client'
import type { Setoran, StatusSetoran, Kamar, TarifSampah } from '../types'

const statusLabel: Record<StatusSetoran, string> = {
  menunggu: 'Menunggu',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
}

function StatusBadge({ status }: { status: StatusSetoran }) {
  const styles: Record<StatusSetoran, string> = {
    menunggu: 'bg-[--color-warning-bg] text-[--color-warning]',
    disetujui: 'bg-[--color-success-bg] text-[--color-success]',
    ditolak: 'bg-[--color-error-bg] text-[--color-error]',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status]}`}>
      {statusLabel[status]}
    </span>
  )
}

interface SetoranForm {
  kamarId: string
  piket: string
  tarifSampahId: string
  berat: number
}

interface SetoranEditForm extends SetoranForm {
  tanggal: string
}

const emptyForm: SetoranForm = { kamarId: '', piket: '', tarifSampahId: '', berat: 0 }
const emptyEditForm: SetoranEditForm = { kamarId: '', piket: '', tarifSampahId: '', berat: 0, tanggal: '' }

type FilterTab = 'semua' | StatusSetoran

function InputField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--color-background)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-foreground)',
}

export default function VerifikasiSetoran() {
  const [setoran, setSetoran] = useState<Setoran[]>([])
  const [kamarData, setKamarData] = useState<Kamar[]>([])
  const [tarifSampah, setTarifSampah] = useState<TarifSampah[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<FilterTab>('semua')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [form, setForm] = useState<SetoranForm>(emptyForm)
  const [editTarget, setEditTarget] = useState<Setoran | null>(null)
  const [editForm, setEditForm] = useState<SetoranEditForm>(emptyEditForm)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Setoran | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [fotoIds, setFotoIds] = useState<Set<string>>(new Set())
  const [fotoTarget, setFotoTarget] = useState<Setoran | null>(null)
  const [fotoUrl, setFotoUrl] = useState<string | null>(null)
  const [fotoLoading, setFotoLoading] = useState(false)
  const [fotoError, setFotoError] = useState<string | null>(null)

  function loadAll() {
    setLoading(true)
    Promise.all([
      getSetoran(),
      getKamar(),
      getTarifSampah(),
      getFotoSetoranIds().catch(() => ({ ids: [] as number[] })), // foto bersifat tambahan, jangan sampai merusak halaman
    ])
      .then(([s, k, t, f]) => {
        setSetoran(s); setKamarData(k); setTarifSampah(t)
        setFotoIds(new Set(f.ids.map(String)))
      })
      .catch((e) => setErrorMsg(e instanceof ApiError ? e.message : 'Gagal memuat data.'))
      .finally(() => setLoading(false))
  }

  useEffect(loadAll, [])

  const tabs: { id: FilterTab; label: string }[] = [
    { id: 'semua', label: `Semua (${setoran.length})` },
    { id: 'menunggu', label: `Menunggu (${setoran.filter((s) => s.status === 'menunggu').length})` },
    { id: 'disetujui', label: `Disetujui (${setoran.filter((s) => s.status === 'disetujui').length})` },
    { id: 'ditolak', label: `Ditolak (${setoran.filter((s) => s.status === 'ditolak').length})` },
  ]

  const filtered = activeTab === 'semua' ? setoran : setoran.filter((s) => s.status === activeTab)
  const sorted = [...filtered].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())

  const selectedTarif = tarifSampah.find((t) => t.id === form.tarifSampahId)
  const estimasiPoin = selectedTarif && form.berat > 0 ? Math.round(selectedTarif.poinPerKg * form.berat) : 0

  function openFoto(s: Setoran) {
    setFotoTarget(s)
    setFotoUrl(null)
    setFotoError(null)
    setFotoLoading(true)
    getFotoSetoran(s.id)
      .then((blob) => setFotoUrl(URL.createObjectURL(blob)))
      .catch((e) => setFotoError(e instanceof ApiError ? e.message : 'Gagal memuat foto.'))
      .finally(() => setFotoLoading(false))
  }

  function closeFoto() {
    if (fotoUrl) URL.revokeObjectURL(fotoUrl)
    setFotoTarget(null)
    setFotoUrl(null)
    setFotoError(null)
  }

  async function approve(id: string) {
    setBusyId(id)
    setErrorMsg(null)
    try {
      await verifikasiSetoran(id, 'disetujui')
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal menyetujui setoran.')
    } finally {
      setBusyId(null)
    }
  }

  async function reject(id: string) {
    setBusyId(id)
    setErrorMsg(null)
    try {
      await verifikasiSetoran(id, 'ditolak', rejectNote || 'Tidak memenuhi syarat.')
      setRejectTarget(null)
      setRejectNote('')
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal menolak setoran.')
    } finally {
      setBusyId(null)
    }
  }

  async function handleAdd() {
    if (!form.kamarId || !form.piket || !form.tarifSampahId || form.berat <= 0) return
    setErrorMsg(null)
    try {
      const { apiFetch } = await import('../api/client')
      await apiFetch('/setoran', {
        method: 'POST',
        auth: false,
        body: { kamarId: form.kamarId, tarifSampahId: form.tarifSampahId, piket: form.piket, berat: form.berat },
      })
      setShowAddModal(false)
      setForm(emptyForm)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal mencatat setoran.')
    }
  }

  function openEdit(s: Setoran) {
    const tarifMatch = tarifSampah.find((t) => t.jenis === s.jenisSampah)
    setEditTarget(s)
    setEditForm({
      kamarId: s.kamarId,
      piket: s.piket,
      tarifSampahId: tarifMatch?.id || '',
      berat: s.berat,
      tanggal: s.tanggal,
    })
    setErrorMsg(null)
  }

  async function saveEdit() {
    if (!editTarget || !editForm.kamarId || !editForm.piket || !editForm.tarifSampahId || editForm.berat <= 0) return
    setEditSubmitting(true)
    setErrorMsg(null)
    try {
      await updateSetoran(editTarget.id, editForm)
      setEditTarget(null)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal memperbarui setoran.')
    } finally {
      setEditSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleteSubmitting(true)
    setErrorMsg(null)
    try {
      await deleteSetoran(deleteTarget.id)
      setDeleteTarget(null)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal menghapus setoran.')
      setDeleteTarget(null)
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const editSelectedTarif = tarifSampah.find((t) => t.id === editForm.tarifSampahId)
  const editEstimasiPoin = editSelectedTarif && editForm.berat > 0 ? Math.round(editSelectedTarif.poinPerKg * editForm.berat) : 0

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Memuat data setoran...</p>
  }

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border p-4 flex items-start gap-3"
        style={{ background: 'var(--color-warning-bg)', borderColor: 'var(--color-warning)' }}
      >
        <AlertCircle size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--color-warning)' }} />
        <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>
          <strong>Alur setoran:</strong> Santri timbang sampah lewat <em>Portal Santri</em> → data masuk ke sini
          otomatis → pengurus verifikasi di sini → poin masuk ke saldo kamar. Setoran yang ditolak tidak
          mendapatkan poin.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
          {errorMsg}
        </div>
      )}

      <div className="rounded-2xl border border-[--color-border] overflow-hidden" style={{ background: 'var(--color-card)' }}>
        <div className="p-4 border-b border-[--color-border] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter size={14} style={{ color: 'var(--color-muted-foreground)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--color-muted-foreground)' }}>Filter:</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-muted)',
                    color: activeTab === tab.id ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => { setShowAddModal(true); setForm(emptyForm) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity shrink-0"
            style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
          >
            <Plus size={15} />
            Catat Setoran Baru
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--color-muted)' }}>
                {['Tanggal', 'Kamar', 'Piket', 'Jenis Sampah', 'Berat', 'Poin', 'Status', 'Aksi'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    Tidak ada data setoran.
                  </td>
                </tr>
              )}
              {sorted.map((s, i) => (
                <tr
                  key={s.id}
                  className="border-t border-[--color-border] transition-colors hover:bg-[--color-muted]/30"
                  style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(237,231,220,0.2)' }}
                >
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted-foreground)', fontFamily: 'var(--font-mono)' }}>
                    {formatTanggal(s.tanggal)}
                  </td>
                  <td className="px-4 py-3"><span className="font-semibold text-[--color-foreground]">{s.kamarNama}</span></td>
                  <td className="px-4 py-3 text-[--color-muted-foreground]">{s.piket}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium" style={{ background: 'var(--color-secondary)', color: 'var(--color-secondary-foreground)' }}>
                      {s.jenisSampah}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-foreground)' }}>{s.berat} kg</td>
                  <td className="px-4 py-3 font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                    {s.poin > 0 ? `+${s.poin}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <StatusBadge status={s.status} />
                      {s.catatan && s.status === 'ditolak' && (
                        <p className="text-xs mt-1 italic" style={{ color: 'var(--color-error)' }}>{s.catatan}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 items-center flex-wrap">
                      {s.status === 'menunggu' && (
                        <>
                          <button
                            onClick={() => approve(s.id)}
                            disabled={busyId === s.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                            style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}
                          >
                            <Check size={12} />
                            Setujui
                          </button>
                          <button
                            onClick={() => setRejectTarget(s.id)}
                            disabled={busyId === s.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80 disabled:opacity-50"
                            style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}
                          >
                            <X size={12} />
                            Tolak
                          </button>
                        </>
                      )}
                      {fotoIds.has(String(s.id)) && (
                        <button
                          onClick={() => openFoto(s)}
                          title="Lihat foto bukti"
                          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-70"
                          style={{ background: 'var(--color-secondary)' }}
                        >
                          <Camera size={12} style={{ color: 'var(--color-primary)' }} />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(s)}
                        title="Edit setoran"
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-70"
                        style={{ background: 'var(--color-muted)' }}
                      >
                        <Pencil size={12} style={{ color: 'var(--color-muted-foreground)' }} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(s)}
                        title="Hapus setoran"
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-all hover:opacity-70"
                        style={{ background: 'var(--color-error-bg)' }}
                      >
                        <Trash2 size={12} style={{ color: 'var(--color-error)' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {fotoTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,18,8,0.6)' }}
          onClick={closeFoto}
        >
          <div
            className="w-full max-w-xl rounded-2xl p-5 shadow-xl"
            style={{ background: 'var(--color-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                  Foto Bukti Setoran
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  {fotoTarget.kamarNama} · {fotoTarget.jenisSampah} · {fotoTarget.berat} kg · {formatTanggal(fotoTarget.tanggal)}
                </p>
              </div>
              <button onClick={closeFoto} className="p-1 hover:opacity-60 transition-opacity" aria-label="Tutup">
                <X size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>
            <div
              className="w-full rounded-xl overflow-hidden flex items-center justify-center"
              style={{ background: 'var(--color-muted)', minHeight: 200 }}
            >
              {fotoLoading && <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Memuat foto…</p>}
              {fotoError && <p className="text-sm" style={{ color: 'var(--color-error)' }}>{fotoError}</p>}
              {fotoUrl && <img src={fotoUrl} alt="Foto bukti setoran" className="w-full h-auto block" />}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,18,8,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 shadow-xl" style={{ background: 'var(--color-card)' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Catat Setoran Sampah
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:opacity-60 transition-opacity">
                <X size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--color-muted-foreground)' }}>
              Dipakai pengurus untuk mencatat manual (biasanya setoran dikirim otomatis dari Portal Santri).
              Setoran akan berstatus <strong>Menunggu</strong> hingga diverifikasi.
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Kamar">
                  <select
                    value={form.kamarId}
                    onChange={(e) => setForm((f) => ({ ...f, kamarId: e.target.value }))}
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                    style={inputStyle}
                  >
                    <option value="">Pilih kamar…</option>
                    {kamarData.map((k) => (
                      <option key={k.id} value={k.id}>{k.nama} ({k.asrama})</option>
                    ))}
                  </select>
                </InputField>

                <InputField label="Nama Piket">
                  <input
                    type="text"
                    value={form.piket}
                    onChange={(e) => setForm((f) => ({ ...f, piket: e.target.value }))}
                    placeholder="Nama santri piket"
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                    style={inputStyle}
                  />
                </InputField>
              </div>

              <InputField label="Jenis Sampah">
                <select
                  value={form.tarifSampahId}
                  onChange={(e) => setForm((f) => ({ ...f, tarifSampahId: e.target.value }))}
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={inputStyle}
                >
                  <option value="">Pilih jenis sampah…</option>
                  {tarifSampah.map((t) => (
                    <option key={t.id} value={t.id}>{t.jenis} — {t.poinPerKg} pt/kg</option>
                  ))}
                </select>
              </InputField>

              <InputField label="Berat (kg)">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={form.berat || ''}
                  onChange={(e) => setForm((f) => ({ ...f, berat: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.0"
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={inputStyle}
                />
              </InputField>

              {estimasiPoin > 0 && (
                <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'var(--color-secondary)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-secondary-foreground)' }}>Estimasi Poin</span>
                  <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                    +{estimasiPoin} pt
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                Batal
              </button>
              <button
                onClick={handleAdd}
                disabled={!form.kamarId || !form.piket || !form.tarifSampahId || form.berat <= 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
              >
                <Check size={14} />
                Simpan Setoran
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,18,8,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ background: 'var(--color-card)' }}>
            <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
              Tolak Setoran
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-muted-foreground)' }}>
              Berikan alasan penolakan agar santri dapat memperbaiki setoran berikutnya.
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Contoh: Sampah masih bercampur dengan organik, perlu dipilah ulang."
              rows={3}
              className="w-full rounded-xl border text-sm p-3 resize-none focus:outline-none"
              style={inputStyle}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setRejectTarget(null); setRejectNote('') }}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                Batal
              </button>
              <button
                onClick={() => reject(rejectTarget)}
                disabled={busyId === rejectTarget}
                className="px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
                style={{ background: 'var(--color-error)', color: 'white' }}
              >
                Konfirmasi Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,18,8,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 shadow-xl" style={{ background: 'var(--color-card)' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Edit Setoran
              </h3>
              <button onClick={() => setEditTarget(null)} className="p-1 hover:opacity-60 transition-opacity">
                <X size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>
            <p className="text-sm mb-5" style={{ color: 'var(--color-muted-foreground)' }}>
              {editTarget.status === 'disetujui'
                ? 'Setoran ini sudah disetujui — poin di saldo kamar akan otomatis disesuaikan mengikuti perubahan.'
                : 'Ubah data setoran sebelum diverifikasi.'}
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Kamar">
                  <select
                    value={editForm.kamarId}
                    onChange={(e) => setEditForm((f) => ({ ...f, kamarId: e.target.value }))}
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                    style={inputStyle}
                  >
                    <option value="">Pilih kamar…</option>
                    {kamarData.map((k) => (
                      <option key={k.id} value={k.id}>{k.nama} ({k.asrama})</option>
                    ))}
                  </select>
                </InputField>

                <InputField label="Nama Piket">
                  <input
                    type="text"
                    value={editForm.piket}
                    onChange={(e) => setEditForm((f) => ({ ...f, piket: e.target.value }))}
                    placeholder="Nama santri piket"
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                    style={inputStyle}
                  />
                </InputField>
              </div>

              <InputField label="Jenis Sampah">
                <select
                  value={editForm.tarifSampahId}
                  onChange={(e) => setEditForm((f) => ({ ...f, tarifSampahId: e.target.value }))}
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={inputStyle}
                >
                  <option value="">Pilih jenis sampah…</option>
                  {tarifSampah.map((t) => (
                    <option key={t.id} value={t.id}>{t.jenis} — {t.poinPerKg} pt/kg</option>
                  ))}
                </select>
              </InputField>

              <InputField label="Berat (kg)">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={editForm.berat || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, berat: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.0"
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={inputStyle}
                />
              </InputField>

              {editEstimasiPoin > 0 && (
                <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: 'var(--color-secondary)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-secondary-foreground)' }}>Poin (setelah diubah)</span>
                  <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                    {editEstimasiPoin} pt
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                Batal
              </button>
              <button
                onClick={saveEdit}
                disabled={!editForm.kamarId || !editForm.piket || !editForm.tarifSampahId || editForm.berat <= 0 || editSubmitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
              >
                <Check size={14} />
                {editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
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
              Hapus Setoran?
            </h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--color-muted-foreground)' }}>
              {deleteTarget.status === 'disetujui'
                ? `Setoran ${deleteTarget.kamarNama} ini sudah disetujui — ${deleteTarget.poin} poin akan otomatis dikurangi dari saldo kamar.`
                : `Setoran ${deleteTarget.kamarNama} ini akan dihapus permanen.`}
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
                onClick={confirmDelete}
                disabled={deleteSubmitting}
                className="flex-1 py-2 rounded-xl text-sm font-semibold hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--color-error)', color: 'white' }}
              >
                {deleteSubmitting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
