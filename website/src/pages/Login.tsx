import { useState, type FormEvent } from 'react'
import { Lock, User as UserIcon, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../api/client'
import logoSrc from '../assets/logo.jpeg'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal terhubung ke server.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--color-background)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl border p-8"
        style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)' }}
      >
        <div className="flex flex-col items-center mb-6">
          <img src={logoSrc} alt="Logo" style={{ height: '48px', objectFit: 'contain' }} className="mb-3" />
          <h1
            className="text-xl font-bold text-center"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-foreground)' }}
          >
            Login Pengurus
          </h1>
          <p className="text-xs text-center mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            Bank Sampah Pesantren — Website Admin
          </p>
        </div>

        {error && (
          <div
            className="flex items-center gap-2 text-sm rounded-xl p-3 mb-4"
            style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>
              Username
            </label>
            <div
              className="flex items-center gap-2 mt-1 px-3 py-2.5 rounded-xl border"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
            >
              <UserIcon size={16} style={{ color: 'var(--color-muted-foreground)' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="w-full bg-transparent outline-none text-sm"
                style={{ color: 'var(--color-foreground)' }}
                placeholder="admin"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>
              Password
            </label>
            <div
              className="flex items-center gap-2 mt-1 px-3 py-2.5 rounded-xl border"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-background)' }}
            >
              <Lock size={16} style={{ color: 'var(--color-muted-foreground)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-transparent outline-none text-sm"
                style={{ color: 'var(--color-foreground)' }}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-60"
            style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
          >
            {submitting ? 'Memproses...' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  )
}
