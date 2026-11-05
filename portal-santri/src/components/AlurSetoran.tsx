import { BookOpen, Recycle, House, Tags, Scale, Send, ClipboardCheck, Camera, ChevronDown } from 'lucide-react'
import './AlurSetoran.css'

const langkah = [
  { icon: Recycle, title: 'Pilah sampah', text: 'Pisahkan sampah menurut jenisnya. Setorkan satu jenis dalam satu penimbangan.' },
  { icon: House, title: 'Pilih kamar', text: 'Cari nama kamar dan periksa asramanya agar setoran tercatat untuk kamar yang tepat.' },
  { icon: Tags, title: 'Pilih jenis', text: 'Pilih jenis sampah yang sesuai. Perhatikan keterangan dan tarif poin yang ditampilkan.' },
  { icon: Scale, title: 'Timbang sampah', text: 'Letakkan sampah di timbangan. Tunggu sampai muncul “Berat Terdeteksi & Stabil”.' },
  { icon: Send, title: 'Kirim setoran', text: 'Periksa kamar, jenis, dan berat. Tekan “Kirim Setoran” sekali lalu tunggu konfirmasi berhasil.' },
  { icon: ClipboardCheck, title: 'Cek hasil verifikasi', text: 'Pengurus memeriksa setoran. Poin sesuai jenis sampah masuk setelah setoran disetujui.' },
]

export default function AlurSetoran({ expanded = false }: { expanded?: boolean }) {
  return (
    <details className="alur-setoran" open={expanded}>
      <summary className="alur-setoran__heading">
        <span className="alur-setoran__book"><BookOpen size={21} aria-hidden="true" /></span>
        <span className="alur-setoran__intro">
          <strong>Cara Setor Sampah</strong>
          <span>Dari sampah terpilah hingga poin kamar. Ikuti 6 langkah ini.</span>
        </span>
        <ChevronDown className="alur-setoran__chevron" size={19} aria-hidden="true" />
      </summary>
      <div className="alur-setoran__body">
        <ol className="alur-setoran__steps">
          {langkah.map(({ icon: Icon, title, text }, i) => (
            <li key={title}>
              <div className="alur-setoran__marker">
                <Icon size={20} aria-hidden="true" />
                <span>{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div><h3>{title}</h3><p>{text}</p></div>
            </li>
          ))}
        </ol>
        <div className="alur-setoran__photo">
          <Camera size={19} aria-hidden="true" />
          <p><strong>Tunggu foto sebelum mengangkat sampah.</strong> Setelah setoran tercatat, ikuti status foto kamera di layar. Jika foto gagal, jangan kirim ulang setoran yang sama; sampaikan kepada pengurus.</p>
        </div>
        <p className="alur-setoran__history"><strong>Ingin melihat poin atau status setoran?</strong> Buka “Cek Poin &amp; Klasemen Kamar”, lalu pilih kamarmu untuk melihat riwayat. Tidak semua jenis sampah menghasilkan poin.</p>
      </div>
    </details>
  )
}
