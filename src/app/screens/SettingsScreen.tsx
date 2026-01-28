import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
  clearSave: () => void
}

export function SettingsScreen({ state, dispatch, clearSave }: ScreenProps) {
  return (
    <Panel title="设置">
      <Stack gap={12}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>
          当前境界：{state.player.realm}
        </div>
        <Button onClick={clearSave}>清档</Button>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'start' })}>
          回到开局
        </Button>
      </Stack>
    </Panel>
  )
}
