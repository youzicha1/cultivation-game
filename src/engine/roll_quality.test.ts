/**
 * TICKET-32: rollQualityFromDist 可控（sequence rng 抽到指定品质）
 */

import { describe, expect, it } from 'vitest'
import { createSequenceRng } from './rng'
import { rollQualityFromDist } from './alchemy/quality_weights'

describe('roll_quality', () => {
  it('dist 全凡时必出 fan', () => {
    const dist = { fan: 1, xuan: 0, di: 0, tian: 0 }
    const rng = createSequenceRng([0, 0.5, 0.99])
    expect(rollQualityFromDist(() => rng.next(), dist)).toBe('fan')
    expect(rollQualityFromDist(() => rng.next(), dist)).toBe('fan')
    expect(rollQualityFromDist(() => rng.next(), dist)).toBe('fan')
  })

  it('dist 全 tian 时必出 tian', () => {
    const dist = { fan: 0, xuan: 0, di: 0, tian: 1 }
    const rng = createSequenceRng([0, 0.5, 0.99])
    expect(rollQualityFromDist(() => rng.next(), dist)).toBe('tian')
    expect(rollQualityFromDist(() => rng.next(), dist)).toBe('tian')
    expect(rollQualityFromDist(() => rng.next(), dist)).toBe('tian')
  })

  it('sequence rng 控制抽到指定品质', () => {
    const dist = { fan: 0.5, xuan: 0.3, di: 0.15, tian: 0.05 }
    const rng = createSequenceRng([0, 0.49, 0.5, 0.79, 0.81, 0.94, 0.96, 0.999])
    expect(rollQualityFromDist(() => rng.next(), dist)).toBe('fan')
    expect(rollQualityFromDist(() => rng.next(), dist)).toBe('fan')
    expect(rollQualityFromDist(() => rng.next(), dist)).toBe('xuan')
    expect(rollQualityFromDist(() => rng.next(), dist)).toBe('xuan')
    expect(rollQualityFromDist(() => rng.next(), dist)).toBe('di')
    expect(rollQualityFromDist(() => rng.next(), dist)).toBe('di')
    expect(rollQualityFromDist(() => rng.next(), dist)).toBe('tian')
    expect(rollQualityFromDist(() => rng.next(), dist)).toBe('tian')
  })
})
