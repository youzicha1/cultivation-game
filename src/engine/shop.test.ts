import { describe, expect, it } from 'vitest'
import {
  getShopCatalog,
  getShopCatalogDef,
  canBuy,
  applyBuy,
  canSell,
  applySell,
  getSellPrice,
  getItemCurrentPrice,
  getFillMissingPlan,
} from './shop'
import { createInitialGameState } from './game'
describe('shop', () => {
  it('TICKET-34: 目录返回全材料且含 section/category/稀有度或 basePrice', () => {
    const catalog = getShopCatalogDef()
    expect(catalog.length).toBe(22)
    expect(catalog.every((c) => c.id && c.name && c.category && c.section && (c.basePrice != null ? c.basePrice > 0 : true) && (c.rarity != null || c.basePrice != null))).toBe(true)
  })

  it('价格受 daily 影响：有 daily 时 dailyHint 与 currentPrice 存在', () => {
    const base = createInitialGameState(1)
    const noDaily = getShopCatalog(base)
    expect(noDaily.items.length).toBe(22)
    const withAlchemyDay = {
      ...base,
      meta: { ...base.meta, daily: { dayKey: '2025-01-01', environmentId: 'alchemy_day', mission: { type: 'brew_success', target: 1, progress: 0, claimed: false } } },
    }
    const catalogAlchemy = getShopCatalog(withAlchemyDay)
    const herb = catalogAlchemy.items.find((i) => i.id === 'spirit_herb')
    expect(herb).toBeDefined()
    expect(herb!.currentPrice).toBeGreaterThanOrEqual(1)
    expect(herb!.currentPrice).toBeLessThanOrEqual((herb!.basePrice ?? 20) * 2)
    expect(catalogAlchemy.dailyHint).toBeTruthy()
  })

  it('买入扣 gold、加材料、返回 log', () => {
    const state = createInitialGameState(1)
    const withGold = {
      ...state,
      player: { ...state.player, spiritStones: 100, materials: { ...state.player.materials, spirit_herb: 0 } },
    }
    const result = applyBuy(withGold, 'spirit_herb', 2)
    expect(result).not.toBeNull()
    expect(result!.newPlayer.spiritStones).toBe(100 - result!.cost)
    expect(result!.newPlayer.materials.spirit_herb).toBe(2)
    expect(result!.logMessage).toContain('灵草')
    expect(result!.logMessage).toContain('2')
  })

  it('金钱不足不可买：ok=false，applyBuy 返回 null', () => {
    const state = createInitialGameState(1)
    const noGold = { ...state, player: { ...state.player, spiritStones: 0 } }
    const res = canBuy(noGold, 'spirit_herb', 1)
    expect(res.ok).toBe(false)
    expect(res.missingGold).toBeGreaterThan(0)
    const apply = applyBuy(noGold, 'spirit_herb', 1)
    expect(apply).toBeNull()
  })

  it('购买数量边界：qty 1 可买，qty 0 不可买', () => {
    const state = createInitialGameState(1)
    const withGold = { ...state, player: { ...state.player, spiritStones: 1000 } }
    expect(canBuy(withGold, 'spirit_herb', 1).ok).toBe(true)
    expect(canBuy(withGold, 'spirit_herb', 0).ok).toBe(false)
    const apply0 = applyBuy(withGold, 'spirit_herb', 0)
    expect(apply0).toBeNull()
  })

  it('getFillMissingPlan 计算总价与 missingGold', () => {
    const state = createInitialGameState(1)
    const withGold = { ...state, player: { ...state.player, spiritStones: 50 } }
    const plan = getFillMissingPlan(withGold, [
      { materialId: 'spirit_herb', need: 5 },
      { materialId: 'moon_dew', need: 2 },
    ])
    expect(plan.plan.length).toBe(2)
    expect(plan.totalCost).toBeGreaterThan(0)
    expect(plan.missingGold).toBe(Math.max(0, plan.totalCost - 50))
  })

  it('TICKET-34: 出售：物品减少、钱增加、卖价=买价×0.8', () => {
    const state = createInitialGameState(1)
    const withMats = {
      ...state,
      player: {
        ...state.player,
        spiritStones: 50,
        materials: { ...state.player.materials, spirit_herb: 5 },
      },
    }
    const sellPrice = getSellPrice(withMats, 'spirit_herb')
    const res = applySell(withMats, 'spirit_herb', 2)
    expect(res).not.toBeNull()
    expect(res!.newPlayer.materials.spirit_herb).toBe(3)
    expect(res!.newPlayer.spiritStones).toBe(50 + sellPrice * 2)
    expect(res!.earned).toBe(sellPrice * 2)
    expect(sellPrice).toBe(Math.floor(getItemCurrentPrice(withMats, 'spirit_herb') * 0.8))
  })

  it('TICKET-34: 卖全部：数量清零', () => {
    const state = createInitialGameState(1)
    const withMats = {
      ...state,
      player: {
        ...state.player,
        spiritStones: 0,
        materials: { ...state.player.materials, moon_dew: 3 },
      },
    }
    const res = applySell(withMats, 'moon_dew', 3)
    expect(res).not.toBeNull()
    expect(res!.newPlayer.materials.moon_dew).toBeUndefined()
    expect(res!.newPlayer.spiritStones).toBeGreaterThan(0)
  })

  it('TICKET-34: 数量不足或非坊市物品不可卖', () => {
    const state = createInitialGameState(1)
    expect(canSell(state, 'spirit_herb', 1).ok).toBe(false)
    const withOne = { ...state, player: { ...state.player, materials: { ...state.player.materials, spirit_herb: 1 } } }
    expect(canSell(withOne, 'spirit_herb', 2).ok).toBe(false)
    expect(applySell(withOne, 'spirit_herb', 2)).toBeNull()
  })
})
