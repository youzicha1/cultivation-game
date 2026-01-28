import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function AlchemyScreen({ state, dispatch }: ScreenProps) {
  return (
    <Panel title="炼丹">
      <Stack gap={12}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>
          当前丹药：{state.player.pills}
        </div>
        <Button onClick={() => dispatch({ type: 'ALCHEMY_BREW' })}>
          炼丹一次
        </Button>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
          返回
        </Button>
      </Stack>
    </Panel>
  )
}
