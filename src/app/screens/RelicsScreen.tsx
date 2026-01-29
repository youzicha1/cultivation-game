import type { GameAction, GameState } from '../../engine'
import {
  getAllKungfu,
  getKungfu,
  getKungfuIdsByRarity,
  RELIC_SLOTS,
  PITY_LEGEND_KUNGFU_THRESHOLD,
  SHARD_COST_RARE,
  SHARD_COST_EPIC,
  SHARD_COST_LEGENDARY,
  PITY_DEBUG_SHOW_VALUES,
  type RelicId,
} from '../../engine'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

const RARITY_CLASS: Record<string, string> = {
  common: 'app-chip--common',
  rare: 'app-chip--rare',
  epic: 'app-chip--epic',
  legendary: 'app-chip--legendary',
}

export function RelicsScreen({ state, dispatch }: ScreenProps) {
  const { relics, equippedRelics } = state.player
  const slots = (equippedRelics ?? [null, null, null]) as (RelicId | null)[]
  const ownedSet = new Set(relics ?? [])
  const equippedSet = new Set(slots.filter(Boolean) as RelicId[])
  const firstEmptySlot = slots.findIndex((s) => s === null) as 0 | 1 | 2
  const hasEmptySlot = firstEmptySlot >= 0
  const allKungfu = getAllKungfu()
  const pityKungfu = state.meta?.pityLegendKungfa ?? 0
  const shards = state.meta?.kungfaShards ?? 0
  const shardExchangeJustClaimed = state.run.shardExchangeJustClaimed

  const equipToFirst = (id: RelicId) => {
    if (!hasEmptySlot) return
    dispatch({ type: 'RELIC_EQUIP', slotIndex: firstEmptySlot, relicId: id })
  }

  const unequip = (slotIndex: 0 | 1 | 2) => {
    dispatch({ type: 'RELIC_EQUIP', slotIndex, relicId: null })
  }

  return (
    <Panel title="功法">
      <Stack gap={10}>
        <div className="page-chips">
          <Chip className="app-chip--gold">已获得 {ownedSet.size}</Chip>
          <Chip className="app-chip--pity">装备槽 {RELIC_SLOTS}</Chip>
          <Chip className="app-chip--legendary">传奇功法保底 {`${pityKungfu}/${PITY_LEGEND_KUNGFU_THRESHOLD}`}</Chip>
          <Chip className="app-chip--epic">碎片 {`${shards}/${SHARD_COST_LEGENDARY}`}（可兑换传奇）</Chip>
        </div>
        {PITY_DEBUG_SHOW_VALUES && (
          <div className="relics-pity-debug">[调试] 功法保底={pityKungfu} 碎片={shards}</div>
        )}

        <div className="page-label">功法槽位</div>
        <div className="relic-slots-row">
          {[0, 1, 2].map((i) => {
            const id = slots[i]
            const def = id ? getKungfu(id) : null
            return (
              <div key={i} className="relic-slot relic-slot--card">
                <span className="relic-slot__label">槽 {i + 1}</span>
                {def ? (
                  <>
                    <span className={`relic-slot__name ${RARITY_CLASS[def.rarity] ?? ''}`}>{def.name}</span>
                    <span className="relic-slot__short-desc">{def.shortDesc}</span>
                    <Button variant="ghost" size="sm" onClick={() => unequip(i as 0 | 1 | 2)}>卸下</Button>
                  </>
                ) : (
                  <span className="relic-slot__empty">空槽</span>
                )}
              </div>
            )
          })}
        </div>

        <div className="page-label">功法列表</div>
        <div className="relic-list-group">
          <div className="relic-list-section">
            <div className="relic-list-section-title">已拥有</div>
            <ul className="relic-list">
              {allKungfu
                .filter((k) => ownedSet.has(k.id as RelicId))
                .map((k) => {
                  const isEquipped = equippedSet.has(k.id as RelicId)
                  return (
                    <li key={k.id} className="relic-list__item relic-list__item--owned">
                      <div className="relic-list__row">
                        <span className={`relic-list__name ${RARITY_CLASS[k.rarity] ?? ''}`}>{k.name}</span>
                        {isEquipped ? (
                          <Chip className="app-chip--gold">已装备</Chip>
                        ) : hasEmptySlot ? (
                          <Button variant="primary" size="sm" onClick={() => equipToFirst(k.id as RelicId)}>装备</Button>
                        ) : (
                          <span className="relic-list__full">槽位已满</span>
                        )}
                      </div>
                      <span className="relic-list__desc">{k.shortDesc}</span>
                    </li>
                  )
                })}
              {ownedSet.size === 0 && (
                <li className="relic-list__empty">暂无功法，探索秘境有机会获得</li>
              )}
            </ul>
          </div>
          <div className="relic-list-section">
            <div className="relic-list-section-title">未获得</div>
            <ul className="relic-list">
              {allKungfu
                .filter((k) => !ownedSet.has(k.id as RelicId))
                .map((k) => (
                  <li key={k.id} className="relic-list__item relic-list__item--unowned">
                    <span className="relic-list__name relic-list__item--grey">{k.name}</span>
                    <span className="relic-list__source-hint">{k.sourceHint}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>

        <div className="page-label">碎片兑换（指定功法）</div>
        <div className="relic-shard-exchange">
          {(['rare', 'epic', 'legendary'] as const).map((rarity) => {
            const cost = rarity === 'rare' ? SHARD_COST_RARE : rarity === 'epic' ? SHARD_COST_EPIC : SHARD_COST_LEGENDARY
            const canAfford = shards >= cost
            const ids = getKungfuIdsByRarity(rarity)
            const unowned = ids.filter((id) => !ownedSet.has(id))
            return (
              <div key={rarity} className="relic-shard-tier">
                <span className="relic-shard-tier-label">
                  {rarity === 'rare' ? '稀有' : rarity === 'epic' ? '史诗' : '传奇'}（{cost} 碎片）
                </span>
                <ul className="relic-shard-list">
                  {unowned.length === 0 ? (
                    <li className="relic-shard-list__empty">该档已全获得</li>
                  ) : (
                    unowned.map((id) => {
                      const def = getKungfu(id)
                      if (!def) return null
                      return (
                        <li key={id} className="relic-shard-list__row">
                          <span className={`relic-list__name ${RARITY_CLASS[def.rarity] ?? ''}`}>{def.name}</span>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={!canAfford}
                            onClick={() => dispatch({ type: 'KUNGFU_SHARD_EXCHANGE', kungfuId: id, rarity })}
                          >
                            兑换
                          </Button>
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="page-actions">
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
            返回
          </Button>
        </div>
      </Stack>

      {shardExchangeJustClaimed != null && (
        <div className="relic-shard-toast-overlay">
          <div className="relic-shard-toast-mask" />
          <div className="relic-shard-toast-card">
            <p className="relic-shard-toast-title">你以碎片换得《{shardExchangeJustClaimed}》</p>
            <Button variant="primary" size="md" onClick={() => dispatch({ type: 'CLEAR_SHARD_EXCHANGE_TOAST' })}>
              太棒了
            </Button>
          </div>
        </div>
      )}
    </Panel>
  )
}
