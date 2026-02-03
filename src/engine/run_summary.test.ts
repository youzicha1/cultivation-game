/**
 * TICKET-40: 本局总结 — 结局写入
 */

import { createInitialGameState, type GameState } from './game'
import { buildRunSummary } from './run_summary'

describe('run_summary (TICKET-40)', () => {
  it('buildRunSummary victory: tribulationsCleared 12, legacyPointsEarned set', () => {
    const state: GameState = {
      ...createInitialGameState(1),
      run: {
        ...createInitialGameState(1).run,
        turn: 100,
        tribulationsCleared: 12,
        tribulationLevel: 12,
      },
      player: {
        ...createInitialGameState(1).player,
        realm: '元婴',
        stageIndex: 5,
        spiritStones: 500,
      },
    }
    const summary = buildRunSummary(state, 'victory', {
      cause: '金光破云',
      endingId: 'ascend',
      legacyPointsEarned: 49,
    })
    expect(summary.ending).toBe('victory')
    expect(summary.tribulationsCleared).toBe(12)
    expect(summary.turns).toBe(100)
    expect(summary.cause).toBe('金光破云')
    expect(summary.endingId).toBe('ascend')
    expect(summary.maxRealm).toBe('元婴')
    expect(summary.maxStageIndex).toBe(5)
    expect(summary.maxSpiritStones).toBe(500)
    expect(summary.legacyPointsEarned).toBe(49)
  })

  it('buildRunSummary death: failedAtTribulationIdx set', () => {
    const state: GameState = {
      ...createInitialGameState(1),
      run: {
        ...createInitialGameState(1).run,
        turn: 50,
        tribulationsCleared: 4,
        tribulationLevel: 4,
      },
    }
    const summary = buildRunSummary(state, 'death', {
      failedAtTribulationIdx: 5,
      cause: '身死道消',
      endingId: 'dead',
      legacyPointsEarned: 8,
    })
    expect(summary.ending).toBe('death')
    expect(summary.tribulationsCleared).toBe(4)
    expect(summary.failedAtTribulationIdx).toBe(5)
    expect(summary.legacyPointsEarned).toBe(8)
  })

  it('buildRunSummary uses player.realm and run.stats for tianPillCount', () => {
    const state: GameState = {
      ...createInitialGameState(1),
      run: {
        ...createInitialGameState(1).run,
        stats: { run_tian_pill_count: 3 },
      },
    }
    const summary = buildRunSummary(state, 'death', { legacyPointsEarned: 2 })
    expect(summary.maxRealm).toBe('凡人')
    expect(summary.tianPillCount).toBe(3)
  })
})
