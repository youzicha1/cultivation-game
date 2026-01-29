import { describe, it, expect } from 'vitest'
import {
  getLegacyUpgrade,
  getAllLegacyUpgrades,
  getLegacyUpgradesByBranch,
  buildLegacyModifiers,
  canPurchaseUpgrade,
  purchaseUpgrade,
  getNextKeyNodeDistance,
} from './legacy'

describe('legacy system', () => {
  it('getAllLegacyUpgrades 返回所有升级', () => {
    const upgrades = getAllLegacyUpgrades()
    expect(upgrades.length).toBeGreaterThan(0)
    expect(upgrades.every((u) => u.id && u.name && u.branch && u.cost > 0)).toBe(true)
  })

  it('getLegacyUpgrade 能获取指定升级', () => {
    const upgrade = getLegacyUpgrade('EX1')
    expect(upgrade).toBeDefined()
    expect(upgrade?.name).toBe('轻身术')
    expect(upgrade?.branch).toBe('explore')
  })

  it('getLegacyUpgradesByBranch 按分支过滤', () => {
    const explore = getLegacyUpgradesByBranch('explore')
    const alchemy = getLegacyUpgradesByBranch('alchemy')
    const breakthrough = getLegacyUpgradesByBranch('breakthrough')
    expect(explore.length).toBe(6)
    expect(alchemy.length).toBe(6)
    expect(breakthrough.length).toBe(6)
    expect(explore.every((u) => u.branch === 'explore')).toBe(true)
  })

  it('buildLegacyModifiers 默认值正确', () => {
    const mod = buildLegacyModifiers()
    expect(mod.exploreRetreatAdd).toBe(0)
    expect(mod.lootRareWeightMul).toBe(1.0)
    expect(mod.alchemyBoomRateMul).toBe(1.0)
    expect(mod.breakthroughRateAdd).toBe(0)
  })

  it('buildLegacyModifiers 应用升级效果', () => {
    const meta = {
      legacyUpgrades: {
        EX1: 1, // 轻身术：撤退成功率 +0.06
        AL1: 1, // 控火：爆丹率 ×0.90
        BR1: 1, // 破障：突破成功率 +0.04
      },
    }
    const mod = buildLegacyModifiers(meta)
    expect(mod.exploreRetreatAdd).toBe(0.06)
    expect(mod.alchemyBoomRateMul).toBe(0.90)
    expect(mod.breakthroughRateAdd).toBe(0.04)
  })

  it('canPurchaseUpgrade 点数足够能买', () => {
    const meta = { legacyPoints: 2 }
    const check = canPurchaseUpgrade('EX1', meta)
    expect(check.can).toBe(true)
  })

  it('canPurchaseUpgrade 点数不足不能买', () => {
    const meta = { legacyPoints: 0 }
    const check = canPurchaseUpgrade('EX1', meta)
    expect(check.can).toBe(false)
    expect(check.reason).toContain('传承点不足')
  })

  it('canPurchaseUpgrade 已掌握不能买', () => {
    const meta = { legacyPoints: 10, legacyUpgrades: { EX1: 1 } }
    const check = canPurchaseUpgrade('EX1', meta)
    expect(check.can).toBe(false)
    expect(check.reason).toBe('已掌握')
  })

  it('canPurchaseUpgrade 前置不足不能买', () => {
    const meta = { legacyPoints: 10 }
    const check = canPurchaseUpgrade('EX2', meta) // EX2 需要 EX1
    expect(check.can).toBe(false)
    expect(check.reason).toContain('需要先掌握')
  })

  it('purchaseUpgrade 成功购买扣点并记录', () => {
    const meta = { legacyPoints: 2, legacyUpgrades: {} }
    const result = purchaseUpgrade(meta, 'EX1')
    expect(result.success).toBe(true)
    expect(result.newMeta.legacyPoints).toBe(1)
    expect(result.newMeta.legacyUpgrades?.['EX1']).toBe(1)
  })

  it('purchaseUpgrade 失败不改变状态', () => {
    const meta = { legacyPoints: 0, legacyUpgrades: {} }
    const result = purchaseUpgrade(meta, 'EX1')
    expect(result.success).toBe(false)
    expect(result.newMeta.legacyPoints).toBe(0)
    expect(result.newMeta.legacyUpgrades).toEqual({})
  })

  it('getNextKeyNodeDistance 返回最近的关键节点', () => {
    const meta = { legacyPoints: 2 }
    const next = getNextKeyNodeDistance(meta)
    if (next) {
      expect(next.upgradeId).toBeDefined()
      expect(next.name).toBeDefined()
      expect(next.cost).toBeGreaterThan(0)
      expect(next.distance).toBeGreaterThanOrEqual(0)
    }
  })
})
