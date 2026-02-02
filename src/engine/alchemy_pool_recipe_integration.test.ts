/**
 * TICKET-39: 用 outputMode=pool 的 recipe 炼丹成功后，背包新增 {pillId, quality} 且 pillId 属于正确 tag 池
 */

import { describe, expect, it } from 'vitest'
import { getRecipe, resolveBrew, alchemyRecipes } from './alchemy'
import { getPillPool } from './alchemy/pill_pool'
import { makeState } from './test/factories'

describe('alchemy pool recipe integration', () => {
  const poolRecipes = alchemyRecipes.filter((r) => r.outputMode === 'pool' && r.pillPoolTag)

  it('存在 outputMode=pool 的丹方', () => {
    expect(poolRecipes.length).toBeGreaterThanOrEqual(6)
  })

  it('用护劫丹炉炼制成功后背包新增机制丹且属于 tribulation 池', () => {
    const recipeId = 'generic_tribulation_recipe'
    const recipe = getRecipe(recipeId)
    expect(recipe).toBeDefined()
    expect(recipe!.outputMode).toBe('pool')
    expect(recipe!.pillPoolTag).toBe('tribulation')

    let state = makeState()
    state = {
      ...state,
      player: {
        ...state.player,
        materials: { ...state.player.materials, spirit_herb: 10, moon_dew: 10, iron_sand: 10 },
        recipesUnlocked: { ...state.player.recipesUnlocked, [recipeId]: true },
        pillInventory: {},
      },
    }

    const rng = () => 0.01
    const randInt = () => 1
    const { next, outcome } = resolveBrew(state, recipeId, 1, rng, randInt, 'wen')

    if (outcome.success && outcome.poolPill) {
      expect(next.player.pillInventory).toBeDefined()
      const inv = next.player.pillInventory![outcome.poolPill.pillId]
      expect(inv).toBeDefined()
      expect(inv[outcome.poolPill.quality]).toBeGreaterThanOrEqual(1)

      const pool = getPillPool('tribulation')
      expect(pool.some((p) => p.id === outcome.poolPill!.pillId)).toBe(true)
    }
  })

  it('pool 丹方炼制成功时 outcome 含 poolPill 且 pillId 属于该池', () => {
    const recipeId = 'generic_explore_recipe'
    const recipe = getRecipe(recipeId)
    expect(recipe?.pillPoolTag).toBe('explore')

    let state = makeState()
    state = {
      ...state,
      player: {
        ...state.player,
        materials: { ...state.player.materials, spirit_herb: 10, beast_core: 10, moon_dew: 10 },
        recipesUnlocked: { ...state.player.recipesUnlocked, [recipeId]: true },
        pillInventory: {},
      },
    }

    let successWithPool = false
    for (let seed = 0; seed < 100; seed++) {
      const rng = () => (seed * 0.0101) % 1
      const randInt = () => 1
      const { next, outcome } = resolveBrew(state, recipeId, 1, rng, randInt, 'wu')
      if (outcome.success && outcome.poolPill) {
        successWithPool = true
        const pool = getPillPool('explore')
        expect(pool.some((p) => p.id === outcome.poolPill!.pillId)).toBe(true)
        expect(next.player.pillInventory?.[outcome.poolPill.pillId]).toBeDefined()
        break
      }
    }
    expect(successWithPool).toBe(true)
  })
})
