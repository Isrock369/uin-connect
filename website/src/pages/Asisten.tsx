import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Building2, Recycle, TrendingUp, RefreshCw, MessageSquare } from 'lucide-react'
import { getAssistantAnswer, getAssistantOptions, type AssistantAnswer, type AssistantOptions, type Topic } from '../api/asisten'
import './Asisten.css'

const questions = [
  { id: 'poin' as Topic, icon: Building2, title: 'Berapa total poin mabna ini?', description: 'Lihat saldo yang tersedia dan rincian poin setiap kamar.' },
  { id: 'sampah' as Topic, icon: Recycle, title: 'Berapa total sampah bulan ini?', description: 'Pilih jenis sampah untuk melihat berat setoran yang disetujui.' },
  { id: 'mingguan' as Topic, icon: TrendingUp, title: 'Bagaimana perkembangan minggu ini?', description: 'Bandingkan berat sampah dan partisipasi kamar dengan minggu lalu.' },
]
export default function Asisten() {
  const [options, setOptions] = useState<AssistantOptions>({ asrama: [], sampah: [] })
  const [loading, setLoading] = useState(true)
  const [optionError, setOptionError] = useState('')
  const [selected, setSelected] = useState({ poin: '', sampah: '' })
  const [busy, setBusy] = useState<Topic | null>(null)
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null)
  const [error, setError] = useState('')
  const sequence = useRef(0)
  const resultRef = useRef<HTMLElement>(null)
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setOptionError('')
    getAssistantOptions().then(data => {
      if (active) { setOptions(data); setSelected({ poin: '', sampah: '' }) }
    }).catch(() => { if (active) setOptionError('Pilihan mabna dan sampah gagal dimuat. Coba muat ulang.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; sequence.current++ }
  }, [reload])
  function resetAnswer() { sequence.current++; setBusy(null); setAnswer(null); setError('') }
  async function ask(topic: Topic) {
    const request = ++sequence.current
    setBusy(topic); setAnswer(null); setError('')
    try {
      const data = await getAssistantAnswer(topic, topic === 'mingguan' ? '' : selected[topic])
      if (request === sequence.current) { setAnswer(data); requestAnimationFrame(() => resultRef.current?.focus()) }
    } catch (e) {
      if (request === sequence.current) setError(e instanceof Error ? e.message : 'Ringkasan gagal dimuat. Silakan coba lagi.')
    } finally { if (request === sequence.current) setBusy(null) }
  }
  return (
    <div className="assistant-page">
      <div className="assistant-intro">
        <span className="assistant-symbol"><MessageSquare size={23} aria-hidden="true" /></span>
        <div><h2>Apa yang ingin kamu ketahui?</h2><p>Pilih pertanyaan untuk melihat ringkasan berdasarkan data terbaru.</p></div>
        <span className="assistant-badge">{answer?.mode === 'ai' ? 'Penjelasan OpenAI' : 'Ringkasan data + penjelasan AI'}</span>
      </div>
      {optionError && <div role="alert" className="assistant-error">{optionError} <button onClick={() => { resetAnswer(); setReload(value => value + 1) }}>Coba lagi</button></div>}
      <div className="assistant-questions">
        {questions.map(({ id, icon: Icon, title, description }, index) => {
          const needsChoice = id !== 'mingguan'
          const choices = id === 'poin' ? options.asrama.map(item => ({ id: item.id, label: item.nama })) : options.sampah.map(item => ({ id: item.id, label: `${item.jenis} · ${item.kategori}` }))
          return <section className="assistant-card" key={id}>
            <div className="assistant-card-top"><span className="assistant-symbol"><Icon size={21} aria-hidden="true" /></span><span className="assistant-number">0{index + 1}</span></div>
            <h3>{title}</h3><p>{description}</p>
            <div className="assistant-choice">
              {needsChoice ? <><label htmlFor={`assistant-${id}`}>{id === 'poin' ? 'Mabna / asrama' : 'Jenis sampah'}</label>
                <select id={`assistant-${id}`} value={selected[id]} disabled={loading || !!optionError || !!busy} onChange={event => { resetAnswer(); setSelected(value => ({ ...value, [id]: event.target.value })) }}>
                  <option value="">{loading ? 'Memuat pilihan...' : id === 'poin' ? 'Pilih mabna' : 'Pilih jenis sampah'}</option>
                  {choices.map(choice => <option key={choice.id} value={String(choice.id)}>{choice.label}</option>)}
                </select>
                {!loading && !optionError && choices.length === 0 && <small>Belum ada data. Tambahkan melalui {id === 'poin' ? 'Poin per Kamar' : 'Kategori Sampah'}.</small>}
              </> : <div className="assistant-period"><strong>Senin sampai hari ini</strong><span>Waktu Indonesia Barat (WIB)</span></div>}
            </div>
            <button className="assistant-action" disabled={!!busy || (needsChoice && (loading || !!optionError || !selected[id]))} onClick={() => ask(id)}>
              {busy === id ? 'Menyiapkan jawaban...' : 'Lihat ringkasan'}<ArrowRight size={16} aria-hidden="true" />
            </button>
          </section>
        })}
      </div>
      <div aria-live="polite" role="status">{busy && <p className="assistant-muted">Mengambil data dan menyiapkan penjelasan AI...</p>}</div>
      {error && <div role="alert" className="assistant-error">{error} Klik Lihat ringkasan untuk mencoba kembali.</div>}
      {answer && <section ref={resultRef} tabIndex={-1} className="assistant-result" aria-label="Hasil ringkasan">
        <div className="assistant-result-heading"><div><span className="assistant-eyebrow">HASIL RINGKASAN</span><h2>{answer.title}</h2><p>{answer.period}</p></div>
          <button className="assistant-refresh" onClick={() => ask(answer.topic)} aria-label="Perbarui ringkasan"><RefreshCw size={16} />Perbarui</button></div>
        <div className="assistant-metrics">{answer.metrics.map(metric => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>
        <p className="assistant-summary">{answer.summary}</p>
        {answer.aiExplanation && <div className="assistant-ai"><h3>Penjelasan AI</h3><p>{answer.aiExplanation}</p></div>}
        {answer.aiStatus && <p className="assistant-note" role="status">{answer.aiStatus}</p>}
        {answer.details.length > 0 && <dl className="assistant-details">{answer.details.map((detail, i) => <div key={`${detail.label}-${i}`}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>}
        <p className="assistant-note">{answer.note}</p>
        <p className="assistant-updated">Diperbarui {new Date(answer.generatedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>
      </section>}
    </div>
  )
}
