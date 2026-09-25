import { useState, useEffect, useRef } from 'react'
import { Scale, Wifi, CheckCircle2, ChevronLeft, RefreshCw, Send, Activity, AlertCircle } from 'lucide-react'
import logoSrc from './assets/logo.jpeg'
import { getKamar, getTarifSampah, kirimSetoran } from './api/services'
import { ApiError } from './api/client'
import type { Kamar, TarifSampah } from './types'

type Step = 'kamar' | 'jenis' | 'sensor' | 'sukses'
type SensorStatus = 'idle' | 'connecting' | 'measuring' | 'stable'

const JENIS_CONFIG: Record<string, { emoji: string; color: string; bg: string; border: string }> = {
  Organik: { emoji: '🍃', color: '#15803D', bg: '#F0FDF4', border: '#86EFAC' },
  Anorganik: { emoji: '♻️', color: '#1E7A32', bg: '#EDF7EF', border: '#CCEBD3' },
  'Sampah B3': { emoji: '⚠️', color: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  'Sampah Kertas': { emoji: '📄', color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
  Residu: { emoji: '🗑️', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
}

const STEPS: Step[] = ['kamar', 'jenis', 'sensor']
const STEP_LABEL: Record<Step, string> = { kamar: 'Kamar', jenis: 'Sampah', sensor: 'Timbang', sukses: '' }

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [successPoin, setSuccessPoin] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function loadData() {
    setLoadingData(true)
    setLoadError(null)
    Promise.all([getKamar(), getTarifSampah()])
      .then(([k, t]) => { setAllKamar(k); setTarifSampah(t) })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : 'Tidak bisa terhubung ke server. Periksa koneksi.'))
      .finally(() => setLoadingData(false))
  }

  useEffect(loadData, [])
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  function activateSensor() {
    setSensorStatus('connecting')
    setDisplayWeight(0)
    setFinalWeight(0)
    setTimeout(() => {
      setSensorStatus('measuring')
      const target = Math.round((Math.random() * 3.8 + 0.4) * 100) / 100
      let ticks = 0
      const total = 28
      intervalRef.current = setInterval(() => {
        ticks++
        const t = ticks / total
        const osc = Math.sin(ticks * 1.2) * Math.exp(-ticks * 0.18)
        const val = target * (1 - Math.exp(-t * 5)) + target * osc * 0.25
        const noise = (Math.random() - 0.5) * (1 - t) * 0.2
        setDisplayWeight(Math.max(0, Math.round((val + noise) * 100) / 100))
        if (ticks >= total) {
          clearInterval(intervalRef.current!)
          setDisplayWeight(target)
          setFinalWeight(target)
          setSensorStatus('stable')
        }
      }, 170)
    }, 1400)
  }

  function resetSensor() {
    if (intervalRef.current) clearInterval(intervalRef.current)
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
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'Gagal mengirim setoran. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  function resetAll() {
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <p style={{ color: 'var(--color-muted-foreground)' }}>Memuat Portal Santri...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--color-background)' }}>
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
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
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
            { label: 'Berat Terdeteksi', value: `${finalWeight} kg` },
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
      {/* Header */}
      <header
        className="shrink-0 px-4 py-3 border-b flex items-center gap-3"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <img src={logoSrc} alt="Logo" style={{ height: '32px', objectFit: 'contain' }} />
        <span
          className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ background: 'var(--color-secondary)', color: 'var(--color-primary)' }}
        >
          Portal Santri
        </span>
      </header>

      {/* Step indicator */}
      <div className="shrink-0 px-4 pt-4 pb-2">
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
      <div className="flex-1 overflow-y-auto p-4">
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

        {/* ── Step 2: Pilih Jenis Sampah ── */}
        {step === 'jenis' && (
          <div>
            <button
              onClick={() => setStep('kamar')}
              className="flex items-center gap-1 text-sm mb-3"
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
              className="flex items-center gap-1 text-sm mb-3"
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

            {submitError && (
              <div
                className="mb-4 rounded-xl p-3 text-sm flex items-center gap-2"
                style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}
              >
                <AlertCircle size={14} className="shrink-0" />
                {submitError}
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
                    Letakkan sampah pada timbangan, lalu tekan Aktifkan Sensor
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
                      <span className="text-xs" style={{ color: '#86EFAC' }}>Mendeteksi berat sampah...</span>
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
                  Aktifkan Sensor Timbangan
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
                    {submitting ? 'Mengirim...' : `Kirim Setoran (${finalWeight} kg)`}
                  </button>
                  <button
                    onClick={resetSensor}
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
