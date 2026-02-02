/**
 * TICKET-30: level==cap 时 applyExpGain 不增长；突破后 cap 提升可继续增长
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game'
import { getLevelCap, applyExpGain } from './gates'

describe('level cap', () => {
  it('level < cap 时 applyExpGain 增加 exp/level', () => {
    const state = createInitialGameState(1)
    const cap = getLevelCap(state)
    expect(cap).toBeGreaterThanOrEqual(15)
    const { nextPlayer, capped } = applyExpGain(state, 20)
    expect(capped).toBe(false)
    expect(nextPlayer.exp).toBeGreaterThanOrEqual(0)
    expect(nextPlayer.level).toBeGreaterThanOrEqual(1)
  })

  it('level === cap 时 applyExpGain 不增长，capped=true', () => {
    const state = createInitialGameState(1)
    const player = { ...state.player, realm: '凡人', level: 15, exp: 0 }
    const s = { ...state, player }
    const cap = getLevelCap(s)
    expect(cap).toBe(15)
    const { nextPlayer, capped, message } = applyExpGain(s, 100)
    expect(capped).toBe(true)
    expect(message).toMatch(/上限|突破/)
    expect(nextPlayer.level).toBe(15)
    expect(nextPlayer.exp).toBe(0)
  })

  it('突破后 cap 提升可继续增长', () => {
    const state = createInitialGameState(1)
    const player = { ...state.player, realm: '炼气', level: 16, exp: 0 }
    const s = { ...state, player }
    const cap = getLevelCap(s)
    expect(cap).toBe(30)
    const { nextPlayer, capped } = applyExpGain(s, 50)
    expect(capped).toBe(false)
    expect(nextPlayer.level).toBeGreaterThanOrEqual(16)
  })
})
