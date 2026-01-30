import { describe, expect, it } from 'vitest'
import {
  getTribulationSuccessRate,
  TRIBULATION_RATE_CONSTANTS,
} from './rates'

describe('tribulation/rates', () => {
  it('第 1 重基础成功率约 0.78', () => {
    expect(getTribulationSuccessRate(1)).toBe(0.78)
    expect(getTribulationSuccessRate(1, 0)).toBe(0.78)
  })

  it('成功率随 level 递减，不低于 MIN_RATE', () => {
    const r1 = getTribulationSuccessRate(1)
    const r5 = getTribulationSuccessRate(5)
    const r12 = getTribulationSuccessRate(12)
    expect(r1).toBeGreaterThan(r5)
    expect(r5).toBeGreaterThan(r12)
    expect(r12).toBeGreaterThanOrEqual(TRIBULATION_RATE_CONSTANTS.MIN_RATE)
    // 第 12 重：0.78 - 0.045*11 = 0.285，尚未触及下限 0.12
    expect(r12).toBeCloseTo(0.285, 5)
  })

  it('clamp: 不低于 minRate，不高于 0.95', () => {
    expect(getTribulationSuccessRate(1, 0.2)).toBe(0.95)
    expect(getTribulationSuccessRate(20, 0)).toBe(TRIBULATION_RATE_CONSTANTS.MIN_RATE)
  })

  it('bonus 可提高成功率', () => {
    const r = getTribulationSuccessRate(8, 0)
    const rWithBonus = getTribulationSuccessRate(8, 0.05)
    expect(rWithBonus).toBeGreaterThan(r)
  })
})
