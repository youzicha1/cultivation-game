import { useMemo } from 'react'

export type AlchemyGrade = 'tian' | 'di' | 'xuan' | 'fan' | 'fail'

const PARTICLE_COUNT: Record<AlchemyGrade, number> = {
  tian: 48,
  di: 24,
  xuan: 14,
  fan: 6,
  fail: 4,
}

/** 根据 outcome 判定本次结果的「最高品级」用于特效 */
export function getAlchemyResultGrade(items: { fan: number; xuan: number; di: number; tian: number } | undefined, _boomed: boolean): AlchemyGrade {
  if (!items) return 'fail'
  if (items.tian > 0) return 'tian'
  if (items.di > 0) return 'di'
  if (items.xuan > 0) return 'xuan'
  if (items.fan > 0) return 'fan'
  return 'fail'
}

function genParticles(grade: AlchemyGrade, count: number): Array<{ tx: number; ty: number; delay: number; duration: number; size: number }> {
  const list: Array<{ tx: number; ty: number; delay: number; duration: number; size: number }> = []
  const distanceBase = grade === 'tian' ? 420 : grade === 'di' ? 320 : grade === 'xuan' ? 240 : 160
  const durationBase = grade === 'tian' ? 1400 : grade === 'di' ? 1100 : 900
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.4
    const distance = distanceBase * (0.7 + Math.sin(i * 1.3) * 0.3)
    const tx = Math.cos(angle) * distance
    const ty = Math.sin(angle) * distance
    const delay = (i % 5) * 40 + (grade === 'tian' ? (i % 3) * 60 : 0)
    const duration = durationBase + (i % 4) * 100
    const size = grade === 'tian' ? 6 + (i % 3) * 2 : grade === 'di' ? 5 + (i % 2) : 4
    list.push({ tx, ty, delay, duration, size })
  }
  return list
}

export type AlchemyResultEffectProps = {
  grade: AlchemyGrade
  /** 有爆丹时失败/成功都略加强烈一点 */
  hasBoom?: boolean
}

export function AlchemyResultEffect({ grade, hasBoom }: AlchemyResultEffectProps) {
  const particles = useMemo(() => genParticles(grade, PARTICLE_COUNT[grade]), [grade])

  return (
    <div
      className={`alchemy-result-effect alchemy-result-effect--${grade} ${hasBoom ? 'alchemy-result-effect--boom' : ''}`}
      role="presentation"
      aria-hidden="true"
    >
      {/* 中心光晕爆发（天/地/玄明显） */}
      {(grade === 'tian' || grade === 'di' || grade === 'xuan') && (
        <div className="alchemy-result-effect__burst" />
      )}

      {/* 粒子 */}
      <div className="alchemy-result-effect__particles">
        {particles.map((p, i) => (
          <div
            key={i}
            className="alchemy-result-effect__particle"
            style={
              {
                '--tx': `${p.tx}px`,
                '--ty': `${p.ty}px`,
                '--delay': `${p.delay}ms`,
                '--duration': `${p.duration}ms`,
                '--size': `${p.size}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* 天品：额外一层星屑 */}
      {grade === 'tian' && (
        <div className="alchemy-result-effect__stars">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2
            const d = 180 + (i % 4) * 40
            return (
              <div
                key={i}
                className="alchemy-result-effect__star"
                style={
                  {
                    '--tx': `${Math.cos(a) * d}px`,
                    '--ty': `${Math.sin(a) * d}px`,
                    '--delay': `${200 + i * 80}ms`,
                  } as React.CSSProperties
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
