/**
 * TICKET-38: 遁空丹 exploreFreeRetreat 在收手时消费、无损撤退
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game'
import { applyPillEffect } from './pill_effects'

describe('pill_effects_explore', () => {
  it('使用遁空丹后 run.temp.exploreFreeRetreat 增加', () => {
    let state = createInitialGameState(1)
    state = {
      ...state,
      screen: 'explore',
      player: {
        ...state.player,
        pillInventory: { escape_explore: { fan: 0, xuan: 0, di: 1, tian: 0 } },
      },
    }
    const { state: next } = applyPillEffect(state, { pillId: 'escape_explore', quality: 'di' }, 'explore')
    expect(next.run.temp?.exploreFreeRetreat).toBe(1)
    expect(next.player.pillInventory?.['escape_explore']?.['di']).toBe(0)
  })
})
