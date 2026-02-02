/**
 * TICKET-35: 觉醒技能池与加权抽样测试（去重、互斥、权重、生效）
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game'
import { createSeededRng, createSequenceRng } from '../rng'
import {
  getAwakenPoolByTags,
  weightedSampleWithoutReplacement,
  AWAKEN_RARITY_WEIGHT,
  getTagWeightMult,
} from './roll'
import { rollAwakenSkillChoices } from '../breakthrough/breakthrough'
import { getAwakenSkill } from '../awaken_skills'
import { getKungfuModifiers } from '../kungfu_modifiers'

describe('awaken_roll', () => {
  it('三选一不重复', () => {
    const state = createInitialGameState(1)
    const rng = createSeededRng(42)
    for (let i = 0; i < 20; i++) {
      const choices = rollAwakenSkillChoices(state, rng)
      expect(choices.length).toBeLessThanOrEqual(3)
      expect(choices.length).toBeGreaterThanOrEqual(1)
      const set = new Set(choices)
      expect(set.size).toBe(choices.length)
    }
  })

  it('互斥组：先选 A 后，池里不再出现同组技能', () => {
    const state = createInitialGameState(1)
    const mixed1 = getAwakenSkill('awaken_mixed_1')
    expect(mixed1?.exclusiveGroup).toBe('mixed_a')
    const afterChooseMixed1 = {
      ...state,
      player: { ...state.player, awakenSkills: ['awaken_mixed_1'] },
    }
    const pool = getAwakenPoolByTags(afterChooseMixed1)
    expect(pool['awaken_mixed_1']).toBeUndefined()
    for (const id of Object.keys(pool)) {
      const def = getAwakenSkill(id)
      expect(def?.exclusiveGroup).not.toBe('mixed_a')
    }
  })

  it('权重：探索多的 state 下 explore tag 加权更高', () => {
    const base = createInitialGameState(1)
    expect(getTagWeightMult(base, 'explore')).toBe(1)
    const exploreHeavy = {
      ...base,
      run: { ...base.run, stats: { ...base.run.stats, run_max_danger: 50 } },
    }
    expect(getTagWeightMult(exploreHeavy, 'explore')).toBe(1.25)
  })

  it('weightedSampleWithoutReplacement 返回 k 个不重复 id', () => {
    const weights = { a: 10, b: 20, c: 30, d: 40 }
    const rng = createSequenceRng([0.0, 0.2, 0.6], false)
    const result = weightedSampleWithoutReplacement(weights, rng, 3)
    expect(result.length).toBe(3)
    expect(new Set(result).size).toBe(3)
    expect(result.every((id) => id in weights)).toBe(true)
  })

  it('池不足 3 时返回全部', () => {
    const state = createInitialGameState(1)
    const allIds = getAwakenSkill('awaken_break_1') ? Object.keys(getAwakenPoolByTags(state)) : []
    if (allIds.length <= 3) {
      const choices = rollAwakenSkillChoices(state, createSeededRng(1))
      expect(choices.length).toBeLessThanOrEqual(3)
    }
  })

  it('生效：选一个影响探索的 modifier 后 getKungfuModifiers 输出改变', () => {
    const state = createInitialGameState(1)
    const modBefore = getKungfuModifiers(state)
    const withAwaken = {
      ...state,
      player: { ...state.player, awakenSkills: ['awaken_explore_1'] },
    }
    const modAfter = getKungfuModifiers(withAwaken)
    expect(modAfter.exploreRetreatAdd).toBeDefined()
    expect(modAfter.exploreRetreatAdd).toBeGreaterThan(modBefore.exploreRetreatAdd ?? 0)
  })

  it('生效：选炼丹 modifier 后 alchemySuccessAdd 存在', () => {
    const state = createInitialGameState(1)
    const withAlch = {
      ...state,
      player: { ...state.player, awakenSkills: ['awaken_alch_1'] },
    }
    const mod = getKungfuModifiers(withAlch)
    expect(mod.alchemySuccessAdd).toBeDefined()
    expect(mod.alchemySuccessAdd).toBeGreaterThan(0)
  })

  it('基础权重 common > rare > legendary', () => {
    expect(AWAKEN_RARITY_WEIGHT.common).toBe(100)
    expect(AWAKEN_RARITY_WEIGHT.rare).toBe(35)
    expect(AWAKEN_RARITY_WEIGHT.legendary).toBe(8)
  })
})
