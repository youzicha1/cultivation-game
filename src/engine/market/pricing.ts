/**
 * TICKET-34: 坊市定价规则（单一真相）
 * 买价按稀有度；卖价 = 买价×0.8 向下取整
 */

export type MarketRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

/** 稀有度 → 基础买价（无每日/折扣时） */
export const RARITY_BASE_PRICE: Record<MarketRarity, number> = {
  common: 10,
  uncommon: 25,
  rare: 60,
  epic: 140,
  legendary: 320,
}

export function getBasePriceByRarity(rarity: MarketRarity): number {
  return RARITY_BASE_PRICE[rarity] ?? RARITY_BASE_PRICE.common
}
