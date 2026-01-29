/**
 * TICKET-10: 功法系统统一入口
 * - 读取 kungfu.v1.json，提供 getEquippedKungfa / buildKungfaModifiers
 * - 所有公式只用此 ctx，单一来源便于测试与扩展
 */

import type { PlayerState } from './state'
import type { RelicId } from './relics'
import { RELIC_IDS } from './relics'

export type KungfuRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type KungfuEffects = {
  explore_retreat_add?: number
  explore_danger_inc_mul?: number
  loot_rare_weight_mul?: number
  loot_legend_weight_mul?: number
  alchemy_boom_rate_mul?: number
  alchemy_quality_shift?: number
  breakthrough_rate_add?: number
}

export type KungfuDef = {
  id: string
  name: string
  rarity: KungfuRarity
  shortDesc: string
  sourceHint: string
  effects: KungfuEffects
}

export type KungfuModifiers = {
  exploreRetreatAdd: number
  exploreDangerIncMul: number
  lootRareMul: number
  lootLegendMul: number
  alchemyBoomMul: number
  alchemyQualityShift: number
  breakthroughRateAdd: number
}

const DEFAULT_MODIFIERS: KungfuModifiers = {
  exploreRetreatAdd: 0,
  exploreDangerIncMul: 1,
  lootRareMul: 1,
  lootLegendMul: 1,
  alchemyBoomMul: 1,
  alchemyQualityShift: 0,
  breakthroughRateAdd: 0,
}

import kungfuFile from '../content/kungfu.v1.json'

type KungfuFile = {
  version: number
  kungfu: Array<{
    id: string
    name: string
    rarity: string
    shortDesc: string
    sourceHint: string
    effects?: Record<string, number>
  }>
}

function validateKungfuFile(): Map<RelicId, KungfuDef> {
  const file = kungfuFile as KungfuFile
  if (!file?.kungfu || !Array.isArray(file.kungfu)) {
    throw new Error('kungfu.v1.json: missing or invalid kungfu array')
  }
  const map = new Map<RelicId, KungfuDef>()
  for (const row of file.kungfu) {
    if (!RELIC_IDS.includes(row.id as RelicId)) {
      throw new Error(`kungfu.v1.json: id "${row.id}" is not in RELIC_IDS`)
    }
    const id = row.id as RelicId
    map.set(id, {
      id,
      name: row.name ?? id,
      rarity: (row.rarity as KungfuRarity) ?? 'common',
      shortDesc: row.shortDesc ?? '',
      sourceHint: row.sourceHint ?? '',
      effects: (row.effects as KungfuEffects) ?? {},
    })
  }
  return map
}

let kungfuRegistry: Map<RelicId, KungfuDef> | null = null

function getRegistry(): Map<RelicId, KungfuDef> {
  if (!kungfuRegistry) kungfuRegistry = validateKungfuFile()
  return kungfuRegistry
}

export function getKungfu(id: RelicId): KungfuDef | undefined {
  return getRegistry().get(id)
}

export function getAllKungfu(): KungfuDef[] {
  return Array.from(getRegistry().values())
}

/** TICKET-13: 按稀有度获取功法 ID 列表（用于碎片兑换） */
export function getKungfuIdsByRarity(rarity: KungfuRarity): RelicId[] {
  return getAllKungfu()
    .filter((k) => k.rarity === rarity)
    .map((k) => k.id as RelicId)
}

/** 当前装备的功法列表（按槽位顺序，不含空槽） */
export function getEquippedKungfa(state: { player: PlayerState }): KungfuDef[] {
  const slots = state.player.equippedRelics ?? [null, null, null]
  const reg = getRegistry()
  const out: KungfuDef[] = []
  for (let i = 0; i < slots.length; i++) {
    const id = slots[i]
    if (id) {
      const def = reg.get(id)
      if (def) out.push(def)
    }
  }
  return out
}

/** 把 3 槽功法效果叠加成一个 ctx，供探索/炼丹/突破公式使用 */
export function buildKungfaModifiers(state: { player: PlayerState }): KungfuModifiers {
  const equipped = getEquippedKungfa(state)
  const ctx = { ...DEFAULT_MODIFIERS }
  for (const k of equipped) {
    const e = k.effects
    if (e.explore_retreat_add != null) ctx.exploreRetreatAdd += e.explore_retreat_add
    if (e.explore_danger_inc_mul != null) ctx.exploreDangerIncMul *= e.explore_danger_inc_mul
    if (e.loot_rare_weight_mul != null) ctx.lootRareMul *= e.loot_rare_weight_mul
    if (e.loot_legend_weight_mul != null) ctx.lootLegendMul *= e.loot_legend_weight_mul
    if (e.alchemy_boom_rate_mul != null) ctx.alchemyBoomMul *= e.alchemy_boom_rate_mul
    if (e.alchemy_quality_shift != null) ctx.alchemyQualityShift += e.alchemy_quality_shift
    if (e.breakthrough_rate_add != null) ctx.breakthroughRateAdd += e.breakthrough_rate_add
  }
  ctx.breakthroughRateAdd = Math.max(0, Math.min(0.3, ctx.breakthroughRateAdd))
  ctx.exploreRetreatAdd = Math.max(0, Math.min(0.25, ctx.exploreRetreatAdd))
  ctx.alchemyBoomMul = Math.max(0.3, Math.min(1.5, ctx.alchemyBoomMul))
  ctx.alchemyQualityShift = Math.max(-0.2, Math.min(0.2, ctx.alchemyQualityShift))
  return ctx
}
