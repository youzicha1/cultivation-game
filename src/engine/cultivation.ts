/**
 * TICKET-23: 修炼三模式（吐纳/冲脉/悟道）+ 心境 mind 与顿悟事件
 * 纯函数：getCultivateInfo、cultivate；RNG 可注入便于测试。
 */

import type { GameState } from './game'
import type { PlayerState } from './state'
import type { Rng } from './rng'
import { randInt } from './rng'

export type CultivateMode = 'breath' | 'pulse' | 'insight'

const MIND_MIN = 0
const MIND_MAX = 100
const MIND_DEFAULT = 50

function clampMind(v: number): number {
  return Math.max(MIND_MIN, Math.min(MIND_MAX, v))
}

/** 心境档位文案 */
export const MIND_TIERS: { label: string; min: number }[] = [
  { label: '心浮', min: 0 },
  { label: '平稳', min: 25 },
  { label: '澄明', min: 50 },
  { label: '入定', min: 75 },
]

export function getMindTier(mind: number): string {
  let tier = MIND_TIERS[0].label
  for (const t of MIND_TIERS) {
    if (mind >= t.min) tier = t.label
  }
  return tier
}

export type CultivateInfo = {
  mind: number
  mindTier: string
  mindEffectsSummary: string
}

export function getCultivateInfo(state: GameState): CultivateInfo {
  const mind = clampMind(state.player.mind ?? MIND_DEFAULT)
  const tier = getMindTier(mind)
  const parts: string[] = []
  if (mind >= 50) parts.push('探索危险增长减缓')
  else parts.push('探索危险增长加快')
  parts.push('心境影响突破成功率')
  return {
    mind,
    mindTier: tier,
    mindEffectsSummary: parts.join('；'),
  }
}

export type CultivateToast = {
  expGain: number
  hpGain?: number
  mindDelta?: number
  spiritStonesGain?: number
}

export type InsightChoiceA = { text: string; shards?: number; legacy?: number }
export type InsightChoiceB = { text: string; exp?: number; dangerAdd?: number; hpCost?: number }

export type InsightEvent = {
  title: string
  text: string
  choiceA: InsightChoiceA
  choiceB: InsightChoiceB
}

export type CultivateResult = {
  nextPlayer: PlayerState
  nextRunDelta: Partial<Pick<GameState['run'], 'danger' | 'cultivateCount'>>
  logMessage: string
  toast?: CultivateToast
  insightEvent?: InsightEvent
}

function addLog(state: GameState, message: string): GameState {
  const nextLog = [...state.log, message]
  if (nextLog.length > 50) nextLog.splice(0, nextLog.length - 50)
  return { ...state, log: nextLog }
}

/** 吐纳：稳定回血/修伤 + 稳定修为，mind 上升 */
export function cultivateBreath(state: GameState, rng: Rng): CultivateResult {
  const player = state.player
  const mind = clampMind(player.mind ?? MIND_DEFAULT)
  const expGain = 10 + Math.floor(mind / 20)
  const hpGain = 3 + (mind >= 70 ? 1 : 0)
  const mindDelta = 6
  const newMind = clampMind(mind + mindDelta)
  const injuredTurns = Math.max(0, (player.injuredTurns ?? 0) - 1)
  const newHp = Math.min(player.maxHp, player.hp + hpGain)
  const danger = Math.max(0, (state.run.danger ?? 0) - 2)
  const cultivateCount = (state.run.cultivateCount ?? 0) + 1

  const nextPlayer: PlayerState = {
    ...player,
    exp: player.exp + expGain,
    hp: newHp,
    mind: newMind,
    injuredTurns,
  }
  const logMessage = injuredTurns < (player.injuredTurns ?? 0)
    ? `【吐纳】修为+${expGain}，生命+${hpGain}，心境+${mindDelta}；伤势略缓。危险值-2。`
    : `【吐纳】修为+${expGain}，生命+${hpGain}，心境+${mindDelta}。危险值-2。`

  return {
    nextPlayer,
    nextRunDelta: { danger, cultivateCount },
    logMessage,
    toast: { expGain, hpGain, mindDelta },
  }
}

/** 冲脉：高修为，小概率受伤；成功时额外灵石 */
export function cultivatePulse(state: GameState, rng: Rng): CultivateResult {
  const player = state.player
  const mind = clampMind(player.mind ?? MIND_DEFAULT)
  const expGain = 16 + randInt(rng, 0, 6)
  const mindDelta = -4
  const newMind = clampMind(mind + mindDelta)
  let injuredTurns = player.injuredTurns ?? 0
  let hp = player.hp
  let spiritStonesGain = 0
  const injuryProb = 0.12 + Math.max(0, (60 - mind)) * 0.002
  const injured = rng.next() < injuryProb
  const cultivateCount = (state.run.cultivateCount ?? 0) + 1

  if (injured) {
    hp = Math.max(0, hp - 8)
    injuredTurns += 2
  } else {
    spiritStonesGain = 3
  }

  const nextPlayer: PlayerState = {
    ...player,
    exp: player.exp + expGain,
    hp,
    mind: newMind,
    injuredTurns,
    spiritStones: player.spiritStones + spiritStonesGain,
  }
  const logMessage = injured
    ? `【冲脉】走火岔气！修为+${expGain}，生命-8，心境${mindDelta}；伤势+2。`
    : `【冲脉】修为+${expGain}，心境${mindDelta}；气血翻涌，灵石+${spiritStonesGain}。`

  return {
    nextPlayer,
    nextRunDelta: { cultivateCount },
    logMessage,
    toast: { expGain, mindDelta, spiritStonesGain: injured ? undefined : spiritStonesGain },
  }
}

/** 悟道：基础低修为，概率顿悟（A/B 选择）；未触发则 mind+2 */
export function cultivateInsight(state: GameState, rng: Rng): CultivateResult {
  const player = state.player
  const mind = clampMind(player.mind ?? MIND_DEFAULT)
  const expGain = 8
  const triggerProb = Math.max(0.05, Math.min(0.5, 0.18 + (mind - 50) * 0.002))
  const triggered = rng.next() < triggerProb
  const cultivateCount = (state.run.cultivateCount ?? 0) + 1

  if (triggered) {
    const useLegacy = rng.next() < 0.5
    const useDanger = rng.next() < 0.5
    const insightEvent: InsightEvent = {
      title: '顿悟',
      text: '灵台一瞬清明，你窥见两条路。',
      choiceA: useLegacy
        ? { text: '稳悟·取传承真意', legacy: 1 }
        : { text: '稳悟·取功法残韵', shards: 6 },
      choiceB: useDanger
        ? { text: '险悟·借势冲关', exp: 25, dangerAdd: 8 }
        : { text: '险悟·以伤换悟', exp: 28, hpCost: 6 },
    }
    const nextPlayer: PlayerState = {
        ...player,
        exp: player.exp + expGain,
        mind: clampMind(mind + 2),
      }
    return {
      nextPlayer,
      nextRunDelta: { cultivateCount },
      logMessage: `【悟道】修为+${expGain}，心境+2；灵台顿悟，待你抉择。`,
      toast: { expGain, mindDelta: 2 },
      insightEvent,
    }
  }

  const mindDelta = 2
  const newMind = clampMind(mind + mindDelta)
  const nextPlayer: PlayerState = {
    ...player,
    exp: player.exp + expGain,
    mind: newMind,
  }
  return {
    nextPlayer,
    nextRunDelta: { cultivateCount },
    logMessage: `【悟道】修为+${expGain}，心境+${mindDelta}。`,
    toast: { expGain, mindDelta },
  }
}

export function cultivate(
  state: GameState,
  mode: CultivateMode,
  rng: Rng,
): CultivateResult {
  switch (mode) {
    case 'breath':
      return cultivateBreath(state, rng)
    case 'pulse':
      return cultivatePulse(state, rng)
    case 'insight':
      return cultivateInsight(state, rng)
    default:
      return cultivateBreath(state, rng)
  }
}

/** TICKET-23: 心境对探索危险增长的乘数 (0.85~1.15) */
export function getMindDangerIncMult(mind: number): number {
  const m = 1 - (clampMind(mind) - 50) * 0.002
  return Math.max(0.85, Math.min(1.15, m))
}

/** TICKET-23: 心境对突破成功率的加值 (mind=80 -> +3.6%) */
export function getMindBreakthroughBonus(mind: number): number {
  return (clampMind(mind) - 50) * 0.0012
}

/** TICKET-23: 心境对炼丹成功率的加值（可选，mind>=70 时 +2%） */
export function getMindAlchemySuccessBonus(mind: number): number {
  return (mind ?? 0) >= 70 ? 0.02 : 0
}
