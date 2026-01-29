import { createInitialState, type PlayerState } from './state'
import { randInt, type Rng } from './rng'
import {
  DANGER_DEEPEN_MAX,
  DANGER_DEEPEN_MIN,
  DANGER_MAX,
  EXPLORE_PENALTY_CHANCE,
  EXPLORE_PENALTY_DANGER_THRESHOLD,
  EXPLORE_PENALTY_HP,
  RISK_DROP_MULTIPLIER,
  RISK_RETREAT_FACTOR,
  STREAK_BONUS_THRESHOLDS,
  STREAK_DROP_BONUS_PER_LEVEL,
  STREAK_MAX_CAP,
  type RiskLevel,
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
  getElixirName,
  getMaterialName,
  getQualityLabel,
  getRecipe,
  resolveBrew,
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
import { relicRegistry, type RelicId } from './relics'
import { buildKungfaModifiers, getKungfu } from './kungfu'
import {
  buildLegacyModifiers,
  purchaseUpgrade,
  getNextKeyNodeDistance,
  getLegacyUpgrade,
  type LegacyModifiers,
} from './legacy'
import {
  getChain,
  getChapter,
  getChainTriggerRate,
  pickChainToStart,
  applyGuaranteedReward,
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
  addKungfaShards,
  spendKungfaShardsForRarity,
  PITY_ALCHEMY_THRESHOLD,
  PITY_ALCHEMY_HARD,
  PITY_LEGEND_LOOT_THRESHOLD,
  PITY_LEGEND_LOOT_HARD,
  PITY_LEGEND_KUNGFU_THRESHOLD,
} from './pity'

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

export type GameState = {
  screen: ScreenId
  player: PlayerState
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
    /** 领取每日赠礼后待展示的奖励文案（弹框用，CLEAR_DAILY_REWARD_TOAST 清除） */
    dailyRewardJustClaimed?: string
    /** TICKET-13: 碎片兑换成功后的功法名（弹层用，CLEAR_SHARD_EXCHANGE_TOAST 清除） */
    shardExchangeJustClaimed?: string
    /** TICKET-5: 事件链进度 chainId -> 当前步序 */
    chainProgress: Record<string, number>
    /** TICKET-11: 章节奇遇链（存档可续） */
    chain?: {
      activeChainId?: string
      chapter?: number
      completed: Record<string, boolean>
    }
    /** TICKET-HP-1: 本局修炼次数（用于疲劳递减） */
    cultivateCount?: number
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
    breakthroughPlan?: {
      useElixir?: {
        elixirId: 'spirit_pill' | 'foundation_pill'
        quality: ElixirQuality
        count: number
      }
      inheritanceSpent: number
      previewRate: number
    }
    alchemyPlan?: { recipeId: RecipeId; batch: number; heat?: 'steady' | 'push' | 'blast' }
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
          }
        }
      | {
          kind: 'alchemy'
          title: string
          text: string
          boomed: boolean
          produced?: { elixirId: ElixirId; quality: ElixirQuality; count: number }
          hpDelta: number
          // TICKET-8: 战报字段
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
  }
}

export type GameAction =
  | { type: 'NEW_GAME'; seed: number }
  | { type: 'LOAD_GAME'; state: GameState }
  | { type: 'GO'; screen: ScreenId }
  | { type: 'CULTIVATE_TICK' }
  | { type: 'EXPLORE_START' }
  | { type: 'EXPLORE_DEEPEN' }
  | { type: 'EXPLORE_CASH_OUT' }
  | { type: 'EXPLORE_BACK' }
  | { type: 'EXPLORE_CHOOSE'; choice: 'A' | 'B' }
  | { type: 'EXPLORE_DISMISS_EVENT' }
  | { type: 'ALCHEMY_OPEN' }
  | { type: 'ALCHEMY_SET_RECIPE'; recipeId: RecipeId; batch: number; heat?: 'steady' | 'push' | 'blast' }
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
    }
  | { type: 'BREAKTHROUGH_CONFIRM' }
  | { type: 'OUTCOME_CONTINUE'; to: ScreenId }
  | { type: 'OUTCOME_RETRY_BREAKTHROUGH' }
  | { type: 'CLEAR_LOG' }
  | { type: 'RELIC_EQUIP'; slotIndex: 0 | 1 | 2; relicId: string | null }
  | { type: 'SYNC_DAILY'; dayKey: string }
  | { type: 'DAILY_CLAIM' }
  | { type: 'CLEAR_LOOT' }
  | { type: 'LEGACY_PURCHASE'; upgradeId: string }
  | { type: 'CLEAR_DAILY_REWARD_TOAST' }
  | { type: 'CLEAR_SHARD_EXCHANGE_TOAST' }
  | { type: 'KUNGFU_SHARD_EXCHANGE'; kungfuId: string; rarity: 'rare' | 'epic' | 'legendary' }

export function createInitialGameState(seed: number): GameState {
  return {
    screen: 'start',
    player: createInitialState(),
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
      currentEvent: undefined,
    },
    log: [],
    meta: {
      legacyPoints: 0,
      legacySpent: 0,
      legacyUpgrades: {},
      pityAlchemyTop: 0,
      pityLegendLoot: 0,
      pityLegendKungfa: 0,
      kungfaShards: 0,
    },
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function clampRate(value: number): number {
  return clamp(value, 0.05, 0.95)
}

function addLog(state: GameState, message: string): GameState {
  const nextLog = [...state.log, message]
  if (nextLog.length > 50) {
    nextLog.splice(0, nextLog.length - 50)
  }
  return { ...state, log: nextLog }
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

function nextRealm(current: string): string {
  const realms = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神']
  const index = realms.indexOf(current)
  if (index < 0) {
    return current
  }
  return realms[Math.min(index + 1, realms.length - 1)]
}

function realmIndex(realm: string): number {
  const realms = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神']
  const index = realms.indexOf(realm)
  return index < 0 ? 0 : index
}

export function calcBreakthroughRate(
  state: GameState,
  inheritanceSpent: number,
  useElixir?: {
    elixirId: 'spirit_pill' | 'foundation_pill'
    quality: ElixirQuality
    count: number
  },
  dailySuccessBonus: number = 0,
): number {
  const base = 0.22 + realmIndex(state.player.realm) * 0.03
  const inheritanceBonus = inheritanceSpent * 0.1
  const legacyCtx = buildLegacyModifiers(state.meta)
  const pityBonusBase = state.player.pity * 0.06
  const pityBonus = pityBonusBase + (state.player.pity >= 3 ? legacyCtx.breakthroughPityBonusRate : 0)
  const dangerPenalty = state.run.danger > 0 ? state.run.danger * 0.02 : 0

  const elixirBonus = (() => {
    if (!useElixir || useElixir.count <= 0) {
      return 0
    }
    const count = clamp(useElixir.count, 0, 2)
    const spiritBonus: Record<ElixirQuality, number> = {
      fan: 0.06,
      xuan: 0.1,
      di: 0.14,
      tian: 0.2,
    }
    const foundationBonus: Record<ElixirQuality, number> = {
      fan: 0.1,
      xuan: 0.16,
      di: 0.22,
      tian: 0.3,
    }
    const per =
      useElixir.elixirId === 'foundation_pill'
        ? foundationBonus[useElixir.quality]
        : spiritBonus[useElixir.quality]
    return per * count
  })()

  const kungfuAdd = buildKungfaModifiers(state).breakthroughRateAdd
  const legacyAdd = buildLegacyModifiers(state.meta).breakthroughRateAdd
  return clampRate(base + inheritanceBonus + pityBonus + elixirBonus - dangerPenalty + dailySuccessBonus + kungfuAdd + legacyAdd)
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

function createBreakthroughPlan(
  state: GameState,
  inheritanceSpent: number,
  useElixir?: {
    elixirId: 'spirit_pill' | 'foundation_pill'
    quality: ElixirQuality
    count: number
  },
): NonNullable<GameState['run']['breakthroughPlan']> {
  const inheritance = clamp(inheritanceSpent, 0, state.player.inheritancePoints)
  let normalizedUseElixir: NonNullable<GameState['run']['breakthroughPlan']>['useElixir']
  if (useElixir && useElixir.count > 0) {
    const count = clamp(useElixir.count, 0, 2)
    const available = state.player.elixirs[useElixir.elixirId][useElixir.quality]
    const finalCount = clamp(count, 0, available)
    if (finalCount > 0) {
      normalizedUseElixir = {
        elixirId: useElixir.elixirId,
        quality: useElixir.quality,
        count: finalCount,
      }
    }
  }
  return {
    inheritanceSpent: inheritance,
    useElixir: normalizedUseElixir,
    previewRate: calcBreakthroughRate(state, inheritance, normalizedUseElixir),
  }
}

function buildOutcomeDeltas(
  before: GameState['player'],
  after: GameState['player'],
): Extract<NonNullable<GameState['run']['lastOutcome']>, { kind: 'breakthrough' }>['deltas'] {
  return {
    realm: realmIndex(after.realm) - realmIndex(before.realm),
    hp: after.hp - before.hp,
    maxHp: after.maxHp - before.maxHp,
    exp: after.exp - before.exp,
    pills: after.pills - before.pills,
    inheritancePoints: after.inheritancePoints - before.inheritancePoints,
    pity: after.pity - before.pity,
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

/** TICKET-7: 应用掉落到玩家状态；TICKET-10: kungfu 已有则传承点+1 */
function applyLootItem(
  player: PlayerState,
  item: LootItem,
): PlayerState {
  const next = { ...player }
  if (item.type === 'material') {
    const cur = next.materials[item.id] ?? 0
    next.materials = { ...next.materials, [item.id]: cur + item.count }
  } else if (item.type === 'fragment') {
    const cur = next.fragments[item.id] ?? 0
    next.fragments = { ...next.fragments, [item.id]: cur + item.count }
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

  const kungfuCtx = buildKungfaModifiers(state)
  const legacyCtx = buildLegacyModifiers(meta)
  const kungfuMod = {
    lootRareMul: kungfuCtx.lootRareMul * legacyCtx.lootRareWeightMul,
    lootLegendMul: kungfuCtx.lootLegendMul * legacyCtx.lootLegendWeightMul,
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
            ? `残页×${drop.item.count}`
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
      return { ...state, screen: action.screen }
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
      let nextState: GameState = {
        ...state,
        meta: result.newMeta,
      }
      nextState = addLog(nextState, `【传承】已掌握：${upgrade?.name ?? action.upgradeId}`)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'CULTIVATE_TICK': {
      const dailyModCult = getDailyModifiersFromState(state)
      const cultivateCount = (baseRun.cultivateCount ?? 0) + 1
      
      // TICKET-HP-1: 疲劳递减（第1~3次1.0，第4~6次0.6，第7次+0.3）
      const fatigueMul = cultivateCount <= 3 ? 1.0 : cultivateCount <= 6 ? 0.6 : 0.3
      const baseExp = nextInt(1, 3)
      const expGain = Math.round(baseExp * fatigueMul)
      
      // TICKET-HP-1: 修炼小回血 +4（clamp到maxHp）
      const heal = 4
      const newHp = Math.min(basePlayer.maxHp, basePlayer.hp + heal)
      
      const turn = baseRun.turn + 1
      let nextState: GameState = {
        ...state,
        player: {
          ...basePlayer,
          exp: basePlayer.exp + expGain,
          hp: newHp,
        },
        run: { ...baseRun, turn, cultivateCount },
      }
      nextState = advanceDailyMission(nextState, 'cultivate_tick')

      // TICKET-HP-1: 走火入魔概率 8~12%，扣血 6（确保不会太狠）
      const qiDeviationChance = 0.1
      if (next01() < qiDeviationChance) {
        const dmg = 6
        const hp = Math.max(0, nextState.player.hp - dmg)
        nextState = {
          ...nextState,
          player: { ...nextState.player, hp },
        }
        nextState = addLog(nextState, `走火入魔，损失生命 ${dmg}`)
        if (hp <= 0) {
          nextState = {
            ...nextState,
            screen: 'death',
            summary: { cause: '走火入魔', turns: turn, endingId: 'death' },
            meta: { ...nextState.meta, legacyPoints: (nextState.meta?.legacyPoints ?? 0) + calculateLegacyPointsReward(nextState) },
          }
        }
      } else {
        const fatigueMsg = cultivateCount >= 4 ? '（心境浮动，收益下降）' : ''
        nextState = addLog(nextState, `修炼获得经验 ${expGain}，生命+${heal}${fatigueMsg}`)
      }

      return { ...nextState, run: { ...nextState.run, rngCalls } }
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
        },
      }
      nextState = addLog(nextState, '开始探索')
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_DEEPEN': {
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
        nextPlayer.hp = Math.max(0, basePlayer.hp - EXPLORE_PENALTY_HP)
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

      const kungfuCtx = buildKungfaModifiers(state)
      const legacyCtx = buildLegacyModifiers(state.meta)
      const rawInc = nextInt(DANGER_DEEPEN_MIN, DANGER_DEEPEN_MAX)
      const inc = Math.max(1, Math.round(rawInc * kungfuCtx.exploreDangerIncMul * legacyCtx.exploreDangerIncMul))
      nextDanger = Math.min(DANGER_MAX, nextDanger + inc)
      
      const nextStreak = (baseRun.streak ?? 0) + 1
      stateAfterMission = advanceDailyMission(stateAfterMission, 'encounter_event')

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
          return { ...nextState, run: { ...nextState.run, rngCalls } }
        }
      }

      const triggerRoll = rngWithCount.next()
      const triggerRate = getChainTriggerRate(nextDanger, CHAIN_DEBUG_ALWAYS_TRIGGER)
      if (triggerRoll < triggerRate) {
        const picked = pickChainToStart(rngWithCount, chain.completed, nextDanger)
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
            return { ...nextState, run: { ...nextState.run, rngCalls } }
          }
        }
      }

      const event = pickExploreEvent(rngWithCount, nextDanger)
      const rarity = event.rarity ?? 'common'
      const rarityLabel = rarity === 'common' ? '普通' : rarity === 'rare' ? '稀有' : '传说'
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
      } else {
        nextState = addLog(nextState, `继续深入，危险值 +${inc} → ${nextDanger}。遭遇：${event.title}`)
      }
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
      const kungfuCtx = buildKungfaModifiers(state)
      const legacyCtx = buildLegacyModifiers(state.meta)
      const retreatRate = Math.min(0.98, 0.88 + kungfuCtx.exploreRetreatAdd + legacyCtx.exploreRetreatAdd)
      const retreatClean = next01() < retreatRate
      let goldGain = Math.round(danger * 0.6)
      let expGain = Math.round(danger * 0.4)
      if (!retreatClean) {
        goldGain = Math.round(goldGain * 0.75)
        expGain = Math.round(expGain * 0.75)
      }
      
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
      
      nextState = {
        ...nextState,
        screen: 'home',
        player: {
          ...nextState.player,
          spiritStones: nextState.player.spiritStones + goldGain,
          exp: nextState.player.exp + expGain,
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
        },
      }
      if (!retreatClean) {
        nextState = addLog(nextState, '【撤退惊险】未能全身而退，损失部分收获。')
      }
      nextState = addLog(nextState, `【收手】你见好就收：灵石+${goldGain}，修为+${expGain}，生命+${heal}，危险值归零。`)
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
          nextState = {
            ...nextState,
            player: applyGuaranteedReward(nextState.player, ch.guaranteedReward, rngWithCount),
            run: {
              ...nextState.run,
              currentEvent: undefined,
              chain: { ...chain, activeChainId: undefined, chapter: undefined, completed: { ...chain.completed, [current.chainId]: true } },
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
          nextState = {
            ...stateWithEventLoot,
            screen: 'explore',
            run: { ...stateWithEventLoot.run, pendingLoot: eventDrops.length > 0 ? eventDrops : undefined },
          }
        }
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
        nextState = {
          ...stateWithEventLoot,
          screen: 'explore',
          run: {
            ...stateWithEventLoot.run,
            pendingLoot: eventDrops.length > 0 ? eventDrops : undefined,
          },
        }
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'ALCHEMY_OPEN': {
      let nextState: GameState = {
        ...state,
        screen: 'alchemy',
        run: {
          ...baseRun,
          alchemyPlan: { recipeId: 'qi_pill_recipe', batch: 1, heat: 'push' },
        },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'ALCHEMY_SET_RECIPE': {
      const batch = clamp(action.batch, 1, 5)
      const heat = action.heat ?? baseRun.alchemyPlan?.heat ?? 'push'
      let nextState: GameState = {
        ...state,
        run: { ...baseRun, alchemyPlan: { recipeId: action.recipeId, batch, heat } },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'ALCHEMY_BREW_CONFIRM': {
      const plan = baseRun.alchemyPlan ?? { recipeId: 'qi_pill_recipe', batch: 1, heat: 'push' as const }
      const dailyModAlc = getDailyModifiersFromState(state)
      const pityQualityShift = getAlchemyPityQualityShift(state.meta)
      const kungfuMod = {
        alchemyBoomMul: buildKungfaModifiers(state).alchemyBoomMul * buildLegacyModifiers(state.meta).alchemyBoomRateMul,
        alchemyQualityShift: buildKungfaModifiers(state).alchemyQualityShift + buildLegacyModifiers(state.meta).alchemyQualityShiftBlast + pityQualityShift,
      }
      let { next, outcome } = resolveBrew(
        state,
        plan.recipeId,
        plan.batch,
        next01,
        nextInt,
        plan.heat ?? 'push',
        dailyModAlc,
        kungfuMod,
      )
      // TICKET-13: 保底强制至少地品（pity>=HARD 且本炉未出地/天时）
      if (shouldForceAlchemyAtLeastDi(state.meta) && outcome.success && outcome.elixirId && outcome.topQuality && outcome.topQuality !== 'di' && outcome.topQuality !== 'tian') {
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
      // TICKET-8: 生成战报标题和文本
      let title = '炼丹失败'
      let text = '药性不合，丹气散尽。'
      if (outcome.topQuality === 'tian') {
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
        title = outcome.topQuality === 'tian' ? '天品出世（但有爆丹）' : '爆丹！'
        text = `炉火反噬，连续${outcome.streakBoom}次爆丹！${text}`
      }
      if (outcome.streakSuccess >= 3) {
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
            hpDelta: outcome.hpChange,
            // TICKET-8: 战报字段
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
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'ALCHEMY_OPEN_CODEX': {
      let nextState: GameState = { ...state, screen: 'alchemy_codex' }
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
      )
      let nextState: GameState = {
        ...state,
        run: { ...baseRun, breakthroughPlan: plan },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'BREAKTHROUGH_CONFIRM': {
      const plan: NonNullable<GameState['run']['breakthroughPlan']> =
        baseRun.breakthroughPlan ?? createBreakthroughPlan(state, 0, undefined)
      const inheritanceSpent = plan.inheritanceSpent
      const useElixir = plan.useElixir

      let nextPlayer = {
        ...basePlayer,
        inheritancePoints: basePlayer.inheritancePoints - inheritanceSpent,
      }
      if (useElixir) {
        nextPlayer.elixirs = {
          ...nextPlayer.elixirs,
          [useElixir.elixirId]: {
            ...nextPlayer.elixirs[useElixir.elixirId],
            [useElixir.quality]:
              nextPlayer.elixirs[useElixir.elixirId][useElixir.quality] -
              useElixir.count,
          },
        }
      }

      const beforePlayer = { ...basePlayer }
      const dailyMod = getDailyModifiersFromState(state)
      const rate = calcBreakthroughRate(
        state,
        inheritanceSpent,
        useElixir,
        dailyMod.breakthroughSuccessBonus ?? 0,
      )
      const success = next01() < rate
      const turn = baseRun.turn + 1
      let stateAfterMission = advanceDailyMission(state, 'attempt_breakthrough')

      if (success) {
        const maxHpGain = nextInt(0, 2)
        const maxHp = nextPlayer.maxHp + 2 + maxHpGain
        const expGain = nextInt(3, 8)
        nextPlayer = {
          ...nextPlayer,
          realm: nextRealm(nextPlayer.realm),
          maxHp,
          hp: maxHp,
          exp: nextPlayer.exp + expGain,
          pity: 0,
        }
        const deltas = buildOutcomeDeltas(beforePlayer, nextPlayer)
        let nextState: GameState = {
          ...stateAfterMission,
          player: nextPlayer,
          run: {
            ...baseRun,
            turn,
            breakthroughPlan: undefined,
            lastOutcome: {
              kind: 'breakthrough',
              success: true,
              title: '境界突破！',
              text: `金光冲天，天地为你让路！你冲破瓶颈，踏入${nextPlayer.realm}之境！`,
              deltas,
              consumed: {
                inheritanceSpent,
                elixir: useElixir,
              },
            },
          },
        }
        nextState = addLog(nextState, `突破成功，境界提升至${nextPlayer.realm}`)
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }

      const legacyCtx = buildLegacyModifiers(stateAfterMission.meta)
      const baseDmg = nextInt(2, 6)
      const dmgRaw = useElixir?.elixirId === 'foundation_pill' ? baseDmg + 1 : baseDmg
      const dmg = Math.max(1, dmgRaw + (dailyMod.damageBonus ?? 0) - legacyCtx.breakthroughFailureDamageReduction)
      const pityBonus = (dailyMod.breakthroughPityBonusOnFail ?? 0) + legacyCtx.breakthroughPityBonus
      const inheritanceGain = 1 + nextInt(0, 1)
      nextPlayer = {
        ...nextPlayer,
        hp: nextPlayer.hp - dmg,
        inheritancePoints: nextPlayer.inheritancePoints + inheritanceGain,
        pity: nextPlayer.pity + 1 + pityBonus,
      }
      const deltas = buildOutcomeDeltas(beforePlayer, nextPlayer)
      let nextState: GameState = {
        ...stateAfterMission,
        player: nextPlayer,
        run: {
          ...baseRun,
          turn,
          breakthroughPlan: undefined,
          lastOutcome: {
            kind: 'breakthrough',
            success: false,
            title: '心魔反噬！',
            text: `心魔一击，但你已窥见天机。你从失败中悟得天机：传承+${inheritanceGain}，保底+${1 + pityBonus}（下次更香）`,
            deltas,
            consumed: {
              inheritanceSpent,
              elixir: useElixir,
            },
          },
        },
      }
      nextState = addLog(nextState, `突破失败，获得${inheritanceGain}点传承点`)
      // TICKET-12: 突破死亡保护（本局第一次失败不死）
      if (nextPlayer.hp <= 0 && legacyCtx.breakthroughDeathProtectionOnce > 0) {
        nextPlayer.hp = 1
        nextState = {
          ...nextState,
          player: nextPlayer,
        }
        nextState = addLog(nextState, '【逆天改命】心魔一击本应致命，但你已窥见天机，保命至1点生命！')
      }
      if (nextPlayer.hp <= 0) {
        nextState = {
          ...nextState,
          screen: 'death',
          summary: { cause: '心魔反噬', turns: turn, endingId: 'death' },
          meta: { ...nextState.meta, legacyPoints: (nextState.meta?.legacyPoints ?? 0) + calculateLegacyPointsReward(nextState) },
        }
      }
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
        const cur = nextPlayer.fragments[reward.recipeId as keyof typeof nextPlayer.fragments] ?? 0
        nextPlayer.fragments = { ...nextPlayer.fragments, [reward.recipeId]: cur + reward.count }
        const recipe = getRecipe(reward.recipeId)
        rewardLabel = `${recipe?.name ?? reward.recipeId}残页 x${reward.count}`
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
        const cur = nextPlayer.elixirs[reward.elixirId][quality]
        nextPlayer.elixirs = {
          ...nextPlayer.elixirs,
          [reward.elixirId]: {
            ...nextPlayer.elixirs[reward.elixirId],
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
      const alreadyOwned = basePlayer.relics.includes(kungfuId)
      if (alreadyOwned) {
        let nextState = addLog(state, '已拥有该功法，无需兑换。')
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }
      const nextPlayer = { ...basePlayer, relics: [...basePlayer.relics, kungfuId] }
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
    default: {
      return { ...state, run: { ...state.run, rngCalls } }
    }
  }
}
