import type { GameAction, GameState } from '../../engine'
import { ACHIEVEMENT_IDS, type AchievementId } from '../../engine'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

const ACHIEVEMENT_NAMES: Record<AchievementId, string> = {
  one_pot_tian: '一炉成天丹',
  heart_demon_clear: '心魔不过',
  secret_ten_streak: '秘境十连',
  first_breakthrough: '初破境界',
  five_realms: '五境在望',
  retreat_master: '见好就收',
  allin_win: '梭哈一把赢',
  no_boom_ten: '十炼无爆',
  chain_complete: '奇遇链终章',
  relic_collector: '功法三件套',
  golden_retreat: '金盆洗手',
  legendary_drop: '传说掉落',
}

export function AchievementsScreen({ state, dispatch }: ScreenProps) {
  const unlocked = state.player.achievements ?? []

  return (
    <div className="app-panel" style={{ padding: 12 }}>
      <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>成就</h2>
      <div className="page-chips" style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>已解锁 {`${unlocked.length} / ${ACHIEVEMENT_IDS.length}`}</span>
      </div>
      <ul className="achievement-list">
        {ACHIEVEMENT_IDS.map((id) => (
          <li
            key={id}
            className={`achievement-list__item ${unlocked.includes(id) ? 'achievement-list__item--unlocked' : ''}`}
          >
            {unlocked.includes(id) ? '◆' : '·'} {ACHIEVEMENT_NAMES[id]}
          </li>
        ))}
      </ul>
      <div className="page-actions" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="app-btn app-btn-ghost app-btn-sm"
          onClick={() => dispatch({ type: 'GO', screen: 'home' })}
        >
          返回
        </button>
      </div>
    </div>
  )
}
