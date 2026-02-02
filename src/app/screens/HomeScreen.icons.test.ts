/**
 * TICKET-31: 主界面入口图标映射完整 — 每个 route 都有合法 iconName
 */

import { describe, it, expect } from 'vitest'
import { HOME_ENTRIES } from './HomeScreen'
import { ATMOS_ICON_NAMES } from '../ui/IconArt'

describe('HomeScreen icons', () => {
  it('主界面入口列表里每个 entry 都有 iconName 且在 ATMOS_ICON_NAMES 中', () => {
    const names = new Set(ATMOS_ICON_NAMES)
    HOME_ENTRIES.forEach((entry) => {
      expect(entry.iconName).toBeDefined()
      expect(names.has(entry.iconName)).toBe(true)
    })
  })

  it('主界面入口数量与预期一致', () => {
    expect(HOME_ENTRIES.length).toBeGreaterThanOrEqual(8)
    const ids = new Set(HOME_ENTRIES.map((e) => e.id))
    expect(ids.size).toBe(HOME_ENTRIES.length)
  })
})
