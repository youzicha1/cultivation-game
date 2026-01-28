import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function ExploreScreen({ state, dispatch }: ScreenProps) {
  const currentEvent = state.run.currentEvent

  return (
    <Panel title="探索">
      <Stack gap={12}>
        {currentEvent ? (
          <>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {currentEvent.title}
            </div>
            <div style={{ fontSize: 14, opacity: 0.8 }}>
              {currentEvent.text}
            </div>
            <Button
              onClick={() =>
                dispatch({ type: 'EXPLORE_CHOOSE', choice: 'A' })
              }
            >
              {currentEvent.aText}
            </Button>
            <Button
              onClick={() =>
                dispatch({ type: 'EXPLORE_CHOOSE', choice: 'B' })
              }
            >
              {currentEvent.bText}
            </Button>
            <Button onClick={() => dispatch({ type: 'EXPLORE_DISMISS_EVENT' })}>
              放弃
            </Button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, opacity: 0.7 }}>
              危险度：{state.run.danger} | 暂存收益：
              {state.run.pendingReward} | 生命：{state.player.hp}/
              {state.player.maxHp}
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
          </>
        )}
      </Stack>
    </Panel>
  )
}
