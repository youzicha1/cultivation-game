/**
 * TICKET-23: 修炼三模式 + 心境 mind + 顿悟事件
 */

import { describe, it, expect } from 'vitest'
import {
  getCultivateInfo,
  getMindTier,
  cultivateBreath,
  cultivatePulse,
  cultivateInsight,
  getMindDangerIncMult,
  getMindBreakthroughBonus,
  getMindAlchemySuccessBonus,
} from './cultivation'
import { createInitialState } from './state'
import { createInitialGameState } from './game'
import { createSequenceRng } from './rng'
import type { GameState } from './game'

function mockState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialGameState(1), ...overrides }
}

describe('getMindTier / getCultivateInfo', () => {
  it('mind 0-24 为心浮', () => {
    expect(getMindTier(0)).toBe('心浮')
    expect(getMindTier(24)).toBe('心浮')
  })
  it('mind 25-49 为平稳', () => {
    expect(getMindTier(25)).toBe('平稳')
    expect(getMindTier(49)).toBe('平稳')
  })
  it('mind 50-74 为澄明', () => {
    expect(getMindTier(50)).toBe('澄明')
    expect(getMindTier(74)).toBe('澄明')
  })
  it('mind 75-100 为入定', () => {
    expect(getMindTier(75)).toBe('入定')
    expect(getMindTier(100)).toBe('入定')
  })
  it('getCultivateInfo 返回 mind、mindTier、mindEffectsSummary', () => {
    const state = mockState({ player: { ...createInitialState(), mind: 60 } })
    const info = getCultivateInfo(state)
    expect(info.mind).toBe(60)
    expect(info.mindTier).toBe('澄明')
    expect(info.mindEffectsSummary).toContain('探索')
    expect(info.mindEffectsSummary).toContain('突破')
  })
})

describe('cultivateBreath', () => {
  it('hp 增加、mind 上升、clamp 正确', () => {
    const state = mockState({
      player: { ...createInitialState(), mind: 50, hp: 80, maxHp: 100 },
    })
    const rng = createSequenceRng([0.5])
    const result = cultivateBreath(state, rng)
    expect(result.nextPlayer.hp).toBe(80 + 3)
    expect(result.nextPlayer.mind).toBe(50 + 6)
    // TICKET-30: applyExpGain 用 level/exp，12 经验升到 2 级后剩余 exp=1
    const expGain = 10 + Math.floor(50 / 20)
    expect(result.nextPlayer.level).toBe(2)
    expect(result.nextPlayer.exp).toBe(1)
    expect(result.toast?.expGain).toBe(expGain)
    expect(result.toast?.hpGain).toBe(3)
    expect(result.toast?.mindDelta).toBe(6)
  })
  it('mind 接近 100 时 clamp 到 100', () => {
    const state = mockState({
      player: { ...createInitialState(), mind: 98 },
    })
    const rng = createSequenceRng([])
    const result = cultivateBreath(state, rng)
    expect(result.nextPlayer.mind).toBe(100)
  })
  it('受伤时 injuredTurns 减 1', () => {
    const state = mockState({
      player: { ...createInitialState(), injuredTurns: 2 },
    })
    const rng = createSequenceRng([])
    const result = cultivateBreath(state, rng)
    expect(result.nextPlayer.injuredTurns).toBe(1)
  })
  it('danger 减 2', () => {
    const state = mockState({ run: { ...createInitialGameState(1).run, danger: 10 } })
    const rng = createSequenceRng([])
    const result = cultivateBreath(state, rng)
    expect(result.nextRunDelta.danger).toBe(8)
  })
})

describe('cultivatePulse', () => {
  it('使用 sequence rng 不翻车时 hp 不变、spiritStones +3', () => {
    const state = mockState({
      player: { ...createInitialState(), spiritStones: 0, mind: 60 },
    })
    const rng = createSequenceRng([0.5, 0.99])
    const result = cultivatePulse(state, rng)
    expect(result.nextPlayer.hp).toBe(state.player.hp)
    expect(result.nextPlayer.spiritStones).toBe(3)
    expect(result.nextPlayer.mind).toBe(56)
    // TICKET-30: applyExpGain 用 level/exp，16~22 经验升到 2 级后 exp 在 [5,11]
    expect(result.nextPlayer.level).toBe(2)
    expect(result.nextPlayer.exp).toBeGreaterThanOrEqual(5)
    expect(result.nextPlayer.exp).toBeLessThanOrEqual(11)
  })
  it('使用 sequence rng 翻车时 hp-8、injuredTurns+2', () => {
    const state = mockState({
      player: { ...createInitialState(), hp: 50, mind: 50, spiritStones: 0 },
    })
    const rng = createSequenceRng([0.5, 0.1])
    const result = cultivatePulse(state, rng)
    expect(result.nextPlayer.hp).toBe(42)
    expect(result.nextPlayer.injuredTurns).toBe(2)
    expect(result.nextPlayer.spiritStones).toBe(0)
  })
})

describe('cultivateInsight', () => {
  it('使用 sequence rng 强制不触发顿悟时 mind+2、无 insightEvent', () => {
    const state = mockState({ player: { ...createInitialState(), mind: 30 } })
    const triggerProb = Math.max(0.05, Math.min(0.5, 0.18 + (30 - 50) * 0.002))
    const rng = createSequenceRng([triggerProb + 0.1])
    const result = cultivateInsight(state, rng)
    expect(result.insightEvent).toBeUndefined()
    expect(result.nextPlayer.mind).toBe(32)
    expect(result.nextPlayer.exp).toBe(8)
  })
  it('使用 sequence rng 强制触发顿悟时返回事件卡', () => {
    const state = mockState({ player: { ...createInitialState(), mind: 80 } })
    const rng = createSequenceRng([0.1, 0.5, 0.5])
    const result = cultivateInsight(state, rng)
    expect(result.insightEvent).toBeDefined()
    expect(result.insightEvent!.title).toBe('顿悟')
    expect(result.insightEvent!.choiceA.text).toBeTruthy()
    expect(result.insightEvent!.choiceB.text).toBeTruthy()
    expect(result.nextPlayer.exp).toBe(8)
    expect(result.nextPlayer.mind).toBe(82)
  })
})

describe('mind 联动探索/突破', () => {
  it('getMindDangerIncMult: mind=80 危险增长更慢', () => {
    const mult80 = getMindDangerIncMult(80)
    const mult20 = getMindDangerIncMult(20)
    expect(mult80).toBeLessThan(1)
    expect(mult20).toBeGreaterThan(1)
    expect(mult80).toBeGreaterThanOrEqual(0.85)
    expect(mult20).toBeLessThanOrEqual(1.15)
  })
  it('getMindBreakthroughBonus: mind=80 突破加成正、mind=20 负', () => {
    const bonus80 = getMindBreakthroughBonus(80)
    const bonus20 = getMindBreakthroughBonus(20)
    expect(bonus80).toBeGreaterThan(0)
    expect(bonus20).toBeLessThan(0)
    expect(bonus80).toBeCloseTo((80 - 50) * 0.0012)
  })
  it('getMindAlchemySuccessBonus: mind>=70 有加成', () => {
    expect(getMindAlchemySuccessBonus(70)).toBe(0.02)
    expect(getMindAlchemySuccessBonus(69)).toBe(0)
  })
})

describe('mind 联动探索 danger 增长、突破 successRate（集成）', () => {
  it('固定 mind=80 vs mind=20 时 getMindDangerIncMult 不同', () => {
    const m80 = getMindDangerIncMult(80)
    const m20 = getMindDangerIncMult(20)
    expect(m80).toBeLessThan(m20)
  })
  it('固定 mind=80 vs mind=20 时 getMindBreakthroughBonus 不同', () => {
    const b80 = getMindBreakthroughBonus(80)
    const b20 = getMindBreakthroughBonus(20)
    expect(b80).toBeGreaterThan(b20)
  })
})
