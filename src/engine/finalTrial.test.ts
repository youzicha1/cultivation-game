import { describe, expect, it } from 'vitest'
import {
  computeThreat,
  computeInitialResolve,
  getDmgBase,
  applySteadyDamage,
  applyGamble,
  GAMBLE_SUCCESS_RATE,
  applySacrificeDamage,
  canSacrifice,
  computeEndingId,
  getFinalRewards,
  ENDING_TITLES,
  type EndingId,
} from './finalTrial'
import type { GameState } from './game'
import { createInitialGameState } from './game'
import { createInitialState } from './state'

function mockState(overrides: Partial<GameState> = {}): GameState {
  const base = createInitialGameState(1)
  return { ...base, ...overrides }
}

describe('finalTrial', () => {
  describe('computeThreat', () => {
    it('clamps threat to [60, 140]', () => {
      const state = mockState({
        player: createInitialState(),
        run: { ...createInitialGameState(1).run, danger: 0 },
      })
      const t = computeThreat(state)
      expect(t).toBeGreaterThanOrEqual(60)
      expect(t).toBeLessThanOrEqual(140)
    })

    it('increases with realm and danger', () => {
      const base = createInitialGameState(1)
      const low = { ...base, player: { ...base.player, realm: '凡人' as const }, run: { ...base.run, danger: 0 } }
      const high = { ...base, player: { ...base.player, realm: '金丹' as const }, run: { ...base.run, danger: 80 } }
      expect(computeThreat(high)).toBeGreaterThan(computeThreat(low))
    })
  })

  describe('computeInitialResolve', () => {
    it('returns positive resolve from maxHp and realm', () => {
      const state = mockState()
      const r = computeInitialResolve(state)
      expect(r).toBeGreaterThan(0)
    })
  })

  describe('getDmgBase', () => {
    it('increases with step', () => {
      const d1 = getDmgBase(80, 1)
      const d2 = getDmgBase(80, 2)
      const d3 = getDmgBase(80, 3)
      expect(d2).toBeGreaterThan(d1)
      expect(d3).toBeGreaterThan(d2)
    })
  })

  describe('applySteadyDamage', () => {
    it('returns dmg >= 1 and resolveDelta', () => {
      const { dmg, resolveDelta } = applySteadyDamage(20, 50)
      expect(dmg).toBeGreaterThanOrEqual(1)
      expect(resolveDelta).toBe(2)
    })
  })

  describe('applyGamble', () => {
    it('success: lower dmg and resolveDelta', () => {
      const res = applyGamble(20, 10, 0.0)
      expect(res.success).toBe(true)
      expect(res.dmg).toBeLessThanOrEqual(Math.ceil(20 * 0.6) + 1)
      expect(res.resolveDelta).toBe(6)
    })

    it('fail: higher dmg and resolveDelta 0', () => {
      const res = applyGamble(20, 10, 0.99)
      expect(res.success).toBe(false)
      expect(res.dmg).toBeGreaterThanOrEqual(Math.floor(20 * 1.4))
      expect(res.resolveDelta).toBe(0)
    })
  })

  describe('applySacrificeDamage', () => {
    it('returns dmg, shield, heal, resolveDelta by kind', () => {
      const spirit = applySacrificeDamage(15, 'spirit_stones')
      expect(spirit.shield).toBe(8)
      expect(spirit.dmg).toBe(Math.max(1, 15 - 8))

      const pills = applySacrificeDamage(15, 'pills')
      expect(pills.heal).toBe(10)
    })
  })

  describe('canSacrifice', () => {
    it('returns false when resource insufficient', () => {
      const base = createInitialGameState(1)
      const state = { ...base, player: { ...base.player, spiritStones: 0 } }
      expect(canSacrifice(state, 'spirit_stones')).toBe(false)
    })

    it('returns true when resource sufficient', () => {
      const base = createInitialGameState(1)
      const state = { ...base, player: { ...base.player, spiritStones: 50 } }
      expect(canSacrifice(state, 'spirit_stones')).toBe(true)
    })
  })

  describe('computeEndingId', () => {
    it('hp <= 0 -> dead', () => {
      expect(computeEndingId(0, 50, 60)).toBe('dead')
      expect(computeEndingId(-1, 100, 50)).toBe('dead')
    })

    it('score >= 20 -> ascend', () => {
      expect(computeEndingId(10, 90, 60)).toBe('ascend')
    })

    it('score in [-5, 19] -> retire', () => {
      expect(computeEndingId(10, 65, 60)).toBe('retire')
      expect(computeEndingId(10, 74, 60)).toBe('retire')
    })

    it('score < -5 -> demon', () => {
      expect(computeEndingId(10, 50, 60)).toBe('demon')
    })
  })

  describe('getFinalRewards', () => {
    it('ascend: legacy +3, shards +3', () => {
      const r = getFinalRewards('ascend')
      expect(r.legacyBonus).toBe(3)
      expect(r.shardsBonus).toBe(3)
    })

    it('retire: legacy +2, shards +2', () => {
      const r = getFinalRewards('retire')
      expect(r.legacyBonus).toBe(2)
      expect(r.shardsBonus).toBe(2)
    })

    it('demon: legacy +2, shards +1, demonUnlock', () => {
      const r = getFinalRewards('demon')
      expect(r.legacyBonus).toBe(2)
      expect(r.shardsBonus).toBe(1)
      expect(r.demonUnlock).toBe(true)
    })

    it('dead: legacy +1, shards +1', () => {
      const r = getFinalRewards('dead')
      expect(r.legacyBonus).toBe(1)
      expect(r.shardsBonus).toBe(1)
    })
  })

  describe('ENDING_TITLES', () => {
    it('has title for each ending', () => {
      const ids: EndingId[] = ['ascend', 'retire', 'demon', 'dead']
      ids.forEach((id) => {
        expect(ENDING_TITLES[id]).toBeTruthy()
        expect(ENDING_TITLES[id].length).toBeGreaterThan(0)
      })
    })
  })
})
