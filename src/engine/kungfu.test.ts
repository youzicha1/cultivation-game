import { describe, expect, it } from 'vitest'
import {
  buildKungfaModifiers,
  getEquippedKungfa,
  getKungfu,
  getAllKungfu,
} from './kungfu'
import { makePlayer } from './test/factories'

describe('kungfu', () => {
  it('getAllKungfu 返回 12 本功法', () => {
    const list = getAllKungfu()
    expect(list.length).toBe(12)
    expect(list.every((k) => k.id && k.name && k.rarity && k.shortDesc && k.sourceHint)).toBe(true)
  })

  it('getKungfu 返回指定功法', () => {
    const k = getKungfu('steady_heart')
    expect(k).toBeDefined()
    expect(k?.name).toBe('稳心诀')
    expect(k?.effects?.explore_retreat_add).toBe(0.06)
  })

  it('getEquippedKungfa 按槽位顺序返回已装备功法', () => {
    const state = { player: makePlayer({ relics: ['steady_heart', 'fire_suppress'], equippedRelics: ['fire_suppress', null, 'steady_heart'] }) }
    const equipped = getEquippedKungfa(state)
    expect(equipped.length).toBe(2)
    expect(equipped[0].id).toBe('fire_suppress')
    expect(equipped[1].id).toBe('steady_heart')
  })

  it('buildKungfaModifiers 无装备时为默认值', () => {
    const state = { player: makePlayer() }
    const ctx = buildKungfaModifiers(state)
    expect(ctx.exploreRetreatAdd).toBe(0)
    expect(ctx.exploreDangerIncMul).toBe(1)
    expect(ctx.alchemyBoomMul).toBe(1)
    expect(ctx.breakthroughRateAdd).toBe(0)
  })

  it('buildKungfaModifiers 装备稳心诀后 exploreRetreatAdd > 0', () => {
    const state = { player: makePlayer({ relics: ['steady_heart'], equippedRelics: ['steady_heart', null, null] }) }
    const ctx = buildKungfaModifiers(state)
    expect(ctx.exploreRetreatAdd).toBeGreaterThan(0)
  })

  it('buildKungfaModifiers 装备深境诀后 exploreDangerIncMul < 1', () => {
    const state = { player: makePlayer({ relics: ['depth_vision'], equippedRelics: ['depth_vision', null, null] }) }
    const ctx = buildKungfaModifiers(state)
    expect(ctx.exploreDangerIncMul).toBeLessThan(1)
  })

  it('buildKungfaModifiers 装备镇火诀后 alchemyBoomMul < 1', () => {
    const state = { player: makePlayer({ relics: ['fire_suppress'], equippedRelics: ['fire_suppress', null, null] }) }
    const ctx = buildKungfaModifiers(state)
    expect(ctx.alchemyBoomMul).toBeLessThan(1)
  })

  it('buildKungfaModifiers 装备破境诀后 breakthroughRateAdd > 0', () => {
    const state = { player: makePlayer({ relics: ['breakthrough_boost'], equippedRelics: ['breakthrough_boost', null, null] }) }
    const ctx = buildKungfaModifiers(state)
    expect(ctx.breakthroughRateAdd).toBeGreaterThan(0)
  })
})
