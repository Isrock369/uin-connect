import { useEffect, useState } from 'react'
import { Download, BarChart3 } from 'lucide-react'
import { reportRange, inRange, formatReportDate, cashSummary, setoranForReport } from '../lib/reportPeriod'
import { formatRupiah } from '../lib/format'
import { getKamar, getSetoran, getPenukaran, getPenjualan, getKas, getTarifSampah } from '../api/services'
import { ApiError } from '../api/client'
import type { Kamar, Setoran, Penukaran, PenjualanOrganik, TransaksiKas, TarifSampah } from '../types'

type TabId = 'poin' | 'sampah' | 'keuangan'
type PeriodId = 'minggu' | 'bulan'

function BarRow({ label, value, max, color, unit }: { label: string; value: number; max: number; color: string; unit: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-36 text-sm text-right shrink-0" style={{ color: 'var(--color-muted-foreground)' }}>
        {label}
      </div>
      <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: 'var(--color-muted)' }}>
        <div
          className="h-full rounded-lg flex items-center px-2 transition-all"
          style={{ width: `${pct}%`, background: color, minWidth: value > 0 ? '24px' : 0 }}
        >
          {pct > 15 && (
            <span className="text-xs font-semibold text-white">
              {value} {unit}
            </span>
          )}
        </div>
      </div>
      {pct <= 15 && value > 0 && (
        <div className="text-xs font-semibold shrink-0" style={{ fontFamily: 'var(--font-mono)', color }}>
          {value} {unit}
        </div>
      )}
    </div>
  )
}

const chartPalette = ['#1D7A36', '#D59A12', '#3984C6', '#8B5CB4', '#D16B45', '#26988A', '#697586']
const chartNumber = (value: number) => value.toLocaleString('id-ID', { maximumFractionDigits: 2 })

function KategoriChart({ totals }: { totals: Record<string, number> }) {
  const entries = Object.entries(totals)
    .filter(([, weight]) => Number.isFinite(weight) && weight > 0)
    .sort(([a], [b]) => a.localeCompare(b, 'id'))
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  let offset = 0
  const segments = entries.map(([name, weight], index) => {
    const percent = weight / total * 100
    const segment = { name, weight, percent, offset, color: chartPalette[index % chartPalette.length] }
    offset += percent
    return segment
  })

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <svg viewBox="0 0 240 240" role="img"
        aria-label={total > 0 ? `Komposisi sampah, total ${chartNumber(total)} kilogram. Rincian tersedia di legenda.` : 'Belum ada setoran disetujui pada periode ini.'}
        style={{ width: '100%', maxWidth: 220, flexShrink: 0 }}>
        <circle cx="120" cy="120" r="90" fill="none" stroke="var(--color-muted)" strokeWidth="28" />
        {segments.map(segment => (
          <circle key={segment.name} cx="120" cy="120" r="90" fill="none"
            stroke={segment.color} strokeWidth="28" pathLength="100"
            strokeDasharray={`${segment.percent} ${100 - segment.percent}`}
            strokeDashoffset={-segment.offset} transform="rotate(-90 120 120)">
            <title>{segment.name}: {chartNumber(segment.weight)} kg ({chartNumber(segment.percent)}%)</title>
          </circle>
        ))}
        <text x="120" y="116" textAnchor="middle" fill="var(--color-foreground)" fontSize="26" fontWeight="700">
          {chartNumber(total)}
        </text>
        <text x="120" y="141" textAnchor="middle" fill="var(--color-muted-foreground)" fontSize="13">
          kg total sampah
        </text>
      </svg>
      {total > 0 ? (
        <ul className="space-y-3 min-w-0" style={{ flex: '1 1 180px' }} aria-label="Rincian berat per kategori">
          {segments.map(segment => (
            <li key={segment.name} className="flex items-start gap-2 text-sm">
              <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0 mt-1" aria-hidden="true">
                <circle cx="6" cy="6" r="5" fill={segment.color} />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="font-semibold break-words">{segment.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  {chartNumber(segment.weight)} kg · {chartNumber(segment.percent)}%
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-center" style={{ flex: '1 1 180px', color: 'var(--color-muted-foreground)' }}>
          Belum ada setoran disetujui pada periode ini.
        </p>
      )}
    </div>
  )
}

export default function Laporan() {
  const [activeTab, setActiveTab] = useState<TabId>('poin')
  const [period, setPeriod] = useState<PeriodId>('bulan')

  const [kamarData, setKamarData] = useState<Kamar[]>([])
  const [allSetoranData, setSetoranData] = useState<Setoran[]>([])
  const [allPenukaranData, setPenukaranData] = useState<Penukaran[]>([])
  const [allPenjualanData, setPenjualanData] = useState<PenjualanOrganik[]>([])
  const [allKasData, setKasData] = useState<TransaksiKas[]>([])
  const [tarifSampah, setTarifSampah] = useState<TarifSampah[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function loadReport() {
    setLoading(true)
    setErrorMsg(null)
    Promise.all([getKamar(), getSetoran(), getPenukaran(), getPenjualan(), getKas(), getTarifSampah()])
      .then(([k, s, p, j, ks, t]) => {
        setKamarData(k); setSetoranData(s); setPenukaranData(p); setPenjualanData(j); setKasData(ks); setTarifSampah(t)
      })
      .catch((e) => setErrorMsg(e instanceof ApiError ? e.message : 'Gagal memuat data laporan.'))
      .finally(() => setLoading(false))
  }

  useEffect(loadReport, [])

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Memuat laporan...</p>
  }
  if (errorMsg) {
    return <div role="alert" className="space-y-3"><p style={{ color: 'var(--color-error)' }}>{errorMsg}</p><button className="rounded-xl border border-(--color-border) px-4 py-2" onClick={loadReport}>Coba lagi</button></div>
  }

  const range = reportRange(period)
  const rangeLabel = `${formatReportDate(range.start)} – ${formatReportDate(range.end)}`
  const { approved: setoranData } = setoranForReport(allSetoranData, range)
  const penukaranData = allPenukaranData.filter(row => inRange(row.tanggal, range))
  const penjualanData = allPenjualanData.filter(row => inRange(row.tanggal, range))
  const cash = cashSummary(allKasData, range)
  const kasData = cash.rows

  // Catatan: MySQL (driver mysql2) sering mengembalikan kolom DECIMAL/FLOAT sebagai string,
  // bukan number. Semua akumulasi angka di bawah ini dibungkus Number(...) supaya aman
  // dipakai dengan .toFixed() dan operasi aritmetika lain.

  const sortedKamar = [...kamarData].sort((a, b) => Number(b.poin) - Number(a.poin))
  const maxPoin = Number(sortedKamar[0]?.poin ?? 0)

  const jenisTotals: Record<string, number> = {}
  setoranData.forEach((s) => {
      jenisTotals[s.jenisSampah] = (jenisTotals[s.jenisSampah] ?? 0) + Number(s.berat)
    })
  const maxBerat = Math.max(0, ...Object.values(jenisTotals))

  const totalBerat = Object.values(jenisTotals).reduce((a, b) => a + b, 0)
  const organikBerat = penjualanData.reduce((s, p) => s + Number(p.jumlah), 0)

  const poinDigunakan = penukaranData.reduce((s, p) => s + Number(p.poinDigunakan), 0)
  const poinBeredar = kamarData.reduce((s, k) => s + Number(k.poin), 0)

  const kasTotal = cash.closing
  const kasIn = cash.income
  const kasOut = cash.expense

  const barangFreq: Record<string, { nama: string; jumlah: number; poin: number }> = {}
  penukaranData.forEach((p) => {
    if (!barangFreq[p.barangId]) barangFreq[p.barangId] = { nama: p.barangNama, jumlah: 0, poin: 0 }
    barangFreq[p.barangId].jumlah += Number(p.jumlah)
    barangFreq[p.barangId].poin += Number(p.poinDigunakan)
  })
  const topBarang = Object.values(barangFreq).sort((a, b) => b.jumlah - a.jumlah)

  const jenisByKategori: Record<string, number> = {}
  Object.entries(jenisTotals).forEach(([jenis, berat]) => {
    const tarif = tarifSampah.find((t) => t.jenis === jenis)
    const kat = tarif?.kategori ?? 'Lainnya'
    jenisByKategori[kat] = (jenisByKategori[kat] ?? 0) + berat
  })

  const kategoriColor: Record<string, string> = {
    Plastik: 'var(--color-accent)',
    Kertas: 'var(--color-primary-light)',
    Logam: '#6B7280',
    Kaca: '#60A5FA',
    Lainnya: 'var(--color-muted-foreground)',
  }

  return (
    <div className="page-reports space-y-5">
      <div className="page-toolbar no-print flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {(['minggu', 'bulan'] as PeriodId[]).map((p) => (
            <button
              key={p}
              aria-pressed={period === p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: period === p ? 'var(--color-primary)' : 'var(--color-muted)',
                color: period === p ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
              }}
            >
              {p === 'minggu' ? 'Minggu Ini' : 'Bulan Ini'}
            </button>
          ))}
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity border border-(--color-border)"
          style={{ color: 'var(--color-foreground)', background: 'var(--color-card)' }}
        >
          <Download size={14} />
          Cetak / Simpan PDF
        </button>
      </div>

      <h2 className="hidden print:block text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
        Laporan MIU Connect — {rangeLabel}
        <span className="block text-sm">{activeTab === 'poin' ? 'Poin & Distribusi Barang' : activeTab === 'sampah' ? 'Sampah per Kategori' : 'Keuangan & Kas'}</span>
      </h2>

      <div className="no-print flex gap-2 border-b border-(--color-border)">
        {([
          { id: 'poin', label: 'Poin & Distribusi Barang' },
          { id: 'sampah', label: 'Sampah per Kategori' },
          { id: 'keuangan', label: 'Keuangan & Kas' },
        ] as { id: TabId; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px"
            style={{
              borderColor: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {activeTab === 'poin' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-(--color-border) p-5" style={{ background: 'var(--color-card)' }}>
            <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
              Saldo Poin per Kamar Saat Ini
            </h3>
            <div className="space-y-3">
              {sortedKamar.length === 0 && <p className="text-sm">Belum ada kamar terdaftar.</p>}
              {sortedKamar.map((k) => (
                <BarRow
                  key={k.id}
                  label={k.nama}
                  value={Number(k.poin)}
                  max={maxPoin}
                  color="var(--color-primary)"
                  unit="pt"
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-(--color-border) p-5" style={{ background: 'var(--color-card)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Ringkasan Poin
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Saldo Poin Saat Ini', value: poinBeredar.toLocaleString('id-ID'), unit: 'poin' },
                  { label: 'Poin Ditukar dalam Periode', value: poinDigunakan.toLocaleString('id-ID'), unit: 'poin' },
                  { label: 'Kamar Terdaftar', value: String(kamarData.length), unit: 'kamar' },
                  { label: 'Penukaran Dilakukan', value: String(penukaranData.length), unit: 'kali' },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between text-sm">
                    <span style={{ color: 'var(--color-muted-foreground)' }}>{stat.label}</span>
                    <span className="font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                      {stat.value} {stat.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-(--color-border) p-5" style={{ background: 'var(--color-card)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Barang Paling Sering Ditukar
              </h3>
              <div className="space-y-2.5">
                {topBarang.length === 0 && <p className="text-sm">Belum ada penukaran pada periode ini.</p>}
                {topBarang.map((b, i) => (
                  <div key={b.nama} className="flex items-center gap-2 text-sm">
                    <span
                      className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate" style={{ color: 'var(--color-foreground)' }}>{b.nama}</span>
                    <span className="text-xs font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
                      {b.jumlah} barang · {b.poin} pt
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sampah' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-(--color-border) p-5" style={{ background: 'var(--color-card)' }}>
            <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
              Berat Setoran Disetujui per Jenis Sampah
            </h3>
            <div className="space-y-3">
              {setoranData.length === 0 && <p className="text-sm">Belum ada setoran disetujui pada periode ini.</p>}
              {Object.entries(jenisTotals)
                .sort(([, a], [, b]) => b - a)
                .map(([jenis, berat]) => {
                  const tarif = tarifSampah.find((t) => t.jenis === jenis)
                  const color = kategoriColor[tarif?.kategori ?? 'Lainnya'] ?? 'var(--color-primary)'
                  return <BarRow key={jenis} label={jenis} value={Number(berat.toFixed(1))} max={maxBerat} color={color} unit="kg" />
                })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-(--color-border) p-5" style={{ background: 'var(--color-card)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Komposisi Sampah per Kategori
              </h3>
              <KategoriChart totals={jenisByKategori} />
            </div>

            <div className="rounded-2xl border border-(--color-border) p-5" style={{ background: 'var(--color-card)' }}>
              <h3 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Ringkasan Pengelolaan Sampah
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Berat setoran disetujui', value: `${totalBerat.toFixed(1)} kg` },
                  { label: 'Produk organik terjual', value: `${organikBerat} kg` },
                  { label: 'Setoran diproses', value: `${setoranData.filter((s) => s.status === 'disetujui').length} transaksi` },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span style={{ color: 'var(--color-muted-foreground)' }}>{item.label}</span>
                    <span className="font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'keuangan' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-(--color-border) p-5" style={{ background: 'var(--color-card)' }}>
            <h3 className="text-base font-semibold mb-5" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
              Laporan Kas Pondok — {rangeLabel}
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Saldo Awal Periode', value: formatRupiah(cash.opening), color: 'var(--color-primary)' },
                { label: 'Total Pemasukan', value: formatRupiah(kasIn), color: 'var(--color-success)' },
                { label: 'Total Pengeluaran', value: formatRupiah(kasOut), color: 'var(--color-error)' },
                { label: 'Saldo Akhir', value: formatRupiah(kasTotal), color: 'var(--color-primary)', bold: true },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between py-3 border-b border-(--color-border) last:border-0"
                >
                  <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{item.label}</span>
                  <span
                    className="text-sm"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: item.color,
                      fontWeight: item.bold ? 700 : 600,
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5">
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-muted-foreground)' }}>
                Rincian Pengeluaran
              </h4>
              <div className="space-y-2">
                {kasData
                  .filter((t) => t.jenis === 'keluar')
                  .map((t) => (
                    <div key={t.id} className="flex justify-between text-xs">
                      <span className="truncate pr-2" style={{ color: 'var(--color-foreground)' }}>{t.keterangan}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-error)' }}>
                        -{formatRupiah(t.jumlah)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-(--color-border) p-5" style={{ background: 'var(--color-card)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Penjualan per Produk Organik
              </h3>
              {penjualanData.length === 0 && <p className="text-sm">Belum ada penjualan pada periode ini.</p>}
              {Array.from(new Set(penjualanData.map(row => row.produk))).sort().map((produk) => {
                const data = penjualanData.filter((p) => p.produk === produk)
                const totalKg = data.reduce((s, p) => s + Number(p.jumlah), 0)
                const totalRp = data.reduce((s, p) => s + Number(p.total), 0)
                const color = produk === 'Kompos' ? 'var(--color-primary)' : 'var(--color-accent)'
                return (
                  <div key={produk} className="mb-3 pb-3 border-b border-(--color-border) last:border-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-(--color-foreground)">{produk}</span>
                      <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color }}>
                        {formatRupiah(totalRp)}
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      {totalKg} kg · {data.length} transaksi
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="rounded-2xl border border-(--color-border) p-5" style={{ background: 'var(--color-card)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Aliran Dana
              </h3>
              <div className="space-y-2">
                {[
                  { pct: kasIn + kasOut > 0 ? Math.round((kasIn / (kasIn + kasOut)) * 100) : 0, label: 'Masuk', color: 'var(--color-success)', value: formatRupiah(kasIn) },
                  { pct: kasIn + kasOut > 0 ? Math.round((kasOut / (kasIn + kasOut)) * 100) : 0, label: 'Keluar', color: 'var(--color-error)', value: formatRupiah(kasOut) },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--color-muted-foreground)' }}>{item.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: item.color }}>{item.value} ({item.pct}%)</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-muted)' }}>
                      <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <BarChart3 size={14} style={{ color: 'var(--color-primary)' }} />
                <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  Laporan dapat diekspor ke PDF untuk arsip pondok.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



