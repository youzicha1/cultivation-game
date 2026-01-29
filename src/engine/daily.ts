/**
 * TICKET-6: 每日天道环境（天象/时运）BUFF & DEBUFF
 * - 每日种子 = hash(dayKey + runSeed)，同一天同 seed 输出一致
 * - 环境 = 主Buff + 副Buff + Debuff + 今日任务
 * - modifiers 注入到探索/炼丹/突破计算中（纯函数）
 */

import type { MaterialId } from './alchemy'

export const DAILY_ENVIRONMENT_IDS = [
  'alchemy_day',      // 丹火旺盛日
  'explore_day',     // 灵潮涌动日
  'breakthrough_day', // 道心澄明日
  'heart_demon_day',  // 心魔作祟日
  'balanced_day',    // 五行平和日
  'danger_day',      // 煞气弥漫日
] as const

export type DailyEnvironmentId = (typeof DAILY_ENVIRONMENT_IDS)[number]

export type DailyMissionType =
  | 'brew_success'       // 成功炼丹 N 次
  | 'explore_depth'     // 深入 N 次
  | 'attempt_breakthrough' // 尝试突破 1 次
  | 'encounter_event'   // 遭遇事件 N 次
  | 'cultivate_tick'   // 修炼 N 次
  | 'retreat_success'   // 撤退成功 1 次

export type DailyMission = {
  type: DailyMissionType
  target: number
  progress: number
  claimed: boolean
}

export type DailyReward = {
  type: 'material'
  id: MaterialId
  count: number
} | {
  type: 'fragment'
  recipeId: string
  count: number
} | {
  type: 'inheritance'
  count: number
} | {
  type: 'pills'
  count: number
} | {
  type: 'elixir'
  elixirId: 'spirit_pill' | 'foundation_pill'
  /** 若为数组则领取时随机其一 */
  quality: 'fan' | 'xuan' | 'di' | 'tian' | ['fan', 'xuan']
  count: number
}

export type DailyEnvironmentDef = {
  id: DailyEnvironmentId
  name: string
  mainBuff: string
  subBuff: string
  debuff: string
  missionType: DailyMissionType
  missionTarget: number
  missionLabel: string
  reward: DailyReward
  /** 建议前往的 screen */
  suggestScreen: 'alchemy' | 'explore' | 'breakthrough' | 'cultivate' | 'home'
}

export type DailyModifiers = {
  /** 探索：掉落倍率（1=不变） */
  exploreDropMultiplier?: number
  /** 探索：撤退成功率加值（0~1） */
  retreatBonus?: number
  /** 探索：事件触发率加值（0~1） */
  eventTriggerBonus?: number
  /** 突破：成功率加值（0~1） */
  breakthroughSuccessBonus?: number
  /** 突破：失败时 pity 额外增加 */
  breakthroughPityBonusOnFail?: number
  /** 炼丹：天品质权重乘数 */
  alchemyTianMultiplier?: number
  /** 炼丹：爆丹伤害减量（正数=少扣血） */
  alchemyBoomDmgReduce?: number
  /** 炼丹：成功率加值（0~1） */
  alchemySuccessBonus?: number
  /** 炼丹：爆丹率乘数 */
  alchemyBoomRateMultiplier?: number
  /** 修炼/探索/突破：受伤加值（负数=减伤） */
  damageBonus?: number
}

const ENVIRONMENTS: Record<DailyEnvironmentId, DailyEnvironmentDef> = {
  alchemy_day: {
    id: 'alchemy_day',
    name: '丹火旺盛日',
    mainBuff: '炼丹天品质概率提升',
    subBuff: '爆丹伤害 -1',
    debuff: '探索掉落降低',
    missionType: 'brew_success',
    missionTarget: 2,
    missionLabel: '成功炼丹 2 次',
    reward: { type: 'material', id: 'moon_dew', count: 1 },
    suggestScreen: 'alchemy',
  },
  explore_day: {
    id: 'explore_day',
    name: '灵潮涌动日',
    mainBuff: '探索材料掉落提升',
    subBuff: '撤退成功率 +10%',
    debuff: '突破成功率略降',
    missionType: 'explore_depth',
    missionTarget: 3,
    missionLabel: '探索深入 3 次',
    reward: { type: 'material', id: 'beast_core', count: 1 },
    suggestScreen: 'explore',
  },
  breakthrough_day: {
    id: 'breakthrough_day',
    name: '道心澄明日',
    mainBuff: '突破成功率 +8%',
    subBuff: '失败时保底额外 +1',
    debuff: '炼丹成功率略降',
    missionType: 'attempt_breakthrough',
    missionTarget: 1,
    missionLabel: '尝试突破 1 次',
    reward: { type: 'elixir', elixirId: 'spirit_pill', quality: ['fan', 'xuan'], count: 1 },
    suggestScreen: 'breakthrough',
  },
  heart_demon_day: {
    id: 'heart_demon_day',
    name: '心魔作祟日',
    mainBuff: '事件触发率提升',
    subBuff: '奇遇收益略增',
    debuff: '所有受伤 +1',
    missionType: 'encounter_event',
    missionTarget: 2,
    missionLabel: '遭遇事件 2 次',
    reward: { type: 'fragment', recipeId: 'spirit_pill_recipe', count: 1 },
    suggestScreen: 'explore',
  },
  balanced_day: {
    id: 'balanced_day',
    name: '五行平和日',
    mainBuff: '全般小吉',
    subBuff: '无额外惩罚',
    debuff: '无',
    missionType: 'cultivate_tick',
    missionTarget: 5,
    missionLabel: '修炼 5 次',
    reward: { type: 'material', id: 'spirit_herb', count: 2 },
    suggestScreen: 'cultivate',
  },
  danger_day: {
    id: 'danger_day',
    name: '煞气弥漫日',
    mainBuff: '探索/突破收益提升',
    subBuff: '撤退成功赠礼',
    debuff: '受伤 +2，爆丹率略升',
    missionType: 'retreat_success',
    missionTarget: 1,
    missionLabel: '撤退成功 1 次',
    reward: { type: 'inheritance', count: 1 },
    suggestScreen: 'explore',
  },
}

const MODIFIERS: Record<DailyEnvironmentId, DailyModifiers> = {
  alchemy_day: {
    alchemyTianMultiplier: 1.25,
    alchemyBoomDmgReduce: 1,
    exploreDropMultiplier: 0.8,
  },
  explore_day: {
    exploreDropMultiplier: 1.3,
    retreatBonus: 0.1,
    breakthroughSuccessBonus: -0.05,
  },
  breakthrough_day: {
    breakthroughSuccessBonus: 0.08,
    breakthroughPityBonusOnFail: 1,
    alchemySuccessBonus: -0.05,
  },
  heart_demon_day: {
    eventTriggerBonus: 0.15,
    damageBonus: 1,
  },
  balanced_day: {
    alchemySuccessBonus: 0.02,
    retreatBonus: 0.03,
    breakthroughSuccessBonus: 0.02,
  },
  danger_day: {
    exploreDropMultiplier: 1.2,
    breakthroughSuccessBonus: 0.05,
    damageBonus: 2,
    alchemyBoomRateMultiplier: 1.1,
  },
}

/** 简单数值 hash：dayKey 字符串 + runSeed → 整数种子 */
export function hashDaySeed(dayKey: string, runSeed: number): number {
  let h = runSeed
  for (let i = 0; i < dayKey.length; i++) {
    h = ((h << 5) - h + dayKey.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** 给定 dayKey 与 runSeed，确定性生成当日环境（不占用主 rng） */
export function generateDailyEnvironment(
  dayKey: string,
  runSeed: number,
): { environmentId: DailyEnvironmentId; mission: DailyMission } {
  const seed = hashDaySeed(dayKey, runSeed)
  const index = seed % DAILY_ENVIRONMENT_IDS.length
  const environmentId = DAILY_ENVIRONMENT_IDS[Math.abs(index)]
  const def = ENVIRONMENTS[environmentId]
  return {
    environmentId,
    mission: {
      type: def.missionType,
      target: def.missionTarget,
      progress: 0,
      claimed: false,
    },
  }
}

export function getDailyEnvironmentDef(id: DailyEnvironmentId): DailyEnvironmentDef {
  return ENVIRONMENTS[id]
}

export function getDailyModifiers(environmentId: DailyEnvironmentId): DailyModifiers {
  return MODIFIERS[environmentId] ?? {}
}

export function getDailyEnvironmentsList(): DailyEnvironmentDef[] {
  return DAILY_ENVIRONMENT_IDS.map((id) => ENVIRONMENTS[id])
}
