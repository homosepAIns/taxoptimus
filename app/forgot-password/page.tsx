'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-20 h-20 signature-gradient rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: '"FILL" 1' }}>lock_reset</span>
          </div>
          <h1 className="font-headline font-extrabold text-3xl text-on-surface">Email sent</h1>
          <p className="text-on-surface-variant leading-relaxed">
            We emailed a password reset link to{' '}
            <span className="font-semibold text-on-surface">{email}</span>.
            <br />Check your inbox and follow the instructions.
          </p>
          <div className="bg-surface-container-low rounded-2xl p-4 text-left flex items-start gap-3">
            <span className="material-symbols-outlined text-primary mt-0.5 flex-shrink-0">info</span>
            <p className="text-sm text-on-surface-variant">
              Didn&apos;t get it? Check your spam folder, or{' '}
              <button onClick={() => setSent(false)} className="text-primary font-medium hover:underline">
                try again
              </button>
              .
            </p>
          </div>
          <Link href="/login">
            <button className="w-full bg-surface-container-low text-primary font-bold py-4 rounded-2xl hover:bg-surface-container transition-colors">
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

          {/* Back link */}
          <Link href="/login" className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-on-surface transition-colors mb-8">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Back to Log in
          </Link>

          {/* Title */}
          <div className="mb-8">
            <h1 className="font-headline font-extrabold text-3xl text-on-surface mb-2">Forgot your password?</h1>
            <p className="text-on-surface-variant">No worries — enter your email and we&apos;ll send you a reset link.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-2xl text-sm flex items-center gap-3">
              <span className="material-symbols-outlined text-lg flex-shrink-0">error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full signature-gradient text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Sending…
                </>
              ) : (
                <>
                  Send reset link
                  <span className="material-symbols-outlined text-xl">send</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
