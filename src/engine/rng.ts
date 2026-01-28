/**
 * 随机数生成器接口
 * 返回 [0, 1) 区间的浮点数
 */
export interface Rng {
  next(): number
}

/**
 * 默认随机数生成器（使用 Math.random）
 */
export const defaultRng: Rng = {
  next: () => Math.random(),
}

/**
 * 创建基于种子的确定性随机数生成器（使用 mulberry32 算法）
 * @param seed 种子值
 */
export function createSeededRng(seed: number): Rng {
  let state = seed >>> 0 // 确保是 32 位无符号整数

  return {
    next(): number {
      state = (state + 0x6d2b79f5) | 0
      let t = Math.imul(state ^ (state >>> 15), state | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), state | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}

/**
 * 创建基于序列的随机数生成器（用于测试）
 * @param values 预定义的随机数序列
 * @param cycle 超出长度后是否循环（默认 false，超出后抛出错误）
 */
export function createSequenceRng(values: number[], cycle: boolean = false): Rng {
  let index = 0

  return {
    next(): number {
      if (index >= values.length) {
        if (cycle) {
          index = 0
        } else {
          throw new Error(`SequenceRng: 序列已耗尽（长度 ${values.length}）`)
        }
      }
      return values[index++]
    },
  }
}

/**
 * 生成指定范围内的随机整数 [minIncl, maxIncl]
 * @param rng 随机数生成器
 * @param minIncl 最小值（包含）
 * @param maxIncl 最大值（包含）
 */
export function randInt(rng: Rng, minIncl: number, maxIncl: number): number {
  if (minIncl > maxIncl) {
    throw new Error(`randInt: minIncl (${minIncl}) 不能大于 maxIncl (${maxIncl})`)
  }
  const range = maxIncl - minIncl + 1
  return Math.floor(rng.next() * range) + minIncl
}
