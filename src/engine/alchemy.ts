import recipesFile from '../content/alchemy_recipes.v1.json'
import type { GameState } from './game'
import type { PlayerState } from './state'

export type MaterialId = 'spirit_herb' | 'iron_sand' | 'beast_core' | 'moon_dew'
export type ElixirId = 'qi_pill' | 'spirit_pill' | 'foundation_pill'
export type RecipeId =
  | 'qi_pill_recipe'
  | 'spirit_pill_recipe'
  | 'foundation_pill_recipe'

export type ElixirQuality = 'fan' | 'xuan' | 'di' | 'tian'

export type MaterialsDef = { id: MaterialId; name: string }
export type ElixirDef = { id: ElixirId; name: string; desc: string }

export type RecipeUnlock =
  | { type: 'default' }
  | { type: 'fragment'; need: number }

export type RecipeDef = {
  id: RecipeId
  name: string
  elixirId: ElixirId
  unlock: RecipeUnlock
  cost: Partial<Record<MaterialId, number>>
  baseSuccess: number
  qualityBase: Record<ElixirQuality, number>
  boomRate: number
}

export type AlchemyRecipesFile = {
  version: number
  materials: MaterialsDef[]
  elixirs: ElixirDef[]
  recipes: RecipeDef[]
}

export const elixirQualityOrder: ElixirQuality[] = ['fan', 'xuan', 'di', 'tian']

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function validateAlchemyFile(file: AlchemyRecipesFile): AlchemyRecipesFile {
  if (!file || typeof file !== 'object') {
    throw new Error('AlchemyRecipesFile: invalid file')
  }
  if (file.version !== 1) {
    throw new Error(`AlchemyRecipesFile: unsupported version ${file.version}`)
  }
  if (!Array.isArray(file.materials) || file.materials.length === 0) {
    throw new Error('AlchemyRecipesFile: materials must be non-empty')
  }
  if (!Array.isArray(file.elixirs) || file.elixirs.length === 0) {
    throw new Error('AlchemyRecipesFile: elixirs must be non-empty')
  }
  if (!Array.isArray(file.recipes) || file.recipes.length === 0) {
    throw new Error('AlchemyRecipesFile: recipes must be non-empty')
  }

  file.recipes.forEach((recipe) => {
    if (!recipe.id || !recipe.name || !recipe.elixirId) {
      throw new Error(`RecipeDef: missing fields for ${recipe.id ?? 'unknown'}`)
    }
    const sum =
      recipe.qualityBase.fan +
      recipe.qualityBase.xuan +
      recipe.qualityBase.di +
      recipe.qualityBase.tian
    if (Math.abs(sum - 1) > 1e-6) {
      throw new Error(`RecipeDef: qualityBase must sum to 1 for ${recipe.id}`)
    }
    if (recipe.boomRate < 0 || recipe.boomRate > 1) {
      throw new Error(`RecipeDef: boomRate out of range for ${recipe.id}`)
    }
  })

  return file
}

export const alchemyData = validateAlchemyFile(recipesFile as AlchemyRecipesFile)
export const alchemyRecipes = alchemyData.recipes
export const alchemyMaterials = alchemyData.materials
const alchemyElixirs = alchemyData.elixirs

export function getRecipe(recipeId: string): RecipeDef | undefined {
  return alchemyRecipes.find((r) => r.id === recipeId)
}

export function getMaterialName(materialId: MaterialId): string {
  return alchemyMaterials.find((m) => m.id === materialId)?.name ?? materialId
}

export function getElixirName(elixirId: ElixirId): string {
  return alchemyElixirs.find((e) => e.id === elixirId)?.name ?? elixirId
}

const QUALITY_LABELS: Record<ElixirQuality, string> = {
  fan: '凡品',
  xuan: '玄品',
  di: '地品',
  tian: '天品',
}

export function getQualityLabel(quality: ElixirQuality): string {
  return QUALITY_LABELS[quality] ?? quality
}

/** 材料缺口：当前拥有 vs 配方所需，返回缺项列表与是否可炼。UI 单一来源。costMult 为功法材料消耗倍率（TICKET-22）。 */
export function getMaterialShortage(
  recipe: RecipeDef,
  batch: number,
  materials: Record<string, number>,
  costMult: number = 1,
): { shortages: Array<{ materialId: MaterialId; name: string; need: number; have: number; missing: number }>; canBrew: boolean } {
  const mult = Math.max(0.5, Math.min(1.5, costMult))
  const shortages: Array<{ materialId: MaterialId; name: string; need: number; have: number; missing: number }> = []
  for (const [mid, perBatch] of Object.entries(recipe.cost)) {
    const perBatchEffective = Math.max(1, Math.ceil((perBatch ?? 0) * mult))
    const need = perBatchEffective * batch
    const have = materials[mid] ?? 0
    const missing = Math.max(0, need - have)
    if (missing > 0) {
      shortages.push({
        materialId: mid as MaterialId,
        name: getMaterialName(mid as MaterialId),
        need,
        have,
        missing,
      })
    }
  }
  return { shortages, canBrew: shortages.length === 0 }
}

/** 单一来源概率：最终成功率、爆丹率及拆解项。UI 禁止自算，只展示此函数返回值。 */
export type AlchemyRatesBreakdown = {
  success: {
    base: number
    realmBonus: number
    pityBonus: number
    masteryBonus: number
    dailyBonus: number
    heatMod: number
    kungfuSuccessAdd?: number
    mindBonus?: number
    final: number
  }
  boom: {
    base: number
    heatMultiplier: number
    dailyMultiplier: number
    final: number
  }
}

export function getAlchemyRates(params: {
  recipe: RecipeDef
  realmIndex: number
  pity: number
  totalBrews: number
  heat: HeatLevel
  dailyMod?: AlchemyDailyMod
  kungfuMod?: AlchemyKungfuMod
}): { finalSuccessRate: number; finalBoomRate: number; breakdown: AlchemyRatesBreakdown } {
  const { recipe, realmIndex, pity, totalBrews, heat, dailyMod, kungfuMod } = params

  const realmBonus = realmIndex * 0.02
  const pityBonus = pity * 0.01
  const masteryBonus = clamp(Math.floor(totalBrews / 10) * 0.01, 0, 0.05)
  const dailyBonus = dailyMod?.alchemySuccessBonus ?? 0
  const heatMod = HEAT_SUCCESS_MODIFIER[heat]
  const kungfuSuccessAdd = kungfuMod?.alchemySuccessAdd ?? 0

  let successFinal = recipe.baseSuccess + realmBonus + pityBonus + masteryBonus + dailyBonus + heatMod + kungfuSuccessAdd
  successFinal = clamp(successFinal, 0.01, 0.95)

  const boomHeatMult = HEAT_BOOM_MULTIPLIER[heat]
  const boomDailyMult = dailyMod?.alchemyBoomRateMultiplier ?? 1
  const boomKungfuMult = kungfuMod?.alchemyBoomMul ?? 1
  const boomFinal = clamp(recipe.boomRate * boomHeatMult * boomDailyMult * boomKungfuMult, 0.01, 0.95)

  return {
    finalSuccessRate: successFinal,
    finalBoomRate: boomFinal,
    breakdown: {
      success: {
        base: recipe.baseSuccess,
        realmBonus,
        pityBonus,
        masteryBonus,
        dailyBonus,
        heatMod,
        kungfuSuccessAdd,
        final: successFinal,
      },
      boom: {
        base: recipe.boomRate,
        heatMultiplier: boomHeatMult,
        dailyMultiplier: boomDailyMult,
        final: boomFinal,
      },
    },
  }
}

/** TICKET-8: 根据炉温调整品质分布（品质偏移）；TICKET-10: qualityShift 向地/天偏移 */
function adjustQualityDistribution(
  qualityBase: Record<ElixirQuality, number>,
  heat: HeatLevel,
  qualityShift: number = 0,
): Record<ElixirQuality, number> {
  const adjusted = { ...qualityBase }

  if (heat === 'steady') {
    adjusted.fan = adjusted.fan * 1.15
    adjusted.xuan = adjusted.xuan * 1.05
    adjusted.di = adjusted.di * 0.85
    adjusted.tian = adjusted.tian * 0.80
  } else if (heat === 'blast') {
    adjusted.fan = adjusted.fan * 0.85
    adjusted.xuan = adjusted.xuan * 0.95
    adjusted.di = adjusted.di * 1.15
    adjusted.tian = adjusted.tian * 1.20
  }

  if (qualityShift > 0) {
    adjusted.fan = Math.max(0.01, adjusted.fan - qualityShift * 0.5)
    adjusted.xuan = Math.max(0.01, adjusted.xuan - qualityShift * 0.3)
    adjusted.di = adjusted.di + qualityShift * 0.4
    adjusted.tian = adjusted.tian + qualityShift * 0.4
  }

  const sum = elixirQualityOrder.reduce((s, q) => s + adjusted[q], 0)
  if (sum > 0) {
    for (const q of elixirQualityOrder) {
      adjusted[q] = adjusted[q] / sum
    }
  }
  return adjusted
}

export function rollQuality(
  rng01: () => number,
  qualityBase: Record<ElixirQuality, number>,
  heat?: HeatLevel,
  qualityShift: number = 0,
): ElixirQuality {
  const adjusted = heat ? adjustQualityDistribution(qualityBase, heat, qualityShift) : qualityShift !== 0 ? adjustQualityDistribution(qualityBase, 'push', qualityShift) : qualityBase
  const x = rng01()
  let cursor = 0
  for (const q of elixirQualityOrder) {
    cursor += adjusted[q]
    if (x <= cursor) {
      return q
    }
  }
  return 'tian'
}

export function calcBrewSuccessRate(params: {
  baseSuccess: number
  realmIndex: number
  pity: number
  totalBrews: number
}): number {
  const realmBonus = params.realmIndex * 0.02
  const pityBonus = params.pity * 0.01
  const masteryBonus = clamp(Math.floor(params.totalBrews / 10) * 0.01, 0, 0.05)
  return clamp(params.baseSuccess + realmBonus + pityBonus + masteryBonus, 0.05, 0.95)
}

/** TICKET-8: 炉温类型 */
export type HeatLevel = 'steady' | 'push' | 'blast'

/** TICKET-8: 炉温对爆丹率乘数 */
export const HEAT_BOOM_MULTIPLIER: Record<HeatLevel, number> = {
  steady: 0.70,
  push: 1.00,
  blast: 1.35,
}

/** TICKET-8: 炉温对成功率修正 */
export const HEAT_SUCCESS_MODIFIER: Record<HeatLevel, number> = {
  steady: +0.05,
  push: 0.00,
  blast: -0.03,
}

/** TICKET-6: 炼丹每日加成（由 game 注入，避免循环依赖） */
export type AlchemyDailyMod = {
  alchemyTianMultiplier?: number
  alchemyBoomDmgReduce?: number
  alchemySuccessBonus?: number
  alchemyBoomRateMultiplier?: number
}

/** TICKET-10: 功法对炼丹的加成（由 game 注入）；TICKET-22: 扩展 modifier */
export type AlchemyKungfuMod = {
  alchemyBoomMul?: number
  alchemyQualityShift?: number
  alchemySuccessAdd?: number
  alchemyCostMult?: number
  alchemyBoomCompMult?: number
}

/** TICKET-8: 炼丹战报（抽卡式结果） */
export type AlchemyOutcome = {
  success: boolean
  boomed: boolean
  quality?: ElixirQuality
  elixirId?: ElixirId
  hpChange: number
  totalBrews: number
  totalBooms: number
  bestQuality?: ElixirQuality
  // TICKET-8: 战报字段
  attempted: number
  booms: number
  successes: number
  items: Record<ElixirQuality, number>
  topQuality?: ElixirQuality
  streakSuccess: number
  streakBoom: number
}

export function canBrew(
  materials: Record<string, number>,
  cost: Partial<Record<string, number>>,
  batch: number,
): boolean {
  for (const [matId, needed] of Object.entries(cost)) {
    const n = needed ?? 0
    if ((materials[matId] ?? 0) < n * batch) {
      return false
    }
  }
  return true
}

export function applyMaterialCost(
  materials: Record<string, number>,
  cost: Partial<Record<string, number>>,
  batch: number,
): Record<string, number> {
  const next = { ...materials }
  for (const [matId, needed] of Object.entries(cost)) {
    const n = needed ?? 0
    const current = next[matId] ?? 0
    next[matId] = Math.max(0, current - n * batch)
  }
  return next
}

export function compareQuality(
  a: ElixirQuality | 'none',
  b: ElixirQuality | 'none',
): ElixirQuality | 'none' {
  if (a === 'none') return b
  if (b === 'none') return a
  const aIdx = elixirQualityOrder.indexOf(a)
  const bIdx = elixirQualityOrder.indexOf(b)
  return aIdx >= bIdx ? a : b
}

function addLog(state: GameState, message: string): GameState {
  const nextLog = [...state.log, message]
  if (nextLog.length > 50) {
    nextLog.splice(0, nextLog.length - 50)
  }
  return { ...state, log: nextLog }
}

/** TICKET-8: 抽卡式炼丹判定与战报；TICKET-10: kungfuMod 功法加成 */
export function resolveBrew(
  state: GameState,
  recipeId: RecipeId,
  batch: number,
  rng01: () => number,
  randInt: (min: number, max: number) => number,
  heat: HeatLevel = 'push',
  dailyMod?: AlchemyDailyMod,
  kungfuMod?: AlchemyKungfuMod,
): { next: GameState; outcome: AlchemyOutcome } {
  const recipe = getRecipe(recipeId)
  if (!recipe) {
    const next = addLog(state, '丹方失传，炼制无果。')
    return {
      next,
      outcome: {
        success: false,
        boomed: false,
        hpChange: 0,
        totalBrews: state.player.codex.totalBrews,
        totalBooms: state.player.codex.totalBooms,
        attempted: 0,
        booms: 0,
        successes: 0,
        items: { fan: 0, xuan: 0, di: 0, tian: 0 },
        streakSuccess: 0,
        streakBoom: 0,
      },
    }
  }

  if (!state.player.recipesUnlocked[recipeId]) {
    const next = addLog(state, '丹方未解，难以开炉。')
    return {
      next,
      outcome: {
        success: false,
        boomed: false,
        hpChange: 0,
        totalBrews: state.player.codex.totalBrews,
        totalBooms: state.player.codex.totalBooms,
        attempted: 0,
        booms: 0,
        successes: 0,
        items: { fan: 0, xuan: 0, di: 0, tian: 0 },
        streakSuccess: 0,
        streakBoom: 0,
      },
    }
  }

  const costMult = Math.max(0.5, Math.min(1.5, kungfuMod?.alchemyCostMult ?? 1))
  const effectiveCost: Partial<Record<string, number>> = {}
  for (const [matId, n] of Object.entries(recipe.cost)) {
    const need = n ?? 0
    effectiveCost[matId] = Math.max(1, Math.ceil(need * costMult))
  }

  if (!canBrew(state.player.materials, effectiveCost, batch)) {
    const next = addLog(state, '材料不足，无法开炉。')
    return {
      next,
      outcome: {
        success: false,
        boomed: false,
        hpChange: 0,
        totalBrews: state.player.codex.totalBrews,
        totalBooms: state.player.codex.totalBooms,
        attempted: 0,
        booms: 0,
        successes: 0,
        items: { fan: 0, xuan: 0, di: 0, tian: 0 },
        streakSuccess: 0,
        streakBoom: 0,
      },
    }
  }

  let nextPlayer: PlayerState = {
    ...state.player,
    materials: applyMaterialCost(state.player.materials, effectiveCost, batch),
  }

  const realmIdx = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神'].indexOf(
    nextPlayer.realm,
  )
  let successRate = calcBrewSuccessRate({
    baseSuccess: recipe.baseSuccess,
    realmIndex: realmIdx < 0 ? 0 : realmIdx,
    pity: nextPlayer.pity,
    totalBrews: nextPlayer.codex.totalBrews,
  })
  successRate = clamp(successRate + (dailyMod?.alchemySuccessBonus ?? 0), 0.01, 0.95)
  
  // TICKET-8: 炉温修正成功率
  successRate = clamp(successRate + HEAT_SUCCESS_MODIFIER[heat], 0.01, 0.95)
  successRate = clamp(successRate + (kungfuMod?.alchemySuccessAdd ?? 0), 0.01, 0.95)

  // TICKET-8: 炉温修正爆丹率；TICKET-10: 功法乘数
  let boomMult = HEAT_BOOM_MULTIPLIER[heat]
  boomMult *= dailyMod?.alchemyBoomRateMultiplier ?? 1
  boomMult *= kungfuMod?.alchemyBoomMul ?? 1
  const boomDmgReduce = dailyMod?.alchemyBoomDmgReduce ?? 0
  const boomCompMult = Math.max(0.5, Math.min(2, kungfuMod?.alchemyBoomCompMult ?? 1))
  const qualityShift = kungfuMod?.alchemyQualityShift ?? 0

  let totalBrews = nextPlayer.codex.totalBrews
  let totalBooms = nextPlayer.codex.totalBooms
  let hpChange = 0
  let bestQuality: ElixirQuality | 'none' = nextPlayer.codex.bestQualityByRecipe[recipeId]
  
  // TICKET-8: 战报统计
  const items: Record<ElixirQuality, number> = { fan: 0, xuan: 0, di: 0, tian: 0 }
  let currentStreakSuccess = 0
  let currentStreakBoom = 0
  let maxStreakSuccess = 0
  let maxStreakBoom = 0
  let topQualityThisBatch: ElixirQuality | 'none' = 'none'

  // TICKET-8: 抽卡式多次判定（每炉依次判定）
  for (let i = 0; i < batch; i++) {
    totalBrews += 1
    
    // a) 爆丹判定
    const effectiveBoomRate = clamp(recipe.boomRate * boomMult, 0.01, 0.95)
    const boomed = rng01() < effectiveBoomRate
    
    if (boomed) {
      totalBooms += 1
      let dmg = Math.max(1, randInt(1, 3) - boomDmgReduce)
      dmg = Math.max(1, Math.round(dmg / boomCompMult))
      hpChange -= dmg
      currentStreakBoom += 1
      currentStreakSuccess = 0
      maxStreakBoom = Math.max(maxStreakBoom, currentStreakBoom)
    } else {
      // b) 未爆丹：成功判定
      const success = rng01() < successRate
      if (success) {
        // c) 成功：抽品质（带炉温品质偏移）
        const quality = rollQuality(rng01, recipe.qualityBase, heat, qualityShift)
        nextPlayer.elixirs[recipe.elixirId][quality] += 1
        items[quality] += 1
        bestQuality = compareQuality(bestQuality, quality)
        topQualityThisBatch = compareQuality(topQualityThisBatch, quality)
        currentStreakSuccess += 1
        currentStreakBoom = 0
        maxStreakSuccess = Math.max(maxStreakSuccess, currentStreakSuccess)
      } else {
        currentStreakSuccess = 0
        currentStreakBoom = 0
      }
    }
  }

  nextPlayer.hp = Math.max(0, nextPlayer.hp + hpChange)
  
  // TICKET-8: 更新图鉴统计
  const successBrews = (nextPlayer.codex as any).successBrews ?? 0
  const totalBlastHeatUsed = (nextPlayer.codex as any).totalBlastHeatUsed ?? 0
  const bestQualityByElixir = (nextPlayer.codex as any).bestQualityByElixir ?? {
    qi_pill: 'none' as const,
    spirit_pill: 'none' as const,
    foundation_pill: 'none' as const,
  }
  const elixirBestQuality = compareQuality(bestQualityByElixir[recipe.elixirId] ?? 'none', topQualityThisBatch)
  nextPlayer.codex = {
    ...nextPlayer.codex,
    totalBrews,
    totalBooms,
    bestQualityByRecipe: {
      ...nextPlayer.codex.bestQualityByRecipe,
      [recipeId]: bestQuality,
    },
    successBrews: successBrews + items.fan + items.xuan + items.di + items.tian,
    bestQualityByElixir: {
      ...bestQualityByElixir,
      [recipe.elixirId]: elixirBestQuality,
    },
    totalBlastHeatUsed: heat === 'blast' ? totalBlastHeatUsed + 1 : totalBlastHeatUsed,
  } as any

  const outcome: AlchemyOutcome = {
    success: items.fan + items.xuan + items.di + items.tian > 0,
    boomed: maxStreakBoom > 0,
    quality: topQualityThisBatch !== 'none' ? topQualityThisBatch : undefined,
    elixirId: recipe.elixirId,
    hpChange,
    totalBrews,
    totalBooms,
    bestQuality: bestQuality === 'none' ? undefined : bestQuality,
    // TICKET-8: 战报字段
    attempted: batch,
    booms: maxStreakBoom,
    successes: items.fan + items.xuan + items.di + items.tian,
    items,
    topQuality: topQualityThisBatch !== 'none' ? topQualityThisBatch : undefined,
    streakSuccess: maxStreakSuccess,
    streakBoom: maxStreakBoom,
  }

  let next: GameState = {
    ...state,
    player: nextPlayer,
  }

  // TICKET-8: 强反馈（日志高亮）
  if (items.tian > 0) {
    next = addLog(next, `【金】天丹出世！！${items.tian}枚天品丹成！`)
  }
  if (items.di > 0) {
    next = addLog(next, `【紫】地品丹成！${items.di}枚地品丹成！`)
  }
  if (maxStreakBoom > 0) {
    next = addLog(next, `【凶】炉火反噬！连续${maxStreakBoom}次爆丹！`)
  }
  if (maxStreakSuccess > 0 && maxStreakSuccess >= 3) {
    next = addLog(next, `【连成】连续${maxStreakSuccess}次成丹！`)
  }
  if (outcome.success && items.tian === 0 && items.di === 0) {
    const totalItems = items.fan + items.xuan
    if (totalItems > 0) {
      next = addLog(next, `成丹${totalItems}枚（凡${items.fan}，玄${items.xuan}）`)
    }
  }

  // 开发期 debug 统计
  if (typeof console !== 'undefined' && console.log) {
    console.log('[炼丹战报]', {
      heat,
      topQuality: outcome.topQuality,
      items,
      streakSuccess: outcome.streakSuccess,
      streakBoom: outcome.streakBoom,
    })
  }

  return { next, outcome }
}
