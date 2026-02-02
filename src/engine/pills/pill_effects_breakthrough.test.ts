/**
 * TICKET-38: 问心丹 breakthroughNoCostOnFail 失败不付代价
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game'
import { createSeededRng } from '../rng'
import { attemptBreakthrough, type BreakthroughPlan } from '../breakthrough/breakthrough'
import { applyPillEffect } from './pill_effects'

describe('pill_effects_breakthrough', () => {
  it('使用问心丹后 run.temp.breakthroughNoCostOnFail 为 true', () => {
    let state = createInitialGameState(1)
    state = {
      ...state,
      screen: 'breakthrough',
      player: {
        ...state.player,
        pillInventory: { ask_heart: { fan: 0, xuan: 0, di: 1, tian: 0 } },
      },
    }
    const { state: next } = applyPillEffect(state, { pillId: 'ask_heart', quality: 'di' }, 'breakthrough')
    expect(next.run.temp?.breakthroughNoCostOnFail).toBe(true)
  })

  it('问心丹生效时突破失败不扣血', () => {
    let state = createInitialGameState(42)
    state = {
      ...state,
      run: {
        ...state.run,
        temp: { breakthroughNoCostOnFail: true },
      },
      player: {
        ...state.player,
        hp: 80,
        maxHp: 100,
        realm: '练气',
        level: 99,
        stageIndex: 7,
        inheritancePoints: 0,
      },
    }
    const plan: BreakthroughPlan = { pills: [], inheritanceSpent: 0, focus: 'steady' }
    const rng = createSeededRng(999)
    const result = attemptBreakthrough(state, plan, rng)
    expect(result.success).toBe(false)
    expect(result.nextPlayer.hp).toBe(80)
  })
})
