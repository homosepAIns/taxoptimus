'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function TopAppBar() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    setMenuOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  const displayName = user?.user_metadata?.full_name ?? user?.email ?? ''
  const initial = displayName[0]?.toUpperCase() ?? 'U'

  return (
    <header className="fixed top-0 w-full z-50 bg-[#F9F9FF]/95 dark:bg-[#0D1C32]/95 backdrop-blur-md border-b border-outline-variant/10 flex justify-between items-center px-6 py-4">
      {/* Brand */}
      <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2 hover:opacity-80 transition-opacity active:scale-95">
        <span
          className="material-symbols-outlined text-[#006D36] dark:text-[#50C878] text-2xl"
          style={{ fontVariationSettings: '"FILL" 1' }}
        >
          account_balance
        </span>
        <span className="text-[#006D36] dark:text-[#50C878] font-headline font-extrabold tracking-tight text-xl">
          TaxOptimus
        </span>
      </Link>

      {/* Right side */}
      {user ? (
        <div className="flex items-center gap-3">
          {/* Bell */}
          <button className="hover:opacity-70 transition-opacity active:scale-95 duration-150 p-1">
            <span className="material-symbols-outlined text-[#3E4A3F] dark:text-[#BDCABC] text-2xl">notifications</span>
          </button>

          {/* Avatar + dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-9 h-9 rounded-full border-2 border-primary-container flex items-center justify-center bg-primary text-white font-bold text-sm hover:opacity-80 transition-opacity active:scale-95"
              aria-label="Account menu"
            >
              {initial}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 w-64 bg-surface-container-lowest rounded-2xl shadow-[0px_8px_32px_rgba(13,28,50,0.12)] border border-outline-variant/10 overflow-hidden z-50">
                {/* User info */}
                <div className="px-4 py-4 border-b border-outline-variant/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      {user.user_metadata?.full_name && (
                        <p className="font-bold text-sm text-on-surface truncate">{user.user_metadata.full_name}</p>
                      )}
                      <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-2">
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-on-surface hover:bg-surface-container-low transition-colors text-left">
                      <span className="material-symbols-outlined text-on-surface-variant text-xl">dashboard</span>
                      Dashboard
                    </button>
                  </Link>
                  <Link href="/optimize-tax" onClick={() => setMenuOpen(false)}>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-on-surface hover:bg-surface-container-low transition-colors text-left">
                      <span className="material-symbols-outlined text-on-surface-variant text-xl">trending_up</span>
                      My Investments
                    </button>
                  </Link>
                  <Link href="/upload" onClick={() => setMenuOpen(false)}>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-on-surface hover:bg-surface-container-low transition-colors text-left">
                      <span className="material-symbols-outlined text-on-surface-variant text-xl">upload_file</span>
                      Upload Documents
                    </button>
                  </Link>
                </div>

                {/* Logout */}
                <div className="border-t border-outline-variant/10 py-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-error hover:bg-error-container/30 transition-colors text-left"
                  >
                    <span className="material-symbols-outlined text-xl">logout</span>
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Logged-out */
        <div className="flex items-center gap-2">
          <Link href="/login">
            <button className="text-primary font-semibold text-sm px-4 py-2 rounded-full hover:bg-surface-container-low transition-colors">
              Log in
            </button>
          </Link>
          <Link href="/signup">
            <button className="signature-gradient text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-sm hover:shadow-md transition-shadow active:scale-95">
              Sign up
            </button>
          </Link>
        </div>
      )}
    </header>
  )
}
