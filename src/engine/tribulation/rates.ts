/**
 * TICKET-27: 天劫成功率（单一真相）
 * 前期不易暴毙，后期难度递增，可接功法/丹药加成。
 */

const BASE_RATE = 0.78
const DROP_PER_LEVEL = 0.045
const MIN_RATE = 0.12
const MAX_RATE = 0.95

/**
 * 第 level 重（1-based）的基础成功率（未含加成）
 * rate = clamp(base - drop * (level-1), minRate, maxRate)
 */
export function getTribulationSuccessRate(
  level: number,
  bonus: number = 0,
): number {
  if (level < 1) return clamp(BASE_RATE + bonus, MIN_RATE, MAX_RATE)
  const drop = DROP_PER_LEVEL * (level - 1)
  const raw = BASE_RATE - drop + bonus
  return clamp(raw, MIN_RATE, MAX_RATE)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export const TRIBULATION_RATE_CONSTANTS = {
  BASE_RATE,
  DROP_PER_LEVEL,
  MIN_RATE,
  MAX_RATE,
} as const
