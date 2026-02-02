/**
 * TICKET-35: 觉醒技能池权重与加权抽样（按流派分池、去重、互斥）
 */

import type { GameState } from '../game'
import type { Rng } from '../rng'
import { getAllAwakenSkills, getAwakenSkill } from '../awaken_skills'

/** 基础权重：common 100 / rare 35 / legendary 8 */
export const AWAKEN_RARITY_WEIGHT: Record<string, number> = {
  common: 100,
  rare: 35,
  legendary: 8,
  epic: 20,
}

/** tag 加权：基于最近行为/状态，对某些 tag 乘系数（示例 1.25） */
export function getTagWeightMult(state: GameState, tag: string): number {
  const run = state.run
  const stats = run.stats ?? {}
  const danger = stats.run_max_danger ?? 0
  const alchemyCount = stats.run_alchemy_count ?? 0
  const tribLevel = run.tribulationLevel ?? 0
  const btStreak = run.streaks?.breakthrough_success_streak ?? 0
  const cashouts = stats.explore_cashouts ?? 0

  switch (tag) {
    case 'explore':
      return danger >= 40 ? 1.25 : 1
    case 'alchemy':
      return alchemyCount >= 5 ? 1.25 : 1
    case 'tribulation':
      return tribLevel >= 1 ? 1.25 : 1
    case 'breakthrough':
      return btStreak >= 1 ? 1.25 : 1
    case 'economy':
      return cashouts >= 3 ? 1.2 : 1
    case 'survival':
      return danger >= 50 ? 1.2 : 1
    case 'utility':
    default:
      return 1
  }
}

/** 可获得池：技能 id → 权重（已排除已拥有、已占互斥组） */
export function getAwakenPoolByTags(state: GameState): Record<string, number> {
  const owned = new Set(state.player.awakenSkills ?? [])
  const ownedGroups = new Set<string>()
  for (const id of owned) {
    const def = getAwakenSkill(id)
    if (def?.exclusiveGroup) ownedGroups.add(def.exclusiveGroup)
  }

  const all = getAllAwakenSkills()
  const weights: Record<string, number> = {}

  for (const s of all) {
    if (owned.has(s.id)) continue
    if (s.exclusiveGroup && ownedGroups.has(s.exclusiveGroup)) continue

    let w = AWAKEN_RARITY_WEIGHT[s.rarity] ?? AWAKEN_RARITY_WEIGHT.common
    for (const tag of s.tags ?? []) {
      w *= getTagWeightMult(state, tag)
    }
    weights[s.id] = Math.max(0.1, w)
  }

  return weights
}

/** 加权无放回抽样：从 weights 中抽 k 个不重复 id */
export function weightedSampleWithoutReplacement(
  weights: Record<string, number>,
  rng: Rng,
  k: number,
): string[] {
  const ids = Object.keys(weights).filter((id) => weights[id] > 0)
  if (ids.length <= k) return ids

  const result: string[] = []
  let remaining = ids.map((id) => ({ id, w: weights[id] }))

  for (let i = 0; i < k && remaining.length > 0; i++) {
    const total = remaining.reduce((s, x) => s + x.w, 0)
    if (total <= 0) break
    let r = rng.next() * total
    for (let j = 0; j < remaining.length; j++) {
      r -= remaining[j].w
      if (r <= 0) {
        result.push(remaining[j].id)
        remaining = remaining.filter((_, idx) => idx !== j)
        break
      }
    }
  }

  return result
}

/** 三选一：加权抽样 3 个不重复；池不足 3 则全返回 */
export function rollAwakenSkillChoices(state: GameState, rng: Rng): string[] {
  const pool = getAwakenPoolByTags(state)
  const ids = Object.keys(pool)
  if (ids.length <= 3) return ids

  const chosen = weightedSampleWithoutReplacement(pool, rng, 3)
  if (chosen.length < 3) {
    const extra = ids.filter((id) => !chosen.includes(id)).slice(0, 3 - chosen.length)
    return [...chosen, ...extra]
  }
  return chosen
}
