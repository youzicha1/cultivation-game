/**
 * Engine 统一入口。使用显式导出避免 export * 导致的 TS2308 冲突
 *（如 KungfuModifiers、EndingId 在多个模块中存在）。
 */
export * from './rng'
export * from './state'
export * from './game'
export * from './persistence'
export * from './events'
export * from './alchemy'
export * from './alchemy_calc'
export * from './shop'
export {
  RISK_LEVELS,
  RISK_DROP_MULTIPLIER,
  RISK_RETREAT_FACTOR,
  STREAK_DROP_BONUS_PER_LEVEL,
  STREAK_MAX_CAP,
  PITY_THRESHOLD,
  FURNACE_TEMP_LEVELS,
  FURNACE_BOOM_MULTIPLIER,
  FURNACE_TIAN_BONUS,
  RELIC_SLOTS,
  ACHIEVEMENT_IDS,
  ENDING_IDS,
  DANGER_MAX,
  DANGER_DEEPEN_MIN,
  DANGER_DEEPEN_MAX,
  EXPLORE_MULTIPLIER_FACTOR,
  EXPLORE_PENALTY_DANGER_THRESHOLD,
  EXPLORE_PENALTY_CHANCE,
  EXPLORE_PENALTY_HP,
  RARITY_BASE_WEIGHT,
  STREAK_BONUS_THRESHOLDS,
} from './constants'
export type { RiskLevel, FurnaceTemp, AchievementId } from './constants'
export * from './relics'
export {
  getKungfu,
  getAllKungfu,
  getKungfuIdsByRarity,
  getEquippedKungfa,
  getKungfuBuildLabels,
  getKungfuKeyEffects,
  buildKungfaModifiers,
} from './kungfu'
export type { KungfuRarity, KungfuEffects, KungfuDef } from './kungfu'
export type { KungfuModifiers } from './kungfu_modifiers'
export { mergeModifiers, getKungfuModifiers } from './kungfu_modifiers'
export * from './chains'
export * from './daily'
export * from './loot'
export * from './legacy'
export * from './pity'
export * from './time'
export {
  computeThreat,
  computeInitialResolve,
  getDmgBase,
  applySteadyDamage,
  applyGamble,
  GAMBLE_SUCCESS_RATE,
  applySacrificeDamage,
  canSacrifice,
  getSacrificeShield,
  getSacrificeHeal,
  getSacrificeResolveDelta,
  getSacrificeDeduction,
  computeEndingId,
  getFinalRewards,
  ENDING_TITLES,
  ENDING_SUBTITLES,
} from './finalTrial'
export type { SacrificeKind, EndingId } from './finalTrial'
export * from './tribulation/names'
export * from './tribulation/rates'
export * from './cultivation'
