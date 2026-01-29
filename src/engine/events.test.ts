import { describe, expect, it } from 'vitest'
import { createSequenceRng } from './rng'
import {
  exploreEvents,
  pickExploreEvent,
  resolveExploreChoice,
  validateExploreEventsFile,
} from './events'
import { createInitialGameState, reduceGame } from './game'

describe('events', () => {
  it('validateExploreEventsFile version 不对会 throw', () => {
    expect(() =>
      validateExploreEventsFile({ version: 2, events: [] }),
    ).toThrow('unsupported version')
  })

  it('pickExploreEvent 在固定 rng 下选中预期事件', () => {
    const rng = createSequenceRng([0.0])
    const event = pickExploreEvent(rng, 0)
    expect(event.id).toBe('ancient_ruins')
  })

  it('pickExploreEvent 在危险度极高时也不会抛错', () => {
    const rng = createSequenceRng([0.5, 0.3])
    const event = pickExploreEvent(rng, 999)
    expect(event).toBeDefined()
  })

  it('resolveExploreChoice 可走 success 并应用效果', () => {
    const event = exploreEvents.find((item) => item.id === 'ancient_ruins')
    if (!event) {
      throw new Error('missing event')
    }
    const state = createInitialGameState(1)
    const rng = createSequenceRng([0.0, 0.0, 0.0, 0.0])
    const next = resolveExploreChoice(
      state,
      event,
      'A',
      () => rng.next(),
      (min, max) => {
        const value = min
        expect(value).toBeGreaterThanOrEqual(min)
        expect(value).toBeLessThanOrEqual(max)
        return value
      },
    )

    expect(next.log.length).toBeGreaterThanOrEqual(1)
    expect(next.player.exp).toBeGreaterThan(state.player.exp)
  })

  it('resolveExploreChoice 可走 fail 并扣血', () => {
    const event = exploreEvents.find((item) => item.id === 'mind_demon')
    if (!event) {
      throw new Error('missing event')
    }
    const state = createInitialGameState(1)
    const rng = createSequenceRng([0.99, 0.0])
    const next = resolveExploreChoice(
      state,
      event,
      'A',
      () => rng.next(),
      (min) => min,
    )

    expect(next.player.hp).toBeLessThan(state.player.hp)
  })

  it('reducer 深入抽事件写入 currentEvent，选择后清空', () => {
    const rng = createSequenceRng([0.99, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0])
    const state = createInitialGameState(1)
    const started = reduceGame(state, { type: 'EXPLORE_START' }, rng)
    const deepened = reduceGame(started, { type: 'EXPLORE_DEEPEN' }, rng)
    expect(deepened.run.currentEvent?.id).toBeDefined()
    expect(deepened.run.currentEvent?.title).toBeTruthy()

    const resolved = reduceGame(
      deepened,
      { type: 'EXPLORE_CHOOSE', choice: 'A' },
      rng,
    )
    expect(resolved.run.currentEvent).toBeUndefined()
    expect(resolved.screen).toBe('explore')
  })

  it('hp<=0 时进入 death 且 summary 有内容', () => {
    const event = exploreEvents.find((item) => item.id === 'beast_lair')
    if (!event) {
      throw new Error('missing event')
    }
    const state = {
      ...createInitialGameState(1),
      player: { ...createInitialGameState(1).player, hp: 1 },
    }
    const rng = createSequenceRng([0.99, 0.0])
    const next = resolveExploreChoice(
      state,
      event,
      'A',
      () => rng.next(),
      (min) => min,
    )

    expect(next.screen).toBe('death')
    expect(next.summary?.cause).toBeDefined()
  })
})
