import { describe, expect, it } from 'vitest'
import { createSequenceRng } from './rng'
import { createInitialGameState, reduceGame, type GameState } from './game'

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

  it('突破成功提升境界并恢复生命', () => {
    const rng = createSequenceRng([0.0])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'breakthrough',
      player: { ...base.player, pills: 1 },
    }
    const next = reduceGame(
      state,
      { type: 'BREAKTHROUGH_ATTEMPT', pillsUsed: 1 },
      rng,
    )

    expect(next.player.realm).not.toBe(base.player.realm)
    expect(next.player.hp).toBe(next.player.maxHp)
    expect(next.screen).toBe('home')
  })

  it('突破失败增加传承点并扣血', () => {
    const rng = createSequenceRng([0.99, 0.0])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'breakthrough',
      player: { ...base.player, pills: 1 },
    }
    const next = reduceGame(
      state,
      { type: 'BREAKTHROUGH_ATTEMPT', pillsUsed: 1 },
      rng,
    )

    expect(next.player.inheritancePoints).toBe(base.player.inheritancePoints + 1)
    expect(next.player.hp).toBeLessThan(base.player.hp)
  })

  it('炼丹会增加 pills', () => {
    const rng = createSequenceRng([0.9])
    const state = createInitialGameState(1)
    const next = reduceGame(state, { type: 'ALCHEMY_BREW' }, rng)

    expect(next.player.pills).toBe(state.player.pills + 2)
    expect(next.run.turn).toBe(state.run.turn + 1)
  })
})
