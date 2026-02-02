/**
 * TICKET-13: 软保底体系（pity counters + weight modifiers）
 * - 炼丹天品/地品保底、探索传奇掉落保底、功法传奇保底
 * - 纯函数，单一来源，便于测试
 */

import type { ElixirQuality } from './alchemy'
import type { LootRarity } from './loot'

/** 保底阈值参数表（MVP） */
export const PITY_ALCHEMY_THRESHOLD = 6   // 达到后对下一炉品质施加向地/天偏移
export const PITY_ALCHEMY_HARD = 10      // 达到后下一炉至少出地品
export const PITY_LEGEND_LOOT_THRESHOLD = 12  // 达到后传奇权重提升
export const PITY_LEGEND_LOOT_HARD = 12   // 达到后下一次宝箱必出传奇（满 12/12 即触发）
export const PITY_LEGEND_KUNGFU_THRESHOLD = 10 // 达到后传奇功法权重提升

/** 碎片兑换消耗 */
export const SHARD_COST_RARE = 30
export const SHARD_COST_EPIC = 60
export const SHARD_COST_LEGENDARY = 100

/** 临时调试：为 true 时 UI 显示当前保底数值，默认关闭 */
export const PITY_DEBUG_SHOW_VALUES = false

export type PityMeta = {
  pityAlchemyTop?: number
  pityLegendLoot?: number
  pityLegendKungfa?: number
  kungfaShards?: number
}

/** 炼丹：本次最高品质 < 地 则 pity++，>= 地 则 pity=0 */
export function updatePityAfterAlchemy(
  topQuality: ElixirQuality | 'none' | undefined,
  meta: PityMeta,
): PityMeta {
  const current = meta.pityAlchemyTop ?? 0
  const diIdx = ['fan', 'xuan', 'di', 'tian'].indexOf('di')
  const qualityIdx = topQuality && topQuality !== 'none' ? ['fan', 'xuan', 'di', 'tian'].indexOf(topQuality) : -1
  const isAtLeastDi = qualityIdx >= diIdx
  return {
    ...meta,
    pityAlchemyTop: isAtLeastDi ? 0 : current + 1,
  }
}

/** 炼丹：根据 pity 计算品质偏移（向地/天） */
export function getAlchemyPityQualityShift(meta: PityMeta): number {
  const pity = meta.pityAlchemyTop ?? 0
  if (pity >= PITY_ALCHEMY_HARD) return 0.35
  if (pity >= PITY_ALCHEMY_THRESHOLD) return 0.2
  return 0
}

/** 炼丹：是否应强制至少出地品（pity>=HARD 时下一炉） */
export function shouldForceAlchemyAtLeastDi(meta: PityMeta): boolean {
  return (meta.pityAlchemyTop ?? 0) >= PITY_ALCHEMY_HARD
}

/** 探索/宝箱：本次有传奇则 pity=0，否则 pity++ */
export function updatePityAfterLoot(
  hadLegendary: boolean,
  meta: PityMeta,
): PityMeta {
  const current = meta.pityLegendLoot ?? 0
  return {
    ...meta,
    pityLegendLoot: hadLegendary ? 0 : current + 1,
  }
}

/** 探索：传奇权重乘数（pity>=THRESHOLD 时提升，>=HARD 时极大） */
export function getLegendLootWeightMul(meta: PityMeta): number {
  const pity = meta.pityLegendLoot ?? 0
  if (pity >= PITY_LEGEND_LOOT_HARD) return 50
  if (pity >= PITY_LEGEND_LOOT_THRESHOLD) return 2.0
  return 1.0
}

/** 探索：是否应强制下一次出传奇（仅当 danger 允许 legendary 时有效） */
export function shouldForceLegendLoot(meta: PityMeta): boolean {
  return (meta.pityLegendLoot ?? 0) >= PITY_LEGEND_LOOT_HARD
}

/** 功法掉落：出传奇功法 pity=0，否则 pity++ */
export function updatePityAfterKungfuDrop(
  rarity: LootRarity,
  meta: PityMeta,
): PityMeta {
  const current = meta.pityLegendKungfa ?? 0
  const isLegend = rarity === 'legendary'
  return {
    ...meta,
    pityLegendKungfa: isLegend ? 0 : current + 1,
  }
}

/** 功法：传奇功法权重乘数（pity>=THRESHOLD 时提升） */
export function getLegendKungfuWeightMul(meta: PityMeta): number {
  const pity = meta.pityLegendKungfa ?? 0
  if (pity >= PITY_LEGEND_KUNGFU_THRESHOLD) return 1.5
  return 1.0
}

/** 应用保底后的传奇掉落权重（在 getLootRarityWeight 基础上乘算） */
export function applyPityToLegendLootWeight(
  baseWeight: number,
  meta: PityMeta,
): number {
  if (baseWeight <= 0) return 0
  return baseWeight * getLegendLootWeightMul(meta)
}

/** 碎片：掉落重复功法时增加（由 game 层在 applyLootItem 时累加） */
export function addKungfaShards(meta: PityMeta, amount: number): PityMeta {
  return {
    ...meta,
    kungfaShards: (meta.kungfaShards ?? 0) + amount,
  }
}

/** 碎片兑换：检查并扣除，返回新 meta 与是否成功 */
export function spendKungfaShardsForRarity(
  meta: PityMeta,
  rarity: 'rare' | 'epic' | 'legendary',
): { success: boolean; newMeta: PityMeta; cost: number } {
  const cost = rarity === 'rare' ? SHARD_COST_RARE : rarity === 'epic' ? SHARD_COST_EPIC : SHARD_COST_LEGENDARY
  const shards = meta.kungfaShards ?? 0
  if (shards < cost) {
    return { success: false, newMeta: meta, cost }
  }
  return {
    success: true,
    newMeta: { ...meta, kungfaShards: shards - cost },
    cost,
  }
}
