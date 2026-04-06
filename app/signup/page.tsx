'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const passwordStrength = (() => {
    if (password.length === 0) return null
    if (password.length < 6) return 'weak'
    if (password.length < 10 || !/[0-9]/.test(password)) return 'fair'
    return 'strong'
  })()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // Change this to your deployed URL once live
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // If email confirmation is disabled in Supabase, user is logged in immediately
      // If enabled, show the "check your email" screen
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      } else {
        setSuccess(true)
        setLoading(false)
      }
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 signature-gradient rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: '"FILL" 1' }}>mark_email_read</span>
          </div>
          <h1 className="font-headline font-extrabold text-3xl text-on-surface">Check your inbox</h1>
          <p className="text-on-surface-variant leading-relaxed">
            We sent a confirmation link to <span className="font-semibold text-on-surface">{email}</span>. Click it to activate your account.
          </p>
          <Link href="/login">
            <button className="w-full bg-surface-container-low text-primary font-bold py-4 rounded-2xl hover:bg-surface-container transition-colors mt-4">
              Back to Log in
            </button>
          </Link>
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

          {/* Title */}
          <div className="mb-8">
            <h1 className="font-headline font-extrabold text-3xl text-on-surface mb-2">Create your account</h1>
            <p className="text-on-surface-variant">Start optimizing your Irish tax in minutes.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-2xl text-sm flex items-center gap-3">
              <span className="material-symbols-outlined text-lg flex-shrink-0">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-on-surface-variant px-1">Full name</label>
              <input
                type="text"
                required
                autoComplete="name"
                placeholder="Liam Murphy"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl py-4 px-5 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-on-surface-variant px-1">Email address</label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl py-4 px-5 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-on-surface-variant px-1">Password</label>
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
              {/* Strength indicator */}
              {passwordStrength && (
                <div className="flex items-center gap-2 px-1">
                  <div className="flex gap-1 flex-1">
                    {['weak', 'fair', 'strong'].map((level, i) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          passwordStrength === 'weak' && i === 0 ? 'bg-error' :
                          passwordStrength === 'fair' && i <= 1 ? 'bg-[#F59E0B]' :
                          passwordStrength === 'strong' ? 'bg-primary' :
                          'bg-outline-variant/30'
                        }`}
                      />
                    ))}
                  </div>
                  <span className={`text-xs font-medium capitalize ${
                    passwordStrength === 'weak' ? 'text-error' :
                    passwordStrength === 'fair' ? 'text-[#F59E0B]' : 'text-primary'
                  }`}>
                    {passwordStrength}
                  </span>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full signature-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Creating account…
                </>
              ) : (
                <>
                  Create account
                  <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-on-surface-variant leading-relaxed">
              By signing up you agree to our{' '}
              <span className="text-primary font-medium cursor-pointer hover:underline">Terms</span>{' '}
              and{' '}
              <span className="text-primary font-medium cursor-pointer hover:underline">Privacy Policy</span>.
            </p>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-outline-variant/30"></div>
            <span className="text-xs text-on-surface-variant font-medium">or</span>
            <div className="flex-1 h-px bg-outline-variant/30"></div>
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-on-surface-variant">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
