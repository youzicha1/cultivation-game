import { useState, useMemo } from 'react'
import type { GameAction, GameState } from '../../engine'
import {
  buildAchievementStateSlice,
  getAchievementView,
  achievementGroups,
  type AchievementViewItem,
} from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

const GROUP_ORDER = ['explore', 'alchemy', 'breakthrough', 'tribulation', 'market', 'build', 'collection', 'legacy']

export function AchievementsScreen({ state, dispatch }: ScreenProps) {
  const [activeGroup, setActiveGroup] = useState<string>(GROUP_ORDER[0])
  const slice = useMemo(() => buildAchievementStateSlice(state), [state])
  const view = useMemo(() => getAchievementView(slice), [slice])
  const byGroup = useMemo(() => {
    const map = new Map<string, AchievementViewItem[]>()
    for (const item of view) {
      const list = map.get(item.group) ?? []
      list.push(item)
      map.set(item.group, list)
    }
    return map
  }, [view])
  const list = byGroup.get(activeGroup) ?? []
  const claimableCount = view.filter((v) => v.claimable).length

  return (
    <div className="app-panel achievements-v2">
      <Panel title="成就">
        <div className="achievements-tabs">
          {GROUP_ORDER.map((gid) => {
            const group = achievementGroups.find((x) => x.id === gid)
            const count = byGroup.get(gid)?.length ?? 0
            return (
              <button
                key={gid}
                type="button"
                className={`achievements-tab ${activeGroup === gid ? 'achievements-tab--active' : ''}`}
                onClick={() => setActiveGroup(gid)}
              >
                {group?.name ?? gid}
                {count > 0 && <span className="achievements-tab-count">{count}</span>}
              </button>
            )
          })}
        </div>

        {claimableCount > 0 && (
          <Button
            variant="primary"
            size="md"
            className="achievements-claim-all"
            style={{ minHeight: 44 }}
            onClick={() => dispatch({ type: 'CLAIM_ALL_ACHIEVEMENTS' })}
          >
            一键领取（{claimableCount}）
          </Button>
        )}

        <ul className="achievements-list">
          {list.map((item) => (
            <li
              key={item.id}
              className={`achievements-card ${item.claimed ? 'achievements-card--claimed' : ''} ${item.claimable ? 'achievements-card--claimable' : ''}`}
            >
              <div className="achievements-card-head">
                <span className="achievements-card-title">{item.hidden ? '？？？' : item.name}</span>
                <span className="achievements-card-tier">Tier {item.tier}</span>
              </div>
              <p className="achievements-card-desc">{item.hidden ? '？？？' : item.desc}</p>
              {item.target != null && item.current != null && (
                <div className="achievements-progress">
                  <div
                    className="achievements-progress-bar"
                    style={{ width: `${Math.min(100, (item.current / item.target) * 100)}%` }}
                  />
                  <span className="achievements-progress-text">
                    {item.current} / {item.target}
                  </span>
                </div>
              )}
              <div className="achievements-card-foot">
                <span className="achievements-reward">奖励：{item.rewardText}</span>
                {item.claimable && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => dispatch({ type: 'CLAIM_ACHIEVEMENT', id: item.id })}
                  >
                    领取
                  </Button>
                )}
                {item.claimed && <span className="achievements-claimed-badge">已领取</span>}
              </div>
            </li>
          ))}
        </ul>

        <div className="page-actions" style={{ marginTop: 12 }}>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
            返回
          </Button>
        </div>
      </Panel>
    </div>
  )
}
