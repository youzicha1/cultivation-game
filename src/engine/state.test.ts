import { describe, expect, it } from 'vitest'
import { createInitialState } from './state'

describe('state', () => {
  it('createInitialState 返回有效初始状态', () => {
    const state = createInitialState()

    expect(state.realm).toBe('凡人')
    expect(state.exp).toBeGreaterThanOrEqual(0)
    expect(state.hp).toBe(state.maxHp)
    expect(state.hp).toBeGreaterThan(0)
    expect(state.maxHp).toBeGreaterThan(0)
    expect(state.inheritancePoints).toBeGreaterThanOrEqual(0)
    expect(state.pills).toBeGreaterThanOrEqual(0)
  })
})
