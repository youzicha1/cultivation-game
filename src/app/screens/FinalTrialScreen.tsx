import type { GameAction, GameState } from '../../engine'
import {
  getDmgBase,
  applySteadyDamage,
  GAMBLE_SUCCESS_RATE,
  canSacrifice,
  type SacrificeKind,
} from '../../engine/finalTrial'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

const SACRIFICE_LABELS: Record<SacrificeKind, string> = {
  spirit_stones: '献祭灵石(50)',
  pills: '献祭丹药(2)',
  material: '献祭灵草(3)',
  inheritance: '献祭传承点(2)',
}

export function FinalTrialScreen({ state, dispatch }: ScreenProps) {
  const ft = state.run.finalTrial
  const player = state.player
  if (!ft || ft.step < 1 || ft.step > 3) {
    return (
      <Panel title="天劫挑战">
        <p>状态异常，请返回开局。</p>
      </Panel>
    )
  }

  const step = ft.step
  const dmgBase = getDmgBase(ft.threat, step)
  const steady = applySteadyDamage(dmgBase, ft.resolve)
  const successRate = Math.round(GAMBLE_SUCCESS_RATE * 100)

  return (
    <Panel title="天劫挑战" subtitle={`第 ${step} 道天雷`}>
      <Stack gap={12}>
        <div className="final-trial-stats">
          <span className="final-trial-stat">HP {player.hp}/{player.maxHp}</span>
          <span className="final-trial-stat">威胁 {ft.threat}</span>
          <span className="final-trial-stat">道心 {ft.resolve}</span>
        </div>
        <div className="final-trial-progress">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`final-trial-segment ${i <= step ? 'final-trial-segment--active' : ''} ${i < step ? 'final-trial-segment--done' : ''}`}
            />
          ))}
        </div>
        <p className="final-trial-hint">
          稳：约伤 {steady.dmg}，道心+2 · 搏：成功率 {successRate}%，成则伤少道心+6，败则伤高
        </p>
        <div className="final-trial-actions">
          <Button
            variant="option-blue"
            size="md"
            onClick={() => dispatch({ type: 'FINAL_TRIAL_CHOOSE', choice: 'steady' })}
          >
            稳（守心渡劫）
          </Button>
          <Button
            variant="option-purple"
            size="md"
            onClick={() => dispatch({ type: 'FINAL_TRIAL_CHOOSE', choice: 'gamble' })}
          >
            搏（逆天一搏）
          </Button>
          {(['spirit_stones', 'pills', 'material', 'inheritance'] as SacrificeKind[]).map((kind) => {
            const ok = canSacrifice(state, kind)
            return (
              <Button
                key={kind}
                variant="secondary"
                size="sm"
                disabled={!ok}
                title={!ok ? `资源不足：${SACRIFICE_LABELS[kind]}` : undefined}
                onClick={() => dispatch({ type: 'FINAL_TRIAL_CHOOSE', choice: 'sacrifice', sacrificeKind: kind })}
              >
                {SACRIFICE_LABELS[kind]}{!ok ? '（不足）' : ''}
              </Button>
            )
          })}
        </div>
      </Stack>
    </Panel>
  )
}
