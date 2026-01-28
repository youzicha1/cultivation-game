import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function ExploreScreen({ state, dispatch }: ScreenProps) {
  return (
    <Panel title="探索">
      <Stack gap={12}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>
          危险度：{state.run.danger} | 暂存收益：{state.run.pendingReward}
        </div>
        <Button onClick={() => dispatch({ type: 'EXPLORE_PUSH' })}>
          深入一次
        </Button>
        <Button onClick={() => dispatch({ type: 'EXPLORE_RETREAT' })}>
          收手撤退
        </Button>
        <Button onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
          返回主页
        </Button>
      </Stack>
    </Panel>
  )
}
