import { describe, it, expect } from 'vitest'
import {
  createSeededRng,
  createSequenceRng,
  randInt,
  type Rng,
} from './rng'

describe('RNG', () => {
  describe('createSeededRng', () => {
    it('相同种子应产生相同的序列', () => {
      const rng1 = createSeededRng(12345)
      const rng2 = createSeededRng(12345)

      // 生成多个随机数，确保序列一致
      for (let i = 0; i < 10; i++) {
        expect(rng1.next()).toBe(rng2.next())
      }
    })

    it('不同种子应产生不同的序列', () => {
      const rng1 = createSeededRng(12345)
      const rng2 = createSeededRng(67890)

      // 至少前几个应该不同
      const val1 = rng1.next()
      const val2 = rng2.next()
      expect(val1).not.toBe(val2)
    })

    it('生成的随机数应在 [0, 1) 区间内', () => {
      const rng = createSeededRng(42)
      for (let i = 0; i < 100; i++) {
        const value = rng.next()
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThan(1)
      }
    })
  })

  describe('createSequenceRng', () => {
    it('应按给定序列输出', () => {
      const sequence = [0.1, 0.5, 0.9, 0.2]
      const rng = createSequenceRng(sequence)

      expect(rng.next()).toBe(0.1)
      expect(rng.next()).toBe(0.5)
      expect(rng.next()).toBe(0.9)
      expect(rng.next()).toBe(0.2)
    })

    it('超出长度后应抛出错误（默认不循环）', () => {
      const sequence = [0.1, 0.2]
      const rng = createSequenceRng(sequence)

      rng.next()
      rng.next()
      expect(() => rng.next()).toThrow('序列已耗尽')
    })

    it('启用循环后应重复序列', () => {
      const sequence = [0.1, 0.2]
      const rng = createSequenceRng(sequence, true)

      expect(rng.next()).toBe(0.1)
      expect(rng.next()).toBe(0.2)
      expect(rng.next()).toBe(0.1) // 循环
      expect(rng.next()).toBe(0.2) // 循环
    })
  })

  describe('randInt', () => {
    it('应在指定区间内返回整数', () => {
      const rng = createSequenceRng([0.0, 0.5, 0.999])

      expect(randInt(rng, 1, 10)).toBe(1) // 0.0 * 10 + 1 = 1
      expect(randInt(rng, 1, 10)).toBe(6) // 0.5 * 10 + 1 = 6
      expect(randInt(rng, 1, 10)).toBe(10) // 0.999 * 10 + 1 = 10
    })

    it('应正确处理单值区间', () => {
      const rng = createSequenceRng([0.5])
      expect(randInt(rng, 5, 5)).toBe(5)
    })

    it('minIncl 大于 maxIncl 时应抛出错误', () => {
      const rng = createSequenceRng([0.5])
      expect(() => randInt(rng, 10, 5)).toThrow('minIncl 不能大于 maxIncl')
    })
  })
})
