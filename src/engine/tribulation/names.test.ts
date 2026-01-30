import { describe, expect, it } from 'vitest'
import { TRIBULATION_NAMES, TRIBULATION_COUNT, getTribulationName } from './names'

describe('tribulation/names', () => {
  it('TRIBULATION_NAMES 长度为 12', () => {
    expect(TRIBULATION_NAMES).toHaveLength(12)
    expect(TRIBULATION_COUNT).toBe(12)
  })

  it('每个 name 非空', () => {
    TRIBULATION_NAMES.forEach((name) => {
      expect(typeof name).toBe('string')
      expect(name.length).toBeGreaterThan(0)
      expect(name.trim()).toBe(name)
    })
  })

  it('getTribulationName: 1~12 返回对应名称', () => {
    expect(getTribulationName(1)).toBe('青霄雷劫')
    expect(getTribulationName(12)).toBe('大道归一劫')
    expect(getTribulationName(6)).toBe('幽冥噬影劫')
  })

  it('getTribulationName: 0 或 >12 返回空字符串', () => {
    expect(getTribulationName(0)).toBe('')
    expect(getTribulationName(13)).toBe('')
    expect(getTribulationName(-1)).toBe('')
  })
})
