import { describe, expect, it } from 'vitest'
import { getAlchemyShortage, getAlchemyChances, type AlchemySelection } from './alchemy_calc'
import { createInitialGameState } from './game'

describe('alchemy_calc', () => {
  describe('getAlchemyShortage', () => {
    it('缺口计算正确：need - have = missing', () => {
      const state = createInitialGameState(1)
      const selection: AlchemySelection = { recipeId: 'qi_pill_recipe', batch: 1, heat: 'push' }
      const { shortages, canBrew } = getAlchemyShortage(state, selection)
      expect(shortages.every((s) => s.missing === Math.max(0, s.need - s.have) && s.missing > 0)).toBe(true)
      expect(canBrew).toBe(shortages.length === 0)
    })

    it('batch=2 时 need 翻倍，缺口正确', () => {
      const state = createInitialGameState(1)
      const withMaterials = {
        ...state,
        player: {
          ...state.player,
          materials: { ...state.player.materials, spirit_herb: 2, moon_dew: 1 },
        },
      }
      const selection: AlchemySelection = { recipeId: 'qi_pill_recipe', batch: 2, heat: 'push' }
      const { shortages, canBrew } = getAlchemyShortage(withMaterials, selection)
      expect(shortages.some((s) => s.materialId === 'spirit_herb' && s.need === 4)).toBe(true)
      expect(shortages.some((s) => s.materialId === 'moon_dew' && s.need === 2)).toBe(true)
      expect(canBrew).toBe(false)
    })

    it('材料足够时 canBrew=true，shortages 为空', () => {
      const state = createInitialGameState(1)
      const withMaterials = {
        ...state,
        player: {
          ...state.player,
          materials: { ...state.player.materials, spirit_herb: 10, moon_dew: 10 },
        },
      }
      const selection: AlchemySelection = { recipeId: 'qi_pill_recipe', batch: 1, heat: 'push' }
      const { shortages, canBrew } = getAlchemyShortage(withMaterials, selection)
      expect(shortages.length).toBe(0)
      expect(canBrew).toBe(true)
    })
  })

  describe('getAlchemyChances', () => {
    it('successRate 与 boomRate 在 0..1，breakdown 可预期', () => {
      const state = createInitialGameState(1)
      const selection: AlchemySelection = { recipeId: 'qi_pill_recipe', batch: 1, heat: 'push' }
      const result = getAlchemyChances(state, selection)
      expect(result).not.toBeNull()
      expect(result!.successRate).toBeGreaterThanOrEqual(0)
      expect(result!.successRate).toBeLessThanOrEqual(1)
      expect(result!.boomRate).toBeGreaterThanOrEqual(0)
      expect(result!.boomRate).toBeLessThanOrEqual(1)
      expect(result!.breakdown.success.base).toBeGreaterThan(0)
      expect(result!.breakdown.boom.base).toBeGreaterThanOrEqual(0)
      expect(result!.breakdown.success.final).toBe(result!.successRate)
      expect(result!.breakdown.boom.final).toBe(result!.boomRate)
    })

    it('稳火时爆丹率低于冲火', () => {
      const state = createInitialGameState(1)
      const steady = getAlchemyChances(state, { recipeId: 'qi_pill_recipe', batch: 1, heat: 'steady' })
      const push = getAlchemyChances(state, { recipeId: 'qi_pill_recipe', batch: 1, heat: 'push' })
      expect(steady!.boomRate).toBeLessThanOrEqual(push!.boomRate)
    })

    it('爆火时爆丹率高于冲火', () => {
      const state = createInitialGameState(1)
      const blast = getAlchemyChances(state, { recipeId: 'qi_pill_recipe', batch: 1, heat: 'blast' })
      const push = getAlchemyChances(state, { recipeId: 'qi_pill_recipe', batch: 1, heat: 'push' })
      expect(blast!.boomRate).toBeGreaterThanOrEqual(push!.boomRate)
    })

    it('无效 recipeId 返回 null', () => {
      const state = createInitialGameState(1)
      const result = getAlchemyChances(state, {
        recipeId: 'invalid_recipe' as any,
        batch: 1,
        heat: 'push',
      })
      expect(result).toBeNull()
    })
  })
})
