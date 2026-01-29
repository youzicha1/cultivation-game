import exploreEventsFile from '../content/explore_events.v1.json'
import type { GameState } from './game'
import { RARITY_BASE_WEIGHT } from './constants'
import { EXPLORE_MULTIPLIER_FACTOR } from './constants'
import { type Rng } from './rng'
import { getRecipe, type RecipeId } from './alchemy'

export type ExploreEventsFile = {
  version: number
  events: ExploreEvent[]
}

export type ExploreRarity = 'common' | 'rare' | 'legendary'

export type ExploreEvent = {
  id: string
  title: string
  text: string
  /** 旧版：直接权重；新版：由 rarity 推导基础权重 */
  weight?: number
  minDanger: number
  maxDanger: number
  /** 稀有度：common=100, rare=22, legendary=3，再按 danger 加成 */
  rarity?: ExploreRarity
  /** 如含 "risk" 或 "combat" 且 danger>=50 时权重 *1.2 */
  tags?: string[]
  choices: { A: ChoiceDef; B: ChoiceDef }
}

export type ChoiceDef = {
  text: string
  successRateBase: number
  successRateDangerFactor: number
  onSuccess: Outcome
  onFail: Outcome
}

export type Outcome = {
  log: string
  effects: EffectDef[]
}

export type EffectDef =
  | {
      type: 'exp' | 'hp' | 'pills' | 'danger' | 'pendingReward' | 'spiritStones'
      op: 'add'
      min: number
      max: number
    }
  | {
      type: 'material' | 'fragment'
      op: 'add'
      id: string
      min: number
      max: number
    }

export function validateExploreEventsFile(
  file: ExploreEventsFile,
): ExploreEvent[] {
  if (!file || typeof file !== 'object') {
    throw new Error('ExploreEventsFile: invalid file')
  }
  if (file.version !== 1) {
    throw new Error(`ExploreEventsFile: unsupported version ${file.version}`)
  }
  if (!Array.isArray(file.events) || file.events.length === 0) {
    throw new Error('ExploreEventsFile: events must be non-empty')
  }
  file.events.forEach((event) => {
    if (!event.id || !event.title || !event.text) {
      throw new Error(`ExploreEvent: missing fields for ${event.id ?? 'unknown'}`)
    }
    if (!event.choices?.A || !event.choices?.B) {
      throw new Error(`ExploreEvent: missing choices for ${event.id}`)
    }
  })
  return file.events
}

export const exploreEvents = validateExploreEventsFile(
  exploreEventsFile as ExploreEventsFile,
)

/** 计算单事件权重：rarity 基础 + danger 加成 + tag 加成 */
function getEventWeight(event: ExploreEvent, danger: number): number {
  let w: number
  if (event.rarity && RARITY_BASE_WEIGHT[event.rarity] !== undefined) {
    w = RARITY_BASE_WEIGHT[event.rarity]
    if (danger >= 75) {
      if (event.rarity === 'rare') w *= 1.8
      else if (event.rarity === 'legendary') w *= 1.5
    } else if (danger >= 50) {
      if (event.rarity === 'rare') w *= 1.4
      else if (event.rarity === 'legendary') w *= 1.2
    }
  } else {
    w = event.weight ?? 100
  }
  if (danger >= 50 && event.tags?.some((t) => t === 'risk' || t === 'combat')) {
    w *= 1.2
  }
  return Math.max(0.1, w)
}

export function pickExploreEvent(rng: Rng, danger: number): ExploreEvent {
  const candidates = exploreEvents.filter(
    (event) => danger >= event.minDanger && danger <= event.maxDanger,
  )
  const pool = candidates.length > 0 ? candidates : exploreEvents
  const weights = pool.map((e) => getEventWeight(e, danger))
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  const roll = rng.next() * totalWeight
  let cursor = 0
  for (let i = 0; i < pool.length; i++) {
    cursor += weights[i]
    if (roll <= cursor) {
      return pool[i]
    }
  }
  return pool[pool.length - 1]
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

/** 探索收益倍率 = 1 + (danger/100)*EXPLORE_MULTIPLIER_FACTOR，仅对正收益生效 */
export function getExploreMultiplier(danger: number): number {
  return 1 + (danger / 100) * EXPLORE_MULTIPLIER_FACTOR
}

function applyOutcomeEffects(
  state: GameState,
  outcome: Outcome,
  rand: (min: number, max: number) => number,
  danger: number,
): GameState {
  const mult = getExploreMultiplier(danger)
  let nextPlayer = { ...state.player }
  let nextRun = { ...state.run }
  outcome.effects.forEach((effect) => {
    if (effect.type === 'material') {
      let value = rand(effect.min, effect.max)
      if (value > 0) value = Math.round(value * mult)
      const current = nextPlayer.materials[effect.id as keyof typeof nextPlayer.materials] ?? 0
      nextPlayer.materials = {
        ...nextPlayer.materials,
        [effect.id]: current + value,
      }
    } else if (effect.type === 'fragment') {
      let value = rand(effect.min, effect.max)
      if (value > 0) value = Math.round(value * mult)
      const current = nextPlayer.fragments[effect.id as keyof typeof nextPlayer.fragments] ?? 0
      const newTotal = current + value
      nextPlayer.fragments = {
        ...nextPlayer.fragments,
        [effect.id]: newTotal,
      }
      const recipe = getRecipe(effect.id)
      if (recipe && recipe.unlock.type === 'fragment') {
        if (newTotal >= recipe.unlock.need && !nextPlayer.recipesUnlocked[effect.id as keyof typeof nextPlayer.recipesUnlocked]) {
          nextPlayer.recipesUnlocked = {
            ...nextPlayer.recipesUnlocked,
            [effect.id]: true,
          }
        }
      }
    } else if (effect.type === 'spiritStones') {
      let value = rand((effect as { min: number; max: number }).min, (effect as { min: number; max: number }).max)
      if (value > 0) value = Math.round(value * mult)
      nextPlayer.spiritStones = nextPlayer.spiritStones + value
    } else {
      let value = rand(effect.min, effect.max)
      if (value > 0 && (effect.type === 'exp' || effect.type === 'hp' || effect.type === 'pills')) {
        value = Math.round(value * mult)
      }
      if (effect.type === 'exp') {
        nextPlayer.exp += value
      } else if (effect.type === 'hp') {
        nextPlayer.hp += value
      } else if (effect.type === 'pills') {
        nextPlayer.pills += value
      } else if (effect.type === 'danger') {
        nextRun.danger += value
      } else if (effect.type === 'pendingReward') {
        nextRun.pendingReward += value
      }
    }
  })
  return { ...state, player: nextPlayer, run: nextRun }
}

export function resolveExploreChoice(
  state: GameState,
  event: ExploreEvent,
  choiceKey: 'A' | 'B',
  rng01: () => number,
  rand: (min: number, max: number) => number,
): GameState {
  const danger = state.run.danger
  const mult = getExploreMultiplier(danger)
  const rarity = event.rarity ?? 'common'
  const choice = event.choices[choiceKey]
  const rate = clamp(
    choice.successRateBase + danger * choice.successRateDangerFactor,
    0.05,
    0.95,
  )
  const success = rng01() < rate
  const outcome = success ? choice.onSuccess : choice.onFail
  let nextState = applyOutcomeEffects(state, outcome, rand, danger)
  const rarityLabel = rarity === 'common' ? '' : rarity === 'rare' ? '【稀有】' : '【传说】'
  if (danger >= 30) {
    const multMsg = danger >= 70 
      ? `🔥【高倍率】危险值${danger} → 探索收益×${mult.toFixed(1)}（极高收益！）`
      : danger >= 50
      ? `⚡【倍率】危险值${danger} → 探索收益×${mult.toFixed(1)}（高收益）`
      : `【倍率】危险值${danger} → 探索收益×${mult.toFixed(1)}`
    nextState = addLog(nextState, `${rarityLabel}${multMsg}`)
  }
  nextState = addLog(nextState, outcome.log)

  const beforeUnlocked = state.player.recipesUnlocked
  const afterUnlocked = nextState.player.recipesUnlocked
  for (const recipeId of Object.keys(afterUnlocked) as RecipeId[]) {
    if (afterUnlocked[recipeId] && !beforeUnlocked[recipeId]) {
      nextState = addLog(nextState, `你参悟残页，丹方已成！`)
    }
  }

  nextState = {
    ...nextState,
    run: { ...nextState.run, currentEvent: undefined },
  }
  if (nextState.player.hp <= 0) {
    nextState = {
      ...nextState,
      screen: 'death',
      summary: {
        cause: outcome.log || '探索失手',
        turns: nextState.run.turn,
        endingId: 'death',
      },
      meta: {
        ...nextState.meta,
        legacyPoints: (nextState.meta?.legacyPoints ?? 0) + 1,
      },
    }
  }
  return nextState
}
