import type { PropsWithChildren } from 'react'

type StackProps = PropsWithChildren<{ gap?: number }>

export function Stack({ gap = 12, children }: StackProps) {
  return (
    <div style={{ display: 'grid', gap }}>
      {children}
    </div>
  )
}
