import { useState, type PropsWithChildren } from 'react'

type AccordionProps = PropsWithChildren<{
  title: string
  defaultOpen?: boolean
  className?: string
}>

export function Accordion({
  title,
  defaultOpen = false,
  className = '',
  children,
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`app-accordion ${className}`.trim()}>
      <button
        type="button"
        className="app-accordion-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span className="app-accordion-icon" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div className="app-accordion-content">{children}</div>}
    </div>
  )
}
