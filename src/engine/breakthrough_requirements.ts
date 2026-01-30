/**
 * 突破前置：目标境界所需功法（与炼丹/探索/传承联动）
 * - 基础成功率 0%，仅丹药/传承/功法/心境等可加概率
 * - 后期境界必须拥有特定功法，否则吃再多丹成功率也为 0
 */

import type { RelicId } from './relics'

export const REALMS = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神'] as const
export type RealmId = (typeof REALMS)[number]

/** 目标境界（1=炼气, 2=筑基, ...）所需功法：未拥有则突破率强制 0 */
export const REQUIRED_KUNGFU_BY_TARGET_REALM: Partial<Record<number, RelicId>> = {
  3: 'breakthrough_boost',   // 筑基→金丹：需破境诀
  4: 'tian_blessing',       // 金丹→元婴：需天缘石
  5: 'legendary_eye',       // 元婴→化神：需天机眼
}

/** 目标境界索引（1-based：1=炼气…5=化神），凡人→炼气无功法要求 */
export function getRequiredKungfuForTargetRealm(targetRealmIndex: number): RelicId | undefined {
  return REQUIRED_KUNGFU_BY_TARGET_REALM[targetRealmIndex]
}

/** 是否满足突破前置（拥有所需功法或该境界无要求） */
export function hasBreakthroughPrereq(ownedRelics: readonly string[], targetRealmIndex: number): boolean {
  const required = getRequiredKungfuForTargetRealm(targetRealmIndex)
  if (!required) return true
  return ownedRelics.includes(required)
}

/** 当前境界的上一级（用于突破失败降级）；凡人不再降 */
export function prevRealm(realm: string): string {
  const i = REALMS.indexOf(realm as RealmId)
  if (i <= 0) return REALMS[0]
  return REALMS[i - 1]
}
