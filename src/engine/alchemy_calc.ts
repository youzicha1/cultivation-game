/**
 * TICKET-17A: 炼丹概率与缺口「单一来源」
 * UI 只读此模块的返回值，禁止自算成功率/爆丹率/缺口。
 */

import type { GameState } from './game'
import {
  getRecipe,
  getAlchemyRates,
  getMaterialShortage,
  type RecipeId,
  type HeatLevel,
  type AlchemyRatesBreakdown,
  type MaterialId,
} from './alchemy'
import { getKungfuModifiers } from './kungfu_modifiers'
import { getMindAlchemySuccessBonus } from './cultivation'
import { getDailyModifiers } from './daily'
import type { DailyEnvironmentId } from './daily'

export type AlchemySelection = {
  recipeId: RecipeId
  batch: number
  heat: HeatLevel
}

export type ShortageItem = {
  materialId: MaterialId
  name: string
  need: number
  have: number
  missing: number
}

export type AlchemyChancesResult = {
  successRate: number
  boomRate: number
  breakdown: AlchemyRatesBreakdown
}

const REALMS = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神']

function realmIndex(realm: string): number {
  const i = REALMS.indexOf(realm)
  return i < 0 ? 0 : i
}

/**
 * 缺口计算：当前配方+批量下缺什么、缺多少。UI 用此结果展示「缺 X×n」并高亮。
 */
export function getAlchemyShortage(
  state: GameState,
  selection: AlchemySelection,
): { shortages: ShortageItem[]; canBrew: boolean } {
  const recipe = getRecipe(selection.recipeId)
  if (!recipe) {
    return { shortages: [], canBrew: false }
  }
  const batch = Math.max(1, Math.min(5, selection.batch))
  const costMult = (getKungfuModifiers(state).alchemyCostMult ?? 1)
  return getMaterialShortage(recipe, batch, state.player.materials as Record<string, number>, costMult)
}

/**
 * 概率单一来源：最终成功率、爆丹率及拆解。UI 只展示此函数返回值，禁止自算。
 */
export function getAlchemyChances(
  state: GameState,
  selection: AlchemySelection,
): AlchemyChancesResult | null {
  const recipe = getRecipe(selection.recipeId)
  if (!recipe) return null

  const heat = selection.heat ?? 'push'
  const realmIdx = realmIndex(state.player.realm)
  const dailyMod = state.meta?.daily?.environmentId
    ? getDailyModifiers(state.meta.daily.environmentId as DailyEnvironmentId)
    : undefined
  const mod = getKungfuModifiers(state)
  const kungfuMod = {
    alchemyBoomMul: mod.alchemyBoomMul ?? 1,
    alchemyQualityShift: mod.alchemyQualityShift ?? 0,
    alchemySuccessAdd: mod.alchemySuccessAdd ?? 0,
  }

  const rates = getAlchemyRates({
    recipe,
    realmIndex: realmIdx,
    pity: state.player.pity,
    totalBrews: state.player.codex?.totalBrews ?? 0,
    heat,
    dailyMod,
    kungfuMod,
  })
  const mindBonus = getMindAlchemySuccessBonus(state.player.mind ?? 50)
  const successRate = Math.min(0.95, Math.max(0.01, rates.finalSuccessRate + mindBonus))

  return {
    successRate,
    boomRate: rates.finalBoomRate,
    breakdown: {
      ...rates.breakdown,
      success: { ...rates.breakdown.success, mindBonus, final: successRate },
    },
  }
}
