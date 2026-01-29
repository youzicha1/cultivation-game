import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function CultivateScreen({ state, dispatch }: ScreenProps) {
  const expProgress = Math.max(
    0,
    Math.min(1, (state.player.exp % 100) / 100),
  )
  const hpProgress = Math.max(
    0,
    Math.min(1, state.player.hp / state.player.maxHp),
  )
  const cultivateCount = state.run.cultivateCount ?? 0
  const showFatigue = cultivateCount >= 4

  return (
    <Panel title="修炼">
      <Stack gap={10}>
        <div className="page-chips">
          <Chip className="app-chip--gold">{state.player.realm}</Chip>
          <Chip className="app-chip--hp">{`${state.player.hp}/${state.player.maxHp}`}</Chip>
          <Chip className="app-chip--muted">本局修炼 {cultivateCount} 次</Chip>
        </div>
        {showFatigue && (
          <div className="cultivate-fatigue-hint">
            心境浮动，修炼收益下降
          </div>
        )}

        <div className="stat-group">
          <div className="stat-row">
            <span className="stat-label">修为</span>
            <span className="stat-value">{state.player.exp}</span>
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill stat-bar-fill-exp"
              style={{ width: `${expProgress * 100}%` }}
            />
          </div>
          <div className="stat-row">
            <span className="stat-label">生命</span>
            <span className="stat-value">{`${state.player.hp}/${state.player.maxHp}`}</span>
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill stat-bar-fill-hp"
              style={{ width: `${hpProgress * 100}%` }}
            />
          </div>
        </div>

        <div className="page-actions">
          <Button variant="primary" size="sm" onClick={() => dispatch({ type: 'CULTIVATE_TICK' })}>
            修炼
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
            返回
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}
