import exploreEventsFile from '../content/explore_events.v1.json'
import type { GameState } from './game'
import { type Rng } from './rng'

export type ExploreEventsFile = {
  version: number
  events: ExploreEvent[]
}

export type ExploreEvent = {
  id: string
  title: string
  text: string
  weight: number
  minDanger: number
  maxDanger: number
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

export type EffectDef = {
  type: 'exp' | 'hp' | 'pills' | 'danger' | 'pendingReward'
  op: 'add'
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

export function pickExploreEvent(rng: Rng, danger: number): ExploreEvent {
  const candidates = exploreEvents.filter(
    (event) => danger >= event.minDanger && danger <= event.maxDanger,
  )
  if (candidates.length === 0) {
    throw new Error('ExploreEvents: no candidates for danger range')
  }
  const totalWeight = candidates.reduce((sum, event) => sum + event.weight, 0)
  const roll = rng.next() * totalWeight
  let cursor = 0
  for (const event of candidates) {
    cursor += event.weight
    if (roll <= cursor) {
      return event
    }
  }
  return candidates[candidates.length - 1]
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

function applyOutcomeEffects(
  state: GameState,
  outcome: Outcome,
  rand: (min: number, max: number) => number,
): GameState {
  let nextPlayer = { ...state.player }
  let nextRun = { ...state.run }
  outcome.effects.forEach((effect) => {
    const value = rand(effect.min, effect.max)
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
  const choice = event.choices[choiceKey]
  const rate = clamp(
    choice.successRateBase + state.run.danger * choice.successRateDangerFactor,
    0.05,
    0.95,
  )
  const success = rng01() < rate
  const outcome = success ? choice.onSuccess : choice.onFail
  let nextState = applyOutcomeEffects(state, outcome, rand)
  nextState = addLog(nextState, outcome.log)
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
      },
    }
  }
  return nextState
}
