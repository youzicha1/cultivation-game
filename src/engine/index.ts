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
export {
  getQualityDist,
  rollQualityFromDist,
  clampWeightsToTier,
  normalizeDist,
  DEFAULT_WEIGHTS_BY_TIER,
  type RecipeTier as RecipeTierQuality,
  type QualityDist,
  type QualityModifiers,
} from './alchemy/quality_weights'
export * from './shop'
export * from './achievements'
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
export {
  hasBreakthroughPrereq,
  getRequiredKungfuForTargetRealm,
  prevRealm as prevRealmBreakthrough,
  REALMS as REALMS_BREAKTHROUGH,
} from './breakthrough_requirements'
export type { RealmId } from './breakthrough_requirements'
export * from './tribulation/names'
export * from './tribulation/rates'
export {
  getTribulationTurnView,
  startTribulation,
  applyTribulationAction,
  getTribulationPillOptions,
  getTotalTurnsForLevel,
} from './tribulation/tribulation'
export type { TribulationTurnView, TribulationState, TribulationActionId } from './tribulation/tribulation'
export { getTribulationIntents, getIntentById, rollIntent } from './tribulation/tribulation_intents'
export * from './cultivation'
export {
  getLevelCap,
  applyExpGain,
  canTakePill,
  recordPillUse,
  canEquipKungfu,
  getTribulationGate,
  getRealmById,
  getRealmOrder,
} from './realm/gates'
export type { RealmDef, PillRule, KungfuRule } from './realm/gates'
export {
  getBreakthroughView,
  attemptBreakthrough,
  attemptStageBreakthrough,
  rollAwakenSkillChoices,
  chooseAwakenSkill,
} from './breakthrough/breakthrough'
export {
  getStageCap,
  getStageIndex,
  getStageCapByStage,
  expNeededForNextLevel,
  isStageCapped,
  canStageBreakthrough,
  canRealmBreakthrough,
  STAGE_BOUNDARIES,
  STAGE_COUNT,
} from './progression/stage'
export type { BreakthroughView, BreakthroughPlan, PillOption } from './breakthrough/breakthrough'
export { calcBreakthroughRate, calcBreakthroughRateWithBreakdown, realmIndex, nextRealm } from './breakthrough/rates'
export type { BreakthroughPillEntry, BreakthroughRateBreakdown } from './breakthrough/rates'
export { getAwakenSkill, getAllAwakenSkills, getAwakenModifiers, getAwakenSkillEffectLines } from './awaken_skills'
export type { AwakenSkillDef } from './awaken_skills'
export { getAwakenPoolByTags, weightedSampleWithoutReplacement, AWAKEN_RARITY_WEIGHT, getTagWeightMult } from './awaken/roll'
