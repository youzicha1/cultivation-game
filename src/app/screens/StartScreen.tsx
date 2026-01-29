import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
  newGame: () => void
}

export function StartScreen({ state, dispatch, newGame }: ScreenProps) {
  const isDead = state.summary?.endingId === 'death'
  const hasSave = state.run.turn > 0 || (state.player.exp > 0 || state.player.spiritStones > 0)
  
  return (
    <Panel title="修仙之路">
      <Stack gap={10}>
        <div className="page-chips">
          <Chip className="app-chip--gold">{state.player.realm}</Chip>
        </div>
        {isDead && (
          <div className="start-dead-hint">身死道消，本局已结束。请开始新游戏。</div>
        )}
        <div className="page-actions">
          <Button 
            variant="primary" 
            size="sm" 
            onClick={() => dispatch({ type: 'GO', screen: 'home' })}
            disabled={isDead || !hasSave}
          >
            继续游戏
          </Button>
          <Button
            variant="option-green"
            size="sm"
            onClick={() => {
              newGame()
            }}
          >
            新开局
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'settings' })}>
            设置
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}
