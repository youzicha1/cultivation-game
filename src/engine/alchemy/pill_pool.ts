/**
 * TICKET-39: 通用丹方池 — 按用途池抽取机制丹，tier 影响稀有度，保底防脸黑
 */

import type { GameState } from '../game'
import type { ElixirQuality, RecipeTier } from '../alchemy'
import { getQualityDist, rollQualityFromDist } from './quality_weights'
import { getAllPillDefs } from '../pills/pill_effects'
import type { PillDef } from '../pills/types'
import type { PillRarity } from '../pills/types'

export type PillId = string

export const PITY_RARE_THRESHOLD = 6
export const PITY_LEGENDARY_THRESHOLD = 18

export const PILL_POOL_TAGS = [
  'tribulation',
  'explore',
  'breakthrough',
  'cultivate',
  'survival',
  'economy',
  'utility',
] as const
export type PillPoolTag = (typeof PILL_POOL_TAGS)[number]

/** 获取某标签下的丹药池；utility 表示全池 */
export function getPillPool(tag: string): PillDef[] {
  const all = getAllPillDefs()
  if (tag === 'utility') return all
  return all.filter((p) => p.tags.includes(tag))
}

/** 按 tier 过滤：规则丹仅 tier>=tian（或 poolRules 为 di）时可出 */
function filterPoolByTier(
  pool: PillDef[],
  recipeTier: RecipeTier,
  allowRulePillsFromTier: 'di' | 'tian' = 'tian',
): PillDef[] {
  const allowRule =
    allowRulePillsFromTier === 'tian'
      ? recipeTier === 'tian'
      : recipeTier === 'tian' || recipeTier === 'di'
  if (allowRule) return pool
  return pool.filter((p) => !p.isRulePill)
}

/** 按 tier 得到稀有度权重（顺滑） */
function getRarityWeightsByTier(
  recipeTier: RecipeTier,
  pity: number,
): { common: number; rare: number; legendary: number } {
  const base: Record<RecipeTier, { common: number; rare: number; legendary: number }> = {
    fan: { common: 98, rare: 2, legendary: 0 },
    xuan: { common: 94, rare: 6, legendary: 0 },
    di: { common: 88, rare: 11, legendary: 1 },
    tian: { common: 78, rare: 18, legendary: 4 },
  }
  let w = { ...base[recipeTier] }
  if (pity >= PITY_LEGENDARY_THRESHOLD) {
    w = { common: 40, rare: 35, legendary: 25 }
  } else if (pity >= PITY_RARE_THRESHOLD) {
    w = { common: 50, rare: 45, legendary: Math.max(0, w.legendary) }
  }
  const sum = w.common + w.rare + w.legendary
  return { common: w.common / sum, rare: w.rare / sum, legendary: w.legendary / sum }
}

function rollRarity(
  rng01: () => number,
  weights: { common: number; rare: number; legendary: number },
  availableRarities: PillRarity[],
): PillRarity {
  const order: PillRarity[] = ['common', 'rare', 'legendary']
  let cursor = 0
  const x = rng01()
  for (const r of order) {
    if (!availableRarities.includes(r)) continue
    cursor += weights[r]
    if (x < cursor) return r
  }
  return availableRarities[availableRarities.length - 1] ?? 'common'
}

export type RollPillResult = {
  pillId: PillId
  quality: ElixirQuality
  rarity: PillRarity
  isRulePill: boolean
}

/**
 * 从池中抽一枚机制丹；返回 result 与 nextPity（由调用方写回 run.pillPoolPityByTag）
 */
export function rollPillFromPool(
  state: GameState,
  tag: string,
  recipeTier: RecipeTier,
  rng01: () => number,
  poolRules?: { allowRulePillsFromTier: 'di' | 'tian' },
): { result: RollPillResult; nextPity: number } {
  const pool = getPillPool(tag)
  const allowRule = poolRules?.allowRulePillsFromTier ?? 'tian'
  const filtered = filterPoolByTier(pool, recipeTier, allowRule)
  if (filtered.length === 0) {
    const fallback = pool[0]
    const qualityDist = getQualityDist(recipeTier, {})
    const quality = rollQualityFromDist(rng01, qualityDist)
    return {
      result: {
        pillId: fallback?.id ?? 'guard_tribulation',
        quality,
        rarity: (fallback?.pillRarity ?? 'common') as PillRarity,
        isRulePill: fallback?.isRulePill ?? false,
      },
      nextPity: state.run.pillPoolPityByTag?.[tag] ?? 0,
    }
  }

  const pity = state.run.pillPoolPityByTag?.[tag] ?? 0
  const rarityWeights = getRarityWeightsByTier(recipeTier, pity)

  const hasRare = filtered.some((p) => (p.pillRarity ?? 'common') === 'rare')
  const hasLegendary = filtered.some((p) => (p.pillRarity ?? 'common') === 'legendary')
  const availableRarities: PillRarity[] = ['common']
  if (hasRare) availableRarities.push('rare')
  if (hasLegendary) availableRarities.push('legendary')

  const rolledRarity = rollRarity(rng01, rarityWeights, availableRarities)
  const byRarity = filtered.filter((p) => (p.pillRarity ?? 'common') === rolledRarity)
  const candidates = byRarity.length > 0 ? byRarity : filtered
  const idx = Math.floor(rng01() * candidates.length)
  const picked = candidates[idx] ?? candidates[0]

  const qualityDist = getQualityDist(recipeTier, {})
  const quality = rollQualityFromDist(rng01, qualityDist)

  const hitRareOrLegendary = rolledRarity === 'rare' || rolledRarity === 'legendary'
  const nextPity = hitRareOrLegendary ? 0 : pity + 1

  return {
    result: {
      pillId: picked.id,
      quality,
      rarity: (picked.pillRarity ?? 'common') as PillRarity,
      isRulePill: picked.isRulePill ?? false,
    },
    nextPity,
  }
}

/** 产出池预览：按稀有度统计数量（UI 用） */
export function getPoolPreviewByRarity(tag: string): { common: number; rare: number; legendary: number } {
  const pool = getPillPool(tag)
  const counts = { common: 0, rare: 0, legendary: 0 }
  for (const p of pool) {
    const r = p.pillRarity ?? 'common'
    counts[r] += 1
  }
  return counts
}
