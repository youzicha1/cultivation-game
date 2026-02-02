/**
 * TICKET-33: 阶突破 — Lv15 stageIndex=1 成功后 stageIndex=2、level=16、奖励落地
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './game'
import { attemptStageBreakthrough } from './breakthrough/breakthrough'
import { createSequenceRng } from './rng'

describe('stage_breakthrough', () => {
  it('Lv15 stageIndex=1 时 attemptStageBreakthrough 成功后 stageIndex=2、level=16', () => {
    const state = createInitialGameState(1)
    const s: typeof state = {
      ...state,
      player: { ...state.player, level: 15, stageIndex: 1, exp: 0 },
    }
    const rng = createSequenceRng([0.0])
    const result = attemptStageBreakthrough(s, rng)
    expect(result.success).toBe(true)
    expect(result.nextPlayer.stageIndex).toBe(2)
    expect(result.nextPlayer.level).toBe(16)
    expect(result.nextPlayer.exp).toBe(0)
  })

  it('阶突破奖励包落地：maxHp+10、回气丹×1', () => {
    const state = createInitialGameState(1)
    const beforeHp = state.player.maxHp
    const s: typeof state = {
      ...state,
      player: { ...state.player, level: 15, stageIndex: 1 },
    }
    const rng = createSequenceRng([0.0])
    const result = attemptStageBreakthrough(s, rng)
    expect(result.success).toBe(true)
    expect(result.nextPlayer.maxHp).toBe(beforeHp + 10)
    expect(result.nextPlayer.elixirs.qi_pill?.fan ?? 0).toBeGreaterThanOrEqual(1)
  })

  it('未达阶上限时 attemptStageBreakthrough 返回 success=false', () => {
    const state = createInitialGameState(1)
    const s: typeof state = {
      ...state,
      player: { ...state.player, level: 10, stageIndex: 1 },
    }
    const rng = createSequenceRng([0.0])
    const result = attemptStageBreakthrough(s, rng)
    expect(result.success).toBe(false)
    expect(result.nextPlayer.level).toBe(10)
  })
})
