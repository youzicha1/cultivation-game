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

  /** 传承续局：保留传承点/传承升级/功法/成就等，仅重置本局（新种子、新 run、凡人 1 级）；天劫从第 1 劫重新开始 */
  const newGame = useCallback(() => {
    const seed = createSeed()
    rngRef.current = createSeededRng(seed)
    setState((prev) => {
      const persistent = {
        unlockedKungfu: prev.player?.relics ?? [],
        kungfaShards: prev.meta?.kungfaShards ?? 0,
      }
      let newState = createInitialGameState(seed, persistent)
      const prevRunCount = typeof prev.meta?.runCount === 'number' && prev.meta.runCount >= 1 ? prev.meta.runCount : 1
      newState = {
        ...newState,
        meta: {
          ...newState.meta,
          ...prev.meta,
          tribulationFinaleTriggered: undefined,
          daily: undefined,
          runCount: prevRunCount + 1,
        },
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
    const fresh = createInitialGameState(seed)
    setState({
      ...fresh,
      meta: { ...fresh.meta, runCount: 1 },
      screen: 'start',
    })
  }, [])

  useEffect(() => {
    saveToStorage(state)
  }, [state])

  return { state, dispatch, newGame, clearSave }
}
