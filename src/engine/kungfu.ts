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
  /** TICKET-22: 流派标签，如 ["explore","build:tanbao"] */
  tags?: string[]
  /** TICKET-22: 机制 modifier 键值（camelCase），与 effects 并存，叠加由 kungfu_modifiers 处理 */
  modifiers?: Record<string, number>
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
    tags?: string[]
    modifiers?: Record<string, number>
  }>
}

/** 清洗 JSON：仅保留 number 的 effects/modifiers，满足 KungfuFile 类型 */
function normalizeKungfuFile(raw: unknown): KungfuFile {
  if (raw == null || typeof raw !== 'object' || !('kungfu' in (raw as object))) {
    throw new Error('kungfu.v1.json: invalid structure')
  }
  const o = raw as { version?: number; kungfu?: unknown[] }
  const version = typeof o.version === 'number' ? o.version : 1
  const kungfu = Array.isArray(o.kungfu)
    ? o.kungfu.map((row: unknown) => {
        if (row == null || typeof row !== 'object') throw new Error('kungfu.v1.json: invalid row')
        const r = row as Record<string, unknown>
        const cleanNum = (obj: unknown): Record<string, number> | undefined => {
          if (obj == null || typeof obj !== 'object') return undefined
          const out: Record<string, number> = {}
          for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
            if (typeof v === 'number') out[k] = v
          }
          return Object.keys(out).length ? out : undefined
        }
        return {
          id: String(r.id ?? ''),
          name: String(r.name ?? ''),
          rarity: String(r.rarity ?? 'common'),
          shortDesc: String(r.shortDesc ?? ''),
          sourceHint: String(r.sourceHint ?? ''),
          effects: cleanNum(r.effects),
          tags: Array.isArray(r.tags) ? r.tags : undefined,
          modifiers: cleanNum(r.modifiers),
        }
      })
    : []
  return { version, kungfu }
}

function validateKungfuFile(): Map<RelicId, KungfuDef> {
  const file = normalizeKungfuFile(kungfuFile)
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
      tags: Array.isArray(row.tags) ? row.tags : undefined,
      modifiers: row.modifiers && typeof row.modifiers === 'object' ? row.modifiers : undefined,
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

const BUILD_TAG_LABEL: Record<string, string> = {
  'build:tanbao': '探宝流',
  'build:danxiu': '丹修流',
  'build:chongguan': '冲关流',
}

/** TICKET-22: 从功法 def 取流派标签文案（用于 UI） */
export function getKungfuBuildLabels(def: KungfuDef): string[] {
  if (!def.tags?.length) return []
  return def.tags
    .filter((t) => BUILD_TAG_LABEL[t])
    .map((t) => BUILD_TAG_LABEL[t])
}

/** TICKET-22: 从功法 modifiers 生成 1~2 条关键效果文案（用于 UI） */
export function getKungfuKeyEffects(def: KungfuDef): string[] {
  const m = def.modifiers
  if (!m || typeof m !== 'object') return []
  const lines: string[] = []
  if (m.exploreDangerIncMult != null && m.exploreDangerIncMult !== 1) {
    const pct = Math.round((1 - m.exploreDangerIncMult) * 100)
    lines.push(pct > 0 ? `危险增长-${pct}%` : `危险增长+${-pct}%`)
  }
  if (m.exploreRareWeightMult != null && m.exploreRareWeightMult !== 1) {
    const pct = Math.round((m.exploreRareWeightMult - 1) * 100)
    if (pct > 0) lines.push(`稀有奇遇更常见`)
  }
  if (m.exploreLegendWeightMult != null && m.exploreLegendWeightMult !== 1 && m.exploreLegendWeightMult > 1) {
    lines.push('传说掉落权重提升')
  }
  if (m.exploreCashoutGoldMult != null && m.exploreCashoutGoldMult > 1) {
    lines.push('收手灵石提升')
  }
  if (m.alchemySuccessAdd != null && m.alchemySuccessAdd > 0) {
    lines.push(`炼丹成功+${Math.round(m.alchemySuccessAdd * 100)}%`)
  }
  if (m.alchemyBoomMul != null && m.alchemyBoomMul < 1) {
    lines.push('爆丹率降低')
  }
  if (m.alchemyCostMult != null && m.alchemyCostMult < 1) {
    lines.push('材料消耗减少')
  }
  if (m.breakthroughSuccessAdd != null && m.breakthroughSuccessAdd > 0) {
    lines.push(`突破成功+${Math.round(m.breakthroughSuccessAdd * 100)}%`)
  }
  if (m.tribulationDamageMult != null && m.tribulationDamageMult < 1) {
    lines.push('天劫伤害降低')
  }
  if (m.tribulationExtraChoiceAdd != null && m.tribulationExtraChoiceAdd > 0) {
    lines.push('天劫额外选项')
  }
  return lines.slice(0, 2)
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
