import { createSeededRng, type Rng } from './rng'
import type { GameState } from './game'

const SAVE_KEY = 'cultivation_save_v1'
const SAVE_VERSION = 1

export type SaveFile = {
  version: number
  savedAt: number
  state: GameState
}

export function saveToStorage(state: GameState): void {
  const payload: SaveFile = {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    state,
  }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
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

export function loadFromStorage(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as SaveFile
    if (!parsed || parsed.version !== SAVE_VERSION) {
      return null
    }
    if (!isValidState(parsed.state)) {
      return null
    }
    return parsed.state
  } catch {
    return null
  }
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
