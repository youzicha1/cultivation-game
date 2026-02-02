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

    // 炼丹相关由 createInitialGameState + getAlchemyPlayerDefaults 动态填充，此处仅校验空结构
    expect(state.materials).toEqual({})
    expect(state.elixirs).toEqual({})
    expect(state.recipesUnlocked).toEqual({})
    expect(state.fragments).toEqual({})
    expect(state.codex.totalBrews).toBe(0)
    expect(state.codex.totalBooms).toBe(0)
    expect(state.codex.bestQualityByRecipe).toEqual({})
    expect(state.achievements).toEqual([])
    expect(state.relics).toEqual([])
    expect(state.equippedRelics).toEqual([null, null, null])
  })
})
