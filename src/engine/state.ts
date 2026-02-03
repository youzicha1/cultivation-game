import type {
  ElixirId,
  ElixirQuality,
  MaterialId,
  RecipeId,
} from './alchemy'
import type { AchievementId } from './constants'
import type { RelicId } from './relics'

/**
 * 玩家状态
 */
export interface PlayerState {
  /** 境界（与 realms.v1 的 id 一致） */
  realm: string
  /** TICKET-30: 修炼等级 1..99，达当前境界 cap 后需突破才能继续升 */
  level: number
  /** 经验值（达 cap 时不再增长） */
  exp: number
  /** TICKET-33: 阶 1..7，每阶 15 级（最后一阶 9 级） */
  stageIndex?: number
  /** TICKET-30: 已觉醒技能 ID 列表（突破成功三选一） */
  awakenSkills?: string[]
  /** 当前生命值 */
  hp: number
  /** 最大生命值 */
  maxHp: number
  /** 传承点数 */
  inheritancePoints: number
  /** 丹药数量 */
  pills: number
  /** 灵石 */
  spiritStones: number
  /** 突破保底进度 */
  pity: number
  /** TICKET-23: 心境/灵台 0~100，影响探索危险增长、突破成功率等 */
  mind: number
  /** TICKET-23: 受伤剩余回合数（冲脉走火等），每回合-1，影响描述用 */
  injuredTurns: number

  /** 材料背包 */
  materials: Record<MaterialId, number>
  /** 丹药库存（按类型与品质计数） */
  elixirs: Record<ElixirId, Record<ElixirQuality, number>>
  /** 配方解锁 */
  recipesUnlocked: Record<RecipeId, boolean>
  /** 丹方残页（旧：按数量，兼容存档；新逻辑用 fragmentParts） */
  fragments: Record<RecipeId, number>
  /** 丹方残页上/中/下篇，集齐三篇可合成解锁 */
  fragmentParts: Record<RecipeId, { upper: number; middle: number; lower: number }>
  /** 图鉴统计 */
  codex: {
    totalBrews: number
    totalBooms: number
    bestQualityByRecipe: Record<RecipeId, ElixirQuality | 'none'>
    // TICKET-8: 新增统计字段
    successBrews?: number
    bestQualityByElixir?: Record<ElixirId, ElixirQuality | 'none'>
    totalBlastHeatUsed?: number
  }

  /** TICKET-5: 已解锁成就 */
  achievements: AchievementId[]
  /** TICKET-5: 已获得遗物（ID 列表） */
  relics: RelicId[]
  /** TICKET-5: 已装备遗物（最多 3 个槽位） */
  equippedRelics: [RelicId | null, RelicId | null, RelicId | null]
  /** TICKET-38: 机制型丹药库存 pillId -> quality -> count */
  pillInventory?: Record<string, Record<ElixirQuality, number>>
}

/**
 * 创建初始状态
 */
export function createInitialState(): PlayerState {
  return {
    realm: '凡人',
    level: 1,
    exp: 0,
    stageIndex: 1,
    hp: 100,
    maxHp: 100,
    inheritancePoints: 0,
    pills: 0,
    spiritStones: 0,
    pity: 0,
    mind: 50,
    injuredTurns: 0,
    materials: {},
    elixirs: {},
    recipesUnlocked: {},
    fragments: {},
    fragmentParts: {},
    codex: {
      totalBrews: 0,
      totalBooms: 0,
      bestQualityByRecipe: {},
      successBrews: 0,
      bestQualityByElixir: {},
      totalBlastHeatUsed: 0,
    },
    achievements: [],
    relics: [],
    equippedRelics: [null, null, null],
    awakenSkills: [],
    pillInventory: {},
  }
}
