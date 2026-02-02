/**
 * TICKET-31: 手游式按钮卡片 — 左侧图标框 + 右侧标题/副标题，带按压反馈
 */

import type { AtmosIconName } from './IconArt'
import { AtmosIcon } from './IconArt'

export type IconButtonCardProps = {
  title: string
  subtitle?: string
  iconName: AtmosIconName
  onClick: () => void
  disabled?: boolean
  badge?: string | number
  tone?: 'gold' | 'jade' | 'purple' | 'red'
  className?: string
}

export function IconButtonCard({
  title,
  subtitle,
  iconName,
  onClick,
  disabled = false,
  badge,
  tone = 'gold',
  className = '',
}: IconButtonCardProps) {
  return (
    <button
      type="button"
      className={`atm-card atm-btn-card atm-press ${disabled ? 'atm-btn-card--disabled' : ''} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      aria-label={subtitle ? `${title}：${subtitle}` : title}
    >
      <span className="atm-iconFrame atm-btn-card__icon">
        <AtmosIcon name={iconName} size={28} tone={tone} />
      </span>
      <span className="atm-btn-card__body">
        <span className="atm-textTitle">{title}</span>
        {subtitle != null && subtitle !== '' && (
          <span className="atm-textSub">{subtitle}</span>
        )}
      </span>
      {badge != null && (
        <span className="atm-btn-card__badge" aria-hidden>
          {badge}
        </span>
      )}
    </button>
  )
}
