import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearStorage,
  loadFromStorage,
  saveToStorage,
  SAVE_KEY,
  SAVE_VERSION,
} from './persistence'
import { createInitialGameState } from './game'

describe('persistence', () => {
  beforeEach(() => {
    clearStorage()
  })

  it('roundtrip: save -> load 等价', () => {
    const state = createInitialGameState(123)
    saveToStorage(state)
    const loaded = loadFromStorage()
    expect(loaded).toEqual(state)
  })

  it('版本不匹配返回 null', () => {
    const payload = {
      version: SAVE_VERSION + 1,
      savedAt: Date.now(),
      state: createInitialGameState(1),
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
    expect(loadFromStorage()).toBeNull()
  })

  it('非法 JSON 返回 null', () => {
    localStorage.setItem(SAVE_KEY, '{invalid json')
    expect(loadFromStorage()).toBeNull()
  })

  it('TICKET-13: 保存/加载后 meta.pity* 与 kungfaShards 不丢', () => {
    const state = createInitialGameState(789)
    const withPity = {
      ...state,
      meta: {
        ...state.meta!,
        pityAlchemyTop: 4,
        pityLegendLoot: 10,
        pityLegendKungfa: 6,
        kungfaShards: 50,
      },
    }
    saveToStorage(withPity)
    const loaded = loadFromStorage()
    expect(loaded).not.toBeNull()
    expect(loaded!.meta?.pityAlchemyTop).toBe(4)
    expect(loaded!.meta?.pityLegendLoot).toBe(10)
    expect(loaded!.meta?.pityLegendKungfa).toBe(6)
    expect(loaded!.meta?.kungfaShards).toBe(50)
  })

  it('TICKET-14: 保存/加载后 timeLeft/timeMax 不丢', () => {
    const state = createInitialGameState(1)
    const withTime = {
      ...state,
      run: { ...state.run, timeLeft: 12, timeMax: 24 },
    }
    saveToStorage(withTime)
    const loaded = loadFromStorage()
    expect(loaded).not.toBeNull()
    expect(loaded!.run.timeLeft).toBe(12)
    expect(loaded!.run.timeMax).toBe(24)
  })

  it('TICKET-15: 保存/加载后 finalTrial 不丢', () => {
    const state = createInitialGameState(1)
    const withFinalTrial = {
      ...state,
      screen: 'final_trial' as const,
      run: {
        ...state.run,
        finalTrial: {
          step: 2 as 1 | 2 | 3,
          threat: 90,
          resolve: 45,
          choices: ['稳'],
        },
      },
    }
    saveToStorage(withFinalTrial)
    const loaded = loadFromStorage()
    expect(loaded).not.toBeNull()
    expect(loaded!.screen).toBe('final_trial')
    expect(loaded!.run.finalTrial?.step).toBe(2)
    expect(loaded!.run.finalTrial?.threat).toBe(90)
    expect(loaded!.run.finalTrial?.resolve).toBe(45)
    expect(loaded!.run.finalTrial?.choices).toEqual(['稳'])
  })

  it('TICKET-10: 保存/加载后 relics 与 equippedRelics 不丢', () => {
    const state = createInitialGameState(456)
    const withRelics = {
      ...state,
      player: {
        ...state.player,
        relics: ['steady_heart', 'fire_suppress'],
        equippedRelics: ['steady_heart', null, 'fire_suppress'] as [string | null, string | null, string | null],
      },
    }
    saveToStorage(withRelics)
    const loaded = loadFromStorage()
    expect(loaded).not.toBeNull()
    expect(loaded!.player.relics).toContain('steady_heart')
    expect(loaded!.player.relics).toContain('fire_suppress')
    expect(loaded!.player.equippedRelics[0]).toBe('steady_heart')
    expect(loaded!.player.equippedRelics[2]).toBe('fire_suppress')
  })
})
