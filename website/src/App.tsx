import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Ringkasan from './pages/Ringkasan'
import VerifikasiSetoran from './pages/VerifikasiSetoran'
import PoinKamar from './pages/PoinKamar'
import KatalogBarang from './pages/KatalogBarang'
import PenjualanKas from './pages/PenjualanKas'
import Laporan from './pages/Laporan'
import Panduan from './pages/Panduan'
import Kampanye from './pages/Kampanye'
import logoSrc from './assets/logo.jpeg'
import { AuthProvider, useAuth } from './context/AuthContext'
import { getSetoran } from './api/services'
import type { PageId } from './types'

const pageTitles: Record<PageId, string> = {
  ringkasan: 'Dashboard',
  verifikasi: 'Verifikasi Setoran',
  'poin-kamar': 'Poin per Kamar',
  katalog: 'Katalog Barang',
  'penjualan-kas': 'Penjualan & Kas Pondok',
  laporan: 'Laporan',
  panduan: 'Panduan & Modul Edukasi',
  kampanye: 'Kampanye Mitra',
}

const pageSubtitles: Record<PageId, string> = {
  ringkasan: 'Ikhtisar aktivitas bank sampah',
  verifikasi: 'Tinjau dan setujui setoran sampah dari kamar (dikirim dari Portal Santri)',
  'poin-kamar': 'Kelola saldo poin dan penukaran barang',
  katalog: 'Manajemen stok barang yang bisa ditukar',
  'penjualan-kas': 'Catat penjualan organik dan kas pondok',
  laporan: 'Ringkasan data dan analitik periode',
  panduan: 'Modul edukasi cara pilah, cara setor, dan pengolahan sampah',
  kampanye: 'Program kerjasama dan reward dari mitra eksternal',
}

function AdminShell() {
  const { user, logout } = useAuth()
  const [currentPage, setCurrentPage] = useState<PageId>('ringkasan')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  // Ambil jumlah setoran yang masih 'menunggu' untuk badge notifikasi di sidebar
  useEffect(() => {
    getSetoran('menunggu')
      .then((rows) => setPendingCount(rows.length))
      .catch(() => setPendingCount(0))
  }, [currentPage])

  function navigate(page: PageId) {
    setCurrentPage(page)
    setSidebarOpen(false)
  }

  const PageMap: Record<PageId, React.ComponentType> = {
    ringkasan: Ringkasan,
    verifikasi: VerifikasiSetoran,
    'poin-kamar': PoinKamar,
    katalog: KatalogBarang,
    'penjualan-kas': PenjualanKas,
    laporan: Laporan,
    panduan: Panduan,
    kampanye: Kampanye,
  }

  const PageComponent = PageMap[currentPage]

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-background)' }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto flex-shrink-0 transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebarOpen && (
          <div className="lg:hidden absolute right-0 top-3 translate-x-full">
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-2 p-1.5 rounded-lg"
              style={{ background: 'var(--color-card)' }}
            >
              <X size={16} style={{ color: 'var(--color-muted-foreground)' }} />
            </button>
          </div>
        )}
        <Sidebar
          currentPage={currentPage}
          onNavigate={navigate}
          pendingCount={pendingCount}
          userNama={user?.nama || ''}
          userRole={user?.role || ''}
          onLogout={logout}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header
          className="shrink-0 px-4 border-b flex items-center gap-3 lg:hidden"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', height: '56px' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg -ml-1"
            style={{ background: 'var(--color-muted)' }}
          >
            <Menu size={18} style={{ color: 'var(--color-foreground)' }} />
          </button>
          <img src={logoSrc} alt="Logo" style={{ height: '36px', objectFit: 'contain' }} />
        </header>

        <header
          className="hidden lg:flex shrink-0 px-6 py-4 border-b items-center justify-between"
          style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
        >
          <div>
            <h1 className="text-xl font-semibold leading-tight" style={{ color: 'var(--color-foreground)' }}>
              {pageTitles[currentPage]}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
              {pageSubtitles[currentPage]}
            </p>
          </div>
        </header>

        <div
          className="lg:hidden px-4 py-3 border-b"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-card)' }}
        >
          <h1 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {pageTitles[currentPage]}
          </h1>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <PageComponent />
        </main>
      </div>
    </div>
  )
}

function Gate() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
        <p style={{ color: 'var(--color-muted-foreground)' }}>Memuat...</p>
      </div>
    )
  }

  return user ? <AdminShell /> : <Login />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
