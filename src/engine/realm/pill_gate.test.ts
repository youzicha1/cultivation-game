/**
 * TICKET-30: 凡人不能吃天丹；筑基可吃但每局上限生效（第二颗拒绝）
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game'
import { canTakePill, recordPillUse } from './gates'

describe('pill gate', () => {
  it('凡人不能吃天丹（境界不足）', () => {
    const state = createInitialGameState(1)
    const result = canTakePill(state, 'tian')
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/境界|以上/)
  })

  it('筑基可吃地丹；元婴可吃天丹（境界满足）', () => {
    const state = createInitialGameState(1)
    const s筑基 = { ...state, player: { ...state.player, realm: '筑基' } }
    expect(canTakePill(s筑基, 'di').ok).toBe(true)
    // realms.v1: tian minRealmOrder=4，仅元婴/化神可吃天丹
    const s元婴 = { ...state, player: { ...state.player, realm: '元婴' } }
    expect(canTakePill(s元婴, 'tian').ok).toBe(true)
  })

  it('天丹本局可多次使用（每次突破计划内最多 1 颗，由突破计划限制）', () => {
    const state = createInitialGameState(1)
    const player = { ...state.player, realm: '元婴' }
    const s0 = { ...state, player, run: state.run }
    expect(canTakePill(s0, 'tian').ok).toBe(true)
    const run1 = recordPillUse(state.run, 'tian')
    const s1 = { ...state, player, run: run1 }
    expect(canTakePill(s1, 'tian').ok).toBe(true)
  })
})
