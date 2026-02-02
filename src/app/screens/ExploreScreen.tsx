import type { GameAction, GameState } from '../../engine'
import {
  getChain,
  getDailyEnvironmentDef,
  getExploreMultiplier,
  PITY_LEGEND_LOOT_THRESHOLD,
  PITY_DEBUG_SHOW_VALUES,
} from '../../engine'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { LootToast } from '../ui/LootToast'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function ExploreScreen({ state, dispatch }: ScreenProps) {
  const currentEvent = state.run.currentEvent
  const danger = state.run.danger ?? 0
  const mult = getExploreMultiplier(danger)
  const streak = state.run.streak ?? 0
  const pendingLoot = state.run.pendingLoot

  const dailyDef = state.meta?.daily
    ? getDailyEnvironmentDef(state.meta.daily.environmentId as import('../../engine').DailyEnvironmentId)
    : null

  const handleDismissLoot = () => {
    dispatch({ type: 'CLEAR_LOOT' })
  }

  return (
    <>
      {pendingLoot && pendingLoot.length > 0 && (
        <LootToast drops={pendingLoot} onDismiss={handleDismissLoot} />
      )}
      <Panel title="探索">
        <Stack gap={10}>
        {dailyDef && (
          <div className="daily-hint">今日：{dailyDef.name}</div>
        )}
        {currentEvent ? (
          <>
            <div className="page-chips">
              <Chip className="app-chip--hp">{`${state.player.hp}/${state.player.maxHp}`}</Chip>
              <Chip className="app-chip--danger">危险 {danger}</Chip>
              {currentEvent.rarity && currentEvent.rarity !== 'common' && (
                <Chip className={`app-chip--rarity app-chip--rarity-${currentEvent.rarity}`}>
                  {currentEvent.rarity === 'rare' ? '✨ 稀有' : '🌟 传说'}
                </Chip>
              )}
            </div>
            {currentEvent.rarity === 'rare' && (
              <div className="explore-rarity-banner explore-rarity-banner--rare">
                ✨ 稀有事件：收益更高！
              </div>
            )}
            {currentEvent.rarity === 'legendary' && (
              <div className="explore-rarity-banner explore-rarity-banner--legendary">
                🌟 传说事件：巨大收益！
              </div>
            )}
            {currentEvent.chainId != null && currentEvent.chapter != null && (() => {
              const chain = getChain(currentEvent.chainId)
              return chain ? (
                <div className="explore-chain-prefix">奇遇·《{chain.name}》 {`${currentEvent.chapter}/${chain.chapters.length}`}</div>
              ) : null
            })()}
            <div className="explore-event-title">{currentEvent.title}</div>
            <div className="explore-event-text">{currentEvent.text}</div>
            <div className="page-actions page-actions--wrap">
              <Button
                variant="option-green"
                size="sm"
                onClick={() => dispatch({ type: 'EXPLORE_CHOOSE', choice: 'A' })}
              >
                {currentEvent.aText}
              </Button>
              <Button
                variant="option-blue"
                size="sm"
                onClick={() => dispatch({ type: 'EXPLORE_CHOOSE', choice: 'B' })}
              >
                {currentEvent.bText}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ type: 'EXPLORE_DISMISS_EVENT' })}
              >
                放弃
              </Button>
            </div>
          </>
        ) : danger >= 100 ? (
          /* 危险值 100：本次探索结束，突出领取奖励，体验更爽 */
          <>
            <div className="page-chips">
              <Chip className="app-chip--danger">危险值 100</Chip>
              <Chip className="app-chip--gold">收益倍率 ×{mult.toFixed(1)}</Chip>
              <Chip className="app-chip--pity">连斩 {streak}</Chip>
              <Chip className="app-chip--hp">{`${state.player.hp}/${state.player.maxHp}`}</Chip>
            </div>
            <div className="explore-ended-block">
              <div className="explore-ended-title">本次探索结束</div>
              <div className="explore-ended-desc">危险已满，收获满满！领取本次探索奖励。</div>
              <Button
                variant="primary"
                size="lg"
                className="explore-ended-claim"
                onClick={() => dispatch({ type: 'EXPLORE_CASH_OUT' })}
              >
                领取奖励
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="page-chips">
              <Chip className="app-chip--danger">危险值 {danger}</Chip>
              <Chip className="app-chip--gold">收益倍率 ×{mult.toFixed(1)}</Chip>
              <Chip className="app-chip--pity">连斩 {streak}</Chip>
              <Chip className="app-chip--hp">{`${state.player.hp}/${state.player.maxHp}`}</Chip>
              <Chip className="app-chip--legendary">传奇机缘保底 {`${state.meta?.pityLegendLoot ?? 0}/${PITY_LEGEND_LOOT_THRESHOLD}`}</Chip>
            </div>
            {PITY_DEBUG_SHOW_VALUES && (
              <div className="explore-pity-debug">[调试] 探索传奇保底={state.meta?.pityLegendLoot ?? 0}</div>
            )}
            {state.run.chain?.activeChainId != null && state.run.chain?.chapter != null && (() => {
              const chain = getChain(state.run.chain!.activeChainId!)
              return chain ? (
                <div className="explore-chain-progress">
                  奇遇进度：{`${state.run.chain.chapter}/${chain.chapters.length}`}（继续深入可推进）
                  <div className="explore-chain-hint">终章必有大货</div>
                </div>
              ) : null
            })()}
            {(() => {
              const tips: string[] = []
              if (danger >= 50) tips.push('危险≥50 稀有/传说概率↑')
              if (streak >= 3) tips.push(streak >= 8 ? `连斩${streak} 收手得宝箱` : `连斩${streak}`)
              tips.push(`收手回血 +${6 + Math.round(danger * 0.12)}`)
              if (danger >= 70 && (state.meta?.pityLegendLoot ?? 0) >= PITY_LEGEND_LOOT_THRESHOLD) tips.push('此时收手易出传奇')
              return tips.length > 0 ? (
                <div className="explore-tips-line">{tips.join(' · ')}</div>
              ) : null
            })()}
            <div className="page-actions page-actions--wrap">
              <div className="explore-deepen-row">
                <Button
                  variant="option-green"
                  size="sm"
                  onClick={() => dispatch({ type: 'EXPLORE_DEEPEN' })}
                >
                  继续深入
                </Button>
                <span className="explore-time-hint">不消耗时辰，仅推进危险与事件</span>
              </div>
              <Button variant="option-blue" size="sm" onClick={() => dispatch({ type: 'EXPLORE_CASH_OUT' })}>
                见好就收
              </Button>
              <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'EXPLORE_BACK' })}>
                离开探索
              </Button>
            </div>
          </>
        )}
        </Stack>
      </Panel>
    </>
  )
}
