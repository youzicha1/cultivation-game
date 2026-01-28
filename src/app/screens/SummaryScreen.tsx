import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function SummaryScreen({ state, dispatch }: ScreenProps) {
  return (
    <Panel title="本局总结">
      <Stack gap={12}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>
          回合：{state.summary?.turns ?? state.run.turn} | 境界：
          {state.player.realm} | 传承点：{state.player.inheritancePoints}
        </div>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'start' })}>
          回到开局
        </Button>
      </Stack>
    </Panel>
  )
}
