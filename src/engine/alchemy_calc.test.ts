import { describe, expect, it } from 'vitest'
import { getAlchemyShortage, getAlchemyChances, type AlchemySelection } from './alchemy_calc'
import type { GameState } from './game'
import { createInitialGameState } from './game'
import { makeState } from './test/factories'

describe('alchemy_calc', () => {
  describe('getAlchemyShortage', () => {
    it('缺口计算正确：need - have = missing', () => {
      const state = createInitialGameState(1)
      const selection: AlchemySelection = { recipeId: 'qi_pill_recipe', batch: 1, heat: 'wu' }
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
      const selection: AlchemySelection = { recipeId: 'qi_pill_recipe', batch: 2, heat: 'wu' }
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
      const selection: AlchemySelection = { recipeId: 'qi_pill_recipe', batch: 1, heat: 'wu' }
      const { shortages, canBrew } = getAlchemyShortage(withMaterials, selection)
      expect(shortages.length).toBe(0)
      expect(canBrew).toBe(true)
    })
  })

  describe('getAlchemyChances', () => {
    it('successRate 与 boomRate 在 0..1，breakdown 可预期', () => {
      const state = createInitialGameState(1)
      const selection: AlchemySelection = { recipeId: 'qi_pill_recipe', batch: 1, heat: 'wu' }
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

    it('TICKET-32: qualityDist 存在且 sum=1，凡方只出凡', () => {
      const state = createInitialGameState(1)
      const result = getAlchemyChances(state, { recipeId: 'qi_pill_recipe', batch: 1, heat: 'wu' })
      expect(result).not.toBeNull()
      const d = result!.qualityDist
      expect(d.fan + d.xuan + d.di + d.tian).toBeCloseTo(1, 9)
      expect(d.fan).toBe(1)
      expect(d.xuan).toBe(0)
      expect(d.di).toBe(0)
      expect(d.tian).toBe(0)
      expect(result!.breakdown.qualityDist).toEqual(d)
    })

    it('文火时爆丹率低于武火', () => {
      const state = createInitialGameState(1)
      const wen = getAlchemyChances(state, { recipeId: 'qi_pill_recipe', batch: 1, heat: 'wen' })
      const wu = getAlchemyChances(state, { recipeId: 'qi_pill_recipe', batch: 1, heat: 'wu' })
      expect(wen!.boomRate).toBeLessThanOrEqual(wu!.boomRate)
    })

    it('真火时爆丹率高于武火', () => {
      const state = createInitialGameState(1)
      const zhen = getAlchemyChances(state, { recipeId: 'qi_pill_recipe', batch: 1, heat: 'zhen' })
      const wu = getAlchemyChances(state, { recipeId: 'qi_pill_recipe', batch: 1, heat: 'wu' })
      expect(zhen!.boomRate).toBeGreaterThanOrEqual(wu!.boomRate)
    })

    it('无效 recipeId 返回 null', () => {
      const state = createInitialGameState(1)
      const result = getAlchemyChances(state, {
        recipeId: 'invalid_recipe' as any,
        batch: 1,
        heat: 'wu',
      })
      expect(result).toBeNull()
    })

    it('TICKET-22: 装备丹修功法后 successRate 更高', () => {
      const stateNoKungfu = createInitialGameState(1)
      const stateWithDanxiu = makeState({ player: { relics: ['fire_suppress'], equippedRelics: ['fire_suppress', null, null] } } as Partial<GameState>, 1)
      const selection: AlchemySelection = { recipeId: 'qi_pill_recipe', batch: 1, heat: 'wu' }
      const chancesNo = getAlchemyChances(stateNoKungfu, selection)
      const chancesWith = getAlchemyChances(stateWithDanxiu, selection)
      expect(chancesWith!.successRate).toBeGreaterThan(chancesNo!.successRate)
      expect(chancesWith!.breakdown.success.kungfuSuccessAdd).toBe(0.04)
    })

    it('TICKET-22: 装备向天诀时 getAlchemyShortage 使用 alchemyCostMult', () => {
      const stateWithHeaven = makeState({ player: { relics: ['heaven_shift'], equippedRelics: ['heaven_shift', null, null] } } as Partial<GameState>, 1)
      const selection: AlchemySelection = { recipeId: 'qi_pill_recipe', batch: 1, heat: 'wu' }
      const { shortages } = getAlchemyShortage(stateWithHeaven, selection)
      expect(shortages.length).toBeGreaterThanOrEqual(0)
      expect(shortages.every((s) => s.need >= 1 && s.missing >= 0)).toBe(true)
    })
  })
})
