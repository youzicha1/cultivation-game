/**
 * TICKET-BUILD-RECOVERY: 测试用工厂，保证 PlayerState/GameState 类型正确（relics: RelicId[]，equippedRelics 为 3 元组）
 */
import type { GameState } from '../game'
import { createInitialGameState } from '../game'
import type { PlayerState } from '../state'
import { createInitialState } from '../state'
import type { RelicId } from '../relics'

const EMPTY_RELIC_TUPLE: [RelicId | null, RelicId | null, RelicId | null] = [null, null, null]

export function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  const base = createInitialState()
  return {
    ...base,
    relics: (overrides.relics ?? base.relics) as RelicId[],
    equippedRelics: Array.isArray(overrides.equippedRelics) && overrides.equippedRelics.length === 3
      ? [overrides.equippedRelics[0] ?? null, overrides.equippedRelics[1] ?? null, overrides.equippedRelics[2] ?? null] as [RelicId | null, RelicId | null, RelicId | null]
      : (overrides.equippedRelics as [RelicId | null, RelicId | null, RelicId | null]) ?? EMPTY_RELIC_TUPLE,
    ...overrides,
  } as PlayerState
}

export function makeState(overrides: Partial<GameState> = {}, seed: number = 1): GameState {
  const base = createInitialGameState(seed)
  const playerOverrides = overrides.player
  const player =
    playerOverrides != null && typeof playerOverrides === 'object'
      ? makePlayer(playerOverrides as Partial<PlayerState>)
      : base.player
  return { ...base, ...overrides, player } as GameState
}
