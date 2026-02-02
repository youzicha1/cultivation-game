/**
 * TICKET-29: 天道意图定义（至少 3 种，可扩 5 种）
 * 雷击 / 心魔 / 天火
 */

export type DebuffKey = 'mindChaos' | 'burn' | 'weak'

export interface TribulationIntentAddDebuff {
  key: DebuffKey
  stacks: number
}

export interface TribulationIntent {
  id: string
  name: string
  baseDamageMin: number
  baseDamageMax: number
  hitChance?: number
  addDebuff?: TribulationIntentAddDebuff
}

export const TRIBULATION_INTENTS: TribulationIntent[] = [
  {
    id: 'thunder',
    name: '雷击',
    baseDamageMin: 8,
    baseDamageMax: 14,
    hitChance: 1,
  },
  {
    id: 'mind_demon',
    name: '心魔',
    baseDamageMin: 4,
    baseDamageMax: 8,
    hitChance: 1,
    addDebuff: { key: 'mindChaos', stacks: 1 },
  },
  {
    id: 'sky_fire',
    name: '天火',
    baseDamageMin: 12,
    baseDamageMax: 18,
    hitChance: 1,
    addDebuff: { key: 'burn', stacks: 1 },
  },
]

export function getIntentById(id: string): TribulationIntent | undefined {
  return TRIBULATION_INTENTS.find((i) => i.id === id)
}
