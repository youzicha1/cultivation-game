import { useEffect } from 'react'
import type { GameAction, GameState } from '../../engine'
import type { ScreenId } from '../../engine'
import { getDailyEnvironmentDef } from '../../engine'
import { Button } from '../ui/Button'
import { IconButtonCard } from '../ui/IconButtonCard'
import type { AtmosIconName } from '../ui/IconArt'
import { LootToast } from '../ui/LootToast'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

/** TICKET-31: 主界面入口映射（iconName + 爽文副标题），供渲染与测试 */
export const HOME_ENTRIES: Array<{
  id: string
  screen: ScreenId | 'explore_start' | 'alchemy_open' | 'breakthrough_open'
  iconName: AtmosIconName
  title: string
  subtitle: string
  tone?: 'gold' | 'jade' | 'purple' | 'red'
}> = [
  { id: 'cultivate', screen: 'cultivate', iconName: 'cultivate', title: '修炼', subtitle: '吐纳周天，修为暴涨', tone: 'jade' },
  { id: 'explore', screen: 'explore_start', iconName: 'explore', title: '探索', subtitle: '押命深入，翻倍爆赚', tone: 'gold' },
  { id: 'alchemy', screen: 'alchemy_open', iconName: 'alchemy', title: '炼丹', subtitle: '炉火一开，天品在手', tone: 'purple' },
  { id: 'breakthrough', screen: 'breakthrough_open', iconName: 'breakthrough', title: '突破', subtitle: '卡境必破，觉醒神通', tone: 'gold' },
  { id: 'shop', screen: 'shop', iconName: 'shop', title: '坊市', subtitle: '捡漏暴富，一刀入魂', tone: 'gold' },
  { id: 'relics', screen: 'relics', iconName: 'kungfu', title: '功法', subtitle: '流派成型，机制起飞', tone: 'jade' },
  { id: 'legacy', screen: 'legacy', iconName: 'legacy', title: '传承', subtitle: '败而不馁，下一局更强', tone: 'purple' },
  { id: 'achievements', screen: 'achievements', iconName: 'achievement', title: '成就', subtitle: '隐藏称号，炫耀拉满', tone: 'gold' },
  { id: 'settings', screen: 'settings', iconName: 'settings', title: '设置', subtitle: '存档与诊断', tone: 'jade' },
]

function getTodayDayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

const STAGE_CN = ['一', '二', '三', '四', '五', '六', '七'] as const
function formatRealmStage(realm: string, stageIndex?: number): string {
  const i = Math.max(1, Math.min(7, stageIndex ?? 1)) - 1
  return `${realm}${STAGE_CN[i] ?? '一'}阶`
}

export function HomeScreen({ state, dispatch }: ScreenProps) {
  useEffect(() => {
    if (state.screen === 'home') {
      dispatch({ type: 'SYNC_DAILY', dayKey: getTodayDayKey() })
    }
  }, [state.screen, dispatch])

  const expProgress = Math.max(
    0,
    Math.min(1, (state.player.exp % 100) / 100),
  )
  const hpProgress = Math.max(
    0,
    Math.min(1, state.player.hp / state.player.maxHp),
  )

  const daily = state.meta?.daily
  const dailyDef = daily ? getDailyEnvironmentDef(daily.environmentId as import('../../engine').DailyEnvironmentId) : null
  const mission = daily?.mission
  const missionComplete = mission && mission.progress >= mission.target
  const canClaim = missionComplete && !mission.claimed
  const dailyRewardJustClaimed = state.run.dailyRewardJustClaimed
  const pendingLoot = state.run.pendingLoot

  return (
    <>
      {pendingLoot && pendingLoot.length > 0 && (
        <LootToast
          drops={pendingLoot}
          onDismiss={() => dispatch({ type: 'CLEAR_LOOT' })}
          variant={pendingLoot.some((d) => d.rarity === 'legendary') ? 'chainComplete' : undefined}
        />
      )}
      {dailyRewardJustClaimed && (
        <div
          className="daily-reward-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="daily-reward-title"
        >
          <div className="daily-reward-modal">
            <div className="daily-reward-modal__title" id="daily-reward-title">
              获得
            </div>
            <div className="daily-reward-modal__content">
              {dailyRewardJustClaimed}！
            </div>
            <Button
              variant="primary"
              size="sm"
              className="daily-reward-modal__btn"
              onClick={() => dispatch({ type: 'CLEAR_DAILY_REWARD_TOAST' })}
            >
              太棒了
            </Button>
          </div>
        </div>
      )}
      <Panel title="主界面">
      <Stack gap={10}>
        {dailyDef && daily && (
          <div className={`daily-card ${canClaim ? 'atm-card atm-card--glow' : ''}`}>
            <div className="daily-card-title">今日：{dailyDef.name}</div>
            <div className="daily-buffs">
              <span className="daily-main-buff">+ {dailyDef.mainBuff}</span>
              <span className="daily-sub-buff">+ {dailyDef.subBuff}</span>
              <span className="daily-debuff">− {dailyDef.debuff}</span>
            </div>
            {mission?.claimed ? (
              <div className="daily-mission daily-mission--done">
                <span className="daily-mission-label">每日任务已完成</span>
              </div>
            ) : (
              <>
                <div className="daily-mission">
                  <span className="daily-mission-label">每日任务：{dailyDef.missionLabel}</span>
                  <div className="daily-mission-bar">
                    <div
                      className="daily-mission-fill"
                      style={{ width: `${mission ? Math.min(100, (mission.progress / mission.target) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="daily-mission-progress">
                    {`${mission?.progress ?? 0}/${mission?.target ?? 0}`}
                  </span>
                </div>
                <div className="daily-actions">
                  {canClaim && (
                    <Button variant="primary" size="sm" onClick={() => dispatch({ type: 'DAILY_CLAIM' })}>
                      领取今日赠礼
                    </Button>
                  )}
                  <Button
                    variant="option-purple"
                    size="sm"
                    onClick={() => dispatch({ type: 'GO', screen: dailyDef.suggestScreen })}
                  >
                    立即前往
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        <div className="home-realm-run">
          <span className="home-realm-run__item">境界：{formatRealmStage(state.player.realm, state.player.stageIndex)}</span>
          <span className="home-realm-run__item">周目：当周目{state.meta?.runCount ?? 1}</span>
        </div>

        <div className="stat-group">
          <div className="stat-row">
            <span className="stat-label">修为</span>
            <span className="stat-value">{state.player.exp}</span>
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill stat-bar-fill-exp"
              style={{ width: `${expProgress * 100}%` }}
            />
          </div>
          <div className="stat-row">
            <span className="stat-label">生命</span>
            <span className="stat-value">{`${state.player.hp}/${state.player.maxHp}`}</span>
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill stat-bar-fill-hp"
              style={{ width: `${hpProgress * 100}%` }}
            />
          </div>
        </div>

        <div className="page-actions page-actions--cards">
          {HOME_ENTRIES.map((entry) => {
            const handleClick = () => {
              if (entry.screen === 'explore_start') dispatch({ type: 'EXPLORE_START' })
              else if (entry.screen === 'alchemy_open') dispatch({ type: 'ALCHEMY_OPEN' })
              else if (entry.screen === 'breakthrough_open') dispatch({ type: 'BREAKTHROUGH_OPEN' })
              else dispatch({ type: 'GO', screen: entry.screen as ScreenId })
            }
            return (
              <IconButtonCard
                key={entry.id}
                title={entry.title}
                subtitle={entry.subtitle}
                iconName={entry.iconName}
                onClick={handleClick}
                tone={entry.tone ?? 'gold'}
              />
            )
          })}
        </div>
      </Stack>
    </Panel>
    </>
  )
}
