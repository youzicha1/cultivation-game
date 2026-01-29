import type { PropsWithChildren } from 'react'

type PresetCardProps = PropsWithChildren<{
  title: string
  subtitle?: string
  hint?: string
  selected?: boolean
  disabled?: boolean
  missingHint?: string
  onClick?: () => void
  className?: string
}>

export function PresetCard({
  title,
  subtitle,
  hint,
  selected = false,
  disabled = false,
  missingHint,
  onClick,
  className = '',
  children,
}: PresetCardProps) {
  return (
    <button
      type="button"
      className={`app-preset-card ${selected ? 'app-preset-card--selected' : ''} ${disabled ? 'app-preset-card--disabled' : ''} ${className}`.trim()}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <div className="app-preset-card-inner">
        <div className="app-preset-card-title">{title}</div>
        {subtitle != null && (
          <div className="app-preset-card-subtitle">{subtitle}</div>
        )}
        {hint != null && (
          <div className="app-preset-card-hint">{hint}</div>
        )}
        {missingHint != null && (
          <div className="app-preset-card-missing">
            {disabled ? '缺少：' : '缺：'}{missingHint}
          </div>
        )}
        {children}
      </div>
    </button>
  )
}
