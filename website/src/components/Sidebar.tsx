import {
  LayoutDashboard,
  ClipboardCheck,
  Trophy,
  ShoppingBag,
  Wallet,
  BarChart3,
  BookOpen,
  Megaphone,
  Recycle,
  ChevronRight,
  Smartphone,
  LogOut,
} from 'lucide-react'
import logoSrc from '../assets/logo.jpeg'
import type { PageId } from '../types'

// URL Portal Santri (aplikasi terpisah, dijalankan di alat timbang/kiosk).
// Diatur lewat .env website: VITE_PORTAL_SANTRI_URL
const PORTAL_SANTRI_URL = import.meta.env.VITE_PORTAL_SANTRI_URL || 'http://localhost:5174'

interface NavItem {
  id: PageId
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  section?: string
}

const navItems: NavItem[] = [
  { id: 'ringkasan', label: 'Dashboard', icon: LayoutDashboard, section: 'Operasional' },
  { id: 'verifikasi', label: 'Verifikasi Setoran', icon: ClipboardCheck },
  { id: 'poin-kamar', label: 'Poin per Kamar', icon: Trophy },
  { id: 'katalog', label: 'Katalog Barang', icon: ShoppingBag },
  { id: 'kategori-sampah', label: 'Kategori Sampah', icon: Recycle },
  { id: 'penjualan-kas', label: 'Penjualan & Kas', icon: Wallet },
  { id: 'laporan', label: 'Laporan', icon: BarChart3 },
  { id: 'panduan', label: 'Panduan & Modul', icon: BookOpen, section: 'Edukasi & Mitra' },
  { id: 'kampanye', label: 'Campaign', icon: Megaphone },
]

interface SidebarProps {
  currentPage: PageId
  onNavigate: (page: PageId) => void
  pendingCount: number
  userNama: string
  userRole: string
  onLogout: () => void
}

export default function Sidebar({ currentPage, onNavigate, pendingCount, userNama, userRole, onLogout }: SidebarProps) {
  const inisial = userNama
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <aside
      className="w-60 shrink-0 flex flex-col h-screen overflow-hidden border-r"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
    >
      {/* Brand */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <img
          src={logoSrc}
          alt="MIU-CONNECT"
          className="w-full h-auto"
          style={{ maxHeight: '72px', objectFit: 'contain', objectPosition: 'left center' }}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          const badge = item.id === 'verifikasi' ? pendingCount : 0
          return (
            <div key={item.id}>
              {item.section && (
                <p
                  className="text-xs font-medium px-2 pt-5 pb-1 uppercase tracking-widest"
                  style={{ color: 'var(--color-muted-foreground)', fontSize: '10px' }}
                >
                  {item.section}
                </p>
              )}
              <button
                onClick={() => onNavigate(item.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5"
                style={{
                  background: isActive ? 'var(--color-primary)' : 'transparent',
                  color: isActive ? 'var(--color-primary-foreground)' : 'var(--color-muted-foreground)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--color-secondary)'
                    e.currentTarget.style.color = 'var(--color-foreground)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--color-muted-foreground)'
                  }
                }}
              >
                <Icon size={15} className="shrink-0" />
                <span className="flex-1 text-left text-sm">{item.label}</span>
                {badge > 0 && !isActive && (
                  <span
                    className="text-xs font-semibold rounded-full px-1.5 py-0.5 leading-none"
                    style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}
                  >
                    {badge}
                  </span>
                )}
                {isActive && <ChevronRight size={13} className="opacity-50" />}
              </button>
            </div>
          )
        })}
      </nav>

      {/* Portal Santri — aplikasi TERPISAH (kiosk timbang), dibuka di tab baru */}
      <div className="px-3 pb-2">
        
          href={PORTAL_SANTRI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all border"
          style={{
            background: 'var(--color-secondary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-primary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-primary)'
            e.currentTarget.style.color = 'var(--color-primary-foreground)'
            e.currentTarget.style.borderColor = 'var(--color-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-secondary)'
            e.currentTarget.style.color = 'var(--color-primary)'
            e.currentTarget.style.borderColor = 'var(--color-border)'
          }}
        >
          <Smartphone size={15} className="shrink-0" />
          <span className="flex-1 text-left">Portal Santri</span>
          <span className="text-xs opacity-60">↗</span>
        </a>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
          >
            {inisial || '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-foreground)' }}>
              {userNama}
            </div>
            <div className="text-xs capitalize" style={{ color: 'var(--color-muted-foreground)' }}>{userRole}</div>
          </div>
          <button
            onClick={onLogout}
            title="Keluar"
            className="p-1.5 rounded-lg shrink-0"
            style={{ background: 'var(--color-muted)' }}
          >
            <LogOut size={14} style={{ color: 'var(--color-muted-foreground)' }} />
          </button>
        </div>
      </div>
    </aside>
  )
}
