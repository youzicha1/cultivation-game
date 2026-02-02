/**
 * TICKET-31: AtmosIcon 护栏测试 — 所有 name 可渲染，未知 name 回退
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AtmosIcon, ATMOS_ICON_NAMES, type AtmosIconName } from './IconArt'

describe('AtmosIcon', () => {
  it('对所有 iconName 都能渲染', () => {
    ATMOS_ICON_NAMES.forEach((name) => {
      const { unmount } = render(<AtmosIcon name={name} size={24} />)
      const svg = document.querySelector('.atm-icon')
      expect(svg).toBeTruthy()
      expect(svg?.getAttribute('width')).toBe('24')
      expect(svg?.getAttribute('height')).toBe('24')
      unmount()
    })
  })

  it('不存在的 name 会返回 fallback（不崩）', () => {
    const badName = 'not_an_icon' as AtmosIconName
    expect(() => render(<AtmosIcon name={badName} size={24} />)).not.toThrow()
    const svg = document.querySelector('.atm-icon')
    expect(svg).toBeTruthy()
  })

  it('tone 会应用对应 class', () => {
    const { unmount } = render(<AtmosIcon name="alchemy" tone="gold" />)
    const el = document.querySelector('.atm-icon.atm-icon--gold')
    expect(el).toBeTruthy()
    unmount()
  })
})
