import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function BreakthroughScreen({ state, dispatch }: ScreenProps) {
  return (
    <Panel title="突破">
      <Stack gap={12}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>
          当前境界：{state.player.realm} | 丹药：{state.player.pills}
        </div>
        <Button
          onClick={() =>
            dispatch({ type: 'BREAKTHROUGH_ATTEMPT', pillsUsed: 0 })
          }
        >
          不加料突破
        </Button>
        <Button
          onClick={() =>
            dispatch({ type: 'BREAKTHROUGH_ATTEMPT', pillsUsed: 1 })
          }
        >
          加 1 颗丹突破
        </Button>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
          返回
        </Button>
      </Stack>
    </Panel>
  )
}
