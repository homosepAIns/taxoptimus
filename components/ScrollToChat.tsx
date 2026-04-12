'use client'

export default function ScrollToChat({ children, className }: { children: React.ReactNode; className?: string }) {
  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    document.getElementById('ai-chat')?.scrollIntoView({ behavior: 'smooth' })
  }
  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  )
}
