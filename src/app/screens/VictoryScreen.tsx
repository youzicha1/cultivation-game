import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'
import { Chip } from '../ui/Chip'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
  newGame: () => void
}

const VICTORY_LEGACY_BONUS = 8

export function VictoryScreen({ state, dispatch, newGame }: ScreenProps) {
  const meta = state.meta ?? {}
  const legacyTotal = meta.legacyPoints ?? 0
  const shardsTotal = meta.kungfaShards ?? 0
  const tribulationsPassed = state.run.tribulationLevel ?? 12

  return (
    <Panel title="十二劫尽渡，登临大道！" subtitle="通关">
      <Stack gap={14}>
        <div className="final-result-hero">
          <p className="final-result-cause">本局连续渡过 12 重天劫，登临大道。再开一局，再攀高峰。</p>
        </div>
        <div className="final-result-stats page-chips">
          <Chip className="app-chip--gold">{state.player.realm}</Chip>
          <Chip className="app-chip--pity">回合 {state.summary?.turns ?? state.run.turn}</Chip>
          <Chip className="app-chip--inherit">渡过天劫 {tribulationsPassed} 重</Chip>
        </div>
        <div className="final-result-rewards">
          <p className="final-result-rewards-title">通关奖励（永久）</p>
          <p>传承点 +{VICTORY_LEGACY_BONUS}（累计：{legacyTotal}） · 功法碎片累计：{shardsTotal}</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" size="lg" onClick={newGame}>
            再开一局
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'legacy' })}>
            去传承升级
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}
