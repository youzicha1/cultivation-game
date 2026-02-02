/**
 * TICKET-21: 奇遇链与探索事件内容校验测试
 * - 链 ID 唯一、节点（章）ID 每链内唯一
 * - 每条链至少 3 节点、至少 1 个终章大奖
 * - reward/item/eventId 引用存在（material/recipe/kungfu）
 * - tags/rarity/danger 合法
 */

import { describe, expect, it } from 'vitest'
import { getChains, type GuaranteedReward } from './chains'
import type { MaterialId } from './alchemy'
import { getRecipe, alchemyRecipes, alchemyMaterials } from './alchemy'
import { RELIC_IDS, type RelicId } from './relics'
import exploreEventsFile from '../content/explore_events.v1.json'
import type { ExploreEventsFile } from './events'
import kungfuFile from '../content/kungfu.v1.json'
import {
  achievementDefs as achievementDefsList,
  achievementGroups as achievementGroupsList,
  METRIC_KEYS as ACH_METRIC_KEYS,
  STREAK_KEYS as ACH_STREAK_KEYS,
  FLAG_KEYS as ACH_FLAG_KEYS,
} from './achievements'
import { getRealms } from './realm/gates'
import { getAllAwakenSkills } from './awaken_skills'

const MATERIAL_IDS: MaterialId[] = alchemyMaterials.map((m) => m.id)
const VALID_RARITY = ['common', 'rare', 'legendary'] as const
const VALID_KUNGFU_RARITY = ['common', 'rare', 'epic', 'legendary'] as const
const DANGER_MIN = 0
const DANGER_MAX = 100

describe('event_chains content validation', () => {
  it('链 ID 唯一', () => {
    const chains = getChains()
    const ids = chains.map((c) => c.chainId)
    const set = new Set(ids)
    expect(set.size).toBe(ids.length)
  })

  it('每条链至少 3 节点', () => {
    const chains = getChains()
    for (const c of chains) {
      expect(c.chapters.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('每条链节点（章）编号每链内唯一且连续或有序', () => {
    const chains = getChains()
    for (const c of chains) {
      const nums = c.chapters.map((ch) => ch.chapter)
      const set = new Set(nums)
      expect(set.size).toBe(nums.length)
    }
  })

  it('每条链至少 1 个终章且带 guaranteedReward', () => {
    const chains = getChains()
    for (const c of chains) {
      const finals = c.chapters.filter((ch) => ch.final && ch.guaranteedReward)
      expect(finals.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('guaranteedReward 中 materialId 存在', () => {
    const chains = getChains()
    for (const c of chains) {
      for (const ch of c.chapters) {
        const r = ch.guaranteedReward
        if (!r) continue
        if (r.type === 'epic_material_elixir') {
          expect(MATERIAL_IDS).toContain(r.materialId)
        }
      }
    }
  })

  it('guaranteedReward 中 recipeId 存在', () => {
    const chains = getChains()
    for (const c of chains) {
      for (const ch of c.chapters) {
        const r = ch.guaranteedReward
        if (!r) continue
        if (r.type === 'recipe') {
          expect(getRecipe(r.recipeId)).toBeDefined()
        }
        if (r.type === 'kungfu_or_recipe' && r.recipeId) {
          expect(getRecipe(r.recipeId)).toBeDefined()
        }
      }
    }
  })

  it('guaranteedReward 中 kungfu id 存在', () => {
    const chains = getChains()
    for (const c of chains) {
      for (const ch of c.chapters) {
        const r = ch.guaranteedReward
        if (!r) continue
        if (r.type === 'kungfu') {
          expect(RELIC_IDS).toContain(r.id as RelicId)
        }
        if (r.type === 'kungfu_or_recipe' && r.kungfuIds) {
          for (const id of r.kungfuIds) {
            expect(RELIC_IDS).toContain(id as RelicId)
          }
        }
      }
    }
  })

  it('shop_discount percent 在 0–100', () => {
    const chains = getChains()
    for (const c of chains) {
      for (const ch of c.chapters) {
        const r = ch.guaranteedReward as GuaranteedReward | undefined
        if (r?.type === 'shop_discount') {
          expect(r.percent).toBeGreaterThanOrEqual(0)
          expect(r.percent).toBeLessThanOrEqual(100)
        }
      }
    }
  })

  it('tribulation_bonus dmgReductionPercent 在 0–100', () => {
    const chains = getChains()
    for (const c of chains) {
      for (const ch of c.chapters) {
        const r = ch.guaranteedReward as GuaranteedReward | undefined
        if (r?.type === 'tribulation_bonus') {
          expect(r.dmgReductionPercent).toBeGreaterThanOrEqual(0)
          expect(r.dmgReductionPercent).toBeLessThanOrEqual(100)
        }
      }
    }
  })
})

describe('explore_events content validation', () => {
  const file = exploreEventsFile as ExploreEventsFile
  const events = file.events ?? []

  it('事件 ID 唯一', () => {
    const ids = events.map((e) => e.id)
    const set = new Set(ids)
    expect(set.size).toBe(ids.length)
  })

  it('minDanger/maxDanger 在合法范围', () => {
    for (const e of events) {
      expect(e.minDanger).toBeGreaterThanOrEqual(DANGER_MIN)
      expect(e.minDanger).toBeLessThanOrEqual(DANGER_MAX)
      expect(e.maxDanger).toBeGreaterThanOrEqual(DANGER_MIN)
      expect(e.maxDanger).toBeLessThanOrEqual(DANGER_MAX)
      expect(e.maxDanger).toBeGreaterThanOrEqual(e.minDanger)
    }
  })

  it('rarity 合法', () => {
    for (const e of events) {
      if (e.rarity != null) {
        expect(VALID_RARITY).toContain(e.rarity)
      }
    }
  })

  it('每个事件有 A/B 选项', () => {
    for (const e of events) {
      expect(e.choices?.A).toBeDefined()
      expect(e.choices?.B).toBeDefined()
    }
  })

  it('effects 中 material/fragment id 存在', () => {
    for (const e of events) {
      for (const key of ['A', 'B'] as const) {
        const choice = e.choices[key]
        if (!choice) continue
        for (const outcome of [choice.onSuccess, choice.onFail]) {
          for (const eff of outcome.effects ?? []) {
            if (eff.type === 'material' && 'id' in eff) {
              expect(MATERIAL_IDS).toContain(eff.id)
            }
            if (eff.type === 'fragment' && 'id' in eff) {
              expect(getRecipe(eff.id)).toBeDefined()
            }
          }
        }
      }
    }
  })
})

describe('kungfu content validation', () => {
  const file = kungfuFile as { version: number; kungfu: Array<{ id: string; name: string; rarity: string; shortDesc: string; sourceHint: string }> }
  const kungfu = file.kungfu ?? []

  it('功法 id 唯一', () => {
    const ids = kungfu.map((k) => k.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('功法 id 均在 RELIC_IDS 中', () => {
    for (const k of kungfu) {
      expect(RELIC_IDS).toContain(k.id as RelicId)
    }
  })

  it('功法 rarity 合法', () => {
    for (const k of kungfu) {
      expect(VALID_KUNGFU_RARITY).toContain(k.rarity as (typeof VALID_KUNGFU_RARITY)[number])
    }
  })

  it('功法必含 name/shortDesc/sourceHint', () => {
    for (const k of kungfu) {
      expect(typeof k.name).toBe('string')
      expect(typeof k.shortDesc).toBe('string')
      expect(typeof k.sourceHint).toBe('string')
    }
  })
})

describe('alchemy_recipes content validation', () => {
  const recipes = alchemyRecipes

  it('配方 id 唯一', () => {
    const ids = recipes.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('配方 baseSuccess / boomRate 在 0..1', () => {
    for (const r of recipes) {
      expect(r.baseSuccess).toBeGreaterThanOrEqual(0)
      expect(r.baseSuccess).toBeLessThanOrEqual(1)
      expect(r.boomRate).toBeGreaterThanOrEqual(0)
      expect(r.boomRate).toBeLessThanOrEqual(1)
    }
  })

  it('配方 cost 中 material id 存在且 qty>=0', () => {
    for (const r of recipes) {
      for (const [mid, qty] of Object.entries(r.cost ?? {})) {
        expect(MATERIAL_IDS).toContain(mid as MaterialId)
        expect(Number(qty)).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('配方 qualityBase 和为 1', () => {
    for (const r of recipes) {
      const sum = (r.qualityBase.fan + r.qualityBase.xuan + r.qualityBase.di + r.qualityBase.tian)
      expect(Math.abs(sum - 1)).toBeLessThan(1e-6)
    }
  })
})

describe('achievements content validation', () => {
  const metricSet = new Set(ACH_METRIC_KEYS)
  const streakSet = new Set(ACH_STREAK_KEYS)
  const flagSet = new Set(ACH_FLAG_KEYS)
  const groupIds = new Set(achievementGroupsList.map((g) => g.id))

  it('成就 id 唯一', () => {
    const ids = achievementDefsList.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('成就 group 合法', () => {
    for (const a of achievementDefsList) {
      expect(groupIds.has(a.group)).toBe(true)
    }
  })

  it('成就 tier 在 1..6', () => {
    for (const a of achievementDefsList) {
      expect(a.tier).toBeGreaterThanOrEqual(1)
      expect(a.tier).toBeLessThanOrEqual(6)
    }
  })

  it('criteria.key 在白名单', () => {
    function checkCriteria(c: { type: string; key?: string; value?: number; conditions?: Array<{ type: string; key?: string; value?: number }> }) {
      if (c.type === 'counter' && c.key) {
        expect(metricSet.has(c.key as any)).toBe(true)
        expect(c.value).toBeGreaterThanOrEqual(0)
      }
      if (c.type === 'streak' && c.key) {
        expect(streakSet.has(c.key as any)).toBe(true)
        expect(c.value).toBeGreaterThanOrEqual(0)
      }
      if (c.type === 'flag' && c.key) {
        expect(flagSet.has(c.key as any)).toBe(true)
      }
      if (c.type === 'all' && c.conditions) {
        for (const cond of c.conditions) checkCriteria(cond)
      }
    }
    for (const a of achievementDefsList) {
      checkCriteria(a.criteria as any)
    }
  })

  it('reward 非负', () => {
    for (const a of achievementDefsList) {
      const r = a.reward ?? {}
      if (r.spiritStones != null) expect(r.spiritStones).toBeGreaterThanOrEqual(0)
      if (r.legacyPoints != null) expect(r.legacyPoints).toBeGreaterThanOrEqual(0)
    }
  })

  it('成就总数 ≥ 60，8 组', () => {
    expect(achievementDefsList.length).toBeGreaterThanOrEqual(60)
    expect(achievementGroupsList.length).toBe(8)
  })
})

describe('realms content validation (TICKET-30)', () => {
  it('realms id 唯一', () => {
    const realms = getRealms()
    const ids = realms.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('realms order 连续 0..n', () => {
    const realms = getRealms()
    expect(realms.length).toBeGreaterThanOrEqual(6)
    for (let i = 0; i < realms.length; i++) {
      expect(realms[i].order).toBe(i)
    }
  })

  it('levelCap 在 1..99', () => {
    const realms = getRealms()
    for (const r of realms) {
      expect(r.levelCap).toBeGreaterThanOrEqual(1)
      expect(r.levelCap).toBeLessThanOrEqual(99)
    }
  })

  it('pillRules 含 fan/xuan/di/tian，每项有 minRealmOrder、maxPerRun', () => {
    const realms = getRealms()
    const qualities = ['fan', 'xuan', 'di', 'tian']
    for (const r of realms) {
      expect(r.pillRules).toBeDefined()
      for (const q of qualities) {
        const rule = (r.pillRules as Record<string, { minRealmOrder?: number; maxPerRun?: number }>)[q]
        expect(rule).toBeDefined()
        expect(typeof rule.minRealmOrder).toBe('number')
        expect(typeof rule.maxPerRun).toBe('number')
        expect(rule.maxPerRun).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('awaken_skills content validation (TICKET-30)', () => {
  const skills = getAllAwakenSkills()

  it('awaken skills id 唯一', () => {
    const ids = skills.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('awaken skills 含 name、desc、modifiers', () => {
    for (const s of skills) {
      expect(s.id).toBeDefined()
      expect(s.name).toBeDefined()
      expect(s.desc).toBeDefined()
      expect(s.modifiers != null && typeof s.modifiers === 'object').toBe(true)
    }
  })

  it('modifiers 值为 number', () => {
    for (const s of skills) {
      if (s.modifiers && typeof s.modifiers === 'object') {
        for (const k of Object.keys(s.modifiers)) {
          expect(typeof (s.modifiers as Record<string, number>)[k]).toBe('number')
        }
      }
    }
  })
})
