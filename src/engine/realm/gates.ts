/**
 * TICKET-30: 境界/等级门槛 — 经验 cap、丹药门槛与每局上限、功法装备门槛、天劫层门槛
 * 单一来源：getLevelCap、applyExpGain、canTakePill、recordPillUse、canEquipKungfu、getTribulationGate
 */

import realmsFile from '../../content/realms.v1.json'
import type { GameState } from '../game'
import type { PlayerState } from '../state'
import type { ElixirQuality } from '../alchemy'
import type { RelicId } from '../relics'
import { getKungfu } from '../kungfu'
import type { KungfuRarity } from '../kungfu'
import { getStageCap, expNeededForNextLevel } from '../progression/stage'

export type RealmId = string

export type PillRule = {
  minRealmOrder: number
  maxPerRun: number
}

export type KungfuRule = {
  /** 可装备最高稀有度顺序 0=common, 1=rare, 2=epic, 3=legendary */
  maxRarityOrder?: number
  minRealmOrder?: number
}

export type RealmDef = {
  id: RealmId
  name: string
  order: number
  levelCap: number
  tribulationMaxTier: number
  pillRules: Record<ElixirQuality, PillRule>
  kungfuRule: KungfuRule
}

type RealmsFile = {
  version: number
  realms: Array<{
    id: string
    name: string
    order: number
    levelCap: number
    tribulationMaxTier: number
    pillRules: Record<string, { minRealmOrder: number; maxPerRun: number }>
    kungfuRule: { maxRarityOrder?: number; minRealmOrder?: number }
  }>
}

function loadRealms(): RealmDef[] {
  const raw = realmsFile as unknown as RealmsFile
  if (!raw?.realms || !Array.isArray(raw.realms)) {
    throw new Error('realms.v1.json: invalid structure')
  }
  return raw.realms.map((r) => ({
    id: r.id,
    name: r.name,
    order: r.order,
    levelCap: r.levelCap,
    tribulationMaxTier: r.tribulationMaxTier,
    pillRules: r.pillRules as Record<ElixirQuality, PillRule>,
    kungfuRule: r.kungfuRule ?? {},
  }))
}

let realmsCache: RealmDef[] | null = null

export function getRealms(): RealmDef[] {
  if (!realmsCache) realmsCache = loadRealms()
  return realmsCache
}

export function getRealmById(realmId: string): RealmDef | undefined {
  return getRealms().find((r) => r.id === realmId)
}

export function getRealmOrder(realmId: string): number {
  const r = getRealmById(realmId)
  return r?.order ?? 0
}

/** 当前境界的等级上限；无境界数据时返回 99 */
export function getLevelCap(state: GameState): number {
  const r = getRealmById(state.player.realm)
  return r?.levelCap ?? 99
}

/**
 * TICKET-33: 增加经验；阶 cap 挡住不再增长（需阶突破）。经验曲线二次平滑。
 */
export function applyExpGain(
  state: GameState,
  amount: number,
): { nextPlayer: PlayerState; capped: boolean; message: string } {
  const player = state.player
  const stageCap = getStageCap(state)
  const level = Math.max(1, Math.min(99, player.level ?? 1))
  if (level >= stageCap) {
    return {
      nextPlayer: { ...player, level, exp: player.exp ?? 0 },
      capped: true,
      message: '已到上限，需阶突破',
    }
  }
  let exp = (player.exp ?? 0) + amount
  let nextLevel = level
  const maxLevel = Math.min(stageCap, 99)
  while (nextLevel < maxLevel && exp >= expNeededForNextLevel(nextLevel)) {
    exp -= expNeededForNextLevel(nextLevel)
    nextLevel += 1
  }
  if (nextLevel >= maxLevel) {
    exp = Math.min(exp, expNeededForNextLevel(nextLevel) - 1)
    if (nextLevel >= stageCap) exp = 0
  }
  return {
    nextPlayer: { ...player, level: nextLevel, exp },
    capped: nextLevel >= stageCap,
    message: nextLevel >= stageCap ? '已到上限，需阶突破' : '',
  }
}

/** 当前境界是否允许服用该品质丹药（境界 + 每局上限） */
export function canTakePill(
  state: GameState,
  quality: ElixirQuality,
): { ok: boolean; reason?: string } {
  const realm = getRealmById(state.player.realm)
  if (!realm) return { ok: true }
  const rule = realm.pillRules[quality]
  if (!rule) return { ok: true }
  const realmOrder = getRealmOrder(state.player.realm)
  if (realmOrder < rule.minRealmOrder) {
    return { ok: false, reason: `需境界${getRealmNameByOrder(rule.minRealmOrder)}以上方可服用` }
  }
  const used = state.run.pillUsedByQuality ?? { fan: 0, xuan: 0, di: 0, tian: 0 }
  const usedCount = used[quality] ?? 0
  if (usedCount >= rule.maxPerRun) {
    return { ok: false, reason: `本局该品质已用满${rule.maxPerRun}次` }
  }
  return { ok: true }
}

function getRealmNameByOrder(order: number): string {
  const r = getRealms().find((x) => x.order === order)
  return r?.name ?? `境界${order}`
}

/** 记录本局服用该品质一次（突破/天劫等入口调用前需 canTakePill） */
export function recordPillUse(
  run: GameState['run'],
  quality: ElixirQuality,
): GameState['run'] {
  const used = run.pillUsedByQuality ?? { fan: 0, xuan: 0, di: 0, tian: 0 }
  return {
    ...run,
    pillUsedByQuality: {
      ...used,
      [quality]: (used[quality] ?? 0) + 1,
    },
  }
}

const RARITY_ORDER: KungfuRarity[] = ['common', 'rare', 'epic', 'legendary']

/** 当前境界是否允许装备该功法 */
export function canEquipKungfu(
  state: GameState,
  kungfuId: string,
): { ok: boolean; reason?: string } {
  const realm = getRealmById(state.player.realm)
  if (!realm?.kungfuRule) return { ok: true }
  const def = getKungfu(kungfuId as RelicId)
  if (!def) return { ok: false, reason: '未知功法' }
  const maxRarityOrder = realm.kungfuRule.maxRarityOrder ?? 5
  const rarityIdx = RARITY_ORDER.indexOf(def.rarity)
  if (rarityIdx < 0 || rarityIdx > maxRarityOrder) {
    return { ok: false, reason: `需更高境界方可装备${def.rarity}功法` }
  }
  return { ok: true }
}

/** 天劫层门槛：tier > 当前境界允许的最大劫层则 successRate=0 或禁止 */
export function getTribulationGate(
  state: GameState,
  tier: number,
): { allowed: boolean; successRateMultiplier: number; reason?: string } {
  const realm = getRealmById(state.player.realm)
  const maxTier = realm?.tribulationMaxTier ?? 0
  if (tier > maxTier) {
    return {
      allowed: false,
      successRateMultiplier: 0,
      reason: `需境界${realm?.name ?? '?'}以上方可渡第${tier}重劫`,
    }
  }
  return { allowed: true, successRateMultiplier: 1 }
}
