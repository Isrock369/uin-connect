import { useEffect, useId, useRef, useState } from 'react'
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
  ChevronUp,
  Smartphone,
  LogOut,
  Lock,
  type LucideIcon,
} from 'lucide-react'
import logoSrc from '../assets/logo.jpeg'
import type { PageId } from '../types'

// URL Portal Santri (aplikasi terpisah, dijalankan di alat timbang/kiosk).
// Diatur lewat .env website: VITE_PORTAL_SANTRI_URL
const PORTAL_SANTRI_URL = import.meta.env.VITE_PORTAL_SANTRI_URL || 'http://localhost:5174'

interface NavItem {
  id: PageId
  label: string
  icon: LucideIcon
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
  { id: 'panduan', label: 'Panduan & Modul', icon: BookOpen, section: 'Edukasi & Instansi' },
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
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const profileButtonRef = useRef<HTMLButtonElement>(null)
  const profilePanelId = useId()

  useEffect(() => {
    setProfileOpen(false)
  }, [currentPage])

  useEffect(() => {
    if (!profileOpen) return
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !profileRef.current?.contains(event.target)) {
        setProfileOpen(false)
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileOpen(false)
        profileButtonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [profileOpen])

  const inisial = userNama
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <aside
      className="w-60 shrink-0 flex flex-col h-dvh overflow-hidden border-r"
      style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
    >
{/* Brand */}
<button
  onClick={() => onNavigate('ringkasan')}
  aria-label="Ke Dashboard"
  className="w-full flex items-center gap-2.5 px-4 py-3 border-b text-left transition-opacity active:opacity-70"
  style={{ borderColor: 'var(--color-border)' }}
>
  <img src={logoSrc} alt="" className="h-11 w-11 shrink-0 object-contain" />
  <span className="text-base font-bold leading-tight" style={{ color: 'var(--color-primary)' }}>
    MIU Connect
  </span>
</button>

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
                className="nav-item w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5"
                data-active={isActive}
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
        <a
          href={PORTAL_SANTRI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="portal-link w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors border"
        >
          <Smartphone size={15} className="shrink-0" />
          <span className="flex-1 text-left">Portal Santri</span>
          <span className="text-xs opacity-60">↗</span>
        </a>
      </div>

      {/* User */}
      <div ref={profileRef} onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setProfileOpen(false)
      }} className="relative shrink-0 px-3 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button
          ref={profileButtonRef}
          type="button"
          onClick={() => setProfileOpen((open) => !open)}
          aria-expanded={profileOpen}
          aria-controls={profilePanelId}
          aria-label={`Menu akun ${userNama}`}
          className="nav-item flex min-h-12 w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left"
        >
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
          >
            {inisial || '?'}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold truncate" style={{ color: 'var(--color-foreground)' }}>
              {userNama}
            </span>
            <span className="block text-xs capitalize" style={{ color: 'var(--color-muted-foreground)' }}>{userRole}</span>
          </span>
          <ChevronUp size={16} aria-hidden="true" className={`shrink-0 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
        </button>
        {profileOpen && (
          <div id={profilePanelId} className="absolute bottom-full left-3 right-3 z-50 mb-2 rounded-xl border p-2 shadow-lg" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
            <p className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>AKUN SAYA</p>
            <button type="button" onClick={() => {
              setProfileOpen(false)
              profileButtonRef.current?.focus()
              onNavigate('ganti-password')
            }} className="nav-item flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm" aria-current={currentPage === 'ganti-password' ? 'page' : undefined}>
              <Lock size={16} aria-hidden="true" />
              Ganti Password
            </button>
            <div className="my-1 border-t" style={{ borderColor: 'var(--color-border)' }} />
            <button type="button" onClick={() => {
              setProfileOpen(false)
              onLogout()
            }} className="nav-item flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm" style={{ color: 'var(--color-error)' }}>
              <LogOut size={16} aria-hidden="true" />
              Keluar
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
