import type { GameAction, GameState } from '../../engine'
import { getAwakenSkill, getAwakenSkillEffectLines } from '../../engine'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

const RARITY_LABEL: Record<string, string> = {
  common: '凡',
  rare: '稀',
  legendary: '传',
  epic: '稀',
}

const TAG_LABEL: Record<string, string> = {
  explore: '探索',
  alchemy: '炼丹',
  tribulation: '天劫',
  breakthrough: '突破',
  economy: '经济',
  survival: '生存',
  utility: '通用',
}

/** TICKET-35: 短描述≤18字 */
function shortDesc(desc: string, max = 18): string {
  if (desc.length <= max) return desc
  return desc.slice(0, max - 1) + '…'
}

export function AwakenSkillScreen({ state, dispatch }: ScreenProps) {
  const choices = state.run.pendingAwakenChoices ?? []
  if (choices.length === 0) {
    return (
      <div className="awaken-skill-page">
        <p>暂无待选技能，返回主页。</p>
        <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
          返回
        </Button>
      </div>
    )
  }

  return (
    <div className="awaken-skill-page">
      <header className="awaken-skill-header">
        <h2 className="awaken-skill-title">觉醒技能 · 三选一</h2>
        <p className="awaken-skill-desc">突破成功，灵台顿开，择一领悟。</p>
      </header>
      <div className="awaken-skill-cards">
        {choices.map((skillId) => {
          const def = getAwakenSkill(skillId)
          if (!def) return null
          const effectLines = getAwakenSkillEffectLines(def)
          return (
            <div key={skillId} className="awaken-skill-card">
              <div className="awaken-skill-card-badges">
                <span className={`awaken-skill-rarity awaken-skill-rarity--${def.rarity}`}>
                  {RARITY_LABEL[def.rarity] ?? def.rarity}
                </span>
                {(def.tags ?? []).slice(0, 3).map((t) => (
                  <span key={t} className="awaken-skill-tag">
                    {TAG_LABEL[t] ?? t}
                  </span>
                ))}
              </div>
              <div className="awaken-skill-card-name">{def.name}</div>
              <div className="awaken-skill-card-desc">{shortDesc(def.desc)}</div>
              {effectLines.length > 0 && (
                <div className="awaken-skill-card-effects">
                  {effectLines.map((line, i) => (
                    <div key={i} className="awaken-skill-effect-line">
                      {line}
                    </div>
                  ))}
                </div>
              )}
              <Button
                variant="primary"
                size="md"
                className="awaken-skill-card-btn"
                onClick={() => dispatch({ type: 'CHOOSE_AWAKEN_SKILL', skillId })}
              >
                领悟
              </Button>
            </div>
          )
        })}
      </div>
      <footer className="awaken-skill-footer">
        <Chip className="app-chip--muted">选一领悟后返回主页</Chip>
      </footer>
    </div>
  )
}
