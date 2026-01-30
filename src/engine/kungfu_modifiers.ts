/**
 * TICKET-22: 功法流派化 — 单一来源 modifiers
 * - getKungfuModifiers(state) 合并三槽位功法的 modifiers
 * - *Mult 类默认 1 相乘，*Add 类默认 0 相加
 */

import type { PlayerState } from './state'
import { getEquippedKungfa } from './kungfu'
import type { KungfuDef } from './kungfu'

export type KungfuModifiers = Record<string, number>

const EFFECT_TO_MODIFIER: Record<string, string> = {
  explore_retreat_add: 'exploreRetreatAdd',
  explore_danger_inc_mul: 'exploreDangerIncMult',
  loot_rare_weight_mul: 'exploreRareWeightMult',
  loot_legend_weight_mul: 'exploreLegendWeightMult',
  alchemy_boom_rate_mul: 'alchemyBoomMul',
  alchemy_quality_shift: 'alchemyQualityShift',
  breakthrough_rate_add: 'breakthroughSuccessAdd',
}

function isMultKey(key: string): boolean {
  return key.endsWith('Mult') || key.endsWith('Mul') || key === 'alchemyCostMult' || key === 'alchemyBoomCompMult' || key === 'breakthroughPityGainMult'
}


/**
 * 叠加规则：*Mult 类默认 1 相乘；*Add 类默认 0 相加；*ChoiceAdd 取整相加
 */
export function mergeModifiers(list: KungfuModifiers[]): KungfuModifiers {
  const keys = new Set<string>()
  for (const m of list) {
    for (const k of Object.keys(m)) keys.add(k)
  }
  const out: KungfuModifiers = {}
  for (const key of keys) {
    if (isMultKey(key)) {
      let v = 1
      for (const m of list) {
        if (m[key] != null) v *= m[key]
      }
      out[key] = v
    } else if (key.endsWith('ChoiceAdd')) {
      let v = 0
      for (const m of list) {
        if (m[key] != null) v += Number(m[key])
      }
      out[key] = Math.floor(v)
    } else {
      // Add / Shift
      let v = 0
      for (const m of list) {
        if (m[key] != null) v += m[key]
      }
      out[key] = v
    }
  }
  return out
}

function modifiersFromDef(def: KungfuDef): KungfuModifiers {
  const m: KungfuModifiers = {}
  if (def.modifiers && typeof def.modifiers === 'object') {
    for (const [k, v] of Object.entries(def.modifiers)) {
      if (typeof v === 'number') m[k] = v
    }
  }
  const effects = (def as { effects?: Record<string, number> }).effects
  if (effects && typeof effects === 'object') {
    for (const [snake, v] of Object.entries(effects)) {
      if (typeof v !== 'number') continue
      const camel = EFFECT_TO_MODIFIER[snake]
      if (camel && m[camel] == null) m[camel] = v
    }
  }
  return m
}

/**
 * 从三槽位功法合并 modifiers，单一来源供探索/炼丹/突破/天劫使用
 */
export function getKungfuModifiers(state: { player: PlayerState }): KungfuModifiers {
  const equipped = getEquippedKungfa(state)
  const list = equipped.map((def) => modifiersFromDef(def))
  const merged = mergeModifiers(list)
  // 软上限（兼容旧逻辑）
  if (merged.breakthroughSuccessAdd != null) {
    merged.breakthroughSuccessAdd = Math.max(0, Math.min(0.3, merged.breakthroughSuccessAdd))
  }
  if (merged.exploreRetreatAdd != null) {
    merged.exploreRetreatAdd = Math.max(0, Math.min(0.25, merged.exploreRetreatAdd))
  }
  if (merged.alchemyBoomMul != null) {
    merged.alchemyBoomMul = Math.max(0.3, Math.min(1.5, merged.alchemyBoomMul))
  }
  if (merged.alchemyQualityShift != null) {
    merged.alchemyQualityShift = Math.max(-0.2, Math.min(0.2, merged.alchemyQualityShift))
  }
  return merged
}
