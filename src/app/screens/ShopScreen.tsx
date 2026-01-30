import { useState } from 'react'
import type { GameAction, GameState } from '../../engine'
import {
  getShopCatalog,
  canBuy,
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

export function ShopScreen({ state, dispatch }: ScreenProps) {
  const { items, dailyHint } = getShopCatalog(state)
  const missing = state.run.shopMissing ?? []
  const fillPlan = missing.length > 0 ? getFillMissingPlan(state, missing) : null
  const [qtys, setQtys] = useState<Record<string, number>>({})

  const gold = state.player.spiritStones ?? 0

  const setQty = (itemId: string, delta: number) => {
    setQtys((prev) => {
      const cur = prev[itemId] ?? 1
      const next = Math.max(1, Math.min(99, cur + delta))
      return { ...prev, [itemId]: next }
    })
  }

  return (
    <div className="shop-page">
      <Panel title="坊市" className="shop-panel">
        {/* 顶部资源条 */}
        <header className="shop-resource-bar">
          <span className="shop-gold">灵石 {gold}</span>
          <div className="shop-mats-row">
            {items.map((it) => (
              <span key={it.id} className="shop-mat-chip">
                {it.name} {it.owned}
              </span>
            ))}
          </div>
        </header>

        {/* 商品列表（可内部滚动） */}
        <div className="shop-list">
          {items.map((it: ShopCatalogItem) => {
            const qty = qtys[it.id] ?? 1
            const res = canBuy(state, it.id as MaterialId, qty)
            const canBuyThis = res.ok
            return (
              <div key={it.id} className="shop-row">
                <div className="shop-row-info">
                  <span className="shop-row-name">{it.name}</span>
                  <span className="shop-row-price">单价 {it.currentPrice}</span>
                  <span className="shop-row-owned">拥有 {it.owned}</span>
                </div>
                <div className="shop-row-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shop-qty-btn"
                    onClick={() => setQty(it.id, -1)}
                    disabled={qty <= 1}
                  >
                    −
                  </Button>
                  <span className="shop-qty-value">{qty}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shop-qty-btn"
                    onClick={() => setQty(it.id, 1)}
                    disabled={qty >= 99}
                  >
                    +
                  </Button>
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

        <StickyFooter
          className="shop-footer"
          hint={dailyHint}
          actions={
            <>
              {missing.length > 0 && fillPlan && fillPlan.totalCost > 0 && (
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
