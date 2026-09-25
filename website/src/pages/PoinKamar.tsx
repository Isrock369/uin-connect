import { useEffect, useState } from 'react'
import { Gift, ChevronDown, Trophy, X, Check, Plus, Pencil, Trash2, Users } from 'lucide-react'
import { formatTanggal } from '../lib/format'
import {
  getKamar, getAsrama, createKamar, updateKamar, deleteKamar as deleteKamarApi,
  getSetoran, getPenukaran, createPenukaran, getKatalog,
  type Asrama,
} from '../api/services'
import { ApiError } from '../api/client'
import type { Kamar, Setoran, Penukaran, BarangKatalog } from '../types'

interface KamarForm {
  nama: string
  asramaId: string
  jumlahSantri: number
}

const emptyKamarForm: KamarForm = { nama: '', asramaId: '', jumlahSantri: 0 }

const inputStyle: React.CSSProperties = {
  background: 'var(--color-background)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-foreground)',
}

export default function PoinKamar() {
  const [kamar, setKamar] = useState<Kamar[]>([])
  const [asramaList, setAsramaList] = useState<Asrama[]>([])
  const [setoranData, setSetoranData] = useState<Setoran[]>([])
  const [penukaran, setPenukaran] = useState<Penukaran[]>([])
  const [katalogData, setKatalogData] = useState<BarangKatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Redeem state
  const [redeemTarget, setRedeemTarget] = useState<Kamar | null>(null)
  const [selectedBarang, setSelectedBarang] = useState<BarangKatalog | null>(null)
  const [jumlah, setJumlah] = useState(1)
  const [redeemSubmitting, setRedeemSubmitting] = useState(false)

  // CRUD kamar state
  const [showKamarModal, setShowKamarModal] = useState(false)
  const [editKamarTarget, setEditKamarTarget] = useState<Kamar | null>(null)
  const [kamarForm, setKamarForm] = useState<KamarForm>(emptyKamarForm)
  const [deleteKamarTarget, setDeleteKamarTarget] = useState<string | null>(null)

  function loadAll() {
    setLoading(true)
    Promise.all([getKamar(), getAsrama(), getSetoran('disetujui'), getPenukaran(), getKatalog()])
      .then(([k, a, s, p, b]) => { setKamar(k); setAsramaList(a); setSetoranData(s); setPenukaran(p); setKatalogData(b) })
      .catch((e) => setErrorMsg(e instanceof ApiError ? e.message : 'Gagal memuat data.'))
      .finally(() => setLoading(false))
  }

  useEffect(loadAll, [])

  const sorted = [...kamar].sort((a, b) => b.poin - a.poin)

  // ── Kamar CRUD ─────────────────────────────────────────────────────────────
  function openAddKamar() {
    setEditKamarTarget(null)
    setKamarForm(emptyKamarForm)
    setShowKamarModal(true)
  }

  function openEditKamar(k: Kamar) {
    const asramaMatch = asramaList.find((a) => a.nama === k.asrama)
    setEditKamarTarget(k)
    setKamarForm({ nama: k.nama, asramaId: asramaMatch?.id || '', jumlahSantri: k.jumlahSantri })
    setShowKamarModal(true)
  }

  async function saveKamar() {
    if (!kamarForm.nama || !kamarForm.asramaId || kamarForm.jumlahSantri <= 0) return
    setErrorMsg(null)
    try {
      if (editKamarTarget) {
        await updateKamar(editKamarTarget.id, kamarForm)
      } else {
        await createKamar(kamarForm)
      }
      setShowKamarModal(false)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal menyimpan kamar.')
    }
  }

  async function deleteKamar(id: string) {
    setErrorMsg(null)
    try {
      await deleteKamarApi(id)
      setDeleteKamarTarget(null)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal menghapus kamar.')
    }
  }

  // ── Redeem ─────────────────────────────────────────────────────────────────
  async function handleRedeem() {
    if (!redeemTarget || !selectedBarang) return
    setRedeemSubmitting(true)
    setErrorMsg(null)
    try {
      await createPenukaran(redeemTarget.id, selectedBarang.id, jumlah)
      setRedeemTarget(null)
      setSelectedBarang(null)
      setJumlah(1)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal menukar poin.')
    } finally {
      setRedeemSubmitting(false)
    }
  }

  const setoranByKamar = (kamarId: string) =>
    setoranData.filter((s) => s.kamarId === kamarId && s.status === 'disetujui')
  const penukaranByKamar = (kamarId: string) => penukaran.filter((p) => p.kamarId === kamarId)

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Memuat data kamar...</p>
  }

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
          {errorMsg}
        </div>
      )}
      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Kamar', value: kamar.length, sub: 'terdaftar' },
          {
            label: 'Total Poin Beredar',
            value: kamar.reduce((s, k) => s + k.poin, 0).toLocaleString('id-ID'),
            sub: 'aktif saat ini',
          },
          {
            label: 'Poin Telah Ditukar',
            value: penukaran.reduce((s, p) => s + p.poinDigunakan, 0).toLocaleString('id-ID'),
            sub: 'sepanjang waktu',
          },
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

      {/* ── Table header ── */}
      <div className="flex items-center justify-between">
        <h3
          className="text-base font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}
        >
          Daftar Kamar
        </h3>
        <button
          onClick={openAddKamar}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity"
          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
        >
          <Plus size={15} />
          Tambah Kamar
        </button>
      </div>

      {/* ── Kamar list ── */}
      <div
        className="rounded-2xl border border-[--color-border] overflow-hidden"
        style={{ background: 'var(--color-card)' }}
      >
        <div className="divide-y divide-[--color-border]">
          {sorted.map((k, i) => {
            const isOpen = expanded === k.id
            const setoranK = setoranByKamar(k.id)
            const penukaranK = penukaranByKamar(k.id)

            return (
              <div key={k.id}>
                <div className="flex items-center gap-4 px-4 py-4">
                  {/* Rank / trophy */}
                  <div
                    className="w-8 text-center shrink-0 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : k.id)}
                  >
                    {i === 0 ? (
                      <Trophy size={18} style={{ color: 'var(--color-accent)' }} />
                    ) : (
                      <span
                        className="text-sm font-bold"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-muted-foreground)',
                        }}
                      >
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Name & meta */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : k.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[--color-foreground]">{k.nama}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: 'var(--color-muted)',
                          color: 'var(--color-muted-foreground)',
                        }}
                      >
                        {k.asrama}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[--color-muted-foreground] mt-0.5">
                      <Users size={11} />
                      <span>{k.jumlahSantri} santri</span>
                      {k.lastSetoran && (
                        <span>· Setoran terakhir: {formatTanggal(k.lastSetoran)}</span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div
                    className="text-right shrink-0 cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : k.id)}
                  >
                    <div
                      className="text-xl font-bold"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}
                    >
                      {k.poin.toLocaleString('id-ID')}
                    </div>
                    <div className="text-xs text-[--color-muted-foreground]">poin</div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      onClick={() => {
                        setRedeemTarget(k)
                        setSelectedBarang(null)
                        setJumlah(1)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-80"
                      style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
                    >
                      <Gift size={12} />
                      Tukar
                    </button>
                    <button
                      onClick={() => openEditKamar(k)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
                      style={{ background: 'var(--color-muted)' }}
                      title="Edit kamar"
                    >
                      <Pencil size={12} style={{ color: 'var(--color-muted-foreground)' }} />
                    </button>
                    <button
                      onClick={() => setDeleteKamarTarget(k.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
                      style={{ background: 'var(--color-error-bg)' }}
                      title="Hapus kamar"
                    >
                      <Trash2 size={12} style={{ color: 'var(--color-error)' }} />
                    </button>
                    <button
                      onClick={() => setExpanded(isOpen ? null : k.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:opacity-70 transition-opacity"
                      style={{ background: 'var(--color-muted)' }}
                    >
                      <ChevronDown
                        size={14}
                        style={{
                          color: 'var(--color-muted-foreground)',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 150ms',
                        }}
                      />
                    </button>
                  </div>
                </div>

                {/* Expanded history */}
                {isOpen && (
                  <div className="px-4 pb-4" style={{ background: 'var(--color-background)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                      <div>
                        <h4
                          className="text-xs font-semibold uppercase tracking-wider mb-2"
                          style={{ color: 'var(--color-muted-foreground)' }}
                        >
                          Riwayat Setoran Disetujui
                        </h4>
                        {setoranK.length === 0 ? (
                          <p className="text-xs text-[--color-muted-foreground]">
                            Belum ada setoran disetujui.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {setoranK.map((s) => (
                              <div key={s.id} className="flex justify-between text-xs">
                                <span style={{ color: 'var(--color-muted-foreground)' }}>
                                  {formatTanggal(s.tanggal)} · {s.jenisSampah} {s.berat}kg
                                </span>
                                <span
                                  className="font-semibold"
                                  style={{
                                    color: 'var(--color-primary)',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                >
                                  +{s.poin}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div>
                        <h4
                          className="text-xs font-semibold uppercase tracking-wider mb-2"
                          style={{ color: 'var(--color-muted-foreground)' }}
                        >
                          Riwayat Penukaran
                        </h4>
                        {penukaranK.length === 0 ? (
                          <p className="text-xs text-[--color-muted-foreground]">Belum ada penukaran.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {penukaranK.map((p) => (
                              <div key={p.id} className="flex justify-between text-xs">
                                <span style={{ color: 'var(--color-muted-foreground)' }}>
                                  {formatTanggal(p.tanggal)} · {p.barangNama} ×{p.jumlah}
                                </span>
                                <span
                                  className="font-semibold"
                                  style={{
                                    color: 'var(--color-error)',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                >
                                  -{p.poinDigunakan}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {kamar.length === 0 && (
            <div className="py-12 text-center" style={{ color: 'var(--color-muted-foreground)' }}>
              <Users size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Belum ada kamar terdaftar.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Tambah / Edit Kamar ── */}
      {showKamarModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,18,8,0.5)' }}
        >
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ background: 'var(--color-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-lg font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}
              >
                {editKamarTarget ? 'Edit Kamar' : 'Tambah Kamar Baru'}
              </h3>
              <button onClick={() => setShowKamarModal(false)}>
                <X size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  Nama Kamar
                </label>
                <input
                  type="text"
                  value={kamarForm.nama}
                  onChange={(e) => setKamarForm((f) => ({ ...f, nama: e.target.value }))}
                  placeholder="Al-Amanah"
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  Asrama
                </label>
                <select
                  value={kamarForm.asramaId}
                  onChange={(e) => setKamarForm((f) => ({ ...f, asramaId: e.target.value }))}
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={inputStyle}
                >
                  <option value="">Pilih asrama…</option>
                  {asramaList.map((a) => (
                    <option key={a.id} value={a.id}>{a.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="block text-xs font-semibold mb-1.5 uppercase tracking-wider"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  Jumlah Santri
                </label>
                <input
                  type="number"
                  min="1"
                  value={kamarForm.jumlahSantri || ''}
                  onChange={(e) => setKamarForm((f) => ({ ...f, jumlahSantri: parseInt(e.target.value) || 0 }))}
                  placeholder="8"
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowKamarModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                Batal
              </button>
              <button
                onClick={saveKamar}
                disabled={!kamarForm.nama || !kamarForm.asramaId || kamarForm.jumlahSantri <= 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
              >
                <Check size={14} />
                {editKamarTarget ? 'Simpan Perubahan' : 'Tambahkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Hapus Kamar ── */}
      {deleteKamarTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,18,8,0.5)' }}
        >
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-xl" style={{ background: 'var(--color-card)' }}>
            <div
              className="w-12 h-12 rounded-full mb-4 flex items-center justify-center mx-auto"
              style={{ background: 'var(--color-error-bg)' }}
            >
              <Trash2 size={22} style={{ color: 'var(--color-error)' }} />
            </div>
            <h3
              className="text-lg font-semibold text-center mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}
            >
              Hapus Kamar?
            </h3>
            <p className="text-sm text-center mb-5" style={{ color: 'var(--color-muted-foreground)' }}>
              Data kamar dan riwayat penukarannya akan dihapus permanen.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteKamarTarget(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium hover:opacity-80"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                Batal
              </button>
              <button
                onClick={() => deleteKamar(deleteKamarTarget)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
                style={{ background: 'var(--color-error)', color: 'white' }}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Tukar Poin ── */}
      {redeemTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,18,8,0.5)' }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--color-card)' }}
          >
            <div className="flex items-start justify-between mb-1">
              <h3
                className="text-lg font-semibold"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}
              >
                Tukar Poin — {redeemTarget.nama}
              </h3>
              <button onClick={() => setRedeemTarget(null)} className="p-1 hover:opacity-60 transition-opacity">
                <X size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--color-muted-foreground)' }}>
              Saldo:{' '}
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                {redeemTarget.poin.toLocaleString('id-ID')} poin
              </strong>
            </p>

            <div className="grid grid-cols-2 gap-2 mb-5">
              {katalogData
                .filter((b) => b.stok > 0)
                .map((b) => {
                  const canAfford = redeemTarget.poin >= b.hargaPoin
                  const isSelected = selectedBarang?.id === b.id
                  return (
                    <button
                      key={b.id}
                      onClick={() => { setSelectedBarang(b); setJumlah(1) }}
                      disabled={!canAfford}
                      className="text-left p-3 rounded-xl border-2 transition-all"
                      style={{
                        borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                        background: isSelected
                          ? 'var(--color-secondary)'
                          : canAfford
                            ? 'var(--color-background)'
                            : 'var(--color-muted)',
                        opacity: canAfford ? 1 : 0.5,
                        cursor: canAfford ? 'pointer' : 'not-allowed',
                      }}
                    >
                      <div className="text-sm font-semibold text-[--color-foreground] mb-0.5">
                        {b.nama}
                      </div>
                      <div
                        className="text-xs font-bold"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}
                      >
                        {b.hargaPoin} pt
                      </div>
                      <div className="text-xs text-[--color-muted-foreground]">Stok: {b.stok}</div>
                    </button>
                  )
                })}
            </div>

            {selectedBarang && (
              <div
                className="mb-5 p-4 rounded-xl border border-[--color-border]"
                style={{ background: 'var(--color-background)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[--color-foreground]">Jumlah</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setJumlah((j) => Math.max(1, j - 1))}
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-lg transition-opacity hover:opacity-60"
                      style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}
                    >
                      −
                    </button>
                    <span
                      className="text-base font-bold w-6 text-center"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-foreground)' }}
                    >
                      {jumlah}
                    </span>
                    <button
                      onClick={() => {
                        const maxJ = Math.floor(redeemTarget.poin / selectedBarang.hargaPoin)
                        setJumlah((j) => Math.min(selectedBarang.stok, maxJ, j + 1))
                      }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-lg transition-opacity hover:opacity-60"
                      style={{ background: 'var(--color-muted)', color: 'var(--color-foreground)' }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--color-muted-foreground)' }}>Total poin digunakan</span>
                  <span
                    className="font-bold"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}
                  >
                    {(selectedBarang.hargaPoin * jumlah).toLocaleString('id-ID')} pt
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span style={{ color: 'var(--color-muted-foreground)' }}>Sisa poin setelah tukar</span>
                  <span
                    className="font-bold"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-foreground)' }}
                  >
                    {(redeemTarget.poin - selectedBarang.hargaPoin * jumlah).toLocaleString('id-ID')} pt
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRedeemTarget(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                Batal
              </button>
              <button
                onClick={handleRedeem}
                disabled={!selectedBarang || redeemSubmitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
              >
                <Check size={14} />
                {redeemSubmitting ? 'Memproses...' : 'Konfirmasi Penukaran'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
