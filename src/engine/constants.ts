/**
 * TICKET-5: 上头循环常量
 * - 秘境分层：Depth + Risk（稳/险/狂）
 * - 连斩加成：streak 掉落倍率
 * - 炉温：稳/冲/爆 影响爆丹率与天品质概率
 * - 突破临门一脚：pity 阈值
 */

export const RISK_LEVELS = ['稳', '险', '狂'] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

/** Risk 档位：0=稳 1=险 2=狂；掉落倍率 */
export const RISK_DROP_MULTIPLIER: Record<number, number> = {
  0: 1,
  1: 1.5,
  2: 2.2,
}

/** Risk 档位对撤退成功率的影响：险/狂 更难撤 */
export const RISK_RETREAT_FACTOR: Record<number, number> = {
  0: 1,
  1: 0.85,
  2: 0.7,
}

/** 连斩每层对掉落/事件的加成（线性） */
export const STREAK_DROP_BONUS_PER_LEVEL = 0.1

/** 连斩最大有效层数（再高也只按此倍率） */
export const STREAK_MAX_CAP = 10

/** 突破“临门一脚”提示的 pity 阈值 */
export const PITY_THRESHOLD = 3

/** 炉温档位 */
export const FURNACE_TEMP_LEVELS = ['stable', 'rush', 'boom'] as const
export type FurnaceTemp = (typeof FURNACE_TEMP_LEVELS)[number]

/** 炉温对爆丹率的影响：稳降、冲不变、爆升 */
export const FURNACE_BOOM_MULTIPLIER: Record<FurnaceTemp, number> = {
  stable: 0.6,
  rush: 1,
  boom: 1.8,
}

/** 炉温对天品质权重的加成（在 qualityBase 上乘系数） */
export const FURNACE_TIAN_BONUS: Record<FurnaceTemp, number> = {
  stable: 0.7,
  rush: 1,
  boom: 1.4,
}

/** 遗物装备槽位上限 */
export const RELIC_SLOTS = 3

/** 成就 ID（至少 12 个，爽文梗命名） */
export const ACHIEVEMENT_IDS = [
  'one_pot_tian',       // 一炉成天丹
  'heart_demon_clear',  // 心魔不过
  'secret_ten_streak',  // 秘境十连
  'first_breakthrough', // 初破境界
  'five_realms',        // 五境在望
  'retreat_master',     // 见好就收
  'allin_win',          // 梭哈一把赢
  'no_boom_ten',        // 十炼无爆
  'chain_complete',     // 奇遇链终章
  'relic_collector',    // 遗物三件套
  'golden_retreat',     // 金盆洗手（满收益撤退）
  'legendary_drop',     // 传说掉落
] as const

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number]

/** 结局 ID（至少 4 个） */
export const ENDING_IDS = [
  'ascension',  // 飞升
  'demonic',    // 入魔
  'seclusion',  // 归隐
  'death',      // 战死/陨落
] as const

export type EndingId = (typeof ENDING_IDS)[number]

/** 探索 Push-your-luck：危险值 */
export const DANGER_MAX = 100
export const DANGER_DEEPEN_MIN = 8
export const DANGER_DEEPEN_MAX = 15
/** 探索收益倍率 = 1 + (danger/100) * EXPLORE_MULTIPLIER_FACTOR，如 danger=50 → 1.3 */
export const EXPLORE_MULTIPLIER_FACTOR = 0.6
/** 危险≥70 时，深入有 15% 触发小惩罚（hp-10） */
export const EXPLORE_PENALTY_DANGER_THRESHOLD = 70
export const EXPLORE_PENALTY_CHANCE = 0.15
export const EXPLORE_PENALTY_HP = 10
/** 稀有度基础权重：common=100, rare=22, legendary=3 */
export const RARITY_BASE_WEIGHT: Record<'common' | 'rare' | 'legendary', number> = {
  common: 100,
  rare: 22,
  legendary: 3,
}

/** TICKET-7: 连斩宝箱阈值（streak 达到这些值时触发额外掉落或权重提升） */
export const STREAK_BONUS_THRESHOLDS = [3, 5, 8] as const
