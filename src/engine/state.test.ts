import { describe, it, expect } from 'vitest'
import { createInitialState } from './state'

describe('State', () => {
  describe('createInitialState', () => {
    it('应返回有效的初始状态', () => {
      const state = createInitialState()

      expect(state).toBeDefined()
      expect(state.realm).toBe('凡人')
      expect(state.exp).toBeGreaterThanOrEqual(0)
      expect(state.hp).toBe(state.maxHp) // hp 应等于 maxHp
      expect(state.hp).toBeGreaterThan(0)
      expect(state.maxHp).toBeGreaterThan(0)
      expect(state.inheritancePoints).toBeGreaterThanOrEqual(0)
    })

    it('hp 应等于 maxHp', () => {
      const state = createInitialState()
      expect(state.hp).toBe(state.maxHp)
    })

    it('exp 应非负', () => {
      const state = createInitialState()
      expect(state.exp).toBeGreaterThanOrEqual(0)
    })
  })
})
