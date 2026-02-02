/**
 * TICKET-31: 氛围感图标体系 — 修仙物件风格，统一描边/光晕/质感
 * 内联 SVG，无外链资源；tone 控制主色（gold/jade/purple/red）
 */

import type { SVGProps } from 'react'

export const ATMOS_ICON_NAMES = [
  'cultivate',
  'explore',
  'alchemy',
  'breakthrough',
  'shop',
  'kungfu',
  'legacy',
  'achievement',
  'settings',
  'log',
  'daily_gift',
  'recipe',
  'heat_wen',
  'heat_wu',
  'heat_zhen',
  'materials',
  'rate_success',
  'rate_boom',
  'batch',
] as const

export type AtmosIconName = (typeof ATMOS_ICON_NAMES)[number]

export type AtmosIconTone = 'gold' | 'jade' | 'purple' | 'red'

type AtmosIconProps = {
  name: AtmosIconName
  size?: number
  tone?: AtmosIconTone
  className?: string
} & Omit<SVGProps<SVGSVGElement>, 'width' | 'height'>

const TONE_CLASS: Record<AtmosIconTone, string> = {
  gold: 'atm-icon--gold',
  jade: 'atm-icon--jade',
  purple: 'atm-icon--purple',
  red: 'atm-icon--red',
}

/** 卷轴/玉简风格：统一 viewBox 24x24，stroke 描边，fill 点缀 */
function IconSprite({ name }: { name: AtmosIconName }) {
  const common = { strokeWidth: 1.2, fill: 'none', stroke: 'currentColor' }
  switch (name) {
    case 'cultivate':
      return (
        <g {...common}>
          <circle cx="12" cy="10" r="4" />
          <path d="M8 18v-2a4 4 0 0 1 8 0v2" />
          <path d="M12 14v4" />
        </g>
      )
    case 'explore':
      return (
        <g {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
        </g>
      )
    case 'alchemy':
      return (
        <g {...common}>
          <ellipse cx="12" cy="14" rx="6" ry="4" />
          <path d="M12 10v4M9 12h6" />
          <circle cx="12" cy="8" r="1.5" fill="currentColor" stroke="none" />
        </g>
      )
    case 'breakthrough':
      return (
        <g {...common}>
          <path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" />
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
        </g>
      )
    case 'shop':
      return (
        <g {...common}>
          <path d="M4 10l2-4h12l2 4M4 10v10h16V10" />
          <path d="M9 14h6" />
        </g>
      )
    case 'kungfu':
      return (
        <g {...common}>
          <rect x="6" y="4" width="12" height="16" rx="1" />
          <path d="M9 8h6M9 11h6M9 14h4" />
        </g>
      )
    case 'legacy':
      return (
        <g {...common}>
          <path d="M12 2v20M8 6l4-4 4 4M8 18l4 4 4-4" />
          <rect x="10" y="8" width="4" height="8" rx="1" fill="currentColor" stroke="none" />
        </g>
      )
    case 'achievement':
      return (
        <g {...common}>
          <path d="M12 2l2 6 6 1-4 4 1 6-5-3-5 3 1-6-4-4 6-1z" />
        </g>
      )
    case 'settings':
      return (
        <g {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8L5.6 18.4M18.4 5.6l1.4-1.4" />
        </g>
      )
    case 'log':
      return (
        <g {...common}>
          <path d="M6 6h12v12H6z" />
          <path d="M8 9h8M8 12h6M8 15h4" />
        </g>
      )
    case 'daily_gift':
      return (
        <g {...common}>
          <path d="M12 8v8M10 8h4M8 10v4h8v-4M6 10h2v4H6zM16 10h2v4h-2z" />
          <circle cx="12" cy="6" r="1.5" fill="currentColor" stroke="none" />
        </g>
      )
    case 'recipe':
      return (
        <g {...common}>
          <path d="M6 4h12v16H6z" />
          <path d="M9 8h6M9 11h4M9 14h6" />
          <path d="M6 8l2-1v2" />
        </g>
      )
    case 'heat_wen':
      return (
        <g {...common}>
          <path d="M12 14c-2 0-3-1.5-3-3s1.5-3 3-3 3 1.5 3 3-1 3-3 3z" />
          <path d="M12 18v2M12 6V4" />
        </g>
      )
    case 'heat_wu':
      return (
        <g {...common}>
          <path d="M12 10c1.5 0 2.5 1 2.5 2.5S13.5 15 12 15s-2.5-1-2.5-2.5S10.5 10 12 10z" />
          <path d="M12 6v2M12 16v2M8 12H6M18 12h-2" />
        </g>
      )
    case 'heat_zhen':
      return (
        <g {...common}>
          <path d="M12 8c2.5 0 4 2 4 4s-1.5 4-4 4-4-2-4-4 1.5-4 4-4z" />
          <path d="M12 4v2M12 18v2M6 12H4M20 12h-2" />
        </g>
      )
    case 'materials':
      return (
        <g {...common}>
          <path d="M8 6l4 4 4-4M8 14l4 4 4-4" />
          <circle cx="12" cy="10" r="1.5" fill="currentColor" stroke="none" />
        </g>
      )
    case 'rate_success':
      return (
        <g {...common}>
          <circle cx="12" cy="12" r="6" />
          <path d="M8 12l3 3 5-6" strokeWidth="1.5" />
        </g>
      )
    case 'rate_boom':
      return (
        <g {...common}>
          <path d="M12 4l1 6 6 1-4 4 1 6-4-4-4 4 1-6-4-4 6-1z" />
        </g>
      )
    case 'batch':
      return (
        <g {...common}>
          <rect x="4" y="6" width="6" height="4" rx="1" />
          <rect x="14" y="6" width="6" height="4" rx="1" />
          <rect x="9" y="14" width="6" height="4" rx="1" />
        </g>
      )
    default:
      return (
        <g {...common}>
          <circle cx="12" cy="12" r="4" />
        </g>
      )
  }
}

export function AtmosIcon({
  name,
  size = 24,
  tone = 'gold',
  className = '',
  ...rest
}: AtmosIconProps) {
  const isValidName = ATMOS_ICON_NAMES.includes(name as AtmosIconName)
  const iconName = isValidName ? (name as AtmosIconName) : ('cultivate' as AtmosIconName)
  const toneClass = TONE_CLASS[tone]

  return (
    <svg
      className={`atm-icon ${toneClass} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...rest}
    >
      <IconSprite name={iconName} />
    </svg>
  )
}
