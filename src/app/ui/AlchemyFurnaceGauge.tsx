import { useId } from 'react'

type FurnaceMode = 'idle' | 'brewing' | 'resultSuccess' | 'resultBoom'

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

function toPctInt(x: number): number {
  return Math.round(clamp01(x) * 100)
}

export type AlchemyFurnaceGaugeProps = {
  successRate: number
  boomRate: number
  mode?: FurnaceMode
  className?: string
  showNumbers?: boolean
}

export function AlchemyFurnaceGauge(props: AlchemyFurnaceGaugeProps) {
  const mode: FurnaceMode = props.mode ?? 'idle'
  const success = clamp01(props.successRate)
  const boom = clamp01(props.boomRate)

  const successPct = toPctInt(success)
  const boomPct = toPctInt(boom)

  const boomLevel = boom < 0.06 ? 0 : boom < 0.12 ? 1 : boom < 0.2 ? 2 : 3

  const rawId = useId()
  const safeId = rawId.replace(/:/g, '')
  const clipId = `furnace-clip-${safeId}`
  const fillClipUrl = `url(#${clipId})`
  const gradBodyId = `furnace-body-grad-${safeId}`
  const gradElixirId = `furnace-elixir-grad-${safeId}`
  const gradPillId = `furnace-pill-grad-${safeId}`

  const fillTopY = 90
  const fillBottomY = 240
  const fillRange = fillBottomY - fillTopY
  const fillY = fillTopY + (1 - success) * fillRange

  /* 丹丸在药液内，略低于液面，位置随液面变化 */
  const pill1Cy = fillY + 18
  const pill2Cy = fillY + 38
  const pill3Cy = fillY + 8

  const rootClass =
    `alchemy-furnace ${props.className ?? ''} ` +
    `alchemy-furnace--${mode} ` +
    `alchemy-furnace--boom${boomLevel}`

  return (
    <div
      className={rootClass}
      role="group"
      aria-label="炼丹概率仪表盘"
      data-success={successPct}
      data-boom={boomPct}
    >
      <div className="alchemy-furnace__svgWrap">
        <svg className="alchemy-furnace__svg" viewBox="0 0 240 280" aria-hidden="true">
          <defs>
            <clipPath id={clipId}>
              <path d="M64 78 Q120 30 176 78 L190 210 Q120 250 50 210 Z" />
            </clipPath>
            {/* 炉身：上略亮（炉口火光），下深 */}
            <linearGradient id={gradBodyId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(80, 60, 40, 0.5)" />
              <stop offset="35%" stopColor="rgba(40, 28, 20, 0.6)" />
              <stop offset="100%" stopColor="rgba(20, 14, 10, 0.85)" />
            </linearGradient>
            {/* 药液：上金琥珀，下深金 */}
            <linearGradient id={gradElixirId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 200, 100, 0.5)" />
              <stop offset="50%" stopColor="rgba(220, 150, 60, 0.45)" />
              <stop offset="100%" stopColor="rgba(180, 100, 40, 0.5)" />
            </linearGradient>
            {/* 丹丸：中心高光，边缘朱金 */}
            <radialGradient id={gradPillId} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="rgba(255, 240, 200, 0.95)" />
              <stop offset="50%" stopColor="rgba(255, 180, 80, 0.9)" />
              <stop offset="100%" stopColor="rgba(200, 80, 40, 0.85)" />
            </radialGradient>
          </defs>

          {/* 炉身（带渐变与描边） */}
          <path
            className="alchemy-furnace__body"
            fill={`url(#${gradBodyId})`}
            d="M64 78 Q120 30 176 78 L190 210 Q120 250 50 210 Z"
          />
          <path
            className="alchemy-furnace__bodyStroke"
            fill="none"
            d="M64 78 Q120 30 176 78 L190 210 Q120 250 50 210 Z"
          />
          <path className="alchemy-furnace__rim" d="M78 92 Q120 62 162 92" />

          {/* 药液 + 丹丸 + 雾气（炉内） */}
          <g clipPath={fillClipUrl}>
            <rect
              className="alchemy-furnace__fill"
              x="0"
              y={fillY}
              width="240"
              height="280"
              fill={`url(#${gradElixirId})`}
            />
            <ellipse
              className="alchemy-furnace__fillShine"
              cx="120"
              cy={fillY + 40}
              rx="55"
              ry="18"
              fill="rgba(255, 230, 180, 0.25)"
            />
            <circle
              className="alchemy-furnace__pill alchemy-furnace__pill--1"
              cx="98"
              cy={pill1Cy}
              r="9"
              fill={`url(#${gradPillId})`}
            />
            <circle
              className="alchemy-furnace__pill alchemy-furnace__pill--2"
              cx="128"
              cy={pill2Cy}
              r="7"
              fill={`url(#${gradPillId})`}
            />
            <circle
              className="alchemy-furnace__pill alchemy-furnace__pill--3"
              cx="118"
              cy={pill3Cy}
              r="8"
              fill={`url(#${gradPillId})`}
            />
            <path
              className="alchemy-furnace__mist"
              d="M40 170 C80 150, 120 190, 160 170 C190 155, 210 175, 230 165"
            />
          </g>

          {/* 外焰（更黄、半透明） */}
          <path
            className="alchemy-furnace__flameOuter"
            d="M115 98 C100 118, 96 135, 105 152 C118 172, 142 172, 155 152 C164 135, 160 118, 145 100 C138 94, 128 90, 120 95 Z"
          />
          {/* 内焰（橙红） */}
          <path
            className="alchemy-furnace__flame"
            d="M120 105
               C108 120, 104 132, 110 145
               C118 160, 138 160, 146 145
               C152 132, 148 120, 136 108
               C132 103, 126 100, 120 105 Z"
          />

          <path className="alchemy-furnace__glyph" d="M86 150 L154 150" />
          <path className="alchemy-furnace__glyph" d="M92 168 L148 168" />
        </svg>
      </div>

      {props.showNumbers !== false && (
        <div
          className="alchemy-furnace__numbers"
          role="progressbar"
          aria-label="成功率"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={successPct}
        >
          <div className="alchemy-furnace__row">
            <span className="alchemy-furnace__label">成功率</span>
            <span className="alchemy-furnace__value">{successPct}%</span>
          </div>
          <div className="alchemy-furnace__row">
            <span className="alchemy-furnace__label">爆丹</span>
            <span className="alchemy-furnace__value">{boomPct}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
