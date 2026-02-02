/**
 * TICKET-33: 经验曲线与阶 cap 挡经验
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from './game'
import { applyExpGain } from './realm/gates'
import {
  expNeededForNextLevel,
  getStageIndex,
  getStageCapByStage,
  isStageCapped,
  canRealmBreakthrough,
} from './progression/stage'

describe('progression_exp_curve', () => {
  it('expNeeded 随 level 单调递增', () => {
    const e1 = expNeededForNextLevel(1)
    const e2 = expNeededForNextLevel(2)
    const e10 = expNeededForNextLevel(10)
    const e15 = expNeededForNextLevel(15)
    expect(e2).toBeGreaterThanOrEqual(e1)
    expect(e10).toBeGreaterThanOrEqual(e2)
    expect(e15).toBeGreaterThanOrEqual(e10)
  })

  it('applyExpGain 能升级', () => {
    const state = createInitialGameState(1)
    const { nextPlayer, capped } = applyExpGain(state, 200)
    expect(capped).toBe(false)
    expect(nextPlayer.level).toBeGreaterThan(1)
    expect(nextPlayer.exp).toBeGreaterThanOrEqual(0)
  })

  it('cap 挡住时 exp 不再增长且返回提示', () => {
    const state = createInitialGameState(1)
    const player = { ...state.player, level: 15, stageIndex: 1, exp: 0 }
    const s = { ...state, player }
    const { nextPlayer, capped, message } = applyExpGain(s, 100)
    expect(capped).toBe(true)
    expect(message).toMatch(/阶突破|上限/)
    expect(nextPlayer.level).toBe(15)
    expect(nextPlayer.exp).toBe(0)
  })

  it('getStageIndex 与 getStageCapByStage 一致', () => {
    expect(getStageIndex(1)).toBe(1)
    expect(getStageIndex(15)).toBe(1)
    expect(getStageIndex(16)).toBe(2)
    expect(getStageIndex(30)).toBe(2)
    expect(getStageIndex(99)).toBe(7)
    expect(getStageCapByStage(1)).toBe(15)
    expect(getStageCapByStage(7)).toBe(99)
  })

  it('isStageCapped 在 level==stageCap 时为 true', () => {
    const state = createInitialGameState(1)
    const s15 = { ...state, player: { ...state.player, level: 15, stageIndex: 1 } }
    expect(isStageCapped(s15)).toBe(true)
    const s14 = { ...state, player: { ...state.player, level: 14, stageIndex: 1 } }
    expect(isStageCapped(s14)).toBe(false)
  })
})

describe('realm_breakthrough_gate', () => {
  it('Lv99 且 stageIndex=7 才允许境界突破', () => {
    const state = createInitialGameState(1)
    const s99_7 = { ...state, player: { ...state.player, level: 99, stageIndex: 7 } }
    expect(canRealmBreakthrough(s99_7)).toBe(true)
    const s98_7 = { ...state, player: { ...state.player, level: 98, stageIndex: 7 } }
    expect(canRealmBreakthrough(s98_7)).toBe(false)
    const s99_6 = { ...state, player: { ...state.player, level: 99, stageIndex: 6 } }
    expect(canRealmBreakthrough(s99_6)).toBe(false)
  })
})
