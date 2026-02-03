/**
 * TICKET-18/TICKET-34: 坊市/商店系统（材料买入 + 每日价格波动 + 分类/稀有度定价 + 出售回收）
 * 出售扩展：所有可获得物品可出售（材料、功法、丹方残页、丹药），回收价=基础价×0.8
 */

import type { GameState } from './game'
import type { MaterialId, ElixirQuality, RecipeId } from './alchemy'
import { getRecipe, getElixirName } from './alchemy'
import { getDailyModifiers } from './daily'
import type { DailyEnvironmentId } from './daily'
import { getBasePriceByRarity, type MarketRarity } from './market/pricing'
import { getKungfu } from './kungfu'
import type { RelicId } from './relics'

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

/** 可出售物品种类（材料 / 功法 / 丹方残页 / 丹药） */
export type SellableKind = 'material' | 'relic' | 'recipe_fragment' | 'pill'

/** 可出售单项：用于出售列表与结算，sellableId 为唯一键（material=MaterialId, relic=RelicId, recipe_fragment=recipeId_part, pill=elixirId_quality） */
export type SellableItem = {
  kind: SellableKind
  sellableId: string
  name: string
  rarity: MarketRarity
  owned: number
  unitSellPrice: number
}

const RARITY_ORDER_FOR_SORT: Record<MarketRarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
}

/** 品质→坊市稀有度（用于丹药定价） */
const QUALITY_TO_RARITY: Record<ElixirQuality, MarketRarity> = {
  fan: 'common',
  xuan: 'uncommon',
  di: 'rare',
  tian: 'legendary',
}

/** 功法稀有度→坊市稀有度（kungfu 无 uncommon） */
function kungfuRarityToMarket(r: string): MarketRarity {
  if (r === 'rare' || r === 'epic' || r === 'legendary' || r === 'uncommon') return r as MarketRarity
  return 'common'
}

/** 所有可出售物品列表（材料+功法+丹方残页+丹药），已按稀有度排序，供出售页使用 */
export function getSellableItems(state: GameState): SellableItem[] {
  const list: SellableItem[] = []
  const player = state.player

  // 材料：坊市目录中且背包数量>0
  for (const def of SHOP_CATALOG) {
    const owned = player.materials[def.id] ?? 0
    if (owned <= 0) continue
    const unitSell = getSellPriceMaterial(state, def.id)
    list.push({
      kind: 'material',
      sellableId: def.id,
      name: def.name,
      rarity: (def.rarity ?? 'common') as MarketRarity,
      owned,
      unitSellPrice: unitSell,
    })
  }

  // 功法：按 RelicId 统计数量，每个 id 一条（可多本同功法）
  const relicCounts: Record<RelicId, number> = {} as Record<RelicId, number>
  for (const rid of player.relics ?? []) {
    relicCounts[rid] = (relicCounts[rid] ?? 0) + 1
  }
  for (const [relicId, count] of Object.entries(relicCounts)) {
    if (count <= 0) continue
    const kungfu = getKungfu(relicId as RelicId)
    const rarity = kungfuRarityToMarket(kungfu?.rarity ?? 'common')
    const unitSell = Math.floor(getBasePriceByRarity(rarity) * 0.8)
    list.push({
      kind: 'relic',
      sellableId: relicId,
      name: kungfu?.name ?? relicId,
      rarity,
      owned: count,
      unitSellPrice: unitSell,
    })
  }

  // 丹方残页：上/中/下篇，每 (recipeId, part) 一条
  const parts: Array<{ part: 'upper' | 'middle' | 'lower'; key: string }> = [
    { part: 'upper', key: 'upper' },
    { part: 'middle', key: 'middle' },
    { part: 'lower', key: 'lower' },
  ]
  const fp = player.fragmentParts ?? {}
  for (const [recipeId, counts] of Object.entries(fp)) {
    const recipe = getRecipe(recipeId)
    const recipeName = recipe?.name ?? recipeId
    for (const { part, key } of parts) {
      const n = (counts as { upper?: number; middle?: number; lower?: number })[key as 'upper' | 'middle' | 'lower'] ?? 0
      if (n <= 0) continue
      const partLabel = part === 'upper' ? '上篇' : part === 'middle' ? '中篇' : '下篇'
      const sellableId = `${recipeId}_${part}`
      const rarity: MarketRarity = 'rare'
      const unitSell = Math.floor(getBasePriceByRarity(rarity) * 0.8)
      list.push({
        kind: 'recipe_fragment',
        sellableId,
        name: `《${recipeName}》·${partLabel}`,
        rarity,
        owned: n,
        unitSellPrice: unitSell,
      })
    }
  }

  // 丹药：elixirs + pillInventory 按 (elixirId, quality) 汇总
  const pillCounts: Record<string, number> = {}
  const elixirs = player.elixirs ?? {}
  for (const [elixirId, qualCounts] of Object.entries(elixirs)) {
    for (const [quality, count] of Object.entries(qualCounts as Record<ElixirQuality, number>)) {
      if (typeof count !== 'number' || count <= 0) continue
      const key = `${elixirId}_${quality}`
      pillCounts[key] = (pillCounts[key] ?? 0) + count
    }
  }
  const pillInv = player.pillInventory ?? {}
  for (const [pillId, qualCounts] of Object.entries(pillInv)) {
    for (const [quality, count] of Object.entries(qualCounts as Record<ElixirQuality, number>)) {
      if (typeof count !== 'number' || count <= 0) continue
      const key = `${pillId}_${quality}`
      pillCounts[key] = (pillCounts[key] ?? 0) + count
    }
  }
  for (const [key, count] of Object.entries(pillCounts)) {
    const lastUnderscore = key.lastIndexOf('_')
    const elixirId = lastUnderscore >= 0 ? key.slice(0, lastUnderscore) : key
    const quality = (lastUnderscore >= 0 ? key.slice(lastUnderscore + 1) : 'fan') as ElixirQuality
    const rarity = QUALITY_TO_RARITY[quality] ?? 'common'
    const unitSell = Math.floor(getBasePriceByRarity(rarity) * 0.8)
    const qualityLabel = quality === 'fan' ? '凡品' : quality === 'xuan' ? '玄品' : quality === 'di' ? '地品' : '天品'
    list.push({
      kind: 'pill',
      sellableId: key,
      name: `${getElixirName(elixirId)}·${qualityLabel}`,
      rarity,
      owned: count,
      unitSellPrice: unitSell,
    })
  }

  list.sort((a, b) => (RARITY_ORDER_FOR_SORT[b.rarity] ?? 0) - (RARITY_ORDER_FOR_SORT[a.rarity] ?? 0))
  return list
}

/** TICKET-34: 材料单件回收价 = 买价×0.8 向下取整 */
export function getSellPriceMaterial(state: GameState, itemId: MaterialId): number {
  const buy = getItemCurrentPrice(state, itemId)
  return Math.floor(buy * 0.8)
}

/** 材料回收价（兼容旧调用） */
export function getSellPrice(state: GameState, itemId: MaterialId): number {
  return getSellPriceMaterial(state, itemId)
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

/** 能否出售：按种类与 sellableId 检查数量 */
export function canSellAny(
  state: GameState,
  kind: SellableKind,
  sellableId: string,
  qty: number,
): { ok: boolean; owned?: number } {
  if (qty <= 0) return { ok: false }
  const list = getSellableItems(state)
  const item = list.find((s) => s.kind === kind && s.sellableId === sellableId)
  if (!item || item.owned < qty) return { ok: false, owned: item?.owned ?? 0 }
  return { ok: true, owned: item.owned }
}

/** TICKET-34: 能否出售材料（兼容旧调用） */
export function canSell(
  state: GameState,
  itemId: MaterialId,
  qty: number,
): { ok: boolean; owned?: number } {
  return canSellAny(state, 'material', itemId, qty)
}

/** 出售结算（任意种类）：扣减数量、增加灵石，返回新 player 与日志 */
export function applySellAny(
  state: GameState,
  kind: SellableKind,
  sellableId: string,
  qty: number,
): { newPlayer: GameState['player']; earned: number; logMessage: string } | null {
  const res = canSellAny(state, kind, sellableId, qty)
  if (!res.ok || qty <= 0) return null
  const list = getSellableItems(state)
  const item = list.find((s) => s.kind === kind && s.sellableId === sellableId)
  if (!item) return null
  const earned = item.unitSellPrice * qty
  const player = state.player

  if (kind === 'material') {
    const cur = player.materials[sellableId as MaterialId] ?? 0
    const newMaterials = { ...player.materials, [sellableId]: cur - qty }
    if (newMaterials[sellableId as MaterialId] <= 0) delete newMaterials[sellableId as MaterialId]
    return {
      newPlayer: { ...player, spiritStones: (player.spiritStones ?? 0) + earned, materials: newMaterials },
      earned,
      logMessage: `【坊市】出售 ${item.name}×${qty}，获得灵石 ${earned}`,
    }
  }

  if (kind === 'relic') {
    const relicId = sellableId as RelicId
    const arr = [...(player.relics ?? [])]
    let left = qty
    for (let i = arr.length - 1; i >= 0 && left > 0; i--) {
      if (arr[i] === relicId) {
        arr.splice(i, 1)
        left--
      }
    }
    return {
      newPlayer: { ...player, relics: arr, spiritStones: (player.spiritStones ?? 0) + earned },
      earned,
      logMessage: `【坊市】出售 ${item.name}×${qty}，获得灵石 ${earned}`,
    }
  }

  if (kind === 'recipe_fragment') {
    const [recipeId, part] = sellableId.split('_') as [RecipeId, 'upper' | 'middle' | 'lower']
    const fp = { ...(player.fragmentParts ?? {}) }
    const cur = fp[recipeId] ?? { upper: 0, middle: 0, lower: 0 }
    const nextCur = { ...cur, [part]: Math.max(0, (cur[part] ?? 0) - qty) }
    fp[recipeId] = nextCur
    return {
      newPlayer: { ...player, fragmentParts: fp, spiritStones: (player.spiritStones ?? 0) + earned },
      earned,
      logMessage: `【坊市】出售 ${item.name}×${qty}，获得灵石 ${earned}`,
    }
  }

  if (kind === 'pill') {
    const lastUnderscore = sellableId.lastIndexOf('_')
    const elixirId = lastUnderscore >= 0 ? sellableId.slice(0, lastUnderscore) : sellableId
    const quality = (lastUnderscore >= 0 ? sellableId.slice(lastUnderscore + 1) : 'fan') as ElixirQuality
    let left = qty
    const nextElixirs = { ...player.elixirs } as Record<string, Record<ElixirQuality, number>>
    const elixirQual = nextElixirs[elixirId] ?? { fan: 0, xuan: 0, di: 0, tian: 0 }
    const fromElixirs = Math.min(left, elixirQual[quality] ?? 0)
    if (fromElixirs > 0) {
      nextElixirs[elixirId] = { ...elixirQual, [quality]: (elixirQual[quality] ?? 0) - fromElixirs }
      left -= fromElixirs
    }
    let nextPillInv = player.pillInventory ? { ...player.pillInventory } : {}
    if (left > 0 && nextPillInv[elixirId]) {
      const invQual = nextPillInv[elixirId] as Record<ElixirQuality, number>
      const fromInv = Math.min(left, invQual[quality] ?? 0)
      if (fromInv > 0) {
        nextPillInv = { ...nextPillInv, [elixirId]: { ...invQual, [quality]: (invQual[quality] ?? 0) - fromInv } }
        left -= fromInv
      }
    }
    return {
      newPlayer: { ...player, elixirs: nextElixirs, pillInventory: nextPillInv, spiritStones: (player.spiritStones ?? 0) + earned },
      earned,
      logMessage: `【坊市】出售 ${item.name}×${qty}，获得灵石 ${earned}`,
    }
  }

  return null
}

/** TICKET-34: 出售材料结算（兼容旧调用） */
export function applySell(
  state: GameState,
  itemId: MaterialId,
  qty: number,
): { newPlayer: GameState['player']; earned: number; logMessage: string } | null {
  return applySellAny(state, 'material', itemId, qty)
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
