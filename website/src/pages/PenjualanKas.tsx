import { useEffect, useState } from 'react'
import { Plus, X, Check, TrendingUp, TrendingDown, Leaf } from 'lucide-react'
import { formatRupiah, formatTanggal } from '../lib/format'
import { getPenjualan, createPenjualan, getKas, createKas } from '../api/services'
import { ApiError } from '../api/client'
import type { PenjualanOrganik, TransaksiKas } from '../types'

type TabId = 'penjualan' | 'kas'

const produkOrganik = ['Kompos', 'Pakan Maggot']

interface PenjualanForm {
  pembeli: string
  produk: string
  jumlah: number
  hargaPerKg: number
  tanggal: string
}

interface KasForm {
  keterangan: string
  jenis: 'masuk' | 'keluar'
  jumlah: number
  tanggal: string
}

const emptyPenjualan: PenjualanForm = {
  pembeli: '',
  produk: 'Kompos',
  jumlah: 0,
  hargaPerKg: 3000,
  tanggal: new Date().toISOString().slice(0, 10),
}

const emptyKas: KasForm = {
  keterangan: '',
  jenis: 'masuk',
  jumlah: 0,
  tanggal: new Date().toISOString().slice(0, 10),
}

export default function PenjualanKas() {
  const [activeTab, setActiveTab] = useState<TabId>('penjualan')
  const [penjualan, setPenjualan] = useState<PenjualanOrganik[]>([])
  const [kas, setKas] = useState<TransaksiKas[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showPenjualanModal, setShowPenjualanModal] = useState(false)
  const [showKasModal, setShowKasModal] = useState(false)
  const [penjualanForm, setPenjualanForm] = useState<PenjualanForm>(emptyPenjualan)
  const [kasForm, setKasForm] = useState<KasForm>(emptyKas)

  function loadAll() {
    setLoading(true)
    Promise.all([getPenjualan(), getKas()])
      .then(([p, k]) => { setPenjualan(p); setKas(k) })
      .catch((e) => setErrorMsg(e instanceof ApiError ? e.message : 'Gagal memuat data.'))
      .finally(() => setLoading(false))
  }

  useEffect(loadAll, [])

  const totalPenjualan = penjualan.reduce((s, p) => s + p.total, 0)
  const saldoKas = kas.reduce((acc, t) => (t.jenis === 'masuk' ? acc + t.jumlah : acc - t.jumlah), 0)
  const totalMasuk = kas.filter((t) => t.jenis === 'masuk').reduce((s, t) => s + t.jumlah, 0)
  const totalKeluar = kas.filter((t) => t.jenis === 'keluar').reduce((s, t) => s + t.jumlah, 0)

  async function addPenjualan() {
    if (!penjualanForm.pembeli || penjualanForm.jumlah <= 0) return
    setErrorMsg(null)
    try {
      await createPenjualan(penjualanForm)
      setShowPenjualanModal(false)
      setPenjualanForm(emptyPenjualan)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal mencatat penjualan.')
    }
  }

  async function addKas() {
    if (!kasForm.keterangan || kasForm.jumlah <= 0) return
    setErrorMsg(null)
    try {
      await createKas(kasForm)
      setShowKasModal(false)
      setKasForm(emptyKas)
      loadAll()
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : 'Gagal mencatat transaksi kas.')
    }
  }

  const sortedKas = [...kas].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
  let running = kas
    .sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
    .reduce((acc, t) => (t.jenis === 'masuk' ? acc + t.jumlah : acc - t.jumlah), 0)
  const kasWithBalance = sortedKas.map((t) => {
    const bal = running
    if (t.jenis === 'masuk') running -= t.jumlah
    else running += t.jumlah
    return { ...t, saldo: bal }
  })

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Memuat data penjualan & kas...</p>
  }

  return (
    <div className="space-y-5">
      {errorMsg && (
        <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
          {errorMsg}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[--color-border] p-5" style={{ background: 'var(--color-card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Leaf size={16} style={{ color: 'var(--color-primary)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
              Pendapatan Organik
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}>
            {formatRupiah(totalPenjualan)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {penjualan.length} transaksi · Sep 2026
          </div>
        </div>
        <div className="rounded-2xl border border-[--color-border] p-5" style={{ background: 'var(--color-card)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} style={{ color: 'var(--color-success)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
              Total Masuk
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-success)' }}>
            {formatRupiah(totalMasuk)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>Sep 2026</div>
        </div>
        <div className="rounded-2xl border border-[--color-border] p-5" style={{ background: 'var(--color-primary)' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} style={{ color: 'rgba(245,240,232,0.7)' }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(245,240,232,0.7)' }}>
              Saldo Kas Pondok
            </span>
          </div>
          <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary-foreground)' }}>
            {formatRupiah(saldoKas)}
          </div>
          <div className="text-xs mt-1" style={{ color: 'rgba(245,240,232,0.6)' }}>
            Keluar: {formatRupiah(totalKeluar)}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[--color-border]">
        {(['penjualan', 'kas'] as TabId[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px"
            style={{
              borderColor: activeTab === tab ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
            }}
          >
            {tab === 'penjualan' ? 'Penjualan Organik' : 'Buku Kas Pondok'}
          </button>
        ))}
      </div>

      {activeTab === 'penjualan' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowPenjualanModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
            >
              <Plus size={15} />
              Catat Penjualan
            </button>
          </div>

          <div className="rounded-2xl border border-[--color-border] overflow-hidden" style={{ background: 'var(--color-card)' }}>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--color-muted)' }}>
                  {['Tanggal', 'Pembeli', 'Produk', 'Jumlah', 'Harga/kg', 'Total'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...penjualan]
                  .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
                  .map((p) => (
                    <tr key={p.id} className="border-t border-[--color-border] hover:bg-[--color-muted]/30 transition-colors">
                      <td className="px-4 py-3 text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted-foreground)' }}>
                        {formatTanggal(p.tanggal)}
                      </td>
                      <td className="px-4 py-3 font-medium text-[--color-foreground]">{p.pembeli}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: p.produk === 'Kompos' ? 'var(--color-secondary)' : 'var(--color-accent-light)',
                            color: p.produk === 'Kompos' ? 'var(--color-secondary-foreground)' : 'var(--color-foreground)',
                          }}
                        >
                          <Leaf size={10} />
                          {p.produk}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-foreground)' }}>
                        {p.jumlah} kg
                      </td>
                      <td className="px-4 py-3" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted-foreground)' }}>
                        {formatRupiah(p.hargaPerKg)}
                      </td>
                      <td className="px-4 py-3 font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                        {formatRupiah(p.total)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'kas' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowKasModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity"
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
            >
              <Plus size={15} />
              Catat Transaksi
            </button>
          </div>

          <div className="rounded-2xl border border-[--color-border] overflow-hidden" style={{ background: 'var(--color-card)' }}>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--color-muted)' }}>
                  {['Tanggal', 'Keterangan', 'Jenis', 'Jumlah', 'Saldo'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kasWithBalance.map((t) => (
                  <tr key={t.id} className="border-t border-[--color-border] hover:bg-[--color-muted]/30 transition-colors">
                    <td className="px-4 py-3 text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted-foreground)' }}>
                      {formatTanggal(t.tanggal)}
                    </td>
                    <td className="px-4 py-3 text-[--color-foreground]">{t.keterangan}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: t.jenis === 'masuk' ? 'var(--color-success-bg)' : 'var(--color-error-bg)',
                          color: t.jenis === 'masuk' ? 'var(--color-success)' : 'var(--color-error)',
                        }}
                      >
                        {t.jenis === 'masuk' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {t.jenis === 'masuk' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 font-semibold"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        color: t.jenis === 'masuk' ? 'var(--color-success)' : 'var(--color-error)',
                      }}
                    >
                      {t.jenis === 'masuk' ? '+' : '-'}{formatRupiah(t.jumlah)}
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-foreground)' }}>
                      {formatRupiah(t.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {showPenjualanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,18,8,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ background: 'var(--color-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Catat Penjualan Organik
              </h3>
              <button onClick={() => setShowPenjualanModal(false)}>
                <X size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Tanggal</label>
                <input type="date" value={penjualanForm.tanggal} onChange={(e) => setPenjualanForm((f) => ({ ...f, tanggal: e.target.value }))}
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Nama Pembeli</label>
                <input type="text" value={penjualanForm.pembeli} onChange={(e) => setPenjualanForm((f) => ({ ...f, pembeli: e.target.value }))}
                  placeholder="Pak Slamet Widodo"
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Produk</label>
                <select value={penjualanForm.produk}
                  onChange={(e) => {
                    const produk = e.target.value
                    setPenjualanForm((f) => ({ ...f, produk, hargaPerKg: produk === 'Kompos' ? 3000 : 5000 }))
                  }}
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
                  {produkOrganik.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Jumlah (kg)</label>
                  <input type="number" value={penjualanForm.jumlah || ''} onChange={(e) => setPenjualanForm((f) => ({ ...f, jumlah: Number(e.target.value) }))}
                    placeholder="20"
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                    style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Harga/kg (Rp)</label>
                  <input type="number" value={penjualanForm.hargaPerKg || ''} onChange={(e) => setPenjualanForm((f) => ({ ...f, hargaPerKg: Number(e.target.value) }))}
                    className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                    style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }} />
                </div>
              </div>
              {penjualanForm.jumlah > 0 && penjualanForm.hargaPerKg > 0 && (
                <div className="p-3 rounded-xl text-sm font-semibold text-center" style={{ background: 'var(--color-secondary)', color: 'var(--color-secondary-foreground)' }}>
                  Total: {formatRupiah(penjualanForm.jumlah * penjualanForm.hargaPerKg)}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowPenjualanModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>Batal</button>
              <button onClick={addPenjualan}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                <Check size={14} />Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {showKasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,18,8,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-xl" style={{ background: 'var(--color-card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Catat Transaksi Kas
              </h3>
              <button onClick={() => setShowKasModal(false)}>
                <X size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Tanggal</label>
                <input type="date" value={kasForm.tanggal} onChange={(e) => setKasForm((f) => ({ ...f, tanggal: e.target.value }))}
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Keterangan</label>
                <input type="text" value={kasForm.keterangan} onChange={(e) => setKasForm((f) => ({ ...f, keterangan: e.target.value }))}
                  placeholder="Biaya operasional…"
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Jenis</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['masuk', 'keluar'] as const).map((j) => (
                    <button key={j} onClick={() => setKasForm((f) => ({ ...f, jenis: j }))}
                      className="py-2.5 rounded-xl text-sm font-semibold border-2 transition-all"
                      style={{
                        borderColor: kasForm.jenis === j ? (j === 'masuk' ? 'var(--color-success)' : 'var(--color-error)') : 'var(--color-border)',
                        background: kasForm.jenis === j ? (j === 'masuk' ? 'var(--color-success-bg)' : 'var(--color-error-bg)') : 'var(--color-background)',
                        color: kasForm.jenis === j ? (j === 'masuk' ? 'var(--color-success)' : 'var(--color-error)') : 'var(--color-muted-foreground)',
                      }}>
                      {j === 'masuk' ? '↑ Uang Masuk' : '↓ Uang Keluar'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground)' }}>Jumlah (Rp)</label>
                <input type="number" value={kasForm.jumlah || ''} onChange={(e) => setKasForm((f) => ({ ...f, jumlah: Number(e.target.value) }))}
                  placeholder="50000"
                  className="w-full rounded-xl border text-sm px-3 py-2.5 focus:outline-none"
                  style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setShowKasModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80"
                style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>Batal</button>
              <button onClick={addKas}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
                style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
                <Check size={14} />Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
