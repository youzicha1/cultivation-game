/**
 * TICKET-38: 机制型丹药 — 类型与 context
 */

import type { ElixirQuality } from '../alchemy'

export type PillContext =
  | 'tribulation'
  | 'explore'
  | 'breakthrough'
  | 'cultivate'
  | 'market'
  | 'survival'
  | 'any'

export type PillInstance = { pillId: string; quality: ElixirQuality }

/** 各 context 下的效果规格（与 pills.v1.json 一致） */
export type TribulationEffectSpec = {
  successRateAdd?: number
  damageMultFactor?: number
  clearDebuff?: boolean
  steadyOneTurn?: boolean
  extraLife?: boolean
  extraAction?: boolean
}

export type ExploreEffectSpec = {
  noDamageCount?: number
  freeRetreat?: boolean
  rareWeightAdd?: number
  dangerAdd?: number
  healAfterDamage?: boolean
}

export type BreakthroughEffectSpec = {
  successRateAdd?: number
  antiRateReduce?: number
  pityGainMult?: number
  noCostOnFail?: boolean
}

export type CultivateEffectSpec = {
  expGainMult?: number
  extraSmallReward?: boolean
  awakenExtraChoice?: boolean
  healAfter?: number
  clearLightDebuff?: boolean
}

export type SurvivalEffectSpec = {
  healBelowThreshold?: number
  cheatDeath?: number
  clearDebuffAndShield?: boolean
  revive?: boolean
}

export type MarketEffectSpec = {
  discountPercent?: number
  goldMult?: number
  freeRefreshOrBuy?: boolean
  rareWeightAdd?: number
  priceFactor?: number
}

export type EffectSpecMap = {
  tribulation?: TribulationEffectSpec
  explore?: ExploreEffectSpec
  breakthrough?: BreakthroughEffectSpec
  cultivate?: CultivateEffectSpec
  survival?: SurvivalEffectSpec
  market?: MarketEffectSpec
}

export type PillDef = {
  id: string
  name: string
  tags: string[]
  effects: EffectSpecMap
  ruleType: string | null
  ruleDesc?: string
  tianOnly?: boolean
}

export type PillsFile = { version: number; pills: PillDef[] }
