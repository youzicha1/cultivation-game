import { createInitialState, type PlayerState } from './state'
import { randInt, createSeededRng, type Rng } from './rng'
import {
  DANGER_DEEPEN_MAX,
  DANGER_DEEPEN_MIN,
  DANGER_MAX,
  EXPLORE_PENALTY_CHANCE,
  EXPLORE_PENALTY_DANGER_THRESHOLD,
  EXPLORE_PENALTY_HP,
} from './constants'
import {
  getRarityLabel,
  getRarityToastText,
  rollLootDrop,
  type LootDrop,
  type LootItem,
} from './loot'
import {
  exploreEvents,
  pickExploreEvent,
  resolveExploreChoice,
  type ExploreEvent,
} from './events'
import {
  alchemyRecipes,
  canSynthesizeRecipe,
  getAlchemyPlayerDefaults,
  getAlchemyRates,
  getElixirName,
  getMaterialName,
  getQualityLabel,
  getRecipe,
  isGenericRecipe,
  isRareRecipe,
  resolveBrew,
  syncRecipesUnlockedFromFragments,
  type ElixirId,
  type ElixirQuality,
  type MaterialId,
  type RecipeId,
} from './alchemy'
import { RELIC_SLOTS } from './constants'
import {
  generateDailyEnvironment,
  getDailyEnvironmentDef,
  getDailyModifiers,
  type DailyEnvironmentId,
  type DailyMissionType,
  type DailyReward,
} from './daily'
import { relicRegistry, RELIC_IDS, type RelicId } from './relics'
import { buildKungfaModifiers, getKungfu, getKungfuIdsByRarity } from './kungfu'
import { getKungfuModifiers } from './kungfu_modifiers'
import { getMindDangerIncMult, getMindAlchemySuccessBonus, cultivate, type CultivateMode, type InsightEvent } from './cultivation'
import {
  buildLegacyModifiers,
  purchaseUpgrade,
  getLegacyUpgrade,
} from './legacy'
import {
  getChain,
  getChapter,
  getChainTriggerRate,
  pickChainToStart,
  applyGuaranteedReward,
  DEFAULT_BREAK_COMPENSATION,
  CHAIN_DEBUG_ALWAYS_TRIGGER,
  type ChainDef,
  type ChainChapterDef,
} from './chains'
import {
  updatePityAfterAlchemy,
  updatePityAfterLoot,
  updatePityAfterKungfuDrop,
  getAlchemyPityQualityShift,
  shouldForceAlchemyAtLeastDi,
  getLegendLootWeightMul,
  shouldForceLegendLoot,
  PITY_LEGEND_LOOT_HARD,
  addKungfaShards,
  spendKungfaShardsForRarity,
} from './pity'
import {
  TIME_MAX,
  getTimeMaxForSegment,
  applyTimeCost,
  shouldTriggerTribulationFinale,
} from './time'
import {
  getDmgBase,
  applySteadyDamage,
  applyGamble,
  applySacrificeDamage,
  canSacrifice,
  getSacrificeDeduction,
  computeEndingId,
  getFinalRewards,
  ENDING_TITLES,
  type SacrificeKind,
  type EndingId,
} from './finalTrial'
import {
  applyBuy,
  applySell,
  applySellAny,
  getFillMissingPlan,
  getItemCurrentPrice,
  getShopCatalogDef,
  type SellableKind,
} from './shop'
import {
  generateTraderSchedule,
  generateTraderOffer,
  getTraderWindow,
  isTraderExpired,
  canTrade as canStrangerTrade,
  applyTrade as applyStrangerTrade,
  type TraderScheduleEntry,
  type TraderOffer,
  type PlayerGive,
  type TraderPools,
} from './stranger'
import {
  buildAchievementStateSlice,
  claimAchievement,
  claimAllAchievements,
} from './achievements'
import {
  startTribulation,
  applyTribulationAction,
  type TribulationState,
  type TribulationActionId,
} from './tribulation/tribulation'
import {
  attemptBreakthrough,
  attemptStageBreakthrough,
  chooseAwakenSkill,
  type BreakthroughPlan,
} from './breakthrough/breakthrough'
import { calcBreakthroughRateWithBreakdown, realmIndex } from './breakthrough/rates'
import { applyExpGain, canEquipKungfu, canTakePill, recordPillUse, getTribulationGate } from './realm/gates'
import { canUsePill, applyPillEffect, getPillDef } from './pills/pill_effects'
import { calcLegacyPointsOnEnd } from './legacy/legacy_points'
import { buildRunSummary } from './run_summary'
import { buyUnlock, canBuyUnlock } from './legacy/legacy_unlocks'

export type ScreenId =
  | 'start'
  | 'home'
  | 'cultivate'
  | 'explore'
  | 'alchemy'
  | 'alchemy_codex'
  | 'breakthrough'
  | 'death'
  | 'summary'
  | 'settings'
  | 'relics'
  | 'achievements'
  | 'ending'
  | 'legacy'
  | 'final_trial'
  | 'final_result'
  | 'victory'
  | 'shop'
  | 'diagnostics'
  | 'awaken_skill'

/** TICKET-28: 成就系统 v2 — 已领取成就 ID */
export type AchievementClaimed = Record<string, true>

export type GameState = {
  screen: ScreenId
  player: PlayerState
  /** TICKET-28: 成就已领取（跨局持久化） */
  achievements?: { claimed: AchievementClaimed }
  run: {
    seed: number
    rngCalls: number
    turn: number
    danger: number
    pendingReward: number
    /** TICKET-5: 秘境层数 */
    depth: number
    /** TICKET-5: 风险档位 0=稳 1=险 2=狂 */
    risk: number
    /** TICKET-5: 气运连斩（连续深入不撤退的层数，撤退/失败清零） */
    streak: number
    /** TICKET-7: 待显示的掉落（用于 Toast） */
    pendingLoot?: LootDrop[]
    /** 本次探索会话内获得的所有掉落（用于结算页「查看本次奖励」） */
    exploreSessionLoot?: LootDrop[]
    /** 是否正在显示结算奖励弹层（查看本次奖励） */
    showingCashOutSummary?: boolean
    /** 结算时预生成的连斩宝箱掉落（确认返回主页时再应用） */
    pendingChestDrops?: LootDrop[]
    /** 领取每日赠礼后待展示的奖励文案（弹框用，CLEAR_DAILY_REWARD_TOAST 清除） */
    dailyRewardJustClaimed?: string
    /** TICKET-13: 碎片兑换成功后的功法名（弹层用，CLEAR_SHARD_EXCHANGE_TOAST 清除） */
    shardExchangeJustClaimed?: string
    /** TICKET-5: 事件链进度 chainId -> 当前步序 */
    chainProgress: Record<string, number>
    /** TICKET-30: 本局按品质已服用丹药次数（用于境界/每局上限门槛） */
    pillUsedByQuality?: { fan: number; xuan: number; di: number; tian: number }
    /** TICKET-30: 突破成功后待选觉醒技能（3 选 1，选完清空） */
    pendingAwakenChoices?: string[]
    /** TICKET-11: 章节奇遇链（存档可续） */
    chain?: {
      activeChainId?: string
      chapter?: number
      completed: Record<string, boolean>
    }
    /** TICKET-HP-1: 本局修炼次数（用于疲劳递减） */
    cultivateCount?: number
    /** TICKET-23: 当前修炼模式（吐纳/冲脉/悟道） */
    cultivateMode?: CultivateMode
    /** TICKET-23: 修炼结果 Toast（exp/hp/mind 变化，CLEAR_CULTIVATE_TOAST 清除） */
    cultivateToast?: { expGain: number; hpGain?: number; mindDelta?: number; spiritStonesGain?: number }
    /** TICKET-23: 顿悟事件卡（A/B 选择，CULTIVATE_INSIGHT_CHOOSE 或 CLEAR_INSIGHT_EVENT 清除） */
    pendingInsightEvent?: InsightEvent
    /** TICKET-27: 当前已渡过的天劫重数 0..12，渡劫成功后 +1，12 即通关 */
    tribulationLevel?: number
    /** TICKET-40: 当前处于第几劫（1..12 战斗中，0 未进入） */
    tribulationIdx?: number
    /** TICKET-40: 本局已成功渡过次数 0..12 */
    tribulationsCleared?: number
    /** TICKET-40: 结局类型 victory / death / abandon */
    ending?: 'victory' | 'death' | 'abandon'
    /** TICKET-40: 本局总结（结局时写入） */
    runSummary?: import('./run_summary').RunSummary
    /** TICKET-14: 天劫倒计时（剩余时辰） */
    timeLeft?: number
    /** TICKET-14: 本局总时辰 */
    timeMax?: number
    /** TICKET-14: 可选 晨/昼/暮/劫 */
    dayPhase?: string
    /** TICKET-15: 天劫挑战（3 回合） */
    finalTrial?: {
      step: 1 | 2 | 3
      threat: number
      resolve: number
      wounds?: number
      choices: string[]
      rewardSeed?: number
    }
    /** TICKET-29: 天劫回合制子状态（意图/回合/护盾/debuff/劫威/日志） */
    tribulation?: TribulationState
    currentEvent?: {
      id: string
      title: string
      text: string
      aText: string
      bText: string
      rarity?: 'common' | 'rare' | 'legendary'
      chainId?: string
      chapter?: number
    }
    /** 上次抽到事件的稀有度（调试用） */
    exploreLastRarity?: 'common' | 'rare' | 'legendary'
    /** TICKET-30: 支持 pills[]+focus 或旧 useElixir 单丹 */
    breakthroughPlan?: {
      useElixir?: {
        elixirId: 'spirit_pill' | 'foundation_pill'
        quality: ElixirQuality
        count: number
      }
      pills?: import('./breakthrough/rates').BreakthroughPillEntry[]
      inheritanceSpent: number
      focus?: 'safe' | 'steady' | 'surge'
      previewRate?: number
    }
    alchemyPlan?: { recipeId: RecipeId; batch: number; heat?: import('./alchemy').HeatLevel }
    /** TICKET-18: 从炼丹页带入的缺口（坊市一键补齐用） */
    shopMissing?: { materialId: string; need: number }[]
    /** TICKET-21: 奇遇链终章大奖——本局坊市折扣百分比（0–100） */
    shopDiscountPercent?: number
    /** TICKET-21: 奇遇链终章大奖——本局天劫伤害减免百分比（0–100） */
    tribulationDmgReductionPercent?: number
    /** TICKET-21: 奇遇链终章大奖——本局获得称号（展示用） */
    earnedTitle?: string
    /** 坊市奇人：出现时间表；NEW_GAME 时生成 */
    traderSchedule?: TraderScheduleEntry[]
    /** 坊市奇人：当前奇人及其提供物；appearedAt 为真实时间戳，存在满 2 小时后消失 */
    mysteriousTrader?: { window: TraderScheduleEntry; offer: TraderOffer; appearedAt: number }
    /** 坊市奇人刚出现时的公屏飘字文案（展示后由 CLEAR_MYSTERIOUS_TRADER_TOAST 清除） */
    mysteriousTraderToast?: string
    /** TICKET-28: 本局成就统计（run_max_danger、run_alchemy_count、run_item_types 等） */
    stats?: Record<string, number>
    /** TICKET-28: 本局连胜（cashout_streak、alchemy_success_streak、breakthrough_success_streak、tribulation_success_streak） */
    streaks?: Record<string, number>
    /** TICKET-28: 本局成就 flag（技巧/挑战触发） */
    flags?: Record<string, true>
    /** TICKET-40: 传承解锁购买后 Toast（展示后清除） */
    legacyUnlockToast?: string
    /** TICKET-39: 通用丹方池保底计数 tag -> 连续未出 rare/legendary 次数 */
    pillPoolPityByTag?: Record<string, number>
    /** TICKET-38: 机制丹效果临时字段（由 applyPillEffect 写入，各系统消费） */
    temp?: {
      tribulationExtraLife?: number
      tribulationExtraAction?: number
      /** TICKET-40: 传承解锁 — 进入天劫时初始护盾 */
      tribulationStartShield?: number
      exploreFreeRetreat?: number
      exploreNoDamageCount?: number
      breakthroughNoCostOnFail?: boolean
      survivalCheatDeath?: number
      cultivateAwakenExtraChoice?: number
      marketFreeRefreshOrBuy?: number
      pillToast?: { pillName: string; quality: string; message: string }
    }
    lastOutcome?:
      | {
          kind: 'breakthrough'
          success: boolean
          title: string
          text: string
          deltas: {
            realm: number
            hp: number
            maxHp: number
            exp: number
            pills: number
            inheritancePoints: number
            pity: number
          }
          // TICKET-9: 消耗信息（用于战报展示）
          consumed?: {
            inheritanceSpent: number
            elixir?: { elixirId: 'spirit_pill' | 'foundation_pill'; quality: ElixirQuality; count: number }
            pills?: import('./breakthrough/rates').BreakthroughPillEntry[]
          }
        }
      | {
          kind: 'alchemy'
          title: string
          text: string
          boomed: boolean
          produced?: { elixirId: ElixirId; quality: ElixirQuality; count: number }
          /** TICKET-39: 通用丹方炼出的机制丹（最后一枚） */
          poolPill?: { pillId: string; quality: ElixirQuality; rarity: 'common' | 'rare' | 'legendary'; isRulePill: boolean }
          hpDelta: number
          attempted: number
          booms: number
          successes: number
          items: Record<ElixirQuality, number>
          topQuality?: ElixirQuality
          streakSuccess: number
          streakBoom: number
        }
  }
  log: string[]
  /** TICKET-5: 结局 ID + 差一点提示 */
  summary?: { cause?: string; turns: number; endingId?: string; nearMissHints?: string[] }
  /** TICKET-6: 每日天道环境（由 SYNC_DAILY 注入 dayKey 后生成） */
  /** TICKET-12: 传承升级树（元进度） */
  /** TICKET-13: 软保底计数 + 功法碎片 */
  meta?: {
    daily?: {
      dayKey: string
      environmentId: string
      mission: { type: string; target: number; progress: number; claimed: boolean }
    }
    legacyPoints?: number
    legacySpent?: number
    legacyUpgrades?: Record<string, number>
    pityAlchemyTop?: number
    pityLegendLoot?: number
    pityLegendKungfa?: number
    kungfaShards?: number
    /** TICKET-14: 本局已触发天劫收官，防止“继续游戏”后重复刷传承点 */
    tribulationFinaleTriggered?: boolean
    /** TICKET-15: 入魔结局解锁魔修分支 */
    demonPathUnlocked?: boolean
    /** TICKET-28: 跨局成就累计（explore_actions、alchemy_success_lifetime 等） */
    statsLifetime?: Record<string, number>
    /** 当前周目（第几次游戏）：传承续局 +1，清档重置；当周目 5 = 已失败 4 次、第 5 局 */
    runCount?: number
    /** TICKET-40: 传承解锁集合（永久解锁 id -> true） */
    legacyUnlocks?: Record<string, true>
  }
}

export type GameAction =
  | { type: 'NEW_GAME'; seed: number }
  | { type: 'LOAD_GAME'; state: GameState }
  | { type: 'GO'; screen: ScreenId; shopMissing?: { materialId: string; need: number }[] }
  | { type: 'SHOP_BUY'; itemId: MaterialId; qty: number }
  | { type: 'SHOP_SELL'; itemId: MaterialId; qty: number }
  | { type: 'SHOP_SELL'; kind: SellableKind; sellableId: string; qty: number }
  | { type: 'SHOP_FILL_MISSING' }
  | { type: 'SHOP_STRANGER_TRADE'; give: PlayerGive }
  | { type: 'CLEAR_MYSTERIOUS_TRADER_TOAST' }
  | { type: 'CULTIVATE_TICK'; mode?: CultivateMode }
  | { type: 'CULTIVATE_INSIGHT_CHOOSE'; choice: 'A' | 'B' }
  | { type: 'CLEAR_CULTIVATE_TOAST' }
  | { type: 'CLEAR_INSIGHT_EVENT' }
  | { type: 'EXPLORE_START' }
  | { type: 'EXPLORE_DEEPEN' }
  | { type: 'EXPLORE_CASH_OUT' }
  | { type: 'EXPLORE_SHOW_CASH_OUT_SUMMARY' }
  | { type: 'EXPLORE_CONFIRM_CASH_OUT' }
  | { type: 'EXPLORE_BACK' }
  | { type: 'EXPLORE_CHOOSE'; choice: 'A' | 'B' }
  | { type: 'EXPLORE_DISMISS_EVENT' }
  | { type: 'ALCHEMY_OPEN' }
  | { type: 'ALCHEMY_SET_RECIPE'; recipeId: RecipeId; batch: number; heat?: import('./alchemy').HeatLevel }
  | { type: 'ALCHEMY_BREW_CONFIRM' }
  | { type: 'ALCHEMY_OPEN_CODEX' }
  | { type: 'BREAKTHROUGH_OPEN' }
  | {
      type: 'BREAKTHROUGH_SET_PLAN'
      inheritanceSpent: number
      useElixir?: {
        elixirId: 'spirit_pill' | 'foundation_pill'
        quality: ElixirQuality
        count: number
      }
      pills?: import('./breakthrough/rates').BreakthroughPillEntry[]
      focus?: 'safe' | 'steady' | 'surge'
    }
  | { type: 'BREAKTHROUGH_CONFIRM' }
  | { type: 'STAGE_BREAKTHROUGH_CONFIRM' }
  | { type: 'OUTCOME_CONTINUE'; to: ScreenId }
  | { type: 'OUTCOME_RETRY_BREAKTHROUGH' }
  | { type: 'CLEAR_LOG' }
  | { type: 'RELIC_EQUIP'; slotIndex: 0 | 1 | 2; relicId: string | null }
  | { type: 'SYNC_DAILY'; dayKey: string }
  | { type: 'DAILY_CLAIM' }
  | { type: 'CLEAR_LOOT' }
  | { type: 'LEGACY_PURCHASE'; upgradeId: string }
  | { type: 'CLEAR_DAILY_REWARD_TOAST' }
  | { type: 'CLEAR_PILL_TOAST' }
  | { type: 'CLEAR_SHARD_EXCHANGE_TOAST' }
  | { type: 'KUNGFU_SHARD_EXCHANGE'; kungfuId: string; rarity: 'rare' | 'epic' | 'legendary' }
  | { type: 'LEGACY_UNLOCK'; unlockId: string }
  | { type: 'CLEAR_LEGACY_UNLOCK_TOAST' }
  | { type: 'DEBUG_SET_TIME_LEFT'; value: number }
  | {
      type: 'FINAL_TRIAL_CHOOSE'
      choice: 'steady' | 'gamble' | 'sacrifice'
      sacrificeKind?: SacrificeKind
    }
  | {
      type: 'TRIBULATION_ACTION'
      action: TribulationActionId
      pill?: { elixirId: import('./alchemy').ElixirId; quality: ElixirQuality }
    }
  | { type: 'CLAIM_ACHIEVEMENT'; id: string }
  | { type: 'CLAIM_ALL_ACHIEVEMENTS' }
  | { type: 'CHOOSE_AWAKEN_SKILL'; skillId: string }
  | { type: 'USE_PILL'; pillId: string; quality: ElixirQuality; context: import('./pills/types').PillContext }
  | { type: 'RECIPE_SYNTHESIZE'; recipeId: RecipeId }

/** 功法/碎片跨局种子：新游戏时继承已获得功法与碎片 */
export type PersistentKungfuSeed = { unlockedKungfu: string[]; kungfaShards: number }

export function createInitialGameState(seed: number, persistent?: PersistentKungfuSeed | null): GameState {
  const basePlayer = createInitialState()
  const alchemyDefaults = getAlchemyPlayerDefaults()
  let player: PlayerState = {
    ...basePlayer,
    materials: alchemyDefaults.materials,
    elixirs: alchemyDefaults.elixirs,
    recipesUnlocked: alchemyDefaults.recipesUnlocked,
    fragments: alchemyDefaults.fragments,
    fragmentParts: alchemyDefaults.fragmentParts,
    codex: { ...basePlayer.codex, ...alchemyDefaults.codex },
  }
  const baseMeta = {
    legacyPoints: 0,
    legacySpent: 0,
    legacyUpgrades: {},
    pityAlchemyTop: 0,
    pityLegendLoot: 0,
    pityLegendKungfa: 0,
    kungfaShards: 0,
    statsLifetime: {} as Record<string, number>,
    /** 当前周目（第几次游戏）：传承续局 +1，清档 = 1 */
    runCount: 1,
  }
  let meta = baseMeta
  if (persistent && (persistent.unlockedKungfu?.length > 0 || (typeof persistent.kungfaShards === 'number' && persistent.kungfaShards > 0))) {
    const validIds = (persistent.unlockedKungfu ?? []).filter((id): id is RelicId => RELIC_IDS.includes(id as RelicId))
    player = { ...player, relics: validIds }
    meta = { ...baseMeta, kungfaShards: typeof persistent.kungfaShards === 'number' && persistent.kungfaShards >= 0 ? persistent.kungfaShards : 0 }
  }
  const timeMax0 = getTimeMaxForSegment(0)
  const maxDays = Math.max(4, Math.ceil(timeMax0 / 12))
  const rng0 = createSeededRng(seed)
  const traderSchedule = generateTraderSchedule((a, b) => randInt(rng0, a, b), maxDays)

  return {
    screen: 'start',
    player,
    achievements: { claimed: {} },
    run: {
      seed,
      rngCalls: 0,
      turn: 0,
      danger: 0,
      pendingReward: 0,
      depth: 0,
      risk: 0,
      streak: 0,
      chainProgress: {},
      chain: { completed: {} },
      cultivateCount: 0,
      tribulationLevel: 0,
      tribulationIdx: 0,
      tribulationsCleared: 0,
      timeLeft: timeMax0,
      timeMax: timeMax0,
      currentEvent: undefined,
      traderSchedule,
      stats: {},
      streaks: {},
      flags: {},
    },
    log: [],
    meta: { ...meta, statsLifetime: (meta as { statsLifetime?: Record<string, number> }).statsLifetime ?? {} },
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function addLog(state: GameState, message: string): GameState {
  const nextLog = [...state.log, message]
  if (nextLog.length > 50) {
    nextLog.splice(0, nextLog.length - 50)
  }
  return { ...state, log: nextLog }
}

/** TICKET-28: 合并成就进度（lifetime 累加，run 可设/累加，streaks/flags 合并） */
function mergeAchievementProgress(
  state: GameState,
  update: {
    statsLifetimeAdd?: Record<string, number>
    statsRunSet?: Record<string, number>
    statsRunAdd?: Record<string, number>
    streaksSet?: Record<string, number>
    flagsSet?: Record<string, true>
  },
): GameState {
  let next = state
  if (update.statsLifetimeAdd && Object.keys(update.statsLifetimeAdd).length > 0) {
    const cur = state.meta?.statsLifetime ?? {}
    const nextLifetime = { ...cur }
    for (const k of Object.keys(update.statsLifetimeAdd)) {
      nextLifetime[k] = (cur[k] ?? 0) + (update.statsLifetimeAdd[k] ?? 0)
    }
    next = { ...next, meta: { ...next.meta, statsLifetime: nextLifetime } }
  }
  if (update.statsRunSet || update.statsRunAdd || update.streaksSet || update.flagsSet) {
    const run = next.run
    let stats = { ...(run.stats ?? {}) }
    if (update.statsRunSet) for (const k of Object.keys(update.statsRunSet)) stats[k] = update.statsRunSet[k]
    if (update.statsRunAdd) for (const k of Object.keys(update.statsRunAdd)) stats[k] = (stats[k] ?? 0) + update.statsRunAdd[k]
    let streaks = { ...(run.streaks ?? {}) }
    if (update.streaksSet) for (const k of Object.keys(update.streaksSet)) streaks[k] = update.streaksSet[k]
    let flags = { ...(run.flags ?? {}) }
    if (update.flagsSet) for (const k of Object.keys(update.flagsSet)) flags[k] = true
    next = { ...next, run: { ...run, stats, streaks, flags } }
  }
  return next
}

/** 奇人交易池：稀有丹方 ID、稀有材料 ID、高级功法 ID（由内容数据汇总，避免 stranger 依赖 alchemy/shop/kungfu） */
function getTraderPools(): TraderPools {
  const rareRecipeIds = alchemyRecipes
    .filter((r) => r.unlock.type === 'fragment' && isRareRecipe(r))
    .map((r) => r.id)
  const catalog = getShopCatalogDef()
  const rareMaterialIds = catalog.filter((d) => d.rarity === 'epic').map((d) => d.id)
  const highRarityKungfuIds = [
    ...getKungfuIdsByRarity('rare'),
    ...getKungfuIdsByRarity('epic'),
    ...getKungfuIdsByRarity('legendary'),
  ]
  return { rareRecipeIds, rareMaterialIds, highRarityKungfuIds }
}

/** 根据奇人 offer 生成公屏飘字文案（游戏化、有氛围） */
function buildMysteriousTraderToastMessage(offer: TraderOffer): string {
  if (offer.kind === 'recipe_fragment') {
    const recipe = getRecipe(offer.recipeId)
    const name = recipe?.name ?? offer.recipeId
    const part = offer.part === 'upper' ? '上篇' : offer.part === 'middle' ? '中篇' : '下篇'
    return `坊市传闻：有奇人携《${name}》${part}残页现身，只换不卖，过时不候……`
  }
  if (offer.kind === 'rare_material') {
    const name = getMaterialName(offer.materialId)
    return `坊市传闻：有神秘行商现身，怀中似有稀世灵材「${name}」，只换不卖……`
  }
  const kungfu = getKungfu(offer.kungfuId as RelicId)
  const name = kungfu?.name ?? offer.kungfuId
  return `坊市传闻：有奇人携绝学《${name}》现身，欲寻有缘人以物易物……`
}

/** 根据当前时辰刷新坊市奇人：若在时间窗内则生成/保留 offer（存在真实 2 小时后过期），否则清空 */
function refreshMysteriousTrader(state: GameState, rng: Rng): GameState {
  const schedule = state.run.traderSchedule ?? []
  const timeMax = state.run.timeMax ?? TIME_MAX
  const timeLeft = state.run.timeLeft ?? timeMax
  const current = state.run.mysteriousTrader

  if (current && isTraderExpired(current.appearedAt)) {
    return { ...state, run: { ...state.run, mysteriousTrader: undefined, mysteriousTraderToast: undefined } }
  }

  const window = getTraderWindow(schedule, timeMax, timeLeft)
  if (!window) {
    if (current) {
      return { ...state, run: { ...state.run, mysteriousTrader: undefined } }
    }
    return state
  }

  if (current && current.window === window) {
    return state
  }

  const pools = getTraderPools()
  const offer = generateTraderOffer((a, b) => randInt(rng, a, b), pools)
  if (!offer) return state
  const appearedAt = Date.now()
  const toast = buildMysteriousTraderToastMessage(offer)
  return {
    ...state,
    run: { ...state.run, mysteriousTrader: { window, offer, appearedAt }, mysteriousTraderToast: toast },
  }
}

/** TICKET-14/15/29: 扣减时辰并判断是否进入天劫挑战（统一入口）；TICKET-29 使用回合制天劫；并刷新坊市奇人 */
function applyTimeAndMaybeFinale(state: GameState, cost: number, rng: Rng): GameState {
  const next = applyTimeCost(state, cost)
  const afterFinale = shouldTriggerTribulationFinale(next) ? enterFinalTrial(next, rng) : next
  return refreshMysteriousTrader(afterFinale, rng)
}

/** TICKET-29: 时辰已耗尽时，进入天劫回合制挑战页（startTribulation）；TICKET-30: 境界不足则禁入 */
function enterFinalTrial(state: GameState, rng: Rng): GameState {
  const tier = (state.run.tribulationLevel ?? 0) + 1
  const gate = getTribulationGate(state, tier)
  if (!gate.allowed) {
    return {
      ...state,
      screen: 'final_result',
      summary: {
        cause: gate.reason ?? '境界不足，无法渡此劫',
        turns: state.run.turn,
        endingId: 'retire',
      },
    }
  }
  return startTribulation(state, rng)
}

/** TICKET-14: 时辰已耗尽时，不执行动作、直接进入天劫挑战（用于各耗时辰动作开头） */
function tryTribulationFinaleIfNoTime(state: GameState, rng: Rng): GameState | null {
  const timeLeft = state.run.timeLeft ?? TIME_MAX
  if (timeLeft > 0) return null
  if (state.meta?.tribulationFinaleTriggered) return null
  const next = applyTimeCost(state, 0)
  if (!shouldTriggerTribulationFinale(next)) return null
  return enterFinalTrial(next, rng)
}

/** TICKET-12: 计算本局传承点奖励 */
function calculateLegacyPointsReward(state: GameState): number {
  let points = 1 // 基础奖励
  const chain = state.run.chain
  // 通关任意事件链：+1
  if (chain?.completed && Object.keys(chain.completed).length > 0) {
    points += 1
  }
  // 突破成功过（境界提升）：+1
  const currentRealmIdx = realmIndex(state.player.realm)
  if (currentRealmIdx > 0) {
    points += 1
  }
  return points
}

/** TICKET-9: 临门一脚提示判定（纯函数，便于测试） */
export function shouldShowClutchHint(state: GameState): {
  show: boolean
  level: 'medium' | 'high' | null
  message: string
} {
  const pity = state.player.pity
  if (pity >= 7) {
    return {
      show: true,
      level: 'high',
      message: '只差临门一脚——现在收手等于亏！',
    }
  }
  if (pity >= 3) {
    return {
      show: true,
      level: 'medium',
      message: '天机渐明：下一次成功率将明显提升！',
    }
  }
  return { show: false, level: null, message: '' }
}

type BreakthroughPillEntry = import('./breakthrough/rates').BreakthroughPillEntry

/** 本次突破计划内天丹合计最多 1 颗（失败后下次突破仍可用 1 颗，由本函数与 maxPerRun 共同实现） */
function capTianPerBreakthroughAttempt(pills: BreakthroughPillEntry[]): BreakthroughPillEntry[] {
  const tianEntries = pills.filter((p) => p.quality === 'tian')
  const tianTotal = tianEntries.reduce((s, p) => s + p.count, 0)
  if (tianTotal <= 1) return pills
  const rest = pills.filter((p) => p.quality !== 'tian')
  const first = tianEntries[0]
  return [...rest, { ...first, count: 1 }]
}

function createBreakthroughPlan(
  state: GameState,
  inheritanceSpent: number,
  useElixir?: {
    elixirId: 'spirit_pill' | 'foundation_pill'
    quality: ElixirQuality
    count: number
  },
  pills?: import('./breakthrough/rates').BreakthroughPillEntry[],
  focus?: 'safe' | 'steady' | 'surge',
): NonNullable<GameState['run']['breakthroughPlan']> {
  const inheritance = clamp(inheritanceSpent, 0, state.player.inheritancePoints ?? 0)
  let normalizedUseElixir: NonNullable<GameState['run']['breakthroughPlan']>['useElixir']
  let normalizedPills = pills ?? []
  if (useElixir && useElixir.count > 0 && normalizedPills.length === 0) {
    const available = (state.player.elixirs[useElixir.elixirId]?.[useElixir.quality] ?? 0)
    let finalCount = clamp(useElixir.count, 0, available)
    // 天丹：每次突破最多只能用 1 颗加持概率（失败后下次突破仍可用 1 颗）
    if (useElixir.quality === 'tian' && finalCount > 1) finalCount = 1
    if (finalCount > 0) {
      normalizedUseElixir = {
        elixirId: useElixir.elixirId,
        quality: useElixir.quality,
        count: finalCount,
      }
      normalizedPills = [normalizedUseElixir]
    }
  }
  // 本次突破计划内天丹合计最多 1 颗（与境界“本局可多次、每次 1 颗”一致）
  normalizedPills = capTianPerBreakthroughAttempt(normalizedPills)
  const dailyBonus = state.meta?.daily ? getDailyModifiersFromState(state).breakthroughSuccessBonus ?? 0 : 0
  const { rate } = calcBreakthroughRateWithBreakdown(state, inheritance, normalizedPills, dailyBonus)
  return {
    inheritanceSpent: inheritance,
    useElixir: normalizedUseElixir,
    pills: normalizedPills.length > 0 ? normalizedPills : undefined,
    focus: focus ?? 'steady',
    previewRate: rate,
  }
}

function snapshotEvent(event: ExploreEvent): GameState['run']['currentEvent'] {
  return {
    id: event.id,
    title: event.title,
    text: event.text,
    aText: event.choices.A.text,
    bText: event.choices.B.text,
    rarity: event.rarity ?? 'common',
  }
}

/** TICKET-11: 链章节快照为 currentEvent（带 chainId/chapter 供 UI 与 CHOOSE 分支） */
function snapshotChainChapter(
  chain: ChainDef,
  ch: ChainChapterDef,
): GameState['run']['currentEvent'] {
  return {
    id: `chain_${chain.chainId}_ch${ch.chapter}`,
    title: ch.title,
    text: ch.text,
    aText: ch.choices.A.text,
    bText: ch.choices.B.text,
    rarity: 'legendary',
    chainId: chain.chainId,
    chapter: ch.chapter,
  }
}

const FRAGMENT_PART_LABEL: Record<'upper' | 'middle' | 'lower', string> = {
  upper: '上篇',
  middle: '中篇',
  lower: '下篇',
}

/** TICKET-7: 应用掉落到玩家状态；残页按上/中/下篇写入 fragmentParts；通用丹方整本仅传说掉落 */
function applyLootItem(
  player: PlayerState,
  item: LootItem,
): PlayerState {
  const next = { ...player }
  if (item.type === 'material') {
    const cur = next.materials[item.id] ?? 0
    next.materials = { ...next.materials, [item.id]: cur + item.count }
  } else if (item.type === 'fragment') {
    const fp = next.fragmentParts ?? {}
    const recipeParts = fp[item.id] ?? { upper: 0, middle: 0, lower: 0 }
    next.fragmentParts = {
      ...fp,
      [item.id]: {
        ...recipeParts,
        [item.part]: recipeParts[item.part] + item.count,
      },
    }
  } else if (item.type === 'recipe') {
    const recipe = getRecipe(item.id)
    const canUnlockWhole = recipe && (isGenericRecipe(recipe) || !isRareRecipe(recipe)) && !(next.recipesUnlocked[item.id])
    if (canUnlockWhole) {
      next.recipesUnlocked = { ...next.recipesUnlocked, [item.id]: true }
    }
  } else if (item.type === 'pills') {
    next.pills = next.pills + item.count
  } else if (item.type === 'relic_fragment') {
    if (!next.relics.includes(item.id)) {
      next.relics = [...next.relics, item.id]
    }
  } else if (item.type === 'kungfu') {
    if (next.relics.includes(item.id)) {
      next.inheritancePoints = (next.inheritancePoints ?? 0) + 1
    } else {
      next.relics = [...next.relics, item.id]
    }
  }
  return next
}

/** 仅生成掉落不应用（用于结算弹层预生成连斩宝箱，确认时再应用） */
function generateLootOnly(
  state: GameState,
  danger: number,
  streak: number,
  rng: Rng,
  count: number,
): { drops: LootDrop[] } {
  const mod = getKungfuModifiers(state)
  const legacyCtx = buildLegacyModifiers(state.meta ?? {})
  const kungfuMod = {
    lootRareMul: (mod.exploreRareWeightMult ?? 1) * legacyCtx.lootRareWeightMul,
    lootLegendMul: (mod.exploreLegendWeightMult ?? 1) * legacyCtx.lootLegendWeightMul,
  }
  const canHaveLegendary = danger >= 70
  const pityMod = {
    legendWeightMul: getLegendLootWeightMul(state.meta ?? {}),
    forceLegendary: canHaveLegendary && shouldForceLegendLoot(state.meta ?? {}),
  }
  const drops: LootDrop[] = []
  for (let i = 0; i < count; i++) {
    drops.push(rollLootDrop(rng, danger, streak, kungfuMod, pityMod))
  }
  return { drops }
}

/** TICKET-7: 生成掉落并应用到玩家，返回新状态和掉落列表；TICKET-13: 保底与碎片 */
function generateAndApplyLoot(
  state: GameState,
  danger: number,
  streak: number,
  rng: Rng,
  count: number = 1,
): { nextState: GameState; drops: LootDrop[] } {
  let nextPlayer = { ...state.player }
  const drops: LootDrop[] = []
  const pendingLoot: LootDrop[] = []
  let meta = state.meta ?? {}

  const mod = getKungfuModifiers(state)
  const legacyCtx = buildLegacyModifiers(meta)
  const kungfuMod = {
    lootRareMul: (mod.exploreRareWeightMult ?? 1) * legacyCtx.lootRareWeightMul,
    lootLegendMul: (mod.exploreLegendWeightMult ?? 1) * legacyCtx.lootLegendWeightMul,
  }
  const canHaveLegendary = danger >= 70
  const pityMod = {
    legendWeightMul: getLegendLootWeightMul(meta),
    forceLegendary: canHaveLegendary && shouldForceLegendLoot(meta),
  }
  const wasDuplicateKungfu: boolean[] = []
  for (let i = 0; i < count; i++) {
    const drop = rollLootDrop(rng, danger, streak, kungfuMod, pityMod)
    const hadBefore = drop.item.type === 'kungfu' && nextPlayer.relics.includes(drop.item.id)
    wasDuplicateKungfu.push(drop.item.type === 'kungfu' && hadBefore)
    drops.push(drop)
    pendingLoot.push(drop)
    nextPlayer = applyLootItem(nextPlayer, drop.item)
    meta = updatePityAfterLoot(drop.rarity === 'legendary', meta)
    if (drop.item.type === 'kungfu') {
      meta = updatePityAfterKungfuDrop(drop.rarity, meta)
      if (hadBefore) meta = addKungfaShards(meta, 1)
    }
  }
  nextPlayer = { ...nextPlayer, ...syncRecipesUnlockedFromFragments(nextPlayer) }

  let nextState: GameState = {
    ...state,
    player: nextPlayer,
    meta,
    run: {
      ...state.run,
      pendingLoot: pendingLoot.length > 0 ? pendingLoot : undefined,
    },
  }

  // 日志记录稀有掉落；TICKET-10: 功法掉落强反馈
  drops.forEach((drop, i) => {
    if (drop.rarity !== 'common' || drop.item.type === 'kungfu') {
      const label = drop.item.type === 'kungfu' ? (drop.rarity === 'legendary' ? '传说' : drop.rarity === 'epic' ? '史诗' : '稀有') : getRarityLabel(drop.rarity)
      const kungfuName = drop.item.type === 'kungfu' ? (relicRegistry[drop.item.id]?.name ?? drop.item.id) : ''
      const itemDesc =
        drop.item.type === 'material'
          ? `${drop.item.id}×${drop.item.count}`
          : drop.item.type === 'fragment'
            ? `残页（${FRAGMENT_PART_LABEL[drop.item.part]}）×${drop.item.count}`
            : drop.item.type === 'recipe'
              ? `丹方《${getRecipe(drop.item.id)?.name ?? drop.item.id}》`
              : drop.item.type === 'pills'
              ? `丹药×${drop.item.count}`
              : drop.item.type === 'kungfu'
                ? `《${kungfuName}》`
                : '遗物碎片'
      const wasDup = drop.item.type === 'kungfu' && wasDuplicateKungfu[i]
      if (drop.item.type === 'kungfu' && wasDup) {
        nextState = addLog(nextState, `【功法已有】《${kungfuName}》转化为传承点+1`)
      } else {
        nextState = addLog(
          nextState,
          drop.item.type === 'kungfu'
            ? `【${label}】获得功法${itemDesc}`
            : `【${label}掉落】${getRarityToastText(drop.rarity)}${itemDesc}`,
        )
      }
    }
  })

  return { nextState, drops }
}

function findEventById(eventId: string): ExploreEvent | undefined {
  return exploreEvents.find((event) => event.id === eventId)
}

function getDailyModifiersFromState(state: GameState): ReturnType<typeof getDailyModifiers> {
  const envId = state.meta?.daily?.environmentId as DailyEnvironmentId | undefined
  return envId ? getDailyModifiers(envId) : {}
}

function advanceDailyMission(
  state: GameState,
  missionType: DailyMissionType,
  amount: number = 1,
): GameState {
  const daily = state.meta?.daily
  if (!daily || daily.mission.type !== missionType || daily.mission.claimed) {
    return state
  }
  const progress = Math.min(daily.mission.target, daily.mission.progress + amount)
  return {
    ...state,
    meta: {
      ...state.meta,
      daily: {
        ...daily,
        mission: { ...daily.mission, progress },
      },
    },
  }
}

export function reduceGame(
  state: GameState,
  action: GameAction,
  rng: Rng,
): GameState {
  let rngCalls = state.run.rngCalls
  const rngWithCount: Rng = {
    next: () => {
      rngCalls += 1
      return rng.next()
    },
  }

  const next01 = () => rngWithCount.next()
  const nextInt = (min: number, max: number) => randInt(rngWithCount, min, max)

  const baseRun = { ...state.run }
  const basePlayer = { ...state.player }

  switch (action.type) {
    case 'NEW_GAME': {
      return createInitialGameState(action.seed)
    }
    case 'LOAD_GAME': {
      return action.state
    }
    case 'GO': {
      const nextScreen = action.screen
      const shopMissing = action.shopMissing
      let st: GameState =
        nextScreen === 'shop' && shopMissing != null && shopMissing.length > 0
          ? { ...state, screen: nextScreen, run: { ...baseRun, shopMissing } }
          : { ...state, screen: nextScreen, run: { ...baseRun, shopMissing: undefined } }
      if (nextScreen === 'shop') {
        st = refreshMysteriousTrader(st, rngWithCount)
      }
      return { ...st, run: { ...st.run, rngCalls } }
    }
    case 'SHOP_BUY': {
      const result = applyBuy(state, action.itemId, action.qty)
      if (!result) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      let nextState = addLog(
        { ...state, player: result.newPlayer },
        result.logMessage,
      )
      const goldBefore = state.player.spiritStones ?? 0
      const runItemTypes = Object.keys(result.newPlayer.materials ?? {}).filter((k) => (result.newPlayer.materials![k] ?? 0) > 0).length
      nextState = mergeAchievementProgress(nextState, {
        statsLifetimeAdd: { shop_trades_lifetime: 1, shop_spend_lifetime: result.cost },
        statsRunSet: { run_item_types: runItemTypes },
        flagsSet: {
          ...(result.cost >= 150 ? { shop_spend_1500_once: true } : {}),
          ...(goldBefore < 200 && action.qty > 0 ? { shop_poor_rare_buy: true } : {}),
        },
      })
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'SHOP_SELL': {
      const result =
        'kind' in action && action.kind != null && action.sellableId != null
          ? applySellAny(state, action.kind, action.sellableId, action.qty)
          : applySell(state, (action as { type: 'SHOP_SELL'; itemId: MaterialId; qty: number }).itemId, action.qty)
      if (!result) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      const nextState = addLog(
        { ...state, player: result.newPlayer },
        result.logMessage,
      )
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'CLEAR_MYSTERIOUS_TRADER_TOAST': {
      if (baseRun.mysteriousTraderToast == null) return state
      return { ...state, run: { ...baseRun, mysteriousTraderToast: undefined } }
    }
    case 'SHOP_STRANGER_TRADE': {
      const trader = baseRun.mysteriousTrader
      if (!trader || isTraderExpired(trader.appearedAt) || !canStrangerTrade(state.player, trader.offer, action.give)) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      const nextPlayer = applyStrangerTrade(state.player, trader.offer, action.give)
      const nextState = addLog(
        { ...state, player: nextPlayer, run: { ...baseRun, mysteriousTrader: undefined } },
        '与坊市奇人以物易物，各取所需。',
      )
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'SHOP_FILL_MISSING': {
      const missing = baseRun.shopMissing
      if (!missing || missing.length === 0) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      const plan = getFillMissingPlan(state, missing)
      if (plan.totalCost === 0) {
        return { ...state, run: { ...baseRun, shopMissing: undefined, rngCalls } }
      }
      let st = state
      for (const p of plan.plan) {
        const unitPrice = getItemCurrentPrice(st, p.itemId)
        const gold = st.player.spiritStones ?? 0
        const qty = unitPrice > 0 ? Math.min(p.need, Math.floor(gold / unitPrice)) : 0
        if (qty <= 0) continue
        const res = applyBuy(st, p.itemId, qty)
        if (!res) continue
        st = addLog({ ...st, player: res.newPlayer }, res.logMessage)
      }
      if (!plan.canAfford) {
        st = addLog(st, `【坊市】还差灵石×${plan.missingGold}，无法一次补齐。`)
      }
      return { ...st, run: { ...st.run, shopMissing: undefined, rngCalls } }
    }
    case 'CLEAR_LOG': {
      return { ...state, log: [] }
    }
    case 'CLEAR_LOOT': {
      return {
        ...state,
        run: { ...baseRun, pendingLoot: undefined },
      }
    }
    case 'LEGACY_PURCHASE': {
      const result = purchaseUpgrade(state.meta ?? {}, action.upgradeId)
      if (!result.success) {
        let nextState = addLog(state, `无法购买：${result.reason ?? '未知错误'}`)
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }
      const upgrade = getLegacyUpgrade(action.upgradeId)
      // 使用全新 meta 引用，确保 React 检测到更新、传承页 UI 正确刷新
      const newMeta = { ...result.newMeta }
      let nextState: GameState = {
        ...state,
        meta: newMeta,
      }
      nextState = addLog(nextState, `【传承】已掌握：${upgrade?.name ?? action.upgradeId}`)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'CULTIVATE_TICK': {
      const finale = tryTribulationFinaleIfNoTime(state, rngWithCount)
      if (finale) return { ...finale, run: { ...finale.run, rngCalls } }
      const mode: CultivateMode = action.mode ?? 'breath'
      const result = cultivate(state, mode, rngWithCount)
      const turn = baseRun.turn + 1
      let nextState: GameState = {
        ...state,
        player: result.nextPlayer,
        run: {
          ...baseRun,
          turn,
          ...result.nextRunDelta,
          cultivateToast: result.toast,
          cultivateMode: mode,
          pendingInsightEvent: result.insightEvent,
        },
      }
      nextState = addLog(nextState, result.logMessage)
      nextState = advanceDailyMission(nextState, 'cultivate_tick')
      if (nextState.player.hp <= 0) {
        nextState = {
          ...nextState,
          screen: 'death',
          summary: { cause: '修炼受伤', turns: turn, endingId: 'death' },
          meta: { ...nextState.meta, legacyPoints: (nextState.meta?.legacyPoints ?? 0) + calculateLegacyPointsReward(nextState) },
        }
      }
      nextState = applyTimeAndMaybeFinale(nextState, 1, rngWithCount)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'CULTIVATE_INSIGHT_CHOOSE': {
      const ev = baseRun.pendingInsightEvent
      if (!ev) return { ...state, run: { ...state.run, rngCalls } }
      const choice = action.choice
      let nextPlayer = { ...basePlayer }
      let nextRun = { ...baseRun, pendingInsightEvent: undefined }
      let nextMeta = state.meta ?? {}
      let logMsg = ''
      if (choice === 'A') {
        if (ev.choiceA.shards != null) {
          nextMeta = { ...nextMeta, kungfaShards: (nextMeta.kungfaShards ?? 0) + ev.choiceA.shards }
          logMsg = `【顿悟·稳】${ev.choiceA.text}，功法碎片+${ev.choiceA.shards}。`
        } else if (ev.choiceA.legacy != null) {
          nextMeta = { ...nextMeta, legacyPoints: (nextMeta.legacyPoints ?? 0) + ev.choiceA.legacy }
          logMsg = `【顿悟·稳】${ev.choiceA.text}，传承点+${ev.choiceA.legacy}。`
        } else {
          logMsg = `【顿悟·稳】${ev.choiceA.text}。`
        }
      } else {
        if (ev.choiceB.exp != null) {
          const { nextPlayer: expPlayer } = applyExpGain({ ...state, player: nextPlayer }, ev.choiceB.exp)
          nextPlayer = { ...nextPlayer, level: expPlayer.level ?? nextPlayer.level ?? 1, exp: expPlayer.exp ?? 0 }
        }
        if (ev.choiceB.dangerAdd != null) nextRun = { ...nextRun, danger: Math.min(DANGER_MAX, (baseRun.danger ?? 0) + ev.choiceB.dangerAdd) }
        if (ev.choiceB.hpCost != null) nextPlayer = { ...nextPlayer, hp: Math.max(0, nextPlayer.hp - ev.choiceB.hpCost) }
        logMsg = `【顿悟·险】${ev.choiceB.text}${ev.choiceB.exp != null ? `，修为+${ev.choiceB.exp}` : ''}${ev.choiceB.hpCost != null ? `，生命-${ev.choiceB.hpCost}` : ''}${ev.choiceB.dangerAdd != null ? `，危险+${ev.choiceB.dangerAdd}` : ''}。`
      }
      let nextState: GameState = { ...state, player: nextPlayer, meta: nextMeta, run: nextRun }
      nextState = addLog(nextState, logMsg)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'CLEAR_CULTIVATE_TOAST': {
      const { cultivateToast: _, ...restRun } = baseRun
      return { ...state, run: { ...restRun, rngCalls } }
    }
    case 'CLEAR_INSIGHT_EVENT': {
      const { pendingInsightEvent: __, ...restRun } = baseRun
      return { ...state, run: { ...restRun, rngCalls } }
    }
    case 'EXPLORE_START': {
      let nextState: GameState = {
        ...state,
        screen: 'explore',
        run: {
          ...baseRun,
          danger: 0,
          pendingReward: 0,
          depth: 0,
          risk: 0,
          streak: 0,
          chainProgress: {},
          currentEvent: undefined,
          pendingLoot: undefined,
          exploreSessionLoot: [],
        },
      }
      nextState = addLog(nextState, '开始探索')
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_DEEPEN': {
      const finaleDeepen = tryTribulationFinaleIfNoTime(state, rngWithCount)
      if (finaleDeepen) return { ...finaleDeepen, run: { ...finaleDeepen.run, rngCalls } }
      // danger=100 时无法继续深入
      if (baseRun.danger >= DANGER_MAX) {
        let nextState: GameState = {
          ...state,
          run: { ...baseRun, rngCalls },
        }
        nextState = addLog(nextState, '【极限】危险值已达上限 100，无法继续深入，请收手结算。')
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }
      
      let stateAfterMission = advanceDailyMission(state, 'explore_depth')
      let nextDanger = baseRun.danger
      let nextPlayer = { ...basePlayer }

      if (baseRun.danger >= EXPLORE_PENALTY_DANGER_THRESHOLD && next01() < EXPLORE_PENALTY_CHANCE) {
        const legacyCtx = buildLegacyModifiers(state.meta)
        const penaltyDmg = Math.max(0, EXPLORE_PENALTY_HP - legacyCtx.exploreInjuryReduction)
        nextPlayer.hp = Math.max(0, basePlayer.hp - penaltyDmg)
        stateAfterMission = addLog(stateAfterMission, '【翻车】你踩空受伤…')
        if (nextPlayer.hp <= 0) {
          const nextState: GameState = {
            ...stateAfterMission,
            player: nextPlayer,
            screen: 'death',
            summary: { cause: '探索翻车', turns: baseRun.turn, endingId: 'death' },
            meta: { ...stateAfterMission.meta, legacyPoints: (stateAfterMission.meta?.legacyPoints ?? 0) + 1 },
          }
          return { ...nextState, run: { ...nextState.run, rngCalls } }
        }
      }

      const mod = getKungfuModifiers(state)
      const legacyCtx = buildLegacyModifiers(state.meta)
      const mindMult = getMindDangerIncMult(basePlayer.mind ?? 50)
      const rawInc = nextInt(DANGER_DEEPEN_MIN, DANGER_DEEPEN_MAX)
      const inc = Math.max(1, Math.round(rawInc * (mod.exploreDangerIncMult ?? 1) * legacyCtx.exploreDangerIncMul * mindMult))
      nextDanger = Math.min(DANGER_MAX, nextDanger + inc)
      
      const nextStreak = (baseRun.streak ?? 0) + 1
      stateAfterMission = advanceDailyMission(stateAfterMission, 'encounter_event')
      stateAfterMission = mergeAchievementProgress(stateAfterMission, {
        statsLifetimeAdd: { explore_actions: 1 },
        statsRunSet: { run_max_danger: Math.max(baseRun.stats?.run_max_danger ?? 0, nextDanger) },
        ...(baseRun.danger < 30 && nextDanger >= 80 ? { flagsSet: { explore_allin_no_cashout: true } } : {}),
      })

      const chain = baseRun.chain ?? { completed: {} }

      if (chain.activeChainId != null && chain.chapter != null) {
        const ch = getChapter(chain.activeChainId, chain.chapter)
        const chainDef = getChain(chain.activeChainId)
        if (ch && chainDef) {
          let nextState: GameState = {
            ...stateAfterMission,
            player: nextPlayer,
            run: {
              ...baseRun,
              danger: nextDanger,
              streak: nextStreak,
              currentEvent: snapshotChainChapter(chainDef, ch),
              chain,
            },
          }
          nextState = addLog(nextState, `继续深入，危险值 +${inc} → ${nextDanger}。奇遇·《${chainDef.name}》 ${chain.chapter}/${chainDef.chapters.length}：${ch.title}`)
          nextState = applyTimeAndMaybeFinale(nextState, 0, rngWithCount)
          return { ...nextState, run: { ...nextState.run, rngCalls } }
        }
      }

      const triggerRoll = rngWithCount.next()
      const triggerRate = getChainTriggerRate(nextDanger, CHAIN_DEBUG_ALWAYS_TRIGGER)
      if (triggerRoll < triggerRate) {
        const chainCtx = {
          danger: nextDanger,
          realmIndex: realmIndex(basePlayer.realm),
          tribulationPassed: baseRun.tribulationLevel ?? 0,
        }
        const picked = pickChainToStart(rngWithCount, chain.completed, chainCtx)
        if (picked) {
          const ch1 = getChapter(picked.chainId, 1)
          if (ch1) {
            const newChain = { activeChainId: picked.chainId, chapter: 1, completed: chain.completed }
            let nextState: GameState = {
              ...stateAfterMission,
              player: nextPlayer,
              run: {
                ...baseRun,
                danger: nextDanger,
                streak: nextStreak,
                currentEvent: snapshotChainChapter(picked, ch1),
                chain: newChain,
              },
            }
            nextState = addLog(nextState, `继续深入，危险值 +${inc} → ${nextDanger}。【奇遇】《${picked.name}》 1/${picked.chapters.length}：${ch1.title}`)
            nextState = applyTimeAndMaybeFinale(nextState, 0, rngWithCount)
            return { ...nextState, run: { ...nextState.run, rngCalls } }
          }
        }
      }

      const event = pickExploreEvent(rngWithCount, nextDanger)
      const rarity = event.rarity ?? 'common'
      let nextState: GameState = {
        ...stateAfterMission,
        player: nextPlayer,
        run: {
          ...baseRun,
          danger: nextDanger,
          streak: nextStreak,
          currentEvent: snapshotEvent(event) as GameState['run']['currentEvent'],
          chain,
          exploreLastRarity: rarity,
        },
      }
      if (rarity === 'rare') {
        nextState = addLog(nextState, `✨【稀有事件】危险值 +${inc} → ${nextDanger}。遭遇：${event.title}`)
      } else if (rarity === 'legendary') {
        nextState = addLog(nextState, `🌟【传说事件】危险值 +${inc} → ${nextDanger}。遭遇：${event.title}`)
        nextState = mergeAchievementProgress(nextState, { statsLifetimeAdd: { explore_legend_events: 1 } })
      } else {
        nextState = addLog(nextState, `继续深入，危险值 +${inc} → ${nextDanger}。遭遇：${event.title}`)
      }
      nextState = applyTimeAndMaybeFinale(nextState, 0, rngWithCount)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_DISMISS_EVENT': {
      if (!baseRun.currentEvent) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      let nextState: GameState = {
        ...state,
        run: { ...baseRun, currentEvent: undefined },
      }
      nextState = addLog(nextState, '放弃当前事件，回到探索面板。')
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_CASH_OUT': {
      const danger = baseRun.danger
      const streak = baseRun.streak ?? 0
      const mod = getKungfuModifiers(state)
      const kungfuCtx = buildKungfaModifiers(state)
      const legacyCtx = buildLegacyModifiers(state.meta)
      const freeRetreat = (baseRun.temp?.exploreFreeRetreat ?? 0) > 0
      const retreatRate = Math.min(0.98, 0.88 + kungfuCtx.exploreRetreatAdd + legacyCtx.exploreRetreatAdd)
      let retreatClean = next01() < retreatRate
      if (freeRetreat) {
        retreatClean = true
      }
      let goldGain = Math.round(danger * 0.6)
      let expGain = Math.round(danger * 0.4)
      if (!retreatClean) {
        goldGain = Math.round(goldGain * 0.75)
        expGain = Math.round(expGain * 0.75)
      }
      goldGain = Math.round(goldGain * (mod.exploreCashoutGoldMult ?? 1))
      expGain = Math.round(expGain * (mod.exploreCashoutExpMult ?? 1))
      
      // TICKET-HP-1: 收手回血 = 6 + round(danger * 0.12)
      const heal = 6 + Math.round(danger * 0.12)
      const newHp = Math.min(basePlayer.maxHp, basePlayer.hp + heal)
      
      let nextState: GameState = advanceDailyMission(state, 'retreat_success')
      
      // TICKET-7: 连斩宝箱结算（streak 越高，掉落权重越高）
      // TICKET-12: 传承升级可增加额外掉落次数
      let chestDrops: LootDrop[] = []
      if (streak > 0) {
        const legacyCtx = buildLegacyModifiers(state.meta)
        const extraDrops = Math.floor(legacyCtx.streakChestExtraDrop)
        const dropCount = 1 + extraDrops
        // 宝箱掉落：使用高权重（danger 和 streak 都计入）
        const chestWeightDanger = Math.min(danger + streak * 5, DANGER_MAX)
        const { nextState: stateWithChest, drops } = generateAndApplyLoot(
          nextState,
          chestWeightDanger,
          streak,
          rngWithCount,
          dropCount,
        )
        nextState = stateWithChest
        chestDrops = drops
        nextState = addLog(nextState, `【连斩宝箱】连斩${streak}层结算，额外掉落！`)
      }
      
      const { nextPlayer: expPlayer } = applyExpGain(nextState, expGain)
      nextState = {
        ...nextState,
        screen: 'home',
        player: {
          ...nextState.player,
          level: expPlayer.level ?? nextState.player.level ?? 1,
          exp: expPlayer.exp ?? 0,
          spiritStones: nextState.player.spiritStones + goldGain,
          hp: newHp,
        },
        run: {
          ...baseRun,
          danger: 0,
          pendingReward: 0,
          depth: 0,
          streak: 0,
          chainProgress: {},
          currentEvent: undefined,
          pendingLoot: chestDrops.length > 0 ? chestDrops : undefined,
          temp: freeRetreat
            ? { ...baseRun.temp, exploreFreeRetreat: Math.max(0, (baseRun.temp?.exploreFreeRetreat ?? 0) - 1) }
            : baseRun.temp,
        },
      }
      if (freeRetreat) {
        nextState = addLog(nextState, '【遁空丹】无损撤退，收获全拿！')
      }
      if (!retreatClean && !freeRetreat) {
        nextState = addLog(nextState, '【撤退惊险】未能全身而退，损失部分收获。')
      }
      nextState = addLog(nextState, `【收手】你见好就收：灵石+${goldGain}，修为+${expGain}，生命+${heal}，危险值归零。`)
      const cashoutStreak = (baseRun.streaks?.cashout_streak ?? 0) + 1
      const hpPct = basePlayer.maxHp > 0 ? basePlayer.hp / basePlayer.maxHp : 1
      nextState = mergeAchievementProgress(nextState, {
        statsLifetimeAdd: { explore_cashouts: 1 },
        streaksSet: { cashout_streak: cashoutStreak },
        flagsSet: {
          ...(danger >= 70 && hpPct <= 0.3 ? { explore_low_hp_cashout: true } : {}),
          ...(danger >= 90 ? { explore_greed_cashout: true } : {}),
        },
      })
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_BACK': {
      let nextState: GameState = {
        ...state,
        screen: 'home',
        run: {
          ...baseRun,
          danger: 0,
          streak: 0,
          currentEvent: undefined,
          pendingLoot: undefined,
        },
      }
      nextState = addLog(nextState, '离开探索，返回主界面。')
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_CHOOSE': {
      const finaleChoose = tryTribulationFinaleIfNoTime(state, rngWithCount)
      if (finaleChoose) return { ...finaleChoose, run: { ...finaleChoose.run, rngCalls } }
      const current = baseRun.currentEvent
      if (!current) {
        return { ...state, run: { ...state.run, rngCalls } }
      }

      if (current.chainId != null && current.chapter != null) {
        const chainDef = getChain(current.chainId)
        const ch = getChapter(current.chainId, current.chapter)
        if (!chainDef || !ch) {
          let nextState: GameState = { ...state, run: { ...baseRun, currentEvent: undefined } }
          nextState = addLog(nextState, '奇遇已远去。')
          return { ...nextState, run: { ...nextState.run, rngCalls } }
        }
        const syntheticEvent: ExploreEvent = {
          id: current.id,
          title: ch.title,
          text: ch.text,
          minDanger: 0,
          maxDanger: 100,
          choices: ch.choices as ExploreEvent['choices'],
        }
        let nextState = resolveExploreChoice(state, syntheticEvent, action.choice, next01, nextInt)
        const chain = baseRun.chain ?? { completed: {} }
        if (ch.final && ch.guaranteedReward) {
          const { player: nextPlayer, runDelta } = applyGuaranteedReward(nextState.player, ch.guaranteedReward, rngWithCount)
          nextState = {
            ...nextState,
            player: nextPlayer,
            run: {
              ...nextState.run,
              currentEvent: undefined,
              chain: { ...chain, activeChainId: undefined, chapter: undefined, completed: { ...chain.completed, [current.chainId]: true } },
              ...(runDelta?.shopDiscountPercent != null && { shopDiscountPercent: runDelta.shopDiscountPercent }),
              ...(runDelta?.tribulationDmgReductionPercent != null && { tribulationDmgReductionPercent: runDelta.tribulationDmgReductionPercent }),
              ...(runDelta?.earnedTitle != null && { earnedTitle: runDelta.earnedTitle }),
            },
          }
          nextState = addLog(nextState, `【金】奇遇通关《${chainDef.name}》！你获得终章大货。`)
        } else {
          nextState = {
            ...nextState,
            run: {
              ...nextState.run,
              currentEvent: undefined,
              chain: { ...chain, chapter: (current.chapter ?? 0) + 1 },
            },
          }
        }
        if (nextState.screen === 'death' && chain.activeChainId) {
          const comp = DEFAULT_BREAK_COMPENSATION
          const p = nextState.player
          const fp = p.fragmentParts ?? {}
          const recipeParts = fp[comp.fragmentRecipeId] ?? { upper: 0, middle: 0, lower: 0 }
          nextState = {
            ...nextState,
            player: {
              ...p,
              pity: (p.pity ?? 0) + comp.pityPlus,
              fragmentParts: {
                ...fp,
                [comp.fragmentRecipeId]: {
                  ...recipeParts,
                  upper: recipeParts.upper + comp.fragmentCount,
                },
              },
              materials: {
                ...p.materials,
                [comp.materialId]: (p.materials[comp.materialId] ?? 0) + comp.materialCount,
              },
            },
            run: {
              ...nextState.run,
              chain: { ...(nextState.run.chain ?? { completed: {} }), activeChainId: undefined, chapter: undefined },
            },
          }
          nextState = addLog(nextState, '虽未竟全功，亦有残卷与保底相随。')
        }
        if (nextState.screen !== 'death') {
          const danger = nextState.run.danger
          const streak = nextState.run.streak ?? 0
          if (ch.final && ch.guaranteedReward) {
            const reward = ch.guaranteedReward
            const completedChain = nextState.run.chain?.completed ?? {}
            // 材料链终章：只发描述中的特定材料，不再额外随机传说掉落，避免与描述不符
            if (reward.type === 'epic_material_elixir') {
              const materialDrop: LootDrop = {
                rarity: 'epic',
                item: { type: 'material', id: reward.materialId as MaterialId, count: reward.materialCount },
              }
              nextState = addLog(nextState, `【金】奇遇通关《${chainDef.name}》！终章大货：${getMaterialName(reward.materialId as MaterialId)}×${reward.materialCount}已入手。`)
              nextState = {
                ...nextState,
                screen: 'home',
                run: {
                  ...nextState.run,
                  danger: 0,
                  streak: 0,
                  currentEvent: undefined,
                  chain: { completed: completedChain },
                  pendingLoot: [materialDrop],
                },
              }
            } else {
              // 非材料链终章：保留一次传说掉落 + 结束本次探索
              const chainCompleteMeta = { ...nextState.meta, pityLegendLoot: PITY_LEGEND_LOOT_HARD }
              const chainCompleteState = { ...nextState, meta: chainCompleteMeta }
              const lootDanger = Math.max(danger, 70)
              const { nextState: stateWithLoot, drops: chainDrops } = generateAndApplyLoot(
                chainCompleteState,
                lootDanger,
                streak,
                rngWithCount,
                1,
              )
              nextState = addLog(
                stateWithLoot,
                `🌟【传说奇遇】《${chainDef.name}》通关！终章大货与天降机缘已入手，本次探索结束。`,
              )
              nextState = {
                ...nextState,
                screen: 'home',
                run: {
                  ...stateWithLoot.run,
                  danger: 0,
                  streak: 0,
                  currentEvent: undefined,
                  chain: { completed: stateWithLoot.run.chain?.completed ?? completedChain },
                  pendingLoot: chainDrops.length > 0 ? chainDrops : undefined,
                },
              }
            }
          } else {
            const { nextState: stateWithEventLoot, drops: eventDrops } = generateAndApplyLoot(
              nextState,
              danger,
              streak,
              rngWithCount,
              1,
            )
            const sessionLoot = [...(stateWithEventLoot.run.exploreSessionLoot ?? []), ...eventDrops]
            nextState = {
              ...stateWithEventLoot,
              screen: 'explore',
              run: {
                ...stateWithEventLoot.run,
                pendingLoot: eventDrops.length > 0 ? eventDrops : undefined,
                exploreSessionLoot: sessionLoot,
              },
            }
          }
        }
        // 传说奇遇整条链只消耗 1 时辰：仅终章完成时扣时，中间章节不扣
        const chainTimeCost = ch.final && ch.guaranteedReward ? 1 : 0
        nextState = applyTimeAndMaybeFinale(nextState, chainTimeCost, rngWithCount)
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }

      const event = findEventById(current.id)
      if (!event) {
        let nextState: GameState = {
          ...state,
          run: { ...baseRun, currentEvent: undefined },
        }
        nextState = addLog(nextState, '事件已远去，只得继续前行。')
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }
      let nextState = resolveExploreChoice(
        state,
        event,
        action.choice,
        next01,
        nextInt,
      )
      if (nextState.screen !== 'death') {
        const danger = nextState.run.danger
        const streak = nextState.run.streak ?? 0
        const { nextState: stateWithEventLoot, drops: eventDrops } = generateAndApplyLoot(
          nextState,
          danger,
          streak,
          rngWithCount,
          1,
        )
        const sessionLoot = [...(stateWithEventLoot.run.exploreSessionLoot ?? []), ...eventDrops]
        nextState = {
          ...stateWithEventLoot,
          screen: 'explore',
          run: {
            ...stateWithEventLoot.run,
            pendingLoot: eventDrops.length > 0 ? eventDrops : undefined,
            exploreSessionLoot: sessionLoot,
          },
        }
      }
      nextState = applyTimeAndMaybeFinale(nextState, 1, rngWithCount)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_SHOW_CASH_OUT_SUMMARY': {
      const danger = baseRun.danger ?? 0
      const streak = baseRun.streak ?? 0
      let chestDrops: LootDrop[] = []
      if (streak > 0) {
        const legacyCtx = buildLegacyModifiers(state.meta)
        const extraDrops = Math.floor(legacyCtx.streakChestExtraDrop)
        const dropCount = 1 + extraDrops
        const chestWeightDanger = Math.min(danger + streak * 5, DANGER_MAX)
        chestDrops = generateLootOnly(state, chestWeightDanger, streak, rngWithCount, dropCount).drops
      }
      const nextState: GameState = {
        ...state,
        run: {
          ...baseRun,
          showingCashOutSummary: true,
          pendingChestDrops: chestDrops,
        },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_CONFIRM_CASH_OUT': {
      const danger = baseRun.danger ?? 0
      const pendingChestDrops = baseRun.pendingChestDrops ?? []
      const mod = getKungfuModifiers(state)
      let goldGain = Math.round(danger * 0.6)
      let expGain = Math.round(danger * 0.4)
      goldGain = Math.round(goldGain * (mod.exploreCashoutGoldMult ?? 1))
      expGain = Math.round(expGain * (mod.exploreCashoutExpMult ?? 1))
      const heal = 6 + Math.round(danger * 0.12)
      const newHp = Math.min(basePlayer.maxHp, basePlayer.hp + heal)

      let nextState: GameState = advanceDailyMission(state, 'retreat_success')
      let nextPlayer = { ...nextState.player }
      let meta = nextState.meta ?? {}
      for (const drop of pendingChestDrops) {
        const hadBefore = drop.item.type === 'kungfu' && nextPlayer.relics.includes(drop.item.id)
        nextPlayer = applyLootItem(nextPlayer, drop.item)
        meta = updatePityAfterLoot(drop.rarity === 'legendary', meta)
        if (drop.item.type === 'kungfu') {
          meta = updatePityAfterKungfuDrop(drop.rarity, meta)
          if (hadBefore) meta = addKungfaShards(meta, 1)
        }
      }
      const { nextPlayer: expPlayer } = applyExpGain({ ...nextState, player: nextPlayer, meta }, expGain)
      nextState = {
        ...nextState,
        player: {
          ...nextPlayer,
          level: expPlayer.level ?? nextPlayer.level ?? 1,
          exp: expPlayer.exp ?? 0,
          spiritStones: nextPlayer.spiritStones + goldGain,
          hp: newHp,
        },
        meta,
        screen: 'home',
        run: {
          ...baseRun,
          danger: 0,
          pendingReward: 0,
          depth: 0,
          streak: 0,
          chainProgress: {},
          currentEvent: undefined,
          pendingLoot: undefined,
          exploreSessionLoot: undefined,
          showingCashOutSummary: undefined,
          pendingChestDrops: undefined,
          temp: baseRun.temp,
        },
      }
      nextState = addLog(nextState, `【收手】你见好就收：灵石+${goldGain}，修为+${expGain}，生命+${heal}，危险值归零。`)
      const cashoutStreak = (baseRun.streaks?.cashout_streak ?? 0) + 1
      const hpPct = basePlayer.maxHp > 0 ? basePlayer.hp / basePlayer.maxHp : 1
      nextState = mergeAchievementProgress(nextState, {
        statsLifetimeAdd: { explore_cashouts: 1 },
        streaksSet: { cashout_streak: cashoutStreak },
        flagsSet: {
          ...(danger >= 70 && hpPct <= 0.3 ? { explore_low_hp_cashout: true } : {}),
          ...(danger >= 90 ? { explore_greed_cashout: true } : {}),
        },
      })
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'ALCHEMY_OPEN': {
      let nextState: GameState = {
        ...state,
        screen: 'alchemy',
        run: {
          ...baseRun,
          alchemyPlan: { recipeId: 'qi_pill_recipe', batch: 1, heat: 'wu' },
        },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'ALCHEMY_SET_RECIPE': {
      const batch = clamp(action.batch, 1, 5)
      const heat = action.heat ?? baseRun.alchemyPlan?.heat ?? 'wu'
      let nextState: GameState = {
        ...state,
        run: { ...baseRun, alchemyPlan: { recipeId: action.recipeId, batch, heat } },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'ALCHEMY_BREW_CONFIRM': {
      const finaleBrew = tryTribulationFinaleIfNoTime(state, rngWithCount)
      if (finaleBrew) return { ...finaleBrew, run: { ...finaleBrew.run, rngCalls } }
      const plan = baseRun.alchemyPlan ?? { recipeId: 'qi_pill_recipe', batch: 1, heat: 'wu' as const }
      const dailyModAlc = getDailyModifiersFromState(state)
      const pityQualityShift = getAlchemyPityQualityShift(state.meta ?? {})
      const mod = getKungfuModifiers(state)
      const mindAlcBonus = getMindAlchemySuccessBonus(basePlayer.mind ?? 50)
      const legacyAlc = buildLegacyModifiers(state.meta)
      const kungfuMod = {
        alchemyBoomMul: (mod.alchemyBoomMul ?? 1) * legacyAlc.alchemyBoomRateMul,
        alchemyQualityShift: (mod.alchemyQualityShift ?? 0) + legacyAlc.alchemyQualityShiftBlast + pityQualityShift,
        alchemySuccessAdd: (mod.alchemySuccessAdd ?? 0) + legacyAlc.alchemySuccessAdd + mindAlcBonus,
        alchemyCostMult: mod.alchemyCostMult ?? 1,
        alchemyBoomCompMult: mod.alchemyBoomCompMult ?? 1,
      }
      let { next, outcome } = resolveBrew(
        state,
        plan.recipeId,
        plan.batch,
        next01,
        nextInt,
        plan.heat ?? 'wu',
        dailyModAlc,
        kungfuMod,
      )
      // TICKET-13: 保底强制至少地品（pity>=HARD 且本炉未出地/天时）
      if (shouldForceAlchemyAtLeastDi(state.meta ?? {}) && outcome.success && outcome.elixirId && outcome.topQuality && outcome.topQuality !== 'di' && outcome.topQuality !== 'tian') {
        const elixirId = outcome.elixirId
        const items = { ...outcome.items }
        items[outcome.topQuality] -= 1
        items.di += 1
        next = {
          ...next,
          player: {
            ...next.player,
            elixirs: {
              ...next.player.elixirs,
              [elixirId]: {
                ...next.player.elixirs[elixirId],
                [outcome.topQuality]: next.player.elixirs[elixirId][outcome.topQuality] - 1,
                di: next.player.elixirs[elixirId].di + 1,
              },
            },
          },
        }
        outcome = { ...outcome, items, topQuality: 'di' as const }
      }
      let newMeta = updatePityAfterAlchemy(outcome.topQuality, state.meta ?? {})
      let title = '炼丹失败'
      let text = '药性不合，丹气散尽。'
      if (outcome.poolPill) {
        const def = getPillDef(outcome.poolPill.pillId)
        const pillName = def?.name ?? outcome.poolPill.pillId
        const qualityLabel = getQualityLabel(outcome.poolPill.quality)
        const rarityLabel = outcome.poolPill.rarity === 'legendary' ? '传说' : outcome.poolPill.rarity === 'rare' ? '稀有' : '普通'
        title = outcome.poolPill.isRulePill ? '逆天改命！' : '炼成！'
        text = `炼成：${pillName}·${qualityLabel}（${rarityLabel}）${outcome.successes > 1 ? ` 本次共${outcome.successes}枚机制丹。` : ''}`
        if (outcome.poolPill.isRulePill) text += ' 逆天改命！'
      } else if (outcome.topQuality === 'tian') {
        title = '天品出世！！'
        text = `金光冲天，天品丹成！本次炼出${outcome.items.tian}枚天品丹！`
      } else if (outcome.topQuality === 'di') {
        title = '地品丹成！'
        text = `紫气东来，地品丹成！本次炼出${outcome.items.di}枚地品丹！`
      } else if (outcome.success) {
        title = '成丹！'
        text = `丹香四溢，灵光凝聚！本次成丹${outcome.successes}枚。`
      }
      if (outcome.booms > 0) {
        if (!outcome.poolPill) title = outcome.topQuality === 'tian' ? '天品出世（但有爆丹）' : '爆丹！'
        text = `炉火反噬，连续${outcome.streakBoom}次爆丹！${text}`
      }
      if (outcome.streakSuccess >= 3 && !outcome.poolPill) {
        text += ` 连续${outcome.streakSuccess}次成丹！`
      }

      let nextState: GameState = {
        ...next,
        meta: newMeta,
        screen: 'alchemy',
        run: {
          ...next.run,
          alchemyPlan: plan,
          lastOutcome: {
            kind: 'alchemy',
            title,
            text,
            boomed: outcome.boomed,
            produced: outcome.topQuality && outcome.elixirId
              ? { elixirId: outcome.elixirId, quality: outcome.topQuality, count: outcome.items[outcome.topQuality] }
              : undefined,
            poolPill: outcome.poolPill,
            hpDelta: outcome.hpChange,
            attempted: outcome.attempted,
            booms: outcome.booms,
            successes: outcome.successes,
            items: outcome.items,
            topQuality: outcome.topQuality,
            streakSuccess: outcome.streakSuccess,
            streakBoom: outcome.streakBoom,
          },
        },
      }
      if (outcome.success && !outcome.boomed) {
        nextState = advanceDailyMission(nextState, 'brew_success')
      }
      if (nextState.player.hp <= 0) {
        nextState = {
          ...nextState,
          screen: 'death',
          summary: { cause: '爆丹反噬', turns: nextState.run.turn, endingId: 'death' },
          meta: { ...nextState.meta, legacyPoints: (nextState.meta?.legacyPoints ?? 0) + 1 },
        }
      }
      const realmIdx = realmIndex(basePlayer.realm)
      const recipe = getRecipe(plan.recipeId)
      const rates = recipe
        ? getAlchemyRates({
            recipe,
            realmIndex: realmIdx,
            pity: basePlayer.pity,
            totalBrews: next.player.codex?.totalBrews ?? 0,
            heat: plan.heat ?? 'wu',
            dailyMod: dailyModAlc,
            kungfuMod,
          })
        : { finalSuccessRate: 0, finalBoomRate: 0 }
      const flagsAlc: Record<string, true> = {}
      if (outcome.success && rates.finalBoomRate >= 0.15) flagsAlc.alchemy_boom_high_success = true
      if (outcome.success && rates.finalSuccessRate <= 0.25) flagsAlc.alchemy_low_rate_success = true
      if (mod.alchemySuccessAdd && mod.alchemySuccessAdd > 0 && outcome.success) flagsAlc.build_danxiu_triggered = true
      nextState = mergeAchievementProgress(nextState, {
        statsLifetimeAdd: {
          alchemy_success_lifetime: outcome.successes ?? 0,
          alchemy_boom_lifetime: outcome.booms ?? 0,
          ...(outcome.topQuality === 'tian' ? { alchemy_tian_lifetime: outcome.items?.tian ?? 1 } : {}),
        },
        statsRunAdd: { run_alchemy_count: outcome.attempted ?? 0 },
        streaksSet: { alchemy_success_streak: outcome.boomed ? 0 : (outcome.streakSuccess ?? 0) },
        ...(Object.keys(flagsAlc).length > 0 ? { flagsSet: flagsAlc } : {}),
      })
      nextState = applyTimeAndMaybeFinale(nextState, 1, rngWithCount)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'ALCHEMY_OPEN_CODEX': {
      let nextState: GameState = { ...state, screen: 'alchemy_codex' }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'RECIPE_SYNTHESIZE': {
      const { recipeId } = action
      if (!canSynthesizeRecipe(state.player, recipeId)) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      const recipe = getRecipe(recipeId)
      const fp = state.player.fragmentParts ?? {}
      const parts = fp[recipeId] ?? { upper: 0, middle: 0, lower: 0 }
      const nextParts = {
        ...fp,
        [recipeId]: {
          upper: Math.max(0, parts.upper - 1),
          middle: Math.max(0, parts.middle - 1),
          lower: Math.max(0, parts.lower - 1),
        },
      }
      let nextState: GameState = {
        ...state,
        player: {
          ...state.player,
          fragmentParts: nextParts,
          recipesUnlocked: { ...state.player.recipesUnlocked, [recipeId]: true },
        },
      }
      nextState = addLog(nextState, `【丹方合成】消耗上/中/下篇残页各一，获得丹方《${recipe?.name ?? recipeId}》`)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'BREAKTHROUGH_OPEN': {
      const plan = createBreakthroughPlan(state, 0, undefined)
      let nextState: GameState = {
        ...state,
        screen: 'breakthrough',
        run: { ...baseRun, breakthroughPlan: plan },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'BREAKTHROUGH_SET_PLAN': {
      const plan = createBreakthroughPlan(
        state,
        action.inheritanceSpent,
        action.useElixir,
        action.pills,
        action.focus,
      )
      let nextState: GameState = {
        ...state,
        run: { ...baseRun, breakthroughPlan: plan },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'STAGE_BREAKTHROUGH_CONFIRM': {
      const finaleBreak = tryTribulationFinaleIfNoTime(state, rngWithCount)
      if (finaleBreak) return { ...finaleBreak, run: { ...finaleBreak.run, rngCalls } }
      const result = attemptStageBreakthrough(state, rngWithCount)
      let nextState: GameState = {
        ...state,
        player: result.nextPlayer,
        run: { ...baseRun, ...result.runDelta },
      }
      if (result.success) {
        nextState = addLog(nextState, `阶突破成功！进入第${result.nextPlayer.stageIndex ?? 0}阶，等级${result.nextPlayer.level}。`)
      } else if (result.runDelta.lastOutcome?.kind === 'breakthrough' && !result.runDelta.lastOutcome.success) {
        nextState = addLog(nextState, result.runDelta.lastOutcome.text ?? '阶突破失败。')
      }
      nextState = applyTimeAndMaybeFinale(nextState, 1, rngWithCount)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'BREAKTHROUGH_CONFIRM': {
      const finaleBreak = tryTribulationFinaleIfNoTime(state, rngWithCount)
      if (finaleBreak) return { ...finaleBreak, run: { ...finaleBreak.run, rngCalls } }
      const planRaw: NonNullable<GameState['run']['breakthroughPlan']> =
        baseRun.breakthroughPlan ?? createBreakthroughPlan(state, 0, undefined)
      const pills = planRaw.pills ?? (planRaw.useElixir ? [planRaw.useElixir] : [])
      const btPlan: BreakthroughPlan = {
        pills,
        inheritanceSpent: planRaw.inheritanceSpent,
        focus: planRaw.focus ?? 'steady',
      }
      const result = attemptBreakthrough(state, btPlan, rngWithCount)
      let stateAfterMission = advanceDailyMission(state, 'attempt_breakthrough')
      let nextState: GameState = {
        ...stateAfterMission,
        player: result.nextPlayer,
        run: { ...baseRun, ...result.runDelta },
      }
      const dailyBonusForRate = getDailyModifiersFromState(state).breakthroughSuccessBonus ?? 0
      const rate = result.runDelta.lastOutcome?.kind === 'breakthrough'
        ? calcBreakthroughRateWithBreakdown(state, planRaw.inheritanceSpent, pills, dailyBonusForRate).rate
        : 0
      if (result.success) {
        nextState = addLog(nextState, `突破成功，境界提升至${result.nextPlayer.realm}`)
        const btStreak = (baseRun.streaks?.breakthrough_success_streak ?? 0) + 1
        const hpPctBt = basePlayer.maxHp > 0 ? basePlayer.hp / basePlayer.maxHp : 1
        const modBreakthrough = getKungfuModifiers(nextState)
        const flagsBt: Record<string, true> = {}
        if (rate < 0.4) flagsBt.breakthrough_low_rate_success = true
        if (hpPctBt <= 0.35) flagsBt.breakthrough_low_hp_success = true
        if (state.player.pity >= 3 && rate >= 0.3) flagsBt.breakthrough_pity_success = true
        if (modBreakthrough.breakthroughSuccessAdd && modBreakthrough.breakthroughSuccessAdd > 0) flagsBt.build_chongguan_triggered = true
        nextState = mergeAchievementProgress(nextState, {
          statsLifetimeAdd: { breakthrough_success_lifetime: 1 },
          streaksSet: { breakthrough_success_streak: btStreak },
          ...(Object.keys(flagsBt).length > 0 ? { flagsSet: flagsBt } : {}),
        })
        if (result.runDelta.pendingAwakenChoices?.length) {
          nextState = { ...nextState, screen: 'awaken_skill' }
        } else {
          nextState = applyTimeAndMaybeFinale(nextState, 1, rngWithCount)
        }
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }
      const legacyCtx = buildLegacyModifiers(stateAfterMission.meta)
      const inheritanceGain = (result.nextPlayer.inheritancePoints ?? 0) - (basePlayer.inheritancePoints - planRaw.inheritanceSpent)
      const dropRealm = result.nextPlayer.realm !== basePlayer.realm
      nextState = addLog(nextState, `突破失败，获得${inheritanceGain}点献祭传承（本局突破用，非传承页点数）${dropRealm ? '，心魔反噬境界跌落一重' : ''}`)
      nextState = mergeAchievementProgress(nextState, {
        statsLifetimeAdd: { breakthrough_fail_lifetime: 1 },
        streaksSet: { breakthrough_success_streak: 0 },
      })
      if (result.nextPlayer.hp <= 0 && legacyCtx.breakthroughDeathProtectionOnce > 0) {
        nextState = {
          ...nextState,
          player: { ...result.nextPlayer, hp: 1 },
        }
        nextState = addLog(nextState, '【逆天改命】心魔一击本应致命，但你已窥见天机，保命至1点生命！')
      }
      if (result.nextPlayer.hp <= 0) {
        nextState = {
          ...nextState,
          screen: 'death',
          summary: { cause: '心魔反噬', turns: result.runDelta.turn, endingId: 'death' },
        }
      }
      nextState = applyTimeAndMaybeFinale(nextState, 1, rngWithCount)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'CHOOSE_AWAKEN_SKILL': {
      const { nextPlayer, nextRun } = chooseAwakenSkill(state, action.skillId)
      let nextState: GameState = {
        ...state,
        player: nextPlayer,
        run: { ...baseRun, ...nextRun },
        screen: 'home',
      }
      nextState = addLog(nextState, '觉醒成功，已领悟新技能。')
      nextState = applyTimeAndMaybeFinale(nextState, 1, rngWithCount)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'USE_PILL': {
      const context = action.context as import('./pills/types').PillContext
      if (!canUsePill(state, { pillId: action.pillId, quality: action.quality }, context)) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      const { state: nextState } = applyPillEffect(
        state,
        { pillId: action.pillId, quality: action.quality },
        context,
        rngWithCount,
      )
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'OUTCOME_CONTINUE': {
      let nextState: GameState = {
        ...state,
        screen: action.to,
        run: {
          ...baseRun,
          breakthroughPlan: undefined,
          lastOutcome: undefined,
        },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'OUTCOME_RETRY_BREAKTHROUGH': {
      // TICKET-9: 保留上次预设（从 lastOutcome.consumed 恢复）
      let plan: NonNullable<GameState['run']['breakthroughPlan']>
      const lastOutcome = state.run.lastOutcome
      if (lastOutcome?.kind === 'breakthrough' && lastOutcome.consumed) {
        plan = createBreakthroughPlan(state, lastOutcome.consumed.inheritanceSpent, lastOutcome.consumed.elixir)
      } else {
        plan = createBreakthroughPlan(state, 0, undefined)
      }
      let nextState: GameState = {
        ...state,
        screen: 'breakthrough',
        run: {
          ...baseRun,
          breakthroughPlan: plan,
          lastOutcome: undefined,
        },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'RELIC_EQUIP': {
      const { slotIndex, relicId } = action
      if (slotIndex < 0 || slotIndex >= RELIC_SLOTS) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      const current = [...(basePlayer.equippedRelics ?? [null, null, null])] as (RelicId | null)[]
      if (relicId !== null) {
        if (!basePlayer.relics?.includes(relicId as RelicId) || !relicRegistry[relicId as RelicId]) {
          return { ...state, run: { ...state.run, rngCalls } }
        }
        const gate = canEquipKungfu(state, relicId)
        if (!gate.ok) {
          return { ...state, run: { ...state.run, rngCalls } }
        }
        const alreadySlot = current.indexOf(relicId as RelicId)
        if (alreadySlot >= 0) current[alreadySlot] = null
      }
      current[slotIndex] = relicId as RelicId | null
      const equippedRelics: [RelicId | null, RelicId | null, RelicId | null] = [current[0] ?? null, current[1] ?? null, current[2] ?? null]
      let nextState: GameState = {
        ...state,
        player: { ...basePlayer, equippedRelics },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'SYNC_DAILY': {
      const dayKey = action.dayKey
      const current = state.meta?.daily
      if (current && current.dayKey === dayKey) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      const { environmentId, mission } = generateDailyEnvironment(dayKey, state.run.seed)
      let nextState: GameState = {
        ...state,
        meta: {
          ...state.meta,
          daily: { dayKey, environmentId, mission: { ...mission, progress: 0, claimed: false } },
        },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'DAILY_CLAIM': {
      const daily = state.meta?.daily
      if (!daily || daily.mission.claimed || daily.mission.progress < daily.mission.target) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      const def = getDailyEnvironmentDef(daily.environmentId as DailyEnvironmentId)
      const reward = def.reward as DailyReward
      let nextPlayer = { ...basePlayer }
      let rewardLabel = ''
      if (reward.type === 'material') {
        const cur = nextPlayer.materials[reward.id] ?? 0
        nextPlayer.materials = { ...nextPlayer.materials, [reward.id]: cur + reward.count }
        rewardLabel = `${getMaterialName(reward.id as MaterialId)} x${reward.count}`
      } else if (reward.type === 'fragment') {
        const part = next01() < 0.334 ? 'upper' : next01() < 0.667 ? 'middle' : 'lower'
        const fp = nextPlayer.fragmentParts ?? {}
        const recipeParts = fp[reward.recipeId] ?? { upper: 0, middle: 0, lower: 0 }
        nextPlayer.fragmentParts = {
          ...fp,
          [reward.recipeId]: { ...recipeParts, [part]: recipeParts[part] + reward.count },
        }
        const recipe = getRecipe(reward.recipeId)
        const partLabel = part === 'upper' ? '上篇' : part === 'middle' ? '中篇' : '下篇'
        rewardLabel = `${recipe?.name ?? reward.recipeId}残页（${partLabel}）x${reward.count}`
      } else if (reward.type === 'inheritance') {
        nextPlayer.inheritancePoints = nextPlayer.inheritancePoints + reward.count
        rewardLabel = `传承点 x${reward.count}`
      } else if (reward.type === 'pills') {
        nextPlayer.pills = nextPlayer.pills + reward.count
        rewardLabel = `丹药 x${reward.count}`
      } else if (reward.type === 'elixir') {
        const quality = Array.isArray(reward.quality)
          ? (next01() < 0.5 ? reward.quality[0] : reward.quality[1])
          : reward.quality
        const existing = nextPlayer.elixirs[reward.elixirId] ?? { fan: 0, xuan: 0, di: 0, tian: 0 }
        const cur = existing[quality] ?? 0
        nextPlayer.elixirs = {
          ...nextPlayer.elixirs,
          [reward.elixirId]: {
            ...existing,
            [quality]: cur + reward.count,
          },
        }
        rewardLabel = `${getElixirName(reward.elixirId)}（${getQualityLabel(quality)}）x${reward.count}`
      }
      let nextState: GameState = {
        ...state,
        player: nextPlayer,
        meta: {
          ...state.meta,
          daily: { ...daily, mission: { ...daily.mission, claimed: true } },
        },
        run: { ...baseRun, dailyRewardJustClaimed: rewardLabel },
      }
      nextState = addLog(nextState, `领取今日赠礼：获得 ${rewardLabel}！`)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'CLEAR_DAILY_REWARD_TOAST': {
      const { dailyRewardJustClaimed: _, ...restRun } = baseRun
      return { ...state, run: { ...restRun, rngCalls } }
    }
    case 'CLEAR_PILL_TOAST': {
      const temp = baseRun.temp ? { ...baseRun.temp, pillToast: undefined } : baseRun.temp
      return { ...state, run: { ...baseRun, temp, rngCalls } }
    }
    case 'KUNGFU_SHARD_EXCHANGE': {
      const { kungfuId, rarity } = action
      const def = getKungfu(kungfuId as RelicId)
      if (!def || def.rarity !== rarity) {
        let nextState = addLog(state, '兑换失败：功法不存在或稀有度不匹配。')
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }
      const result = spendKungfaShardsForRarity(state.meta ?? {}, rarity)
      if (!result.success) {
        let nextState = addLog(state, `碎片不足，需要 ${result.cost} 才能兑换该稀有度功法。`)
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }
      const alreadyOwned = basePlayer.relics.includes(kungfuId as RelicId)
      if (alreadyOwned) {
        let nextState = addLog(state, '已拥有该功法，无需兑换。')
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }
      const nextPlayer = { ...basePlayer, relics: [...basePlayer.relics, kungfuId as RelicId] }
      let nextState: GameState = {
        ...state,
        player: nextPlayer,
        meta: result.newMeta,
      }
      nextState = addLog(nextState, `【碎片兑换】你以碎片换得《${def.name}》！`)
      nextState = {
        ...nextState,
        run: { ...nextState.run, shardExchangeJustClaimed: def.name, rngCalls },
      }
      return nextState
    }
    case 'CLEAR_SHARD_EXCHANGE_TOAST': {
      const { shardExchangeJustClaimed: _, ...restRun } = baseRun
      return { ...state, run: { ...restRun, rngCalls } }
    }
    case 'LEGACY_UNLOCK': {
      const { unlockId } = action
      if (!canBuyUnlock(state.meta, unlockId).can) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      const nextMeta = buyUnlock(state.meta, unlockId)
      if (!nextMeta) return { ...state, run: { ...state.run, rngCalls } }
      return {
        ...state,
        meta: nextMeta,
        run: { ...baseRun, rngCalls, legacyUnlockToast: '传承已刻入命魂！' },
      }
    }
    case 'CLEAR_LEGACY_UNLOCK_TOAST': {
      const { legacyUnlockToast: _, ...restRun } = baseRun
      return { ...state, run: { ...restRun, rngCalls } }
    }
    case 'TRIBULATION_ACTION': {
      const trib = baseRun.tribulation
      if (!trib) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      if (action.action === 'PILL' && !action.pill) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      if (action.action === 'PILL' && action.pill) {
        const gate = canTakePill(state, action.pill.quality)
        if (!gate.ok) {
          return { ...state, run: { ...state.run, rngCalls } }
        }
      }
      const { state: nextStateRaw, outcome } = applyTribulationAction(
        state,
        action.action,
        rngWithCount,
        action.pill,
      )
      let nextState: GameState = nextStateRaw
      if (action.action === 'PILL' && action.pill) {
        nextState = { ...nextState, run: recordPillUse(nextState.run, action.pill.quality) }
      }
      const tribulationReduction = baseRun.tribulationDmgReductionPercent ?? 0
      const flagsTrib: Record<string, true> = tribulationReduction > 0 ? { tribulation_dmg_reduced: true } : {}

      if (outcome === 'lose') {
        const currentLevel = trib.level
        const failStateForCalc = { ...nextState, run: { ...nextState.run, tribulation: trib, tribulationsCleared: (nextState.run.tribulationLevel ?? 0) } }
        const failLegacy = calcLegacyPointsOnEnd(failStateForCalc, 'death')
        const rewards = getFinalRewards('dead')
        const runSummary = buildRunSummary(failStateForCalc, 'death', {
          failedAtTribulationIdx: currentLevel,
          cause: ENDING_TITLES.dead,
          endingId: 'dead',
          legacyPointsEarned: failLegacy,
        })
        const mod = getKungfuModifiers(state)
        const hasTribMod = (mod.tribulationDamageMult != null && mod.tribulationDamageMult !== 1) || (mod.tribulationSurgeRateAdd != null && mod.tribulationSurgeRateAdd !== 0)
        let st: GameState = addLog(
          {
            ...nextState,
            screen: 'final_result',
            run: {
              ...nextState.run,
              tribulation: undefined,
              tribulationIdx: 0,
              ending: 'death',
              runSummary,
            },
            summary: {
              cause: ENDING_TITLES.dead,
              turns: state.run.turn,
              endingId: 'dead',
            },
            meta: {
              ...nextState.meta,
              legacyPoints: (nextState.meta?.legacyPoints ?? 0) + failLegacy,
              kungfaShards: (nextState.meta?.kungfaShards ?? 0) + rewards.shardsBonus,
              tribulationFinaleTriggered: true,
            },
          },
          `天劫结束：${ENDING_TITLES.dead} 传承点 +${failLegacy}，碎片 +${rewards.shardsBonus}。`,
        )
        st = mergeAchievementProgress(st, {
          statsLifetimeAdd: { tribulation_fail_lifetime: 1, games_completed: 1 },
          streaksSet: { tribulation_success_streak: 0 },
          ...(hasTribMod ? { flagsSet: { build_mod_tribulation: true } } : {}),
        })
        return { ...st, run: { ...st.run, rngCalls } }
      }

      if (outcome === 'win') {
        const newLevel = trib.level
        const isVictory = newLevel >= 12
        const rewards = getFinalRewards(isVictory ? 'ascend' : 'retire')

        const mod = getKungfuModifiers(state)
        const hasTribMod = (mod.tribulationDamageMult != null && mod.tribulationDamageMult !== 1) || (mod.tribulationSurgeRateAdd != null && mod.tribulationSurgeRateAdd !== 0)
        const flagsWin: Record<string, true> = { ...flagsTrib, ...(hasTribMod ? { build_mod_tribulation: true } : {}) }

        if (isVictory) {
          const victoryStateForCalc = { ...nextState, run: { ...nextState.run, tribulationsCleared: 12, tribulationLevel: 12 } }
          const victoryLegacy = calcLegacyPointsOnEnd(victoryStateForCalc, 'victory')
          const runSummary = buildRunSummary(victoryStateForCalc, 'victory', {
            cause: ENDING_TITLES.ascend,
            endingId: 'ascend',
            legacyPointsEarned: victoryLegacy,
          })
          let st: GameState = addLog(
            {
              ...nextState,
              screen: 'victory',
              run: {
                ...nextState.run,
                tribulationLevel: 12,
                tribulationIdx: 0,
                tribulationsCleared: 12,
                tribulation: undefined,
                ending: 'victory',
                runSummary,
              },
              summary: {
                cause: ENDING_TITLES.ascend,
                turns: state.run.turn,
                endingId: 'ascend',
              },
              meta: {
                ...nextState.meta,
                legacyPoints: (nextState.meta?.legacyPoints ?? 0) + victoryLegacy,
                kungfaShards: (nextState.meta?.kungfaShards ?? 0) + rewards.shardsBonus,
                tribulationFinaleTriggered: true,
              },
            },
            `十二劫尽渡！传承点 +${victoryLegacy}，碎片 +${rewards.shardsBonus}。`,
          )
          const tribStreak = (baseRun.streaks?.tribulation_success_streak ?? 0) + 1
          st = mergeAchievementProgress(st, {
            statsLifetimeAdd: { tribulation_success_lifetime: 1, games_completed: 1 },
            streaksSet: { tribulation_success_streak: tribStreak },
            ...(Object.keys(flagsWin).length > 0 ? { flagsSet: flagsWin } : {}),
          })
          return { ...st, run: { ...st.run, rngCalls } }
        }

        const totalLegacy = 1 + rewards.legacyBonus
        const nextSegmentTime = getTimeMaxForSegment(newLevel)
        let st: GameState = addLog(
          {
            ...nextState,
            screen: 'home',
            run: {
              ...nextState.run,
              tribulationLevel: newLevel,
              tribulationIdx: 0,
              tribulationsCleared: newLevel,
              tribulation: undefined,
              timeLeft: nextSegmentTime,
              timeMax: nextSegmentTime,
            },
            meta: {
              ...nextState.meta,
              legacyPoints: (nextState.meta?.legacyPoints ?? 0) + totalLegacy,
              kungfaShards: (nextState.meta?.kungfaShards ?? 0) + rewards.shardsBonus,
              tribulationFinaleTriggered: false,
            },
          },
          `渡过第 ${newLevel} 重天劫！传承点 +${totalLegacy}，时辰重置。`,
        )
        const tribStreakMid = (baseRun.streaks?.tribulation_success_streak ?? 0) + 1
        st = mergeAchievementProgress(st, {
          statsLifetimeAdd: { tribulation_success_lifetime: 1 },
          streaksSet: { tribulation_success_streak: tribStreakMid },
          ...(Object.keys(flagsWin).length > 0 ? { flagsSet: flagsWin } : {}),
        })
        return { ...st, run: { ...st.run, rngCalls } }
      }

      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'FINAL_TRIAL_CHOOSE': {
      const ft = baseRun.finalTrial
      if (!ft || ft.step < 1 || ft.step > 3) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      const step = ft.step
      const mod = getKungfuModifiers(state)
      let dmgBase = getDmgBase(ft.threat, step)
      dmgBase = Math.max(1, Math.round(dmgBase * (mod.tribulationDamageMult ?? 1)))
      const tribulationReduction = baseRun.tribulationDmgReductionPercent ?? 0
      const applyDmgReduction = (dmg: number) =>
        Math.max(1, Math.round(dmg * (1 - tribulationReduction / 100)))
      let newHp = basePlayer.hp
      let newResolve = ft.resolve
      let newChoices = [...ft.choices]
      let nextPlayer = { ...basePlayer }
      let logMsg = ''

      if (action.choice === 'steady') {
        const { dmg, resolveDelta } = applySteadyDamage(dmgBase, ft.resolve)
        const effectiveDmg = applyDmgReduction(dmg)
        newHp = Math.max(0, basePlayer.hp - effectiveDmg)
        newResolve = ft.resolve + resolveDelta
        newChoices = [...newChoices, '稳']
        logMsg = `【第${step}雷·稳】承受伤害 ${effectiveDmg}，道心 +${resolveDelta}。`
      } else if (action.choice === 'gamble') {
        const roll = next01()
        const { dmg, resolveDelta, success } = applyGamble(dmgBase, ft.resolve, roll)
        const effectiveDmg = applyDmgReduction(dmg)
        newHp = Math.max(0, basePlayer.hp - effectiveDmg)
        newResolve = ft.resolve + resolveDelta
        newChoices = [...newChoices, success ? '搏成' : '搏败']
        logMsg = success
          ? `【第${step}雷·搏】逆天成功！伤害 ${effectiveDmg}，道心 +${resolveDelta}。`
          : `【第${step}雷·搏】逆天失败，承受 ${effectiveDmg} 伤害。`
      } else if (action.choice === 'sacrifice') {
        const kind = action.sacrificeKind ?? 'pills'
        if (!canSacrifice(state, kind)) {
          let st = addLog(state, `献祭资源不足（${kind}），无法献祭。`)
          return { ...st, run: { ...st.run, rngCalls } }
        }
        const ded = getSacrificeDeduction(kind)
        if (ded.spiritStones != null) nextPlayer = { ...nextPlayer, spiritStones: nextPlayer.spiritStones - ded.spiritStones }
        if (ded.pills != null) nextPlayer = { ...nextPlayer, pills: nextPlayer.pills - ded.pills }
        if (ded.inheritancePoints != null) nextPlayer = { ...nextPlayer, inheritancePoints: nextPlayer.inheritancePoints - ded.inheritancePoints }
        if (ded.material) {
          const cur = nextPlayer.materials[ded.material.id as keyof typeof nextPlayer.materials] ?? 0
          nextPlayer = { ...nextPlayer, materials: { ...nextPlayer.materials, [ded.material.id]: cur - ded.material.count } }
        }
        const sacResult = applySacrificeDamage(dmgBase, kind)
        const effectiveDmg = applyDmgReduction(sacResult.dmg)
        const healAmount = sacResult.heal
        const resolveDeltaSac = sacResult.resolveDelta
        newHp = Math.max(0, nextPlayer.hp - effectiveDmg + healAmount)
        newResolve = ft.resolve + resolveDeltaSac
        newChoices = [...newChoices, '献祭']
        nextPlayer = { ...nextPlayer, hp: newHp }
        logMsg = `【第${step}雷·献祭】消耗资源，承受伤害 ${effectiveDmg}${healAmount ? `，回血 +${healAmount}` : ''}，道心 +${newResolve - ft.resolve}。`
      } else {
        return { ...state, run: { ...state.run, rngCalls } }
      }

      if (action.choice !== 'sacrifice') {
        nextPlayer = { ...nextPlayer, hp: newHp }
      }

      const nextStep = step + 1
      if (nextStep > 3) {
        const endingId: EndingId = computeEndingId(newHp, newResolve, ft.threat)
        const rewards = getFinalRewards(endingId)
        const currentLevel = baseRun.tribulationLevel ?? 0
        const newLevel = currentLevel + 1
        const isDead = endingId === 'dead'
        const isVictory = !isDead && newLevel >= 12

        if (isVictory) {
          const victoryStateForCalc = {
            ...state,
            player: nextPlayer,
            run: { ...baseRun, tribulationsCleared: 12, tribulationLevel: 12 },
          }
          const victoryLegacy = calcLegacyPointsOnEnd(victoryStateForCalc, 'victory')
          const runSummary = buildRunSummary(victoryStateForCalc, 'victory', {
            cause: ENDING_TITLES[endingId],
            endingId: 'ascend',
            legacyPointsEarned: victoryLegacy,
          })
          let nextState: GameState = addLog(
            {
              ...state,
              player: nextPlayer,
              screen: 'victory',
              run: {
                ...baseRun,
                tribulationLevel: 12,
                tribulationIdx: 0,
                tribulationsCleared: 12,
                finalTrial: { ...ft, step: 3, resolve: newResolve, choices: newChoices },
                ending: 'victory',
                runSummary,
              },
              summary: {
                cause: ENDING_TITLES[endingId],
                turns: state.run.turn,
                endingId: 'ascend',
              },
              meta: {
                ...state.meta,
                legacyPoints: (state.meta?.legacyPoints ?? 0) + victoryLegacy,
                kungfaShards: (state.meta?.kungfaShards ?? 0) + rewards.shardsBonus,
                tribulationFinaleTriggered: true,
                ...(rewards.demonUnlock ? { demonPathUnlocked: true } : {}),
              },
            },
            logMsg + ` 十二劫尽渡！传承点 +${victoryLegacy}，碎片 +${rewards.shardsBonus}。`,
          )
          const tribStreak = (baseRun.streaks?.tribulation_success_streak ?? 0) + 1
          const flagsTrib: Record<string, true> = tribulationReduction > 0 ? { tribulation_dmg_reduced: true } : {}
          nextState = mergeAchievementProgress(nextState, {
            statsLifetimeAdd: { tribulation_success_lifetime: 1, games_completed: 1 },
            streaksSet: { tribulation_success_streak: tribStreak },
            ...(Object.keys(flagsTrib).length > 0 ? { flagsSet: flagsTrib } : {}),
          })
          return { ...nextState, run: { ...nextState.run, rngCalls } }
        }

        if (isDead) {
          const failedAtIdx = currentLevel + 1
          const failStateForCalc: GameState = {
            ...state,
            player: nextPlayer,
            run: {
              ...baseRun,
              tribulationLevel: currentLevel,
              tribulationsCleared: currentLevel,
              tribulation: {
                level: failedAtIdx,
                totalTurns: 3,
                turn: 0,
                shield: 0,
                debuffs: { mindChaos: 0, burn: 0, weak: 0 },
                wrath: 0,
                currentIntent: { id: '_', name: '_', rarity: 'common', baseDamageMin: 0, baseDamageMax: 0, telegraphText: '', counterHint: '', minTier: 0, baseWeight: 1 },
                log: [],
              } as TribulationState,
            },
          }
          const failLegacy = calcLegacyPointsOnEnd(failStateForCalc, 'death')
          const runSummary = buildRunSummary(failStateForCalc, 'death', {
            failedAtTribulationIdx: failedAtIdx,
            cause: ENDING_TITLES[endingId],
            endingId,
            legacyPointsEarned: failLegacy,
          })
          let nextState: GameState = addLog(
            {
              ...state,
              player: nextPlayer,
              screen: 'final_result',
              run: {
                ...baseRun,
                tribulationIdx: 0,
                ending: 'death',
                runSummary,
                finalTrial: { ...ft, step: 3, resolve: newResolve, choices: newChoices },
              },
              summary: {
                cause: ENDING_TITLES[endingId],
                turns: state.run.turn,
                endingId,
              },
              meta: {
                ...state.meta,
                legacyPoints: (state.meta?.legacyPoints ?? 0) + failLegacy,
                kungfaShards: (state.meta?.kungfaShards ?? 0) + rewards.shardsBonus,
                tribulationFinaleTriggered: true,
                ...(rewards.demonUnlock ? { demonPathUnlocked: true } : {}),
              },
            },
            logMsg + ` 天劫结束：${ENDING_TITLES[endingId]} 传承点 +${failLegacy}，碎片 +${rewards.shardsBonus}。`,
          )
          nextState = mergeAchievementProgress(nextState, {
            statsLifetimeAdd: { tribulation_fail_lifetime: 1, games_completed: 1 },
            streaksSet: { tribulation_success_streak: 0 },
          })
          return { ...nextState, run: { ...nextState.run, rngCalls } }
        }

        const totalLegacy = 1 + rewards.legacyBonus
        const nextSegmentTime = getTimeMaxForSegment(newLevel)
        let nextState: GameState = addLog(
          {
            ...state,
            player: nextPlayer,
            screen: 'home',
            run: {
              ...baseRun,
              tribulationLevel: newLevel,
              tribulationIdx: 0,
              tribulationsCleared: newLevel,
              finalTrial: undefined,
              timeLeft: nextSegmentTime,
              timeMax: nextSegmentTime,
            },
            meta: {
              ...state.meta,
              legacyPoints: (state.meta?.legacyPoints ?? 0) + totalLegacy,
              kungfaShards: (state.meta?.kungfaShards ?? 0) + rewards.shardsBonus,
              tribulationFinaleTriggered: false,
              ...(rewards.demonUnlock ? { demonPathUnlocked: true } : {}),
            },
          },
          logMsg + ` 渡过第 ${newLevel} 重天劫！传承点 +${totalLegacy}，时辰重置。`,
        )
        const tribStreakMid = (baseRun.streaks?.tribulation_success_streak ?? 0) + 1
        const flagsTribMid: Record<string, true> = tribulationReduction > 0 ? { tribulation_dmg_reduced: true } : {}
        nextState = mergeAchievementProgress(nextState, {
          statsLifetimeAdd: { tribulation_success_lifetime: 1 },
          streaksSet: { tribulation_success_streak: tribStreakMid },
          ...(Object.keys(flagsTribMid).length > 0 ? { flagsSet: flagsTribMid } : {}),
        })
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }

      let nextState: GameState = addLog(
        {
          ...state,
          player: nextPlayer,
          run: {
            ...baseRun,
            finalTrial: {
              ...ft,
              step: nextStep as 1 | 2 | 3,
              resolve: newResolve,
              choices: newChoices,
            },
          },
        },
        logMsg,
      )
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'DEBUG_SET_TIME_LEFT': {
      const timeMax = baseRun.timeMax ?? TIME_MAX
      const timeLeft = Math.max(0, Math.min(timeMax, action.value))
      let nextState: GameState = { ...state, run: { ...baseRun, timeLeft, timeMax } }
      if (shouldTriggerTribulationFinale(nextState)) {
        nextState = enterFinalTrial(nextState, rngWithCount)
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'CLAIM_ACHIEVEMENT': {
      const slice = buildAchievementStateSlice(state)
      const nextSlice = { ...slice, player: state.player, meta: state.meta }
      const { state: after, rewardApplied } = claimAchievement(nextSlice, action.id)
      if (!rewardApplied) return { ...state, run: { ...state.run, rngCalls } }
      return {
        ...state,
        achievements: { claimed: after.claimed },
        player: (after.player ?? state.player) as PlayerState,
        meta: { ...state.meta, ...after.meta, statsLifetime: after.statsLifetime },
        run: { ...state.run, rngCalls },
      }
    }
    case 'CLAIM_ALL_ACHIEVEMENTS': {
      const slice = buildAchievementStateSlice(state)
      const nextSlice = { ...slice, player: state.player, meta: state.meta }
      const { state: after, claimedIds } = claimAllAchievements(nextSlice)
      if (claimedIds.length === 0) return { ...state, run: { ...state.run, rngCalls } }
      return {
        ...state,
        achievements: { claimed: after.claimed },
        player: (after.player ?? state.player) as PlayerState,
        meta: { ...state.meta, ...after.meta, statsLifetime: after.statsLifetime },
        run: { ...state.run, rngCalls },
      }
    }
    default: {
      return { ...state, run: { ...state.run, rngCalls } }
    }
  }
}
