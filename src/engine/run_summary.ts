/**
 * TICKET-40: 本局总结（结局时写入，用于 VictoryScreen / 失败页展示）
 */

import type { GameState } from './game'

export type RunSummary = {
  ending: 'victory' | 'death' | 'abandon'
  tribulationsCleared: number
  failedAtTribulationIdx?: number
  turns: number
  cause?: string
  endingId?: string
  maxRealm: string
  maxStageIndex?: number
  tianPillCount?: number
  maxDanger?: number
  maxSpiritStones?: number
  awakenSkills?: string[]
  legacyPointsEarned: number
}

export function buildRunSummary(
  state: GameState,
  ending: RunSummary['ending'],
  opts: {
    failedAtTribulationIdx?: number
    cause?: string
    endingId?: string
    legacyPointsEarned: number
  },
): RunSummary {
  const cleared = state.run.tribulationsCleared ?? state.run.tribulationLevel ?? 0
  const player = state.player
  const tianCount = state.run.stats?.run_tian_pill_count ?? 0

  return {
    ending,
    tribulationsCleared: ending === 'victory' ? 12 : cleared,
    failedAtTribulationIdx: opts.failedAtTribulationIdx,
    turns: state.run.turn,
    cause: opts.cause,
    endingId: opts.endingId,
    maxRealm: player.realm ?? '凡人',
    maxStageIndex: player.stageIndex ?? 1,
    tianPillCount: tianCount > 0 ? tianCount : undefined,
    maxDanger: state.run.danger ?? 0,
    maxSpiritStones: player.spiritStones ?? 0,
    awakenSkills: player.awakenSkills?.slice(0, 3),
    legacyPointsEarned: opts.legacyPointsEarned,
  }
}
