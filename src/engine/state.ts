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
  /** 境界 */
  realm: string
  /** 经验值 */
  exp: number
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
  /** 丹方残页 */
  fragments: Record<RecipeId, number>
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
}

/**
 * 创建初始状态
 */
export function createInitialState(): PlayerState {
  return {
    realm: '凡人',
    exp: 0,
    hp: 100,
    maxHp: 100,
    inheritancePoints: 0,
    pills: 0,
    spiritStones: 0,
    pity: 0,
    mind: 50,
    injuredTurns: 0,
    materials: {
      spirit_herb: 0,
      iron_sand: 0,
      beast_core: 0,
      moon_dew: 0,
    },
    elixirs: {
      qi_pill: { fan: 0, xuan: 0, di: 0, tian: 0 },
      spirit_pill: { fan: 0, xuan: 0, di: 0, tian: 0 },
      foundation_pill: { fan: 0, xuan: 0, di: 0, tian: 0 },
    },
    recipesUnlocked: {
      qi_pill_recipe: true,
      spirit_pill_recipe: false,
      foundation_pill_recipe: false,
    },
    fragments: {
      qi_pill_recipe: 0,
      spirit_pill_recipe: 0,
      foundation_pill_recipe: 0,
    },
    codex: {
      totalBrews: 0,
      totalBooms: 0,
      bestQualityByRecipe: {
        qi_pill_recipe: 'none',
        spirit_pill_recipe: 'none',
        foundation_pill_recipe: 'none',
      },
      successBrews: 0,
      bestQualityByElixir: {
        qi_pill: 'none',
        spirit_pill: 'none',
        foundation_pill: 'none',
      },
      totalBlastHeatUsed: 0,
    },
    achievements: [],
    relics: [],
    equippedRelics: [null, null, null],
  }
}
