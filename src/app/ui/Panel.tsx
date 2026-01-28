import type { PropsWithChildren } from 'react'

type PanelProps = PropsWithChildren<{ title?: string }>

export function Panel({ title, children }: PanelProps) {
  return (
    <section
      style={{
        borderRadius: 12,
        border: '1px solid #2f2f2f',
        padding: 16,
        background: '#161616',
      }}
    >
      {title ? (
        <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>{title}</h2>
      ) : null}
      {children}
    </section>
  )
}
