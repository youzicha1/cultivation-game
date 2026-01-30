import { describe, expect, it } from 'vitest'
import {
  getChain,
  getChains,
  getChapter,
  getChainTriggerRate,
  pickChainToStart,
  applyGuaranteedReward,
} from './chains'
import { createInitialState } from './state'
import { makePlayer } from './test/factories'
import { createSequenceRng } from './rng'

describe('chains', () => {
  it('getChains 返回至少 15 条链（TICKET-21 扩容后）', () => {
    const list = getChains()
    expect(list.length).toBeGreaterThanOrEqual(15)
  })

  it('getChain 返回指定链', () => {
    const c = getChain('map_to_legacy')
    expect(c).toBeDefined()
    expect(c?.name).toBe('残图引路')
    expect(c?.chapters.length).toBe(3)
  })

  it('getChapter 返回指定章', () => {
    const ch = getChapter('map_to_legacy', 2)
    expect(ch).toBeDefined()
    expect(ch?.title).toBe('秘窟')
    expect(ch?.final).toBeFalsy()
  })

  it('getChainTriggerRate danger<50 为 8%', () => {
    expect(getChainTriggerRate(0)).toBe(0.08)
    expect(getChainTriggerRate(49)).toBe(0.08)
  })

  it('getChainTriggerRate danger>=50 为 12%', () => {
    expect(getChainTriggerRate(50)).toBe(0.12)
    expect(getChainTriggerRate(74)).toBe(0.12)
  })

  it('getChainTriggerRate danger>=75 为 18%', () => {
    expect(getChainTriggerRate(75)).toBe(0.18)
    expect(getChainTriggerRate(100)).toBe(0.18)
  })

  it('getChainTriggerRate debug 时 danger>=50 为 100%', () => {
    expect(getChainTriggerRate(50, true)).toBe(1)
    expect(getChainTriggerRate(75, true)).toBe(1)
    expect(getChainTriggerRate(30, true)).toBe(0.08)
  })

  it('pickChainToStart 未完成链时从可用链中随机选一条', () => {
    // pickChainToStart 只负责选链，不检查触发率（触发率检查在 game.ts 中）
    const rng = createSequenceRng([0.0])
    const picked = pickChainToStart(rng, {}, 80)
    expect(picked).not.toBeNull()
    expect(picked?.chainId).toBeDefined()
  })

  it('pickChainToStart 所有链已完成时返回 null', () => {
    const rng = createSequenceRng([0.0])
    const allChains = getChains()
    const allCompleted = Object.fromEntries(allChains.map((c) => [c.chainId, true])) as Record<string, boolean>
    const picked = pickChainToStart(rng, allCompleted, 80)
    expect(picked).toBeNull()
  })

  it('applyGuaranteedReward kungfu 未拥有则加入 relics', () => {
    const player = createInitialState()
    const { player: next } = applyGuaranteedReward(player, { type: 'kungfu', id: 'fire_suppress' })
    expect(next.relics).toContain('fire_suppress')
  })

  it('applyGuaranteedReward kungfu 已有则传承点+1', () => {
    const player = makePlayer({ relics: ['fire_suppress'] })
    const { player: next } = applyGuaranteedReward(player, { type: 'kungfu', id: 'fire_suppress' })
    expect(next.inheritancePoints).toBe(player.inheritancePoints + 1)
  })

  it('applyGuaranteedReward epic_material_elixir 加材料与传承点', () => {
    const player = createInitialState()
    const { player: next } = applyGuaranteedReward(player, {
      type: 'epic_material_elixir',
      materialId: 'moon_dew',
      materialCount: 2,
      inheritanceFallback: 1,
    })
    expect(next.materials.moon_dew).toBe(2)
    expect(next.inheritancePoints).toBe(1)
  })

  it('applyGuaranteedReward recipe 解锁配方', () => {
    const player = createInitialState()
    const { player: next } = applyGuaranteedReward(player, { type: 'recipe', recipeId: 'spirit_pill_recipe' })
    expect(next.recipesUnlocked.spirit_pill_recipe).toBe(true)
  })

  it('applyGuaranteedReward shop_discount 返回 runDelta', () => {
    const player = createInitialState()
    const { runDelta } = applyGuaranteedReward(player, { type: 'shop_discount', percent: 10 })
    expect(runDelta?.shopDiscountPercent).toBe(10)
  })

  it('applyGuaranteedReward tribulation_bonus 返回 runDelta', () => {
    const player = createInitialState()
    const { runDelta } = applyGuaranteedReward(player, { type: 'tribulation_bonus', dmgReductionPercent: 15 })
    expect(runDelta?.tribulationDmgReductionPercent).toBe(15)
  })
})
