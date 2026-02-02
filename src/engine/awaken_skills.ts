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
