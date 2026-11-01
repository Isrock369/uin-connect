import { BookOpen, Pencil, Trash2, Plus, Search, FolderOpen, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getModul, createModul, updateModul, deleteModul, getModulFile, getKategoriPanduan, saveKategoriPanduan, deleteKategoriPanduan } from '../api/services'
import type { ModulInput } from '../api/services'
import type { Modul } from '../types'


const empty: ModulInput = { judul: '', kategoriId: '', deskripsi: '', konten: '' }
const control = 'w-full rounded-xl border border-(--color-border) bg-(--color-background) px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-(--color-primary)'

export default function Panduan() {
  const [categories, setCategories] = useState<{ id: string; nama: string; jumlah: number }[]>([])
  const [query, setQuery] = useState('')
  const [manage, setManage] = useState(false)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-(--color-border) px-3 py-2 text-sm font-medium hover:opacity-80 disabled:opacity-40'
  const primary = button + ' bg-(--color-primary) text-(--color-primary-foreground)'
  async function categoryAction(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try { await action(); setCategoryId(null); setCategoryName(''); await reload() }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Gagal mengelola kategori.') }
    finally { setBusy(false) }
  }
  const [modules, setModules] = useState<Modul[]>([])
  const [form, setForm] = useState<ModulInput>(empty)
  const [editing, setEditing] = useState<Modul | null>(null)
  const [reading, setReading] = useState<Modul | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [filter, setFilter] = useState('Semua')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<Modul | null>(null)

  async function reload() {
    setLoading(true)
    setLoadFailed(false)
    setError('')
    try { const [items, groups] = await Promise.all([getModul(), getKategoriPanduan()]); setModules(items); setCategories(groups) }
    catch { setLoadFailed(true); setError('Gagal memuat panduan. Silakan coba lagi.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void reload() }, [])

  function edit(module: Modul | null) {
    setEditing(module)
    setForm(module ? { judul: module.judul, kategoriId: module.kategoriId, deskripsi: module.deskripsi, konten: module.konten } : { ...empty, kategoriId: categories[0]?.id || '' })
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
        if (!/\.pdf$/i.test(file.name) || file.size === 0 || file.size > 60 * 1024 * 1024) throw new Error('Pilih PDF maksimal 60 MB.')
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

  return <div className="page-guides space-y-5 text-(--color-foreground)">
    <div className="guide-toolbar page-toolbar">
      <label className="guide-search relative min-w-0"><Search size={16} className="absolute left-3 top-3 text-(--color-muted-foreground)" /><input aria-label="Cari panduan" placeholder="Cari judul atau deskripsi..." className={control + ' pl-9'} value={query} onChange={event => setQuery(event.target.value)} /></label>
      <select aria-label="Filter kategori" className={control + ' guide-filter'} value={filter} onChange={event => setFilter(event.target.value)}><option value="Semua">Semua kategori</option>{categories.map(category => <option key={category.id} value={category.id}>{category.nama}</option>)}</select>
      <button className={button + ' guide-manage'} onClick={() => { setError(''); setManage(true) }}><FolderOpen size={16} />Kelola Kategori</button>
      <button disabled={loading || !categories.length} className={primary + ' guide-add'} onClick={() => edit(null)}><Plus size={16} />Tambah Panduan</button>
    </div>
    {error && <p role="alert" className="rounded-xl p-3 text-sm bg-(--color-error-bg) text-(--color-error)">{error}</p>}
    {!loading && !loadFailed && <p className="text-xs text-(--color-muted-foreground)">{modules.length} panduan tersedia untuk pengurus pesantren</p>}
    {loading ? <p role="status" className="text-sm">Memuat panduan...</p> : loadFailed ? <button className={button} onClick={() => void reload()}>Coba lagi</button> : <div className="grid gap-4 lg:grid-cols-2">
      {modules.filter(module => (filter === 'Semua' || module.kategoriId === filter) && (module.judul + ' ' + module.deskripsi).toLowerCase().includes(query.toLowerCase())).map(module => <article key={module.id} className="guide-card rounded-2xl border border-(--color-border) bg-(--color-card) p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
        <span className="self-start rounded-full px-2.5 py-1 text-xs font-semibold bg-(--color-secondary) text-(--color-secondary-foreground)">{module.kategori}</span><h3 className="font-semibold text-base">{module.judul}</h3><p className="text-sm text-(--color-muted-foreground) line-clamp-3">{module.deskripsi}</p>
        {module.fileName && <div className="guide-attachment flex items-center gap-2 rounded-xl bg-(--color-muted) p-3 text-xs"><FileText size={18} className="shrink-0 text-(--color-primary)" /><span title={module.fileName} className="truncate flex-1">{module.fileName}</span><button className={button} disabled={busy} onClick={() => openFile(module, false)}>Buka</button><button className={button} disabled={busy} onClick={() => openFile(module, true)}>Unduh</button></div>}
        <div className="flex items-center gap-2 mt-auto pt-3 border-t border-(--color-border)"><button className={button + ' guide-read'} onClick={() => setReading(module)}><BookOpen size={15} />Baca Panduan</button><button className={button + ' ml-auto'} title="Edit panduan" aria-label={'Edit ' + module.judul} onClick={() => edit(module)}><Pencil size={15} /></button><button className={button + ' text-(--color-error)'} title="Hapus panduan" aria-label={'Hapus ' + module.judul} onClick={() => setDeleting(module)}><Trash2 size={15} /></button></div>
      </article>)}
      {!modules.some(module => (filter === 'Semua' || module.kategoriId === filter) && (module.judul + ' ' + module.deskripsi).toLowerCase().includes(query.toLowerCase())) && <p className="empty-panel lg:col-span-2">Tidak ada panduan yang cocok. Coba kata kunci atau kategori lain.</p>}
    </div>}
    {(showForm || reading || deleting || manage) && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <section role="dialog" aria-modal="true" aria-label={manage ? 'Kelola Kategori' : showForm ? 'Form panduan' : deleting ? 'Hapus panduan' : 'Baca panduan'} className="guide-dialog bg-(--color-card) rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto space-y-4">
        {error && <p role="alert" className="text-(--color-error)">{error}</p>}
        {manage ? <div className="space-y-4"><h3 className="text-lg font-semibold">Kelola Kategori</h3><p className="text-sm text-(--color-muted-foreground)">Kategori yang masih digunakan harus dikosongkan sebelum dihapus.</p>
          <form className="category-form flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); void categoryAction(() => saveKategoriPanduan(categoryId, categoryName)) }}>
            <input aria-label="Nama kategori" required maxLength={50} className={control} placeholder="Nama kategori" value={categoryName} onChange={event => setCategoryName(event.target.value)} />
            <button className={primary} disabled={busy || !categoryName.trim()}>{categoryId ? 'Simpan' : 'Tambah'}</button>
            {categoryId && <button type="button" className={button} onClick={() => { setCategoryId(null); setCategoryName('') }}>Batal</button>}
          </form>
          {categories.map(category => <div key={category.id} className="category-row flex items-center gap-3 border-b border-(--color-border) py-3"><div className="flex-1"><p className="text-sm font-medium">{category.nama}</p><p className="text-xs text-(--color-muted-foreground)">{category.jumlah} panduan</p></div><button className={button} disabled={busy} onClick={() => { setCategoryId(category.id); setCategoryName(category.nama) }}>Edit</button><button className={button} disabled={busy || category.jumlah > 0} onClick={() => { if (window.confirm('Hapus kategori ' + category.nama + '?')) void categoryAction(() => deleteKategoriPanduan(category.id)) }}>Hapus</button></div>)}
          <button className={button} disabled={busy} onClick={() => { setManage(false); setError('') }}>Tutup</button>
        </div> : showForm ? <form onSubmit={save} className="space-y-4 text-sm">
          <h3 className="font-semibold">{editing ? 'Edit Panduan' : 'Tambah Panduan'}</h3>
          <fieldset disabled={busy} className="space-y-4">
            <label className="block">Judul<input required maxLength={150} className={control} value={form.judul} onChange={event => setForm({ ...form, judul: event.target.value })} /></label>
            <label className="block">Kategori<select className={control} value={form.kategoriId} onChange={event => setForm({ ...form, kategoriId: event.target.value })}>{categories.map(category => <option key={category.id} value={category.id}>{category.nama}</option>)}</select></label>
            <label className="block">Deskripsi<textarea required maxLength={255} className={control} value={form.deskripsi} onChange={event => setForm({ ...form, deskripsi: event.target.value })} /></label>
            <label className="block">Isi panduan<textarea rows={6} maxLength={16000} className={control} value={form.konten} onChange={event => setForm({ ...form, konten: event.target.value })} /></label>
            <label className="block">File panduan (PDF, maksimal 60 MB)<input className={control} type="file" accept=".pdf,application/pdf" onChange={event => setFile(event.target.files?.[0] || null)} /></label>
            {editing?.fileName && <div><p>File tersimpan: {editing.fileName}</p><label><input type="checkbox" checked={form.file === null} onChange={event => setForm({ ...form, file: event.target.checked ? null : undefined })} /> Hapus lampiran lama</label><p className="text-sm">File baru akan menggantikan lampiran lama. Tanpa perubahan, lampiran tetap tersimpan.</p></div>}
            <div className="sticky bottom-0 bg-(--color-card) border-t border-(--color-border) py-4 flex justify-end gap-3"><button className={primary} type="submit" disabled={!form.judul.trim() || !form.deskripsi.trim()}>Simpan Panduan</button><button className={button} type="button" onClick={() => setShowForm(false)}>Batal</button></div>
          </fieldset>
          {busy && <p>Menyimpan...</p>}
        </form> : deleting ? <><h3>Hapus {deleting.judul}?</h3><p>Panduan dan lampirannya akan dihapus permanen.</p><button className={button} disabled={busy} onClick={remove}>Hapus</button><button className={button} disabled={busy} onClick={() => setDeleting(null)}>Batal</button></> : reading && <>
          <h3 className="text-xl font-semibold">{reading.judul}</h3><p>{reading.deskripsi}</p><div className="guide-content whitespace-pre-wrap">{reading.konten}</div>
          {reading.fileName && <div className="space-y-3"><p>{reading.fileName}</p><div className="flex gap-4"><button className={button} disabled={busy} onClick={() => openFile(reading, false)}>Buka PDF</button><button className={button} disabled={busy} onClick={() => openFile(reading, true)}>Unduh PDF</button></div></div>}
          <button className={button} disabled={busy} onClick={() => setReading(null)}>Tutup</button>
        </>}
      </section>
    </div>}
  </div>
}


