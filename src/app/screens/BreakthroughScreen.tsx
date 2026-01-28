import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function BreakthroughScreen({ state, dispatch }: ScreenProps) {
  const outcome = state.run.lastOutcome
  const plan = state.run.breakthroughPlan

  if (outcome?.kind === 'breakthrough') {
    return (
      <Panel title={outcome.success ? '突破成功！' : '突破失败'}>
        <Stack gap={12}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {outcome.title}
          </div>
          <div style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6 }}>
            {outcome.text}
          </div>
          <div style={{ fontSize: 14, opacity: 0.7 }}>
            <div>境界变化: {outcome.deltas.realm > 0 ? '+' : ''}{outcome.deltas.realm}</div>
            <div>生命: {outcome.deltas.hp > 0 ? '+' : ''}{outcome.deltas.hp}</div>
            <div>最大生命: {outcome.deltas.maxHp > 0 ? '+' : ''}{outcome.deltas.maxHp}</div>
            <div>经验: {outcome.deltas.exp > 0 ? '+' : ''}{outcome.deltas.exp}</div>
            <div>丹药: {outcome.deltas.pills > 0 ? '+' : ''}{outcome.deltas.pills}</div>
            <div>传承点: {outcome.deltas.inheritancePoints > 0 ? '+' : ''}{outcome.deltas.inheritancePoints}</div>
            <div>保底进度: {outcome.deltas.pity > 0 ? '+' : ''}{outcome.deltas.pity}</div>
          </div>
          <Button
            onClick={() =>
              dispatch({ type: 'OUTCOME_CONTINUE', to: 'cultivate' })
            }
          >
            继续修炼
          </Button>
          <Button onClick={() => dispatch({ type: 'OUTCOME_RETRY_BREAKTHROUGH' })}>
            再来一次
          </Button>
          <Button onClick={() => dispatch({ type: 'OUTCOME_CONTINUE', to: 'home' })}>
            回主页
          </Button>
        </Stack>
      </Panel>
    )
  }

  const currentPlan = plan ?? {
    pillsUsed: 0,
    inheritanceSpent: 0,
    previewRate: 0.22,
  }

  const maxPills = Math.min(3, state.player.pills)
  const maxInheritance = Math.min(3, state.player.inheritancePoints)

  return (
    <Panel title="突破准备">
      <Stack gap={12}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>
          境界：{state.player.realm} | 生命：{state.player.hp}/
          {state.player.maxHp} | 丹药：{state.player.pills} | 传承点：
          {state.player.inheritancePoints} | 保底：{state.player.pity}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          成功率：{(currentPlan.previewRate * 100).toFixed(1)}%
        </div>
        {state.player.pity > 0 && (
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            保底进度越高，成功率越高
          </div>
        )}
        <div style={{ fontSize: 14 }}>使用丹药：</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[0, 1, 2, 3].map((count) => (
            <Button
              key={count}
              onClick={() =>
                dispatch({
                  type: 'BREAKTHROUGH_SET_PLAN',
                  pillsUsed: count,
                  inheritanceSpent: currentPlan.inheritanceSpent,
                })
              }
              style={{
                width: '100%',
                background:
                  currentPlan.pillsUsed === count ? '#2a5a2a' : undefined,
              }}
              disabled={count > maxPills}
            >
              {count}
            </Button>
          ))}
        </div>
        <div style={{ fontSize: 14 }}>使用传承点：</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[0, 1, 2, 3].map((count) => (
            <Button
              key={count}
              onClick={() =>
                dispatch({
                  type: 'BREAKTHROUGH_SET_PLAN',
                  pillsUsed: currentPlan.pillsUsed,
                  inheritanceSpent: count,
                })
              }
              style={{
                width: '100%',
                background:
                  currentPlan.inheritanceSpent === count ? '#2a5a2a' : undefined,
              }}
              disabled={count > maxInheritance}
            >
              {count}
            </Button>
          ))}
        </div>
        <Button onClick={() => dispatch({ type: 'BREAKTHROUGH_CONFIRM' })}>
          开始突破
        </Button>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
          返回主页
        </Button>
      </Stack>
    </Panel>
  )
}
