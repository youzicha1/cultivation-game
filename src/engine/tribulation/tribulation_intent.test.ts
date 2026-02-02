/**
 * TICKET-36: 天劫意图扩容测试 — minTier 门槛、权重分布、counter 生效
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game'
import { createSeededRng, createSequenceRng } from '../rng'
import {
  getTribulationIntents,
  getIntentById,
  rollIntent,
} from './tribulation_intents'
import {
  startTribulation,
  getTribulationTurnView,
  applyTribulationAction,
} from './tribulation'

describe('tribulation_intent', () => {
  describe('内容与数量', () => {
    it('意图总数 ≥12，稀有意图 ≥3', () => {
      const intents = getTribulationIntents()
      expect(intents.length).toBeGreaterThanOrEqual(12)
      const rare = intents.filter((i) => i.rarity === 'rare')
      expect(rare.length).toBeGreaterThanOrEqual(3)
    })

    it('每条意图有 telegraphText 与 counterHint', () => {
      const intents = getTribulationIntents()
      for (const i of intents) {
        expect(i.telegraphText).toBeDefined()
        expect(String(i.telegraphText).length).toBeGreaterThan(0)
        expect(i.counterHint).toBeDefined()
        expect(String(i.counterHint).length).toBeGreaterThan(0)
      }
    })
  })

  describe('minTier 门槛', () => {
    it('低 tier（1）时 rollIntent 只返回 minTier≤1 的意图，不含稀有', () => {
      const rng = createSeededRng(123)
      const rareIds = getTribulationIntents()
        .filter((i) => i.rarity === 'rare')
        .map((i) => i.id)
      for (let i = 0; i < 50; i++) {
        const intent = rollIntent(1, rng)
        expect(intent.minTier).toBeLessThanOrEqual(1)
        expect(rareIds).not.toContain(intent.id)
      }
    })

    it('高 tier（6+）时 rollIntent 可能返回稀有意图', () => {
      const rng = createSeededRng(456)
      const rareIds = new Set(
        getTribulationIntents().filter((i) => i.rarity === 'rare').map((i) => i.id),
      )
      let gotRare = false
      for (let i = 0; i < 80; i++) {
        const intent = rollIntent(8, rng)
        if (rareIds.has(intent.id)) gotRare = true
      }
      expect(gotRare).toBe(true)
    })
  })

  describe('counter 生效', () => {
    it('GUARD 比 STEADY 承伤更少（同一意图、同一 rng）', () => {
      const state = createInitialGameState(1)
      const withTrib = startTribulation(
        { ...state, player: { ...state.player, hp: 200, maxHp: 200 } },
        createSeededRng(1),
      )
      const viewBefore = getTribulationTurnView(withTrib)
      expect(viewBefore).not.toBeNull()
      const rngSteady = createSequenceRng([0.5, 0.5, 0], false)
      const rngGuard = createSequenceRng([0.5, 0.5, 0], false)
      const { state: afterSteady } = applyTribulationAction(withTrib, 'STEADY', rngSteady)
      const { state: afterGuard } = applyTribulationAction(withTrib, 'GUARD', rngGuard)
      const hpLossSteady = withTrib.player.hp - afterSteady.player.hp
      const hpLossGuard = withTrib.player.hp - afterGuard.player.hp
      expect(hpLossGuard).toBeLessThanOrEqual(hpLossSteady)
    })

    it('意图带 addDebuff 时回合后 debuff 正确叠加（STEADY 先清已有再结算意图）', () => {
      const mindIntent = getIntentById('mind_demon')
      expect(mindIntent?.addDebuff?.key).toBe('mindChaos')
      const state = createInitialGameState(1)
      const rng = createSequenceRng([0, 0.1, 0], false)
      const withTrib = startTribulation(state, rng)
      const trib = withTrib.run.tribulation!
      const withMindIntent = {
        ...withTrib,
        run: {
          ...withTrib.run,
          tribulation: { ...trib, currentIntent: mindIntent! },
        },
      }
      const { state: next } = applyTribulationAction(withMindIntent, 'STEADY', rng)
      expect(next.run.tribulation?.debuffs.mindChaos).toBe(1)
    })
  })

  describe('getTribulationTurnView 含 telegraphText / counterHint', () => {
    it('view.intent 包含 telegraphText 与 counterHint', () => {
      const state = createInitialGameState(1)
      const withTrib = startTribulation(state, createSeededRng(2))
      const view = getTribulationTurnView(withTrib)
      expect(view).not.toBeNull()
      expect(view!.intent.telegraphText).toBeDefined()
      expect(view!.intent.counterHint).toBeDefined()
    })
  })
})
