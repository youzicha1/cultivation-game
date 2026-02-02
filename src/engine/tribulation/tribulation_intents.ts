/**
 * TICKET-36: 天劫意图内容驱动 — ≥12 种（含 ≥3 稀有）、minTier 门槛、权重抽取
 * 内容：src/content/tribulation_intents.v1.json
 */

import intentsFile from '../../content/tribulation_intents.v1.json'

export type DebuffKey = 'mindChaos' | 'burn' | 'weak'

export interface TribulationIntentAddDebuff {
  key: DebuffKey
  stacks: number
}

export interface TribulationIntent {
  id: string
  name: string
  rarity: 'common' | 'rare'
  baseDamageMin: number
  baseDamageMax: number
  hitChance?: number
  addDebuff?: TribulationIntentAddDebuff
  /** 本回合回血丹无效 */
  blockHeal?: boolean
  /** 0～100，穿透护盾的比例，剩余部分先扣护盾 */
  shieldPenetration?: number
  telegraphText: string
  counterHint: string
  minTier: number
  baseWeight: number
}

type IntentRow = {
  id: string
  name: string
  rarity: string
  tags?: string[]
  effectSpec: {
    baseDamageMin: number
    baseDamageMax: number
    addDebuff?: { key: string; stacks: number }
    blockHeal?: boolean
    shieldPenetration?: number
  }
  telegraphText: string
  counterHint: string
  minTier?: number
  baseWeight?: number
}

type IntentsFile = { version: number; intents: IntentRow[] }

function loadIntents(): TribulationIntent[] {
  const raw = intentsFile as unknown as IntentsFile
  if (!raw?.intents || !Array.isArray(raw.intents)) return []
  return raw.intents.map((row) => {
    const spec = row.effectSpec ?? {}
    const addDebuff = spec.addDebuff
      ? { key: spec.addDebuff.key as DebuffKey, stacks: spec.addDebuff.stacks }
      : undefined
    return {
      id: row.id,
      name: row.name ?? row.id,
      rarity: (row.rarity === 'rare' ? 'rare' : 'common') as 'common' | 'rare',
      baseDamageMin: spec.baseDamageMin ?? 8,
      baseDamageMax: spec.baseDamageMax ?? 14,
      hitChance: 1,
      addDebuff,
      blockHeal: spec.blockHeal ?? false,
      shieldPenetration: spec.shieldPenetration,
      telegraphText: row.telegraphText ?? row.name,
      counterHint: row.counterHint ?? '稳/护体/丹可应对。',
      minTier: row.minTier ?? 0,
      baseWeight: row.baseWeight ?? 100,
    }
  })
}

let cache: TribulationIntent[] | null = null

export function getTribulationIntents(): TribulationIntent[] {
  if (cache === null) cache = loadIntents()
  return cache
}

/** 供测试或兼容使用：按 id 取意图 */
export function getIntentById(id: string): TribulationIntent | undefined {
  return getTribulationIntents().find((i) => i.id === id)
}

/** 按 tier 过滤并加权抽取一个意图；tier 为当前天劫重数 1..12 */
export function rollIntent(level: number, rng: { next: () => number }): TribulationIntent {
  const intents = getTribulationIntents()
  const tier = Math.max(1, Math.min(12, level))
  const eligible = intents.filter((i) => i.minTier <= tier)
  if (eligible.length === 0) {
    const fallback = intents.find((i) => i.minTier <= 12) ?? intents[0]
    return fallback ?? { id: 'thunder', name: '雷击', rarity: 'common', baseDamageMin: 8, baseDamageMax: 14, telegraphText: '天雷将至。', counterHint: '稳/护体可应对。', minTier: 0, baseWeight: 100 }
  }
  let total = 0
  for (const i of eligible) total += i.baseWeight
  const roll = rng.next()
  let acc = 0
  for (const i of eligible) {
    acc += i.baseWeight / total
    if (roll < acc) return i
  }
  return eligible[eligible.length - 1]
}
