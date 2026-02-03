/**
 * TICKET-40: 传承解锁 — 购买与对新局生效
 */

import { createInitialGameState } from '../game'
import {
  getLegacyUnlocks,
  canBuyUnlock,
  buyUnlock,
  applyLegacyUnlocksToNewRun,
  type MetaWithLegacy,
} from './legacy_unlocks'

describe('legacy_unlocks (TICKET-40)', () => {
  it('getLegacyUnlocks returns at least 12 unlocks', () => {
    const list = getLegacyUnlocks()
    expect(list.length).toBeGreaterThanOrEqual(12)
    expect(list.some((u) => u.id === 'LU_START_GOLD')).toBe(true)
    expect(list.some((u) => u.id === 'LU_START_PILLS')).toBe(true)
  })

  it('canBuyUnlock: not enough points -> can false', () => {
    const meta: MetaWithLegacy = { legacyPoints: 1, legacyUnlocks: {} }
    const def = getLegacyUnlocks().find((u) => u.id === 'LU_START_GOLD')!
    expect(def.cost).toBeGreaterThan(1)
    const check = canBuyUnlock(meta, 'LU_START_GOLD')
    expect(check.can).toBe(false)
    expect(check.reason).toMatch(/不足|传承点/)
  })

  it('canBuyUnlock: enough points and not owned -> can true', () => {
    const meta: MetaWithLegacy = { legacyPoints: 10, legacyUnlocks: {} }
    expect(canBuyUnlock(meta, 'LU_START_GOLD').can).toBe(true)
  })

  it('canBuyUnlock: already unlocked -> can false', () => {
    const meta: MetaWithLegacy = { legacyPoints: 10, legacyUnlocks: { LU_START_GOLD: true } }
    expect(canBuyUnlock(meta, 'LU_START_GOLD').can).toBe(false)
    expect(canBuyUnlock(meta, 'LU_START_GOLD').reason).toMatch(/已解锁/)
  })

  it('buyUnlock: deducts points and adds to legacyUnlocks', () => {
    const meta: MetaWithLegacy = { legacyPoints: 10, legacyUnlocks: {} }
    const next = buyUnlock(meta, 'LU_START_GOLD')
    expect(next).not.toBeNull()
    expect(next!.legacyPoints).toBe(10 - 2)
    expect(next!.legacyUnlocks!['LU_START_GOLD']).toBe(true)
  })

  it('buyUnlock: cannot buy -> returns null', () => {
    const meta: MetaWithLegacy = { legacyPoints: 0, legacyUnlocks: {} }
    expect(buyUnlock(meta, 'LU_START_GOLD')).toBeNull()
    const meta2: MetaWithLegacy = { legacyPoints: 10, legacyUnlocks: { LU_START_GOLD: true } }
    expect(buyUnlock(meta2, 'LU_START_GOLD')).toBeNull()
  })

  it('applyLegacyUnlocksToNewRun: LU_START_GOLD adds spiritStones', () => {
    const init = createInitialGameState(1)
    expect(init.player.spiritStones).toBe(0)
    const withUnlock = applyLegacyUnlocksToNewRun(init, { LU_START_GOLD: true })
    expect(withUnlock.player.spiritStones).toBe(50)
  })

  it('applyLegacyUnlocksToNewRun: LU_START_PILLS adds pills', () => {
    const init = createInitialGameState(1)
    expect(init.player.pills).toBe(0)
    const withUnlock = applyLegacyUnlocksToNewRun(init, { LU_START_PILLS: true })
    expect(withUnlock.player.pills).toBe(2)
  })

  it('applyLegacyUnlocksToNewRun: LU_START_HP adds maxHp and hp', () => {
    const init = createInitialGameState(1)
    expect(init.player.maxHp).toBe(100)
    const withUnlock = applyLegacyUnlocksToNewRun(init, { LU_START_HP: true })
    expect(withUnlock.player.maxHp).toBe(120)
    expect(withUnlock.player.hp).toBe(120)
  })

  it('applyLegacyUnlocksToNewRun: LU_MARKET_DISCOUNT adds shopDiscountPercent', () => {
    const init = createInitialGameState(1)
    expect(init.run.shopDiscountPercent).toBeUndefined()
    const withUnlock = applyLegacyUnlocksToNewRun(init, { LU_MARKET_DISCOUNT: true })
    expect(withUnlock.run.shopDiscountPercent).toBe(5)
  })

  it('applyLegacyUnlocksToNewRun: empty unlocks -> state unchanged', () => {
    const init = createInitialGameState(1)
    const same = applyLegacyUnlocksToNewRun(init, undefined)
    expect(same.player.spiritStones).toBe(init.player.spiritStones)
    const same2 = applyLegacyUnlocksToNewRun(init, {})
    expect(same2.player.spiritStones).toBe(init.player.spiritStones)
  })
})
