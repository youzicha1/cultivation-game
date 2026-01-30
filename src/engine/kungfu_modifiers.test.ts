/**
 * TICKET-22: 功法 modifiers 合并与单一来源
 */

import { describe, it, expect } from 'vitest'
import { mergeModifiers, getKungfuModifiers, type KungfuModifiers } from './kungfu_modifiers'
import { createInitialState } from './state'

describe('mergeModifiers', () => {
  it('空列表返回空对象', () => {
    expect(mergeModifiers([])).toEqual({})
  })

  it('*Mult 类默认 1 相乘', () => {
    const list: KungfuModifiers[] = [
      { exploreDangerIncMult: 0.9 },
      { exploreDangerIncMult: 0.95 },
    ]
    const out = mergeModifiers(list)
    expect(out.exploreDangerIncMult).toBeCloseTo(0.9 * 0.95)
  })

  it('*Add 类默认 0 相加', () => {
    const list: KungfuModifiers[] = [
      { breakthroughSuccessAdd: 0.05 },
      { breakthroughSuccessAdd: 0.03 },
    ]
    const out = mergeModifiers(list)
    expect(out.breakthroughSuccessAdd).toBe(0.08)
  })

  it('混合 Mult 与 Add 正确', () => {
    const list: KungfuModifiers[] = [
      { exploreDangerIncMult: 0.92, breakthroughSuccessAdd: 0.05 },
      { exploreDangerIncMult: 0.85, alchemySuccessAdd: 0.04 },
    ]
    const out = mergeModifiers(list)
    expect(out.exploreDangerIncMult).toBeCloseTo(0.92 * 0.85)
    expect(out.breakthroughSuccessAdd).toBe(0.05)
    expect(out.alchemySuccessAdd).toBe(0.04)
  })

  it('缺省键按类型取默认：Mult=1 相乘后仍为 1', () => {
    const list: KungfuModifiers[] = [{ exploreRareWeightMult: 1.2 }]
    const out = mergeModifiers(list)
    expect(out.exploreRareWeightMult).toBe(1.2)
  })
})

describe('getKungfuModifiers', () => {
  it('无装备时返回空对象（无键）', () => {
    const state = { player: createInitialState() }
    const mod = getKungfuModifiers(state)
    expect(Object.keys(mod).length).toBe(0)
  })

  it('装备探宝功法后 exploreDangerIncMult < 1 或 exploreRareWeightMult > 1', () => {
    const state = {
      player: {
        ...createInitialState(),
        relics: ['shallow_breath', 'loot_fortune'],
        equippedRelics: ['shallow_breath', 'loot_fortune', null],
      },
    }
    const mod = getKungfuModifiers(state)
    expect(mod.exploreDangerIncMult).toBe(0.92)
    expect(mod.exploreRareWeightMult).toBe(1.25)
  })

  it('三槽位功法 modifiers 合并正确', () => {
    const state = {
      player: {
        ...createInitialState(),
        relics: ['breakthrough_boost', 'fire_suppress'],
        equippedRelics: ['breakthrough_boost', 'fire_suppress', null],
      },
    }
    const mod = getKungfuModifiers(state)
    expect(mod.breakthroughSuccessAdd).toBe(0.05)
    expect(mod.alchemySuccessAdd).toBe(0.04)
    expect(mod.alchemyBoomMul).toBe(0.7)
  })

  it('装备冲关功法后天劫伤害倍率 < 1', () => {
    const stateNo = { player: { ...createInitialState(), relics: [], equippedRelics: [null, null, null] } }
    const stateWith = {
      player: {
        ...createInitialState(),
        relics: ['legendary_eye'],
        equippedRelics: ['legendary_eye', null, null],
      },
    }
    const modNo = getKungfuModifiers(stateNo)
    const modWith = getKungfuModifiers(stateWith)
    expect(modWith.tribulationDamageMult).toBe(0.9)
    expect((modNo.tribulationDamageMult ?? 1)).toBe(1)
  })
})
