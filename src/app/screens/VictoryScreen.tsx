import type { GameAction, GameState } from '../../engine'
import { getTribulationConfigByIdx } from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'
import { Chip } from '../ui/Chip'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
  newGame: () => void
}

export function VictoryScreen({ state, dispatch, newGame }: ScreenProps) {
  const meta = state.meta ?? {}
  const legacyTotal = meta.legacyPoints ?? 0
  const shardsTotal = meta.kungfaShards ?? 0
  const runSummary = state.run.runSummary
  const finalTribName = runSummary?.ending === 'victory' ? (getTribulationConfigByIdx(12)?.name ?? '天游飞升劫') : '天游飞升劫'
  const titleName = runSummary?.ending === 'victory' ? finalTribName : '天游飞升'
  const legacyEarned = runSummary?.legacyPointsEarned ?? 0

  return (
    <Panel title={`【通关！】${titleName}`} subtitle="通关">
      <Stack gap={14}>
        <div className="final-result-hero">
          <p className="final-result-cause">本局连续渡过 12 重天劫，登临大道。再开一局，继承传承解锁，再攀高峰。</p>
        </div>
        <div className="final-result-stats page-chips">
          <Chip className="app-chip--gold">{state.player.realm}</Chip>
          <Chip className="app-chip--pity">回合 {runSummary?.turns ?? state.summary?.turns ?? state.run.turn}</Chip>
          <Chip className="app-chip--inherit">天劫进度 12/12</Chip>
          {runSummary?.tianPillCount != null && runSummary.tianPillCount > 0 && (
            <Chip className="app-chip--gold">天品丹 {runSummary.tianPillCount} 次</Chip>
          )}
        </div>
        <div className="final-result-rewards">
          <p className="final-result-rewards-title">通关奖励（永久）</p>
          <p>传承点 +{legacyEarned}（累计：{legacyTotal}） · 功法碎片累计：{shardsTotal}</p>
          <p className="final-result-rewards-hint">传承解锁已继承，下局开局即生效。</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" size="lg" onClick={newGame}>
            开新局（继承传承解锁）
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'legacy' })}>
            去传承
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}
