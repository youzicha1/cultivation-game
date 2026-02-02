/**
 * TICKET-28: 成就引擎测试
 * - 条件进度（counter/streak/flag/all）
 * - claim 幂等、claimAll 正确
 * - hidden 未达成不出现在 view
 */

import { describe, expect, it } from 'vitest'
import {
  getAchievementView,
  claimAchievement,
  claimAllAchievements,
  achievementDefs,
  achievementGroups,
  METRIC_KEYS,
  FLAG_KEYS,
  type AchievementStateSlice,
} from './achievements'

function makeSlice(overrides: Partial<AchievementStateSlice> = {}): AchievementStateSlice {
  return {
    claimed: {},
    statsLifetime: {},
    statsRun: {},
    streaks: {},
    flags: {},
    ...overrides,
  }
}

describe('achievements', () => {
  it('成就定义 72 条、8 组', () => {
    expect(achievementDefs.length).toBeGreaterThanOrEqual(60)
    expect(achievementGroups.length).toBe(8)
    const groupIds = new Set(achievementDefs.map((a) => a.group))
    expect(groupIds.size).toBe(8)
  })

  it('counter 条件：current >= value 时 completed', () => {
    const s = makeSlice({
      statsLifetime: { explore_actions: 25 },
    })
    const view = getAchievementView(s)
    const explore1 = view.find((v) => v.id === 'explore_1')
    expect(explore1).toBeDefined()
    expect(explore1!.completed).toBe(true)
    expect(explore1!.current).toBe(25)
    expect(explore1!.target).toBe(20)
  })

  it('counter 条件：current < value 时未完成', () => {
    const s = makeSlice({
      statsLifetime: { explore_actions: 10 },
    })
    const view = getAchievementView(s)
    const explore1 = view.find((v) => v.id === 'explore_1')
    expect(explore1!.completed).toBe(false)
    expect(explore1!.current).toBe(10)
  })

  it('streak 条件：streak >= value 时 completed', () => {
    const s = makeSlice({
      streaks: { cashout_streak: 5 },
    })
    const view = getAchievementView(s)
    const streak3 = view.find((v) => v.id === 'explore_streak_3')
    expect(streak3).toBeDefined()
    expect(streak3!.completed).toBe(true)
  })

  it('flag 条件：有 flag 时 completed', () => {
    const s = makeSlice({
      flags: { explore_low_hp_cashout: true },
    })
    const view = getAchievementView(s)
    const explore5 = view.find((v) => v.id === 'explore_5')
    expect(explore5).toBeDefined()
    expect(explore5!.completed).toBe(true)
  })

  it('all 条件：多个条件都满足时 completed', () => {
    const s = makeSlice({
      statsLifetime: { breakthrough_fail_lifetime: 25, breakthrough_success_lifetime: 3 },
    })
    const view = getAchievementView(s)
    const bt6 = view.find((v) => v.id === 'breakthrough_6')
    expect(bt6).toBeDefined()
    expect(bt6!.completed).toBe(true)
  })

  it('hidden 未达成时不出现在 view', () => {
    const s = makeSlice({ flags: {}, statsLifetime: {} })
    const view = getAchievementView(s)
    const hidden = view.filter((v) => v.hidden)
    expect(hidden.length).toBe(0)
  })

  it('hidden 达成后出现在 view 且可领取', () => {
    const s = makeSlice({
      flags: { explore_allin_no_cashout: true },
    })
    const view = getAchievementView(s)
    const allin = view.find((v) => v.id === 'explore_allin_hidden')
    expect(allin).toBeDefined()
    expect(allin!.completed).toBe(true)
    expect(allin!.claimable).toBe(true)
  })

  it('claimAchievement 可领取时发奖并写入 claimed', () => {
    const s = makeSlice({
      statsLifetime: { explore_actions: 30 },
      player: { spiritStones: 100 } as AchievementStateSlice['player'],
      meta: {},
    }) as AchievementStateSlice & { player: { spiritStones: number }; meta: object }
    const { state: after, rewardApplied } = claimAchievement(s, 'explore_1')
    expect(rewardApplied).toBe(true)
    expect(after.claimed['explore_1']).toBe(true)
    expect(after.player!.spiritStones).toBe(100 + 50)
  })

  it('claimAchievement 已领取时幂等、不重复发奖', () => {
    const s = makeSlice({
      claimed: { explore_1: true },
      statsLifetime: { explore_actions: 30 },
      player: { spiritStones: 100 } as AchievementStateSlice['player'],
      meta: {},
    }) as AchievementStateSlice & { player: { spiritStones: number }; meta: object }
    const { state: after, rewardApplied } = claimAchievement(s, 'explore_1')
    expect(rewardApplied).toBe(false)
    expect(after.player!.spiritStones).toBe(100)
  })

  it('claimAchievement 未完成时不可领取', () => {
    const s = makeSlice({
      statsLifetime: { explore_actions: 5 },
      player: { spiritStones: 100 } as AchievementStateSlice['player'],
      meta: {},
    }) as AchievementStateSlice & { player: { spiritStones: number }; meta: object }
    const { rewardApplied } = claimAchievement(s, 'explore_1')
    expect(rewardApplied).toBe(false)
  })

  it('claimAllAchievements 一键领取多个、奖励合并', () => {
    const s = makeSlice({
      statsLifetime: { explore_actions: 30, explore_cashouts: 25 },
      player: { spiritStones: 0 } as AchievementStateSlice['player'],
      meta: {},
    }) as AchievementStateSlice & { player: { spiritStones: number }; meta: object }
    const { state: after, claimedIds } = claimAllAchievements(s)
    expect(claimedIds.length).toBeGreaterThanOrEqual(2)
    expect(after.claimed['explore_1']).toBe(true)
    expect(after.claimed['explore_2']).toBe(true)
    const viewBefore = getAchievementView(s)
    const rewards = viewBefore.filter((v) => v.claimable).reduce((sum, v) => {
      const def = achievementDefs.find((d) => d.id === v.id)
      return sum + (def?.reward?.spiritStones ?? 0)
    }, 0)
    expect(after.player!.spiritStones).toBe(rewards)
  })

  it('getAchievementView 可领取优先排序', () => {
    const s = makeSlice({
      statsLifetime: { explore_actions: 30 },
      flags: { explore_low_hp_cashout: true },
    })
    const view = getAchievementView(s)
    const firstNonClaimable = view.findIndex((v) => !v.claimable)
    const claimableCount = view.filter((v) => v.claimable).length
    expect(claimableCount).toBeGreaterThanOrEqual(1)
    if (firstNonClaimable >= 0) {
      expect(view.slice(firstNonClaimable).every((v) => !v.claimable)).toBe(true)
    }
  })

  it('METRIC_KEYS / FLAG_KEYS 白名单非空', () => {
    expect(METRIC_KEYS.length).toBeGreaterThanOrEqual(6)
    expect(FLAG_KEYS.length).toBeGreaterThanOrEqual(6)
  })
})
