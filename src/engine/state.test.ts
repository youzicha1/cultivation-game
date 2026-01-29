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
    expect(state.spiritStones).toBeGreaterThanOrEqual(0)
    expect(state.pity).toBeGreaterThanOrEqual(0)

    expect(state.materials.spirit_herb).toBe(0)
    expect(state.elixirs.qi_pill.fan).toBe(0)
    expect(state.recipesUnlocked.qi_pill_recipe).toBe(true)
    expect(state.recipesUnlocked.foundation_pill_recipe).toBe(false)
    expect(state.fragments.spirit_pill_recipe).toBe(0)
    expect(state.codex.totalBrews).toBe(0)
    expect(state.achievements).toEqual([])
    expect(state.relics).toEqual([])
    expect(state.equippedRelics).toEqual([null, null, null])
  })
})
