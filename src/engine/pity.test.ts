/**
 * TICKET-13: 软保底体系单元测试
 */
import { describe, it, expect } from 'vitest'
import {
  updatePityAfterAlchemy,
  getAlchemyPityQualityShift,
  shouldForceAlchemyAtLeastDi,
  updatePityAfterLoot,
  getLegendLootWeightMul,
  shouldForceLegendLoot,
  updatePityAfterKungfuDrop,
  getLegendKungfuWeightMul,
  addKungfaShards,
  spendKungfaShardsForRarity,
  PITY_ALCHEMY_THRESHOLD,
  PITY_ALCHEMY_HARD,
  PITY_LEGEND_LOOT_THRESHOLD,
  PITY_LEGEND_LOOT_HARD,
  PITY_LEGEND_KUNGFU_THRESHOLD,
  SHARD_COST_RARE,
  SHARD_COST_EPIC,
  SHARD_COST_LEGENDARY,
} from './pity'

describe('pity (TICKET-13)', () => {
  describe('炼丹保底', () => {
    it('本次最高品质 < 地 时 pity++', () => {
      const meta = { pityAlchemyTop: 2 }
      const next = updatePityAfterAlchemy('xuan', meta)
      expect(next.pityAlchemyTop).toBe(3)
    })
    it('本次最高品质 >= 地 时 pity=0', () => {
      const meta = { pityAlchemyTop: 5 }
      expect(updatePityAfterAlchemy('di', meta).pityAlchemyTop).toBe(0)
      expect(updatePityAfterAlchemy('tian', meta).pityAlchemyTop).toBe(0)
    })
    it('达 THRESHOLD 后品质偏移 > 0', () => {
      expect(getAlchemyPityQualityShift({ pityAlchemyTop: 0 })).toBe(0)
      expect(getAlchemyPityQualityShift({ pityAlchemyTop: PITY_ALCHEMY_THRESHOLD - 1 })).toBe(0)
      expect(getAlchemyPityQualityShift({ pityAlchemyTop: PITY_ALCHEMY_THRESHOLD })).toBeGreaterThan(0)
      expect(getAlchemyPityQualityShift({ pityAlchemyTop: PITY_ALCHEMY_HARD })).toBeGreaterThan(0)
    })
    it('达 HARD 后应强制至少地品', () => {
      expect(shouldForceAlchemyAtLeastDi({ pityAlchemyTop: PITY_ALCHEMY_HARD - 1 })).toBe(false)
      expect(shouldForceAlchemyAtLeastDi({ pityAlchemyTop: PITY_ALCHEMY_HARD })).toBe(true)
    })
  })

  describe('探索传奇保底', () => {
    it('未出传奇时 pity++', () => {
      const meta = { pityLegendLoot: 5 }
      const next = updatePityAfterLoot(false, meta)
      expect(next.pityLegendLoot).toBe(6)
    })
    it('出传奇时 pity=0', () => {
      const meta = { pityLegendLoot: 10 }
      expect(updatePityAfterLoot(true, meta).pityLegendLoot).toBe(0)
    })
    it('达 THRESHOLD 后传奇权重乘数 > 1', () => {
      expect(getLegendLootWeightMul({ pityLegendLoot: 0 })).toBe(1)
      expect(getLegendLootWeightMul({ pityLegendLoot: PITY_LEGEND_LOOT_THRESHOLD })).toBeGreaterThan(1)
      expect(getLegendLootWeightMul({ pityLegendLoot: PITY_LEGEND_LOOT_HARD })).toBeGreaterThan(1)
    })
    it('达 HARD 后应强制下一次传奇', () => {
      expect(shouldForceLegendLoot({ pityLegendLoot: PITY_LEGEND_LOOT_HARD - 1 })).toBe(false)
      expect(shouldForceLegendLoot({ pityLegendLoot: PITY_LEGEND_LOOT_HARD })).toBe(true)
    })
  })

  describe('功法保底', () => {
    it('未出传奇功法时 pity++', () => {
      const meta = { pityLegendKungfa: 3 }
      expect(updatePityAfterKungfuDrop('epic', meta).pityLegendKungfa).toBe(4)
      expect(updatePityAfterKungfuDrop('rare', meta).pityLegendKungfa).toBe(4)
    })
    it('出传奇功法时 pity=0', () => {
      const meta = { pityLegendKungfa: 8 }
      expect(updatePityAfterKungfuDrop('legendary', meta).pityLegendKungfa).toBe(0)
    })
    it('达 THRESHOLD 后传奇功法权重乘数 > 1', () => {
      expect(getLegendKungfuWeightMul({ pityLegendKungfa: 0 })).toBe(1)
      expect(getLegendKungfuWeightMul({ pityLegendKungfa: PITY_LEGEND_KUNGFU_THRESHOLD })).toBeGreaterThan(1)
    })
  })

  describe('碎片', () => {
    it('addKungfaShards 累加', () => {
      const meta = { kungfaShards: 10 }
      expect(addKungfaShards(meta, 5).kungfaShards).toBe(15)
    })
    it('碎片不足不能兑换', () => {
      const meta = { kungfaShards: SHARD_COST_RARE - 1 }
      const r = spendKungfaShardsForRarity(meta, 'rare')
      expect(r.success).toBe(false)
      expect(r.newMeta.kungfaShards).toBe(meta.kungfaShards)
    })
    it('达到碎片可兑换并扣除', () => {
      const meta = { kungfaShards: SHARD_COST_LEGENDARY }
      const r = spendKungfaShardsForRarity(meta, 'legendary')
      expect(r.success).toBe(true)
      expect(r.newMeta.kungfaShards).toBe(0)
      expect(r.cost).toBe(SHARD_COST_LEGENDARY)
    })
    it('兑换 epic 扣除 60', () => {
      const meta = { kungfaShards: SHARD_COST_EPIC }
      const r = spendKungfaShardsForRarity(meta, 'epic')
      expect(r.success).toBe(true)
      expect(r.newMeta.kungfaShards).toBe(0)
      expect(r.cost).toBe(SHARD_COST_EPIC)
    })
  })
})
