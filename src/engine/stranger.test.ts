/**
 * 坊市奇人交易逻辑单元测试
 */

import { describe, it, expect } from 'vitest'
import type { PlayerState } from './state'
import type { RelicId } from './relics'
import {
  STRANGER_WINDOW_DURATION,
  STRANGER_DURATION_MS,
  STRANGER_APPEARANCES_PER_DAY_MIN,
  getCurrentDayAndOffset,
  isInTraderWindow,
  isTraderVisible,
  isTraderExpired,
  getTraderWindow,
  generateTraderSchedule,
  generateTraderOffer,
  isSameKind,
  canTrade,
  applyTrade,
  getPlayerTradeOptions,
  type TraderScheduleEntry,
  type TraderOffer,
  type PlayerGive,
  type TraderPools,
} from './stranger'

describe('stranger', () => {
  describe('getCurrentDayAndOffset', () => {
    it('consumed=0 时为 day=0, offset=0', () => {
      expect(getCurrentDayAndOffset(48, 48)).toEqual({ day: 0, offset: 0 })
    })
    it('consumed=11 时为 day=0, offset=11', () => {
      expect(getCurrentDayAndOffset(48, 37)).toEqual({ day: 0, offset: 11 })
    })
    it('consumed=12 时为 day=1, offset=0', () => {
      expect(getCurrentDayAndOffset(48, 36)).toEqual({ day: 1, offset: 0 })
    })
    it('consumed=24 时为 day=2, offset=0', () => {
      expect(getCurrentDayAndOffset(48, 24)).toEqual({ day: 2, offset: 0 })
    })
  })

  describe('isTraderExpired', () => {
    it('未超过 2 小时返回 false', () => {
      const now = 1000000
      expect(isTraderExpired(now - STRANGER_DURATION_MS + 1, now)).toBe(false)
      expect(isTraderExpired(now - 1000, now)).toBe(false)
    })
    it('超过 2 小时返回 true', () => {
      const now = 1000000
      expect(isTraderExpired(now - STRANGER_DURATION_MS, now)).toBe(true)
      expect(isTraderExpired(now - STRANGER_DURATION_MS - 1, now)).toBe(true)
    })
  })

  describe('isInTraderWindow', () => {
    it('day/offset 在窗口内返回 true', () => {
      expect(isInTraderWindow({ day: 0, start: 2, end: 4 }, 0, 2)).toBe(true)
      expect(isInTraderWindow({ day: 0, start: 2, end: 4 }, 0, 3)).toBe(true)
    })
    it('day/offset 在窗口外返回 false', () => {
      expect(isInTraderWindow({ day: 0, start: 2, end: 4 }, 0, 1)).toBe(false)
      expect(isInTraderWindow({ day: 0, start: 2, end: 4 }, 0, 4)).toBe(false)
      expect(isInTraderWindow({ day: 0, start: 2, end: 4 }, 1, 2)).toBe(false)
    })
  })

  describe('isTraderVisible / getTraderWindow', () => {
    const schedule: TraderScheduleEntry[] = [
      { day: 0, start: 2, end: 4 },
      { day: 1, start: 6, end: 8 },
    ]
    it('在窗口内时可见且能取到窗口', () => {
      expect(isTraderVisible(schedule, 48, 45)).toBe(true) // consumed=3, day=0, offset=3
      expect(getTraderWindow(schedule, 48, 45)).toEqual({ day: 0, start: 2, end: 4 })
    })
    it('不在任何窗口内时不可见', () => {
      expect(isTraderVisible(schedule, 48, 48)).toBe(false) // consumed=0
      expect(getTraderWindow(schedule, 48, 48)).toBeUndefined()
    })
  })

  describe('generateTraderSchedule', () => {
    it('生成 maxDays 天的窗口，每天 2 或 3 个，每个长度 2', () => {
      const schedule = generateTraderSchedule((a, _b) => a, 3) // 固定取 min
      expect(schedule.length).toBeGreaterThanOrEqual(6) // 3 days * 2
      expect(schedule.every((e) => e.end - e.start === STRANGER_WINDOW_DURATION)).toBe(true)
      const day0 = schedule.filter((e) => e.day === 0)
      expect(day0.length).toBe(STRANGER_APPEARANCES_PER_DAY_MIN)
    })
  })

  describe('generateTraderOffer', () => {
    const pools: TraderPools = {
      rareRecipeIds: ['r1', 'r2'],
      rareMaterialIds: ['m1'],
      highRarityKungfuIds: ['k1', 'k2'],
    }
    it('池子非空时能生成 offer', () => {
      const offer = generateTraderOffer((_a, b) => b, pools) // 取 max 索引
      expect(offer).not.toBeNull()
      expect(offer!.kind).toMatch(/recipe_fragment|rare_material|kungfu/)
    })
    it('池子全空时返回 null', () => {
      expect(generateTraderOffer(() => 0, { rareRecipeIds: [], rareMaterialIds: [], highRarityKungfuIds: [] })).toBeNull()
    })
  })

  describe('isSameKind', () => {
    it('同类型返回 true', () => {
      expect(isSameKind(
        { kind: 'recipe_fragment', recipeId: 'a', part: 'upper' },
        { kind: 'recipe_fragment', recipeId: 'b', part: 'lower' },
      )).toBe(true)
      expect(isSameKind(
        { kind: 'rare_material', materialId: 'x' },
        { kind: 'rare_material', materialId: 'y' },
      )).toBe(true)
      expect(isSameKind(
        { kind: 'kungfu', kungfuId: 'k1' },
        { kind: 'kungfu', kungfuId: 'k2' },
      )).toBe(true)
    })
    it('不同类型返回 false', () => {
      expect(isSameKind(
        { kind: 'recipe_fragment', recipeId: 'a', part: 'upper' },
        { kind: 'rare_material', materialId: 'x' },
      )).toBe(false)
    })
  })

  describe('canTrade / applyTrade', () => {
    const basePlayer: PlayerState = {
      realm: '凡人',
      level: 1,
      exp: 0,
      hp: 100,
      maxHp: 100,
      inheritancePoints: 0,
      pills: 0,
      spiritStones: 0,
      pity: 0,
      mind: 50,
      injuredTurns: 0,
      materials: {},
      elixirs: {},
      recipesUnlocked: {},
      fragments: {},
      fragmentParts: {},
      codex: { totalBrews: 0, totalBooms: 0, bestQualityByRecipe: {} },
      achievements: [],
      relics: [],
      equippedRelics: [null, null, null],
    }

    it('recipe_fragment: 有对应残页可换', () => {
      const player: PlayerState = {
        ...basePlayer,
        fragmentParts: { rA: { upper: 1, middle: 0, lower: 0 }, rB: { upper: 0, middle: 1, lower: 0 } },
      }
      const offer: TraderOffer = { kind: 'recipe_fragment', recipeId: 'rNeed', part: 'upper' }
      const give: PlayerGive = { kind: 'recipe_fragment', recipeId: 'rA', part: 'upper' }
      expect(canTrade(player, offer, give)).toBe(true)
      const next = applyTrade(player, offer, give)
      expect(next.fragmentParts!['rA'].upper).toBe(0)
      expect(next.fragmentParts!['rNeed'].upper).toBe(1)
    })

    it('recipe_fragment: 无对应残页不可换', () => {
      const player: PlayerState = { ...basePlayer, fragmentParts: { rA: { upper: 0, middle: 0, lower: 0 } } }
      const offer: TraderOffer = { kind: 'recipe_fragment', recipeId: 'rNeed', part: 'upper' }
      const give: PlayerGive = { kind: 'recipe_fragment', recipeId: 'rA', part: 'upper' }
      expect(canTrade(player, offer, give)).toBe(false)
    })

    it('rare_material: 有材料可换', () => {
      const player: PlayerState = { ...basePlayer, materials: { mX: 2, mY: 0 } }
      const offer: TraderOffer = { kind: 'rare_material', materialId: 'mNeed' }
      const give: PlayerGive = { kind: 'rare_material', materialId: 'mX' }
      expect(canTrade(player, offer, give)).toBe(true)
      const next = applyTrade(player, offer, give)
      expect(next.materials!['mX']).toBe(1)
      expect(next.materials!['mNeed']).toBe(1)
    })

    it('kungfu: 有功法可换', () => {
      const player: PlayerState = { ...basePlayer, relics: ['steady_heart', 'shallow_breath'] as RelicId[] }
      const offer: TraderOffer = { kind: 'kungfu', kungfuId: 'lucky_cauldron' }
      const give: PlayerGive = { kind: 'kungfu', kungfuId: 'steady_heart' }
      expect(canTrade(player, offer, give)).toBe(true)
      const next = applyTrade(player, offer, give)
      expect(next.relics).toEqual(['shallow_breath', 'lucky_cauldron'])
    })

    it('不同类型不可换', () => {
      const player: PlayerState = { ...basePlayer, materials: { mX: 1 } }
      const offer: TraderOffer = { kind: 'recipe_fragment', recipeId: 'r', part: 'upper' }
      const give: PlayerGive = { kind: 'rare_material', materialId: 'mX' }
      expect(canTrade(player, offer, give)).toBe(false)
    })
  })

  describe('getPlayerTradeOptions', () => {
    const basePlayer: PlayerState = {
      realm: '凡人',
      level: 1,
      exp: 0,
      hp: 100,
      maxHp: 100,
      inheritancePoints: 0,
      pills: 0,
      spiritStones: 0,
      pity: 0,
      mind: 50,
      injuredTurns: 0,
      materials: {},
      elixirs: {},
      recipesUnlocked: {},
      fragments: {},
      fragmentParts: {},
      codex: { totalBrews: 0, totalBooms: 0, bestQualityByRecipe: {} },
      achievements: [],
      relics: [],
      equippedRelics: [null, null, null],
    }

    it('recipe_fragment 时返回所有有数量的残页选项', () => {
      const player: PlayerState = {
        ...basePlayer,
        fragmentParts: { r1: { upper: 1, middle: 1, lower: 0 } },
      }
      const offer: TraderOffer = { kind: 'recipe_fragment', recipeId: 'other', part: 'lower' }
      const opts = getPlayerTradeOptions(player, offer)
      expect(opts).toHaveLength(2)
      expect(opts).toContainEqual({ kind: 'recipe_fragment', recipeId: 'r1', part: 'upper' })
      expect(opts).toContainEqual({ kind: 'recipe_fragment', recipeId: 'r1', part: 'middle' })
    })

    it('rare_material 时返回所有数量>=1 的材料', () => {
      const player: PlayerState = { ...basePlayer, materials: { a: 2, b: 0, c: 1 } }
      const offer: TraderOffer = { kind: 'rare_material', materialId: 'x' }
      const opts = getPlayerTradeOptions(player, offer)
      expect(opts).toHaveLength(2)
      expect(opts.map((o) => o.kind === 'rare_material' && o.materialId).sort()).toEqual(['a', 'c'])
    })

    it('kungfu 时返回所有已拥有功法', () => {
      const player: PlayerState = { ...basePlayer, relics: ['steady_heart', 'shallow_breath'] as RelicId[] }
      const offer: TraderOffer = { kind: 'kungfu', kungfuId: 'lucky_cauldron' }
      const opts = getPlayerTradeOptions(player, offer)
      expect(opts).toHaveLength(2)
      expect(opts).toContainEqual({ kind: 'kungfu', kungfuId: 'steady_heart' })
      expect(opts).toContainEqual({ kind: 'kungfu', kungfuId: 'shallow_breath' })
    })
  })
})
