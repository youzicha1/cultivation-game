/**
 * TICKET-30: tier > max => successRate=0 或禁止
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game'
import { getTribulationGate } from './gates'

describe('tribulation gate', () => {
  it('凡人 tier 1 不允许（maxTier 0）', () => {
    const state = createInitialGameState(1)
    const gate = getTribulationGate(state, 1)
    expect(gate.allowed).toBe(false)
    expect(gate.successRateMultiplier).toBe(0)
    expect(gate.reason).toBeDefined()
  })

  it('凡人 tier 0 允许', () => {
    const state = createInitialGameState(1)
    const gate = getTribulationGate(state, 0)
    expect(gate.allowed).toBe(true)
    expect(gate.successRateMultiplier).toBe(1)
  })

  it('炼气 tier 2 允许', () => {
    const state = createInitialGameState(1)
    const player = { ...state.player, realm: '炼气' }
    const s = { ...state, player }
    const gate = getTribulationGate(s, 2)
    expect(gate.allowed).toBe(true)
  })

  it('炼气 tier 3 不允许', () => {
    const state = createInitialGameState(1)
    const player = { ...state.player, realm: '炼气' }
    const s = { ...state, player }
    const gate = getTribulationGate(s, 3)
    expect(gate.allowed).toBe(false)
  })
})
