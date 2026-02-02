/**
 * TICKET-32: 丹方品质分布（tier→权重→归一化概率）
 * 凡方只出凡；玄方玄/凡；地方地/玄/凡；天方天/地/玄/凡。
 * 默认权重顺滑，天方仍以凡为主、天概率很低。
 */

import type { ElixirQuality } from '../alchemy'

export type RecipeTier = 'fan' | 'xuan' | 'di' | 'tian'

const QUALITY_ORDER: ElixirQuality[] = ['fan', 'xuan', 'di', 'tian']

/** tier 允许的最高品质（含） */
const TIER_MAX_QUALITY: Record<RecipeTier, ElixirQuality> = {
  fan: 'fan',
  xuan: 'xuan',
  di: 'di',
  tian: 'tian',
}

/** 默认品质权重（未归一化）。凡方100凡；玄方78凡22玄；地方62凡28玄10地；天方66凡24玄8地2天。 */
export const DEFAULT_WEIGHTS_BY_TIER: Record<RecipeTier, Record<ElixirQuality, number>> = {
  fan: { fan: 100, xuan: 0, di: 0, tian: 0 },
  xuan: { fan: 78, xuan: 22, di: 0, tian: 0 },
  di: { fan: 62, xuan: 28, di: 10, tian: 0 },
  tian: { fan: 66, xuan: 24, di: 8, tian: 2 },
}

export type QualityDist = Record<ElixirQuality, number>

/** 超出 tier 上限的品质权重置 0，其余不变 */
export function clampWeightsToTier(
  weights: Record<ElixirQuality, number>,
  tier: RecipeTier,
): Record<ElixirQuality, number> {
  const maxQ = TIER_MAX_QUALITY[tier]
  const idx = QUALITY_ORDER.indexOf(maxQ)
  const out: Record<ElixirQuality, number> = { ...weights }
  for (let i = idx + 1; i < QUALITY_ORDER.length; i++) {
    out[QUALITY_ORDER[i]] = 0
  }
  return out
}

/** 归一化使 sum=1；若 sum=0 则返回均匀凡品 */
export function normalizeDist(dist: Record<ElixirQuality, number>): QualityDist {
  const sum = QUALITY_ORDER.reduce((s, q) => s + dist[q], 0)
  if (sum <= 0) {
    return { fan: 1, xuan: 0, di: 0, tian: 0 }
  }
  const out: QualityDist = { fan: 0, xuan: 0, di: 0, tian: 0 }
  for (const q of QUALITY_ORDER) {
    out[q] = dist[q] / sum
  }
  return out
}

export type QualityModifiers = {
  /** 炉温/熟练等：把一点概率从低品质挪到高品质，幅度要小，避免断层 */
  shiftToHigh?: number
}

const MAX_SHIFT = 0.06

/** 对权重做微小“向高品偏移”：从 fan 减一点，加到 tier 内最高品质 */
export function applySmallModifiers(
  weights: Record<ElixirQuality, number>,
  tier: RecipeTier,
  mods?: QualityModifiers,
): Record<ElixirQuality, number> {
  const shift = mods?.shiftToHigh ?? 0
  if (shift <= 0) return { ...weights }
  const amount = Math.min(MAX_SHIFT, Math.max(0, shift))
  const w = { ...weights }
  const maxQ = TIER_MAX_QUALITY[tier]
  const maxIdx = QUALITY_ORDER.indexOf(maxQ)
  if (maxIdx <= 0) return w
  w.fan = Math.max(0, w.fan - amount)
  w[maxQ] = w[maxQ] + amount
  return w
}

/** 根据 tier（+ 可选微小修正）得到品质概率分布。单一来源，brew 与 UI 共用。 */
export function getQualityDist(
  tier: RecipeTier,
  mods?: QualityModifiers,
): QualityDist {
  const base = DEFAULT_WEIGHTS_BY_TIER[tier]
  const clamped = clampWeightsToTier(base, tier)
  const adjusted = applySmallModifiers(clamped, tier, mods)
  return normalizeDist(adjusted)
}

/** 用 rng 在 qualityDist 上 roll 一次，返回抽到的品质 */
export function rollQualityFromDist(
  rng01: () => number,
  qualityDist: QualityDist,
): ElixirQuality {
  const x = rng01()
  let cursor = 0
  for (const q of QUALITY_ORDER) {
    cursor += qualityDist[q]
    if (x < cursor) return q
  }
  return 'tian'
}
