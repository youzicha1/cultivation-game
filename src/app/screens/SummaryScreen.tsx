import type { GameAction, GameState } from '../../engine'
import { getNextKeyNodeDistance } from '../../engine/legacy'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function SummaryScreen({ state, dispatch }: ScreenProps) {
  const meta = state.meta ?? {}
  const legacyPoints = meta.legacyPoints ?? 0
  const nextKeyNode = getNextKeyNodeDistance(meta)

  return (
    <Panel title="本局总结">
      <Stack gap={10}>
        <div className="page-chips">
          <Chip className="app-chip--pity">回合 {state.summary?.turns ?? state.run.turn}</Chip>
          <Chip className="app-chip--gold">{state.player.realm}</Chip>
          <Chip className="app-chip--inherit" title="本局献祭用，与下方传承页点数不同">献祭传承 {state.player.inheritancePoints}</Chip>
        </div>
        <div className="summary-legacy-section">
          <div className="summary-legacy-points">
            <Chip className="app-chip--gold" style={{ fontSize: '16px', padding: '6px 12px' }}>
              传承点 +{calculateLegacyPointsReward(state)}（累计：{legacyPoints}）
            </Chip>
          </div>
          {nextKeyNode && (
            <div className="summary-nearmiss-hint">
              距离下一个关键传承《{nextKeyNode.name}》还差 {nextKeyNode.distance} 点
            </div>
          )}
        </div>
        <div className="page-actions">
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'legacy' })}>
            查看传承树
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'start' })}>
            回到开局
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}

// TICKET-12: 计算本局传承点奖励（简化版，用于显示）
function calculateLegacyPointsReward(state: GameState): number {
  let points = 1 // 基础奖励
  const chain = state.run.chain
  if (chain?.completed && Object.keys(chain.completed).length > 0) {
    points += 1
  }
  const realms = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神']
  if (realms.indexOf(state.player.realm) > 0) {
    points += 1
  }
  return points
}
