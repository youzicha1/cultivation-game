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
export {
  getPillPool,
  rollPillFromPool,
  getPoolPreviewByRarity,
  PITY_RARE_THRESHOLD,
  PITY_LEGENDARY_THRESHOLD,
  PILL_POOL_TAGS,
  type PillPoolTag,
  type RollPillResult,
} from './alchemy/pill_pool'
export * from './shop'
export {
  getCurrentDayAndOffset,
  isTraderVisible,
  isTraderExpired,
  getTraderWindow,
  getPlayerTradeOptions,
  canTrade as canStrangerTrade,
  applyTrade as applyStrangerTrade,
  isSameKind,
  generateTraderSchedule,
  generateTraderOffer,
  STRANGER_DAY_LENGTH,
  STRANGER_WINDOW_DURATION,
  STRANGER_DURATION_MS,
  type TraderOffer,
  type PlayerGive,
  type TraderScheduleEntry,
  type TraderPools,
  type TraderOfferKind,
} from './stranger'
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
export * from './run_summary'
export { calcLegacyPointsOnEnd } from './legacy/legacy_points'
export type { EndingType } from './legacy/legacy_points'
export {
  getLegacyUnlocks,
  getLegacyUnlock,
  getLegacyState,
  canBuyUnlock,
  buyUnlock,
  applyLegacyUnlocksToNewRun,
} from './legacy/legacy_unlocks'
export type { LegacyUnlockDef, UnlockEffect, MetaWithLegacy } from './legacy/legacy_unlocks'
export {
  getCurrentTribulationIdx,
  getCurrentTribulationConfig,
  getTribulationConfigByIdx,
  getAllTribulationConfigs,
  TRIBULATION_COUNT,
} from './tribulation/progression'
export type { TribulationConfig, TribulationTier, TribulationMods } from './tribulation/progression'
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
export { canUsePill, applyPillEffect, getPillDef, getAllPillDefs, getPillPreviewText, getPillOptionsForContext } from './pills/pill_effects'
export type { PillContext, PillInstance, PillDef } from './pills/types'
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
