/**
 * TICKET-30: 突破成功率计算（单一来源，支持多丹药 + 姿态）
 * 供 game.ts 与 breakthrough.ts 共用，避免循环依赖
 */

import type { GameState } from '../game'
import type { ElixirQuality } from '../alchemy'
import { hasBreakthroughPrereq } from '../breakthrough_requirements'
import { buildLegacyModifiers } from '../legacy'
import { getKungfuModifiers } from '../kungfu_modifiers'
import { getMindBreakthroughBonus } from '../cultivation'

const REALMS = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神'] as const

export function realmIndex(realm: string): number {
  const index = REALMS.indexOf(realm as (typeof REALMS)[number])
  return index < 0 ? 0 : index
}

export function nextRealm(realm: string): string {
  const i = realmIndex(realm)
  return REALMS[Math.min(i + 1, REALMS.length - 1)] ?? realm
}

export type BreakthroughPillEntry = {
  elixirId: 'spirit_pill' | 'foundation_pill'
  quality: ElixirQuality
  count: number
}

const SPIRIT_BONUS: Record<ElixirQuality, number> = {
  fan: 0.04,
  xuan: 0.07,
  di: 0.11,
  tian: 0.16,
}
const FOUNDATION_BONUS: Record<ElixirQuality, number> = {
  fan: 0.06,
  xuan: 0.1,
  di: 0.15,
  tian: 0.22,
}

function clampRate(value: number): number {
  return Math.max(0, Math.min(0.95, value))
}

/** 从丹药列表计算丹药加成（总和封顶 0.6） */
export function elixirBonusFromPills(pills: BreakthroughPillEntry[]): number {
  let sum = 0
  for (const p of pills) {
    if (p.count <= 0) continue
    const per =
      p.elixirId === 'foundation_pill' ? FOUNDATION_BONUS[p.quality] : SPIRIT_BONUS[p.quality]
    sum += per * p.count
  }
  return Math.min(0.6, sum)
}

export type BreakthroughRateBreakdown = {
  base: number
  inheritanceBonus: number
  pityBonus: number
  elixirBonus: number
  dangerPenalty: number
  dailyBonus: number
  kungfuAdd: number
  legacyAdd: number
  mindBonus: number
  raw: number
  rate: number
}

/** 计算突破成功率及拆解（支持多丹药）；后期境界需功法否则为 0 */
export function calcBreakthroughRateWithBreakdown(
  state: GameState,
  inheritanceSpent: number,
  pills: BreakthroughPillEntry[],
  dailySuccessBonus: number = 0,
): { rate: number; breakdown: BreakthroughRateBreakdown } {
  const targetRealmIndex = realmIndex(state.player.realm) + 1
  if (!hasBreakthroughPrereq(state.player.relics, targetRealmIndex)) {
    return {
      rate: 0,
      breakdown: {
        base: 0,
        inheritanceBonus: 0,
        pityBonus: 0,
        elixirBonus: 0,
        dangerPenalty: 0,
        dailyBonus: 0,
        kungfuAdd: 0,
        legacyAdd: 0,
        mindBonus: 0,
        raw: 0,
        rate: 0,
      },
    }
  }

  const base = 0
  const inheritanceBonus = inheritanceSpent * 0.08
  const legacyCtx = buildLegacyModifiers(state.meta)
  const pityBonusBase = state.player.pity * 0.02
  const pityBonus =
    Math.min(0.08, pityBonusBase) + (state.player.pity >= 5 ? legacyCtx.breakthroughPityBonusRate : 0)
  const dangerPenalty = state.run.danger > 0 ? state.run.danger * 0.015 : 0
  const elixirBonus = elixirBonusFromPills(pills) * legacyCtx.breakthroughPillBonusMul
  const mod = getKungfuModifiers(state)
  const kungfuAdd = mod.breakthroughSuccessAdd ?? 0
  const legacyAdd = buildLegacyModifiers(state.meta).breakthroughRateAdd
  const mindBonus = getMindBreakthroughBonus(state.player.mind ?? 50)
  const raw =
    base +
    inheritanceBonus +
    pityBonus +
    elixirBonus -
    dangerPenalty +
    dailySuccessBonus +
    kungfuAdd +
    legacyAdd +
    mindBonus
  const floor = kungfuAdd > 0 ? kungfuAdd : 0
  const rate = clampRate(Math.max(raw, floor))

  return {
    rate,
    breakdown: {
      base,
      inheritanceBonus,
      pityBonus,
      elixirBonus,
      dangerPenalty,
      dailyBonus: dailySuccessBonus,
      kungfuAdd,
      legacyAdd,
      mindBonus,
      raw,
      rate,
    },
  }
}

/** 兼容旧接口：单丹药 */
export function calcBreakthroughRate(
  state: GameState,
  inheritanceSpent: number,
  useElixir?: BreakthroughPillEntry,
  dailySuccessBonus: number = 0,
): number {
  const pills = useElixir && useElixir.count > 0 ? [useElixir] : []
  return calcBreakthroughRateWithBreakdown(state, inheritanceSpent, pills, dailySuccessBonus).rate
}
