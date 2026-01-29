import legacyTreeData from '../content/legacy_tree.v1.json'

export type LegacyBranch = 'explore' | 'alchemy' | 'breakthrough'

export type LegacyEffectType =
  | 'explore_retreat_add'
  | 'loot_rare_weight_mul'
  | 'explore_injury_reduction'
  | 'streak_chest_extra_drop'
  | 'explore_danger_inc_mul'
  | 'loot_legend_weight_mul'
  | 'alchemy_boom_rate_mul'
  | 'alchemy_success_add'
  | 'alchemy_quality_shift_blast'
  | 'alchemy_tian_pity_reduction'
  | 'alchemy_boom_damage_reduction'
  | 'alchemy_extra_yield_chance'
  | 'breakthrough_rate_add'
  | 'breakthrough_failure_damage_reduction'
  | 'breakthrough_pity_bonus'
  | 'breakthrough_pity_bonus_rate'
  | 'breakthrough_pill_bonus_mul'
  | 'breakthrough_death_protection_once'

export interface LegacyEffect {
  type: LegacyEffectType
  value: number
}

export interface LegacyUpgradeDef {
  id: string
  name: string
  desc: string
  branch: LegacyBranch
  cost: number
  prereqIds: string[]
  effect: LegacyEffect
  isKeyNode: boolean
}

interface LegacyTreeData {
  upgrades: LegacyUpgradeDef[]
}

const treeData = legacyTreeData as LegacyTreeData

// 验证数据
if (!Array.isArray(treeData.upgrades)) {
  throw new Error('legacy_tree.v1.json: upgrades must be an array')
}

const upgradesRegistry = new Map<string, LegacyUpgradeDef>()
for (const upgrade of treeData.upgrades) {
  if (upgradesRegistry.has(upgrade.id)) {
    throw new Error(`legacy_tree.v1.json: duplicate upgrade id: ${upgrade.id}`)
  }
  upgradesRegistry.set(upgrade.id, upgrade)
}

export function getLegacyUpgrade(id: string): LegacyUpgradeDef | undefined {
  return upgradesRegistry.get(id)
}

export function getAllLegacyUpgrades(): LegacyUpgradeDef[] {
  return Array.from(upgradesRegistry.values())
}

export function getLegacyUpgradesByBranch(branch: LegacyBranch): LegacyUpgradeDef[] {
  return treeData.upgrades.filter((u) => u.branch === branch)
}

export interface LegacyModifiers {
  // Explore
  exploreRetreatAdd: number
  lootRareWeightMul: number
  exploreInjuryReduction: number
  streakChestExtraDrop: number
  exploreDangerIncMul: number
  lootLegendWeightMul: number
  // Alchemy
  alchemyBoomRateMul: number
  alchemySuccessAdd: number
  alchemyQualityShiftBlast: number
  alchemyTianPityReduction: number
  alchemyBoomDamageReduction: number
  alchemyExtraYieldChance: number
  // Breakthrough
  breakthroughRateAdd: number
  breakthroughFailureDamageReduction: number
  breakthroughPityBonus: number
  breakthroughPityBonusRate: number
  breakthroughPillBonusMul: number
  breakthroughDeathProtectionOnce: number
}

const DEFAULT_MODIFIERS: LegacyModifiers = {
  exploreRetreatAdd: 0,
  lootRareWeightMul: 1.0,
  exploreInjuryReduction: 0,
  streakChestExtraDrop: 0,
  exploreDangerIncMul: 1.0,
  lootLegendWeightMul: 1.0,
  alchemyBoomRateMul: 1.0,
  alchemySuccessAdd: 0,
  alchemyQualityShiftBlast: 0,
  alchemyTianPityReduction: 0,
  alchemyBoomDamageReduction: 0,
  alchemyExtraYieldChance: 0,
  breakthroughRateAdd: 0,
  breakthroughFailureDamageReduction: 0,
  breakthroughPityBonus: 0,
  breakthroughPityBonusRate: 0,
  breakthroughPillBonusMul: 1.0,
  breakthroughDeathProtectionOnce: 0,
}

export function buildLegacyModifiers(meta?: { legacyUpgrades?: Record<string, number> }): LegacyModifiers {
  const ctx = { ...DEFAULT_MODIFIERS }
  const upgrades = meta?.legacyUpgrades ?? {}

  for (const [upgradeId, level] of Object.entries(upgrades)) {
    if (level <= 0) continue
    const def = getLegacyUpgrade(upgradeId)
    if (!def) continue

    const effect = def.effect
    switch (effect.type) {
      case 'explore_retreat_add':
        ctx.exploreRetreatAdd += effect.value
        break
      case 'loot_rare_weight_mul':
        ctx.lootRareWeightMul *= effect.value
        break
      case 'explore_injury_reduction':
        ctx.exploreInjuryReduction += effect.value
        break
      case 'streak_chest_extra_drop':
        ctx.streakChestExtraDrop += effect.value
        break
      case 'explore_danger_inc_mul':
        ctx.exploreDangerIncMul *= effect.value
        break
      case 'loot_legend_weight_mul':
        ctx.lootLegendWeightMul *= effect.value
        break
      case 'alchemy_boom_rate_mul':
        ctx.alchemyBoomRateMul *= effect.value
        break
      case 'alchemy_success_add':
        ctx.alchemySuccessAdd += effect.value
        break
      case 'alchemy_quality_shift_blast':
        ctx.alchemyQualityShiftBlast += effect.value
        break
      case 'alchemy_tian_pity_reduction':
        ctx.alchemyTianPityReduction += effect.value
        break
      case 'alchemy_boom_damage_reduction':
        ctx.alchemyBoomDamageReduction += effect.value
        break
      case 'alchemy_extra_yield_chance':
        ctx.alchemyExtraYieldChance += effect.value
        break
      case 'breakthrough_rate_add':
        ctx.breakthroughRateAdd += effect.value
        break
      case 'breakthrough_failure_damage_reduction':
        ctx.breakthroughFailureDamageReduction += effect.value
        break
      case 'breakthrough_pity_bonus':
        ctx.breakthroughPityBonus += effect.value
        break
      case 'breakthrough_pity_bonus_rate':
        ctx.breakthroughPityBonusRate += effect.value
        break
      case 'breakthrough_pill_bonus_mul':
        ctx.breakthroughPillBonusMul *= effect.value
        break
      case 'breakthrough_death_protection_once':
        ctx.breakthroughDeathProtectionOnce += effect.value
        break
    }
  }

  // Clamping
  ctx.breakthroughRateAdd = Math.max(0, Math.min(0.3, ctx.breakthroughRateAdd))
  ctx.exploreRetreatAdd = Math.max(0, Math.min(0.25, ctx.exploreRetreatAdd))
  ctx.alchemyBoomRateMul = Math.max(0.3, Math.min(1.5, ctx.alchemyBoomRateMul))
  ctx.alchemySuccessAdd = Math.max(0, Math.min(0.15, ctx.alchemySuccessAdd))

  return ctx
}

export function canPurchaseUpgrade(
  upgradeId: string,
  meta?: { legacyPoints?: number; legacyUpgrades?: Record<string, number> },
): { can: boolean; reason?: string } {
  const def = getLegacyUpgrade(upgradeId)
  if (!def) {
    return { can: false, reason: '升级不存在' }
  }

  const upgrades = meta?.legacyUpgrades ?? {}
  if (upgrades[upgradeId] && upgrades[upgradeId] > 0) {
    return { can: false, reason: '已掌握' }
  }

  const points = meta?.legacyPoints ?? 0
  if (points < def.cost) {
    return { can: false, reason: `传承点不足（需要 ${def.cost}，当前 ${points}）` }
  }

  // 检查前置
  for (const prereqId of def.prereqIds) {
    if (!upgrades[prereqId] || upgrades[prereqId] <= 0) {
      const prereq = getLegacyUpgrade(prereqId)
      return { can: false, reason: `需要先掌握：${prereq?.name ?? prereqId}` }
    }
  }

  return { can: true }
}

export function purchaseUpgrade(
  meta: { legacyPoints?: number; legacyUpgrades?: Record<string, number> },
  upgradeId: string,
): { success: boolean; newMeta: typeof meta; reason?: string } {
  const check = canPurchaseUpgrade(upgradeId, meta)
  if (!check.can) {
    return { success: false, newMeta: meta, reason: check.reason }
  }

  const def = getLegacyUpgrade(upgradeId)!
  const points = meta?.legacyPoints ?? 0
  const upgrades = { ...(meta?.legacyUpgrades ?? {}) }
  upgrades[upgradeId] = 1

  return {
    success: true,
    newMeta: {
      ...meta,
      legacyPoints: points - def.cost,
      legacyUpgrades: upgrades,
    },
  }
}

export function getNextKeyNodeDistance(
  meta?: { legacyPoints?: number; legacyUpgrades?: Record<string, number> },
): { upgradeId: string; name: string; cost: number; distance: number } | null {
  const points = meta?.legacyPoints ?? 0
  const upgrades = meta?.legacyUpgrades ?? {}
  const allUpgrades = getAllLegacyUpgrades()

  let closest: { upgradeId: string; name: string; cost: number; distance: number } | null = null

  for (const upgrade of allUpgrades) {
    if (!upgrade.isKeyNode) continue
    if (upgrades[upgrade.id] && upgrades[upgrade.id] > 0) continue

    // 检查前置是否满足
    let prereqsMet = true
    for (const prereqId of upgrade.prereqIds) {
      if (!upgrades[prereqId] || upgrades[prereqId] <= 0) {
        prereqsMet = false
        break
      }
    }
    if (!prereqsMet) continue

    const distance = Math.max(0, upgrade.cost - points)
    if (closest === null || distance < closest.distance) {
      closest = { upgradeId: upgrade.id, name: upgrade.name, cost: upgrade.cost, distance }
    }
  }

  return closest
}
