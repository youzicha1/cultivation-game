import { describe, expect, it } from 'vitest'
import {
  TIME_MAX,
  TIME_WARNING_THRESHOLD,
  getActionTimeCost,
  applyTimeCost,
  shouldTriggerTribulationFinale,
  getDayPhase,
} from './time'
import { createInitialGameState } from './game'

describe('time', () => {
  it('TIME_MAX 与 TIME_WARNING_THRESHOLD 为预期值', () => {
    expect(TIME_MAX).toBe(24)
    expect(TIME_WARNING_THRESHOLD).toBe(4)
  })

  it('getActionTimeCost: 关键动作消耗 1，其余 0', () => {
    const state = createInitialGameState(1)
    expect(getActionTimeCost('CULTIVATE_TICK', state)).toBe(1)
    expect(getActionTimeCost('EXPLORE_DEEPEN', state)).toBe(1)
    expect(getActionTimeCost('EXPLORE_CHOOSE', state)).toBe(1)
    expect(getActionTimeCost('ALCHEMY_BREW_CONFIRM', state)).toBe(1)
    expect(getActionTimeCost('BREAKTHROUGH_CONFIRM', state)).toBe(1)
    expect(getActionTimeCost('GO', state)).toBe(0)
    expect(getActionTimeCost('RELIC_EQUIP', state)).toBe(0)
    expect(getActionTimeCost('DAILY_CLAIM', state)).toBe(0)
  })

  it('applyTimeCost: 扣减时辰，不小于 0', () => {
    const state = createInitialGameState(1)
    const next = applyTimeCost(state, 1)
    expect(next.run.timeLeft).toBe(TIME_MAX - 1)
    expect(next.run.timeMax).toBe(TIME_MAX)
    const next2 = applyTimeCost(next, 100)
    expect(next2.run.timeLeft).toBe(0)
  })

  it('applyTimeCost: cost<=0 不改变 state', () => {
    const state = createInitialGameState(1)
    const next = applyTimeCost(state, 0)
    expect(next.run.timeLeft).toBe(TIME_MAX)
    expect(next).toBe(state)
  })

  it('shouldTriggerTribulationFinale: timeLeft>0 不触发', () => {
    const state = createInitialGameState(1)
    expect(shouldTriggerTribulationFinale(state)).toBe(false)
  })

  it('shouldTriggerTribulationFinale: timeLeft=0 且非 death/ending/summary 触发', () => {
    const state = createInitialGameState(1)
    const exhausted = { ...state, run: { ...state.run, timeLeft: 0, timeMax: TIME_MAX } }
    expect(shouldTriggerTribulationFinale(exhausted)).toBe(true)
  })

  it('shouldTriggerTribulationFinale: 已 death 不触发', () => {
    const state = createInitialGameState(1)
    const dead = { ...state, screen: 'death' as const, run: { ...state.run, timeLeft: 0 } }
    expect(shouldTriggerTribulationFinale(dead)).toBe(false)
  })

  it('getDayPhase: 按比例返回晨/昼/暮/劫', () => {
    expect(getDayPhase(24, 24)).toBe('晨')
    expect(getDayPhase(18, 24)).toBe('晨')
    expect(getDayPhase(12, 24)).toBe('昼')
    expect(getDayPhase(8, 24)).toBe('暮')
    expect(getDayPhase(4, 24)).toBe('劫')
    expect(getDayPhase(2, 24)).toBe('劫')
  })
})
