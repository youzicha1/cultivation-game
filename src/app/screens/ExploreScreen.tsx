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
  const dangerHigh = danger >= 80
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
            {danger >= 50 && (
              <div className="explore-high-danger-hint">
                危险值 ≥50：稀有/传说事件出现概率提升，收益倍率更高！
              </div>
            )}
            {streak >= 3 && streak < 5 && (
              <div className="explore-streak-hint">
                连斩{streak}层：下次连斩奖励在 {5 - streak} 层后触发！
              </div>
            )}
            {streak >= 5 && streak < 8 && (
              <div className="explore-streak-hint">
                连斩{streak}层：下次连斩奖励在 {8 - streak} 层后触发！
              </div>
            )}
            {streak >= 8 && (
              <div className="explore-streak-hint explore-streak-hint--max">
                连斩{streak}层：收手时将获得连斩宝箱奖励！
              </div>
            )}
            {dangerHigh && (
              <div className="explore-danger-warning">危险值爆表！再深入可能出大事。</div>
            )}
            {(() => {
              const cashOutHeal = 6 + Math.round(danger * 0.12)
              return (
                <div className="explore-cashout-heal-hint">
                  收手可回血：+{cashOutHeal}（危险值越高回血越多）
                </div>
              )
            })()}
            {danger >= 70 && (state.meta?.pityLegendLoot ?? 0) >= PITY_LEGEND_LOOT_THRESHOLD && (
              <div className="explore-cashout-pity-hint">此时收手，更容易吃到传奇保底</div>
            )}
            <div className="page-actions page-actions--wrap">
              <div className="explore-deepen-row">
                <Button
                  variant="option-green"
                  size="sm"
                  onClick={() => dispatch({ type: 'EXPLORE_DEEPEN' })}
                  disabled={danger >= 100}
                  title={danger >= 100 ? '危险值已达上限，无法继续深入' : ''}
                >
                  继续深入
                </Button>
                <span className="explore-time-hint">本次深入将消耗 1 时辰</span>
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
