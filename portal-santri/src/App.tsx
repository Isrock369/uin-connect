import { useState, useEffect, useRef } from 'react'
import { Scale, Wifi, CheckCircle2, ChevronLeft, ChevronRight, RefreshCw, Send, Activity, AlertCircle, Camera, Trophy } from 'lucide-react'
import logoSrc from './assets/logo.jpeg'
import { getKamar, getTarifSampah, getRiwayatKamar, kirimSetoran, kameraMintaFoto, kameraHasil } from './api/services'
import { ApiError } from './api/client'
import { bacaTimbangan, MODE_LANGSUNG, SUMBER_TIMBANGAN } from './api/timbangan'
import type { Kamar, TarifSampah, RiwayatKamar } from './types'

type Step = 'kamar' | 'jenis' | 'sensor' | 'sukses' | 'poin' | 'riwayat'
type SensorStatus = 'idle' | 'connecting' | 'measuring' | 'stable'
// Foto bukti setoran dari ESP32-CAM: 'tidak' = kamera tidak aktif (setoran tetap sah)
type FotoStatus = 'tidak' | 'menunggu' | 'ok' | 'gagal'

// ── Pengaturan pembacaan timbangan asli (ESP32) ──
const BERAT_MIN_KG = 0.01 // di bawah ini dianggap timbangan kosong
const POLL_MS = 300 // seberapa sering web menanyakan berat ke timbangan
const STABIL_BERTURUT = 2 // butuh 2x balasan "stabil" yang sama berturut-turut
const MAKS_GAGAL = 3 // gagal 3x berturut-turut -> tampilkan pesan error
const FOTO_TUNGGU_MS = 10000 // maksimal menunggu foto masuk setelah setoran dikirim

const JENIS_CONFIG: Record<string, { emoji: string; color: string; bg: string; border: string }> = {
  Organik: { emoji: '🍃', color: '#15803D', bg: '#F0FDF4', border: '#86EFAC' },
  Anorganik: { emoji: '♻️', color: '#1E7A32', bg: '#EDF7EF', border: '#CCEBD3' },
  'Sampah B3': { emoji: '⚠️', color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  'Sampah Kertas': { emoji: '📄', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  Residu: { emoji: '🗑️', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
}

const STEPS: Step[] = ['kamar', 'jenis', 'sensor']
const STEP_LABEL: Record<Step, string> = { kamar: 'Kamar', jenis: 'Sampah', sensor: 'Timbang', sukses: '', poin: '', riwayat: '' }

const MEDALI = ['🥇', '🥈', '🥉']

const STATUS_SETORAN: Record<string, { label: string; color: string; bg: string }> = {
  disetujui: { label: 'Disetujui', color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  menunggu: { label: 'Menunggu', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  ditolak: { label: 'Ditolak', color: 'var(--color-error)', bg: 'var(--color-error-bg)' },
}

// 'YYYY-MM-DD' -> '12 Okt 2026' (dibaca manual supaya tidak geser hari karena zona waktu)
function formatTanggal(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return s
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(y, m - 1, d))
}

export default function App() {
  // ── Data dari backend (publik, tanpa login) ──
  const [allKamar, setAllKamar] = useState<Kamar[]>([])
  const [tarifSampah, setTarifSampah] = useState<TarifSampah[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>('kamar')
  const [selectedKamar, setSelectedKamar] = useState<Kamar | null>(null)
  const [selectedJenis, setSelectedJenis] = useState<TarifSampah | null>(null)

  const [sensorStatus, setSensorStatus] = useState<SensorStatus>('idle')
  const [displayWeight, setDisplayWeight] = useState(0)
  const [finalWeight, setFinalWeight] = useState(0)
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const aktifRef = useRef(false)
  const [sensorError, setSensorError] = useState<string | null>(null)
  const [successPoin, setSuccessPoin] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fotoStatus, setFotoStatus] = useState<FotoStatus>('tidak')
  const fotoTokenRef = useRef(0) // dinaikkan saat reset supaya proses tunggu foto yang lama berhenti

  // ── Cek poin & riwayat kamar ──
  const [riwayatKamar, setRiwayatKamar] = useState<Kamar | null>(null)
  const [riwayatData, setRiwayatData] = useState<RiwayatKamar | null>(null)
  const [riwayatLoading, setRiwayatLoading] = useState(false)
  const [riwayatError, setRiwayatError] = useState<string | null>(null)

  function bukaKlasemen() {
    setStep('poin')
    // refresh diam-diam supaya poin yang tampil terbaru (tanpa layar loading penuh)
    getKamar().then(setAllKamar).catch(() => {})
  }

  function bukaRiwayat(k: Kamar) {
    setRiwayatKamar(k)
    setRiwayatData(null)
    setRiwayatError(null)
    setRiwayatLoading(true)
    setStep('riwayat')
    getRiwayatKamar(k.id)
      .then(setRiwayatData)
      .catch((e) => setRiwayatError(e instanceof ApiError ? e.message : 'Tidak bisa memuat riwayat. Periksa koneksi.'))
      .finally(() => setRiwayatLoading(false))
  }

  function loadData() {
    setLoadingData(true)
    setLoadError(null)
    Promise.all([getKamar(), getTarifSampah()])
      .then(([k, t]) => { setAllKamar(k); setTarifSampah(t) })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server. Periksa koneksi.'))
      .finally(() => setLoadingData(false))
  }

  useEffect(loadData, [])
  useEffect(() => () => stopPolling(), [])

  // Begitu santri masuk ke langkah "Timbang", web langsung terhubung ke sensor
  // timbangan (tanpa perlu menekan tombol). Keluar dari langkah ini = berhenti.
  useEffect(() => {
    if (step === 'sensor') activateSensor()
    else stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function stopPolling() {
    aktifRef.current = false
    if (pollingRef.current) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
  }

  // Membaca berat ASLI dari timbangan ESP32 (GET /berat). Angka yang diterima
  // sama dengan yang tampil di LCD. Saat ESP32 menyatakan "stabil" (angka sudah
  // terkunci) dan ada beban, berat dikunci dan siap dikirim sebagai setoran.
  function activateSensor() {
    stopPolling()
    setSensorError(null)
    setSensorStatus('connecting')
    setDisplayWeight(0)
    setFinalWeight(0)
    aktifRef.current = true

    let tersambung = false
    let gagal = 0
    let stabilCount = 0
    let stabilBerat = -1

    const tick = async () => {
      if (!aktifRef.current) return
      try {
        const r = await bacaTimbangan()
        if (!aktifRef.current) return
        gagal = 0

        if (r.online === false) {
          stopPolling()
          setSensorStatus('idle')
          setSensorError('Timbangan offline. Pastikan timbangan menyala dan tersambung ke WiFi/internet.')
          return
        }

        if (!r.sensorOk) {
          stopPolling()
          setSensorStatus('idle')
          setSensorError('Sensor load cell tidak terbaca. Periksa kabel HX711 di timbangan.')
          return
        }

        if (!tersambung) {
          tersambung = true
          setSensorStatus('measuring')
        }
        setDisplayWeight(r.berat)

        if (r.stabil && r.berat >= BERAT_MIN_KG) {
          stabilCount = r.berat === stabilBerat ? stabilCount + 1 : 1
          stabilBerat = r.berat
          if (stabilCount >= STABIL_BERTURUT) {
            setFinalWeight(r.berat)
            setSensorStatus('stable')
            stopPolling()
            return
          }
        } else {
          stabilCount = 0
          stabilBerat = -1
        }
      } catch {
        gagal++
        if (gagal >= MAKS_GAGAL) {
          stopPolling()
          setSensorStatus('idle')
          setSensorError(
            MODE_LANGSUNG
              ? `Tidak bisa terhubung ke timbangan (${SUMBER_TIMBANGAN}). ` +
                  'Pastikan timbangan menyala dan satu WiFi dengan perangkat ini.'
              : 'Tidak bisa terhubung ke server. Periksa koneksi internet perangkat ini.',
          )
          return
        }
      }
      if (aktifRef.current) pollingRef.current = setTimeout(tick, POLL_MS)
    }

    tick()
  }

  function resetSensor() {
    stopPolling()
    setSensorError(null)
    setSensorStatus('idle')
    setDisplayWeight(0)
    setFinalWeight(0)
  }

  async function handleSubmit() {
    if (!selectedKamar || !selectedJenis || !finalWeight) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await kirimSetoran(selectedKamar.id, selectedJenis.id, finalWeight)
      setSuccessPoin(res.poin)
      setStep('sukses')
      void ambilFotoBukti(res.id) // tidak ditunggu: setoran sudah tercatat, foto menyusul
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'Gagal mengirim setoran. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  // Meminta ESP32-CAM memotret setoran ini lalu menunggu sampai fotonya masuk.
  // Kalau kamera tidak aktif atau gagal, setoran TETAP sah (foto hanya bukti tambahan).
  async function ambilFotoBukti(setoranId: number) {
    const token = ++fotoTokenRef.current
    setFotoStatus('tidak')
    try {
      const r = await kameraMintaFoto(setoranId)
      if (token !== fotoTokenRef.current || !r.kameraOnline) return
    } catch {
      return
    }
    setFotoStatus('menunggu')
    const mulai = Date.now()
    while (Date.now() - mulai < FOTO_TUNGGU_MS) {
      await new Promise((r) => setTimeout(r, 700))
      if (token !== fotoTokenRef.current) return
      try {
        const h = await kameraHasil(setoranId)
        if (token !== fotoTokenRef.current) return
        if (h.ada) { setFotoStatus('ok'); return }
      } catch {
        // abaikan, coba lagi sampai batas waktu
      }
    }
    if (token === fotoTokenRef.current) setFotoStatus('gagal')
  }

  function resetAll() {
    fotoTokenRef.current++ // hentikan proses tunggu foto yang masih berjalan
    setFotoStatus('tidak')
    setStep('kamar')
    setSelectedKamar(null)
    setSelectedJenis(null)
    resetSensor()
    setSuccessPoin(0)
    setSubmitError(null)
    loadData() // refresh saldo poin kamar terbaru
  }

  const stepIndex = STEPS.indexOf(step)

  if (loadingData) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <p style={{ color: 'var(--color-muted-foreground)' }}>Memuat Portal Santri...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--color-background)' }}>
        <AlertCircle size={40} style={{ color: 'var(--color-error)' }} className="mb-3" />
        <p className="text-sm mb-4" style={{ color: 'var(--color-error)' }}>{loadError}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
        >
          Coba Lagi
        </button>
      </div>
    )
  }

  if (step === 'sukses') {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center p-6 text-center"
        style={{ background: 'var(--color-background)' }}
      >
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center mb-5"
          style={{ background: 'var(--color-success-bg)' }}
        >
          <CheckCircle2 size={52} style={{ color: 'var(--color-success)' }} />
        </div>
        <h2
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}
        >
          Setoran Berhasil Dicatat!
        </h2>
        <p className="text-sm mb-8" style={{ color: 'var(--color-muted-foreground)' }}>
          Menunggu verifikasi pengurus · poin akan segera masuk
        </p>

        <div
          className="w-full max-w-sm rounded-2xl border p-5 text-left mb-6"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          {[
            { label: 'Kamar', value: selectedKamar?.nama ?? '' },
            { label: 'Jenis Sampah', value: selectedJenis?.jenis ?? '' },
            { label: 'Berat Terdeteksi', value: `${finalWeight.toFixed(2)} kg` },
            { label: 'Estimasi Poin', value: successPoin > 0 ? `+${successPoin} poin` : '—', accent: true },
          ].map((row) => (
            <div
              key={row.label}
              className="flex justify-between py-3 border-b last:border-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{row.label}</span>
              <span
                className="text-sm font-semibold"
                style={{ color: row.accent ? 'var(--color-primary)' : 'var(--color-foreground)' }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {fotoStatus !== 'tidak' && (
          <div
            className="w-full max-w-sm rounded-2xl border px-4 py-3 mb-6 flex items-center gap-3 text-left"
            style={{
              background: fotoStatus === 'gagal' ? 'var(--color-warning-bg)' : 'var(--color-card)',
              borderColor: 'var(--color-border)',
            }}
          >
            <Camera
              size={20}
              className={fotoStatus === 'menunggu' ? 'animate-pulse' : ''}
              style={{ color: fotoStatus === 'ok' ? 'var(--color-success)' : fotoStatus === 'gagal' ? 'var(--color-warning)' : 'var(--color-primary)' }}
            />
            <p className="text-sm" style={{ color: 'var(--color-foreground)' }}>
              {fotoStatus === 'menunggu' && 'Mengambil foto... jangan angkat sampah dulu.'}
              {fotoStatus === 'ok' && 'Foto bukti tersimpan. Terima kasih!'}
              {fotoStatus === 'gagal' && 'Foto belum masuk, tapi setoranmu tetap tercatat.'}
            </p>
          </div>
        )}

        <div className="w-full max-w-sm">
          <button
            onClick={resetAll}
            className="w-full py-3.5 rounded-2xl text-base font-bold"
            style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
          >
            Setor Sampah Lagi
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'var(--color-background)' }}>
      {/* Header */}
      <header
        className="shrink-0 px-4 py-3 border-b flex items-center gap-3"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <button
          onClick={resetAll}
          disabled={submitting}
          aria-label="Kembali ke awal"
          className="flex items-center gap-2 transition-opacity active:opacity-70 disabled:opacity-60"
        >
          <img src={logoSrc} alt="" className="h-8 w-8 object-contain" />
          <span className="text-base font-bold" style={{ color: 'var(--color-primary)' }}>
            MIU Connect
          </span>
        </button>
        <span
          className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: 'var(--color-secondary)', color: 'var(--color-primary)' }}
        >
          Portal Santri
        </span>
      </header>

      {/* Step indicator */}
      <div className={`shrink-0 px-4 pt-4 pb-2 ${stepIndex < 0 ? 'hidden' : ''}`}>
        <div className="flex items-center justify-center gap-1">
          {STEPS.map((s, i) => {
            const done = stepIndex > i
            const active = step === s
            return (
              <div key={s} className="flex items-center gap-1">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: done ? 'var(--color-success)' : active ? 'var(--color-primary)' : 'var(--color-muted)',
                    color: done || active ? 'white' : 'var(--color-muted-foreground)',
                  }}
                >
                  {done ? '✓' : i + 1}
                </div>
                <span
                  className="text-xs font-medium hidden sm:inline mr-1"
                  style={{ color: active ? 'var(--color-primary)' : 'var(--color-muted-foreground)' }}
                >
                  {STEP_LABEL[s]}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className="w-8 h-0.5 rounded mr-1"
                    style={{ background: done ? 'var(--color-success)' : 'var(--color-border)' }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {/* ── Step 1: Pilih Kamar ── */}
        {step === 'kamar' && (
          <div>
            <h2
              className="text-xl font-bold mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}
            >
              Pilih Kamar
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-muted-foreground)' }}>
              Pilih kamar yang akan menyetor sampah
            </p>
            <button
              onClick={bukaKlasemen}
              className="w-full mb-4 rounded-2xl border-2 px-4 py-3.5 flex items-center gap-3 text-left transition-all active:scale-[0.99]"
              style={{ borderColor: 'var(--color-accent)', background: 'var(--color-accent-light)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--color-accent)' }}>
                <Trophy size={20} color="white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm" style={{ color: 'var(--color-foreground)' }}>Cek Poin &amp; Klasemen Kamar</div>
                <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>Lihat peringkat dan riwayat setoran tiap kamar</div>
              </div>
              <ChevronRight size={18} style={{ color: 'var(--color-muted-foreground)' }} className="shrink-0" />
            </button>
            {allKamar.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Belum ada kamar terdaftar.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {allKamar.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => { setSelectedKamar(k); setStep('jenis') }}
                    className="rounded-2xl border-2 p-4 text-left transition-all active:scale-95"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}
                  >
                    <div className="text-2xl mb-2">🏠</div>
                    <div className="font-semibold text-sm leading-tight" style={{ color: 'var(--color-foreground)' }}>
                      {k.nama}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                      {k.asrama}
                    </div>
                    <div className="mt-2 text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                      {k.poin.toLocaleString('id-ID')} pt
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Cek Poin: klasemen semua kamar ── */}
        {step === 'poin' && (
          <div>
            <button
              onClick={() => setStep('kamar')}
              className="flex items-center gap-1 text-sm mb-3 py-2"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              <ChevronLeft size={13} /> Kembali
            </button>
            <h2 className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}>
              Klasemen Kamar
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-muted-foreground)' }}>
              Berdasarkan total poin · ketuk kamar untuk lihat riwayat setoran
            </p>
            {allKamar.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Belum ada kamar terdaftar.</p>
            ) : (
              <div className="space-y-2.5">
                {[...allKamar].sort((a, b) => b.poin - a.poin).map((k, _i, arr) => {
                  const rank = arr.filter((x) => x.poin > k.poin).length + 1
                  const maxPoin = arr[0]?.poin || 0
                  const pct = maxPoin > 0 ? Math.max(4, (k.poin / maxPoin) * 100) : 0
                  return (
                    <button
                      key={k.id}
                      onClick={() => bukaRiwayat(k)}
                      className="w-full rounded-2xl border p-3.5 flex items-center gap-3 text-left transition-all active:scale-[0.99]"
                      style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}
                    >
                      <span className="w-8 text-center text-lg font-bold shrink-0" style={{ color: 'var(--color-muted-foreground)' }}>
                        {rank <= 3 ? MEDALI[rank - 1] : rank}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold text-sm truncate" style={{ color: 'var(--color-foreground)' }}>{k.nama}</span>
                          <span className="text-sm font-bold shrink-0" style={{ color: 'var(--color-primary)' }}>
                            {k.poin.toLocaleString('id-ID')} pt
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden my-1.5" style={{ background: 'var(--color-muted)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: rank === 1 ? 'var(--color-accent)' : 'var(--color-primary)', opacity: rank === 1 ? 1 : 0.65 }}
                          />
                        </div>
                        <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{k.asrama}</div>
                      </div>
                      <ChevronRight size={16} style={{ color: 'var(--color-muted-foreground)' }} className="shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Riwayat setoran satu kamar ── */}
        {step === 'riwayat' && riwayatKamar && (
          <div>
            <button
              onClick={() => setStep('poin')}
              className="flex items-center gap-1 text-sm mb-3 py-2"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              <ChevronLeft size={13} /> Klasemen
            </button>

            <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>
              <div className="text-sm opacity-80">{riwayatKamar.asrama}</div>
              <div className="text-lg font-bold leading-tight mb-3">{riwayatKamar.nama}</div>
              <div className="text-3xl font-bold leading-none">
                {(allKamar.find((k) => k.id === riwayatKamar.id)?.poin ?? riwayatKamar.poin).toLocaleString('id-ID')}
                <span className="text-base font-semibold opacity-80"> poin</span>
              </div>
              {riwayatData && riwayatData.poinMenunggu > 0 && (
                <div className="mt-3 text-xs px-3 py-1.5 rounded-full inline-block" style={{ background: 'rgba(255,255,255,0.18)' }}>
                  +{riwayatData.poinMenunggu.toLocaleString('id-ID')} poin menunggu verifikasi
                </div>
              )}
            </div>

            <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--color-foreground)' }}>Riwayat Setoran</h3>

            {riwayatLoading && (
              <p className="text-sm py-6 text-center" style={{ color: 'var(--color-muted-foreground)' }}>Memuat riwayat...</p>
            )}

            {riwayatError && (
              <div className="rounded-xl p-3 text-sm mb-3" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
                {riwayatError}
                <button onClick={() => bukaRiwayat(riwayatKamar)} className="block mt-2 font-semibold underline">Coba lagi</button>
              </div>
            )}

            {riwayatData && riwayatData.riwayat.length === 0 && (
              <p className="text-sm py-6 text-center" style={{ color: 'var(--color-muted-foreground)' }}>Belum ada setoran dari kamar ini.</p>
            )}

            {riwayatData && riwayatData.riwayat.length > 0 && (
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}>
                {riwayatData.riwayat.map((r) => {
                  const st = STATUS_SETORAN[r.status] ?? STATUS_SETORAN.menunggu
                  const cfg = JENIS_CONFIG[r.jenisSampah] ?? JENIS_CONFIG.Residu
                  return (
                    <div key={r.id} className="px-4 py-3 flex items-center gap-3 border-b last:border-0" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="text-xl shrink-0">{cfg.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-foreground)' }}>{r.jenisSampah}</div>
                        <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                          {formatTanggal(r.tanggal)} · {r.berat.toLocaleString('id-ID')} kg
                        </div>
                        {r.catatan && (
                          <div className="text-xs mt-0.5" style={{ color: 'var(--color-error)' }}>Catatan: {r.catatan}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className="text-sm font-bold"
                          style={{ color: r.status === 'ditolak' ? 'var(--color-muted-foreground)' : 'var(--color-primary)', textDecoration: r.status === 'ditolak' ? 'line-through' : 'none' }}
                        >
                          {r.poin > 0 ? `+${r.poin}` : '0'} pt
                        </div>
                        <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {riwayatData && riwayatData.riwayat.length >= 30 && (
              <p className="text-xs text-center mt-2" style={{ color: 'var(--color-muted-foreground)' }}>Menampilkan 30 setoran terakhir.</p>
            )}

            <button
              onClick={() => { setSelectedKamar(riwayatKamar); setStep('jenis') }}
              className="w-full mt-5 py-3.5 rounded-2xl text-base font-bold"
              style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
            >
              Setor Sampah untuk Kamar Ini
            </button>
          </div>
        )}

        {/* ── Step 2: Pilih Jenis Sampah ── */}
        {step === 'jenis' && (
          <div>
            <button
              onClick={() => setStep('kamar')}
              className="flex items-center gap-1 text-sm mb-3 py-2"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              <ChevronLeft size={13} /> Ganti Kamar
            </button>
            <div
              className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--color-secondary)' }}
            >
              <span>🏠</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                {selectedKamar?.nama}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                · {selectedKamar?.asrama}
              </span>
            </div>
            <h2
              className="text-xl font-bold mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}
            >
              Jenis Sampah
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--color-muted-foreground)' }}>
              Pilih kategori sampah yang akan disetor
            </p>
            <div className="space-y-3">
              {tarifSampah.map((tarif) => {
                const cfg = JENIS_CONFIG[tarif.jenis] ?? JENIS_CONFIG.Residu
                return (
                  <button
                    key={tarif.id}
                    onClick={() => { setSelectedJenis(tarif); setStep('sensor') }}
                    className="w-full rounded-2xl border-2 p-4 text-left flex items-center gap-4 transition-all active:scale-[0.99]"
                    style={{ borderColor: cfg.border, background: cfg.bg }}
                  >
                    <div className="text-3xl shrink-0">{cfg.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base" style={{ color: cfg.color }}>
                        {tarif.jenis}
                      </div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-muted-foreground)' }}>
                        {tarif.keterangan}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {tarif.poinPerKg > 0 ? (
                        <div className="text-sm font-bold" style={{ color: cfg.color }}>
                          {tarif.poinPerKg} pt/kg
                        </div>
                      ) : (
                        <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                          0 pt/kg
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Step 3: Sensor IoT ── */}
        {step === 'sensor' && (
          <div>
            <button
              onClick={() => { setStep('jenis'); resetSensor() }}
              className="flex items-center gap-1 text-sm mb-3 py-2"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              <ChevronLeft size={13} /> Ganti Jenis
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="text-2xl">{JENIS_CONFIG[selectedJenis?.jenis ?? '']?.emoji ?? '♻️'}</div>
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--color-foreground)' }}>
                  {selectedKamar?.nama}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  {selectedJenis?.jenis}
                </div>
              </div>
            </div>

            <h2
              className="text-xl font-bold mb-4"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}
            >
              Sensor Timbangan IoT
            </h2>

            {(submitError || sensorError) && (
              <div
                className="mb-4 rounded-xl p-3 text-sm flex items-center gap-2"
                style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}
              >
                <AlertCircle size={14} className="shrink-0" />
                {sensorError || submitError}
              </div>
            )}

            {/* IoT Sensor Panel */}
            <div
              className="rounded-3xl p-6 mb-4 border"
              style={{
                background: 'linear-gradient(145deg, #0A1F10 0%, #1A3D22 50%, #0F2D18 100%)',
                borderColor: '#2A5C35',
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full transition-all"
                    style={{
                      background:
                        sensorStatus === 'idle' ? '#374151' :
                        sensorStatus === 'connecting' ? '#D4A017' :
                        sensorStatus === 'measuring' ? '#86EFAC' : '#4ADE80',
                      boxShadow:
                        sensorStatus === 'stable' ? '0 0 8px #4ADE80' :
                        sensorStatus === 'measuring' ? '0 0 6px #86EFAC' :
                        sensorStatus === 'connecting' ? '0 0 6px #D4A017' : 'none',
                    }}
                  />
                  <span className="text-xs font-mono font-semibold tracking-widest" style={{ color: '#6EE7B7' }}>
                    {sensorStatus === 'idle' ? 'STANDBY' :
                     sensorStatus === 'connecting' ? 'CONNECTING' :
                     sensorStatus === 'measuring' ? 'MEASURING' : 'STABLE'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wifi size={14} style={{ color: sensorStatus === 'idle' ? '#374151' : '#4ADE80' }} />
                  <Scale size={14} style={{ color: '#4B5563' }} />
                </div>
              </div>

              <div className="text-center mb-6">
                <div
                  className="text-7xl font-bold leading-none tabular-nums"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color:
                      sensorStatus === 'stable' ? '#4ADE80' :
                      sensorStatus === 'idle' ? '#1F2937' : '#86EFAC',
                    textShadow:
                      sensorStatus === 'stable' ? '0 0 24px rgba(74,222,128,0.4)' :
                      sensorStatus === 'measuring' ? '0 0 16px rgba(134,239,172,0.2)' : 'none',
                    transition: 'color 0.4s, text-shadow 0.4s',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {displayWeight.toFixed(2)}
                </div>
                <div className="text-lg font-semibold mt-1" style={{ color: sensorStatus === 'idle' ? '#1F2937' : '#6EE7B7' }}>
                  kg
                </div>
              </div>

              <div className="min-h-[32px] flex items-center justify-center">
                {sensorStatus === 'idle' && (
                  <p className="text-xs text-center" style={{ color: '#374151' }}>
                    Tidak terhubung ke timbangan. Tekan tombol di bawah untuk mencoba lagi.
                  </p>
                )}
                {sensorStatus === 'connecting' && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ background: '#D4A017', animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
                        />
                      ))}
                    </div>
                    <span className="text-xs" style={{ color: '#D4A017' }}>Menghubungkan ke sensor...</span>
                  </div>
                )}
                {sensorStatus === 'measuring' && (
                  <div className="w-full">
                    <div className="flex items-center gap-1.5 mb-1.5 justify-center">
                      <Activity size={11} style={{ color: '#86EFAC' }} />
                      <span className="text-xs" style={{ color: '#86EFAC' }}>
                        {displayWeight < BERAT_MIN_KG
                          ? 'Letakkan sampah pada timbangan...'
                          : 'Mendeteksi berat sampah...'}
                      </span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden mx-4" style={{ background: '#1A3D24' }}>
                      <div
                        className="h-full rounded-full animate-pulse"
                        style={{ width: '65%', background: 'linear-gradient(90deg, #4ADE80, #86EFAC)' }}
                      />
                    </div>
                  </div>
                )}
                {sensorStatus === 'stable' && (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} style={{ color: '#4ADE80' }} />
                    <span className="text-sm font-semibold" style={{ color: '#4ADE80' }}>
                      Berat Terdeteksi & Stabil
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {sensorStatus === 'idle' && (
                <button
                  onClick={activateSensor}
                  className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2"
                  style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
                >
                  <Scale size={20} />
                  Hubungkan Ulang ke Timbangan
                </button>
              )}

              {(sensorStatus === 'connecting' || sensorStatus === 'measuring') && (
                <div
                  className="py-4 text-center text-sm rounded-2xl"
                  style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                >
                  Harap tunggu, sensor sedang bekerja...
                </div>
              )}

              {sensorStatus === 'stable' && (
                <>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-4 rounded-2xl text-base font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
                  >
                    <Send size={18} />
                    {submitting ? 'Mengirim...' : `Kirim Setoran (${finalWeight.toFixed(2)} kg)`}
                  </button>
                  <button
                    onClick={activateSensor}
                    disabled={submitting}
                    className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
                  >
                    <RefreshCw size={14} />
                    Timbang Ulang
                  </button>
                </>
              )}
            </div>

            {sensorStatus === 'stable' && selectedJenis && (
              <div className="mt-4 p-4 rounded-2xl text-center" style={{ background: 'var(--color-secondary)' }}>
                <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--color-muted-foreground)' }}>
                  Estimasi Poin untuk {selectedKamar?.nama}
                </div>
                {selectedJenis.poinPerKg > 0 ? (
                  <div className="text-3xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                    +{Math.round(selectedJenis.poinPerKg * finalWeight)}
                  </div>
                ) : (
                  <div className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    Jenis ini tidak menghasilkan poin, namun tetap perlu disetor dengan benar.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
