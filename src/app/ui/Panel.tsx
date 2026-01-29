import type { PropsWithChildren } from 'react'

type PanelProps = PropsWithChildren<{
  title?: string
  subtitle?: string
  className?: string
}>

export function Panel({ title, subtitle, className = '', children }: PanelProps) {
  return (
    <section className={`app-panel ${className}`.trim()}>
      {title ? <h2>{title}</h2> : null}
      {subtitle ? <p className="app-panel-subtitle">{subtitle}</p> : null}
      {children}
    </section>
  )
}
