/**
 * 坊市奇人交易：随机时间出现，以物易物（同类型稀有物品交换）。
 * - 奇人每天出现 2～3 次（按游戏时辰窗触发）；出现后持续**真实 2 小时**即消失。
 * - 交易类型：稀有丹方残页 / 稀有材料 / 高级功法；只能同类型交换，不可用灵石购买。
 */

import type { PlayerState } from './state'
import type { RelicId } from './relics'

/** 一天内的时辰数（用于计算当日第几次出现） */
export const STRANGER_DAY_LENGTH = 12

/** 奇人单次出现持续时辰数（仅用于时间窗长度，实际存在时长用 STRANGER_DURATION_MS） */
export const STRANGER_WINDOW_DURATION = 2

/** 奇人出现后持续时长：真实时间 2 小时（毫秒） */
export const STRANGER_DURATION_MS = 2 * 60 * 60 * 1000

/** 奇人是否已过期（出现后超过 2 小时） */
export function isTraderExpired(appearedAt: number, nowMs?: number): boolean {
  const now = nowMs ?? (typeof Date.now === 'function' ? Date.now() : 0)
  return now - appearedAt >= STRANGER_DURATION_MS
}

/** 奇人单日出现次数：最少 ~ 最多 */
export const STRANGER_APPEARANCES_PER_DAY_MIN = 2
export const STRANGER_APPEARANCES_PER_DAY_MAX = 3

/** 奇人交易物类型 */
export type TraderOfferKind = 'recipe_fragment' | 'rare_material' | 'kungfu'

/** 奇人提供的物品（玩家可换取的） */
export type TraderOffer =
  | { kind: 'recipe_fragment'; recipeId: string; part: 'upper' | 'middle' | 'lower' }
  | { kind: 'rare_material'; materialId: string }
  | { kind: 'kungfu'; kungfuId: string }

/** 玩家用于交换的物品（与 TraderOffer 同类型） */
export type PlayerGive =
  | { kind: 'recipe_fragment'; recipeId: string; part: 'upper' | 'middle' | 'lower' }
  | { kind: 'rare_material'; materialId: string }
  | { kind: 'kungfu'; kungfuId: string }

/** 奇人出现时间窗口：第 day 天的 [start, end) 时辰（start/end 为 0..DAY_LENGTH-1） */
export type TraderScheduleEntry = { day: number; start: number; end: number }

/** 生成奇人时间表时用到的池子（由外部从 alchemy/shop/kungfu 汇总，避免循环依赖） */
export type TraderPools = {
  /** 稀有丹方 ID 列表（地/天品残页丹方） */
  rareRecipeIds: string[]
  /** 稀有材料 ID 列表（如 epic 材料） */
  rareMaterialIds: string[]
  /** 高级功法 ID 列表（rare/epic/legendary） */
  highRarityKungfuIds: string[]
}

/** 根据当前时辰计算「第几天」与「当天内偏移」（0..DAY_LENGTH-1） */
export function getCurrentDayAndOffset(timeMax: number, timeLeft: number): { day: number; offset: number } {
  const consumed = Math.max(0, (timeMax || 0) - (timeLeft ?? 0))
  const day = Math.floor(consumed / STRANGER_DAY_LENGTH)
  const offset = consumed % STRANGER_DAY_LENGTH
  return { day, offset }
}

/** 判断当前是否处于某个时间窗口内 */
export function isInTraderWindow(entry: TraderScheduleEntry, day: number, offset: number): boolean {
  return entry.day === day && offset >= entry.start && offset < entry.end
}

/** 当前时刻奇人是否可见（在时间表某一窗口内） */
export function isTraderVisible(
  schedule: TraderScheduleEntry[],
  timeMax: number,
  timeLeft: number,
): boolean {
  const { day, offset } = getCurrentDayAndOffset(timeMax, timeLeft)
  return schedule.some((e) => isInTraderWindow(e, day, offset))
}

/** 获取当前时刻对应的奇人时间窗口（若有） */
export function getTraderWindow(
  schedule: TraderScheduleEntry[],
  timeMax: number,
  timeLeft: number,
): TraderScheduleEntry | undefined {
  const { day, offset } = getCurrentDayAndOffset(timeMax, timeLeft)
  return schedule.find((e) => isInTraderWindow(e, day, offset))
}

/** 一天内可选的窗口起始时辰（每段 2 时辰，不重叠）：0,2,4,6,8,10 */
const POSSIBLE_STARTS = [0, 2, 4, 6, 8, 10]

/** 生成奇人出现时间表：maxDays 天内，每天 2～3 次，每次 2 时辰，窗口不重叠 */
export function generateTraderSchedule(
  randInt: (min: number, max: number) => number,
  maxDays: number,
): TraderScheduleEntry[] {
  const entries: TraderScheduleEntry[] = []
  for (let day = 0; day < maxDays; day++) {
    const count = randInt(STRANGER_APPEARANCES_PER_DAY_MIN, STRANGER_APPEARANCES_PER_DAY_MAX)
    const starts = [...POSSIBLE_STARTS]
    for (let i = 0; i < starts.length && entries.filter((e) => e.day === day).length < count; i++) {
      const idx = randInt(i, starts.length - 1)
      ;[starts[i], starts[idx]] = [starts[idx], starts[i]]
    }
    const chosen = starts.slice(0, count)
    for (const start of chosen) {
      entries.push({ day, start, end: start + STRANGER_WINDOW_DURATION })
    }
  }
  return entries
}

/** 从数组中随机取一个 */
function pickOne<T>(arr: T[], randInt: (min: number, max: number) => number): T | undefined {
  if (arr.length === 0) return undefined
  return arr[randInt(0, arr.length - 1)]
}

/** 生成奇人本窗格提供的交易物（同类型换同类型，种类随机或由池子决定） */
export function generateTraderOffer(
  randInt: (min: number, max: number) => number,
  pools: TraderPools,
): TraderOffer | null {
  const kinds: TraderOfferKind[] = ['recipe_fragment', 'rare_material', 'kungfu']
  const kind = kinds[randInt(0, kinds.length - 1)]
  if (kind === 'recipe_fragment') {
    const recipeId = pickOne(pools.rareRecipeIds, randInt)
    if (!recipeId) return null
    const part = (['upper', 'middle', 'lower'] as const)[randInt(0, 2)]
    return { kind: 'recipe_fragment', recipeId, part }
  }
  if (kind === 'rare_material') {
    const materialId = pickOne(pools.rareMaterialIds, randInt)
    if (!materialId) return null
    return { kind: 'rare_material', materialId }
  }
  const kungfuId = pickOne(pools.highRarityKungfuIds, randInt)
  if (!kungfuId) return null
  return { kind: 'kungfu', kungfuId }
}

/** 判断玩家给出的物品是否与奇人提供物同类型 */
export function isSameKind(offer: TraderOffer, give: PlayerGive): boolean {
  return offer.kind === give.kind
}

/** 判断玩家是否拥有用于交换的「给出物」且可交换（同类型） */
export function canTrade(player: PlayerState, offer: TraderOffer, give: PlayerGive): boolean {
  if (!isSameKind(offer, give)) return false
  if (give.kind === 'recipe_fragment') {
    const parts = player.fragmentParts?.[give.recipeId] ?? { upper: 0, middle: 0, lower: 0 }
    return (parts[give.part] ?? 0) >= 1
  }
  if (give.kind === 'rare_material') {
    return (player.materials?.[give.materialId] ?? 0) >= 1
  }
  const id = give.kungfuId as RelicId
  return (player.relics ?? []).includes(id)
}

/** 玩家当前可用来交换的「同类型」物品列表（用于 UI 展示与选择） */
export function getPlayerTradeOptions(player: PlayerState, offer: TraderOffer): PlayerGive[] {
  const out: PlayerGive[] = []
  if (offer.kind === 'recipe_fragment') {
    const parts = player.fragmentParts ?? {}
    for (const recipeId of Object.keys(parts)) {
      const c = parts[recipeId] ?? { upper: 0, middle: 0, lower: 0 }
      for (const part of ['upper', 'middle', 'lower'] as const) {
        if ((c[part] ?? 0) >= 1) out.push({ kind: 'recipe_fragment', recipeId, part })
      }
    }
    return out
  }
  if (offer.kind === 'rare_material') {
    const mat = player.materials ?? {}
    for (const [materialId, qty] of Object.entries(mat)) {
      if ((qty ?? 0) >= 1) out.push({ kind: 'rare_material', materialId })
    }
    return out
  }
  for (const kungfuId of player.relics ?? []) {
    out.push({ kind: 'kungfu', kungfuId })
  }
  return out
}

/** 执行交换：从玩家扣除 give，增加 offer。返回新 player，不修改原对象。 */
export function applyTrade(player: PlayerState, offer: TraderOffer, give: PlayerGive): PlayerState {
  if (!canTrade(player, offer, give)) return player

  const next = { ...player }

  if (give.kind === 'recipe_fragment') {
    const fp = { ...(next.fragmentParts ?? {}) }
    const key = give.recipeId
    fp[key] = { ...(fp[key] ?? { upper: 0, middle: 0, lower: 0 }) }
    fp[key][give.part] = Math.max(0, (fp[key][give.part] ?? 0) - 1)
    next.fragmentParts = fp
  } else if (give.kind === 'rare_material') {
    const mat = { ...(next.materials ?? {}) }
    mat[give.materialId] = Math.max(0, (mat[give.materialId] ?? 0) - 1)
    next.materials = mat
  } else {
    next.relics = (next.relics ?? []).filter((id) => id !== give.kungfuId)
  }

  if (offer.kind === 'recipe_fragment') {
    const fp = { ...(next.fragmentParts ?? {}) }
    const key = offer.recipeId
    fp[key] = { ...(fp[key] ?? { upper: 0, middle: 0, lower: 0 }) }
    fp[key][offer.part] = (fp[key][offer.part] ?? 0) + 1
    next.fragmentParts = fp
  } else if (offer.kind === 'rare_material') {
    const mat = { ...(next.materials ?? {}) }
    mat[offer.materialId] = (mat[offer.materialId] ?? 0) + 1
    next.materials = mat
  } else {
    next.relics = [...(next.relics ?? []), offer.kungfuId as RelicId]
  }

  return next
}
