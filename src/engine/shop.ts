/**
 * TICKET-18: 坊市/商店系统（材料买入 + 每日价格波动）
 * 纯函数：目录、价格、可买判定、购买结算。
 */

import type { GameState } from './game'
import type { MaterialId } from './alchemy'
import { getDailyModifiers } from './daily'
import type { DailyEnvironmentId } from './daily'

export type ShopCategory = 'herb' | 'dew' | 'ore' | 'beast'

export type ShopItemDef = {
  id: MaterialId
  name: string
  category: ShopCategory
  basePrice: number
}

/** 与炼丹配方材料一致，扩展可加 6~10 种 */
const SHOP_CATALOG: ShopItemDef[] = [
  { id: 'spirit_herb', name: '灵草', category: 'herb', basePrice: 8 },
  { id: 'moon_dew', name: '月华露', category: 'dew', basePrice: 12 },
  { id: 'iron_sand', name: '铁砂', category: 'ore', basePrice: 10 },
  { id: 'beast_core', name: '妖核', category: 'beast', basePrice: 15 },
]

export function getShopCatalogDef(): ShopItemDef[] {
  return [...SHOP_CATALOG]
}

/** 当前价 = ceil(basePrice * dailyMult)，dailyMult 来自今日环境 */
function getPriceMult(state: GameState, category: ShopCategory): number {
  const envId = state.meta?.daily?.environmentId as DailyEnvironmentId | undefined
  if (!envId) return 1
  const mod = getDailyModifiers(envId)
  const mult = mod.priceMultByCategory?.[category]
  return mult != null ? mult : 1
}

export type ShopCatalogItem = ShopItemDef & {
  currentPrice: number
  owned: number
}

export type ShopCatalogResult = {
  items: ShopCatalogItem[]
  dailyHint: string
}

/** 坊市目录 + 当日价格 + 拥有数量（单一来源，UI 只读此） */
export function getShopCatalog(state: GameState): ShopCatalogResult {
  const envId = state.meta?.daily?.environmentId as DailyEnvironmentId | undefined
  let dailyHint = '今日市价无特殊波动'
  if (envId) {
    const mod = getDailyModifiers(envId)
    const pm = mod.priceMultByCategory
    if (pm?.herb && pm.herb < 1) dailyHint = '木旺：草药便宜'
    else if (pm?.dew && pm.dew < 1) dailyHint = '水旺：露华便宜'
    else if (pm?.ore && pm.ore > 1) dailyHint = '金衰：矿材偏贵'
    else if (pm?.beast && pm.beast > 1) dailyHint = '煞气：妖核偏贵'
  }

  const items: ShopCatalogItem[] = SHOP_CATALOG.map((def) => {
    const mult = getPriceMult(state, def.category)
    const currentPrice = Math.max(1, Math.ceil(def.basePrice * mult))
    const owned = state.player.materials[def.id] ?? 0
    return { ...def, currentPrice, owned }
  })

  return { items, dailyHint }
}

/** 单件当前价（与 getShopCatalog 一致） */
export function getItemCurrentPrice(state: GameState, itemId: MaterialId): number {
  const def = SHOP_CATALOG.find((c) => c.id === itemId)
  if (!def) return 0
  const mult = getPriceMult(state, def.category)
  return Math.max(1, Math.ceil(def.basePrice * mult))
}

export type CanBuyResult = { ok: boolean; missingGold?: number }

/** 能否购买：金钱是否足够 */
export function canBuy(
  state: GameState,
  itemId: MaterialId,
  qty: number,
): CanBuyResult {
  if (qty <= 0) return { ok: false }
  const price = getItemCurrentPrice(state, itemId)
  const total = price * qty
  const gold = state.player.spiritStones ?? 0
  if (gold < total) return { ok: false, missingGold: total - gold }
  return { ok: true }
}

/** 购买结算（纯函数）：返回新 player 与日志，reducer 负责写入 state 和 log */
export function applyBuy(
  state: GameState,
  itemId: MaterialId,
  qty: number,
): { newPlayer: GameState['player']; cost: number; logMessage: string } | null {
  const def = SHOP_CATALOG.find((c) => c.id === itemId)
  if (!def || qty <= 0) return null
  const res = canBuy(state, itemId, qty)
  if (!res.ok) return null

  const cost = getItemCurrentPrice(state, itemId) * qty
  const newMaterials = { ...state.player.materials, [itemId]: (state.player.materials[itemId] ?? 0) + qty }
  const newPlayer: GameState['player'] = {
    ...state.player,
    spiritStones: state.player.spiritStones - cost,
    materials: newMaterials,
  }
  const logMessage = `【坊市】购入 ${def.name}×${qty}，花费灵石 ${cost}`
  return { newPlayer, cost, logMessage }
}

/** 缺口补齐：计算补齐 missing 所需总价与能买多少（按当前价） */
export type FillMissingResult = {
  totalCost: number
  canAfford: boolean
  missingGold: number
  plan: { itemId: MaterialId; name: string; need: number; cost: number; canBuyQty: number }[]
}

export function getFillMissingPlan(
  state: GameState,
  missing: { materialId: string; need: number }[],
): FillMissingResult {
  const gold = state.player.spiritStones ?? 0
  let totalCost = 0
  const plan: FillMissingResult['plan'] = []

  for (const m of missing) {
    const itemId = m.materialId as MaterialId
    const def = SHOP_CATALOG.find((c) => c.id === itemId)
    if (!def || m.need <= 0) continue
    const unitPrice = getItemCurrentPrice(state, itemId)
    const cost = unitPrice * m.need
    totalCost += cost
    const canBuyQty = unitPrice > 0 ? Math.min(m.need, Math.floor(gold / unitPrice)) : 0
    plan.push({ itemId, name: def.name, need: m.need, cost, canBuyQty })
  }

  const missingGold = Math.max(0, totalCost - gold)
  return {
    totalCost,
    canAfford: gold >= totalCost,
    missingGold,
    plan,
  }
}
