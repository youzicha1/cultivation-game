/**
 * TICKET-15: 终局天劫挑战（3 回合抉择）+ 多结局收束
 * 纯函数：threat/resolve 生成、伤害公式、结局判定、奖励计算。
 */

import type { GameState } from './game'
import type { ElixirQuality } from './alchemy'

const REALMS = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神'] as const

function realmIndex(realm: string): number {
  const i = REALMS.indexOf(realm as (typeof REALMS)[number])
  return i < 0 ? 0 : i
}

/** 天劫强度 [60, 140]：本局越贪越强 */
export function computeThreat(state: GameState): number {
  const base = 50
  const realm = realmIndex(state.player.realm)
  const danger = state.run.danger ?? 0
  const chain = state.run.chain
  const chainsCompleted = chain?.completed && typeof chain.completed === 'object'
    ? Object.keys(chain.completed).filter((k) => chain.completed[k]).length
    : 0
  const codex = state.player.codex ?? {}
  const bestByElixir = (codex as { bestQualityByElixir?: Record<string, ElixirQuality | 'none'> }).bestQualityByElixir ?? {}
  const qualities = Object.values(bestByElixir) as (ElixirQuality | 'none')[]
  let alchemyBonus = 0
  if (qualities.some((q) => q === 'tian')) alchemyBonus = 12
  else if (qualities.some((q) => q === 'di')) alchemyBonus = 6

  const raw =
    base +
    realm * 6 +
    danger * 0.3 +
    alchemyBonus +
    chainsCompleted * 8
  return Math.round(Math.max(60, Math.min(140, raw)))
}

/** 初始抗性/意志（用于天劫挑战） */
export function computeInitialResolve(state: GameState): number {
  const realm = realmIndex(state.player.realm)
  const maxHp = state.player.maxHp ?? 100
  return Math.round(maxHp * 0.6) + realm * 5
}

/** 本回合基础伤害（仅依赖 threat 与回合数） */
export function getDmgBase(threat: number, step: number): number {
  return Math.round(threat * 0.12) + step * 2
}

/** 稳：伤害较低，resolve 小幅提升 */
export function applySteadyDamage(
  dmgBase: number,
  resolve: number,
): { dmg: number; resolveDelta: number } {
  const dmg = Math.max(1, dmgBase - Math.round(resolve * 0.1))
  return { dmg, resolveDelta: 2 }
}

/** 搏：成功则伤害低、resolve 大加；失败则伤害高 */
export const GAMBLE_SUCCESS_RATE = 0.55

export function applyGamble(
  dmgBase: number,
  _resolve: number,
  roll: number,
): { dmg: number; resolveDelta: number; success: boolean } {
  const success = roll < GAMBLE_SUCCESS_RATE
  const dmg = success
    ? Math.max(1, Math.round(dmgBase * 0.6))
    : Math.max(1, Math.round(dmgBase * 1.4))
  const resolveDelta = success ? 6 : 0
  return { dmg, resolveDelta, success }
}

/** 献祭类型与效果（伤害减免或回血/resolve） */
export type SacrificeKind = 'spirit_stones' | 'pills' | 'material' | 'inheritance'

const SACRIFICE_COST: Record<SacrificeKind, { check: (s: GameState) => boolean; shield: number; resolveDelta?: number; heal?: number }> = {
  spirit_stones: {
    check: (s) => (s.player.spiritStones ?? 0) >= 50,
    shield: 8,
  },
  pills: {
    check: (s) => (s.player.pills ?? 0) >= 2,
    shield: 0,
    heal: 10,
  },
  material: {
    check: (s) => ((s.player.materials ?? {}).spirit_herb ?? 0) >= 3,
    shield: 6,
  },
  inheritance: {
    check: (s) => (s.player.inheritancePoints ?? 0) >= 2,
    shield: 0,
    resolveDelta: 5,
  },
}

export function canSacrifice(state: GameState, kind: SacrificeKind): boolean {
  return SACRIFICE_COST[kind].check(state)
}

export function getSacrificeShield(kind: SacrificeKind): number {
  return SACRIFICE_COST[kind].shield
}

export function getSacrificeHeal(kind: SacrificeKind): number {
  return SACRIFICE_COST[kind].heal ?? 0
}

export function getSacrificeResolveDelta(kind: SacrificeKind): number {
  return SACRIFICE_COST[kind].resolveDelta ?? 0
}

/** 献祭需扣除的资源（reducer 用） */
export function getSacrificeDeduction(kind: SacrificeKind): {
  spiritStones?: number
  pills?: number
  material?: { id: string; count: number }
  inheritancePoints?: number
} {
  switch (kind) {
    case 'spirit_stones':
      return { spiritStones: 50 }
    case 'pills':
      return { pills: 2 }
    case 'material':
      return { material: { id: 'spirit_herb', count: 3 } }
    case 'inheritance':
      return { inheritancePoints: 2 }
    default:
      return {}
  }
}

/** 献祭后伤害与增益 */
export function applySacrificeDamage(
  dmgBase: number,
  kind: SacrificeKind,
): { dmg: number; shield: number; heal: number; resolveDelta: number } {
  const cfg = SACRIFICE_COST[kind]
  const shield = cfg.shield ?? 0
  const dmg = Math.max(1, dmgBase - shield)
  return {
    dmg,
    shield,
    heal: cfg.heal ?? 0,
    resolveDelta: cfg.resolveDelta ?? 0,
  }
}

/** 结局 ID（4 种） */
export type EndingId = 'ascend' | 'retire' | 'demon' | 'dead'

/** 完成 3 回合后根据 hp/resolve/threat 判定结局 */
export function computeEndingId(
  hp: number,
  resolve: number,
  threat: number,
  _bonus: number = 0,
): EndingId {
  if (hp <= 0) return 'dead'
  const score = resolve - threat
  if (score >= 20) return 'ascend'
  if (score >= -5) return 'retire'
  return 'demon'
}

/** 结局对应的传承点与碎片奖励（爽文补偿） */
export function getFinalRewards(endingId: EndingId): {
  legacyBonus: number
  shardsBonus: number
  demonUnlock?: boolean
} {
  switch (endingId) {
    case 'ascend':
      return { legacyBonus: 3, shardsBonus: 3 }
    case 'retire':
      return { legacyBonus: 2, shardsBonus: 2 }
    case 'demon':
      return { legacyBonus: 2, shardsBonus: 1, demonUnlock: true }
    case 'dead':
      return { legacyBonus: 1, shardsBonus: 1 }
    default:
      return { legacyBonus: 1, shardsBonus: 0 }
  }
}

/** 结局标题文案（爽文味） */
export const ENDING_TITLES: Record<EndingId, string> = {
  ascend: '金光破云，踏碎天门！',
  retire: '道心未满，暂且韬光养晦。',
  demon: '魔念噬心，却也得一线魔道真解…',
  dead: '身死道消，但你的传承仍在。',
}

/** 结局副文案 */
export const ENDING_SUBTITLES: Record<EndingId, string> = {
  ascend: '飞升',
  retire: '归隐',
  demon: '入魔',
  dead: '战死',
}
