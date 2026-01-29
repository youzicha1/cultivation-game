import type { ReactNode } from 'react'

export type ChoiceGridOption<T = string> = {
  value: T
  label: ReactNode
  disabled?: boolean
}

type ChoiceGridProps<T> = {
  options: ChoiceGridOption<T>[]
  value: T | null
  onChange: (value: T) => void
  className?: string
}

export function ChoiceGrid<T extends string | number>({
  options,
  value,
  onChange,
  className = '',
}: ChoiceGridProps<T>) {
  return (
    <div className={`app-choice-grid ${className}`.trim()} role="group">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          className="app-choice-grid-option"
          data-selected={value === opt.value ? 'true' : 'false'}
          disabled={opt.disabled}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
