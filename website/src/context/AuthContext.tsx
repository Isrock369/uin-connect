import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { getToken, setToken, clearToken } from '../api/client'
import { login as loginApi, getMe, type LoginResponse } from '../api/services'

type User = LoginResponse['user']

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Saat app pertama dibuka: kalau ada token tersimpan, cek masih valid atau tidak
  useEffect(() => {
    async function restoreSession() {
      const token = getToken()
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const res = await getMe()
        setUser(res.user)
      } catch {
        clearToken()
      } finally {
        setLoading(false)
      }
    }
    restoreSession()
  }, [])

  async function login(username: string, password: string) {
    const res = await loginApi(username, password)
    setToken(res.token)
    setUser(res.user)
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return ctx
}
