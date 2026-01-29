import type { CSSProperties } from 'react'

type ProgressRingProps = {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
  className?: string
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  label,
  className = '',
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, value))
  const r = (size - strokeWidth) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - clamped)

  return (
    <div
      className={`progress-ring-wrap ${className}`.trim()}
      style={{ '--ring-size': `${size}px`, '--ring-stroke': strokeWidth } as CSSProperties}
    >
      <svg
        width={size}
        height={size}
        className="progress-ring-svg"
        aria-hidden
      >
        <defs>
          <linearGradient id="progress-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gold)" />
            <stop offset="100%" stopColor="var(--purple)" />
          </linearGradient>
          <filter id="progress-ring-glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          className="progress-ring-bg"
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          className="progress-ring-fill"
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="url(#progress-ring-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ filter: 'url(#progress-ring-glow)' }}
        />
      </svg>
      {label != null && (
        <span className="progress-ring-label">{label}</span>
      )}
    </div>
  )
}
