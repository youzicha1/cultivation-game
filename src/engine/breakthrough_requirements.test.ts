import { describe, expect, it } from 'vitest'
import {
  hasBreakthroughPrereq,
  getRequiredKungfuForTargetRealm,
  prevRealm,
  REALMS,
} from './breakthrough_requirements'

describe('breakthrough_requirements', () => {
  it('REALMS 长度为 6', () => {
    expect(REALMS).toHaveLength(6)
    expect(REALMS[0]).toBe('凡人')
    expect(REALMS[5]).toBe('化神')
  })

  it('getRequiredKungfuForTargetRealm: 炼气/筑基 无要求，金丹需破境诀', () => {
    expect(getRequiredKungfuForTargetRealm(1)).toBeUndefined()
    expect(getRequiredKungfuForTargetRealm(2)).toBeUndefined()
    expect(getRequiredKungfuForTargetRealm(3)).toBe('breakthrough_boost')
    expect(getRequiredKungfuForTargetRealm(4)).toBe('tian_blessing')
    expect(getRequiredKungfuForTargetRealm(5)).toBe('legendary_eye')
  })

  it('hasBreakthroughPrereq: 无要求境界恒为 true', () => {
    expect(hasBreakthroughPrereq([], 1)).toBe(true)
    expect(hasBreakthroughPrereq([], 2)).toBe(true)
  })

  it('hasBreakthroughPrereq: 金丹需破境诀', () => {
    expect(hasBreakthroughPrereq([], 3)).toBe(false)
    expect(hasBreakthroughPrereq(['breakthrough_boost'], 3)).toBe(true)
    expect(hasBreakthroughPrereq(['other'], 3)).toBe(false)
  })

  it('prevRealm: 凡人不再降，炼气→凡人', () => {
    expect(prevRealm('凡人')).toBe('凡人')
    expect(prevRealm('炼气')).toBe('凡人')
    expect(prevRealm('筑基')).toBe('炼气')
    expect(prevRealm('化神')).toBe('元婴')
  })
})
