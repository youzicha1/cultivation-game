/**
 * TICKET-34: 定价规则测试 — rarity→买价、卖价=买价×0.8
 */

import { describe, expect, it } from 'vitest'
import { RARITY_BASE_PRICE, getBasePriceByRarity, type MarketRarity } from './pricing'
import { getItemCurrentPrice, getSellPrice } from '../shop'
import { createInitialGameState } from '../game'

describe('market_pricing', () => {
  it('rarity→基础买价映射正确', () => {
    expect(RARITY_BASE_PRICE.common).toBe(10)
    expect(RARITY_BASE_PRICE.uncommon).toBe(25)
    expect(RARITY_BASE_PRICE.rare).toBe(60)
    expect(RARITY_BASE_PRICE.epic).toBe(140)
    expect(RARITY_BASE_PRICE.legendary).toBe(320)
  })

  it('getBasePriceByRarity 返回对应基础价', () => {
    const rarities: MarketRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']
    for (const r of rarities) {
      expect(getBasePriceByRarity(r)).toBe(RARITY_BASE_PRICE[r])
    }
  })

  it('卖价=买价×0.8 向下取整', () => {
    const state = createInitialGameState(1)
    const buy = getItemCurrentPrice(state, 'spirit_herb')
    const sell = getSellPrice(state, 'spirit_herb')
    expect(sell).toBe(Math.floor(buy * 0.8))
  })

  it('稀有材料买价更高、卖价按 0.8 折算', () => {
    const state = createInitialGameState(1)
    const commonBuy = getItemCurrentPrice(state, 'spirit_herb')
    const epicBuy = getItemCurrentPrice(state, 'bodhi_seed')
    expect(epicBuy).toBeGreaterThan(commonBuy)
    const commonSell = getSellPrice(state, 'spirit_herb')
    const epicSell = getSellPrice(state, 'bodhi_seed')
    expect(commonSell).toBe(Math.floor(commonBuy * 0.8))
    expect(epicSell).toBe(Math.floor(epicBuy * 0.8))
  })
})
