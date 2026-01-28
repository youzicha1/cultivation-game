import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
  newGame: () => void
}

export function DeathScreen({ state, dispatch, newGame }: ScreenProps) {
  return (
    <Panel title="陨落">
      <Stack gap={12}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>
          死因：{state.summary?.cause ?? '未知'}
        </div>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'summary' })}>
          本局总结
        </Button>
        <Button onClick={newGame}>新开局</Button>
      </Stack>
    </Panel>
  )
}
