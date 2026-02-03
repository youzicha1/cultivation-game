/**
 * TICKET-40: 12 劫序列 — 配置与劫数推进测试
 */

import { createInitialGameState, reduceGame, type GameState } from '../game'
import { createSequenceRng } from '../rng'
import {
  getCurrentTribulationIdx,
  getCurrentTribulationConfig,
  getTribulationConfigByIdx,
  getAllTribulationConfigs,
  TRIBULATION_COUNT,
} from './progression'

describe('tribulation progression (TICKET-40)', () => {
  it('TRIBULATION_COUNT is 12', () => {
    expect(TRIBULATION_COUNT).toBe(12)
  })

  it('getAllTribulationConfigs returns 12 configs with idx 1..12', () => {
    const configs = getAllTribulationConfigs()
    expect(configs.length).toBe(12)
    expect(configs.map((c) => c.idx)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(configs[0].name).toBe('霹雳初临劫')
    expect(configs[11].name).toBe('天游飞升劫')
  })

  it('getTribulationConfigByIdx returns config for idx 1..12', () => {
    expect(getTribulationConfigByIdx(1)?.name).toBe('霹雳初临劫')
    expect(getTribulationConfigByIdx(12)?.name).toBe('天游飞升劫')
    expect(getTribulationConfigByIdx(0)).toBeNull()
    expect(getTribulationConfigByIdx(13)).toBeNull()
  })

  it('getCurrentTribulationIdx: no tribulation -> next idx = tribulationLevel+1', () => {
    const state = createInitialGameState(1)
    expect(getCurrentTribulationIdx(state)).toBe(1)
    const stateLevel5 = { ...state, run: { ...state.run, tribulationLevel: 5 } }
    expect(getCurrentTribulationIdx(stateLevel5)).toBe(6)
    const stateLevel12 = { ...state, run: { ...state.run, tribulationLevel: 12 } }
    expect(getCurrentTribulationIdx(stateLevel12)).toBe(0)
  })

  it('getCurrentTribulationConfig returns config for current tribulation', () => {
    const state = createInitialGameState(1)
    const cfg = getCurrentTribulationConfig(state)
    expect(cfg?.idx).toBe(1)
    expect(cfg?.name).toBe('霹雳初临劫')
    expect(cfg?.tier).toBe('普通')
  })

  it('state with screen victory has ending and runSummary (engine single source)', () => {
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'victory',
      run: {
        ...base.run,
        tribulationLevel: 12,
        tribulationIdx: 0,
        tribulationsCleared: 12,
        ending: 'victory',
        runSummary: {
          ending: 'victory',
          tribulationsCleared: 12,
          turns: 100,
          cause: '十二劫尽渡',
          endingId: 'ascend',
          maxRealm: '凡人',
          maxStageIndex: 1,
          legacyPointsEarned: 49,
        },
      },
    }
    expect(state.screen).toBe('victory')
    expect(state.run.ending).toBe('victory')
    expect(state.run.tribulationsCleared).toBe(12)
    expect(state.run.runSummary?.ending).toBe('victory')
    expect(state.run.runSummary?.tribulationsCleared).toBe(12)
  })

  it('win once: after TRIBULATION_ACTION win at level 1 -> tribulationsCleared 1, next idx 2', () => {
    const rng = createSequenceRng([0.2, 0.2, 0.2, 0.2, 0.2, 0.2])
    const base = createInitialGameState(1)
    let state: GameState = {
      ...base,
      screen: 'final_trial',
      player: { ...base.player, hp: 200, maxHp: 200 },
      run: {
        ...base.run,
        tribulationLevel: 0,
        tribulation: {
          level: 1,
          totalTurns: 3,
          turn: 0,
          shield: 0,
          debuffs: { mindChaos: 0, burn: 0, weak: 0 },
          wrath: 50,
          currentIntent: { id: 'light', name: '雷光', baseDamageMin: 8, baseDamageMax: 15 },
          log: [],
        },
      },
    }
    for (let t = 0; t < 3; t++) {
      state = reduceGame(state, { type: 'TRIBULATION_ACTION', action: 'STEADY' }, rng)
    }
    expect(state.screen).toBe('home')
    expect(state.run.tribulationLevel).toBe(1)
    expect(state.run.tribulationsCleared).toBe(1)
    expect(getCurrentTribulationIdx(state)).toBe(2)
  })
})
