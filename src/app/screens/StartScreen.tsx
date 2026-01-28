import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
  newGame: () => void
}

export function StartScreen({ state, dispatch, newGame }: ScreenProps) {
  return (
    <Panel title="修仙之路">
      <Stack gap={12}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>
          当前境界：{state.player.realm}
        </div>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
          继续游戏
        </Button>
        <Button onClick={newGame}>新开局</Button>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'settings' })}>
          设置
        </Button>
      </Stack>
    </Panel>
  )
}
