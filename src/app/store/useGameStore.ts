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

  /** 传承续局：保留传承点/传承升级/功法/成就等，仅重置本局（新种子、新 run、凡人 1 级） */
  const newGame = useCallback(() => {
    const seed = createSeed()
    rngRef.current = createSeededRng(seed)
    setState((prev) => {
      const persistent = {
        unlockedKungfu: prev.player?.relics ?? [],
        kungfaShards: prev.meta?.kungfaShards ?? 0,
      }
      let newState = createInitialGameState(seed, persistent)
      newState = {
        ...newState,
        meta: { ...newState.meta, ...prev.meta },
        achievements: prev.achievements ?? newState.achievements,
      }
      return { ...newState, screen: 'home' }
    })
  }, [])

  /** 清档：重置到初始化状态（传承/成就/存档全部清空） */
  const clearSave = useCallback(() => {
    clearStorage()
    const seed = createSeed()
    rngRef.current = createSeededRng(seed)
    setState({ ...createInitialGameState(seed), screen: 'start' })
  }, [])

  useEffect(() => {
    saveToStorage(state)
  }, [state])

  return { state, dispatch, newGame, clearSave }
}
