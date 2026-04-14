'use client'
import { getTaxLink, type TaxLinkKey } from '@/lib/taxLinks'

interface Props {
  taxKey: TaxLinkKey | string
  className?: string
}

export default function InfoLink({ taxKey, className = '' }: Props) {
  const href = getTaxLink(taxKey)
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center ml-1.5 text-on-surface-variant/40 hover:text-primary transition-colors ${className}`}
      title="View Revenue.ie reference"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="material-symbols-outlined text-[16px]">info</span>
    </a>
  )
}
