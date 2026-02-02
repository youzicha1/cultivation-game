/**
 * TICKET-38: canUsePill 不同 context 可用性
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game'
import { canUsePill, getPillDef } from './pill_effects'

describe('pill_can_use', () => {
  it('无丹药时不可用', () => {
    const state = createInitialGameState(1)
    const ok = canUsePill(state, { pillId: 'guard_tribulation', quality: 'fan' }, 'tribulation')
    expect(ok).toBe(false)
  })

  it('有库存且 context 匹配时可用', () => {
    let state = createInitialGameState(1)
    state = {
      ...state,
      player: {
        ...state.player,
        pillInventory: {
          guard_tribulation: { fan: 0, xuan: 0, di: 0, tian: 0 },
        },
      },
    }
    state.player.pillInventory!['guard_tribulation']!['fan'] = 1
    state.run.tribulation = {
      level: 1,
      totalTurns: 3,
      turn: 0,
      shield: 0,
      debuffs: { mindChaos: 0, burn: 0, weak: 0 },
      wrath: 50,
      currentIntent: {
        id: 'strike',
        name: '雷击',
        rarity: 'common',
        baseDamageMin: 5,
        baseDamageMax: 10,
        telegraphText: '雷击',
        counterHint: '稳/护体可减伤',
        minTier: 0,
        baseWeight: 10,
      },
      log: [],
    }
    const ok = canUsePill(state, { pillId: 'guard_tribulation', quality: 'fan' }, 'tribulation')
    expect(ok).toBe(true)
  })

  it('天劫丹不能在修炼用', () => {
    let state = createInitialGameState(1)
    state = {
      ...state,
      screen: 'home',
      player: {
        ...state.player,
        pillInventory: { guard_tribulation: { fan: 1, xuan: 0, di: 0, tian: 0 } },
      },
    }
    const ok = canUsePill(state, { pillId: 'guard_tribulation', quality: 'fan' }, 'cultivate')
    expect(ok).toBe(false)
  })

  it('规则型天命丹仅地/天可用', () => {
    const def = getPillDef('fate_tribulation')
    expect(def?.ruleType).toBe('extraLife')
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
        pillInventory: { fate_tribulation: { fan: 1, xuan: 0, di: 0, tian: 0 } },
      },
    }
    expect(canUsePill(state, { pillId: 'fate_tribulation', quality: 'fan' }, 'tribulation')).toBe(false)
    state.player.pillInventory!['fate_tribulation']!['di'] = 1
    state.player.pillInventory!['fate_tribulation']!['fan'] = 0
    expect(canUsePill(state, { pillId: 'fate_tribulation', quality: 'di' }, 'tribulation')).toBe(true)
  })
})
