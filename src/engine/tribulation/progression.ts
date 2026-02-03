/**
 * TICKET-40: 12 劫序列 — 配置驱动、劫数推进（单一真相）
 */

import tribulationsData from '../../content/tribulations.v1.json'
import type { GameState } from '../game'

export type TribulationTier = '普通' | '凶' | '绝' | '天'

export interface TribulationMods {
  damageMult?: number
  intentRarityBoost?: number
  maxRounds?: number
}

export interface TribulationConfig {
  idx: number
  name: string
  tier: TribulationTier
  mods: TribulationMods
  rewardOnWin: { legacyPoints?: number }
  rewardOnLose: { legacyPoints?: number }
}

interface TribulationsFile {
  tribulations: Array<{
    idx: number
    name: string
    tier: string
    mods: TribulationMods
    rewardOnWin: { legacyPoints?: number }
    rewardOnLose: { legacyPoints?: number }
  }>
}

const raw = tribulationsData as TribulationsFile
if (!raw?.tribulations || !Array.isArray(raw.tribulations)) {
  throw new Error('tribulations.v1.json: tribulations must be an array')
}

const byIdx = new Map<number, TribulationConfig>()
for (const t of raw.tribulations) {
  if (t.idx >= 1 && t.idx <= 12) {
    byIdx.set(t.idx, {
      idx: t.idx,
      name: t.name,
      tier: t.tier as TribulationTier,
      mods: t.mods ?? {},
      rewardOnWin: t.rewardOnWin ?? {},
      rewardOnLose: t.rewardOnLose ?? {},
    })
  }
}

export const TRIBULATION_COUNT = 12

/** 当前要渡的是第几劫（1..12）；未进入则为 0 */
export function getCurrentTribulationIdx(state: GameState): number {
  if (state.run.tribulation) {
    return state.run.tribulation.level
  }
  const level = state.run.tribulationLevel ?? 0
  return level < TRIBULATION_COUNT ? level + 1 : 0
}

/** 根据 state 获取当前劫配置 */
export function getCurrentTribulationConfig(state: GameState): TribulationConfig | null {
  const idx = getCurrentTribulationIdx(state)
  return idx >= 1 && idx <= TRIBULATION_COUNT ? byIdx.get(idx) ?? null : null
}

/** 根据劫索引获取配置 */
export function getTribulationConfigByIdx(idx: number): TribulationConfig | null {
  return idx >= 1 && idx <= TRIBULATION_COUNT ? byIdx.get(idx) ?? null : null
}

/** 获取所有劫配置（用于 UI 进度展示） */
export function getAllTribulationConfigs(): TribulationConfig[] {
  return Array.from({ length: TRIBULATION_COUNT }, (_, i) => i + 1)
    .map((idx) => byIdx.get(idx))
    .filter((c): c is TribulationConfig => c != null)
}
