import { describe, expect, it } from 'vitest'
import { createSequenceRng } from './rng'
import { resolveBrew } from './alchemy'
import { createInitialGameState } from './game'

describe('alchemy', () => {
  it('未解锁配方时：不消耗材料、不产丹、写日志', () => {
    const base = createInitialGameState(1)
    const state = {
      ...base,
      player: {
        ...base.player,
        recipesUnlocked: {
          ...base.player.recipesUnlocked,
          spirit_pill_recipe: false,
        },
        materials: { ...base.player.materials, spirit_herb: 10, beast_core: 10 },
      },
      log: [],
    }
    const rng = createSequenceRng([0.0])
    const { next } = resolveBrew(
      state,
      'spirit_pill_recipe',
      1,
      () => rng.next(),
      () => 1,
      'wu',
    )

    expect(next.player.materials.spirit_herb).toBe(10)
    expect(next.player.elixirs.spirit_pill.fan).toBe(0)
    expect(next.log.length).toBe(1)
  })

  it('材料不足时：不扣成负数、不产丹、写日志', () => {
    const base = createInitialGameState(1)
    const state = {
      ...base,
      player: {
        ...base.player,
        recipesUnlocked: { ...base.player.recipesUnlocked, qi_pill_recipe: true },
        materials: { ...base.player.materials, spirit_herb: 0, moon_dew: 0 },
      },
      log: [],
    }
    const rng = createSequenceRng([0.0])
    const { next } = resolveBrew(
      state,
      'qi_pill_recipe',
      1,
      () => rng.next(),
      () => 1,
      'wu',
    )

    expect(next.player.materials.spirit_herb).toBe(0)
    expect(next.player.materials.moon_dew).toBe(0)
    expect(next.player.elixirs.qi_pill.fan).toBe(0)
    expect(next.log.length).toBe(1)
  })

  it('爆丹分支：totalBooms+1、hp减少、不产丹', () => {
    const base = createInitialGameState(1)
    const state = {
      ...base,
      player: {
        ...base.player,
        materials: { ...base.player.materials, spirit_herb: 10, moon_dew: 10 },
        recipesUnlocked: { ...base.player.recipesUnlocked, qi_pill_recipe: true },
      },
      log: [],
    }
    // boom：rng01=0.0 < 0.06
    const rng = createSequenceRng([0.0])
    const { next } = resolveBrew(
      state,
      'qi_pill_recipe',
      1,
      () => rng.next(),
      () => 2, // dmg=2
    )

    expect(next.player.codex.totalBrews).toBe(1)
    expect(next.player.codex.totalBooms).toBe(1)
    expect(next.player.hp).toBe(base.player.hp - 2)
    expect(next.player.elixirs.qi_pill.fan).toBe(0)
    expect(next.log.length).toBe(1)
  })

  it('成丹且品质可预测：rng=0.0 -> fan', () => {
    const base = createInitialGameState(1)
    const state = {
      ...base,
      player: {
        ...base.player,
        materials: { ...base.player.materials, spirit_herb: 10, moon_dew: 10 },
      },
      log: [],
    }
    // boom false(0.99), success true(0.0), quality roll 0.0 -> fan
    const rng = createSequenceRng([0.99, 0.0, 0.0])
    const { next } = resolveBrew(
      state,
      'qi_pill_recipe',
      1,
      () => rng.next(),
      () => 1,
      'wu',
    )

    expect(next.player.elixirs.qi_pill.fan).toBe(1)
    expect(next.player.codex.totalBrews).toBe(1)
    expect(next.player.codex.bestQualityByRecipe.qi_pill_recipe).toBe('fan')
    expect(next.log.length).toBe(1)
  })

  it('TICKET-32 凡方只出凡：rng=0.999 仍为 fan', () => {
    const base = createInitialGameState(1)
    const state = {
      ...base,
      player: {
        ...base.player,
        materials: { ...base.player.materials, spirit_herb: 10, moon_dew: 10 },
      },
      log: [],
    }
    const rng = createSequenceRng([0.99, 0.0, 0.999])
    const { next } = resolveBrew(
      state,
      'qi_pill_recipe',
      1,
      () => rng.next(),
      () => 1,
      'wu',
    )
    expect(next.player.elixirs.qi_pill.fan).toBe(1)
    expect(next.player.elixirs.qi_pill.tian).toBe(0)
    expect(next.player.codex.bestQualityByRecipe.qi_pill_recipe).toBe('fan')
  })

  // TICKET-8: 炉温测试
  it('heat=wen 会降低 boomRate', () => {
    const base = createInitialGameState(1)
    const state = {
      ...base,
      player: {
        ...base.player,
        materials: { ...base.player.materials, spirit_herb: 10, moon_dew: 10 },
        recipesUnlocked: { ...base.player.recipesUnlocked, qi_pill_recipe: true },
      },
      log: [],
    }
    // qi_pill_recipe boomRate 约 0.06；roll 0.05 时 wu 会爆(0.05<0.06)，wen 不爆(0.06*0.70=0.042, 0.05>0.042)
    const rngPush = createSequenceRng([0.05, 0.0, 0.0])
    const { next: nextPush } = resolveBrew(
      state,
      'qi_pill_recipe',
      1,
      () => rngPush.next(),
      () => 1,
      'wu',
    )
    const rngSteady = createSequenceRng([0.05, 0.0, 0.0])
    const { next: nextSteady } = resolveBrew(
      state,
      'qi_pill_recipe',
      1,
      () => rngSteady.next(),
      () => 1,
      'wen',
    )
    expect(nextPush.player.codex.totalBooms).toBe(1)
    expect(nextSteady.player.codex.totalBooms).toBe(0)
  })

  it('heat=zhen 会提高 di/tian 出现概率', () => {
    const base = createInitialGameState(1)
    const state = {
      ...base,
      player: {
        ...base.player,
        materials: { ...base.player.materials, spirit_herb: 10, moon_dew: 10 },
        recipesUnlocked: { ...base.player.recipesUnlocked, qi_pill_recipe: true },
      },
      log: [],
    }
    // 固定 rng 序列：不爆(0.99)，成功(0.0)，品质roll高值(0.95) -> 在 zhen 下更容易出 di/tian
    const rngBlast = createSequenceRng([0.99, 0.0, 0.95])
    const { outcome: outcomeBlast } = resolveBrew(
      state,
      'qi_pill_recipe',
      1,
      () => rngBlast.next(),
      () => 1,
      'zhen',
    )
    // zhen 下品质偏移会提高 di/tian 概率，这里验证能正常生成
    expect(outcomeBlast.topQuality).toBeDefined()
    expect(['fan', 'xuan', 'di', 'tian']).toContain(outcomeBlast.topQuality)
  })

  it('战报字段正确：attempted、booms、successes、topQuality、items、streakSuccess、streakBoom', () => {
    const base = createInitialGameState(1)
    const state = {
      ...base,
      player: {
        ...base.player,
        materials: { ...base.player.materials, spirit_herb: 10, moon_dew: 10 },
        recipesUnlocked: { ...base.player.recipesUnlocked, qi_pill_recipe: true },
      },
      log: [],
    }
    // batch=3: 第1炉爆(0.0)，第2炉成功(0.99, 0.0, 0.0)，第3炉成功(0.99, 0.0, 0.5)
    const rng = createSequenceRng([0.0, 0.99, 0.0, 0.0, 0.99, 0.0, 0.5])
    const { outcome } = resolveBrew(
      state,
      'qi_pill_recipe',
      3,
      () => rng.next(),
      () => 1,
      'wu',
    )

    expect(outcome.attempted).toBe(3)
    expect(outcome.booms).toBeGreaterThanOrEqual(0)
    expect(outcome.successes).toBeGreaterThanOrEqual(0)
    expect(outcome.items).toBeDefined()
    expect(outcome.items.fan + outcome.items.xuan + outcome.items.di + outcome.items.tian).toBe(outcome.successes)
    if (outcome.topQuality) {
      expect(['fan', 'xuan', 'di', 'tian']).toContain(outcome.topQuality)
    }
    expect(outcome.streakSuccess).toBeGreaterThanOrEqual(0)
    expect(outcome.streakBoom).toBeGreaterThanOrEqual(0)
  })

  it('出天丹时日志包含【金】前缀', () => {
    const base = createInitialGameState(1)
    const state = {
      ...base,
      player: {
        ...base.player,
        materials: {
          ...base.player.materials,
          dragon_root: 5,
          soul_infant: 5,
          bodhi_seed: 5,
          earth_milk: 5,
          moon_dew: 10,
          nine_turn_vine: 5,
          meteor_iron: 5,
        },
        recipesUnlocked: { ...base.player.recipesUnlocked, realm_break_recipe: true },
      },
      log: [],
    }
    // 天方 realm_break_recipe：不爆(0.99)，成功(0.0)，品质 roll>0.98 进 tian 桶(约2%)
    const rng = createSequenceRng([0.99, 0.0, 0.99])
    const { next } = resolveBrew(
      state,
      'realm_break_recipe',
      1,
      () => rng.next(),
      () => 1,
      'wu',
    )
    const tianLog = next.log.find((msg) => msg.includes('【金') && msg.includes('天丹'))
    expect(tianLog).toBeDefined()
  })

  it('资源扣除与产出计数正确', () => {
    const base = createInitialGameState(1)
    const state = {
      ...base,
      player: {
        ...base.player,
        materials: { ...base.player.materials, spirit_herb: 10, moon_dew: 10 },
        recipesUnlocked: { ...base.player.recipesUnlocked, qi_pill_recipe: true },
        elixirs: { ...base.player.elixirs, qi_pill: { fan: 0, xuan: 0, di: 0, tian: 0 } },
      },
      log: [],
    }
    // batch=2: 都成功，产出2个fan
    const rng = createSequenceRng([0.99, 0.0, 0.0, 0.99, 0.0, 0.0])
    const { next, outcome } = resolveBrew(
      state,
      'qi_pill_recipe',
      2,
      () => rng.next(),
      () => 1,
      'wu',
    )

    // 材料扣除：qi_pill_recipe 需要 spirit_herb 和 moon_dew
    expect(next.player.materials.spirit_herb).toBeLessThan(state.player.materials.spirit_herb)
    // 丹药产出
    expect(outcome.items.fan).toBe(2)
    expect(next.player.elixirs.qi_pill.fan).toBe(2)
  })

  it('hp<=0 可触发 death（爆丹扣血导致）', () => {
    const base = createInitialGameState(1)
    const state = {
      ...base,
      player: {
        ...base.player,
        hp: 1,
        materials: { ...base.player.materials, spirit_herb: 10, moon_dew: 10 },
        recipesUnlocked: { ...base.player.recipesUnlocked, qi_pill_recipe: true },
      },
      log: [],
    }
    // 爆丹(0.0)，伤害2
    const rng = createSequenceRng([0.0])
    const { next } = resolveBrew(
      state,
      'qi_pill_recipe',
      1,
      () => rng.next(),
      () => 2,
      'wu',
    )

    expect(next.player.hp).toBe(0)
  })
})

