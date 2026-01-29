import type { PropsWithChildren } from 'react'

type ChipProps = PropsWithChildren<{ className?: string }>

export function Chip({ children, className = '' }: ChipProps) {
  return (
    <span className={`app-chip ${className}`.trim()}>
      {children}
    </span>
  )
}
