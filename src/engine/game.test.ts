import { describe, expect, it } from 'vitest'
import { getAlchemyRates, getRecipe } from './alchemy'
import {
  calcBreakthroughRate,
  createInitialGameState,
  reduceGame,
  shouldShowClutchHint,
  type GameState,
} from './game'
import { clearStorage, loadFromStorage, saveToStorage } from './persistence'
import { createSequenceRng } from './rng'
import { buildLegacyModifiers } from './legacy'
import { buildKungfaModifiers, getKungfuIdsByRarity } from './kungfu'
import { SHARD_COST_RARE } from './pity'
import { TIME_MAX, getTimeMaxForSegment } from './time'

describe('game reducer', () => {
  it('修炼（吐纳）会增加经验、回血、心境且正常结束', () => {
    const rng = createSequenceRng([0.0, 0.9])
    const state = createInitialGameState(1)
    const next = reduceGame(state, { type: 'CULTIVATE_TICK', mode: 'breath' }, rng)
    const mind = state.player.mind ?? 50
    const expGain = 10 + Math.floor(mind / 20)
    const hpGain = 3 + (mind >= 70 ? 1 : 0)

    expect(next.player.exp).toBe(state.player.exp + expGain)
    expect(next.player.hp).toBe(Math.min(state.player.maxHp, state.player.hp + hpGain))
    expect(next.player.mind).toBe(Math.min(100, mind + 6))
    expect(next.run.turn).toBe(state.run.turn + 1)
    expect(next.run.cultivateCount).toBe(1)
    expect(next.run.timeLeft).toBe((state.run.timeLeft ?? TIME_MAX) - 1)
  })

  it('冲脉受伤可致死并进入 death', () => {
    const rng = createSequenceRng([0.5, 0.05])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      player: { ...base.player, hp: 5, mind: 50 },
    }
    const next = reduceGame(state, { type: 'CULTIVATE_TICK', mode: 'pulse' }, rng)
    expect(next.screen).toBe('death')
    expect(next.summary?.cause).toBe('修炼受伤')
  })

  describe('TICKET-HP-1 sustain loop', () => {
    it('吐纳 4 次后 mind 上升、cultivateCount=4', () => {
      const rng = createSequenceRng([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
      const state = createInitialGameState(1)
      const s1 = reduceGame(state, { type: 'CULTIVATE_TICK', mode: 'breath' }, rng)
      const s2 = reduceGame(s1, { type: 'CULTIVATE_TICK', mode: 'breath' }, rng)
      const s3 = reduceGame(s2, { type: 'CULTIVATE_TICK', mode: 'breath' }, rng)
      const s4 = reduceGame(s3, { type: 'CULTIVATE_TICK', mode: 'breath' }, rng)
      expect(s4.player.mind).toBeGreaterThan(state.player.mind ?? 50)
      expect(s4.run.cultivateCount).toBe(4)
    })

    it('吐纳回血（clamp到maxHp）', () => {
      const rng = createSequenceRng([0.5, 0.5])
      const base = createInitialGameState(1)
      const state: GameState = {
        ...base,
        player: { ...base.player, hp: base.player.maxHp - 2 },
      }
      const next = reduceGame(state, { type: 'CULTIVATE_TICK', mode: 'breath' }, rng)
      expect(next.player.hp).toBe(base.player.maxHp)
    })

    it('收手回血：danger=50 时 hp 增加且 danger=0', () => {
      const rng = createSequenceRng([0.5])
      const base = createInitialGameState(1)
      const state: GameState = {
        ...base,
        screen: 'explore',
        run: { ...base.run, danger: 50 },
        player: { ...base.player, hp: 50 },
      }
      const next = reduceGame(state, { type: 'EXPLORE_CASH_OUT' }, rng)
      expect(next.run.danger).toBe(0)
      expect(next.player.hp).toBeGreaterThan(state.player.hp)
      const expectedHeal = 6 + Math.round(50 * 0.12)
      expect(next.player.hp).toBe(Math.min(state.player.maxHp, state.player.hp + expectedHeal))
    })
  })

  describe('TICKET-12 legacy progression', () => {
    it('LEGACY_PURCHASE 点数足够能买、扣点正确、upgradeId=1', () => {
      const state: GameState = {
        ...createInitialGameState(1),
        meta: { legacyPoints: 2, legacyUpgrades: {} },
      }
      const next = reduceGame(state, { type: 'LEGACY_PURCHASE', upgradeId: 'EX1' }, createSequenceRng([]))
      expect(next.meta?.legacyPoints).toBe(1)
      expect(next.meta?.legacyUpgrades?.['EX1']).toBe(1)
    })

    it('LEGACY_PURCHASE 点数不足不能买', () => {
      const state: GameState = {
        ...createInitialGameState(1),
        meta: { legacyPoints: 0, legacyUpgrades: {} },
      }
      const next = reduceGame(state, { type: 'LEGACY_PURCHASE', upgradeId: 'EX1' }, createSequenceRng([]))
      expect(next.meta?.legacyPoints).toBe(0)
      expect(next.meta?.legacyUpgrades?.['EX1']).toBeUndefined()
      expect(next.log.some((msg) => msg.includes('无法购买'))).toBe(true)
    })

    it('legacy modifiers 生效：EX1 撤退率+', () => {
      const state: GameState = {
        ...createInitialGameState(1),
        screen: 'explore',
        run: { ...createInitialGameState(1).run, danger: 50 },
        meta: { legacyUpgrades: { EX1: 1 } },
      }
      const kungfuCtx = buildKungfaModifiers(state)
      const legacyCtx = buildLegacyModifiers(state.meta)
      const retreatRate = Math.min(0.98, 0.88 + kungfuCtx.exploreRetreatAdd + legacyCtx.exploreRetreatAdd)
      expect(retreatRate).toBeGreaterThan(0.88)
    })

    it('legacy modifiers 生效：AL1 爆丹率×0.9', () => {
      const state: GameState = {
        ...createInitialGameState(1),
        meta: { legacyUpgrades: { AL1: 1 } },
      }
      const kungfuCtx = buildKungfaModifiers(state)
      const legacyCtx = buildLegacyModifiers(state.meta)
      const boomMul = kungfuCtx.alchemyBoomMul * legacyCtx.alchemyBoomRateMul
      expect(boomMul).toBeLessThan(1.0)
    })

    it('legacy modifiers 生效：BR1 突破率+', () => {
      const state: GameState = {
        ...createInitialGameState(1),
        meta: { legacyUpgrades: { BR1: 1 } },
      }
      const rate = calcBreakthroughRate(state, 0)
      const stateWithout = { ...state, meta: {} }
      const rateWithout = calcBreakthroughRate(stateWithout, 0)
      expect(rate).toBeGreaterThan(rateWithout)
    })
  })

  it('EXPLORE_DEEPEN 增加 danger(8~15) 并抽事件', () => {
    const rng = createSequenceRng([0.99, 0.0, 0.0, 0.0, 0.0])
    const base = createInitialGameState(1)
    const started = reduceGame(base, { type: 'EXPLORE_START' }, rng)
    const next = reduceGame(started, { type: 'EXPLORE_DEEPEN' }, rng)

    expect(next.run.danger).toBeGreaterThanOrEqual(8)
    expect(next.run.danger).toBeLessThanOrEqual(15)
    expect(next.run.currentEvent).toBeDefined()
    expect(next.run.currentEvent?.title).toBeTruthy()
  })

  it('EXPLORE_CASH_OUT 结算灵石与修为、danger 归零', () => {
    // 收手时有一次撤退判定 next01()，需提供至少 1 个序列值（< retreatRate 表示撤退成功，全额收获）
    const rng = createSequenceRng([0.5])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'explore',
      run: { ...base.run, danger: 20 },
    }
    const next = reduceGame(state, { type: 'EXPLORE_CASH_OUT' }, rng)

    expect(next.screen).toBe('home')
    expect(next.player.spiritStones).toBe(base.player.spiritStones + 12)
    expect(next.player.exp).toBe(base.player.exp + 8)
    expect(next.run.danger).toBe(0)
  })

  it('calcBreakthroughRate pills/inheritance/pity 会提高成功率', () => {
    const base = createInitialGameState(1)
    const rate0 = calcBreakthroughRate(base, 0)
    const rate2 = calcBreakthroughRate(base, 1)
    const stateWithPity: GameState = {
      ...base,
      player: { ...base.player, pity: 3 },
    }
    const rate3 = calcBreakthroughRate(stateWithPity, 0)
    const stateWithElixir: GameState = {
      ...base,
      player: {
        ...base.player,
        elixirs: {
          ...base.player.elixirs,
          spirit_pill: { fan: 2, xuan: 0, di: 0, tian: 0 },
        },
      },
    }
    const rate4 = calcBreakthroughRate(stateWithElixir, 0, {
      elixirId: 'spirit_pill',
      quality: 'fan',
      count: 2,
    })

    expect(rate2).toBeGreaterThan(rate0)
    expect(rate3).toBeGreaterThan(rate0)
    expect(rate4).toBeGreaterThan(rate0)
    expect(rate0).toBeGreaterThanOrEqual(0.05)
    expect(rate0).toBeLessThanOrEqual(0.95)
  })

  it('BREAKTHROUGH_SET_PLAN 不会超过资源上限', () => {
    const rng = createSequenceRng([])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      player: {
        ...base.player,
        inheritancePoints: 1,
        elixirs: {
          ...base.player.elixirs,
          spirit_pill: { fan: 1, xuan: 0, di: 0, tian: 0 },
        },
      },
    }
    const next = reduceGame(
      state,
      {
        type: 'BREAKTHROUGH_SET_PLAN',
        inheritanceSpent: 5,
        useElixir: { elixirId: 'spirit_pill', quality: 'fan', count: 5 },
      },
      rng,
    )

    expect(next.run.breakthroughPlan?.inheritanceSpent).toBe(1)
    expect(next.run.breakthroughPlan?.useElixir?.count).toBe(1)
  })

  it('BREAKTHROUGH_CONFIRM 成功路径：realm+1、pity清零、hp=maxHp', () => {
    const rng = createSequenceRng([0.0, 0.0, 0.0])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'breakthrough',
      player: {
        ...base.player,
        pity: 2,
        elixirs: {
          ...base.player.elixirs,
          spirit_pill: { fan: 1, xuan: 0, di: 0, tian: 0 },
        },
      },
      run: {
        ...base.run,
        breakthroughPlan: {
          inheritanceSpent: 0,
          useElixir: { elixirId: 'spirit_pill', quality: 'fan', count: 1 },
          previewRate: 0.5,
        },
      },
    }
    const next = reduceGame(state, { type: 'BREAKTHROUGH_CONFIRM' }, rng)

    expect(next.player.realm).not.toBe(base.player.realm)
    expect(next.player.pity).toBe(0)
    expect(next.player.hp).toBe(next.player.maxHp)
    expect(next.player.elixirs.spirit_pill.fan).toBe(0)
    expect(next.run.lastOutcome?.kind === 'breakthrough' && next.run.lastOutcome.success).toBe(true)
    expect(next.run.breakthroughPlan).toBeUndefined()
  })

  it('BREAKTHROUGH_CONFIRM 失败路径：pity+1、hp减少、inheritancePoints增加', () => {
    const rng = createSequenceRng([0.99, 0.0, 0.0])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'breakthrough',
      player: {
        ...base.player,
        pity: 1,
        elixirs: {
          ...base.player.elixirs,
          foundation_pill: { fan: 0, xuan: 0, di: 0, tian: 1 },
        },
      },
      run: {
        ...base.run,
        breakthroughPlan: {
          inheritanceSpent: 0,
          useElixir: { elixirId: 'foundation_pill', quality: 'tian', count: 1 },
          previewRate: 0.5,
        },
      },
    }
    const beforeInheritance = state.player.inheritancePoints
    const beforeHp = state.player.hp
    const next = reduceGame(state, { type: 'BREAKTHROUGH_CONFIRM' }, rng)

    expect(next.player.pity).toBe(2)
    expect(next.player.hp).toBeLessThan(beforeHp)
    expect(next.player.inheritancePoints).toBeGreaterThan(beforeInheritance)
    expect(next.run.lastOutcome?.kind === 'breakthrough' && next.run.lastOutcome.success === false).toBe(true)
    expect(next.player.elixirs.foundation_pill.tian).toBe(0)
  })

  // TICKET-9: 临门一脚提示测试
  it('shouldShowClutchHint: pity>=3 显示 medium 提示', () => {
    const base = createInitialGameState(1)
    const stateLow: GameState = { ...base, player: { ...base.player, pity: 2 } }
    const stateMed: GameState = { ...base, player: { ...base.player, pity: 3 } }
    const stateHigh: GameState = { ...base, player: { ...base.player, pity: 7 } }

    expect(shouldShowClutchHint(stateLow).show).toBe(false)
    const hintMed = shouldShowClutchHint(stateMed)
    expect(hintMed.show).toBe(true)
    expect(hintMed.level).toBe('medium')
    expect(hintMed.message).toContain('天机渐明')
    const hintHigh = shouldShowClutchHint(stateHigh)
    expect(hintHigh.show).toBe(true)
    expect(hintHigh.level).toBe('high')
    expect(hintHigh.message).toContain('临门一脚')
  })

  // TICKET-9: 战报字段测试
  it('BREAKTHROUGH_CONFIRM 成功时 lastOutcome 包含消耗信息', () => {
    const rng = createSequenceRng([0.0, 0.0, 0.0])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'breakthrough',
      player: {
        ...base.player,
        inheritancePoints: 2,
        elixirs: {
          ...base.player.elixirs,
          spirit_pill: { fan: 1, xuan: 0, di: 0, tian: 0 },
        },
      },
      run: {
        ...base.run,
        breakthroughPlan: {
          inheritanceSpent: 2,
          useElixir: { elixirId: 'spirit_pill', quality: 'fan', count: 1 },
          previewRate: 0.5,
        },
      },
    }
    const next = reduceGame(state, { type: 'BREAKTHROUGH_CONFIRM' }, rng)

    expect(next.run.lastOutcome?.kind).toBe('breakthrough')
    if (next.run.lastOutcome?.kind === 'breakthrough') {
      expect(next.run.lastOutcome.success).toBe(true)
      expect(next.run.lastOutcome.consumed).toBeDefined()
      expect(next.run.lastOutcome.consumed?.inheritanceSpent).toBe(2)
      expect(next.run.lastOutcome.consumed?.elixir?.elixirId).toBe('spirit_pill')
      expect(next.run.lastOutcome.consumed?.elixir?.count).toBe(1)
      expect(next.run.lastOutcome.deltas.realm).toBe(1)
      expect(next.run.lastOutcome.deltas.hp).toBeGreaterThan(0)
    }
  })

  it('BREAKTHROUGH_CONFIRM 失败时 lastOutcome 包含消耗和补偿信息', () => {
    const rng = createSequenceRng([0.99, 0.0, 0.0])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'breakthrough',
      player: {
        ...base.player,
        inheritancePoints: 1,
        pity: 1,
        elixirs: {
          ...base.player.elixirs,
          foundation_pill: { fan: 0, xuan: 1, di: 0, tian: 0 },
        },
      },
      run: {
        ...base.run,
        breakthroughPlan: {
          inheritanceSpent: 0,
          useElixir: { elixirId: 'foundation_pill', quality: 'xuan', count: 1 },
          previewRate: 0.5,
        },
      },
    }
    const beforeInheritance = state.player.inheritancePoints
    const beforePity = state.player.pity
    const next = reduceGame(state, { type: 'BREAKTHROUGH_CONFIRM' }, rng)

    expect(next.run.lastOutcome?.kind).toBe('breakthrough')
    if (next.run.lastOutcome?.kind === 'breakthrough') {
      expect(next.run.lastOutcome.success).toBe(false)
      expect(next.run.lastOutcome.consumed).toBeDefined()
      expect(next.run.lastOutcome.consumed?.inheritanceSpent).toBe(0)
      expect(next.run.lastOutcome.consumed?.elixir?.elixirId).toBe('foundation_pill')
      // 失败补偿
      expect(next.run.lastOutcome.deltas.inheritancePoints).toBeGreaterThan(0)
      expect(next.run.lastOutcome.deltas.pity).toBeGreaterThan(0)
      expect(next.player.inheritancePoints).toBeGreaterThan(beforeInheritance)
      expect(next.player.pity).toBeGreaterThan(beforePity)
    }
  })

  it('多次失败后 pity 影响成功率', () => {
    const base = createInitialGameState(1)
    const state0: GameState = { ...base, player: { ...base.player, pity: 0 } }
    const state3: GameState = { ...base, player: { ...base.player, pity: 3 } }
    const rate0 = calcBreakthroughRate(state0, 0)
    const rate3 = calcBreakthroughRate(state3, 0)

    expect(rate3).toBeGreaterThan(rate0)
  })

  it('hp<=0 时进入 death 且 summary 有内容', () => {
    const rng = createSequenceRng([0.99, 0.99, 0.0])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'breakthrough',
      player: {
        ...base.player,
        hp: 1,
        elixirs: {
          ...base.player.elixirs,
          foundation_pill: { fan: 1, xuan: 0, di: 0, tian: 0 },
        },
      },
      run: {
        ...base.run,
        breakthroughPlan: {
          inheritanceSpent: 0,
          useElixir: { elixirId: 'foundation_pill', quality: 'fan', count: 1 },
          previewRate: 0.5,
        },
      },
    }
    const next = reduceGame(state, { type: 'BREAKTHROUGH_CONFIRM' }, rng)

    expect(next.screen).toBe('death')
    expect(next.summary?.cause).toBeDefined()
    expect(next.run.lastOutcome).toBeDefined()
  })

  it('rngCalls 增长符合调用次数', () => {
    const rng = createSequenceRng([0.0, 0.0, 0.0])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'breakthrough',
      player: {
        ...base.player,
        elixirs: {
          ...base.player.elixirs,
          spirit_pill: { fan: 1, xuan: 0, di: 0, tian: 0 },
        },
      },
      run: {
        ...base.run,
        breakthroughPlan: {
          inheritanceSpent: 0,
          useElixir: { elixirId: 'spirit_pill', quality: 'fan', count: 1 },
          previewRate: 0.5,
        },
      },
    }
    const beforeCalls = state.run.rngCalls
    const next = reduceGame(state, { type: 'BREAKTHROUGH_CONFIRM' }, rng)

    expect(next.run.rngCalls).toBeGreaterThan(beforeCalls)
  })

  it('EXPLORE_START 重置 depth、risk、streak、chainProgress', () => {
    const rng = createSequenceRng([])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'explore',
      run: { ...base.run, depth: 5, risk: 2, streak: 3, chainProgress: { foo: 1 } },
    }
    const next = reduceGame(state, { type: 'EXPLORE_START' }, rng)

    expect(next.screen).toBe('explore')
    expect(next.run.depth).toBe(0)
    expect(next.run.risk).toBe(0)
    expect(next.run.streak).toBe(0)
    expect(next.run.chainProgress).toEqual({})
  })

  it('EXPLORE_BACK 返回主页、danger 归零', () => {
    const rng = createSequenceRng([])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      screen: 'explore',
      run: { ...base.run, danger: 30 },
    }
    const next = reduceGame(state, { type: 'EXPLORE_BACK' }, rng)
    expect(next.screen).toBe('home')
    expect(next.run.danger).toBe(0)
  })

  it('RELIC_EQUIP 可装备已拥有遗物到槽位', () => {
    const rng = createSequenceRng([])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      player: {
        ...base.player,
        relics: ['lucky_cauldron'],
        equippedRelics: [null, null, null],
      },
    }
    const next = reduceGame(state, { type: 'RELIC_EQUIP', slotIndex: 0, relicId: 'lucky_cauldron' }, rng)
    expect(next.player.equippedRelics[0]).toBe('lucky_cauldron')
  })

  it('RELIC_EQUIP 未拥有不能装备', () => {
    const rng = createSequenceRng([])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      player: { ...base.player, relics: [], equippedRelics: [null, null, null] },
    }
    const next = reduceGame(state, { type: 'RELIC_EQUIP', slotIndex: 0, relicId: 'steady_heart' }, rng)
    expect(next.player.equippedRelics[0]).toBeNull()
  })

  it('RELIC_EQUIP 同一功法不能重复装备（装到新槽会从旧槽卸下）', () => {
    const rng = createSequenceRng([])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      player: {
        ...base.player,
        relics: ['steady_heart'],
        equippedRelics: ['steady_heart', null, null],
      },
    }
    const next = reduceGame(state, { type: 'RELIC_EQUIP', slotIndex: 1, relicId: 'steady_heart' }, rng)
    expect(next.player.equippedRelics[0]).toBeNull()
    expect(next.player.equippedRelics[1]).toBe('steady_heart')
  })

  it('RELIC_EQUIP 卸下清空槽位', () => {
    const rng = createSequenceRng([])
    const base = createInitialGameState(1)
    const state: GameState = {
      ...base,
      player: {
        ...base.player,
        relics: ['steady_heart'],
        equippedRelics: ['steady_heart', null, null],
      },
    }
    const next = reduceGame(state, { type: 'RELIC_EQUIP', slotIndex: 0, relicId: null }, rng)
    expect(next.player.equippedRelics[0]).toBeNull()
  })

  it('装备镇火诀后炼丹 boomRate 乘法生效', () => {
    const recipe = getRecipe('qi_pill_recipe')
    expect(recipe).toBeDefined()
    const kungfuMod = { alchemyBoomMul: 0.7, alchemyQualityShift: 0 }
    const rates = getAlchemyRates({
      recipe: recipe!,
      realmIndex: 0,
      pity: 0,
      totalBrews: 0,
      heat: 'push',
      kungfuMod,
    })
    const noKungfu = getAlchemyRates({
      recipe: recipe!,
      realmIndex: 0,
      pity: 0,
      totalBrews: 0,
      heat: 'push',
    })
    expect(rates.finalBoomRate).toBeLessThan(noKungfu.finalBoomRate)
  })

  it('装备破境诀后突破率增加', () => {
    const base = createInitialGameState(1)
    const stateNoKungfu: GameState = { ...base, player: { ...base.player, relics: [], equippedRelics: [null, null, null] } }
    const stateWithKungfu: GameState = {
      ...base,
      player: {
        ...base.player,
        relics: ['breakthrough_boost'],
        equippedRelics: ['breakthrough_boost', null, null],
      },
    }
    const rate0 = calcBreakthroughRate(stateNoKungfu, 0, undefined, 0)
    const rate1 = calcBreakthroughRate(stateWithKungfu, 0, undefined, 0)
    expect(rate1).toBeGreaterThan(rate0)
  })

  describe('TICKET-6 daily', () => {
    it('SYNC_DAILY 同 dayKey 不覆盖', () => {
      const rng = createSequenceRng([])
      const base = createInitialGameState(42)
      const s1 = reduceGame(base, { type: 'SYNC_DAILY', dayKey: '2025-01-15' }, rng)
      expect(s1.meta?.daily?.dayKey).toBe('2025-01-15')
      expect(s1.meta?.daily?.environmentId).toBeTruthy()
      expect(s1.meta?.daily?.mission?.progress).toBe(0)
      const s2 = reduceGame(s1, { type: 'SYNC_DAILY', dayKey: '2025-01-15' }, rng)
      expect(s2.meta?.daily?.dayKey).toBe('2025-01-15')
    })

    it('SYNC_DAILY 不同 dayKey 刷新环境', () => {
      const rng = createSequenceRng([])
      const base = createInitialGameState(42)
      const s1 = reduceGame(base, { type: 'SYNC_DAILY', dayKey: '2025-01-15' }, rng)
      const s2 = reduceGame(s1, { type: 'SYNC_DAILY', dayKey: '2025-01-16' }, rng)
      expect(s2.meta?.daily?.dayKey).toBe('2025-01-16')
      expect(s2.meta?.daily?.mission?.progress).toBe(0)
    })

    it('DAILY_CLAIM 未完成或已领取时 no-op', () => {
      const rng = createSequenceRng([])
      const base = createInitialGameState(42)
      const withDaily: GameState = {
        ...base,
        meta: {
          daily: {
            dayKey: '2025-01-15',
            environmentId: 'balanced_day',
            mission: { type: 'cultivate_tick', target: 5, progress: 2, claimed: false },
          },
        },
      }
      const next = reduceGame(withDaily, { type: 'DAILY_CLAIM' }, rng)
      expect(next.player).toEqual(withDaily.player)
      expect(next.meta?.daily?.mission?.claimed).toBe(false)
    })

    it('DAILY_CLAIM 完成后发放奖励并标记 claimed', () => {
      const rng = createSequenceRng([])
      const base = createInitialGameState(42)
      const withDaily: GameState = {
        ...base,
        meta: {
          daily: {
            dayKey: '2025-01-15',
            environmentId: 'balanced_day',
            mission: { type: 'cultivate_tick', target: 5, progress: 5, claimed: false },
          },
        },
      }
      const beforeMaterials = withDaily.player.materials.spirit_herb ?? 0
      const next = reduceGame(withDaily, { type: 'DAILY_CLAIM' }, rng)
      expect(next.meta?.daily?.mission?.claimed).toBe(true)
      expect(next.player.materials.spirit_herb).toBe(beforeMaterials + 2)
    })
  })

  describe('TICKET-11 event chains', () => {
    it('danger>=75 且 rng 使 roll<rate 时链触发、currentEvent 为链第1章', () => {
      const rng = createSequenceRng([0.99, 0.5, 0.0, 0.0])
      const base = createInitialGameState(1)
      const started = reduceGame(base, { type: 'EXPLORE_START' }, rng)
      const withHighDanger: GameState = {
        ...started,
        run: { ...started.run, danger: 75 },
      }
      const deepened = reduceGame(withHighDanger, { type: 'EXPLORE_DEEPEN' }, rng)
      expect(deepened.run.chain?.activeChainId).toBeDefined()
      expect(deepened.run.currentEvent?.chainId).toBe(deepened.run.chain?.activeChainId)
      expect(deepened.run.currentEvent?.chapter).toBe(1)
    })

    it('链第1章选A后 run.chain.chapter 变为 2', () => {
      const rng = createSequenceRng([0.5, 0.5, 0.5, 0.5])
      const base = createInitialGameState(1)
      const state: GameState = {
        ...base,
        screen: 'explore',
        run: {
          ...base.run,
          danger: 30,
          streak: 1,
          chain: { activeChainId: 'map_to_legacy', chapter: 1, completed: {} },
          currentEvent: {
            id: 'chain_map_to_legacy_ch1',
            title: '残图',
            text: '你在废墟中拾到半张残图。',
            aText: '按图索骥',
            bText: '先记下再探',
            chainId: 'map_to_legacy',
            chapter: 1,
          },
        },
      }
      const next = reduceGame(state, { type: 'EXPLORE_CHOOSE', choice: 'A' }, rng)
      expect(next.run.chain?.chapter).toBe(2)
      expect(next.run.chain?.activeChainId).toBe('map_to_legacy')
      expect(next.run.currentEvent).toBeUndefined()
    })

    it('链第3章终章选A后发 guaranteedReward、activeChain 清空、completed 为 true', () => {
      const rng = createSequenceRng([0.5, 0.5, 0.5, 0.5])
      const base = createInitialGameState(1)
      const state: GameState = {
        ...base,
        screen: 'explore',
        run: {
          ...base.run,
          danger: 40,
          streak: 1,
          chain: { activeChainId: 'ancient_furnace', chapter: 3, completed: {} },
          currentEvent: {
            id: 'chain_ancient_furnace_ch3',
            title: '炉灵认主',
            text: '炉灵显化，愿认你为主。',
            aText: '结契',
            bText: '恭敬受法',
            chainId: 'ancient_furnace',
            chapter: 3,
          },
        },
      }
      const beforeRelics = state.player.relics.length
      const next = reduceGame(state, { type: 'EXPLORE_CHOOSE', choice: 'A' }, rng)
      expect(next.run.chain?.activeChainId).toBeUndefined()
      expect(next.run.chain?.completed?.ancient_furnace).toBe(true)
      expect(next.player.relics.length).toBeGreaterThanOrEqual(beforeRelics)
      const hasFireSuppress = next.player.relics.includes('fire_suppress')
      expect(hasFireSuppress || next.player.inheritancePoints > state.player.inheritancePoints).toBe(true)
    })

    it('保存/加载后 chain 进度不丢', () => {
      clearStorage()
      const base = createInitialGameState(1)
      const withChain: GameState = {
        ...base,
        run: {
          ...base.run,
          chain: { activeChainId: 'demon_lair', chapter: 2, completed: { map_to_legacy: true } },
        },
      }
      saveToStorage(withChain)
      const loaded = loadFromStorage()
      expect(loaded).not.toBeNull()
      expect(loaded!.run.chain?.activeChainId).toBe('demon_lair')
      expect(loaded!.run.chain?.chapter).toBe(2)
      expect(loaded!.run.chain?.completed?.map_to_legacy).toBe(true)
    })
  })

  describe('TICKET-13 pity & shard exchange', () => {
    it('KUNGFU_SHARD_EXCHANGE 碎片不足不能兑', () => {
      const rareIds = getKungfuIdsByRarity('rare')
      const kungfuId = rareIds[0]
      if (!kungfuId) return
      const base = createInitialGameState(1)
      const state: GameState = {
        ...base,
        meta: { ...base.meta!, kungfaShards: 10 },
        player: { ...base.player, relics: base.player.relics.filter((r) => r !== kungfuId) },
      }
      const rng = createSequenceRng([])
      const next = reduceGame(state, { type: 'KUNGFU_SHARD_EXCHANGE', kungfuId, rarity: 'rare' }, rng)
      expect(next.player.relics).toEqual(state.player.relics)
      expect(next.meta?.kungfaShards).toBe(10)
    })
    it('KUNGFU_SHARD_EXCHANGE 达到碎片可兑换并扣除、relics 更新', () => {
      const rareIds = getKungfuIdsByRarity('rare')
      const kungfuId = rareIds[0]
      if (!kungfuId) return
      const base = createInitialGameState(1)
      const state: GameState = {
        ...base,
        meta: { ...base.meta!, kungfaShards: SHARD_COST_RARE },
        player: { ...base.player, relics: base.player.relics.filter((r) => r !== kungfuId) },
      }
      const rng = createSequenceRng([])
      const next = reduceGame(state, { type: 'KUNGFU_SHARD_EXCHANGE', kungfuId, rarity: 'rare' }, rng)
      expect(next.player.relics).toContain(kungfuId)
      expect(next.meta?.kungfaShards).toBe(0)
      expect(next.run.shardExchangeJustClaimed).toBeDefined()
    })
  })

  describe('TICKET-14 天劫倒计时', () => {
    it('初始 timeLeft=timeMax', () => {
      const state = createInitialGameState(1)
      expect(state.run.timeLeft).toBe(TIME_MAX)
      expect(state.run.timeMax).toBe(TIME_MAX)
    })
    it('CULTIVATE_TICK 消耗 1 时辰，timeLeft 递减', () => {
      const rng = createSequenceRng([0.9, 0.5])
      const base = createInitialGameState(1)
      const state: GameState = { ...base, run: { ...base.run, timeLeft: 10, timeMax: TIME_MAX } }
      const next = reduceGame(state, { type: 'CULTIVATE_TICK', mode: 'breath' }, rng)
      expect(next.run.timeLeft).toBe(9)
    })
    it('时辰耗尽进入天劫挑战：timeLeft=1 修炼后 screen=final_trial', () => {
      const rng = createSequenceRng([0.9, 0.5])
      const base = createInitialGameState(1)
      const state: GameState = { ...base, run: { ...base.run, timeLeft: 1, timeMax: TIME_MAX } }
      const next = reduceGame(state, { type: 'CULTIVATE_TICK', mode: 'breath' }, rng)
      expect(next.run.timeLeft).toBe(0)
      expect(next.screen).toBe('final_trial')
      expect(next.run.finalTrial).toBeDefined()
      expect(next.run.finalTrial?.step).toBe(1)
      expect(next.run.finalTrial?.threat).toBeGreaterThanOrEqual(90)
      expect(next.run.finalTrial?.resolve).toBeGreaterThan(0)
    })
    it('GO / RELIC_EQUIP 不消耗时辰', () => {
      const rng = createSequenceRng([])
      const base = createInitialGameState(1)
      const state: GameState = { ...base, run: { ...base.run, timeLeft: 5, timeMax: TIME_MAX } }
      const afterGo = reduceGame(state, { type: 'GO', screen: 'relics' }, rng)
      expect(afterGo.run.timeLeft).toBe(5)
      const afterEquip = reduceGame(afterGo, { type: 'RELIC_EQUIP', slotIndex: 0, relicId: null }, rng)
      expect(afterEquip.run.timeLeft).toBe(5)
    })
    it('DEBUG_SET_TIME_LEFT 可减时辰，耗尽进入天劫挑战', () => {
      const rng = createSequenceRng([])
      const base = createInitialGameState(1)
      const state: GameState = { ...base, screen: 'home', run: { ...base.run, timeLeft: 3, timeMax: TIME_MAX } }
      const next = reduceGame(state, { type: 'DEBUG_SET_TIME_LEFT', value: 0 }, rng)
      expect(next.run.timeLeft).toBe(0)
      expect(next.screen).toBe('final_trial')
      expect(next.run.finalTrial?.step).toBe(1)
    })
    it('已触发天劫后“继续游戏”再消耗时辰：不再触发收官、传承点不增加（防刷）', () => {
      const rng = createSequenceRng([0.9, 0.5])
      const base = createInitialGameState(1)
      const afterFinale: GameState = {
        ...base,
        screen: 'ending',
        run: { ...base.run, timeLeft: 0, timeMax: TIME_MAX },
        meta: { ...base.meta!, tribulationFinaleTriggered: true, legacyPoints: 5 },
      }
      const pointsBefore = afterFinale.meta!.legacyPoints!
      const backToHome = reduceGame(afterFinale, { type: 'GO', screen: 'home' }, rng)
      expect(backToHome.screen).toBe('home')
      const afterCultivate = reduceGame(backToHome, { type: 'CULTIVATE_TICK', mode: 'breath' }, rng)
      expect(afterCultivate.screen).toBe('home')
      expect(afterCultivate.meta?.legacyPoints).toBe(pointsBefore)
      expect(afterCultivate.meta?.tribulationFinaleTriggered).toBe(true)
    })
  })

  describe('TICKET-15 天劫挑战 + 多结局', () => {
    function stateWithFinalTrial(step: 1 | 2 | 3, hp: number, resolve: number, threat: number): GameState {
      const base = createInitialGameState(1)
      return {
        ...base,
        screen: 'final_trial',
        player: { ...base.player, hp, maxHp: 100 },
        run: {
          ...base.run,
          finalTrial: { step, threat, resolve, choices: [] },
        },
      }
    }

    it('FINAL_TRIAL_CHOOSE 稳：step 1 -> 2，hp 减伤，resolve 增', () => {
      const rng = createSequenceRng([])
      const state = stateWithFinalTrial(1, 80, 40, 80)
      const next = reduceGame(state, { type: 'FINAL_TRIAL_CHOOSE', choice: 'steady' }, rng)
      expect(next.run.finalTrial?.step).toBe(2)
      expect(next.run.finalTrial?.resolve).toBe(42)
      expect(next.run.finalTrial?.choices).toContain('稳')
      expect(next.player.hp).toBeLessThan(80)
      expect(next.screen).toBe('final_trial')
    })

    it('三回合稳后渡劫成功：tribulationLevel 0 -> 续局 home、tribulationLevel 1', () => {
      const rng = createSequenceRng([])
      let state = stateWithFinalTrial(1, 200, 80, 60)
      state = reduceGame(state, { type: 'FINAL_TRIAL_CHOOSE', choice: 'steady' }, rng)
      state = reduceGame(state, { type: 'FINAL_TRIAL_CHOOSE', choice: 'steady' }, rng)
      const next = reduceGame(state, { type: 'FINAL_TRIAL_CHOOSE', choice: 'steady' }, rng)
      expect(next.screen).toBe('home')
      expect(next.run.tribulationLevel).toBe(1)
      expect(next.run.finalTrial).toBeUndefined()
      expect(next.run.timeLeft).toBe(getTimeMaxForSegment(1))
      expect(next.run.timeMax).toBe(getTimeMaxForSegment(1))
      expect(next.meta?.tribulationFinaleTriggered).toBe(false)
      expect(next.meta?.legacyPoints).toBeGreaterThan(0)
    })

    it('TICKET-27: 第 12 重渡劫成功后进入 victory', () => {
      const rng = createSequenceRng([])
      const base = createInitialGameState(1)
      let state: GameState = {
        ...base,
        screen: 'final_trial',
        player: { ...base.player, hp: 200, maxHp: 200 },
        run: {
          ...base.run,
          tribulationLevel: 11,
          finalTrial: { step: 1, threat: 60, resolve: 80, choices: [] },
        },
      }
      state = reduceGame(state, { type: 'FINAL_TRIAL_CHOOSE', choice: 'steady' }, rng)
      state = reduceGame(state, { type: 'FINAL_TRIAL_CHOOSE', choice: 'steady' }, rng)
      const next = reduceGame(state, { type: 'FINAL_TRIAL_CHOOSE', choice: 'steady' }, rng)
      expect(next.screen).toBe('victory')
      expect(next.run.tribulationLevel).toBe(12)
      expect(next.meta?.tribulationFinaleTriggered).toBe(true)
      expect(next.meta?.legacyPoints).toBe(8)
    })

    it('TICKET-27: 渡劫失败（dead）进入 final_result，传承点 1+floor(level/4)', () => {
      const rng = createSequenceRng([])
      const base = createInitialGameState(1)
      const state: GameState = {
        ...base,
        screen: 'final_trial',
        player: { ...base.player, hp: 2, maxHp: 100 },
        run: {
          ...base.run,
          tribulationLevel: 0,
          finalTrial: { step: 1, threat: 120, resolve: 0, choices: [] },
        },
      }
      const next = reduceGame(state, { type: 'FINAL_TRIAL_CHOOSE', choice: 'steady' }, rng)
      expect(next.player.hp).toBe(0)
      const after2 = reduceGame(next, { type: 'FINAL_TRIAL_CHOOSE', choice: 'steady' }, rng)
      const after3 = reduceGame(after2, { type: 'FINAL_TRIAL_CHOOSE', choice: 'steady' }, rng)
      expect(after3.screen).toBe('final_result')
      expect(after3.summary?.endingId).toBe('dead')
      expect(after3.meta?.legacyPoints).toBe(1)
    })

    it('搏：rng 成功时伤害低、resolve 大加', () => {
      const rngSuccess = createSequenceRng([0.0])
      const state = stateWithFinalTrial(1, 100, 30, 80)
      const next = reduceGame(state, { type: 'FINAL_TRIAL_CHOOSE', choice: 'gamble' }, rngSuccess)
      expect(next.run.finalTrial?.choices).toContain('搏成')
      expect(next.run.finalTrial?.resolve).toBe(36)
    })

    it('搏：rng 失败时伤害高', () => {
      const rngFail = createSequenceRng([0.99])
      const state = stateWithFinalTrial(1, 100, 30, 80)
      const next = reduceGame(state, { type: 'FINAL_TRIAL_CHOOSE', choice: 'gamble' }, rngFail)
      expect(next.run.finalTrial?.choices).toContain('搏败')
      expect(next.player.hp).toBeLessThan(100)
    })
  })

  // 炼丹逻辑测试在 alchemy.test.ts / 联动测试中覆盖
})
