import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function HomeScreen({ state, dispatch }: ScreenProps) {
  return (
    <Panel title="主界面">
      <Stack gap={12}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>
          境界：{state.player.realm} | 经验：{state.player.exp} | 生命：
          {state.player.hp}/{state.player.maxHp} | 丹药：{state.player.pills}
        </div>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'cultivate' })}>
          修炼
        </Button>
        <Button onClick={() => dispatch({ type: 'EXPLORE_START' })}>
          探索
        </Button>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'alchemy' })}>
          炼丹
        </Button>
        <Button onClick={() => dispatch({ type: 'BREAKTHROUGH_OPEN' })}>
          突破
        </Button>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'settings' })}>
          设置
        </Button>
      </Stack>
    </Panel>
  )
}
