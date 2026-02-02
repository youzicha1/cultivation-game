/**
 * TICKET-38: 天命丹 extraLife 在天劫结算中被消费生效
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game'
import { applyPillEffect, canUsePill } from './pill_effects'

describe('pill_effects_tribulation', () => {
  it('使用天命丹后 run.temp.tribulationExtraLife 增加', () => {
    let state = createInitialGameState(1)
    state = {
      ...state,
      player: {
        ...state.player,
        pillInventory: { fate_tribulation: { fan: 0, xuan: 0, di: 1, tian: 0 } },
      },
    }
    const { state: next } = applyPillEffect(state, { pillId: 'fate_tribulation', quality: 'di' }, 'tribulation')
    expect(next.run.temp?.tribulationExtraLife).toBe(1)
    expect(next.run.temp?.tribulationExtraAction).toBe(1)
    expect(next.player.pillInventory?.['fate_tribulation']?.['di']).toBe(0)
  })

  it('canUsePill 在 tribulation 场景下对天命丹(地)返回 true', () => {
    let state = createInitialGameState(1)
    state = {
      ...state,
      run: {
        ...state.run,
        tribulation: {
          level: 1,
          totalTurns: 3,
          turn: 0,
          shield: 0,
          debuffs: { mindChaos: 0, burn: 0, weak: 0 },
          wrath: 50,
          currentIntent: {
            id: 'strike',
            name: '雷',
            rarity: 'common',
            baseDamageMin: 5,
            baseDamageMax: 10,
            telegraphText: '雷',
            counterHint: '稳/护体',
            minTier: 0,
            baseWeight: 10,
          },
          log: [],
        },
      },
      player: {
        ...state.player,
        pillInventory: { fate_tribulation: { fan: 0, xuan: 0, di: 1, tian: 0 } },
      },
    }
    expect(canUsePill(state, { pillId: 'fate_tribulation', quality: 'di' }, 'tribulation')).toBe(true)
  })
})
