import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Building2, Recycle, RefreshCw, MessageSquare } from 'lucide-react'
import { getAssistantAnswer, type AssistantAnswer, type Topic } from '../api/asisten'
import './Asisten.css'

const questions = [
  { id: 'poin' as Topic, icon: Building2, title: 'Berapa total poin semua mabna?', description: 'Lihat total saldo dan rincian poin seluruh mabna sekaligus.' },
  { id: 'sampah' as Topic, icon: Recycle, title: 'Berapa total sampah bulan ini?', description: 'Lihat total bulanan dan rincian seluruh jenis sampah dari Kategori Sampah.' },
  { id: 'mabna' as Topic, icon: Building2, title: 'Berapa total sampah per mabna bulan ini?', description: 'Lihat total berat setiap mabna dan rincian seluruh kategori sampah yang tersedia.' },
]
export default function Asisten() {
  const [busy, setBusy] = useState<Topic | null>(null)
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null)
  const [error, setError] = useState('')
  const sequence = useRef(0)
  const resultRef = useRef<HTMLElement>(null)
  useEffect(() => () => { sequence.current++ }, [])
  async function ask(topic: Topic) {
    if (busy) return
    const request = ++sequence.current
    setBusy(topic); setAnswer(null); setError('')
    try {
      const data = await getAssistantAnswer(topic)
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
      <div className="assistant-questions">
        {questions.map(({ id, icon: Icon, title, description }, index) => {
          return <section className="assistant-card" key={id}>
            <div className="assistant-card-top"><span className="assistant-symbol"><Icon size={21} aria-hidden="true" /></span><span className="assistant-number">0{index + 1}</span></div>
            <h3>{title}</h3><p>{description}</p>
            <div className="assistant-choice">
              <div className="assistant-period">
                <strong>{id === 'poin' ? 'Semua mabna / asrama' : id === 'sampah' ? 'Semua jenis sampah' : 'Semua mabna dan kategori sampah'}</strong>
                <span>{id === 'poin' ? 'Saldo poin saat ini' : id === 'sampah' ? 'Tanggal 1 sampai hari ini (WIB)' : 'Tanggal 1 sampai hari ini (WIB)'}</span>
              </div>
            </div>
            <button className="assistant-action" disabled={!!busy} onClick={() => ask(id)}>
              {busy === id ? 'Menyiapkan jawaban...' : 'Lihat ringkasan'}<ArrowRight size={16} aria-hidden="true" />
            </button>
          </section>
        })}
      </div>
      <div aria-live="polite" role="status">{busy && <p className="assistant-muted">Mengambil data dan menyiapkan penjelasan AI...</p>}</div>
      {error && <div role="alert" className="assistant-error">{error} Silakan coba kembali.</div>}
      {answer && <section ref={resultRef} tabIndex={-1} className="assistant-result" aria-label="Hasil ringkasan">
        <div className="assistant-result-heading"><div><span className="assistant-eyebrow">HASIL RINGKASAN</span><h2>{answer.title}</h2><p>{answer.period}</p></div>
          <button className="assistant-refresh" onClick={() => ask(answer.topic)} aria-label="Perbarui ringkasan"><RefreshCw size={16} />Perbarui</button></div>
        <div className="assistant-metrics">{answer.metrics.map(metric => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>
        <p className="assistant-summary">{answer.summary}</p>
        {answer.aiExplanation && <div className="assistant-ai"><h3>Penjelasan AI</h3><p>{answer.aiExplanation}</p></div>}
        {answer.aiStatus && <p className="assistant-note" role="status">{answer.aiStatus}</p>}
        {answer.details.length > 0 && <dl className="assistant-details">{answer.details.map((detail, i) => <div key={`${detail.label}-${i}`}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>}
        {answer.mabna?.map(item => <div key={item.id} className="assistant-ai">
          <h3>{item.nama} · {item.total}</h3>
          <dl className="assistant-details">{item.categories.map(category => <div key={category.label}><dt>{category.label}</dt><dd>{category.value}</dd></div>)}</dl>
          {item.categories.length === 0 && <p>Belum ada kategori sampah terdaftar.</p>}
        </div>)}
        <p className="assistant-note">{answer.note}</p>
        <p className="assistant-updated">Diperbarui {new Date(answer.generatedAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>
      </section>}
    </div>
  )
}

