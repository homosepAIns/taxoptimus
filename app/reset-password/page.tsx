'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  // Supabase sends the recovery token in the URL hash.
  // onAuthStateChange fires with event=PASSWORD_RECOVERY once the SDK
  // parses that hash and establishes a session — then we show the form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Also check if there's already a session (user came back from email link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary-container border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-on-surface-variant font-medium">Verifying your reset link…</p>
          <p className="text-xs text-on-surface-variant/60">
            If nothing happens,{' '}
            <Link href="/forgot-password" className="text-primary hover:underline">request a new link</Link>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>account_balance</span>
          <span className="text-primary font-headline font-extrabold tracking-tight text-xl">TaxOptimus</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          <div className="mb-8">
            <h1 className="font-headline font-extrabold text-3xl text-on-surface mb-2">Set new password</h1>
            <p className="text-on-surface-variant">Choose a strong password for your account.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-2xl text-sm flex items-center gap-3">
              <span className="material-symbols-outlined text-lg flex-shrink-0">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-5">
            {/* New password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-on-surface-variant px-1">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl py-4 px-5 pr-14 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-on-surface-variant px-1">Confirm password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`w-full bg-surface-container-low border rounded-2xl py-4 px-5 pr-14 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 transition-all ${
                    confirm && confirm !== password
                      ? 'border-error focus:ring-error/30 focus:border-error'
                      : confirm && confirm === password
                        ? 'border-primary-container focus:ring-primary/30 focus:border-primary'
                        : 'border-outline-variant/30 focus:ring-primary/30 focus:border-primary'
                  }`}
                />
                {confirm && (
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-xl ${confirm === password ? 'text-primary' : 'text-error'}`}
                    style={{ fontVariationSettings: '"FILL" 1' }}
                  >
                    {confirm === password ? 'check_circle' : 'cancel'}
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (!!confirm && confirm !== password)}
              className="w-full signature-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Updating…
                </>
              ) : (
                <>
                  Update password
                  <span className="material-symbols-outlined text-xl">lock_reset</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
