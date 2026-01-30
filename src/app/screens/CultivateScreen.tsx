import type { GameAction, GameState } from '../../engine'
import { getCultivateInfo } from '../../engine'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function CultivateScreen({ state, dispatch }: ScreenProps) {
  const info = getCultivateInfo(state)
  const expProgress = Math.max(0, Math.min(1, (state.player.exp % 100) / 100))
  const hpProgress = Math.max(0, Math.min(1, state.player.hp / state.player.maxHp))
  const mindProgress = Math.max(0, Math.min(1, info.mind / 100))
  const cultivateCount = state.run.cultivateCount ?? 0
  const toast = state.run.cultivateToast
  const insight = state.run.pendingInsightEvent
  const injuredTurns = state.player.injuredTurns ?? 0

  return (
    <Panel title="修炼">
      <Stack gap={10}>
        <div className="page-chips">
          <Chip className="app-chip--gold">{state.player.realm}</Chip>
          <Chip className="app-chip--hp">{`${state.player.hp}/${state.player.maxHp}`}</Chip>
          <Chip className="app-chip--muted">本局修炼 {cultivateCount} 次</Chip>
          {injuredTurns > 0 && (
            <Chip className="app-chip--danger">受伤 {injuredTurns} 回合</Chip>
          )}
        </div>

        <div className="stat-group">
          <div className="stat-row">
            <span className="stat-label">心境 · {info.mindTier}</span>
            <span className="stat-value">{info.mind}/100</span>
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill stat-bar-fill-mind"
              style={{ width: `${mindProgress * 100}%` }}
            />
          </div>
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

        <div className="page-label">修炼模式</div>
        <div className="cultivate-modes">
          <Button
            variant="option-green"
            size="md"
            className="cultivate-mode-btn cultivate-mode--breath"
            onClick={() => dispatch({ type: 'CULTIVATE_TICK', mode: 'breath' })}
          >
            吐纳
          </Button>
          <Button
            variant="primary"
            size="md"
            className="cultivate-mode-btn cultivate-mode--pulse"
            onClick={() => dispatch({ type: 'CULTIVATE_TICK', mode: 'pulse' })}
          >
            冲脉
          </Button>
          <Button
            variant="option-purple"
            size="md"
            className="cultivate-mode-btn cultivate-mode--insight"
            onClick={() => dispatch({ type: 'CULTIVATE_TICK', mode: 'insight' })}
          >
            悟道
          </Button>
        </div>
        <p className="cultivate-mode-hint">
          吐纳：回血修伤·稳修为 · 冲脉：高修为小概率受伤 · 悟道：概率顿悟选赏
        </p>

        {toast && (
          <div className="cultivate-toast">
            <span>
              修为+{toast.expGain}
              {toast.hpGain != null ? ` · 生命+${toast.hpGain}` : ''}
              {toast.mindDelta != null ? ` · 心境${toast.mindDelta >= 0 ? '+' : ''}${toast.mindDelta}` : ''}
              {toast.spiritStonesGain != null ? ` · 灵石+${toast.spiritStonesGain}` : ''}
            </span>
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'CLEAR_CULTIVATE_TOAST' })}>
              确定
            </Button>
          </div>
        )}

        <div className="page-actions">
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
            返回
          </Button>
        </div>
      </Stack>

      {insight && (
        <div className="cultivate-insight-overlay">
          <div className="cultivate-insight-mask" />
          <div className="cultivate-insight-card">
            <h3 className="cultivate-insight-title">{insight.title}</h3>
            <p className="cultivate-insight-text">{insight.text}</p>
            <div className="cultivate-insight-choices">
              <Button
                variant="option-green"
                size="md"
                onClick={() => dispatch({ type: 'CULTIVATE_INSIGHT_CHOOSE', choice: 'A' })}
              >
                {insight.choiceA.text}
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => dispatch({ type: 'CULTIVATE_INSIGHT_CHOOSE', choice: 'B' })}
              >
                {insight.choiceB.text}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}
