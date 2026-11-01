import { useState, type FormEvent } from 'react'
import { changePassword } from '../api/services'
import { ApiError, clearToken } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function GantiPassword() {
  const { logout } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting) return
    setError('')
    if (newPassword !== confirmation) {
      setError('Konfirmasi password baru belum sama.')
      return
    }
    if (newPassword === currentPassword) {
      setError('Password baru harus berbeda dari password lama.')
      return
    }
    setSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      clearToken()
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setSuccess(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout()
        return
      }
      setError(err instanceof ApiError ? err.message : 'Koneksi terganggu. Jika perubahan sudah tersimpan, login kembali dengan password baru.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="page-security max-w-lg rounded-2xl border p-5 sm:p-6" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
      <h2 className="text-lg font-semibold">Ganti Password</h2>
      {success ? (
        <div className="mt-4 space-y-4">
          <p role="status">Password berhasil diganti. Semua sesi lama sudah tidak berlaku. Silakan login kembali dengan password baru.</p>
          <button onClick={logout} className="rounded-xl px-4 py-3 font-semibold" style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>Kembali ke Login</button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-4">
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>Gunakan password unik sepanjang 12–128 karakter. Setelah disimpan, semua perangkat harus login kembali.</p>
          {error && <p role="alert" className="rounded-xl p-3 text-sm" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>{error}</p>}
          <fieldset disabled={submitting} className="space-y-4">
            {[
              { id: 'current-password', label: 'Password lama', value: currentPassword, setter: setCurrentPassword, autocomplete: 'current-password', minimum: 1 },
              { id: 'new-password', label: 'Password baru', value: newPassword, setter: setNewPassword, autocomplete: 'new-password', minimum: 12 },
              { id: 'confirm-password', label: 'Ulangi password baru', value: confirmation, setter: setConfirmation, autocomplete: 'new-password', minimum: 12 },
            ].map((field) => (
              <div key={field.id}>
                <label htmlFor={field.id} className="block text-sm font-semibold mb-1">{field.label}</label>
                <input id={field.id} name={field.id} type={visible ? 'text' : 'password'} autoComplete={field.autocomplete} required minLength={field.minimum} maxLength={128} value={field.value} onChange={(event) => field.setter(event.target.value)} className="w-full rounded-xl border px-3 py-2.5" style={{ background: 'var(--color-background)', borderColor: 'var(--color-border)' }} />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />Tampilkan password</label>
            <button type="submit" className="w-full rounded-xl py-3 font-semibold disabled:opacity-60" disabled={submitting} style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}>{submitting ? 'Menyimpan...' : 'Simpan Password Baru'}</button>
          </fieldset>
        </form>
      )}
    </section>
  )
}

