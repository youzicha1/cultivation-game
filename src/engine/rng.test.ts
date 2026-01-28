import { describe, expect, it } from 'vitest'
import { createSeededRng, createSequenceRng, randInt } from './rng'

describe('rng', () => {
  it('createSeededRng 同种子序列一致', () => {
    const rng1 = createSeededRng(123)
    const rng2 = createSeededRng(123)

    for (let i = 0; i < 10; i += 1) {
      expect(rng1.next()).toBe(rng2.next())
    }
  })

  it('createSequenceRng 按序输出', () => {
    const rng = createSequenceRng([0.1, 0.5, 0.9])
    expect(rng.next()).toBe(0.1)
    expect(rng.next()).toBe(0.5)
    expect(rng.next()).toBe(0.9)
  })

  it('randInt 在区间内且可预测', () => {
    const rng = createSequenceRng([0, 0.5, 0.999])
    expect(randInt(rng, 1, 10)).toBe(1)
    expect(randInt(rng, 1, 10)).toBe(6)
    expect(randInt(rng, 1, 10)).toBe(10)
  })

  it('randInt minIncl 大于 maxIncl 抛错', () => {
    const rng = createSequenceRng([0.5])
    expect(() => randInt(rng, 10, 5)).toThrow(/minIncl.*不能大于.*maxIncl/)
  })
})
