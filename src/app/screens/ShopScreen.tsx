import { useState, useMemo } from 'react'
import type { GameAction, GameState } from '../../engine'
import {
  getShopCatalog,
  getShopSectionsWithItems,
  SHOP_SECTION_LABELS,
  canBuy,
  canSellAny,
  getFillMissingPlan,
  getSellableItems,
  type ShopCatalogItem,
  type ShopSection,
  type SellableItem,
} from '../../engine/shop'
import type { MaterialId } from '../../engine/alchemy'
import { getRecipe, getMaterialName } from '../../engine/alchemy'
import { getKungfu } from '../../engine/kungfu'
import {
  getPlayerTradeOptions,
  canTrade as canStrangerTrade,
  isTraderExpired,
  STRANGER_DURATION_MS,
  type TraderOffer,
  type PlayerGive,
} from '../../engine/stranger'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { StickyFooter } from '../ui/StickyFooter'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

const RARITY_ORDER: Record<string, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
}

type TabId = 'mat' | 'sell'

const SECTIONS = getShopSectionsWithItems()

function formatOfferLabel(offer: TraderOffer): string {
  if (offer.kind === 'recipe_fragment') {
    const name = getRecipe(offer.recipeId)?.name ?? offer.recipeId
    const partLabel = offer.part === 'upper' ? '上篇' : offer.part === 'middle' ? '中篇' : '下篇'
    return `丹方《${name}》·${partLabel}残页`
  }
  if (offer.kind === 'rare_material') {
    return `稀有材料·${getMaterialName(offer.materialId)}`
  }
  return `功法·${getKungfu(offer.kungfuId as import('../../engine/relics').RelicId)?.name ?? offer.kungfuId}`
}

function formatGiveLabel(give: PlayerGive): string {
  if (give.kind === 'recipe_fragment') {
    const name = getRecipe(give.recipeId)?.name ?? give.recipeId
    const partLabel = give.part === 'upper' ? '上篇' : give.part === 'middle' ? '中篇' : '下篇'
    return `《${name}》·${partLabel}`
  }
  if (give.kind === 'rare_material') {
    return getMaterialName(give.materialId)
  }
  return getKungfu(give.kungfuId as import('../../engine/relics').RelicId)?.name ?? give.kungfuId
}

export function ShopScreen({ state, dispatch }: ScreenProps) {
  const { items, dailyHint } = getShopCatalog(state)
  const missing = state.run.shopMissing ?? []
  const fillPlan = missing.length > 0 ? getFillMissingPlan(state, missing) : null
  const [tab, setTab] = useState<TabId>('mat')
  const [section, setSection] = useState<ShopSection>(SECTIONS[0] ?? 'alchemy_materials')
  const [qtys, setQtys] = useState<Record<string, number>>({})
  const [filterAfford, setFilterAfford] = useState(false)

  const gold = state.player.spiritStones ?? 0
  const itemsInSection = items.filter((it) => it.section === section)

  const setQty = (itemId: string, delta: number) => {
    setQtys((prev) => {
      const cur = prev[itemId] ?? 1
      const next = Math.max(1, Math.min(99, cur + delta))
      return { ...prev, [itemId]: next }
    })
  }

  /** 购买列表：默认按稀有度排序（高→低），可选仅买得起 */
  const buyItems = useMemo(() => {
    let list = itemsInSection.filter(() => true)
    if (filterAfford) {
      list = list.filter((it) => canBuy(state, it.id as MaterialId, 1).ok)
    }
    list.sort((a, b) => (RARITY_ORDER[b.rarity ?? 'common'] ?? 0) - (RARITY_ORDER[a.rarity ?? 'common'] ?? 0))
    return list
  }, [itemsInSection, state, filterAfford])

  /** 出售列表：所有可出售物品，已按稀有度排序（getSellableItems 内部排序） */
  const sellableItems = useMemo(() => getSellableItems(state), [state])

  return (
    <div className="shop-page">
      <Panel title="坊市" className="shop-panel">
        <header className="shop-resource-bar">
          <span className="shop-gold">灵石 {gold}</span>
        </header>

        {/* 奇人交易：仅在奇人存在且未过期（真实 2 小时内）时显示 */}
        {state.run.mysteriousTrader && (() => {
          const t = state.run.mysteriousTrader
          const expired = isTraderExpired(t.appearedAt)
          if (expired) {
            return (
              <div className="shop-stranger-block shop-stranger-block--gone">
                <div className="shop-stranger-title">坊市奇人</div>
                <p className="shop-stranger-desc">奇人已离去，下次有缘再见。</p>
              </div>
            )
          }
          const { offer } = t
          const options = getPlayerTradeOptions(state.player, offer)
          return (
            <div className="shop-stranger-block">
              <div className="shop-stranger-title">坊市奇人 · 以物易物</div>
              <p className="shop-stranger-desc">奇人带来：{formatOfferLabel(offer)}。只能用同类型稀有物品交换，不可用灵石购买。（约剩 {Math.max(0, Math.ceil((STRANGER_DURATION_MS - (Date.now() - t.appearedAt)) / 60000))} 分钟）</p>
              {options.length === 0 ? (
                <p className="shop-stranger-empty">你当前没有可交换的同类型物品。</p>
              ) : (
                <div className="shop-stranger-options">
                  {options.map((give) => {
                    const canDo = canStrangerTrade(state.player, offer, give)
                    return (
                      <Button
                        key={give.kind + (give.kind === 'recipe_fragment' ? `${give.recipeId}-${give.part}` : give.kind === 'rare_material' ? give.materialId : give.kungfuId)}
                        variant="option-green"
                        size="sm"
                        className="shop-stranger-btn"
                        onClick={() => dispatch({ type: 'SHOP_STRANGER_TRADE', give })}
                        disabled={!canDo}
                      >
                        用「{formatGiveLabel(give)}」换取
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* 购买 / 出售 主 Tab */}
        <div className="shop-tabs">
          <Button
            variant={tab === 'mat' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setTab('mat')}
          >
            购买
          </Button>
          <Button
            variant={tab === 'sell' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setTab('sell')}
          >
            出售
          </Button>
        </div>

        {/* 品类：仅购买时显示（炼丹材料 / 消耗品 / 功法碎片） */}
        {tab === 'mat' && (
          <div className="shop-section-tabs">
            {SECTIONS.map((s) => (
              <Button
                key={s}
                variant={section === s ? 'primary' : 'ghost'}
                size="sm"
                className="shop-section-btn"
                onClick={() => setSection(s)}
              >
                {SHOP_SECTION_LABELS[s]}
              </Button>
            ))}
          </div>
        )}

        {tab === 'mat' && (
          <>
            <div className="shop-filters">
              <label className="shop-filter-check">
                <input
                  type="checkbox"
                  checked={filterAfford}
                  onChange={(e) => setFilterAfford(e.target.checked)}
                />
                仅买得起
              </label>
            </div>
            <div className="shop-list">
              {buyItems.length === 0 ? (
                <p className="shop-empty">当前品类暂无商品。</p>
              ) : null}
              {buyItems.map((it: ShopCatalogItem) => {
                const qty = qtys[it.id] ?? 1
                const res = canBuy(state, it.id as MaterialId, qty)
                const canBuyThis = res.ok
                const rarity = (it.rarity ?? 'common') as string
                return (
                  <div key={it.id} className="shop-row">
                    <div className="shop-row-info">
                      <span className={`shop-row-name shop-rarity-${rarity}`}>{it.name}</span>
                      <span className="shop-row-price">单价 {it.currentPrice}</span>
                      <span className="shop-row-owned">拥有 {it.owned}</span>
                    </div>
                    <div className="shop-row-actions">
                      <Button variant="ghost" size="sm" className="shop-qty-btn" onClick={() => setQty(it.id, -1)} disabled={qty <= 1}>−</Button>
                      <span className="shop-qty-value">{qty}</span>
                      <Button variant="ghost" size="sm" className="shop-qty-btn" onClick={() => setQty(it.id, 1)} disabled={qty >= 99}>+</Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => dispatch({ type: 'SHOP_BUY', itemId: it.id, qty })}
                        disabled={!canBuyThis}
                        title={!canBuyThis && res.missingGold != null ? `还差灵石×${res.missingGold}` : undefined}
                      >
                        买入
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'sell' && (
          <>
            <p className="shop-sell-hint">回收价=买价×0.8。功法、丹方残页、丹药等均可出售换取灵石。</p>
            <div className="shop-list">
              {sellableItems.length === 0 ? (
                <p className="shop-empty">背包暂无可出售的物品。</p>
              ) : (
                sellableItems.map((it: SellableItem) => {
                  const canSell1 = canSellAny(state, it.kind, it.sellableId, 1).ok
                  const canSellAll = canSellAny(state, it.kind, it.sellableId, it.owned).ok
                  const rowKey = `${it.kind}_${it.sellableId}`
                  return (
                    <div key={rowKey} className="shop-row shop-row--sell">
                      <div className="shop-row-info">
                        <span className={`shop-row-name shop-rarity-${it.rarity}`}>{it.name}</span>
                        <span className="shop-row-owned">数量 {it.owned}</span>
                        <span className="shop-row-price">回收单价 {it.unitSellPrice}</span>
                        <span className="shop-row-total">总价 {it.unitSellPrice * it.owned}</span>
                      </div>
                      <div className="shop-row-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dispatch({ type: 'SHOP_SELL', kind: it.kind, sellableId: it.sellableId, qty: 1 })}
                          disabled={!canSell1}
                        >
                          卖1
                        </Button>
                        <Button
                          variant="option-green"
                          size="sm"
                          onClick={() => dispatch({ type: 'SHOP_SELL', kind: it.kind, sellableId: it.sellableId, qty: it.owned })}
                          disabled={!canSellAll}
                        >
                          卖全部
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

        <StickyFooter
          className="shop-footer"
          hint={tab === 'mat' ? dailyHint : '出售获得灵石，回收价=买价×0.8'}
          actions={
            <>
              {tab === 'mat' && missing.length > 0 && fillPlan && fillPlan.totalCost > 0 && (
                <Button
                  variant="option-green"
                  size="md"
                  onClick={() => dispatch({ type: 'SHOP_FILL_MISSING' })}
                  title={!fillPlan.canAfford ? `可先补齐部分，还差灵石×${fillPlan.missingGold}` : undefined}
                >
                  {fillPlan.canAfford ? '按缺口补齐' : `还差灵石×${fillPlan.missingGold}`}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'alchemy' })}>
                返回炼丹
              </Button>
              <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
                返回
              </Button>
            </>
          }
        />
      </Panel>
    </div>
  )
}
