import { useEffect, useRef } from 'react'
import { Check, X } from 'lucide-react'
import type { StrukPenukaranData } from '../api/services'

const angka = (value: number) => value.toLocaleString('id-ID')

export default function StrukPenukaran({ data, onClose }: {
  data: StrukPenukaranData
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { element?.close(); document.body.style.overflow = overflow }
  }, [])
  const lengkap = Number.isFinite(data.poinSebelum) && Number.isFinite(data.poinSesudah)
  return (
    <dialog ref={dialog} onCancel={onClose} aria-labelledby="struk-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl p-0 shadow-xl backdrop:bg-black/50"
      style={{ background: 'var(--color-card)', color: 'var(--color-foreground)' }}>
      <div className="p-5 sm:p-7">
        <div className="flex justify-between items-center mb-5">
          <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>MIU Connect</span>
          <button autoFocus onClick={onClose} aria-label="Tutup struk" className="p-2 rounded-lg hover:opacity-60"><X size={20} /></button>
        </div>
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--color-secondary)', color: 'var(--color-primary)' }}><Check size={26} /></div>
          <h2 id="struk-title" className="text-xl font-bold">Penukaran Berhasil</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Bukti penukaran poin kamar</p>
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4"><dt>No. transaksi</dt><dd className="font-semibold">TUK-{data.id}</dd></div>
          {data.tanggal && <div className="flex justify-between gap-4"><dt>Tanggal (WIB)</dt><dd>{new Date(`${data.tanggal}T00:00:00+07:00`).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', year: 'numeric' })}</dd></div>}
          {data.kamarNama && <div className="flex justify-between gap-4"><dt>Kamar</dt><dd className="font-semibold text-right break-words">{data.kamarNama}</dd></div>}
        </dl>
        {data.barangNama && <div className="my-5 border-y border-dashed py-4" style={{ borderColor: 'var(--color-border)' }}>
          <p className="font-semibold break-words">{data.barangNama}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{angka(data.jumlah)} × {angka(data.hargaPoin)} poin</p>
        </div>}
        <dl className="space-y-3 text-sm mt-5">
          {lengkap && <div className="flex justify-between"><dt>Saldo sebelum</dt><dd>{angka(data.poinSebelum)} poin</dd></div>}
          <div className="flex justify-between"><dt>Poin digunakan</dt><dd className="font-semibold">−{angka(data.poinDigunakan)} poin</dd></div>
          {lengkap && <div className="flex justify-between items-center gap-3 rounded-xl p-4" style={{ background: 'var(--color-secondary)', color: 'var(--color-primary)' }}><dt className="font-semibold">Saldo sesudah</dt><dd className="text-xl font-bold">{angka(data.poinSesudah)} poin</dd></div>}
        </dl>
        {!lengkap && <p className="mt-4 text-sm">Transaksi berhasil. Rincian saldo tidak tersedia untuk transaksi ini; lihat saldo terbaru pada daftar kamar.</p>}
        <button onClick={onClose} className="mt-6 w-full rounded-xl py-3 font-semibold" style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>Selesai</button>
      </div>
    </dialog>
  )
}
