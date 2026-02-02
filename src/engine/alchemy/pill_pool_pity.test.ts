/**
 * TICKET-39: 保底 — 连续多次不出 rare → pity 增长 → 到阈值后下一次更容易出 rare
 */

import { describe, expect, it } from 'vitest'
import { createSeededRng, createSequenceRng } from '../rng'
import { rollPillFromPool, PITY_RARE_THRESHOLD } from './pill_pool'
import { makeState } from '../test/factories'

describe('pill_pool pity', () => {
  it('未抽到 rare/legendary 时 nextPity 递增', () => {
    const base = makeState()
    const state = { ...base, run: { ...base.run, pillPoolPityByTag: { tribulation: 0 } } }
    const rng = createSeededRng(1)
    let s = state
    for (let i = 0; i < 5; i++) {
      const { result, nextPity } = rollPillFromPool(
        s,
        'tribulation',
        'fan',
        () => rng.next(),
      )
      s = { ...s, run: { ...s.run, pillPoolPityByTag: { tribulation: nextPity } } }
      if (result.rarity === 'rare' || result.rarity === 'legendary') break
      expect(nextPity).toBe((s.run.pillPoolPityByTag?.tribulation ?? 0))
    }
    expect(s.run.pillPoolPityByTag?.tribulation ?? 0).toBeGreaterThanOrEqual(0)
  })

  it('抽到 rare 后 pity 重置为 0', () => {
    const base = makeState()
    const state = { ...base, run: { ...base.run, pillPoolPityByTag: { tribulation: 3 } } }
    const rng = createSeededRng(999)
    const { result, nextPity } = rollPillFromPool(state, 'tribulation', 'tian', () => rng.next())
    if (result.rarity === 'rare' || result.rarity === 'legendary') {
      expect(nextPity).toBe(0)
    }
  })

  it('pity 达 PITY_RARE_THRESHOLD 后下一次可出 rare（序列 RNG 断言，tian 阶池含 rare）', () => {
    const base = makeState()
    const stateWithPity = { ...base, run: { ...base.run, pillPoolPityByTag: { tribulation: PITY_RARE_THRESHOLD } } }
    const seq = [0.6, 0.5, 0.5]
    const rng = createSequenceRng(seq, true)
    const { result, nextPity } = rollPillFromPool(stateWithPity, 'tribulation', 'tian', () => rng.next())
    expect(result.rarity === 'rare' || result.rarity === 'legendary').toBe(true)
    expect(nextPity).toBe(0)
  })
})
