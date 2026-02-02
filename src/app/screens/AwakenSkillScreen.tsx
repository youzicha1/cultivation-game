import type { GameAction, GameState } from '../../engine'
import { getAwakenSkill } from '../../engine'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
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
          return (
            <div key={skillId} className="awaken-skill-card">
              <div className="awaken-skill-card-name">{def.name}</div>
              <div className="awaken-skill-card-desc">{def.desc}</div>
              <div className="awaken-skill-card-rarity">{def.rarity}</div>
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
