/**
 * TICKET-5: 遗物/功法（永久收集，可装备，影响探索/炼丹/突破）
 * - 影响：爆丹率-、撤退成功率+、天品质概率+ 等
 * - 装备上限 3，形成 build
 */

/** TICKET-10: 功法 ID 与 kungfu.v1.json 一致，共 12 本 */
export const RELIC_IDS = [
  'steady_heart',
  'shallow_breath',
  'lucky_cauldron',
  'retreat_charm',
  'depth_vision',
  'loot_fortune',
  'fire_suppress',
  'heaven_shift',
  'breakthrough_boost',
  'tian_blessing',
  'streak_guard',
  'legendary_eye',
] as const

export type RelicId = (typeof RELIC_IDS)[number]

export type RelicDef = {
  id: RelicId
  name: string
  desc: string
  /** @deprecated 用 kungfu buildKungfaModifiers */
  boomRateMultiplier?: number
  /** @deprecated 用 kungfu buildKungfaModifiers */
  retreatBonus?: number
  /** @deprecated 用 kungfu buildKungfaModifiers */
  tianQualityMultiplier?: number
}

/** 兼容 UI/列表用，效果以 kungfu.ts + kungfu.v1.json 为准 */
export const relicRegistry: Record<RelicId, RelicDef> = {
  steady_heart: { id: 'steady_heart', name: '稳心诀', desc: '撤退更稳' },
  shallow_breath: { id: 'shallow_breath', name: '浅息诀', desc: '深入危险增幅略减' },
  lucky_cauldron: { id: 'lucky_cauldron', name: '稳炉符', desc: '爆丹率降低' },
  retreat_charm: { id: 'retreat_charm', name: '退避玉', desc: '撤退成功率提升' },
  depth_vision: { id: 'depth_vision', name: '深境诀', desc: '深入危险增幅减小' },
  loot_fortune: { id: 'loot_fortune', name: '拾缘诀', desc: '稀有/传说掉落提升' },
  fire_suppress: { id: 'fire_suppress', name: '镇火诀', desc: '爆丹率大幅降低' },
  heaven_shift: { id: 'heaven_shift', name: '向天诀', desc: '品质向地/天偏移' },
  breakthrough_boost: { id: 'breakthrough_boost', name: '破境诀', desc: '突破成功率加成' },
  tian_blessing: { id: 'tian_blessing', name: '天缘石', desc: '天品质概率提升' },
  streak_guard: { id: 'streak_guard', name: '连斩护符', desc: '收手保留连斩层数' },
  legendary_eye: { id: 'legendary_eye', name: '天机眼', desc: '传说掉落+撤退稳' },
}

export function getRelic(id: RelicId): RelicDef {
  return relicRegistry[id]
}
