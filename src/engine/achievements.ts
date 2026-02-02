/**
 * TICKET-28: 成就系统 v2
 * - 单一来源 getAchievementView(state)，UI 不计算进度
 * - claimAchievement / claimAll 幂等，奖励由引擎发放
 * - 条件类型：counter(lifetime/run)、streak、flag、all
 */

import achievementsFile from '../content/achievements.v1.json'

// ---------- 白名单：MetricKey / FlagKey ----------
export const METRIC_KEYS = [
  'explore_actions',
  'explore_cashouts',
  'explore_legend_events',
  'run_max_danger',
  'run_alchemy_count',
  'run_item_types',
  'alchemy_success_lifetime',
  'alchemy_boom_lifetime',
  'alchemy_tian_lifetime',
  'breakthrough_success_lifetime',
  'breakthrough_fail_lifetime',
  'tribulation_success_lifetime',
  'tribulation_fail_lifetime',
  'shop_trades_lifetime',
  'shop_spend_lifetime',
  'shop_rare_buys',
  'codex_entries',
  'relics_unlocked',
  'recipes_unlocked',
  'chains_completed',
  'legacy_points_total',
  'games_completed',
  'legacy_nodes',
  'alchemy_visits_lifetime',
  'achievement_claims_lifetime',
] as const

export const STREAK_KEYS = [
  'cashout_streak',
  'alchemy_success_streak',
  'breakthrough_success_streak',
  'tribulation_success_streak',
] as const

export const FLAG_KEYS = [
  'explore_low_hp_cashout',
  'explore_greed_cashout',
  'explore_allin_no_cashout',
  'alchemy_boom_high_success',
  'alchemy_low_rate_success',
  'alchemy_boom_positive',
  'build_danxiu_triggered',
  'build_tanbao_triggered',
  'build_chongguan_triggered',
  'build_three_slots',
  'build_three_tags',
  'build_mod_tribulation',
  'build_mod_alchemy',
  'build_mod_explore',
  'build_three_mods',
  'breakthrough_low_rate_success',
  'breakthrough_low_hp_success',
  'breakthrough_pity_success',
  'breakthrough_low_double_success',
  'tribulation_low_success',
  'tribulation_dmg_reduced',
  'tribulation_low_double_success',
  'shop_spend_1500_once',
  'shop_poor_rare_buy',
  'shop_net_profit_run',
  'legacy_run_3',
  'collection_tian_legend_tribulation',
] as const

export type MetricKey = (typeof METRIC_KEYS)[number]
export type StreakKey = (typeof STREAK_KEYS)[number]
export type FlagKey = (typeof FLAG_KEYS)[number]

// ---------- 成就定义类型 ----------
export type AchievementCriteriaCounter = {
  type: 'counter'
  key: string
  op: '>=' | '=='
  value: number
}

export type AchievementCriteriaStreak = {
  type: 'streak'
  key: string
  op: '>='
  value: number
}

export type AchievementCriteriaFlag = {
  type: 'flag'
  key: string
}

export type AchievementCriteriaAll = {
  type: 'all'
  conditions: AchievementCriteria[]
}

export type AchievementCriteria =
  | AchievementCriteriaCounter
  | AchievementCriteriaStreak
  | AchievementCriteriaFlag
  | AchievementCriteriaAll

export type AchievementReward = {
  spiritStones?: number
  legacyPoints?: number
}

export type AchievementDef = {
  id: string
  name: string
  group: string
  tier: number
  desc: string
  hidden: boolean
  criteria: AchievementCriteria
  reward: AchievementReward
}

export type AchievementGroupDef = {
  id: string
  name: string
}

export type AchievementsFile = {
  version: number
  groups: AchievementGroupDef[]
  achievements: AchievementDef[]
}

const data = achievementsFile as AchievementsFile
if (data.version !== 1 || !Array.isArray(data.achievements) || !Array.isArray(data.groups)) {
  throw new Error('achievements.v1.json: invalid version or structure')
}

export const achievementGroups = data.groups
export const achievementDefs = data.achievements
const defsById = new Map<string, AchievementDef>()
achievementDefs.forEach((a) => defsById.set(a.id, a))

export function getAchievementDef(id: string): AchievementDef | undefined {
  return defsById.get(id)
}

export function getAchievementDefsByGroup(groupId: string): AchievementDef[] {
  return achievementDefs.filter((a) => a.group === groupId)
}

// ---------- 状态片段类型（由 game/state 提供） ----------
export type AchievementStateSlice = {
  claimed: Record<string, true>
  statsLifetime: Record<string, number>
  statsRun: Record<string, number>
  streaks: Record<string, number>
  flags: Record<string, true>
  /** 用于计算 run_item_types、codex_entries 等 */
  player?: {
    materials?: Record<string, number>
    elixirs?: Record<string, Record<string, number>>
    recipesUnlocked?: Record<string, boolean>
    relics?: string[]
    codex?: { bestQualityByRecipe?: Record<string, string>; bestQualityByElixir?: Record<string, string> }
  }
  /** 用于 legacy_nodes、legacy_points_total、games_completed */
  meta?: {
    legacyPoints?: number
    legacyUpgrades?: Record<string, number>
  }
  run?: {
    danger?: number
  }
}

function getStatsLifetime(s: AchievementStateSlice): Record<string, number> {
  return s.statsLifetime ?? {}
}

function getStatsRun(s: AchievementStateSlice): Record<string, number> {
  return s.statsRun ?? {}
}

function getStreaks(s: AchievementStateSlice): Record<string, number> {
  return s.streaks ?? {}
}

function getFlags(s: AchievementStateSlice): Record<string, true> {
  return s.flags ?? {}
}

function getCounterValue(s: AchievementStateSlice, key: string): number {
  const lifetime = getStatsLifetime(s)
  if (key === 'run_max_danger' || key === 'run_alchemy_count' || key === 'run_item_types') {
    return getStatsRun(s)[key] ?? 0
  }
  if (key in lifetime) return lifetime[key] ?? 0
  // 派生：codex_entries = 有 bestQuality 非 none 的条目数
  if (key === 'codex_entries' && s.player?.codex) {
    const byRecipe = s.player.codex.bestQualityByRecipe ?? {}
    const byElixir = s.player.codex.bestQualityByElixir ?? {}
    const fromRecipe = Object.values(byRecipe).filter((q) => q && q !== 'none').length
    const fromElixir = Object.values(byElixir).filter((q) => q && q !== 'none').length
    return Math.max(fromRecipe, fromElixir) || (Object.keys(byRecipe).length + Object.keys(byElixir).length > 0 ? 1 : 0)
  }
  if (key === 'relics_unlocked' && s.player?.relics) {
    return s.player.relics.length
  }
  if (key === 'recipes_unlocked' && s.player?.recipesUnlocked) {
    return Object.values(s.player.recipesUnlocked).filter(Boolean).length
  }
  if (key === 'legacy_points_total' && s.meta?.legacyPoints != null) {
    return s.meta.legacyPoints
  }
  if (key === 'legacy_nodes' && s.meta?.legacyUpgrades) {
    return Object.keys(s.meta.legacyUpgrades).length
  }
  return lifetime[key] ?? 0
}

function getStreakValue(s: AchievementStateSlice, key: string): number {
  return getStreaks(s)[key] ?? 0
}

function hasFlag(s: AchievementStateSlice, key: string): boolean {
  return getFlags(s)[key] === true
}

function evaluateCriteria(s: AchievementStateSlice, c: AchievementCriteria): boolean {
  if (c.type === 'counter') {
    const v = getCounterValue(s, c.key)
    if (c.op === '>=') return v >= c.value
    return v === c.value
  }
  if (c.type === 'streak') {
    const v = getStreakValue(s, c.key)
    return v >= c.value
  }
  if (c.type === 'flag') {
    return hasFlag(s, c.key)
  }
  if (c.type === 'all') {
    return c.conditions.every((cond) => evaluateCriteria(s, cond))
  }
  return false
}

function isAchievementComplete(s: AchievementStateSlice, def: AchievementDef): boolean {
  return evaluateCriteria(s, def.criteria)
}

/** 隐藏成就：未达成前不显示；达成后显示且可领取 */
function isAchievementVisible(s: AchievementStateSlice, def: AchievementDef): boolean {
  if (!def.hidden) return true
  return isAchievementComplete(s, def)
}

export type AchievementViewItem = {
  id: string
  name: string
  group: string
  groupName: string
  tier: number
  desc: string
  hidden: boolean
  completed: boolean
  claimable: boolean
  claimed: boolean
  current?: number
  target?: number
  rewardText: string
}

function rewardToText(r: AchievementReward): string {
  const parts: string[] = []
  if (r.spiritStones && r.spiritStones > 0) parts.push(`灵石×${r.spiritStones}`)
  if (r.legacyPoints && r.legacyPoints > 0) parts.push(`传承点×${r.legacyPoints}`)
  return parts.length ? parts.join('、') : '无'
}

function getCurrentTarget(def: AchievementDef, s: AchievementStateSlice): { current: number; target: number } | undefined {
  const c = def.criteria
  if (c.type === 'counter') {
    return { current: getCounterValue(s, c.key), target: c.value }
  }
  if (c.type === 'streak') {
    return { current: getStreakValue(s, c.key), target: c.value }
  }
  return undefined
}

/**
 * 单一来源：返回 UI 需要的全部成就视图（进度、可领取、奖励、分组、排序）。
 * 隐藏成就未达成时不返回。
 */
export function getAchievementView(state: AchievementStateSlice): AchievementViewItem[] {
  const claimed = state.claimed ?? {}
  const groupNames = new Map(achievementGroups.map((g) => [g.id, g.name]))
  const result: AchievementViewItem[] = []
  for (const def of achievementDefs) {
    if (!isAchievementVisible(state, def)) continue
    const completed = isAchievementComplete(state, def)
    const alreadyClaimed = claimed[def.id] === true
    const claimable = completed && !alreadyClaimed
    const progress = getCurrentTarget(def, state)
    result.push({
      id: def.id,
      name: def.name,
      group: def.group,
      groupName: groupNames.get(def.group) ?? def.group,
      tier: def.tier,
      desc: def.desc,
      hidden: def.hidden,
      completed,
      claimable,
      claimed: alreadyClaimed,
      current: progress?.current,
      target: progress?.target,
      rewardText: rewardToText(def.reward),
    })
  }
  // 排序：可领取优先，其次按 group、tier
  result.sort((a, b) => {
    if (a.claimable && !b.claimable) return -1
    if (!a.claimable && b.claimable) return 1
    if (a.group !== b.group) return a.group.localeCompare(b.group)
    return a.tier - b.tier
  })
  return result
}

/**
 * 领取单个成就：幂等，已领取不重复发奖。
 */
export function claimAchievement(
  state: AchievementStateSlice & { player?: { spiritStones?: number }; meta?: { legacyPoints?: number } },
  id: string,
): {
  state: AchievementStateSlice & { player?: { spiritStones?: number }; meta?: { legacyPoints?: number } }
  rewardApplied: boolean
} {
  const def = getAchievementDef(id)
  if (!def) return { state, rewardApplied: false }
  const claimed = state.claimed ?? {}
  if (claimed[id]) return { state, rewardApplied: false }
  if (!isAchievementComplete(state, def)) return { state, rewardApplied: false }

  const nextClaimed = { ...claimed, [id]: true as const }
  let nextState: AchievementStateSlice & { player?: { spiritStones?: number }; meta?: { legacyPoints?: number } } = {
    ...state,
    claimed: nextClaimed,
  }
  const r = def.reward
  if (r.spiritStones && r.spiritStones > 0 && nextState.player) {
    nextState = {
      ...nextState,
      player: {
        ...nextState.player,
        spiritStones: (nextState.player.spiritStones ?? 0) + r.spiritStones,
      },
    }
  }
  if (r.legacyPoints && r.legacyPoints > 0 && nextState.meta) {
    nextState = {
      ...nextState,
      meta: {
        ...nextState.meta,
        legacyPoints: (nextState.meta.legacyPoints ?? 0) + r.legacyPoints,
      },
    }
  }
  // 累计领取次数（用于成就「老祖出山」）
  const nextLifetime = { ...(nextState.statsLifetime ?? {}), achievement_claims_lifetime: (nextState.statsLifetime?.achievement_claims_lifetime ?? 0) + 1 }
  nextState = { ...nextState, statsLifetime: nextLifetime }
  return { state: nextState, rewardApplied: true }
}

/**
 * 一键领取全部可领取成就；幂等，奖励合并发放。
 */
export function claimAllAchievements(
  state: AchievementStateSlice & { player?: { spiritStones?: number }; meta?: { legacyPoints?: number } },
): {
  state: AchievementStateSlice & { player?: { spiritStones?: number }; meta?: { legacyPoints?: number } }
  claimedIds: string[]
} {
  const view = getAchievementView(state)
  const toClaim = view.filter((v) => v.claimable).map((v) => v.id)
  let nextState = state
  const claimedIds: string[] = []
  for (const id of toClaim) {
    const { state: s, rewardApplied } = claimAchievement(nextState, id)
    nextState = s
    if (rewardApplied) claimedIds.push(id)
  }
  return { state: nextState, claimedIds }
}

/** 从 GameState 形状构建成就模块所需的 state 切片（避免 achievements 依赖 game） */
export function buildAchievementStateSlice(state: {
  achievements?: { claimed?: Record<string, true> }
  meta?: {
    statsLifetime?: Record<string, number>
    legacyPoints?: number
    legacyUpgrades?: Record<string, number>
  }
  run?: {
    stats?: Record<string, number>
    streaks?: Record<string, number>
    flags?: Record<string, true>
    danger?: number
  }
  player?: {
    materials?: Record<string, number>
    elixirs?: Record<string, Record<string, number>>
    recipesUnlocked?: Record<string, boolean>
    relics?: string[]
    codex?: {
      bestQualityByRecipe?: Record<string, string>
      bestQualityByElixir?: Record<string, string>
    }
  }
}): AchievementStateSlice {
  return {
    claimed: state.achievements?.claimed ?? {},
    statsLifetime: state.meta?.statsLifetime ?? {},
    statsRun: state.run?.stats ?? {},
    streaks: state.run?.streaks ?? {},
    flags: state.run?.flags ?? {},
    player: state.player,
    meta: state.meta,
    run: state.run,
  }
}
