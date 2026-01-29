import { useEffect } from 'react'
import type { GameAction, GameState } from '../../engine'
import { getDailyEnvironmentDef } from '../../engine'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

function getTodayDayKey(): string {
  return new Date().toISOString().slice(0, 10)
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

  return (
    <>
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
          <div className="daily-card">
            <div className="daily-card-title">今日：{dailyDef.name}</div>
            <div className="daily-buffs">
              <span className="daily-main-buff">+ {dailyDef.mainBuff}</span>
              <span className="daily-sub-buff">+ {dailyDef.subBuff}</span>
              <span className="daily-debuff">− {dailyDef.debuff}</span>
            </div>
            <div className="daily-mission">
              <span className="daily-mission-label">{dailyDef.missionLabel}</span>
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
          </div>
        )}

        <div className="page-chips">
          <Chip className="app-chip--gold">{state.player.realm}</Chip>
          <Chip className="app-chip--hp">{`${state.player.hp}/${state.player.maxHp}`}</Chip>
          <Chip className="app-chip--inherit">丹 {state.player.pills}</Chip>
          <Chip className="app-chip--pity">周目 {state.run.turn}</Chip>
          <Chip className="app-chip--gold">灵石 {state.player.spiritStones}</Chip>
          <Chip className="app-chip--danger">危险值 {state.run.danger ?? 0}</Chip>
        </div>
        {(state.run.danger ?? 0) > 0 && (
          <div className="stat-bar explore-danger-bar">
            <div
              className="stat-bar-fill stat-bar-fill-danger"
              style={{ width: `${Math.min(100, ((state.run.danger ?? 0) / 100) * 100)}%` }}
            />
          </div>
        )}

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

        <div className="page-actions">
          <Button variant="option-green" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'cultivate' })}>
            修炼
          </Button>
          <Button variant="option-blue" size="sm" onClick={() => dispatch({ type: 'EXPLORE_START' })}>
            探索
          </Button>
          <Button variant="option-purple" size="sm" onClick={() => dispatch({ type: 'ALCHEMY_OPEN' })}>
            炼丹
          </Button>
          <Button variant="primary" size="sm" onClick={() => dispatch({ type: 'BREAKTHROUGH_OPEN' })}>
            突破
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'relics' })}>
            功法
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'legacy' })}>
            传承
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'achievements' })}>
            成就
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'settings' })}>
            设置
          </Button>
        </div>
      </Stack>
    </Panel>
    </>
  )
}
