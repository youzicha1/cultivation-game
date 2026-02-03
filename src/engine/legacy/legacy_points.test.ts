/**
 * TICKET-40: 结局传承点结算 — 规则可测
 */

import { createInitialGameState, type GameState } from '../game'
import { calcLegacyPointsOnEnd } from './legacy_points'

function stateWithCleared(cleared: number, failedAt?: number): GameState {
  const base = createInitialGameState(1)
  const run = {
    ...base.run,
    tribulationLevel: cleared,
    tribulationsCleared: cleared,
  }
  if (failedAt != null) {
    (run as { tribulation?: unknown }).tribulation = {
      level: failedAt,
      totalTurns: 3,
      turn: 0,
      shield: 0,
      debuffs: { mindChaos: 0, burn: 0, weak: 0 },
      wrath: 50,
      currentIntent: { id: 'x', name: 'x', baseDamageMin: 10, baseDamageMax: 20 },
      log: [],
    }
  }
  return { ...base, run }
}

describe('legacy_points (TICKET-40)', () => {
  it('victory: cleared=12 -> base 12 + milestone 2+3+4+8 + bonus 20 = 49', () => {
    const state = stateWithCleared(12)
    expect(calcLegacyPointsOnEnd(state, 'victory')).toBe(49)
  })

  it('death at 1: cleared=0, failedAt=1 -> 0 + floor(1/2)=0', () => {
    const state = stateWithCleared(0, 1)
    expect(calcLegacyPointsOnEnd(state, 'death')).toBe(0)
  })

  it('death at 5: cleared=4, failedAt=5 -> 4 + 2(milestone) + floor(5/2)=2 -> 8', () => {
    const state = stateWithCleared(4, 5)
    expect(calcLegacyPointsOnEnd(state, 'death')).toBe(4 + 2 + Math.floor(5 / 2))
  })

  it('death at 12: cleared=11, failedAt=12 -> 11 + 2+3+4 + floor(12/2)=6 -> 26', () => {
    const state = stateWithCleared(11, 12)
    expect(calcLegacyPointsOnEnd(state, 'death')).toBe(11 + 2 + 3 + 4 + 6)
  })

  it('milestone: cleared 3 -> +2, cleared 6 -> +3, cleared 9 -> +4', () => {
    expect(calcLegacyPointsOnEnd(stateWithCleared(2, 3), 'death')).toBe(2 + Math.floor(3 / 2))
    expect(calcLegacyPointsOnEnd(stateWithCleared(3, 4), 'death')).toBe(3 + 2 + Math.floor(4 / 2))
    expect(calcLegacyPointsOnEnd(stateWithCleared(6, 7), 'death')).toBe(6 + 2 + 3 + Math.floor(7 / 2))
    expect(calcLegacyPointsOnEnd(stateWithCleared(9, 10), 'death')).toBe(9 + 2 + 3 + 4 + Math.floor(10 / 2))
  })

  it('abandon: no extra failure compensation (only milestone 3, not 6)', () => {
    const state = stateWithCleared(5)
    expect(calcLegacyPointsOnEnd(state, 'abandon')).toBe(5 + 2)
  })
})
