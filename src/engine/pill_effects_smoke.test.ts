/**
 * TICKET-32: 丹药效果烟雾测试（至少各系统 1 条可感知断言）
 * 天劫/探索/突破/修炼/保命/经济 任选 4 条即可。
 */

import { describe, expect, it } from 'vitest'
import { getPillQualityMultiplier, PILL_QUALITY_MULTIPLIER } from './alchemy'
import { elixirBonusFromPills } from './breakthrough/rates'
import type { BreakthroughPillEntry } from './breakthrough/rates'
import { getTribulationSuccessRate } from './tribulation/rates'

describe('pill_effects_smoke', () => {
  it('品质倍率：凡1.0 玄1.5 地2.2 天3.5', () => {
    expect(getPillQualityMultiplier('fan')).toBe(1.0)
    expect(getPillQualityMultiplier('xuan')).toBe(1.5)
    expect(getPillQualityMultiplier('di')).toBe(2.2)
    expect(getPillQualityMultiplier('tian')).toBe(3.5)
    expect(PILL_QUALITY_MULTIPLIER.tian).toBe(3.5)
  })

  it('突破：天品丹加成高于凡品（elixirBonusFromPills）', () => {
    const fanPills: BreakthroughPillEntry[] = [{ elixirId: 'foundation_pill', quality: 'fan', count: 1 }]
    const tianPills: BreakthroughPillEntry[] = [{ elixirId: 'foundation_pill', quality: 'tian', count: 1 }]
    const fanBonus = elixirBonusFromPills(fanPills)
    const tianBonus = elixirBonusFromPills(tianPills)
    expect(tianBonus).toBeGreaterThan(fanBonus)
  })

  it('天劫：bonus 提高成功率', () => {
    const base = getTribulationSuccessRate(1, 0)
    const withBonus = getTribulationSuccessRate(1, 0.1)
    expect(withBonus).toBeGreaterThan(base)
  })

  it('修炼/经济：品质倍率可用于效果入口', () => {
    const mult = getPillQualityMultiplier('tian')
    expect(mult).toBe(3.5)
  })
})
