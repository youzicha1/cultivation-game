/**
 * TICKET-30: 突破系统单一来源 — getBreakthroughView、attemptBreakthrough、觉醒技能三选一
 */

import type { GameState } from '../game'
import type { PlayerState } from '../state'
import type { Rng } from '../rng'
import { randInt } from '../rng'
import type { ElixirId, ElixirQuality } from '../alchemy'
import { getElixirName } from '../alchemy'
import { getStageCap, getStageIndex, canStageBreakthrough, canRealmBreakthrough } from '../progression/stage'
import { canTakePill, recordPillUse } from '../realm/gates'
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
import { rollAwakenSkillChoices as rollAwakenChoicesFromPool } from '../awaken/roll'

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
  /** TICKET-33: 阶 1..7 */
  stageIndex: number
  /** 是否可进行阶突破（level==stageCap 且 stageIndex<7） */
  canStageBreakthrough: boolean
  /** 是否可进行境界突破（Lv99 且 stageIndex==7） */
  canRealmBreakthrough: boolean
  /** 阶突破成功率（仅当 canStageBreakthrough 时有意义） */
  stageBreakthroughRate: number
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
  const stageIndex = player.stageIndex ?? getStageIndex(level)
  const cap = getStageCap(state)
  const exp = player.exp ?? 0
  const capped = level >= cap
  const canStage = canStageBreakthrough(state)
  const canRealm = canRealmBreakthrough(state)

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
  const stageBreakthroughRate = Math.min(
    0.95,
    STAGE_BREAKTHROUGH_BASE_RATE + (stageIndex - 1) * STAGE_BREAKTHROUGH_RATE_PER_STAGE + dailyBonus,
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
    stageIndex,
    canStageBreakthrough: canStage,
    canRealmBreakthrough: canRealm,
    stageBreakthroughRate,
    successRate: rate,
    breakdown,
    pillOptions,
    inheritanceSpentMax: Math.min(3, player.inheritancePoints ?? 0),
    inheritanceSpent,
    prereqOk,
    prereqReason,
  }
}

/** TICKET-35: 突破成功后加权抽 3 个不重复觉醒技能（池/权重/互斥见 awaken/roll） */
export function rollAwakenSkillChoices(state: GameState, rng: Rng): string[] {
  return rollAwakenChoicesFromPool(state, rng)
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

/** TICKET-33: 阶突破成功率（基础 0.85 + 阶加成） */
const STAGE_BREAKTHROUGH_BASE_RATE = 0.85
const STAGE_BREAKTHROUGH_RATE_PER_STAGE = 0.02

/** TICKET-33: 阶突破奖励：maxHp+10、回气丹·凡×1 */
const STAGE_BREAKTHROUGH_HP_GAIN = 10

export type AttemptStageBreakthroughResult = {
  success: boolean
  nextPlayer: PlayerState
  runDelta: Partial<GameState['run']> & {
    turn: number
    lastOutcome: NonNullable<GameState['run']['lastOutcome']>
  }
}

/** TICKET-33: 执行阶突破；条件 level==stageCap 且 stageIndex<7 */
export function attemptStageBreakthrough(
  state: GameState,
  rng: Rng,
): AttemptStageBreakthroughResult {
  const run = state.run
  const turn = run.turn + 1
  if (!canStageBreakthrough(state)) {
    return {
      success: false,
      nextPlayer: state.player,
      runDelta: {
        turn,
        lastOutcome: {
          kind: 'breakthrough',
          success: false,
          title: '未达条件',
          text: '需达到当前阶等级上限方可进行突破。',
          deltas: { realm: 0, hp: 0, maxHp: 0, exp: 0, pills: 0, inheritancePoints: 0, pity: 0 },
        },
      },
    }
  }
  const player = state.player
  const level = Math.max(1, Math.min(99, player.level ?? 1))
  const stageIndex = player.stageIndex ?? getStageIndex(level)
  const dailyMod = state.meta?.daily
    ? getDailyModifiers(state.meta.daily.environmentId as import('../daily').DailyEnvironmentId)
    : {}
  const dailyBonus = dailyMod.breakthroughSuccessBonus ?? 0
  const rate = Math.min(
    0.95,
    STAGE_BREAKTHROUGH_BASE_RATE + (stageIndex - 1) * STAGE_BREAKTHROUGH_RATE_PER_STAGE + dailyBonus,
  )
  const success = rng.next() < rate

  const STAGE_CN = ['', '一', '二', '三', '四', '五', '六', '七'] as const
  if (success) {
    const nextStageIndex = Math.min(7, stageIndex + 1)
    const nextLevel = level + 1
    const maxHp = player.maxHp + STAGE_BREAKTHROUGH_HP_GAIN
    const elixirs = { ...player.elixirs }
    if (!elixirs.qi_pill) elixirs.qi_pill = { fan: 0, xuan: 0, di: 0, tian: 0 }
    elixirs.qi_pill = { ...elixirs.qi_pill, fan: (elixirs.qi_pill.fan ?? 0) + 1 }
    const nextPlayer: PlayerState = {
      ...player,
      level: nextLevel,
      exp: 0,
      stageIndex: nextStageIndex,
      maxHp,
      hp: maxHp,
    }
    const realmName = player.realm ?? '凡人'
    const stageCn = STAGE_CN[nextStageIndex] ?? String(nextStageIndex)
    return {
      success: true,
      nextPlayer: { ...nextPlayer, elixirs },
      runDelta: {
        turn,
        lastOutcome: {
          kind: 'breakthrough',
          success: true,
          title: '突破！',
          text: `${realmName}${stageCn}阶！生命上限+${STAGE_BREAKTHROUGH_HP_GAIN}，获得回气丹×1。`,
          deltas: {
            realm: 0,
            hp: STAGE_BREAKTHROUGH_HP_GAIN,
            maxHp: STAGE_BREAKTHROUGH_HP_GAIN,
            exp: -player.exp,
            pills: 0,
            inheritancePoints: 0,
            pity: 0,
          },
        },
      },
    }
  }

  const nextInt = (a: number, b: number) => randInt(rng, a, b)
  const dmg = nextInt(5, 12)
  const nextPlayer: PlayerState = {
    ...player,
    hp: Math.max(0, player.hp - dmg),
    pity: player.pity + 1,
  }
  return {
    success: false,
    nextPlayer,
    runDelta: {
      turn,
        lastOutcome: {
        kind: 'breakthrough',
        success: false,
        title: '突破失败',
        text: `气血翻涌，生命-${dmg}；保底+1。`,
        deltas: {
          realm: 0,
          hp: -dmg,
          maxHp: 0,
          exp: 0,
          pills: 0,
          inheritancePoints: 0,
          pity: 1,
        },
      },
    },
  }
}

/** 执行境界突破：仅 Lv99 且第7阶可用；成功则 realm 升级、level=1、stageIndex=1、觉醒三选一 */
export function attemptBreakthrough(
  state: GameState,
  plan: BreakthroughPlan,
  rng: Rng,
): AttemptBreakthroughResult {
  const run = state.run
  const turn = run.turn + 1
  if (!canRealmBreakthrough(state)) {
    return {
      success: false,
      nextPlayer: state.player,
      runDelta: {
        ...run,
        turn,
        breakthroughPlan: undefined,
        lastOutcome: {
          kind: 'breakthrough',
          success: false,
          title: '未达境界突破条件',
          text: '需达到 Lv99 且完成第7阶后方可进行境界突破。',
          deltas: { realm: 0, hp: 0, maxHp: 0, exp: 0, pills: 0, inheritancePoints: 0, pity: 0 },
        },
      },
    }
  }

  const nextInt = (a: number, b: number) => randInt(rng, a, b)
  const player = state.player
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
    nextPlayer = {
      ...nextPlayer,
      realm: nextRealm(nextPlayer.realm),
      level: 1,
      exp: 0,
      stageIndex: 1,
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

  const noCostOnFail = state.run.temp?.breakthroughNoCostOnFail === true
  const legacyCtx = buildLegacyModifiers(state.meta)
  const mod = getKungfuModifiers(state)
  const baseDmg = noCostOnFail ? 0 : nextInt(14, 26)
  const dmgRaw = pills.some((p) => p.elixirId === 'foundation_pill') ? baseDmg + 3 : baseDmg
  const dmg = noCostOnFail ? 0 : Math.max(8, dmgRaw + (dailyMod.damageBonus ?? 0) - legacyCtx.breakthroughFailureDamageReduction)
  const pityBonus = noCostOnFail ? 0 : (dailyMod.breakthroughPityBonusOnFail ?? 0) + legacyCtx.breakthroughPityBonus
  const pityGain = noCostOnFail ? 0 : Math.max(0, Math.floor((1 + pityBonus) * (mod.breakthroughPityGainMult ?? 1)))
  const inheritanceGain = noCostOnFail ? 0 : 1 + nextInt(0, 1)
  const dropRealm = noCostOnFail ? false : nextPlayer.realm !== '凡人' && rng.next() < 0.5
  nextPlayer = {
    ...nextPlayer,
    hp: nextPlayer.hp - dmg,
    inheritancePoints: nextPlayer.inheritancePoints + inheritanceGain,
    pity: nextPlayer.pity + pityGain,
    ...(dropRealm ? { realm: prevRealmFromReqs(nextPlayer.realm) } : {}),
  }
  const nextTemp = noCostOnFail ? { ...state.run.temp, breakthroughNoCostOnFail: false } : state.run.temp
  return {
    success: false,
    nextPlayer,
    runDelta: {
      ...nextRun,
      turn,
      breakthroughPlan: undefined,
      temp: nextTemp,
      lastOutcome: {
        kind: 'breakthrough',
        success: false,
        title: noCostOnFail ? '问心护体' : '心魔反噬！',
        text: noCostOnFail
          ? '问心丹护体，本次失败不付代价，无伤无跌境。'
          : `心魔一击，但你已窥见天机。献祭传承+${inheritanceGain}（本局突破用），保底+${pityGain}${dropRealm ? '；境界跌落一重' : ''}`,
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
