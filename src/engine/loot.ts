/**
 * TICKET-7: 探索掉落表系统
 * - 材料/残页/丹药/遗物碎片分四稀有度：common/rare/epic/legendary
 * - danger/streak 越高，稀有掉落权重提升
 * - 每次深入至少一次掉落，事件结算额外掉落
 */

import type { MaterialId, RecipeId } from './alchemy'
import type { RelicId } from './relics'
import type { Rng } from './rng'

export type LootRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type LootItem =
  | { type: 'material'; id: MaterialId; count: number }
  | { type: 'fragment'; id: RecipeId; count: number }
  | { type: 'pills'; count: number }
  | { type: 'relic_fragment'; id: RelicId; count: number }
  /** TICKET-10: 功法整本掉落（已有则转传承点+1） */
  | { type: 'kungfu'; id: RelicId }

export type LootDrop = {
  rarity: LootRarity
  item: LootItem
}

/** 掉落稀有度基础权重（四档） */
export const LOOT_RARITY_WEIGHT: Record<LootRarity, number> = {
  common: 100,
  rare: 30,
  epic: 8,
  legendary: 2,
}

/** 掉落表：每个稀有度对应的掉落池 */
export type LootTableEntry = {
  rarity: LootRarity
  weight: number
  drops: Array<{
    item: LootItem
    weight: number
  }>
}

const LOOT_TABLE: LootTableEntry[] = [
  {
    rarity: 'common',
    weight: LOOT_RARITY_WEIGHT.common,
    drops: [
      { item: { type: 'material', id: 'spirit_herb', count: 1 }, weight: 40 },
      { item: { type: 'material', id: 'iron_sand', count: 1 }, weight: 30 },
      { item: { type: 'pills', count: 1 }, weight: 30 },
    ],
  },
  {
    rarity: 'rare',
    weight: LOOT_RARITY_WEIGHT.rare,
    drops: [
      { item: { type: 'material', id: 'beast_core', count: 1 }, weight: 30 },
      { item: { type: 'material', id: 'moon_dew', count: 1 }, weight: 22 },
      { item: { type: 'fragment', id: 'spirit_pill_recipe', count: 1 }, weight: 22 },
      { item: { type: 'pills', count: 2 }, weight: 12 },
      { item: { type: 'kungfu', id: 'steady_heart' }, weight: 7 },
      { item: { type: 'kungfu', id: 'shallow_breath' }, weight: 7 },
    ],
  },
  {
    rarity: 'epic',
    weight: LOOT_RARITY_WEIGHT.epic,
    drops: [
      { item: { type: 'material', id: 'moon_dew', count: 2 }, weight: 25 },
      { item: { type: 'fragment', id: 'foundation_pill_recipe', count: 1 }, weight: 25 },
      { item: { type: 'pills', count: 3 }, weight: 15 },
      { item: { type: 'kungfu', id: 'lucky_cauldron' }, weight: 12 },
      { item: { type: 'kungfu', id: 'retreat_charm' }, weight: 10 },
      { item: { type: 'kungfu', id: 'fire_suppress' }, weight: 8 },
    ],
  },
  {
    rarity: 'legendary',
    weight: LOOT_RARITY_WEIGHT.legendary,
    drops: [
      { item: { type: 'material', id: 'moon_dew', count: 3 }, weight: 20 },
      { item: { type: 'fragment', id: 'foundation_pill_recipe', count: 2 }, weight: 20 },
      { item: { type: 'pills', count: 5 }, weight: 15 },
      { item: { type: 'kungfu', id: 'breakthrough_boost' }, weight: 15 },
      { item: { type: 'kungfu', id: 'tian_blessing' }, weight: 15 },
      { item: { type: 'kungfu', id: 'legendary_eye' }, weight: 15 },
    ],
  },
]

/** 功法对稀有度权重的乘数（默认 1） */
export type LootKungfuMod = {
  lootRareMul?: number
  lootLegendMul?: number
}

/** TICKET-13: 保底对传奇权重的乘数 + 是否强制传奇 */
export type LootPityMod = {
  legendWeightMul?: number
  forceLegendary?: boolean
}

/** 计算掉落稀有度权重（基于 danger 和 streak）
 * 
 * 概率设计：
 * - danger < 30: common(100), rare(20), epic(0), legendary(0)
 * - danger 30-49: common(100), rare(30), epic(5), legendary(0)
 * - danger 50-69: common(100), rare(40), epic(10), legendary(0)
 * - danger 70-84: common(100), rare(50), epic(20), legendary(2)
 * - danger 85+: common(100), rare(60), epic(30), legendary(5)
 * 
 * streak 加成（仅在对应稀有度可用时生效）：
 * - streak≥8: epic×1.3, legendary×1.2
 * - streak≥5: rare×1.2, epic×1.1
 * - streak≥3: rare×1.1
 * TICKET-10: kungfuMod 对 rare/epic/legendary 权重乘算
 */
export function getLootRarityWeight(
  rarity: LootRarity,
  danger: number,
  streak: number,
  kungfuMod?: LootKungfuMod,
  pityMod?: LootPityMod,
): number {
  if (pityMod?.forceLegendary) {
    return rarity === 'legendary' ? 1 : 0
  }

  let w: number

  // 根据危险度设置基础权重
  if (danger < 30) {
    // 低危险：主要是 common，少量 rare
    w = rarity === 'common' ? 100 : rarity === 'rare' ? 20 : 0
  } else if (danger < 50) {
    // 中低危险：common 为主，rare 增加，少量 epic
    w = rarity === 'common' ? 100 : rarity === 'rare' ? 30 : rarity === 'epic' ? 5 : 0
  } else if (danger < 70) {
    // 中高危险：common/rare 为主，epic 增加，仍无 legendary
    w = rarity === 'common' ? 100 : rarity === 'rare' ? 40 : rarity === 'epic' ? 10 : 0
  } else if (danger < 85) {
    // 高危险：legendary 开始出现但很低
    w = rarity === 'common' ? 100 : rarity === 'rare' ? 50 : rarity === 'epic' ? 20 : rarity === 'legendary' ? 2 : 0
  } else {
    // 极高危险：legendary 概率明显提升
    w = rarity === 'common' ? 100 : rarity === 'rare' ? 60 : rarity === 'epic' ? 30 : rarity === 'legendary' ? 5 : 0
  }

  // streak 加成（仅在对应稀有度可用时生效）
  if (w > 0) {
    if (streak >= 8) {
      if (rarity === 'epic') w *= 1.3
      else if (rarity === 'legendary') w *= 1.2
    } else if (streak >= 5) {
      if (rarity === 'rare') w *= 1.2
      else if (rarity === 'epic') w *= 1.1
    } else if (streak >= 3) {
      if (rarity === 'rare') w *= 1.1
    }
  }

  if (kungfuMod && w > 0) {
    if (rarity === 'rare') w *= kungfuMod.lootRareMul ?? 1
    else if (rarity === 'epic') w *= kungfuMod.lootRareMul ?? 1
    else if (rarity === 'legendary') w *= kungfuMod.lootLegendMul ?? 1
  }

  if (pityMod?.legendWeightMul && rarity === 'legendary' && w > 0) {
    w *= pityMod.legendWeightMul
  }

  return Math.max(0, w)
}

/** 从掉落表中抽取一个掉落（每次调用消耗 2 次 rng.next） */
export function rollLootDrop(
  rng: Rng,
  danger: number,
  streak: number,
  kungfuMod?: LootKungfuMod,
  pityMod?: LootPityMod,
): LootDrop {
  const weights = LOOT_TABLE.map((entry) =>
    getLootRarityWeight(entry.rarity, danger, streak, kungfuMod, pityMod),
  )
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  const roll = rng.next() * totalWeight
  let cursor = 0
  let selectedEntry: LootTableEntry | null = null
  for (let i = 0; i < LOOT_TABLE.length; i++) {
    cursor += weights[i]
    if (roll <= cursor) {
      selectedEntry = LOOT_TABLE[i]
      break
    }
  }
  if (!selectedEntry) selectedEntry = LOOT_TABLE[0]

  const dropTotalWeight = selectedEntry.drops.reduce((s, d) => s + d.weight, 0)
  const dropRoll = rng.next() * dropTotalWeight
  let dropCursor = 0
  let selectedDrop = selectedEntry.drops[0]
  for (const drop of selectedEntry.drops) {
    dropCursor += drop.weight
    if (dropRoll <= dropCursor) {
      selectedDrop = drop
      break
    }
  }

  return {
    rarity: selectedEntry.rarity,
    item: { ...selectedDrop.item },
  }
}

/** 获取稀有度显示标签 */
export function getRarityLabel(rarity: LootRarity): string {
  const labels: Record<LootRarity, string> = {
    common: '普通',
    rare: '稀有',
    epic: '史诗',
    legendary: '传说',
  }
  return labels[rarity]
}

/** 获取稀有度 Toast 文本 */
export function getRarityToastText(rarity: LootRarity): string {
  const texts: Record<LootRarity, string> = {
    common: '',
    rare: '灵光一闪！',
    epic: '紫气东来！',
    legendary: '天降机缘！！',
  }
  return texts[rarity]
}
