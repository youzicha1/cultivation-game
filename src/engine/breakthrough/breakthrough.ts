/**
 * TICKET-30: 突破系统单一来源 — getBreakthroughView、attemptBreakthrough、觉醒技能三选一
 */

import type { GameState } from '../game'
import type { PlayerState } from '../state'
import type { Rng } from '../rng'
import { randInt } from '../rng'
import type { ElixirId, ElixirQuality } from '../alchemy'
import { getElixirName } from '../alchemy'
import { getLevelCap, canTakePill, recordPillUse } from '../realm/gates'
import {
  calcBreakthroughRateWithBreakdown,
  nextRealm,
  realmIndex,
  type BreakthroughPillEntry,
} from './rates'
import { prevRealm as prevRealmFromReqs } from '../breakthrough_requirements'
import { buildLegacyModifiers } from '../legacy'
import { getKungfuModifiers } from '../kungfu_modifiers'
import { getDailyModifiers } from '../daily'
import { getAllAwakenSkills, getAwakenSkill } from '../awaken_skills'

export type BreakthroughFocus = 'safe' | 'steady' | 'surge'

export type BreakthroughPlan = {
  pills: BreakthroughPillEntry[]
  inheritanceSpent: number
  focus: BreakthroughFocus
}

export type PillOption = {
  elixirId: ElixirId
  quality: ElixirQuality
  count: number
  name: string
  usable: boolean
  reason?: string
}

export type BreakthroughView = {
  realm: string
  nextRealm: string
  level: number
  cap: number
  exp: number
  capped: boolean
  successRate: number
  breakdown: ReturnType<typeof calcBreakthroughRateWithBreakdown>['breakdown']
  pillOptions: PillOption[]
  inheritanceSpentMax: number
  inheritanceSpent: number
  prereqOk: boolean
  prereqReason?: string
}

import { hasBreakthroughPrereq, getRequiredKungfuForTargetRealm } from '../breakthrough_requirements'
import { relicRegistry } from '../relics'

/** 从背包汇总可用的突破丹药（凝神/筑基），并附 canTakePill 结果；UI 单一来源 */
export function getBreakthroughView(state: GameState): BreakthroughView {
  const player = state.player
  const level = Math.max(1, Math.min(99, player.level ?? 1))
  const cap = getLevelCap(state)
  const exp = player.exp ?? 0
  const capped = level >= cap

  const plan = state.run.breakthroughPlan
  const pills: BreakthroughPillEntry[] =
    plan && 'pills' in plan && Array.isArray((plan as { pills?: BreakthroughPillEntry[] }).pills)
      ? (plan as BreakthroughPlan).pills
      : []
  const inheritanceSpent = plan?.inheritanceSpent ?? 0
  const dailyBonus = state.meta?.daily
    ? getDailyModifiers(state.meta.daily.environmentId as import('../daily').DailyEnvironmentId)
        .breakthroughSuccessBonus ?? 0
    : 0
  const { rate, breakdown } = calcBreakthroughRateWithBreakdown(
    state,
    inheritanceSpent,
    pills,
    dailyBonus,
  )

  const pillOptions: PillOption[] = []
  const elixirs = player.elixirs ?? {}
  const breakthroughElixirIds: ElixirId[] = ['spirit_pill', 'foundation_pill']
  for (const elixirId of breakthroughElixirIds) {
    const qualCounts = elixirs[elixirId]
    if (!qualCounts) continue
    for (const q of ['fan', 'xuan', 'di', 'tian'] as ElixirQuality[]) {
      const count = qualCounts[q] ?? 0
      if (count <= 0) continue
      const gate = canTakePill(state, q)
      pillOptions.push({
        elixirId: elixirId as 'spirit_pill' | 'foundation_pill',
        quality: q,
        count,
        name: getElixirName(elixirId),
        usable: gate.ok,
        reason: gate.reason,
      })
    }
  }

  const targetRealmIndex = realmIndex(player.realm) + 1
  const prereqOk = hasBreakthroughPrereq(player.relics, targetRealmIndex)
  const requiredId = getRequiredKungfuForTargetRealm(targetRealmIndex)
  const prereqReason = !prereqOk && requiredId
    ? `需功法「${relicRegistry[requiredId]?.name ?? requiredId}」方可冲关`
    : undefined

  return {
    realm: player.realm,
    nextRealm: nextRealm(player.realm),
    level,
    cap,
    exp,
    capped,
    successRate: rate,
    breakdown,
    pillOptions,
    inheritanceSpentMax: Math.min(3, player.inheritancePoints ?? 0),
    inheritanceSpent,
    prereqOk,
    prereqReason,
  }
}

/** 突破成功后抽 3 个不重复觉醒技能（排除已拥有、同 exclusiveGroup 已选） */
export function rollAwakenSkillChoices(state: GameState, rng: Rng): string[] {
  const owned = new Set(state.player.awakenSkills ?? [])
  const all = getAllAwakenSkills()
  const ownedGroups = new Set<string>()
  for (const id of owned) {
    const def = getAwakenSkill(id)
    if (def?.exclusiveGroup) ownedGroups.add(def.exclusiveGroup)
  }
  const pool = all.filter((s) => {
    if (owned.has(s.id)) return false
    if (s.exclusiveGroup && ownedGroups.has(s.exclusiveGroup)) return false
    return true
  })
  if (pool.length <= 3) return pool.map((s) => s.id)
  const indices: number[] = []
  while (indices.length < 3) {
    const i = randInt(rng, 0, pool.length - 1)
    if (!indices.includes(i)) indices.push(i)
  }
  return indices.map((i) => pool[i].id)
}

/** 选择觉醒技能：加入 player.awakenSkills，清空 pendingAwakenChoices */
export function chooseAwakenSkill(
  state: GameState,
  skillId: string,
): { nextPlayer: PlayerState; nextRun: Partial<GameState['run']> } {
  const choices = state.run.pendingAwakenChoices ?? []
  if (!choices.includes(skillId)) {
    return { nextPlayer: state.player, nextRun: {} }
  }
  const awakenSkills = [...(state.player.awakenSkills ?? []), skillId]
  return {
    nextPlayer: { ...state.player, awakenSkills },
    nextRun: { pendingAwakenChoices: undefined },
  }
}

export type AttemptBreakthroughResult = {
  success: boolean
  nextPlayer: PlayerState
  runDelta: Partial<GameState['run']> & {
    turn: number
    lastOutcome: NonNullable<GameState['run']['lastOutcome']>
    breakthroughPlan: undefined
    pendingAwakenChoices?: string[]
  }
}

/** 执行突破：扣资源、掷骰、成功则升级+待选觉醒，失败则反噬 */
export function attemptBreakthrough(
  state: GameState,
  plan: BreakthroughPlan,
  rng: Rng,
): AttemptBreakthroughResult {
  const nextInt = (a: number, b: number) => randInt(rng, a, b)
  const player = state.player
  const run = state.run
  const turn = run.turn + 1

  const inheritanceSpent = Math.max(0, Math.min(plan.inheritanceSpent, player.inheritancePoints ?? 0))
  const pills: BreakthroughPillEntry[] = []
  for (const p of plan.pills) {
    if (p.count <= 0) continue
    const gate = canTakePill(state, p.quality)
    if (!gate.ok) continue
    const avail = (player.elixirs[p.elixirId] ?? { fan: 0, xuan: 0, di: 0, tian: 0 })[p.quality] ?? 0
    const count = Math.min(p.count, avail)
    if (count > 0) pills.push({ ...p, count })
  }

  let nextPlayer: PlayerState = {
    ...player,
    inheritancePoints: (player.inheritancePoints ?? 0) - inheritanceSpent,
  }
  for (const p of pills) {
    nextPlayer = {
      ...nextPlayer,
      elixirs: {
        ...nextPlayer.elixirs,
        [p.elixirId]: {
          ...nextPlayer.elixirs[p.elixirId],
          [p.quality]:
            (nextPlayer.elixirs[p.elixirId]?.[p.quality] ?? 0) - p.count,
        },
      },
    }
  }
  let nextRun = { ...run } as GameState['run']
  for (const p of pills) {
    for (let i = 0; i < p.count; i++) {
      nextRun = recordPillUse(nextRun, p.quality)
    }
  }

  const dailyMod = state.meta?.daily
    ? getDailyModifiers(state.meta.daily.environmentId as import('../daily').DailyEnvironmentId)
    : {}
  const dailyBonus = dailyMod.breakthroughSuccessBonus ?? 0
  const { rate } = calcBreakthroughRateWithBreakdown(
    state,
    inheritanceSpent,
    pills,
    dailyBonus,
  )
  const success = rng.next() < rate

  const beforePlayer = state.player
  if (success) {
    const maxHpGain = nextInt(0, 2)
    const maxHp = nextPlayer.maxHp + 2 + maxHpGain
    const expGain = nextInt(3, 8)
    nextPlayer = {
      ...nextPlayer,
      realm: nextRealm(nextPlayer.realm),
      level: Math.min(99, (nextPlayer.level ?? 1) + 1),
      exp: nextPlayer.exp + expGain,
      maxHp,
      hp: maxHp,
      pity: 0,
    }
    const pendingAwakenChoices = rollAwakenSkillChoices({ ...state, player: nextPlayer }, rng)
    return {
      success: true,
      nextPlayer,
      runDelta: {
        ...nextRun,
        turn,
        breakthroughPlan: undefined,
        lastOutcome: {
          kind: 'breakthrough',
          success: true,
          title: '境界突破！',
          text: `金光冲天，天地为你让路！你冲破瓶颈，踏入${nextPlayer.realm}之境！`,
          deltas: buildOutcomeDeltas(beforePlayer, nextPlayer),
          consumed: { inheritanceSpent, pills: pills.length ? pills : undefined },
        },
        pendingAwakenChoices,
      },
    }
  }

  const legacyCtx = buildLegacyModifiers(state.meta)
  const mod = getKungfuModifiers(state)
  const baseDmg = nextInt(14, 26)
  const dmgRaw = pills.some((p) => p.elixirId === 'foundation_pill') ? baseDmg + 3 : baseDmg
  const dmg = Math.max(8, dmgRaw + (dailyMod.damageBonus ?? 0) - legacyCtx.breakthroughFailureDamageReduction)
  const pityBonus = (dailyMod.breakthroughPityBonusOnFail ?? 0) + legacyCtx.breakthroughPityBonus
  const pityGain = Math.max(0, Math.floor((1 + pityBonus) * (mod.breakthroughPityGainMult ?? 1)))
  const inheritanceGain = 1 + nextInt(0, 1)
  const dropRealm = nextPlayer.realm !== '凡人' && rng.next() < 0.5
  nextPlayer = {
    ...nextPlayer,
    hp: nextPlayer.hp - dmg,
    inheritancePoints: nextPlayer.inheritancePoints + inheritanceGain,
    pity: nextPlayer.pity + pityGain,
    ...(dropRealm ? { realm: prevRealmFromReqs(nextPlayer.realm) } : {}),
  }
  return {
    success: false,
    nextPlayer,
    runDelta: {
      ...nextRun,
      turn,
      breakthroughPlan: undefined,
      lastOutcome: {
        kind: 'breakthrough',
        success: false,
        title: '心魔反噬！',
        text: `心魔一击，但你已窥见天机。献祭传承+${inheritanceGain}（本局突破用），保底+${pityGain}${dropRealm ? '；境界跌落一重' : ''}`,
        deltas: buildOutcomeDeltas(beforePlayer, nextPlayer),
        consumed: { inheritanceSpent, pills: pills.length ? pills : undefined },
      },
    },
  }
}

function buildOutcomeDeltas(
  before: PlayerState,
  after: PlayerState,
): Extract<NonNullable<GameState['run']['lastOutcome']>, { kind: 'breakthrough' }>['deltas'] {
  return {
    realm: realmIndex(after.realm) - realmIndex(before.realm),
    hp: after.hp - before.hp,
    maxHp: after.maxHp - before.maxHp,
    exp: (after.exp ?? 0) - (before.exp ?? 0),
    pills: after.pills - before.pills,
    inheritancePoints: (after.inheritancePoints ?? 0) - (before.inheritancePoints ?? 0),
    pity: after.pity - before.pity,
  }
}
