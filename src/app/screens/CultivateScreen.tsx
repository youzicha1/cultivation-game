import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function CultivateScreen({ state, dispatch }: ScreenProps) {
  return (
    <Panel title="修炼">
      <Stack gap={12}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>
          经验：{state.player.exp} | 生命：{state.player.hp}/
          {state.player.maxHp}
        </div>
        <Button onClick={() => dispatch({ type: 'CULTIVATE_TICK' })}>
          修炼一次
        </Button>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
          返回
        </Button>
      </Stack>
    </Panel>
  )
}
