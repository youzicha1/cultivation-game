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

  /* 圆肚丹炉：炉口 y≈40，炉肚 y≈95–218，炉底 y≈265；液面在炉肚内 */
  const fillTopY = 98
  const fillBottomY = 212
  const fillRange = fillBottomY - fillTopY
  const fillY = fillTopY + (1 - success) * fillRange

  /* 丹丸固定在炉肚内、药液下方，不跑出炉外 */
  const bellyCenterY = 155
  const pill1Cy = Math.min(fillY + 18, bellyCenterY + 25)
  const pill2Cy = Math.min(fillY + 38, bellyCenterY + 35)
  const pill3Cy = Math.min(fillY + 8, bellyCenterY + 15)

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
          {/* 圆肚丹炉：炉口 → 短颈 → 圆肚 → 短平底，丹药在炉肚内 */}
          <defs>
            <clipPath id={clipId}>
              <path d="M120 38 C82 38 52 58 50 90 C46 128 46 182 52 218 C58 252 88 265 120 265 C152 265 182 252 188 218 C194 182 194 128 190 90 C188 58 158 38 120 38 Z" />
            </clipPath>
            <linearGradient id={gradBodyId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(180, 120, 60, 0.85)" />
              <stop offset="15%" stopColor="rgba(140, 85, 45, 0.8)" />
              <stop offset="45%" stopColor="rgba(70, 45, 25, 0.9)" />
              <stop offset="100%" stopColor="rgba(35, 22, 12, 0.95)" />
            </linearGradient>
            <radialGradient id={`furnace-innerGlow-${safeId}`} cx="50%" cy="60%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 180, 80, 0.35)" />
              <stop offset="50%" stopColor="rgba(255, 140, 40, 0.12)" />
              <stop offset="100%" stopColor="rgba(200, 80, 20, 0)" />
            </radialGradient>
            <linearGradient id={gradElixirId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255, 230, 160, 0.7)" />
              <stop offset="25%" stopColor="rgba(255, 200, 100, 0.6)" />
              <stop offset="60%" stopColor="rgba(220, 150, 50, 0.55)" />
              <stop offset="100%" stopColor="rgba(180, 100, 30, 0.6)" />
            </linearGradient>
            <radialGradient id={gradPillId} cx="32%" cy="32%" r="68%">
              <stop offset="0%" stopColor="rgba(255, 255, 240, 0.98)" />
              <stop offset="35%" stopColor="rgba(255, 220, 140, 0.95)" />
              <stop offset="70%" stopColor="rgba(255, 160, 50, 0.9)" />
              <stop offset="100%" stopColor="rgba(200, 70, 20, 0.88)" />
            </radialGradient>
          </defs>

          {/* 炉身：圆肚炉（短颈 + 圆肚 + 短平底） */}
          <path
            className="alchemy-furnace__body"
            fill={`url(#${gradBodyId})`}
            d="M120 38 C82 38 52 58 50 90 C46 128 46 182 52 218 C58 252 88 265 120 265 C152 265 182 252 188 218 C194 182 194 128 190 90 C188 58 158 38 120 38 Z"
          />
          <g clipPath={fillClipUrl}>
            <ellipse
              className="alchemy-furnace__innerGlow"
              cx="120"
              cy="155"
              rx="52"
              ry="58"
              fill={`url(#furnace-innerGlow-${safeId})`}
            />
          </g>
          <path
            className="alchemy-furnace__bodyStroke"
            fill="none"
            d="M120 38 C82 38 52 58 50 90 C46 128 46 182 52 218 C58 252 88 265 120 265 C152 265 182 252 188 218 C194 182 194 128 190 90 C188 58 158 38 120 38 Z"
          />
          <path className="alchemy-furnace__rim" d="M50 90 Q52 65 120 40 Q188 65 190 90" />

          {/* 药液 + 丹丸 + 雾气（仅炉肚内，丹药在炉内） */}
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
              cy={Math.min(fillY + 36, 195)}
              rx="50"
              ry="18"
              fill="rgba(255, 245, 210, 0.4)"
            />
            <circle className="alchemy-furnace__pill alchemy-furnace__pill--1" cx="98" cy={pill1Cy} r="7" fill={`url(#${gradPillId})`} />
            <circle className="alchemy-furnace__pill alchemy-furnace__pill--2" cx="128" cy={pill2Cy} r="6" fill={`url(#${gradPillId})`} />
            <circle className="alchemy-furnace__pill alchemy-furnace__pill--3" cx="115" cy={pill3Cy} r="6" fill={`url(#${gradPillId})`} />
            <circle className="alchemy-furnace__pillHighlight" cx="95" cy={pill1Cy - 2} r="2" fill="rgba(255,255,255,0.7)" />
            <circle className="alchemy-furnace__pillHighlight" cx="125" cy={pill2Cy - 1.8} r="1.8" fill="rgba(255,255,255,0.65)" />
            <circle className="alchemy-furnace__pillHighlight" cx="112" cy={pill3Cy - 1.8} r="1.9" fill="rgba(255,255,255,0.68)" />
            <path className="alchemy-furnace__mist" d="M65 150 C100 138 140 158 175 150 C195 145 205 152 210 148" />
          </g>

          {/* 火焰（炉口上方） */}
          <path
            className="alchemy-furnace__flameOuter"
            d="M108 12 C92 28 88 42 96 58 C108 78 132 78 144 58 C152 42 148 28 132 12 C126 6 114 6 108 12 Z"
          />
          <path
            className="alchemy-furnace__flame"
            d="M120 18 C110 30 108 42 114 52 C122 64 138 64 146 52 C152 42 150 30 140 18 C134 12 126 12 120 18 Z"
          />
          <path
            className="alchemy-furnace__flameCore"
            d="M120 26 C116 34 114 40 118 44 C124 48 128 48 132 44 C136 40 134 34 130 26 C126 22 122 22 120 26 Z"
          />

          <path className="alchemy-furnace__glyph" d="M88 178 L152 178" />
          <path className="alchemy-furnace__glyph" d="M92 198 L148 198" />
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
