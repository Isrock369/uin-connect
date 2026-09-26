import { useEffect, useState } from 'react'
import { Download, BarChart3 } from 'lucide-react'
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

export default function Laporan() {
  const [activeTab, setActiveTab] = useState<TabId>('poin')
  const [period, setPeriod] = useState<PeriodId>('bulan')

  const [kamarData, setKamarData] = useState<Kamar[]>([])
  const [setoranData, setSetoranData] = useState<Setoran[]>([])
  const [penukaranData, setPenukaranData] = useState<Penukaran[]>([])
  const [penjualanData, setPenjualanData] = useState<PenjualanOrganik[]>([])
  const [kasData, setKasData] = useState<TransaksiKas[]>([])
  const [tarifSampah, setTarifSampah] = useState<TarifSampah[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getKamar(), getSetoran(), getPenukaran(), getPenjualan(), getKas(), getTarifSampah()])
      .then(([k, s, p, j, ks, t]) => {
        setKamarData(k); setSetoranData(s); setPenukaranData(p); setPenjualanData(j); setKasData(ks); setTarifSampah(t)
      })
      .catch((e) => setErrorMsg(e instanceof ApiError ? e.message : 'Gagal memuat data laporan.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Memuat laporan...</p>
  }
  if (errorMsg) {
    return <p className="text-sm" style={{ color: 'var(--color-error)' }}>{errorMsg}</p>
  }
  if (kamarData.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Belum ada data untuk dilaporkan.</p>
  }

  // Catatan: MySQL (driver mysql2) sering mengembalikan kolom DECIMAL/FLOAT sebagai string,
  // bukan number. Semua akumulasi angka di bawah ini dibungkus Number(...) supaya aman
  // dipakai dengan .toFixed() dan operasi aritmetika lain.

  const sortedKamar = [...kamarData].sort((a, b) => Number(b.poin) - Number(a.poin))
  const maxPoin = Number(sortedKamar[0].poin)

  const jenisTotals: Record<string, number> = {}
  setoranData
    .filter((s) => s.status !== 'ditolak')
    .forEach((s) => {
      jenisTotals[s.jenisSampah] = (jenisTotals[s.jenisSampah] ?? 0) + Number(s.berat)
    })
  const maxBerat = Math.max(...Object.values(jenisTotals))

  const totalBerat = Object.values(jenisTotals).reduce((a, b) => a + b, 0)
  const organikBerat = penjualanData.reduce((s, p) => s + Number(p.jumlah), 0)

  const poinDigunakan = penukaranData.reduce((s, p) => s + Number(p.poinDigunakan), 0)
  const poinBeredar = kamarData.reduce((s, k) => s + Number(k.poin), 0)

  const kasTotal = kasData.reduce((acc, t) => (t.jenis === 'masuk' ? acc + Number(t.jumlah) : acc - Number(t.jumlah)), 0)
  const kasIn = kasData.filter((t) => t.jenis === 'masuk').reduce((s, t) => s + Number(t.jumlah), 0)
  const kasOut = kasData.filter((t) => t.jenis === 'keluar').reduce((s, t) => s + Number(t.jumlah), 0)

  const barangFreq: Record<string, { nama: string; jumlah: number; poin: number }> = {}
  penukaranData.forEach((p) => {
    if (!barangFreq[p.barangId]) barangFreq[p.barangId] = { nama: p.barangNama, jumlah: 0, poin: 0 }
    barangFreq[p.barangId].jumlah += Number(p.jumlah)
    barangFreq[p.barangId].poin += Number(p.poinDigunakan)
  })
  const topBarang = Object.values(barangFreq).sort((a, b) => b.poin - a.poin)

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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['minggu', 'bulan'] as PeriodId[]).map((p) => (
            <button
              key={p}
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
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80 transition-opacity border border-[--color-border]"
          style={{ color: 'var(--color-foreground)', background: 'var(--color-card)' }}
        >
          <Download size={14} />
          Ekspor PDF
        </button>
      </div>

      <div className="flex gap-2 border-b border-[--color-border]">
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
          <div className="rounded-2xl border border-[--color-border] p-5" style={{ background: 'var(--color-card)' }}>
            <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
              Saldo Poin per Kamar
            </h3>
            <div className="space-y-3">
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
            <div className="rounded-2xl border border-[--color-border] p-5" style={{ background: 'var(--color-card)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Ringkasan Poin
              </h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Poin Beredar', value: poinBeredar.toLocaleString('id-ID'), unit: 'poin' },
                  { label: 'Poin Telah Ditukar', value: poinDigunakan.toLocaleString('id-ID'), unit: 'poin' },
                  { label: 'Total Kamar Aktif', value: '8', unit: 'kamar' },
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

            <div className="rounded-2xl border border-[--color-border] p-5" style={{ background: 'var(--color-card)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Barang Paling Sering Ditukar
              </h3>
              <div className="space-y-2.5">
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
                      -{b.poin} pt
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
          <div className="rounded-2xl border border-[--color-border] p-5" style={{ background: 'var(--color-card)' }}>
            <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
              Berat per Jenis Sampah Anorganik
            </h3>
            <div className="space-y-3">
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
            <div className="rounded-2xl border border-[--color-border] p-5" style={{ background: 'var(--color-card)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Breakdown per Kategori
              </h3>
              {Object.entries(jenisByKategori).map(([kat, berat]) => {
                const color = kategoriColor[kat] ?? 'var(--color-muted-foreground)'
                const pct = Math.round((berat / totalBerat) * 100)
                return (
                  <div key={kat} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                        <span style={{ color: 'var(--color-foreground)' }}>{kat}</span>
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted-foreground)' }}>
                        {berat.toFixed(1)} kg ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-muted)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="rounded-2xl border border-[--color-border] p-5" style={{ background: 'var(--color-card)' }}>
              <h3 className="text-base font-semibold mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Dampak Lingkungan
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Total anorganik disetor', value: `${totalBerat.toFixed(1)} kg` },
                  { label: 'Organik diolah & dijual', value: `${organikBerat} kg` },
                  { label: 'Sampah tidak ke TPA', value: `~${(totalBerat + organikBerat).toFixed(0)} kg` },
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
          <div className="rounded-2xl border border-[--color-border] p-5" style={{ background: 'var(--color-card)' }}>
            <h3 className="text-base font-semibold mb-5" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
              Laporan Kas Pondok — September 2026
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Total Pemasukan', value: formatRupiah(kasIn), color: 'var(--color-success)' },
                { label: 'Total Pengeluaran', value: formatRupiah(kasOut), color: 'var(--color-error)' },
                { label: 'Saldo Akhir', value: formatRupiah(kasTotal), color: 'var(--color-primary)', bold: true },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex justify-between py-3 border-b border-[--color-border] last:border-0"
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
            <div className="rounded-2xl border border-[--color-border] p-5" style={{ background: 'var(--color-card)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Penjualan per Produk Organik
              </h3>
              {['Kompos', 'Pakan Maggot'].map((produk) => {
                const data = penjualanData.filter((p) => p.produk === produk)
                const totalKg = data.reduce((s, p) => s + Number(p.jumlah), 0)
                const totalRp = data.reduce((s, p) => s + Number(p.total), 0)
                const color = produk === 'Kompos' ? 'var(--color-primary)' : 'var(--color-accent)'
                return (
                  <div key={produk} className="mb-3 pb-3 border-b border-[--color-border] last:border-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold text-[--color-foreground]">{produk}</span>
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

            <div className="rounded-2xl border border-[--color-border] p-5" style={{ background: 'var(--color-card)' }}>
              <h3 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
                Aliran Dana
              </h3>
              <div className="space-y-2">
                {[
                  { pct: Math.round((kasIn / (kasIn + kasOut)) * 100), label: 'Masuk', color: 'var(--color-success)', value: formatRupiah(kasIn) },
                  { pct: Math.round((kasOut / (kasIn + kasOut)) * 100), label: 'Keluar', color: 'var(--color-error)', value: formatRupiah(kasOut) },
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
