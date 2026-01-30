import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { AlchemyResultEffect, getAlchemyResultGrade } from './AlchemyResultEffect'

describe('getAlchemyResultGrade', () => {
  it('returns fail when items is undefined', () => {
    expect(getAlchemyResultGrade(undefined, false)).toBe('fail')
    expect(getAlchemyResultGrade(undefined, true)).toBe('fail')
  })

  it('returns tian when items.tian > 0', () => {
    expect(getAlchemyResultGrade({ fan: 0, xuan: 0, di: 0, tian: 1 }, false)).toBe('tian')
    expect(getAlchemyResultGrade({ fan: 2, xuan: 1, di: 1, tian: 1 }, true)).toBe('tian')
  })

  it('returns di when items.di > 0 and tian is 0', () => {
    expect(getAlchemyResultGrade({ fan: 0, xuan: 0, di: 1, tian: 0 }, false)).toBe('di')
    expect(getAlchemyResultGrade({ fan: 1, xuan: 1, di: 2, tian: 0 }, true)).toBe('di')
  })

  it('returns xuan when only xuan/fan have count', () => {
    expect(getAlchemyResultGrade({ fan: 0, xuan: 1, di: 0, tian: 0 }, false)).toBe('xuan')
    expect(getAlchemyResultGrade({ fan: 1, xuan: 2, di: 0, tian: 0 }, false)).toBe('xuan')
  })

  it('returns fan when only fan has count', () => {
    expect(getAlchemyResultGrade({ fan: 1, xuan: 0, di: 0, tian: 0 }, false)).toBe('fan')
    expect(getAlchemyResultGrade({ fan: 3, xuan: 0, di: 0, tian: 0 }, false)).toBe('fan')
  })

  it('returns fail when all item counts are 0', () => {
    expect(getAlchemyResultGrade({ fan: 0, xuan: 0, di: 0, tian: 0 }, false)).toBe('fail')
  })
})

describe('AlchemyResultEffect', () => {
  it('renders root with grade class and role', () => {
    const { container } = render(<AlchemyResultEffect grade="tian" />)
    const root = container.firstElementChild
    expect(root).toBeTruthy()
    expect(root?.getAttribute('class')).toContain('alchemy-result-effect')
    expect(root?.getAttribute('class')).toContain('alchemy-result-effect--tian')
    expect(root?.getAttribute('role')).toBe('presentation')
    expect(root?.getAttribute('aria-hidden')).toBe('true')
  })

  it('adds boom class when hasBoom is true', () => {
    const { container } = render(<AlchemyResultEffect grade="di" hasBoom />)
    const root = container.firstElementChild
    expect(root?.getAttribute('class')).toContain('alchemy-result-effect--boom')
  })

  it('does not add boom class when hasBoom is false', () => {
    const { container } = render(<AlchemyResultEffect grade="di" />)
    const root = container.firstElementChild
    expect(root?.getAttribute('class')).not.toContain('alchemy-result-effect--boom')
  })

  it('renders burst for tian, di, xuan', () => {
    const { container } = render(<AlchemyResultEffect grade="tian" />)
    expect(container.querySelector('.alchemy-result-effect__burst')).toBeTruthy()

    const { container: c2 } = render(<AlchemyResultEffect grade="di" />)
    expect(c2.querySelector('.alchemy-result-effect__burst')).toBeTruthy()

    const { container: c3 } = render(<AlchemyResultEffect grade="xuan" />)
    expect(c3.querySelector('.alchemy-result-effect__burst')).toBeTruthy()
  })

  it('does not render burst for fan or fail', () => {
    const { container: cFan } = render(<AlchemyResultEffect grade="fan" />)
    expect(cFan.querySelector('.alchemy-result-effect__burst')).toBeFalsy()

    const { container: cFail } = render(<AlchemyResultEffect grade="fail" />)
    expect(cFail.querySelector('.alchemy-result-effect__burst')).toBeFalsy()
  })

  it('renders correct particle count per grade', () => {
    const counts: Array<{ grade: 'tian' | 'di' | 'xuan' | 'fan' | 'fail'; expected: number }> = [
      { grade: 'tian', expected: 48 },
      { grade: 'di', expected: 24 },
      { grade: 'xuan', expected: 14 },
      { grade: 'fan', expected: 6 },
      { grade: 'fail', expected: 4 },
    ]
    for (const { grade, expected } of counts) {
      const { container } = render(<AlchemyResultEffect grade={grade} />)
      const particles = container.querySelectorAll('.alchemy-result-effect__particle')
      expect(particles.length).toBe(expected)
    }
  })

  it('renders stars only for tian grade', () => {
    const { container: cTian } = render(<AlchemyResultEffect grade="tian" />)
    const stars = cTian.querySelectorAll('.alchemy-result-effect__star')
    expect(stars.length).toBe(12)

    const { container: cDi } = render(<AlchemyResultEffect grade="di" />)
    expect(cDi.querySelector('.alchemy-result-effect__stars')).toBeFalsy()
  })
})
