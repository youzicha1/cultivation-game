/**
 * TICKET-29: 天劫回合制玩法 — 可读意图 + 多回合决策 + 丹药/功法/风险收益
 * 单一来源：getTribulationTurnView(state) 输出 UI 所需一切；UI 只展示与发 action。
 */

import type { GameState } from '../game'
import type { Rng } from '../rng'
import { getKungfuModifiers } from '../kungfu_modifiers'
import type { ElixirId, ElixirQuality } from '../alchemy'
import { getElixirName } from '../alchemy'
import { rollIntent, type TribulationIntent } from './tribulation_intents'

// --- 子状态类型（run.tribulation） ---

export interface TribulationDebuffs {
  mindChaos: number
  burn: number
  weak: number
}

export interface TribulationState {
  level: number
  totalTurns: number
  turn: number
  shield: number
  debuffs: TribulationDebuffs
  wrath: number
  currentIntent: TribulationIntent
  log: string[]
}

const LOG_MAX = 20

// --- 丹药天劫效果（至少 2 类：回血/护盾/净化） ---

export type PillEffectKind = 'heal' | 'shield' | 'clear'

const TRIBULATION_PILL_EFFECTS: Record<
  string,
  { kind: PillEffectKind; valueBase: number; valuePerQuality: number }
> = {
  qi_pill: { kind: 'heal', valueBase: 12, valuePerQuality: 4 },
  blood_lotus_pill: { kind: 'heal', valueBase: 18, valuePerQuality: 5 },
  purple_heart_pill: { kind: 'shield', valueBase: 10, valuePerQuality: 4 },
  ice_heart_pill: { kind: 'clear', valueBase: 1, valuePerQuality: 0 },
}

const QUALITY_ORDER: ElixirQuality[] = ['fan', 'xuan', 'di', 'tian']

function pillValue(pillKey: string, quality: ElixirQuality): number {
  const cfg = TRIBULATION_PILL_EFFECTS[pillKey]
  if (!cfg) return 0
  const qIdx = QUALITY_ORDER.indexOf(quality)
  return cfg.valueBase + cfg.valuePerQuality * qIdx
}

export function getTribulationPillOptions(state: GameState): Array<{ elixirId: ElixirId; quality: ElixirQuality; count: number; kind: PillEffectKind; name: string; hint: string }> {
  const trib = state.run.tribulation
  if (!trib) return []
  const list: Array<{ elixirId: ElixirId; quality: ElixirQuality; count: number; kind: PillEffectKind; name: string; hint: string }> = []
  const elixirs = state.player.elixirs ?? {}
  for (const [elixirId, qualCounts] of Object.entries(elixirs)) {
    const cfg = TRIBULATION_PILL_EFFECTS[elixirId]
    if (!cfg) continue
    for (const q of QUALITY_ORDER) {
      const count = (qualCounts as Record<ElixirQuality, number>)[q] ?? 0
      if (count <= 0) continue
      const name = getElixirName(elixirId)
      const val = pillValue(elixirId, q as ElixirQuality)
      const hint =
        cfg.kind === 'heal'
          ? `回血 +${val}`
          : cfg.kind === 'shield'
            ? `护盾 +${val}`
            : `清除心乱/灼烧 ${val} 层`
      list.push({
        elixirId: elixirId as ElixirId,
        quality: q as ElixirQuality,
        count,
        kind: cfg.kind,
        name,
        hint: `${name}(${q}) x${count} · ${hint}`,
      })
    }
  }
  return list
}

// --- 行动类型 ---

export type TribulationActionId = 'STEADY' | 'PILL' | 'GUARD' | 'SURGE'

// --- 伤害与修正（功法接入） ---

function getDamageMult(state: GameState): number {
  const mod = getKungfuModifiers(state)
  return mod.tribulationDamageMult ?? 1
}

function getSurgeRateAdd(state: GameState): number {
  const mod = getKungfuModifiers(state)
  return mod.tribulationSurgeRateAdd ?? 0
}

// --- 总回合数 3~5 按劫层 ---

export function getTotalTurnsForLevel(level: number): number {
  if (level >= 10) return 5
  if (level >= 6) return 4
  return 3
}

// --- 抽选本回合意图（TICKET-36：按 tier 过滤 + 权重） ---

function pickIntent(rng: Rng, level: number): TribulationIntent {
  return rollIntent(level, rng)
}

// --- 计算本回合实际伤害（意图 + 功法 + 奇遇减免） ---

function computeIntentDamage(
  intent: TribulationIntent,
  state: GameState,
  damageReductionPercent: number, // 0..100 来自奇遇等
): { min: number; max: number; expected: number } {
  const dmgMult = getDamageMult(state)
  const rawMin = intent.baseDamageMin
  const rawMax = intent.baseDamageMax
  const mult = dmgMult * (1 - damageReductionPercent / 100)
  const min = Math.max(1, Math.round(rawMin * mult))
  const max = Math.max(1, Math.round(rawMax * mult))
  const expected = Math.round((min + max) / 2)
  return { min, max, expected }
}

// --- 初始化天劫（由 game reducer 在进入 final_trial 时调用，需传入 rng） ---

export function startTribulation(state: GameState, rng: Rng): GameState {
  const level = state.run.tribulationLevel ?? 0
  const currentLevel = level + 1 // 当前要渡的是第几重
  const totalTurns = getTotalTurnsForLevel(currentLevel)
  const threat = Math.round((state.run.danger ?? 0) * 0.4 + 50)
  const wrath = Math.min(100, threat + currentLevel * 5)

  const intent = pickIntent(rng, currentLevel)
  const trib: TribulationState = {
    level: currentLevel,
    totalTurns,
    turn: 0,
    shield: 0,
    debuffs: { mindChaos: 0, burn: 0, weak: 0 },
    wrath,
    currentIntent: intent,
    log: [],
  }

  const logEntry = `【天劫】第 ${currentLevel} 重 · 共 ${totalTurns} 回合。本回合天道意图：${intent.name}。`
  const run = {
    ...state.run,
    tribulation: trib,
    finalTrial: undefined,
  }
  const log = [...(state.log ?? []), logEntry]
  return { ...state, run, screen: 'final_trial', log }
}

// --- View 类型（UI 单一来源） ---

export interface TribulationIntentView {
  id: string
  name: string
  damageMin: number
  damageMax: number
  expectedDamage: number
  addEffectText: string
  /** TICKET-36：下回合将发生预告 */
  telegraphText: string
  /** TICKET-36：1 行应对提示 */
  counterHint: string
}

export interface TribulationActionView {
  id: TribulationActionId
  available: boolean
  hint: string
}

export interface TribulationTurnView {
  turn: number
  totalTurns: number
  hp: number
  maxHp: number
  shield: number
  debuffs: TribulationDebuffs
  wrath: number
  intent: TribulationIntentView
  actions: TribulationActionView[]
  pillOptions: ReturnType<typeof getTribulationPillOptions>
  recentLog: string[]
  /** 逆冲成功率 [0,1]，仅当 id===SURGE 时引擎计算 */
  surgeSuccessRate?: number
}

export function getTribulationTurnView(state: GameState): TribulationTurnView | null {
  const trib = state.run.tribulation
  if (!trib) return null
  const player = state.player
  const damageReduction = state.run.tribulationDmgReductionPercent ?? 0
  const dmg = computeIntentDamage(trib.currentIntent, state, damageReduction)

  const addEffectText = trib.currentIntent.addDebuff
    ? `可能叠加：${trib.currentIntent.addDebuff.key === 'mindChaos' ? '心乱' : trib.currentIntent.addDebuff.key === 'burn' ? '灼烧' : '虚弱'}+${trib.currentIntent.addDebuff.stacks}`
    : ''
  const telegraphText = trib.currentIntent.telegraphText ?? trib.currentIntent.name
  const counterHint = trib.currentIntent.counterHint ?? '稳/护体/丹可应对。'

  const pillOptions = getTribulationPillOptions(state)
  const hasPill = pillOptions.length > 0
  const weak = trib.debuffs.weak > 0
  const surgeRate = computeSurgeSuccessRate(state)
  const actions: TribulationActionView[] = [
    {
      id: 'STEADY',
      available: true,
      hint: `本回合减伤约 25%，清除 1 层心乱/灼烧。预计承伤 ${Math.max(1, Math.round(dmg.expected * 0.75))}～${Math.max(1, Math.round(dmg.max * 0.75))}`,
    },
    {
      id: 'PILL',
      available: hasPill,
      hint: hasPill ? `选择丹药：回血/护盾/净化（${pillOptions.length} 项可选）` : '无可用丹药',
    },
    {
      id: 'GUARD',
      available: true,
      hint: `本回合高减伤 50%，下回合虚弱 +1。预计承伤 ${Math.max(1, Math.round(dmg.expected * 0.5))}～${Math.max(1, Math.round(dmg.max * 0.5))}`,
    },
    {
      id: 'SURGE',
      available: !weak,
      hint: weak ? '虚弱时无法逆冲' : `逆冲天威 成功率 ${Math.round(surgeRate * 100)}%。成功降劫威/提高奖励；失败额外受伤或心乱。`,
    },
  ]

  const recentLog = (trib.log ?? []).slice(-5)

  return {
    turn: trib.turn,
    totalTurns: trib.totalTurns,
    hp: player.hp,
    maxHp: player.maxHp,
    shield: trib.shield,
    debuffs: { ...trib.debuffs },
    wrath: trib.wrath,
    intent: {
      id: trib.currentIntent.id,
      name: trib.currentIntent.name,
      damageMin: dmg.min,
      damageMax: dmg.max,
      expectedDamage: dmg.expected,
      addEffectText,
      telegraphText,
      counterHint,
    },
    actions,
    pillOptions,
    recentLog,
    surgeSuccessRate: surgeRate,
  }
}

function computeSurgeSuccessRate(state: GameState): number {
  const trib = state.run.tribulation
  if (!trib) return 0.4
  const level = trib.level
  const mindChaos = trib.debuffs.mindChaos
  const base = Math.max(0.15, 0.5 - level * 0.03 - mindChaos * 0.08)
  const add = getSurgeRateAdd(state)
  return Math.max(0.1, Math.min(0.9, base + add))
}

// --- 应用单回合伤害（护盾先扣，再扣 HP；支持穿透比例 TICKET-36） ---

function applyDamageToState(
  hp: number,
  rawDamage: number,
  shield: number,
  shieldPenetrationPercent: number = 0,
): { newHp: number; newShield: number; actualHpLoss: number; absorbedByShield: number } {
  const p = Math.max(0, Math.min(100, shieldPenetrationPercent))
  const toShield = Math.round(rawDamage * (1 - p / 100))
  let absorbedByShield = 0
  let s = shield
  if (s > 0 && toShield > 0) {
    absorbedByShield = Math.min(s, toShield)
    s -= absorbedByShield
  }
  const toHp = Math.max(0, rawDamage - absorbedByShield)
  const newHp = Math.max(0, hp - toHp)
  return { newHp, newShield: s, actualHpLoss: toHp, absorbedByShield }
}

// --- 结算本回合并推进到下一回合或结束 ---

export type TribulationOutcome = 'ongoing' | 'win' | 'lose'

export function applyTribulationAction(
  state: GameState,
  actionId: TribulationActionId,
  rng: Rng,
  pill?: { elixirId: ElixirId; quality: ElixirQuality },
): { state: GameState; outcome: TribulationOutcome } {
  const trib = state.run.tribulation
  if (!trib) return { state, outcome: 'ongoing' }

  const damageReduction = state.run.tribulationDmgReductionPercent ?? 0
  const dmgMult = getDamageMult(state)
  const intent = trib.currentIntent
  const roll = rng.next()
  const rawDamage = Math.round(
    intent.baseDamageMin + (intent.baseDamageMax - intent.baseDamageMin) * roll,
  )
  const afterReduction = Math.max(1, Math.round(rawDamage * (1 - damageReduction / 100) * dmgMult))

  let effectiveDamage = afterReduction
  let nextShield = trib.shield
  let nextDebuffs = { ...trib.debuffs }
  let nextWrath = trib.wrath
  let nextPlayer = { ...state.player }
  const logEntries: string[] = []

  // 行动修正
  if (actionId === 'STEADY') {
    effectiveDamage = Math.max(1, Math.round(effectiveDamage * 0.75))
    if (nextDebuffs.mindChaos > 0) nextDebuffs = { ...nextDebuffs, mindChaos: nextDebuffs.mindChaos - 1 }
    else if (nextDebuffs.burn > 0) nextDebuffs = { ...nextDebuffs, burn: nextDebuffs.burn - 1 }
    logEntries.push('稳住心神：减伤 25%，清除 1 层负面。')
  } else if (actionId === 'PILL' && pill) {
    const cfg = TRIBULATION_PILL_EFFECTS[pill.elixirId]
    const val = pillValue(pill.elixirId, pill.quality)
    const blockHeal = intent.blockHeal
    if (cfg?.kind === 'heal' && !blockHeal) {
      nextPlayer = { ...nextPlayer, hp: Math.min(nextPlayer.maxHp, nextPlayer.hp + val) }
      logEntries.push(`吞服丹药：回血 +${val}。`)
    } else if (cfg?.kind === 'heal' && blockHeal) {
      logEntries.push('天罚锁命，本回合回血无效，丹药已消耗。')
    } else if (cfg?.kind === 'shield') {
      nextShield += val
      logEntries.push(`吞服丹药：护盾 +${val}。`)
    } else if (cfg?.kind === 'clear') {
      nextDebuffs = { mindChaos: 0, burn: 0, weak: nextDebuffs.weak }
      logEntries.push('吞服丹药：清除心乱与灼烧。')
    }
    const elixirs = { ...nextPlayer.elixirs } as Record<ElixirId, Record<ElixirQuality, number>>
    const qual = elixirs[pill.elixirId]
    if (qual) {
      const nextQual = { ...qual, [pill.quality]: Math.max(0, (qual[pill.quality] ?? 0) - 1) }
      elixirs[pill.elixirId] = nextQual
      nextPlayer = { ...nextPlayer, elixirs }
    }
  } else if (actionId === 'GUARD') {
    effectiveDamage = Math.max(1, Math.round(effectiveDamage * 0.5))
    nextDebuffs = { ...nextDebuffs, weak: nextDebuffs.weak + 1 }
    logEntries.push('护体硬抗：本回合高减伤，下回合虚弱 +1。')
  } else if (actionId === 'SURGE') {
    const surgeSuccess = rng.next() < computeSurgeSuccessRate(state)
    if (surgeSuccess) {
      nextWrath = Math.max(0, nextWrath - 15)
      logEntries.push('逆冲天威成功！劫威降低。')
    } else {
      effectiveDamage = Math.round(effectiveDamage * 1.4)
      nextDebuffs = { ...nextDebuffs, mindChaos: nextDebuffs.mindChaos + 1 }
      logEntries.push('逆冲天威失败！额外受伤与心乱。')
    }
  }

  const penetration = intent.shieldPenetration ?? 0
  const { newHp, newShield, actualHpLoss, absorbedByShield } = applyDamageToState(
    nextPlayer.hp,
    effectiveDamage,
    nextShield,
    penetration,
  )

  nextPlayer = { ...nextPlayer, hp: newHp }
  nextShield = newShield
  if (absorbedByShield > 0) logEntries.push(`护盾吸收 ${absorbedByShield} 点伤害。`)
  logEntries.push(`本回合承受 ${actualHpLoss} 点伤害。`)

  if (intent.addDebuff) {
    const key = intent.addDebuff.key
    const stacks = intent.addDebuff.stacks
    if (key === 'mindChaos') nextDebuffs = { ...nextDebuffs, mindChaos: nextDebuffs.mindChaos + stacks }
    else if (key === 'burn') nextDebuffs = { ...nextDebuffs, burn: nextDebuffs.burn + stacks }
    else nextDebuffs = { ...nextDebuffs, weak: nextDebuffs.weak + stacks }
  }

  const burnDamage = Math.min(2, nextDebuffs.burn)
  if (burnDamage > 0) {
    nextPlayer = { ...nextPlayer, hp: Math.max(0, nextPlayer.hp - burnDamage) }
    logEntries.push(`灼烧持续伤害 ${burnDamage}。`)
  }

  const newTurn = trib.turn + 1
  const newLog = [...trib.log, `【回合 ${trib.turn + 1}】${logEntries.join(' ')}`].slice(-LOG_MAX)

  if (nextPlayer.hp <= 0) {
    const extraLife = state.run.temp?.tribulationExtraLife ?? 0
    if (extraLife > 0) {
      nextPlayer = { ...nextPlayer, hp: 1 }
      const nextTemp = { ...state.run.temp, tribulationExtraLife: extraLife - 1 }
      const run = { ...state.run, temp: nextTemp, tribulation: trib }
      const logWithSave = [...(state.log ?? []), ...newLog.slice(-2), '【天命丹】逆天改命：额外容错+1，生命保留1点！']
      const nextIntent = pickIntent(rng, trib.level)
      const nextTrib: TribulationState = {
        ...trib,
        turn: newTurn,
        shield: nextShield,
        debuffs: nextDebuffs,
        wrath: nextWrath,
        currentIntent: nextIntent,
        log: [...newLog, '【回合续】天命容错触发，生命保留1，继续渡劫。'].slice(-LOG_MAX),
      }
      return {
        state: { ...state, player: nextPlayer, run: { ...run, tribulation: nextTrib }, log: logWithSave },
        outcome: 'ongoing',
      }
    }
    const run = { ...state.run, tribulation: undefined }
    return {
      state: { ...state, player: nextPlayer, run, log: [...(state.log ?? []), ...newLog.slice(-2)] },
      outcome: 'lose',
    }
  }

  if (newTurn >= trib.totalTurns) {
    const run = { ...state.run, tribulation: undefined }
    return {
      state: { ...state, player: nextPlayer, run, log: [...(state.log ?? []), ...newLog.slice(-2)] },
      outcome: 'win',
    }
  }

  const nextIntent = pickIntent(rng, trib.level)
  const nextTrib: TribulationState = {
    ...trib,
    turn: newTurn,
    shield: nextShield,
    debuffs: nextDebuffs,
    wrath: nextWrath,
    currentIntent: nextIntent,
    log: newLog,
  }
  const run = { ...state.run, tribulation: nextTrib }
  return {
    state: { ...state, player: nextPlayer, run, log: state.log },
    outcome: 'ongoing',
  }
}
