/**
 * TICKET-30: 低境界不能装备高阶功法；突破后可装备
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game'
import { canEquipKungfu } from './gates'
import { RELIC_IDS } from '../relics'

describe('kungfu gate', () => {
  it('凡人只能装备 common 功法', () => {
    const state = createInitialGameState(1)
    const steadyHeart = 'steady_heart'
    const result = canEquipKungfu(state, steadyHeart)
    expect(result.ok).toBe(true)
  })

  it('凡人不能装备 legendary 功法', () => {
    const state = createInitialGameState(1)
    const legendaryEye = 'legendary_eye'
    const result = canEquipKungfu(state, legendaryEye)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/境界|装备/)
  })

  it('化神可装备任意功法', () => {
    const state = createInitialGameState(1)
    const player = { ...state.player, realm: '化神' }
    const s = { ...state, player }
    for (const id of RELIC_IDS) {
      const result = canEquipKungfu(s, id)
      expect(result.ok).toBe(true)
    }
  })
})
