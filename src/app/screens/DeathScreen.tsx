import type { GameAction, GameState } from '../../engine'
import { Button } from '../ui/Button'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
  newGame: () => void
}

export function DeathScreen({ state, dispatch, newGame }: ScreenProps) {
  return (
    <div className="death-outcome">
      <div className="death-outcome__hero">
        <span className="death-outcome__icon" aria-hidden>✕</span>
        <h2 className="death-outcome__title">陨落</h2>
        <p className="death-outcome__cause">{state.summary?.cause ?? '未知'}</p>
        {state.summary?.endingId === 'death' && (
          <p className="death-outcome__legacy">身死道消，本局结束。安慰奖：传承点 +1</p>
        )}
      </div>
      <div className="death-outcome__card">
        <div className="page-actions">
          <Button variant="option-blue" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'summary' })}>
            本局总结
          </Button>
          <Button variant="primary" size="sm" onClick={newGame}>
            新开局
          </Button>
        </div>
      </div>
    </div>
  )
}
