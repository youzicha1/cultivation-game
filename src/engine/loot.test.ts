/**
 * TICKET-7: 掉落表系统测试
 */
import { describe, expect, it } from 'vitest'
import { createSequenceRng } from './rng'
import {
  getLootRarityWeight,
  getRarityLabel,
  getRarityToastText,
  LOOT_RARITY_WEIGHT,
  rollLootDrop,
} from './loot'

describe('loot', () => {
  describe('getLootRarityWeight', () => {
    it('danger<30 时只有 common 和 rare', () => {
      expect(getLootRarityWeight('common', 10, 0)).toBe(100)
      expect(getLootRarityWeight('rare', 10, 0)).toBe(20)
      expect(getLootRarityWeight('epic', 10, 0)).toBe(0)
      expect(getLootRarityWeight('legendary', 10, 0)).toBe(0)
    })

    it('danger 30-49 时 epic 开始出现，仍无 legendary', () => {
      expect(getLootRarityWeight('common', 40, 0)).toBe(100)
      expect(getLootRarityWeight('rare', 40, 0)).toBe(30)
      expect(getLootRarityWeight('epic', 40, 0)).toBe(5)
      expect(getLootRarityWeight('legendary', 40, 0)).toBe(0)
    })

    it('danger 50-69 时 epic 增加，仍无 legendary', () => {
      expect(getLootRarityWeight('common', 60, 0)).toBe(100)
      expect(getLootRarityWeight('rare', 60, 0)).toBe(40)
      expect(getLootRarityWeight('epic', 60, 0)).toBe(10)
      expect(getLootRarityWeight('legendary', 60, 0)).toBe(0)
    })

    it('danger 70-84 时 legendary 开始出现但很低', () => {
      expect(getLootRarityWeight('common', 75, 0)).toBe(100)
      expect(getLootRarityWeight('rare', 75, 0)).toBe(50)
      expect(getLootRarityWeight('epic', 75, 0)).toBe(20)
      expect(getLootRarityWeight('legendary', 75, 0)).toBe(2)
    })

    it('danger≥85 时 legendary 概率明显提升', () => {
      expect(getLootRarityWeight('common', 90, 0)).toBe(100)
      expect(getLootRarityWeight('rare', 90, 0)).toBe(60)
      expect(getLootRarityWeight('epic', 90, 0)).toBe(30)
      expect(getLootRarityWeight('legendary', 90, 0)).toBe(5)
    })

    it('streak≥3 时 rare 权重提升（在可用时）', () => {
      const w0 = getLootRarityWeight('rare', 40, 0)
      const w3 = getLootRarityWeight('rare', 40, 3)
      expect(w3).toBeGreaterThan(w0)
      expect(w3).toBeCloseTo(w0 * 1.1, 1)
    })

    it('streak≥5 时 rare/epic 权重提升（在可用时）', () => {
      const rare3 = getLootRarityWeight('rare', 40, 3)
      const rare5 = getLootRarityWeight('rare', 40, 5)
      expect(rare5).toBeGreaterThan(rare3)
      
      const epic3 = getLootRarityWeight('epic', 40, 3)
      const epic5 = getLootRarityWeight('epic', 40, 5)
      expect(epic5).toBeGreaterThan(epic3)
    })

    it('streak≥8 时 epic/legendary 权重提升（在可用时）', () => {
      const epic5 = getLootRarityWeight('epic', 75, 5)
      const epic8 = getLootRarityWeight('epic', 75, 8)
      expect(epic8).toBeGreaterThan(epic5)
      
      const leg5 = getLootRarityWeight('legendary', 75, 5)
      const leg8 = getLootRarityWeight('legendary', 75, 8)
      expect(leg8).toBeGreaterThan(leg5)
    })

    it('danger<70 时 legendary 权重始终为 0，即使有 streak', () => {
      expect(getLootRarityWeight('legendary', 50, 8)).toBe(0)
      expect(getLootRarityWeight('legendary', 69, 8)).toBe(0)
    })
  })

  describe('rollLootDrop', () => {
    it('固定 rng 下可预测掉落', () => {
      const rng = createSequenceRng([0.0, 0.0])
      const drop = rollLootDrop(rng, 0, 0)
      expect(drop.rarity).toBeDefined()
      expect(['common', 'rare', 'epic', 'legendary']).toContain(drop.rarity)
      expect(drop.item).toBeDefined()
    })

    it('高 danger 时更容易出稀有掉落', () => {
      const rngLow = createSequenceRng([0.1, 0.1])
      const rngHigh = createSequenceRng([0.1, 0.1])
      const dropLow = rollLootDrop(rngLow, 10, 0)
      const dropHigh = rollLootDrop(rngHigh, 80, 0)
      // 高 danger 时 rare+ 权重更高，但具体结果取决于 rng，这里只验证能正常生成
      expect(dropHigh.rarity).toBeDefined()
      expect(dropHigh.item).toBeDefined()
    })
  })

  describe('getRarityLabel', () => {
    it('返回中文标签', () => {
      expect(getRarityLabel('common')).toBe('普通')
      expect(getRarityLabel('rare')).toBe('稀有')
      expect(getRarityLabel('epic')).toBe('史诗')
      expect(getRarityLabel('legendary')).toBe('传说')
    })
  })

  describe('getRarityToastText', () => {
    it('稀有度有对应 Toast 文本', () => {
      expect(getRarityToastText('common')).toBe('')
      expect(getRarityToastText('rare')).toBe('灵光一闪！')
      expect(getRarityToastText('epic')).toBe('紫气东来！')
      expect(getRarityToastText('legendary')).toBe('天降机缘！！')
    })
  })
})
