/**
 * TICKET-18/TICKET-34: 坊市/商店系统（材料买入 + 每日价格波动 + 分类/稀有度定价 + 出售回收）
 */

import type { GameState } from './game'
import type { MaterialId } from './alchemy'
import { getDailyModifiers } from './daily'
import type { DailyEnvironmentId } from './daily'
import { getBasePriceByRarity, type MarketRarity } from './market/pricing'

export type ShopCategory = 'herb' | 'dew' | 'ore' | 'beast'

/** 坊市一级品类：购买/出售界面按此切换列表，后续可扩展 */
export type ShopSection = 'alchemy_materials' | 'consumables' | 'kungfu_fragments'

export const SHOP_SECTION_LABELS: Record<ShopSection, string> = {
  alchemy_materials: '炼丹材料',
  consumables: '消耗品',
  kungfu_fragments: '功法碎片',
}

export type ShopItemDef = {
  id: MaterialId
  name: string
  category: ShopCategory
  /** 一级品类，用于购买/出售分栏 */
  section: ShopSection
  /** TICKET-34: 稀有度，用于定价与筛选；未设则按 common */
  rarity?: MarketRarity
  /** 基础买价；未设则用 rarity 表 */
  basePrice?: number
}

/** TICKET-34: 全材料坊市目录（补齐获取途径），按稀有度定价。丹方残页（上/中/下篇）不可在此出售。 */
const SHOP_CATALOG: ShopItemDef[] = [
  { id: 'spirit_herb', name: '灵草', category: 'herb', section: 'alchemy_materials', rarity: 'common', basePrice: 8 },
  { id: 'moon_dew', name: '月华露', category: 'dew', section: 'alchemy_materials', rarity: 'common', basePrice: 12 },
  { id: 'iron_sand', name: '铁砂', category: 'ore', section: 'alchemy_materials', rarity: 'common', basePrice: 10 },
  { id: 'beast_core', name: '妖核', category: 'beast', section: 'alchemy_materials', rarity: 'common', basePrice: 15 },
  { id: 'purple_leaf', name: '紫灵叶', category: 'herb', section: 'alchemy_materials', rarity: 'uncommon' },
  { id: 'blood_lotus', name: '血莲精', category: 'dew', section: 'alchemy_materials', rarity: 'uncommon' },
  { id: 'green_vine', name: '青木藤', category: 'herb', section: 'alchemy_materials', rarity: 'uncommon' },
  { id: 'ice_fruit', name: '冰灵果', category: 'dew', section: 'alchemy_materials', rarity: 'uncommon' },
  { id: 'fire_grass', name: '火阳芝', category: 'herb', section: 'alchemy_materials', rarity: 'rare' },
  { id: 'dragon_root', name: '龙须根', category: 'ore', section: 'alchemy_materials', rarity: 'rare' },
  { id: 'yellow_essence', name: '千年黄精', category: 'herb', section: 'alchemy_materials', rarity: 'rare' },
  { id: 'earth_milk', name: '地心乳', category: 'ore', section: 'alchemy_materials', rarity: 'rare' },
  { id: 'snake_saliva', name: '蛇涎果', category: 'beast', section: 'alchemy_materials', rarity: 'epic' },
  { id: 'demon_core', name: '魔核', category: 'beast', section: 'alchemy_materials', rarity: 'epic' },
  { id: 'soul_infant', name: '魂婴果', category: 'dew', section: 'alchemy_materials', rarity: 'epic' },
  { id: 'bodhi_seed', name: '菩提子', category: 'herb', section: 'alchemy_materials', rarity: 'epic' },
  // 奇遇链专属材料（epic，可买卖）
  { id: 'leize_marrow', name: '雷泽灵髓', category: 'ore', section: 'alchemy_materials', rarity: 'epic' },
  { id: 'meteor_iron', name: '天外陨铁', category: 'ore', section: 'alchemy_materials', rarity: 'epic' },
  { id: 'nine_turn_vine', name: '九转玄藤', category: 'herb', section: 'alchemy_materials', rarity: 'epic' },
  { id: 'furnace_jade', name: '炉心碎玉', category: 'ore', section: 'alchemy_materials', rarity: 'epic' },
  { id: 'fate_stone', name: '命纹石', category: 'ore', section: 'alchemy_materials', rarity: 'epic' },
  { id: 'purple_sand', name: '紫府灵砂', category: 'ore', section: 'alchemy_materials', rarity: 'epic' },
]

export function getShopCatalogDef(): ShopItemDef[] {
  return [...SHOP_CATALOG]
}

/** 当前有商品的品类列表（用于购买/出售分栏，只显示有货的品类） */
export function getShopSectionsWithItems(): ShopSection[] {
  const set = new Set<ShopSection>()
  for (const def of SHOP_CATALOG) {
    set.add(def.section)
  }
  const order: ShopSection[] = ['alchemy_materials', 'consumables', 'kungfu_fragments']
  return order.filter((s) => set.has(s))
}

/** 当前价 = ceil(basePrice * dailyMult * (1 - shopDiscount/100))，dailyMult 来自今日环境，TICKET-21 奇遇链终章可带坊市折扣 */
function getPriceMult(state: GameState, category: ShopCategory): number {
  const envId = state.meta?.daily?.environmentId as DailyEnvironmentId | undefined
  let mult = 1
  if (envId) {
    const mod = getDailyModifiers(envId)
    mult = mod.priceMultByCategory?.[category] ?? 1
  }
  const discount = state.run.shopDiscountPercent ?? 0
  return mult * Math.max(0, 1 - discount / 100)
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
    const base = def.basePrice ?? getBasePriceByRarity(def.rarity ?? 'common')
    const mult = getPriceMult(state, def.category)
    const currentPrice = Math.max(1, Math.ceil(base * mult))
    const owned = state.player.materials[def.id] ?? 0
    return { ...def, currentPrice, owned }
  })

  return { items, dailyHint }
}

/** 单件当前买价（与 getShopCatalog 一致） */
export function getItemCurrentPrice(state: GameState, itemId: MaterialId): number {
  const def = SHOP_CATALOG.find((c) => c.id === itemId)
  if (!def) return 0
  const base = def.basePrice ?? getBasePriceByRarity(def.rarity ?? 'common')
  const mult = getPriceMult(state, def.category)
  return Math.max(1, Math.ceil(base * mult))
}

/** TICKET-34: 单件回收价 = 买价×0.8 向下取整 */
export function getSellPrice(state: GameState, itemId: MaterialId): number {
  const buy = getItemCurrentPrice(state, itemId)
  return Math.floor(buy * 0.8)
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

/** TICKET-34: 能否出售：物品在坊市目录且背包数量足够 */
export function canSell(
  state: GameState,
  itemId: MaterialId,
  qty: number,
): { ok: boolean; owned?: number } {
  const def = SHOP_CATALOG.find((c) => c.id === itemId)
  if (!def || qty <= 0) return { ok: false }
  const owned = state.player.materials[itemId] ?? 0
  if (owned < qty) return { ok: false, owned }
  return { ok: true, owned }
}

/** TICKET-34: 出售结算（回收价=买价×0.8，数量扣减、灵石增加） */
export function applySell(
  state: GameState,
  itemId: MaterialId,
  qty: number,
): { newPlayer: GameState['player']; earned: number; logMessage: string } | null {
  const def = SHOP_CATALOG.find((c) => c.id === itemId)
  if (!def || qty <= 0) return null
  const res = canSell(state, itemId, qty)
  if (!res.ok) return null
  const unitSell = getSellPrice(state, itemId)
  const earned = unitSell * qty
  const cur = state.player.materials[itemId] ?? 0
  const newMaterials = { ...state.player.materials, [itemId]: cur - qty }
  if (newMaterials[itemId] <= 0) delete newMaterials[itemId]
  const newPlayer: GameState['player'] = {
    ...state.player,
    spiritStones: (state.player.spiritStones ?? 0) + earned,
    materials: newMaterials,
  }
  const logMessage = `【坊市】出售 ${def.name}×${qty}，获得灵石 ${earned}（回收价=买价×0.8）`
  return { newPlayer, earned, logMessage }
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
