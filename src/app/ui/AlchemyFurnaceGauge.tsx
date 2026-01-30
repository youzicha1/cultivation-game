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
  const clipId = `furnace-clip-${rawId.replace(/:/g, '')}`
  const fillClipUrl = `url(#${clipId})`

  const fillTopY = 90
  const fillBottomY = 240
  const fillRange = fillBottomY - fillTopY
  const fillY = fillTopY + (1 - success) * fillRange

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
          </defs>

          <path
            className="alchemy-furnace__body"
            d="M64 78 Q120 30 176 78 L190 210 Q120 250 50 210 Z"
          />

          <path className="alchemy-furnace__rim" d="M78 92 Q120 62 162 92" />

          <g clipPath={fillClipUrl}>
            <rect className="alchemy-furnace__fill" x="0" y={fillY} width="240" height="280" />
            <path
              className="alchemy-furnace__mist"
              d="M40 170 C80 150, 120 190, 160 170 C190 155, 210 175, 230 165"
            />
          </g>

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
