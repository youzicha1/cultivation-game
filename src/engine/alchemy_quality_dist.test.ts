/**
 * TICKET-32: 丹方品质分布（tier→qualityDist）校验
 * 凡方只出凡；天方 tian>0 且很低；sum=1；clamp 正确。
 */

import { describe, expect, it } from 'vitest'
import {
  getQualityDist,
  clampWeightsToTier,
  normalizeDist,
  DEFAULT_WEIGHTS_BY_TIER,
  type RecipeTier,
} from './alchemy/quality_weights'
import type { ElixirQuality } from './alchemy'

const QUALITIES: ElixirQuality[] = ['fan', 'xuan', 'di', 'tian']

function sumDist(d: Record<ElixirQuality, number>): number {
  return QUALITIES.reduce((s, q) => s + d[q], 0)
}

describe('alchemy_quality_dist', () => {
  it('凡方只出凡，其他=0', () => {
    const dist = getQualityDist('fan')
    expect(dist.fan).toBe(1)
    expect(dist.xuan).toBe(0)
    expect(dist.di).toBe(0)
    expect(dist.tian).toBe(0)
  })

  it('玄方只出玄/凡', () => {
    const dist = getQualityDist('xuan')
    expect(dist.fan).toBeGreaterThan(0)
    expect(dist.xuan).toBeGreaterThan(0)
    expect(dist.di).toBe(0)
    expect(dist.tian).toBe(0)
  })

  it('天方 tian 概率>0 且很低（例如<0.1）', () => {
    const dist = getQualityDist('tian')
    expect(dist.tian).toBeGreaterThan(0)
    expect(dist.tian).toBeLessThan(0.1)
  })

  it('天方 fan 显著>0', () => {
    const dist = getQualityDist('tian')
    expect(dist.fan).toBeGreaterThan(0.5)
  })

  it('qualityDist sum=1', () => {
    const tiers: RecipeTier[] = ['fan', 'xuan', 'di', 'tian']
    for (const tier of tiers) {
      const dist = getQualityDist(tier)
      expect(Math.abs(sumDist(dist) - 1)).toBeLessThan(1e-9)
    }
  })

  it('clamp 正确：超出 tier 的品质权重=0', () => {
    const w = { fan: 10, xuan: 20, di: 30, tian: 40 }
    expect(clampWeightsToTier(w, 'fan').xuan).toBe(0)
    expect(clampWeightsToTier(w, 'fan').di).toBe(0)
    expect(clampWeightsToTier(w, 'fan').tian).toBe(0)
    expect(clampWeightsToTier(w, 'xuan').di).toBe(0)
    expect(clampWeightsToTier(w, 'xuan').tian).toBe(0)
    expect(clampWeightsToTier(w, 'di').tian).toBe(0)
  })

  it('normalizeDist 使 sum=1', () => {
    const raw = { fan: 66, xuan: 24, di: 8, tian: 2 }
    const dist = normalizeDist(raw)
    expect(Math.abs(sumDist(dist) - 1)).toBeLessThan(1e-9)
  })

  it('DEFAULT_WEIGHTS_BY_TIER 凡方 fan=100 其余=0', () => {
    const w = DEFAULT_WEIGHTS_BY_TIER.fan
    expect(w.fan).toBe(100)
    expect(w.xuan).toBe(0)
    expect(w.di).toBe(0)
    expect(w.tian).toBe(0)
  })
})
