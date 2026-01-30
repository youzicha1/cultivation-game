import type { GameAction, GameState } from '../../engine'
import { TIME_MAX, TIME_DEBUG_BUTTON } from '../../engine'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
  clearSave: () => void
}

export function SettingsScreen({ state, dispatch, clearSave }: ScreenProps) {
  const timeLeft = state.run.timeLeft ?? TIME_MAX
  return (
    <Panel title="设置">
      <Stack gap={10}>
        <div className="page-chips">
          <Chip className="app-chip--gold">{state.player.realm}</Chip>
        </div>
        <div className="page-actions">
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
            返回主界面
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'diagnostics' })}>
            诊断 / 自检
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              clearSave()
              dispatch({ type: 'GO', screen: 'start' })
            }}
          >
            清档
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'start' })}>
            回到开局
          </Button>
          {TIME_DEBUG_BUTTON && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: 'DEBUG_SET_TIME_LEFT', value: Math.max(0, timeLeft - 5) })}
            >
              [调试] 减少 5 时辰
            </Button>
          )}
        </div>
      </Stack>
    </Panel>
  )
}
