import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
  clearSave: () => void
}

export function SettingsScreen({ state, dispatch, clearSave }: ScreenProps) {
  return (
    <Panel title="设置">
      <Stack gap={10}>
        <div className="page-chips">
          <Chip className="app-chip--gold">{state.player.realm}</Chip>
        </div>
        <div className="page-actions">
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
            返回主界面
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              clearSave()
              dispatch({ type: 'GO', screen: 'start' })
            }}
          >
            清档
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'start' })}>
            回到开局
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}
