import { createSeededRng, type Rng } from './rng'
import type { GameState } from './game'
import { createInitialState } from './state'
import { createInitialGameState } from './game'
import { TIME_MAX } from './time'
import type { InsightEvent } from './cultivation'
import type { TribulationState } from './tribulation/tribulation'
import { getStageIndex } from './progression/stage'

const SAVE_KEY = 'cultivation_save_v1'
/** 功法/碎片跨局持久化：新游戏继承已获得功法与碎片 */
const PERSISTENT_KUNGFU_KEY = 'cultivation_persistent_kungfu_v1'
/** TICKET-28: 成就已领取 + 跨局累计统计 */
const PERSISTENT_ACHIEVEMENTS_KEY = 'cultivation_persistent_achievements_v1'

/** TICKET-24: 存档 schema 版本，用于迁移与兼容判断 */
export const CURRENT_SCHEMA = 1
const SAVE_VERSION = CURRENT_SCHEMA

export type PersistentKungfu = { unlockedKungfu: string[]; kungfaShards: number }

export function getPersistentKungfu(): PersistentKungfu | null {
  try {
    const raw = localStorage.getItem(PERSISTENT_KUNGFU_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (parsed == null || typeof parsed !== 'object') return null
    const o = parsed as Record<string, unknown>
    const unlockedKungfu = Array.isArray(o.unlockedKungfu) ? o.unlockedKungfu.filter((id): id is string => typeof id === 'string') : []
    const kungfaShards = typeof o.kungfaShards === 'number' && o.kungfaShards >= 0 ? o.kungfaShards : 0
    return { unlockedKungfu, kungfaShards }
  } catch {
    return null
  }
}

export function savePersistentKungfu(state: GameState): void {
  try {
    const unlockedKungfu = state.player?.relics ?? []
    const kungfaShards = state.meta?.kungfaShards ?? 0
    localStorage.setItem(PERSISTENT_KUNGFU_KEY, JSON.stringify({ unlockedKungfu, kungfaShards }))
  } catch {
    // 忽略写入失败
  }
}

export type PersistentAchievements = {
  claimed: Record<string, true>
  statsLifetime: Record<string, number>
}

export function getPersistentAchievements(): PersistentAchievements | null {
  try {
    const raw = localStorage.getItem(PERSISTENT_ACHIEVEMENTS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (parsed == null || typeof parsed !== 'object') return null
    const o = parsed as Record<string, unknown>
    const claimed = o.claimed && typeof o.claimed === 'object' ? (o.claimed as Record<string, true>) : {}
    const statsLifetime = o.statsLifetime && typeof o.statsLifetime === 'object' ? (o.statsLifetime as Record<string, number>) : {}
    return { claimed, statsLifetime }
  } catch {
    return null
  }
}

export function savePersistentAchievements(state: GameState): void {
  try {
    const claimed = state.achievements?.claimed ?? {}
    const statsLifetime = state.meta?.statsLifetime ?? {}
    localStorage.setItem(PERSISTENT_ACHIEVEMENTS_KEY, JSON.stringify({ claimed, statsLifetime }))
  } catch {
    // 忽略写入失败
  }
}

/** TICKET-24: envelope 外层 meta */
export type SaveEnvelopeMeta = {
  schemaVersion: number
  savedAt: number
}

export type SaveFile = {
  meta: SaveEnvelopeMeta
  state: GameState
}

/** 旧格式：无 meta 时视为 schemaVersion=0（纯 state 或 { version, savedAt, state }） */
type LegacySave = GameState | { version?: number; savedAt?: number; state: GameState }

/** Type guard: raw 为带 state 的 envelope 形态 */
function hasStateAndMaybeSavedAt(x: unknown): x is { state: GameState; savedAt?: number } {
  return x != null && typeof x === 'object' && 'state' in (x as object) && typeof (x as { state: unknown }).state === 'object'
}

function isLikelyLegacyState(raw: unknown): raw is GameState {
  if (raw == null || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  return (
    typeof o.screen === 'string' &&
    typeof o.player === 'object' &&
    typeof o.run === 'object' &&
    Array.isArray(o.log)
  )
}

/** TICKET-24: 备份当前 raw 到 key_backup_timestamp，避免丢档 */
export function tryBackup(raw: string, reason: string): void {
  try {
    const key = `cultivation_save_v1_backup_${Date.now()}`
    localStorage.setItem(key, raw)
    localStorage.setItem('cultivation_save_backup_reason', reason)
  } catch {
    // 忽略备份失败
  }
}

/** 将 raw 解析结果迁移为 envelope（兼容旧格式） */
function migrate(raw: unknown): SaveFile | null {
  const withState = raw != null && typeof raw === 'object' && 'state' in (raw as object)
  const leg = raw as LegacySave & { meta?: SaveEnvelopeMeta; version?: number }
  if (withState && typeof (raw as { state: unknown }).state === 'object') {
    const state = (raw as { state: GameState }).state
    if (!isValidState(state)) return null
    const schemaVersion = leg.meta?.schemaVersion ?? leg.version ?? 0
    if (schemaVersion > CURRENT_SCHEMA) return null
    const savedAt = leg.meta?.savedAt ?? (typeof (leg as Record<string, unknown>).savedAt === 'number' ? (leg as { savedAt: number }).savedAt : undefined) ?? Date.now()
    return {
      meta: { schemaVersion: schemaVersion || CURRENT_SCHEMA, savedAt: typeof savedAt === 'number' ? savedAt : Date.now() },
      state,
    }
  }
  if (isLikelyLegacyState(raw)) {
    if (!isValidState(raw)) return null
    return {
      meta: { schemaVersion: CURRENT_SCHEMA, savedAt: Date.now() },
      state: raw,
    }
  }
  if (hasStateAndMaybeSavedAt(leg) && isValidState(leg.state)) {
    return {
      meta: { schemaVersion: CURRENT_SCHEMA, savedAt: typeof leg.savedAt === 'number' ? leg.savedAt : Date.now() },
      state: leg.state,
    }
  }
  return null
}

export function saveToStorage(state: GameState): void {
  const payload: SaveFile = {
    meta: { schemaVersion: CURRENT_SCHEMA, savedAt: Date.now() },
    state,
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
    savePersistentKungfu(state)
    savePersistentAchievements(state)
  } catch {
    // 忽略写入失败
  }
}

function isValidState(state: GameState | null): state is GameState {
  if (!state) {
    return false
  }
  return Boolean(
    state.screen &&
      state.player &&
      state.run &&
      typeof state.run.seed === 'number' &&
      typeof state.run.rngCalls === 'number' &&
      typeof state.run.turn === 'number' &&
      typeof state.run.danger === 'number' &&
      typeof state.run.pendingReward === 'number' &&
      Array.isArray(state.log),
  )
}

function normalizeLoadedState(state: GameState): GameState {
  const defaultPlayer = createInitialState()

  const loadedPlayer: any = state.player ?? {}
  const loadedMaterials: any = loadedPlayer.materials ?? {}
  const loadedElixirs: any = loadedPlayer.elixirs ?? {}
  const loadedCodex: any = loadedPlayer.codex ?? {}
  const loadedBest: any = loadedCodex.bestQualityByRecipe ?? {}
  const loadedRecipesUnlocked: any = loadedPlayer.recipesUnlocked ?? {}
  const loadedFragments: any = loadedPlayer.fragments ?? {}

  const player = {
    ...defaultPlayer,
    ...loadedPlayer,
    materials: {
      ...defaultPlayer.materials,
      ...loadedMaterials,
    },
    elixirs: {
      ...defaultPlayer.elixirs,
      ...loadedElixirs,
      qi_pill: { ...defaultPlayer.elixirs.qi_pill, ...(loadedElixirs.qi_pill ?? {}) },
      spirit_pill: {
        ...defaultPlayer.elixirs.spirit_pill,
        ...(loadedElixirs.spirit_pill ?? {}),
      },
      foundation_pill: {
        ...defaultPlayer.elixirs.foundation_pill,
        ...(loadedElixirs.foundation_pill ?? {}),
      },
    },
    recipesUnlocked: {
      ...defaultPlayer.recipesUnlocked,
      ...loadedRecipesUnlocked,
    },
    fragments: {
      ...defaultPlayer.fragments,
      ...loadedFragments,
    },
    codex: {
      ...defaultPlayer.codex,
      ...loadedCodex,
      bestQualityByRecipe: {
        ...defaultPlayer.codex.bestQualityByRecipe,
        ...loadedBest,
      },
    },
    achievements: Array.isArray(loadedPlayer.achievements) ? loadedPlayer.achievements : defaultPlayer.achievements,
    relics: Array.isArray(loadedPlayer.relics) ? loadedPlayer.relics : defaultPlayer.relics,
    equippedRelics: Array.isArray(loadedPlayer.equippedRelics) && loadedPlayer.equippedRelics.length === 3
      ? loadedPlayer.equippedRelics
      : defaultPlayer.equippedRelics,
    mind: typeof loadedPlayer.mind === 'number' ? Math.max(0, Math.min(100, loadedPlayer.mind)) : defaultPlayer.mind,
    injuredTurns: typeof loadedPlayer.injuredTurns === 'number' && loadedPlayer.injuredTurns >= 0 ? loadedPlayer.injuredTurns : 0,
    level: typeof loadedPlayer.level === 'number' ? Math.max(1, Math.min(99, loadedPlayer.level)) : (defaultPlayer as { level?: number }).level ?? 1,
    stageIndex: (typeof loadedPlayer.stageIndex === 'number' && loadedPlayer.stageIndex >= 1 && loadedPlayer.stageIndex <= 7)
      ? loadedPlayer.stageIndex
      : getStageIndex(typeof loadedPlayer.level === 'number' ? Math.max(1, Math.min(99, loadedPlayer.level)) : 1),
    awakenSkills: Array.isArray(loadedPlayer.awakenSkills) ? loadedPlayer.awakenSkills : (defaultPlayer as { awakenSkills?: string[] }).awakenSkills ?? [],
  }

  const loadedChain = (state.run as { chain?: { activeChainId?: string; chapter?: number; completed?: Record<string, boolean> } }).chain
  const chain =
    loadedChain && typeof loadedChain === 'object'
      ? {
          ...(loadedChain.activeChainId != null ? { activeChainId: loadedChain.activeChainId } : {}),
          ...(typeof loadedChain.chapter === 'number' ? { chapter: loadedChain.chapter } : {}),
          completed: loadedChain.completed && typeof loadedChain.completed === 'object' ? loadedChain.completed : {},
        }
      : { completed: {} as Record<string, boolean> }

  const runState = state.run as {
    tribulationLevel?: number
    timeLeft?: number
    timeMax?: number
    cultivateCount?: number
    finalTrial?: { step: 1 | 2 | 3; threat: number; resolve: number; wounds?: number; choices: string[]; rewardSeed?: number }
    tribulation?: {
      level: number
      totalTurns: number
      turn: number
      shield: number
      debuffs: { mindChaos: number; burn: number; weak: number }
      wrath: number
      currentIntent: { id: string; name: string; baseDamageMin: number; baseDamageMax: number; addDebuff?: { key: string; stacks: number } }
      log: string[]
    }
    shopMissing?: { materialId: string; need: number }[]
    shopDiscountPercent?: number
    tribulationDmgReductionPercent?: number
    earnedTitle?: string
    pendingInsightEvent?: unknown
  }
  const loadedFinalTrial = runState.finalTrial
  const finalTrial =
    loadedFinalTrial &&
    typeof loadedFinalTrial.step === 'number' &&
    loadedFinalTrial.step >= 1 &&
    loadedFinalTrial.step <= 3 &&
    typeof loadedFinalTrial.threat === 'number' &&
    typeof loadedFinalTrial.resolve === 'number' &&
    Array.isArray(loadedFinalTrial.choices)
      ? {
          step: loadedFinalTrial.step as 1 | 2 | 3,
          threat: loadedFinalTrial.threat,
          resolve: loadedFinalTrial.resolve,
          wounds: typeof loadedFinalTrial.wounds === 'number' ? loadedFinalTrial.wounds : undefined,
          choices: loadedFinalTrial.choices,
          rewardSeed: typeof loadedFinalTrial.rewardSeed === 'number' ? loadedFinalTrial.rewardSeed : undefined,
        }
      : undefined

  function validTribulation(r: typeof runState): boolean {
    const t = r.tribulation
    if (!t || typeof t !== 'object') return false
    if (typeof t.level !== 'number' || typeof t.totalTurns !== 'number' || typeof t.turn !== 'number') return false
    if (typeof t.shield !== 'number' || typeof t.wrath !== 'number') return false
    if (!t.debuffs || typeof t.debuffs.mindChaos !== 'number' || typeof t.debuffs.burn !== 'number' || typeof t.debuffs.weak !== 'number') return false
    if (!t.currentIntent || typeof t.currentIntent.id !== 'string' || typeof t.currentIntent.name !== 'string') return false
    if (!Array.isArray(t.log)) return false
    return true
  }

  const runStateStats = (state.run as { stats?: Record<string, number> }).stats
  const runStateStreaks = (state.run as { streaks?: Record<string, number> }).streaks
  const runStateFlags = (state.run as { flags?: Record<string, true> }).flags
  const run = {
    ...state.run,
    depth: typeof state.run.depth === 'number' ? state.run.depth : 0,
    risk: typeof state.run.risk === 'number' ? state.run.risk : 0,
    streak: typeof state.run.streak === 'number' ? state.run.streak : 0,
    chainProgress: state.run.chainProgress && typeof state.run.chainProgress === 'object' ? state.run.chainProgress : {},
    chain,
    cultivateCount: typeof runState.cultivateCount === 'number' ? runState.cultivateCount : 0,
    tribulationLevel: typeof runState.tribulationLevel === 'number' && runState.tribulationLevel >= 0 && runState.tribulationLevel <= 12 ? runState.tribulationLevel : 0,
    timeLeft: typeof runState.timeLeft === 'number' ? Math.max(0, runState.timeLeft) : TIME_MAX,
    timeMax: typeof runState.timeMax === 'number' ? runState.timeMax : TIME_MAX,
    ...(runStateStats && typeof runStateStats === 'object' ? { stats: runStateStats } : {}),
    ...(runStateStreaks && typeof runStateStreaks === 'object' ? { streaks: runStateStreaks } : {}),
    ...(runStateFlags && typeof runStateFlags === 'object' ? { flags: runStateFlags } : {}),
    ...(finalTrial ? { finalTrial } : {}),
    ...(validTribulation(runState) ? { tribulation: runState.tribulation as TribulationState } : {}),
    ...(Array.isArray(runState.shopMissing) && runState.shopMissing.length > 0
      ? { shopMissing: runState.shopMissing.filter((m: any) => m && typeof m.materialId === 'string' && typeof m.need === 'number') }
      : {}),
    ...(typeof runState.shopDiscountPercent === 'number' && runState.shopDiscountPercent >= 0 ? { shopDiscountPercent: runState.shopDiscountPercent } : {}),
    ...(typeof runState.tribulationDmgReductionPercent === 'number' && runState.tribulationDmgReductionPercent >= 0 ? { tribulationDmgReductionPercent: runState.tribulationDmgReductionPercent } : {}),
    ...(typeof runState.earnedTitle === 'string' && runState.earnedTitle ? { earnedTitle: runState.earnedTitle } : {}),
    ...(runState.pendingInsightEvent && typeof runState.pendingInsightEvent === 'object' && 'title' in runState.pendingInsightEvent && 'choiceA' in runState.pendingInsightEvent ? { pendingInsightEvent: runState.pendingInsightEvent as InsightEvent } : {}),
  }

  const loadedMeta: any = state.meta ?? {}
  const meta: GameState['meta'] = {
    ...(loadedMeta.daily != null ? { daily: loadedMeta.daily } : {}),
    legacyPoints: typeof loadedMeta.legacyPoints === 'number' ? loadedMeta.legacyPoints : 0,
    legacySpent: typeof loadedMeta.legacySpent === 'number' ? loadedMeta.legacySpent : 0,
    legacyUpgrades: loadedMeta.legacyUpgrades && typeof loadedMeta.legacyUpgrades === 'object' ? loadedMeta.legacyUpgrades : {},
    pityAlchemyTop: typeof loadedMeta.pityAlchemyTop === 'number' ? loadedMeta.pityAlchemyTop : 0,
    pityLegendLoot: typeof loadedMeta.pityLegendLoot === 'number' ? loadedMeta.pityLegendLoot : 0,
    pityLegendKungfa: typeof loadedMeta.pityLegendKungfa === 'number' ? loadedMeta.pityLegendKungfa : 0,
    kungfaShards: typeof loadedMeta.kungfaShards === 'number' ? loadedMeta.kungfaShards : 0,
    ...(loadedMeta.tribulationFinaleTriggered === true ? { tribulationFinaleTriggered: true } : {}),
    ...(loadedMeta.demonPathUnlocked === true ? { demonPathUnlocked: true } : {}),
    ...(loadedMeta.statsLifetime && typeof loadedMeta.statsLifetime === 'object' ? { statsLifetime: loadedMeta.statsLifetime } : {}),
  }

  const loadedAchievements = (state as { achievements?: { claimed?: Record<string, true> } }).achievements
  const achievements =
    loadedAchievements?.claimed && typeof loadedAchievements.claimed === 'object'
      ? { claimed: loadedAchievements.claimed }
      : { claimed: {} as Record<string, true> }

  return {
    ...state,
    player,
    run,
    meta,
    achievements,
    log: Array.isArray(state.log) ? state.log : [],
  }
}

export function loadFromStorage(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    const envelope = migrate(parsed)
    if (!envelope) {
      tryBackup(raw, 'schema_incompatible_or_invalid')
      return null
    }
    return normalizeLoadedState(envelope.state)
  } catch (e) {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (raw) tryBackup(raw, 'parse_error')
    } catch {
      // ignore
    }
    return null
  }
}

/** TICKET-24: 返回初始状态（用于解析失败/不兼容时调用方重置） */
export function getInitialStateForNewGame(seed: number): GameState {
  return createInitialGameState(seed)
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // 忽略清理失败
  }
}

function skipRngCalls(rng: Rng, calls: number): void {
  for (let i = 0; i < calls; i += 1) {
    rng.next()
  }
}

export function createRngFromState(state: GameState): Rng {
  const rng = createSeededRng(state.run.seed)
  skipRngCalls(rng, state.run.rngCalls)
  return rng
}

export { SAVE_KEY, SAVE_VERSION }

/** TICKET-24: 读取原始存档字符串（诊断页复制/导入用） */
export function getRawSaveFromStorage(): string | null {
  try {
    return localStorage.getItem(SAVE_KEY)
  } catch {
    return null
  }
}

/** TICKET-24: 校验并写入存档（导入用）；成功返回 true，失败抛错或返回 false */
export function importSaveFromRaw(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw)
    const envelope = migrate(parsed)
    if (!envelope) {
      throw new Error('存档格式不兼容或校验失败')
    }
    const payload: SaveFile = {
      meta: { schemaVersion: CURRENT_SCHEMA, savedAt: Date.now() },
      state: normalizeLoadedState(envelope.state),
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
    return true
  } catch (err) {
    if (err instanceof Error) throw err
    throw new Error('解析失败')
  }
}
