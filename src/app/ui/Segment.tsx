import type { ReactNode } from 'react'

export type SegmentOption<T = string> = {
  value: T
  label: ReactNode
  disabled?: boolean
}

type SegmentProps<T> = {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function Segment<T extends string | number>({
  options,
  value,
  onChange,
  className = '',
}: SegmentProps<T>) {
  return (
    <div className={`app-segment ${className}`.trim()} role="group">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          className="app-segment-option"
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
