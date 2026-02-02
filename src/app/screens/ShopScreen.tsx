import { useState, useMemo } from 'react'
import type { GameAction, GameState } from '../../engine'
import {
  getShopCatalog,
  canBuy,
  canSell,
  getSellPrice,
  getFillMissingPlan,
  type ShopCatalogItem,
} from '../../engine/shop'
import type { MaterialId } from '../../engine/alchemy'
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

export function ShopScreen({ state, dispatch }: ScreenProps) {
  const { items, dailyHint } = getShopCatalog(state)
  const missing = state.run.shopMissing ?? []
  const fillPlan = missing.length > 0 ? getFillMissingPlan(state, missing) : null
  const [tab, setTab] = useState<TabId>('mat')
  const [qtys, setQtys] = useState<Record<string, number>>({})
  const [sortBy, setSortBy] = useState<'price' | 'rarity'>('price')
  const [filterAfford, setFilterAfford] = useState(false)

  const gold = state.player.spiritStones ?? 0

  const setQty = (itemId: string, delta: number) => {
    setQtys((prev) => {
      const cur = prev[itemId] ?? 1
      const next = Math.max(1, Math.min(99, cur + delta))
      return { ...prev, [itemId]: next }
    })
  }

  const buyItems = useMemo(() => {
    let list = [...items]
    if (filterAfford) {
      list = list.filter((it) => canBuy(state, it.id as MaterialId, 1).ok)
    }
    if (sortBy === 'price') {
      list.sort((a, b) => a.currentPrice - b.currentPrice)
    } else {
      list.sort((a, b) => (RARITY_ORDER[a.rarity ?? 'common'] ?? 0) - (RARITY_ORDER[b.rarity ?? 'common'] ?? 0))
    }
    return list
  }, [items, state, sortBy, filterAfford])

  const sellableItems = useMemo(() => {
    return items.filter((it) => (state.player.materials[it.id] ?? 0) > 0)
  }, [items, state.player.materials])

  return (
    <div className="shop-page">
      <Panel title="坊市" className="shop-panel">
        <header className="shop-resource-bar">
          <span className="shop-gold">灵石 {gold}</span>
        </header>

        {/* TICKET-34: 分类 Tab */}
        <div className="shop-tabs">
          <Button
            variant={tab === 'mat' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setTab('mat')}
          >
            炼丹材料
          </Button>
          <Button
            variant={tab === 'sell' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setTab('sell')}
          >
            出售
          </Button>
        </div>

        {tab === 'mat' && (
          <>
            <div className="shop-filters">
              <span className="shop-filter-label">排序：</span>
              <Button
                variant="ghost"
                size="sm"
                className={sortBy === 'price' ? 'shop-filter-btn--on' : ''}
                onClick={() => setSortBy('price')}
              >
                价格
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={sortBy === 'rarity' ? 'shop-filter-btn--on' : ''}
                onClick={() => setSortBy('rarity')}
              >
                稀有度
              </Button>
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
              {buyItems.map((it: ShopCatalogItem) => {
                const qty = qtys[it.id] ?? 1
                const res = canBuy(state, it.id as MaterialId, qty)
                const canBuyThis = res.ok
                return (
                  <div key={it.id} className="shop-row">
                    <div className="shop-row-info">
                      <span className="shop-row-name">{it.name}</span>
                      {it.rarity && <span className="shop-row-rarity">{it.rarity}</span>}
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
            <p className="shop-sell-hint">回收价=买价×0.8。卖出后获得灵石，可换购更稀有材料。</p>
            <div className="shop-list">
              {sellableItems.length === 0 ? (
                <p className="shop-empty">背包中暂无可出售的坊市材料。</p>
              ) : (
                sellableItems.map((it: ShopCatalogItem) => {
                  const owned = state.player.materials[it.id] ?? 0
                  const unitSell = getSellPrice(state, it.id as MaterialId)
                  const canSell1 = canSell(state, it.id as MaterialId, 1).ok
                  const canSellAll = canSell(state, it.id as MaterialId, owned).ok
                  return (
                    <div key={it.id} className="shop-row shop-row--sell">
                      <div className="shop-row-info">
                        <span className="shop-row-name">{it.name}</span>
                        <span className="shop-row-owned">数量 {owned}</span>
                        <span className="shop-row-price">回收单价 {unitSell}</span>
                        <span className="shop-row-total">总价 {unitSell * owned}</span>
                      </div>
                      <div className="shop-row-actions">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dispatch({ type: 'SHOP_SELL', itemId: it.id, qty: 1 })}
                          disabled={!canSell1}
                        >
                          卖1
                        </Button>
                        <Button
                          variant="option-green"
                          size="sm"
                          onClick={() => dispatch({ type: 'SHOP_SELL', itemId: it.id, qty: owned })}
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
