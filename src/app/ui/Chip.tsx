import type { PropsWithChildren } from 'react'

type ChipProps = PropsWithChildren<
  { className?: string } & React.HTMLAttributes<HTMLSpanElement>
>

export function Chip({ children, className = '', ...rest }: ChipProps) {
  return (
    <span className={`app-chip ${className}`.trim()} {...rest}>
      {children}
    </span>
  )
}
