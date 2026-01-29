/**
 * TICKET-6: 每日天道环境确定性生成与 modifier 可复现
 */
import { describe, expect, it } from 'vitest'
import {
  DAILY_ENVIRONMENT_IDS,
  generateDailyEnvironment,
  getDailyEnvironmentDef,
  getDailyModifiers,
  hashDaySeed,
} from './daily'

describe('daily', () => {
  describe('hashDaySeed', () => {
    it('相同 dayKey + runSeed 得到相同整数', () => {
      expect(hashDaySeed('2025-01-15', 42)).toBe(hashDaySeed('2025-01-15', 42))
      expect(hashDaySeed('2025-01-16', 100)).toBe(hashDaySeed('2025-01-16', 100))
    })

    it('不同 dayKey 或 runSeed 得到不同值（一般情况）', () => {
      const a = hashDaySeed('2025-01-15', 42)
      const b = hashDaySeed('2025-01-16', 42)
      const c = hashDaySeed('2025-01-15', 43)
      expect(a).not.toBe(b)
      expect(a).not.toBe(c)
    })

    it('返回非负整数', () => {
      expect(hashDaySeed('2025-01-01', -1)).toBeGreaterThanOrEqual(0)
      expect(hashDaySeed('a', 0)).toBeGreaterThanOrEqual(0)
    })
  })

  describe('generateDailyEnvironment', () => {
    it('给定 dayKey + runSeed 生成的 environmentId 固定可复现', () => {
      const a = generateDailyEnvironment('2025-01-15', 123)
      const b = generateDailyEnvironment('2025-01-15', 123)
      expect(a.environmentId).toBe(b.environmentId)
      expect(a.mission.type).toBe(b.mission.type)
      expect(a.mission.target).toBe(b.mission.target)
    })

    it('不同 dayKey 会得到不同环境（或相同仅当 hash 碰撞）', () => {
      const results = new Set<string>()
      for (let d = 1; d <= 20; d++) {
        const key = `2025-01-${String(d).padStart(2, '0')}`
        results.add(generateDailyEnvironment(key, 1).environmentId)
      }
      expect(results.size).toBeGreaterThan(1)
    })

    it('environmentId 属于 DAILY_ENVIRONMENT_IDS', () => {
      for (const id of DAILY_ENVIRONMENT_IDS) {
        expect(DAILY_ENVIRONMENT_IDS).toContain(id)
      }
      const { environmentId } = generateDailyEnvironment('2025-06-01', 999)
      expect(DAILY_ENVIRONMENT_IDS).toContain(environmentId)
    })

    it('mission 初始 progress=0、claimed=false', () => {
      const { mission } = generateDailyEnvironment('2025-01-01', 0)
      expect(mission.progress).toBe(0)
      expect(mission.claimed).toBe(false)
      expect(mission.target).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getDailyEnvironmentDef', () => {
    it('每个 DAILY_ENVIRONMENT_IDS 都有对应 Def', () => {
      for (const id of DAILY_ENVIRONMENT_IDS) {
        const def = getDailyEnvironmentDef(id)
        expect(def.id).toBe(id)
        expect(def.name).toBeTruthy()
        expect(def.mainBuff).toBeTruthy()
        expect(def.subBuff).toBeTruthy()
        expect(def.debuff).toBeTruthy()
        expect(def.missionType).toBeTruthy()
        expect(def.missionTarget).toBeGreaterThanOrEqual(1)
        expect(def.missionLabel).toBeTruthy()
        expect(def.reward).toBeTruthy()
        expect(['alchemy', 'explore', 'breakthrough', 'cultivate', 'home']).toContain(def.suggestScreen)
      }
    })
  })

  describe('getDailyModifiers', () => {
    it('每个环境 ID 返回对象（可为空）', () => {
      for (const id of DAILY_ENVIRONMENT_IDS) {
        const mod = getDailyModifiers(id)
        expect(mod).toBeDefined()
        expect(typeof mod).toBe('object')
      }
    })

    it('alchemy_day 含炼丹相关 modifier', () => {
      const mod = getDailyModifiers('alchemy_day')
      expect(mod.alchemyTianMultiplier).toBeDefined()
      expect(mod.alchemyBoomDmgReduce).toBeDefined()
      expect(mod.exploreDropMultiplier).toBeDefined()
    })

    it('explore_day 含探索/撤退/突破 modifier', () => {
      const mod = getDailyModifiers('explore_day')
      expect(mod.exploreDropMultiplier).toBeDefined()
      expect(mod.retreatBonus).toBeDefined()
      expect(mod.breakthroughSuccessBonus).toBeDefined()
    })
  })
})
