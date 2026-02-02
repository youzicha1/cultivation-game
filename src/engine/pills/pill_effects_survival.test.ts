/**
 * TICKET-38: 龟息丹 survivalCheatDeath 免死一次
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game'
import { applyPillEffect } from './pill_effects'

describe('pill_effects_survival', () => {
  it('使用龟息丹后 run.temp.survivalCheatDeath 增加', () => {
    let state = createInitialGameState(1)
    state = {
      ...state,
      player: {
        ...state.player,
        pillInventory: { turtle_breath: { fan: 0, xuan: 0, di: 1, tian: 0 } },
      },
    }
    const { state: next } = applyPillEffect(state, { pillId: 'turtle_breath', quality: 'di' }, 'survival')
    expect(next.run.temp?.survivalCheatDeath).toBe(1)
    expect(next.player.pillInventory?.['turtle_breath']?.['di']).toBe(0)
  })
})
