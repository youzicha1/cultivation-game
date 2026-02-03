import type { GameAction, GameState } from '../../engine'
import { ENDING_TITLES, ENDING_SUBTITLES, type EndingId } from '../../engine/finalTrial'
import { getFinalRewards } from '../../engine/finalTrial'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'
import { Chip } from '../ui/Chip'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
  newGame: () => void
}

export function FinalResultScreen({ state, dispatch, newGame }: ScreenProps) {
  const endingId = (state.summary?.endingId ?? 'retire') as EndingId
  const rewards = getFinalRewards(endingId)
  const meta = state.meta ?? {}
  const legacyTotal = meta.legacyPoints ?? 0
  const shardsTotal = meta.kungfaShards ?? 0
  const title = ENDING_TITLES[endingId]
  const subtitle = ENDING_SUBTITLES[endingId]
  const runSummary = state.run.runSummary
  const failedAt = runSummary?.failedAtTribulationIdx
  const legacyEarned = runSummary?.legacyPointsEarned ?? (1 + rewards.legacyBonus)

  return (
    <Panel title={title} subtitle={subtitle}>
      <Stack gap={14}>
        <div className="final-result-hero">
          <p className="final-result-cause">{state.summary?.cause ?? title}</p>
          {failedAt != null && failedAt >= 1 && (
            <p className="final-result-trib-progress">你倒在第 {failedAt} 劫</p>
          )}
        </div>
        <div className="final-result-stats page-chips">
          <Chip className="app-chip--gold">{state.player.realm}</Chip>
          <Chip className="app-chip--pity">回合 {state.summary?.turns ?? state.run.turn}</Chip>
          {failedAt != null && <Chip className="app-chip--inherit">止步第 {failedAt} 劫</Chip>}
          <Chip className="app-chip--muted">危险曾达 {state.run.danger ?? 0}</Chip>
        </div>
        <div className="final-result-rewards">
          <p className="final-result-rewards-title">本局奖励（永久）</p>
          <p>传承点 +{legacyEarned}（累计：{legacyTotal}） · 功法碎片 +{rewards.shardsBonus}（累计：{shardsTotal}）</p>
          <p className="final-result-rewards-hint">下局更强！可去传承页购买永久解锁。</p>
          {rewards.demonUnlock && (
            <p className="final-result-demon">魔道天赋已解锁，下局可走魔修分支。</p>
          )}
        </div>
        <div className="page-actions">
          <Button variant="primary" size="lg" onClick={newGame}>
            传承续局
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'legacy' })}>
            去传承
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}
