import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearStorage,
  createInitialGameState,
  createRngFromState,
  createSeededRng,
  loadFromStorage,
  reduceGame,
  saveToStorage,
  type GameAction,
  type GameState,
  type Rng,
} from '../../engine'

function createSeed(): number {
  return Date.now() | 0
}

function createInitial(): { state: GameState; rng: Rng } {
  const loaded = loadFromStorage()
  if (loaded) {
    return { state: loaded, rng: createRngFromState(loaded) }
  }
  const seed = createSeed()
  return {
    state: createInitialGameState(seed),
    rng: createSeededRng(seed),
  }
}

export function useGameStore() {
  const initialRef = useRef(createInitial())
  const [state, setState] = useState<GameState>(initialRef.current.state)
  const rngRef = useRef<Rng>(initialRef.current.rng)

  const dispatch = useCallback((action: GameAction) => {
    setState((prev) => reduceGame(prev, action, rngRef.current))
  }, [])

  const newGame = useCallback(() => {
    const seed = createSeed()
    rngRef.current = createSeededRng(seed)
    clearStorage()
    setState(createInitialGameState(seed))
  }, [])

  const clearSave = useCallback(() => {
    clearStorage()
  }, [])

  useEffect(() => {
    saveToStorage(state)
  }, [state])

  return { state, dispatch, newGame, clearSave }
}
