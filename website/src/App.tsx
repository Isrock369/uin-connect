import { lazy, Suspense, useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import logoSrc from './assets/logo.jpeg'
import { AuthProvider, useAuth } from './context/AuthContext'
import { getSetoran } from './api/services'
import type { PageId } from './types'

// Halaman dimuat saat dibuka saja (lazy loading) agar buka pertama lebih cepat
const Ringkasan = lazy(() => import('./pages/Ringkasan'))
const VerifikasiSetoran = lazy(() => import('./pages/VerifikasiSetoran'))
const PoinKamar = lazy(() => import('./pages/PoinKamar'))
const KatalogBarang = lazy(() => import('./pages/KatalogBarang'))
const KategoriSampah = lazy(() => import('./pages/KategoriSampah'))
const PenjualanKas = lazy(() => import('./pages/PenjualanKas'))
const Laporan = lazy(() => import('./pages/Laporan'))
const Panduan = lazy(() => import('./pages/Panduan'))
const Kampanye = lazy(() => import('./pages/Kampanye'))

const pageTitles: Record<PageId, string> = {
  ringkasan: 'Dashboard',
  verifikasi: 'Verifikasi Setoran',
  'poin-kamar': 'Poin per Kamar',
  katalog: 'Katalog Barang',
  'kategori-sampah': 'Kategori Sampah',
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
  'kategori-sampah': 'Kelola jenis sampah dan poin per kg — tambah, ubah, atau hapus sesuai kebutuhan',
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
    document.querySelector('main')?.scrollTo(0, 0)
  }

  const PageMap: Record<PageId, React.ComponentType> = {
    ringkasan: Ringkasan,
    verifikasi: VerifikasiSetoran,
    'poin-kamar': PoinKamar,
    katalog: KatalogBarang,
    'kategori-sampah': KategoriSampah,
    'penjualan-kas': PenjualanKas,
    laporan: Laporan,
    panduan: Panduan,
    kampanye: Kampanye,
  }

  const PageComponent = PageMap[currentPage]

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: 'var(--color-background)' }}>
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
              className="ml-2 p-2.5 rounded-lg"
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
            className="p-2.5 rounded-lg -ml-2"
            style={{ background: 'var(--color-muted)' }}
          >
            <Menu size={18} style={{ color: 'var(--color-foreground)' }} />
          </button>
          // SESUDAH
<button
  onClick={() => navigate('ringkasan')}
  aria-label="Ke Dashboard"
  className="flex items-center gap-2 transition-opacity active:opacity-70"
>
  <img src={logoSrc} alt="" className="h-9 w-9 object-contain" />
  <span className="text-base font-bold" style={{ color: 'var(--color-primary)' }}>
    MIU Connect
  </span>
</button>
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

        <main
          className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <Suspense
            fallback={
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                Memuat halaman...
              </p>
            }
          >
            <div key={currentPage} className="page-enter">
              <PageComponent />
            </div>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

function Gate() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: 'var(--color-background)' }}>
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
