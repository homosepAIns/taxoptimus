'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/upload', icon: 'upload_file', label: 'Upload', isAction: true },
  { href: '/invest', icon: 'trending_up', label: 'Invest' },
]

export default function BottomNavBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 w-full flex justify-around items-center px-4 pb-6 pt-2 bg-[#F9F9FF]/80 dark:bg-[#0D1C32]/80 backdrop-blur-md rounded-t-[1.5rem] z-50 shadow-[0px_-12px_32px_rgba(13,28,50,0.06)] border-t border-[#BDCABC]/20">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const isAction = item.isAction
        return (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className={`flex flex-col items-center justify-center p-2 rounded-[1rem] active:scale-90 transition-transform duration-200 ${
              isAction
                ? 'bg-[#50C878] text-[#0D1C32]'
                : isActive
                  ? 'bg-[#DFE8FF] text-[#006D36]'
                  : 'text-[#3E4A3F] dark:text-[#BDCABC] hover:bg-[#DFE8FF] dark:hover:bg-[#1A2E4B]'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">{item.icon}</span>
            <span className="font-['Inter'] text-[11px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
