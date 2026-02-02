/**
 * TICKET-39: 池抽取 — sequence rng 控制下能抽到指定 pillId；
 * rulePill 在 recipeTier<tian 时永远抽不到；tier 越高 rare 命中率提高
 */

import { describe, expect, it } from 'vitest'
import { createSeededRng, createSequenceRng } from '../rng'
import { getPillPool, rollPillFromPool, getPoolPreviewByRarity } from './pill_pool'
import { makeState } from '../test/factories'

describe('pill_pool getPillPool', () => {
  it('tribulation 池包含 4 种丹且含天命丹', () => {
    const pool = getPillPool('tribulation')
    expect(pool.length).toBe(4)
    expect(pool.some((p) => p.id === 'fate_tribulation')).toBe(true)
  })

  it('utility 池为全池（所有机制丹）', () => {
    const pool = getPillPool('utility')
    const trib = getPillPool('tribulation')
    expect(pool.length).toBeGreaterThanOrEqual(trib.length)
    expect(pool.length).toBeGreaterThanOrEqual(24)
  })
})

describe('pill_pool rollPillFromPool', () => {
  it('sequence rng 控制下能抽到指定 pillId（tribulation 池）', () => {
    const base = makeState()
    const state = { ...base, run: { ...base.run, pillPoolPityByTag: {} } }
    const seq = [0.001, 0.5, 0.5]
    const rng = createSequenceRng(seq, true)
    const { result } = rollPillFromPool(state, 'tribulation', 'fan', () => rng.next())
    expect(result.pillId).toBeDefined()
    const pool = getPillPool('tribulation')
    expect(pool.some((p) => p.id === result.pillId)).toBe(true)
  })

  it('rulePill 在 recipeTier 为 fan 时永远抽不到', () => {
    const base = makeState()
    const state = { ...base, run: { ...base.run, pillPoolPityByTag: {} } }
    let ruleCount = 0
    for (let i = 0; i < 50; i++) {
      const rng = createSeededRng(1000 + i)
      const { result } = rollPillFromPool(state, 'tribulation', 'fan', () => rng.next())
      if (result.isRulePill) ruleCount++
    }
    expect(ruleCount).toBe(0)
  })

  it('rulePill 在 recipeTier 为 xuan 时永远抽不到', () => {
    const base = makeState()
    const state = { ...base, run: { ...base.run, pillPoolPityByTag: {} } }
    let ruleCount = 0
    for (let i = 0; i < 50; i++) {
      const rng = createSeededRng(2000 + i)
      const { result } = rollPillFromPool(state, 'survival', 'xuan', () => rng.next())
      if (result.isRulePill) ruleCount++
    }
    expect(ruleCount).toBe(0)
  })

  it('tier 为 tian 时可能抽到 rulePill', () => {
    const base = makeState()
    const state = { ...base, run: { ...base.run, pillPoolPityByTag: {} } }
    let ruleCount = 0
    for (let i = 0; i < 200; i++) {
      const rng = createSeededRng(3000 + i)
      const { result } = rollPillFromPool(state, 'tribulation', 'tian', () => rng.next())
      if (result.isRulePill) ruleCount++
    }
    expect(ruleCount).toBeGreaterThan(0)
  })

  it('tier 越高 rare 命中率提高（统计）', () => {
    const base = makeState()
    const state = { ...base, run: { ...base.run, pillPoolPityByTag: {} } }
    const runs = 500
    let fanRare = 0
    let tianRare = 0
    for (let i = 0; i < runs; i++) {
      const rngFan = createSeededRng(4000 + i)
      const rngTian = createSeededRng(5000 + i)
      const resFan = rollPillFromPool(state, 'breakthrough', 'fan', () => rngFan.next())
      const resTian = rollPillFromPool(state, 'breakthrough', 'tian', () => rngTian.next())
      if (resFan.result.rarity === 'rare' || resFan.result.rarity === 'legendary') fanRare++
      if (resTian.result.rarity === 'rare' || resTian.result.rarity === 'legendary') tianRare++
    }
    const rateFan = fanRare / runs
    const rateTian = tianRare / runs
    expect(rateTian).toBeGreaterThan(rateFan)
  })
})

describe('pill_pool getPoolPreviewByRarity', () => {
  it('tribulation 池预览含 common/rare 数量', () => {
    const preview = getPoolPreviewByRarity('tribulation')
    expect(preview.common).toBeGreaterThanOrEqual(0)
    expect(preview.rare).toBeGreaterThanOrEqual(0)
    expect(preview.common + preview.rare).toBe(4)
  })
})
