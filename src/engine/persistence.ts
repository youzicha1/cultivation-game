import { createSeededRng, type Rng } from './rng'
import type { GameState } from './game'
import { createInitialState } from './state'
import { TIME_MAX } from './time'

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

function normalizeLoadedState(state: GameState): GameState {
  const defaultPlayer = createInitialState()

  const loadedPlayer: any = state.player ?? {}
  const loadedMaterials: any = loadedPlayer.materials ?? {}
  const loadedElixirs: any = loadedPlayer.elixirs ?? {}
  const loadedCodex: any = loadedPlayer.codex ?? {}
  const loadedBest: any = loadedCodex.bestQualityByRecipe ?? {}
  const loadedRecipesUnlocked: any = loadedPlayer.recipesUnlocked ?? {}
  const loadedFragments: any = loadedPlayer.fragments ?? {}

  const player = {
    ...defaultPlayer,
    ...loadedPlayer,
    materials: {
      ...defaultPlayer.materials,
      ...loadedMaterials,
    },
    elixirs: {
      ...defaultPlayer.elixirs,
      ...loadedElixirs,
      qi_pill: { ...defaultPlayer.elixirs.qi_pill, ...(loadedElixirs.qi_pill ?? {}) },
      spirit_pill: {
        ...defaultPlayer.elixirs.spirit_pill,
        ...(loadedElixirs.spirit_pill ?? {}),
      },
      foundation_pill: {
        ...defaultPlayer.elixirs.foundation_pill,
        ...(loadedElixirs.foundation_pill ?? {}),
      },
    },
    recipesUnlocked: {
      ...defaultPlayer.recipesUnlocked,
      ...loadedRecipesUnlocked,
    },
    fragments: {
      ...defaultPlayer.fragments,
      ...loadedFragments,
    },
    codex: {
      ...defaultPlayer.codex,
      ...loadedCodex,
      bestQualityByRecipe: {
        ...defaultPlayer.codex.bestQualityByRecipe,
        ...loadedBest,
      },
    },
    achievements: Array.isArray(loadedPlayer.achievements) ? loadedPlayer.achievements : defaultPlayer.achievements,
    relics: Array.isArray(loadedPlayer.relics) ? loadedPlayer.relics : defaultPlayer.relics,
    equippedRelics: Array.isArray(loadedPlayer.equippedRelics) && loadedPlayer.equippedRelics.length === 3
      ? loadedPlayer.equippedRelics
      : defaultPlayer.equippedRelics,
  }

  const loadedChain = (state.run as { chain?: { activeChainId?: string; chapter?: number; completed?: Record<string, boolean> } }).chain
  const chain =
    loadedChain && typeof loadedChain === 'object'
      ? {
          ...(loadedChain.activeChainId != null ? { activeChainId: loadedChain.activeChainId } : {}),
          ...(typeof loadedChain.chapter === 'number' ? { chapter: loadedChain.chapter } : {}),
          completed: loadedChain.completed && typeof loadedChain.completed === 'object' ? loadedChain.completed : {},
        }
      : { completed: {} as Record<string, boolean> }

  const runState = state.run as {
    timeLeft?: number
    timeMax?: number
    cultivateCount?: number
    finalTrial?: { step: 1 | 2 | 3; threat: number; resolve: number; wounds?: number; choices: string[]; rewardSeed?: number }
  }
  const loadedFinalTrial = runState.finalTrial
  const finalTrial =
    loadedFinalTrial &&
    typeof loadedFinalTrial.step === 'number' &&
    loadedFinalTrial.step >= 1 &&
    loadedFinalTrial.step <= 3 &&
    typeof loadedFinalTrial.threat === 'number' &&
    typeof loadedFinalTrial.resolve === 'number' &&
    Array.isArray(loadedFinalTrial.choices)
      ? {
          step: loadedFinalTrial.step as 1 | 2 | 3,
          threat: loadedFinalTrial.threat,
          resolve: loadedFinalTrial.resolve,
          wounds: typeof loadedFinalTrial.wounds === 'number' ? loadedFinalTrial.wounds : undefined,
          choices: loadedFinalTrial.choices,
          rewardSeed: typeof loadedFinalTrial.rewardSeed === 'number' ? loadedFinalTrial.rewardSeed : undefined,
        }
      : undefined

  const run = {
    ...state.run,
    depth: typeof state.run.depth === 'number' ? state.run.depth : 0,
    risk: typeof state.run.risk === 'number' ? state.run.risk : 0,
    streak: typeof state.run.streak === 'number' ? state.run.streak : 0,
    chainProgress: state.run.chainProgress && typeof state.run.chainProgress === 'object' ? state.run.chainProgress : {},
    chain,
    cultivateCount: typeof runState.cultivateCount === 'number' ? runState.cultivateCount : 0,
    timeLeft: typeof runState.timeLeft === 'number' ? Math.max(0, runState.timeLeft) : TIME_MAX,
    timeMax: typeof runState.timeMax === 'number' ? runState.timeMax : TIME_MAX,
    ...(finalTrial ? { finalTrial } : {}),
  }

  const loadedMeta: any = state.meta ?? {}
  const meta: GameState['meta'] = {
    ...(loadedMeta.daily != null ? { daily: loadedMeta.daily } : {}),
    legacyPoints: typeof loadedMeta.legacyPoints === 'number' ? loadedMeta.legacyPoints : 0,
    legacySpent: typeof loadedMeta.legacySpent === 'number' ? loadedMeta.legacySpent : 0,
    legacyUpgrades: loadedMeta.legacyUpgrades && typeof loadedMeta.legacyUpgrades === 'object' ? loadedMeta.legacyUpgrades : {},
    pityAlchemyTop: typeof loadedMeta.pityAlchemyTop === 'number' ? loadedMeta.pityAlchemyTop : 0,
    pityLegendLoot: typeof loadedMeta.pityLegendLoot === 'number' ? loadedMeta.pityLegendLoot : 0,
    pityLegendKungfa: typeof loadedMeta.pityLegendKungfa === 'number' ? loadedMeta.pityLegendKungfa : 0,
    kungfaShards: typeof loadedMeta.kungfaShards === 'number' ? loadedMeta.kungfaShards : 0,
    ...(loadedMeta.tribulationFinaleTriggered === true ? { tribulationFinaleTriggered: true } : {}),
    ...(loadedMeta.demonPathUnlocked === true ? { demonPathUnlocked: true } : {}),
  }

  return {
    ...state,
    player,
    run,
    meta,
    log: Array.isArray(state.log) ? state.log : [],
  }
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
    return normalizeLoadedState(parsed.state)
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
