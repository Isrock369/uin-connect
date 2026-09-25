import { useEffect, useState } from 'react'
import { TrendingUp, Clock, Coins, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { formatRupiah, formatTanggalPendek } from '../lib/format'
import { useAuth } from '../context/AuthContext'
import { getKamar, getSetoran, getRingkasan, getPenjualan, type Ringkasan as RingkasanData } from '../api/services'
import type { Kamar, Setoran } from '../types'


function StatCard({
  label,
  value,
  sub,
  icon,
  accent = false,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      className="rounded-2xl p-5 border border-[--color-border]"
      style={{ background: accent ? 'var(--color-primary)' : 'var(--color-card)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: accent ? 'rgba(245,240,232,0.15)' : 'var(--color-muted)',
          }}
        >
          {icon}
        </div>
      </div>
      <div
        className="text-2xl font-bold mb-1 leading-none"
        style={{
          fontFamily: 'var(--font-display)',
          color: accent ? 'var(--color-primary-foreground)' : 'var(--color-foreground)',
        }}
      >
        {value}
      </div>
      <div
        className="text-sm font-medium mb-0.5"
        style={{ color: accent ? 'rgba(245,240,232,0.85)' : 'var(--color-foreground)' }}
      >
        {label}
      </div>
      <div className="text-xs" style={{ color: accent ? 'rgba(245,240,232,0.6)' : 'var(--color-muted-foreground)' }}>
        {sub}
      </div>
    </div>
  )
}

const medals = ['🥇', '🥈', '🥉', '④', '⑤', '⑥', '⑦', '⑧']

export default function Ringkasan() {
  const { user } = useAuth()
  const [kamarData, setKamarData] = useState<Kamar[]>([])
  const [setoranData, setSetoranData] = useState<Setoran[]>([])
  const [ringkasan, setRingkasanData] = useState<RingkasanData | null>(null)
  const [pendapatanOrganik, setPendapatanOrganik] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getKamar(), getSetoran(), getRingkasan(), getPenjualan()])
      .then(([kamar, setoran, ring, penjualan]) => {
        setKamarData(kamar)
        setSetoranData(setoran)
        setRingkasanData(ring)
        setPendapatanOrganik(penjualan.reduce((s, p) => s + p.total, 0))
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading || !ringkasan) {
    return <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Memuat data dashboard...</p>
  }
  if (kamarData.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Belum ada data kamar.</p>
  }

  const totalPoin = ringkasan.totalPoinAktif
  const pending = ringkasan.totalSetoranMenunggu
  const saldoKas = ringkasan.saldoKas

  const sorted = [...kamarData].sort((a, b) => b.poin - a.poin)
  const maxPoin = sorted[0].poin

  const recentSetoran = [...setoranData]
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[--color-foreground]" style={{ fontFamily: 'var(--font-display)' }}>
          Selamat datang, {user?.nama || 'Pengurus'} 👋
        </h2>
        <p className="text-sm text-[--color-muted-foreground] mt-0.5">
          {new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())} · Bank Sampah Pesantren
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Poin Beredar"
          value={totalPoin.toLocaleString('id-ID')}
          sub="8 kamar aktif"
          accent
          icon={<Coins size={20} className="text-[--color-primary-foreground] opacity-80" />}
        />
        <StatCard
          label="Setoran Menunggu"
          value={String(pending)}
          sub="Perlu verifikasi"
          icon={
            <Clock
              size={20}
              style={{ color: pending > 0 ? 'var(--color-warning)' : 'var(--color-muted-foreground)' }}
            />
          }
        />
        <StatCard
          label="Pendapatan Organik"
          value={formatRupiah(pendapatanOrganik)}
          sub="Total tercatat"
          icon={<TrendingUp size={20} style={{ color: 'var(--color-primary)' }} />}
        />
        <StatCard
          label="Saldo Kas Pondok"
          value={formatRupiah(saldoKas)}
          sub="Berjalan bulan ini"
          icon={<ArrowUpRight size={20} style={{ color: 'var(--color-success)' }} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div
          className="lg:col-span-2 rounded-2xl border border-[--color-border] p-5"
          style={{ background: 'var(--color-card)' }}
        >
          <div className="flex items-center justify-between mb-5">
            <h3
              className="text-base font-semibold text-[--color-foreground]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Klasemen Kamar
            </h3>
            <span className="text-xs text-[--color-muted-foreground]">Berdasarkan total poin</span>
          </div>
          <div className="space-y-3">
            {sorted.map((kamar, i) => (
              <div key={kamar.id} className="flex items-center gap-3">
                <span className="text-base w-6 text-center shrink-0">{medals[i] ?? String(i + 1)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[--color-foreground] truncate">{kamar.nama}</span>
                    <span
                      className="text-xs font-semibold ml-2 shrink-0"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}
                    >
                      {kamar.poin.toLocaleString('id-ID')} pt
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-muted)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(kamar.poin / maxPoin) * 100}%`,
                        background: i === 0 ? 'var(--color-accent)' : 'var(--color-primary)',
                        opacity: i === 0 ? 1 : 0.6 + i * -0.05,
                      }}
                    />
                  </div>
                  <div className="text-xs text-[--color-muted-foreground] mt-0.5">{kamar.asrama}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div
            className="rounded-2xl border border-[--color-border] p-5"
            style={{ background: 'var(--color-card)' }}
          >
            <h3
              className="text-base font-semibold text-[--color-foreground] mb-3"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Aktivitas Terbaru
            </h3>
            <div className="space-y-2.5">
              {recentSetoran.map((s) => (
                <div key={s.id} className="flex items-start gap-2.5">
                  <div
                    className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background:
                        s.status === 'disetujui'
                          ? 'var(--color-success-bg)'
                          : s.status === 'menunggu'
                            ? 'var(--color-warning-bg)'
                            : 'var(--color-error-bg)',
                    }}
                  >
                    {s.status === 'disetujui' ? (
                      <ArrowUpRight
                        size={10}
                        style={{ color: 'var(--color-success)' }}
                      />
                    ) : s.status === 'menunggu' ? (
                      <Clock size={10} style={{ color: 'var(--color-warning)' }} />
                    ) : (
                      <ArrowDownRight size={10} style={{ color: 'var(--color-error)' }} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[--color-foreground] truncate">
                      {s.kamarNama} — {s.jenisSampah}
                    </p>
                    <p className="text-xs text-[--color-muted-foreground]">
                      {s.berat} kg · {formatTanggalPendek(s.tanggal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
