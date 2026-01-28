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
})
