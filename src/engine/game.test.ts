import { describe, expect, it } from 'vitest'
import { createSequenceRng } from './rng'
import {
  calcBreakthroughRate,
  createInitialGameState,
  reduceGame,
  type GameState,
} from './game'

describe('game reducer', () => {
  it('修炼会增加经验且正常结束', () => {
    const rng = createSequenceRng([0.0, 0.9])
    const state = createInitialGameState(1)
    const next = reduceGame(state, { type: 'CULTIVATE_TICK' }, rng)

    expect(next.player.exp).toBe(state.player.exp + 1)
    expect(next.player.hp).toBe(state.player.hp)
    expect(next.run.turn).toBe(state.run.turn + 1)
  })

  it('走火入魔可致死并进入 death', () => {
    const rng = createSequenceRng([0.0, 0.05, 0.999])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      player: { ...base.player, hp: 1 },
    }
    const next = reduceGame(state, { type: 'CULTIVATE_TICK' }, rng)

    expect(next.screen).toBe('death')
    expect(next.summary?.cause).toBe('走火入魔')
  })

  it('探索 push 未触发事件时增加 danger 与 pendingReward', () => {
    const rng = createSequenceRng([0.9, 0.0])
    const state = createInitialGameState(1)
    const next = reduceGame(state, { type: 'EXPLORE_PUSH' }, rng)

    expect(next.run.danger).toBe(1)
    expect(next.run.pendingReward).toBe(2)
  })

  it('探索撤退成功结算奖励并清空 pendingReward', () => {
    const rng = createSequenceRng([0.5])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'explore',
      run: { ...base.run, danger: 2, pendingReward: 10 },
    }
    const next = reduceGame(state, { type: 'EXPLORE_RETREAT' }, rng)

    expect(next.screen).toBe('home')
    expect(next.player.exp).toBe(base.player.exp + 10)
    expect(next.run.pendingReward).toBe(0)
    expect(next.run.danger).toBe(0)
  })

  it('calcBreakthroughRate pills/inheritance/pity 会提高成功率', () => {
    const base = createInitialGameState(1)
    const rate0 = calcBreakthroughRate(base, 0, 0)
    const rate1 = calcBreakthroughRate(base, 1, 0)
    const rate2 = calcBreakthroughRate(base, 0, 1)
    const stateWithPity: GameState = {
      ...base,
      player: { ...base.player, pity: 3 },
    }
    const rate3 = calcBreakthroughRate(stateWithPity, 0, 0)

    expect(rate1).toBeGreaterThan(rate0)
    expect(rate2).toBeGreaterThan(rate0)
    expect(rate3).toBeGreaterThan(rate0)
    expect(rate0).toBeGreaterThanOrEqual(0.05)
    expect(rate0).toBeLessThanOrEqual(0.95)
  })

  it('BREAKTHROUGH_SET_PLAN 不会超过资源上限', () => {
    const rng = createSequenceRng([])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      player: { ...base.player, pills: 2, inheritancePoints: 1 },
    }
    const next = reduceGame(
      state,
      { type: 'BREAKTHROUGH_SET_PLAN', pillsUsed: 5, inheritanceSpent: 5 },
      rng,
    )

    expect(next.run.breakthroughPlan?.pillsUsed).toBe(2)
    expect(next.run.breakthroughPlan?.inheritanceSpent).toBe(1)
  })

  it('BREAKTHROUGH_CONFIRM 成功路径：realm+1、pity清零、hp=maxHp', () => {
    const rng = createSequenceRng([0.0, 0.0, 0.0])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'breakthrough',
      player: { ...base.player, pills: 1, pity: 2 },
      run: {
        ...base.run,
        breakthroughPlan: { pillsUsed: 1, inheritanceSpent: 0, previewRate: 0.5 },
      },
    }
    const next = reduceGame(state, { type: 'BREAKTHROUGH_CONFIRM' }, rng)

    expect(next.player.realm).not.toBe(base.player.realm)
    expect(next.player.pity).toBe(0)
    expect(next.player.hp).toBe(next.player.maxHp)
    expect(next.player.pills).toBe(state.player.pills - 1)
    expect(next.run.lastOutcome?.success).toBe(true)
    expect(next.run.breakthroughPlan).toBeUndefined()
  })

  it('BREAKTHROUGH_CONFIRM 失败路径：pity+1、hp减少、inheritancePoints增加', () => {
    const rng = createSequenceRng([0.99, 0.0, 0.0])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'breakthrough',
      player: { ...base.player, pills: 1, pity: 1 },
      run: {
        ...base.run,
        breakthroughPlan: { pillsUsed: 1, inheritanceSpent: 0, previewRate: 0.5 },
      },
    }
    const beforeInheritance = state.player.inheritancePoints
    const beforeHp = state.player.hp
    const next = reduceGame(state, { type: 'BREAKTHROUGH_CONFIRM' }, rng)

    expect(next.player.pity).toBe(2)
    expect(next.player.hp).toBeLessThan(beforeHp)
    expect(next.player.inheritancePoints).toBeGreaterThan(beforeInheritance)
    expect(next.run.lastOutcome?.success).toBe(false)
  })

  it('多次失败后 pity 影响成功率', () => {
    const base = createInitialGameState(1)
    const state0: GameState = { ...base, player: { ...base.player, pity: 0 } }
    const state3: GameState = { ...base, player: { ...base.player, pity: 3 } }
    const rate0 = calcBreakthroughRate(state0, 0, 0)
    const rate3 = calcBreakthroughRate(state3, 0, 0)

    expect(rate3).toBeGreaterThan(rate0)
  })

  it('hp<=0 时进入 death 且 summary 有内容', () => {
    const rng = createSequenceRng([0.99, 0.99, 0.0])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'breakthrough',
      player: { ...base.player, hp: 1, pills: 1 },
      run: {
        ...base.run,
        breakthroughPlan: { pillsUsed: 1, inheritanceSpent: 0, previewRate: 0.5 },
      },
    }
    const next = reduceGame(state, { type: 'BREAKTHROUGH_CONFIRM' }, rng)

    expect(next.screen).toBe('death')
    expect(next.summary?.cause).toBeDefined()
    expect(next.run.lastOutcome).toBeDefined()
  })

  it('rngCalls 增长符合调用次数', () => {
    const rng = createSequenceRng([0.0, 0.0, 0.0])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'breakthrough',
      player: { ...base.player, pills: 1 },
      run: {
        ...base.run,
        breakthroughPlan: { pillsUsed: 1, inheritanceSpent: 0, previewRate: 0.5 },
      },
    }
    const beforeCalls = state.run.rngCalls
    const next = reduceGame(state, { type: 'BREAKTHROUGH_CONFIRM' }, rng)

    expect(next.run.rngCalls).toBeGreaterThan(beforeCalls)
  })

  it('炼丹会增加 pills', () => {
    const rng = createSequenceRng([0.9])
    const state = createInitialGameState(1)
    const next = reduceGame(state, { type: 'ALCHEMY_BREW' }, rng)

    expect(next.player.pills).toBe(state.player.pills + 2)
    expect(next.run.turn).toBe(state.run.turn + 1)
  })
})
