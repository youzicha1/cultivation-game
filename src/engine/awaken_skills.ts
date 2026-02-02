/**
 * TICKET-30: 觉醒技能（突破成功三选一），modifiers 合并到全局
 */

import awakenFile from '../content/awaken_skills.v1.json'
import type { KungfuModifiers } from './kungfu_modifiers'
import { mergeModifiers } from './kungfu_modifiers'

export type AwakenSkillId = string

export type AwakenSkillDef = {
  id: AwakenSkillId
  name: string
  desc: string
  rarity: string
  tags: string[]
  modifiers: Record<string, number>
  exclusiveGroup: string | null
}

type AwakenFile = {
  version: number
  awakenSkills: Array<{
    id: string
    name: string
    desc: string
    rarity: string
    tags?: string[]
    modifiers?: Record<string, number>
    exclusiveGroup?: string | null
  }>
}

function loadAwakenSkills(): Map<AwakenSkillId, AwakenSkillDef> {
  const raw = awakenFile as unknown as AwakenFile
  if (!raw?.awakenSkills || !Array.isArray(raw.awakenSkills)) {
    throw new Error('awaken_skills.v1.json: invalid structure')
  }
  const map = new Map<AwakenSkillId, AwakenSkillDef>()
  for (const row of raw.awakenSkills) {
    const modifiers: Record<string, number> = {}
    if (row.modifiers && typeof row.modifiers === 'object') {
      for (const [k, v] of Object.entries(row.modifiers)) {
        if (typeof v === 'number') modifiers[k] = v
      }
    }
    map.set(row.id, {
      id: row.id,
      name: row.name ?? row.id,
      desc: row.desc ?? '',
      rarity: row.rarity ?? 'common',
      tags: Array.isArray(row.tags) ? row.tags : [],
      modifiers,
      exclusiveGroup: row.exclusiveGroup ?? null,
    })
  }
  return map
}

let cache: Map<AwakenSkillId, AwakenSkillDef> | null = null

function getRegistry(): Map<AwakenSkillId, AwakenSkillDef> {
  if (!cache) cache = loadAwakenSkills()
  return cache
}

export function getAwakenSkill(id: AwakenSkillId): AwakenSkillDef | undefined {
  return getRegistry().get(id)
}

export function getAllAwakenSkills(): AwakenSkillDef[] {
  return Array.from(getRegistry().values())
}

export function getAwakenSkillIds(): AwakenSkillId[] {
  return Array.from(getRegistry().keys())
}

/** TICKET-35: modifier 键 → 短效果文案（供 UI 关键效果展示） */
const MODIFIER_EFFECT_LABEL: Record<string, (v: number) => string> = {
  breakthroughSuccessAdd: (v) => `突破成功率${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%`,
  breakthroughPityBonus: (v) => `突破保底+${v}`,
  tribulationDamageMult: (v) => `天劫伤害×${v.toFixed(2)}`,
  tribulationSurgeRateAdd: (v) => `逆冲成功率${(v * 100).toFixed(0)}%`,
  alchemySuccessAdd: (v) => `炼丹成功率${(v * 100).toFixed(0)}%`,
  alchemyBoomMul: (v) => `爆丹率×${v.toFixed(2)}`,
  alchemyQualityShift: (v) => `品质偏移${v >= 0 ? '+' : ''}${v.toFixed(2)}`,
  exploreRetreatAdd: (v) => `撤退成功率${(v * 100).toFixed(0)}%`,
  exploreDangerIncMult: (v) => `危险增长×${v.toFixed(2)}`,
  exploreRareWeightMult: (v) => `稀有掉落×${v.toFixed(2)}`,
  exploreLegendWeightMult: (v) => `传奇掉落×${v.toFixed(2)}`,
  exploreCashoutGoldMult: (v) => `收手灵石×${v.toFixed(2)}`,
  exploreCashoutExpMult: (v) => `收手修为×${v.toFixed(2)}`,
}

/** TICKET-35: 从技能 modifiers 取最多 2 条关键效果文案 */
export function getAwakenSkillEffectLines(def: AwakenSkillDef): string[] {
  const lines: string[] = []
  const mod = def.modifiers
  if (!mod || typeof mod !== 'object') return lines
  for (const [key, value] of Object.entries(mod)) {
    const fn = MODIFIER_EFFECT_LABEL[key]
    if (fn && typeof value === 'number') lines.push(fn(value))
    if (lines.length >= 2) break
  }
  return lines
}

/** 将已觉醒技能 ID 列表合并为 modifiers（供 getKungfuModifiers 合并） */
export function getAwakenModifiers(awakenSkillIds: string[]): KungfuModifiers {
  const reg = getRegistry()
  const list: KungfuModifiers[] = []
  for (const id of awakenSkillIds) {
    const def = reg.get(id)
    if (def?.modifiers && Object.keys(def.modifiers).length > 0) {
      list.push(def.modifiers)
    }
  }
  return list.length === 0 ? {} : mergeModifiers(list)
}
