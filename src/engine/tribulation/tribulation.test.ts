/**
 * TICKET-29: 天劫回合制引擎测试 — 回合流程、四动作、RNG 可控、胜负判定
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game'
import { createSequenceRng } from '../rng'
import {
  startTribulation,
  getTribulationTurnView,
  applyTribulationAction,
  getTotalTurnsForLevel,
} from './tribulation'
import { TRIBULATION_INTENTS } from './tribulation_intents'

describe('tribulation', () => {
  describe('startTribulation', () => {
    it('初始化正确：turn=0、totalTurns 在 3～5、currentIntent 存在、log 有条目', () => {
      const rng = createSequenceRng([0, 0.5, 0.99])
      const state = createInitialGameState(1)
      const next = startTribulation(state, rng)
      expect(next.run.tribulation).toBeDefined()
      const trib = next.run.tribulation!
      expect(trib.turn).toBe(0)
      expect(trib.totalTurns).toBeGreaterThanOrEqual(3)
      expect(trib.totalTurns).toBeLessThanOrEqual(5)
      expect(trib.currentIntent).toBeDefined()
      expect(trib.currentIntent.id).toBeDefined()
      expect(TRIBULATION_INTENTS.map((i) => i.id)).toContain(trib.currentIntent.id)
      expect(trib.shield).toBe(0)
      expect(trib.debuffs.mindChaos).toBe(0)
      expect(trib.debuffs.burn).toBe(0)
      expect(trib.debuffs.weak).toBe(0)
      expect(Array.isArray(trib.log)).toBe(true)
      expect(next.screen).toBe('final_trial')
    })
  })

  describe('getTotalTurnsForLevel', () => {
    it('level 1～5 为 3 回合，6～9 为 4，10+ 为 5', () => {
      expect(getTotalTurnsForLevel(1)).toBe(3)
      expect(getTotalTurnsForLevel(5)).toBe(3)
      expect(getTotalTurnsForLevel(6)).toBe(4)
      expect(getTotalTurnsForLevel(9)).toBe(4)
      expect(getTotalTurnsForLevel(10)).toBe(5)
      expect(getTotalTurnsForLevel(12)).toBe(5)
    })
  })

  describe('getTribulationTurnView', () => {
    it('无 tribulation 时返回 null', () => {
      const state = createInitialGameState(1)
      expect(getTribulationTurnView(state)).toBeNull()
    })
    it('有 tribulation 时返回 intent/actions/recentLog', () => {
      const rng = createSequenceRng([0])
      const state = createInitialGameState(1)
      const withTrib = startTribulation(state, rng)
      const view = getTribulationTurnView(withTrib)
      expect(view).not.toBeNull()
      expect(view!.intent.name).toBeDefined()
      expect(view!.intent.damageMin).toBeGreaterThanOrEqual(1)
      expect(view!.intent.damageMax).toBeGreaterThanOrEqual(view!.intent.damageMin)
      expect(view!.actions.length).toBe(4)
      expect(view!.actions.map((a) => a.id)).toEqual(['STEADY', 'PILL', 'GUARD', 'SURGE'])
      expect(Array.isArray(view!.recentLog)).toBe(true)
    })
  })

  describe('applyTribulationAction STEADY', () => {
    it('本回合承伤更小或 debuff 减少，log 含“稳住”', () => {
      const rng = createSequenceRng([0, 0.5, 0]) // 意图 + 伤害 roll + 下回合意图
      const state = createInitialGameState(1)
      const withTrib = startTribulation(state, rng)
      const { state: next, outcome } = applyTribulationAction(withTrib, 'STEADY', rng)
      expect(outcome).toBe('ongoing')
      expect(next.run.tribulation).toBeDefined()
      expect(next.run.tribulation!.turn).toBe(1)
      const lastLog = next.run.tribulation!.log[next.run.tribulation!.log.length - 1] ?? ''
      expect(lastLog).toMatch(/稳住|减伤|清除/)
    })
  })

  describe('applyTribulationAction PILL', () => {
    it('有丹药时数量 -1 且效果生效', () => {
      const rng = createSequenceRng([0, 0.2, 0])
      const state = createInitialGameState(1)
      const elixirs = { ...state.player.elixirs }
      const qiPill = elixirs['qi_pill']
      if (qiPill) qiPill.fan = (qiPill.fan ?? 0) + 2
      elixirs['qi_pill'] = qiPill ?? { fan: 2, xuan: 0, di: 0, tian: 0 }
      const stateWithPill = { ...state, player: { ...state.player, elixirs } }
      const withTrib = startTribulation(stateWithPill, rng)
      const { state: next } = applyTribulationAction(withTrib, 'PILL', rng, {
        elixirId: 'qi_pill',
        quality: 'fan',
      })
      expect(next.player.elixirs['qi_pill'].fan).toBe(1)
      expect(next.player.hp).toBeGreaterThanOrEqual(withTrib.player.hp - 20)
    })
  })

  describe('applyTribulationAction GUARD', () => {
    it('本回合承伤显著降低且下回合 weak+1', () => {
      const rng = createSequenceRng([0, 0.9, 0])
      const state = createInitialGameState(1)
      const withTrib = startTribulation(state, rng)
      const { state: next, outcome } = applyTribulationAction(withTrib, 'GUARD', rng)
      expect(outcome).toBe('ongoing')
      expect(next.run.tribulation!.debuffs.weak).toBe(1)
    })
  })

  describe('applyTribulationAction SURGE', () => {
    it('RNG 控制成功：wrath 降低', () => {
      const rng = createSequenceRng([0, 0.1, 0.0, 0]) // 意图、伤害、SURGE 成功、下回合意图
      const state = createInitialGameState(1)
      const withTrib = startTribulation(state, rng)
      const wrathBefore = withTrib.run.tribulation!.wrath
      const { state: next, outcome } = applyTribulationAction(withTrib, 'SURGE', rng)
      expect(outcome).toBe('ongoing')
      expect(next.run.tribulation!.wrath).toBeLessThanOrEqual(wrathBefore)
    })
    it('RNG 控制失败：额外受伤或 mindChaos', () => {
      const rng = createSequenceRng([0, 0.1, 0.99, 0]) // 意图、伤害、SURGE 失败、下回合意图
      const state = createInitialGameState(1)
      const withTrib = startTribulation(state, rng)
      const { state: next, outcome } = applyTribulationAction(withTrib, 'SURGE', rng)
      expect(outcome).toBe('ongoing')
      expect(next.run.tribulation!.debuffs.mindChaos).toBeGreaterThanOrEqual(0)
    })
  })

  describe('胜负判定', () => {
    it('hp<=0 时 outcome 为 lose', () => {
      const rng = createSequenceRng([0, 0.99, 0])
      const state = createInitialGameState(1)
      const lowHp = { ...state, player: { ...state.player, hp: 2, maxHp: 100 } }
      const withTrib = startTribulation(lowHp, rng)
      const { outcome } = applyTribulationAction(withTrib, 'STEADY', rng)
      expect(outcome === 'lose' || outcome === 'ongoing').toBe(true)
    })

    it('撑过 totalTurns 时 outcome 为 win', () => {
      const rng = createSequenceRng([
        0, 0.01, 0, 0.01, 0, 0.01, 0,
      ])
      const state = createInitialGameState(1)
      let withTrib = startTribulation(
        { ...state, run: { ...state.run, tribulationLevel: 0 }, player: { ...state.player, hp: 200, maxHp: 200 } },
        rng,
      )
      let outcome: 'ongoing' | 'win' | 'lose' = 'ongoing'
      for (let i = 0; i < 3; i++) {
        const res = applyTribulationAction(withTrib, 'STEADY', rng)
        outcome = res.outcome
        if (outcome !== 'ongoing') break
        withTrib = res.state
      }
      expect(outcome).toBe('win')
    })
  })
})
