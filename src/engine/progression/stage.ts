/**
 * TICKET-33: 阶（stage）进阶 — 每 15 级一阶，最后一阶 91–99
 * 单一来源：getStageIndex、getStageCapByStage、getStageCap、isStageCapped、expNeededForNextLevel
 */

import type { GameState } from '../game'

/** 阶边界：1阶 Lv1–15，2阶 16–30，…，7阶 91–99 */
export const STAGE_BOUNDARIES = [15, 30, 45, 60, 75, 90, 99] as const

export const STAGE_COUNT = 7

/** 根据等级得到阶索引 1..7 */
export function getStageIndex(level: number): number {
  const l = Math.max(1, Math.min(99, level))
  for (let i = 0; i < STAGE_BOUNDARIES.length; i++) {
    if (l <= STAGE_BOUNDARIES[i]) return i + 1
  }
  return STAGE_COUNT
}

/** 某阶的等级上限 */
export function getStageCapByStage(stageIndex: number): number {
  const i = Math.max(1, Math.min(STAGE_COUNT, stageIndex)) - 1
  return STAGE_BOUNDARIES[i]
}

/** 当前阶的等级上限（用 state 的 stageIndex，缺省时由 level 推导） */
export function getStageCap(state: GameState): number {
  const player = state.player
  const level = Math.max(1, Math.min(99, player.level ?? 1))
  const stageIndex = player.stageIndex ?? getStageIndex(level)
  return getStageCapByStage(stageIndex)
}

/** 是否已到当前阶上限（需阶突破才能继续获得经验） */
export function isStageCapped(state: GameState): boolean {
  const level = Math.max(1, Math.min(99, state.player.level ?? 1))
  const cap = getStageCap(state)
  return level >= cap
}

/** 升到下一级所需经验（二次曲线，平滑） need = round(18 + 4*(L-1) + 0.35*(L-1)^2) */
export function expNeededForNextLevel(level: number): number {
  const L = Math.max(1, Math.min(99, level))
  const raw = 18 + 4 * (L - 1) + 0.35 * (L - 1) ** 2
  return Math.max(10, Math.round(raw))
}

/** 是否允许境界突破（仅 Lv99 且第 7 阶完成） */
export function canRealmBreakthrough(state: GameState): boolean {
  const level = Math.max(1, Math.min(99, state.player.level ?? 1))
  const stageIndex = state.player.stageIndex ?? getStageIndex(level)
  return level >= 99 && stageIndex >= STAGE_COUNT
}

/** 是否允许阶突破（当前等级已达当前阶上限且未到第 7 阶） */
export function canStageBreakthrough(state: GameState): boolean {
  const level = Math.max(1, Math.min(99, state.player.level ?? 1))
  const stageIndex = state.player.stageIndex ?? getStageIndex(level)
  const cap = getStageCapByStage(stageIndex)
  return level >= cap && stageIndex < STAGE_COUNT
}
