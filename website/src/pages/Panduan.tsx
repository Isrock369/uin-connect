import { useEffect, useState } from 'react'
import { getModul, createModul, updateModul, deleteModul, getModulFile } from '../api/services'
import type { ModulInput } from '../api/services'
import type { Modul } from '../types'

const categories = ['Cara Pilah', 'Cara Setor', 'Pengolahan Organik', 'Dampak Lingkungan']
const empty: ModulInput = { judul: '', kategori: categories[0], deskripsi: '', konten: '' }
const control = 'w-full rounded-xl border border-(--color-border) bg-(--color-background) p-3'

export default function Panduan() {
  const [modules, setModules] = useState<Modul[]>([])
  const [form, setForm] = useState<ModulInput>(empty)
  const [editing, setEditing] = useState<Modul | null>(null)
  const [reading, setReading] = useState<Modul | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [filter, setFilter] = useState('Semua')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<Modul | null>(null)

  async function reload() {
    setLoading(true)
    try { setModules(await getModul()) }
    catch { setError('Gagal memuat panduan. Silakan coba lagi.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void reload() }, [])

  function edit(module: Modul | null) {
    setEditing(module)
    setForm(module ? { judul: module.judul, kategori: module.kategori, deskripsi: module.deskripsi, konten: module.konten } : empty)
    setFile(null)
    setError('')
    setShowForm(true)
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const data = { ...form }
      if (file) {
        if (!/\.pdf$/i.test(file.name) || file.size === 0 || file.size > 5 * 1024 * 1024) throw new Error('Pilih PDF maksimal 5 MB.')
        const encoded = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result).split(',')[1])
          reader.onerror = () => reject(new Error('File gagal dibaca.'))
          reader.readAsDataURL(file)
        })
        data.file = { name: file.name, data: encoded }
      }
      if (editing) await updateModul(editing.id, data)
      else await createModul(data)
      setShowForm(false)
      setReading(null)
      await reload()
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Gagal menyimpan panduan.') }
    finally { setBusy(false) }
  }

  async function openFile(module: Modul, download: boolean) {
    setBusy(true)
    setError('')
    const preview = download ? null : window.open('about:blank', '_blank')
    if (preview) preview.opener = null
    try {
      const blob = await getModulFile(module.id)
      const url = URL.createObjectURL(blob)
      if (preview) preview.location.href = url
      else {
        const link = document.createElement('a')
        link.href = url
        link.download = module.fileName || 'panduan.pdf'
        link.click()
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { preview?.close(); setError('Gagal mengambil file panduan. Periksa sesi login dan coba lagi.') }
    finally { setBusy(false) }
  }

  async function remove() {
    if (!deleting || busy) return
    setBusy(true)
    try {
      await deleteModul(deleting.id)
      setDeleting(null)
      setReading(null)
      await reload()
    } catch { setError('Gagal menghapus panduan.') }
    finally { setBusy(false) }
  }

  return <div className="space-y-5 text-(--color-foreground)">
    <div className="flex justify-between gap-4">
      <div><h2 className="text-xl font-semibold">Panduan Pengurus Sampah</h2><p>Panduan kerja dan dokumen untuk pengurus sampah pesantren.</p></div>
      <button className="rounded-xl bg-(--color-primary) text-(--color-primary-foreground) px-4" onClick={() => edit(null)}>Tambah Panduan</button>
    </div>
    {error && <p role="alert" className="text-(--color-error)">{error}</p>}
    <label>Kategori<select className={control} value={filter} onChange={event => setFilter(event.target.value)}>{['Semua', ...categories].map(category => <option key={category}>{category}</option>)}</select></label>
    {loading ? <p>Memuat panduan...</p> : <div className="grid gap-4 lg:grid-cols-2">
      {modules.filter(module => filter === 'Semua' || module.kategori === filter).map(module => <article key={module.id} className="rounded-2xl border border-(--color-border) bg-(--color-card) p-5 space-y-3">
        <p className="text-sm">{module.kategori}</p><h3 className="font-semibold">{module.judul}</h3><p>{module.deskripsi}</p>
        {module.fileName && <p className="text-sm break-all">Lampiran: {module.fileName}</p>}
        <div className="flex gap-4 flex-wrap"><button onClick={() => setReading(module)}>Baca</button><button onClick={() => edit(module)}>Edit</button><button onClick={() => setDeleting(module)}>Hapus</button></div>
      </article>)}
      {!modules.some(module => filter === 'Semua' || module.kategori === filter) && <p>Belum ada panduan di kategori ini.</p>}
    </div>}
    {(showForm || reading || deleting) && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <section role="dialog" aria-modal="true" aria-label={showForm ? 'Form panduan' : deleting ? 'Hapus panduan' : 'Baca panduan'} className="bg-(--color-card) rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto space-y-4">
        {error && <p role="alert" className="text-(--color-error)">{error}</p>}
        {showForm ? <form onSubmit={save} className="space-y-4">
          <h3 className="font-semibold">{editing ? 'Edit Panduan' : 'Tambah Panduan'}</h3>
          <fieldset disabled={busy} className="space-y-4">
            <label className="block">Judul<input required maxLength={150} className={control} value={form.judul} onChange={event => setForm({ ...form, judul: event.target.value })} /></label>
            <label className="block">Kategori<select className={control} value={form.kategori} onChange={event => setForm({ ...form, kategori: event.target.value })}>{Array.from(new Set([...categories, form.kategori])).map(category => <option key={category}>{category}</option>)}</select></label>
            <label className="block">Deskripsi<textarea required maxLength={255} className={control} value={form.deskripsi} onChange={event => setForm({ ...form, deskripsi: event.target.value })} /></label>
            <label className="block">Isi panduan<textarea rows={6} maxLength={16000} className={control} value={form.konten} onChange={event => setForm({ ...form, konten: event.target.value })} /></label>
            <label className="block">File panduan (PDF, maksimal 5 MB)<input className={control} type="file" accept=".pdf,application/pdf" onChange={event => setFile(event.target.files?.[0] || null)} /></label>
            {editing?.fileName && <div><p>File tersimpan: {editing.fileName}</p><label><input type="checkbox" checked={form.file === null} onChange={event => setForm({ ...form, file: event.target.checked ? null : undefined })} /> Hapus lampiran lama</label><p className="text-sm">File baru akan menggantikan lampiran lama. Tanpa perubahan, lampiran tetap tersimpan.</p></div>}
            <div className="flex gap-4"><button type="submit" disabled={!form.judul.trim() || !form.deskripsi.trim()}>Simpan Panduan</button><button type="button" onClick={() => setShowForm(false)}>Batal</button></div>
          </fieldset>
          {busy && <p>Menyimpan...</p>}
        </form> : deleting ? <><h3>Hapus {deleting.judul}?</h3><p>Panduan dan lampirannya akan dihapus permanen.</p><button disabled={busy} onClick={remove}>Hapus</button><button disabled={busy} onClick={() => setDeleting(null)}>Batal</button></> : reading && <>
          <h3 className="text-xl font-semibold">{reading.judul}</h3><p>{reading.deskripsi}</p><div className="whitespace-pre-wrap">{reading.konten}</div>
          {reading.fileName && <div className="space-y-3"><p>{reading.fileName}</p><div className="flex gap-4"><button disabled={busy} onClick={() => openFile(reading, false)}>Buka PDF</button><button disabled={busy} onClick={() => openFile(reading, true)}>Unduh PDF</button></div></div>}
          <button disabled={busy} onClick={() => setReading(null)}>Tutup</button>
        </>}
      </section>
    </div>}
  </div>
}
