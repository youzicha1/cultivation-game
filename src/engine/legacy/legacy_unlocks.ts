/**
 * TICKET-40: 传承解锁系统 — 通关/失败给点，购买永久增益，新局生效
 */

import legacyUnlocksData from '../../content/legacy_unlocks.v1.json'
import type { GameState } from '../game'

export interface UnlockEffect {
  startSpiritStones?: number
  startPills?: number
  startMaxHpBonus?: number
  startMaterials?: Record<string, number>
  shopDiscountPercent?: number
  tribulationExtraLife?: number
  awakenRareWeightMul?: number
  cultivateExpMul?: number
  exploreInjuryChanceReduction?: number
  alchemySuccessAdd?: number
  tribulationStartShield?: number
  legacyPointsMul?: number
  startInheritancePoints?: number
  tribulationStartResolveBonus?: number
}

export interface LegacyUnlockDef {
  id: string
  name: string
  desc: string
  cost: number
  tier: string
  tags: string[]
  unlockEffects: UnlockEffect
}

interface LegacyUnlocksFile {
  unlocks: Array<{
    id: string
    name: string
    desc: string
    cost: number
    tier: string
    tags?: string[]
    unlockEffects?: UnlockEffect
  }>
}

const raw = legacyUnlocksData as LegacyUnlocksFile
if (!raw?.unlocks || !Array.isArray(raw.unlocks)) {
  throw new Error('legacy_unlocks.v1.json: unlocks must be an array')
}

const byId = new Map<string, LegacyUnlockDef>()
for (const u of raw.unlocks) {
  byId.set(u.id, {
    id: u.id,
    name: u.name,
    desc: u.desc,
    cost: u.cost,
    tier: u.tier,
    tags: u.tags ?? [],
    unlockEffects: u.unlockEffects ?? {},
  })
}

export function getLegacyUnlocks(): LegacyUnlockDef[] {
  return Array.from(byId.values())
}

export function getLegacyUnlock(id: string): LegacyUnlockDef | undefined {
  return byId.get(id)
}

export type MetaWithLegacy = {
  legacyPoints?: number
  legacyUnlocks?: Record<string, true>
}

export function getLegacyState(meta: MetaWithLegacy | undefined): {
  points: number
  unlockedIds: string[]
} {
  const points = meta?.legacyPoints ?? 0
  const unlockedIds = meta?.legacyUnlocks ? Object.keys(meta.legacyUnlocks) : []
  return { points, unlockedIds }
}

export function canBuyUnlock(
  meta: MetaWithLegacy | undefined,
  unlockId: string,
): { can: boolean; reason?: string } {
  const def = byId.get(unlockId)
  if (!def) return { can: false, reason: '未知解锁' }
  if (meta?.legacyUnlocks?.[unlockId]) return { can: false, reason: '已解锁' }
  const points = meta?.legacyPoints ?? 0
  if (points < def.cost) return { can: false, reason: `传承点不足（需 ${def.cost}）` }
  return { can: true }
}

export function buyUnlock(
  meta: MetaWithLegacy | undefined,
  unlockId: string,
): MetaWithLegacy | null {
  const check = canBuyUnlock(meta, unlockId)
  if (!check.can) return null
  const def = byId.get(unlockId)!
  const nextPoints = (meta?.legacyPoints ?? 0) - def.cost
  const nextUnlocks = { ...(meta?.legacyUnlocks ?? {}), [unlockId]: true as const }
  return {
    ...meta,
    legacyPoints: nextPoints,
    legacyUnlocks: nextUnlocks,
  }
}

/** 新开局时把永久解锁加成映射进 state */
export function applyLegacyUnlocksToNewRun(
  initState: GameState,
  metaUnlocks: Record<string, true> | undefined,
): GameState {
  if (!metaUnlocks || Object.keys(metaUnlocks).length === 0) return initState
  let state = initState
  for (const id of Object.keys(metaUnlocks)) {
    const def = byId.get(id)
    if (!def?.unlockEffects) continue
    const e = def.unlockEffects
    if (e.startSpiritStones != null) {
      state = {
        ...state,
        player: { ...state.player, spiritStones: state.player.spiritStones + e.startSpiritStones },
      }
    }
    if (e.startPills != null) {
      state = {
        ...state,
        player: { ...state.player, pills: state.player.pills + e.startPills },
      }
    }
    if (e.startMaxHpBonus != null) {
      const bonus = e.startMaxHpBonus
      state = {
        ...state,
        player: {
          ...state.player,
          maxHp: state.player.maxHp + bonus,
          hp: state.player.hp + bonus,
        },
      }
    }
    if (e.startMaterials && Object.keys(e.startMaterials).length > 0) {
      const mat = { ...state.player.materials }
      for (const [k, v] of Object.entries(e.startMaterials)) {
        mat[k as keyof typeof mat] = (mat[k as keyof typeof mat] ?? 0) + v
      }
      state = { ...state, player: { ...state.player, materials: mat } }
    }
    if (e.shopDiscountPercent != null) {
      const cur = state.run.shopDiscountPercent ?? 0
      state = {
        ...state,
        run: { ...state.run, shopDiscountPercent: cur + e.shopDiscountPercent },
      }
    }
    if (e.tribulationExtraLife != null) {
      const temp = { ...state.run.temp, tribulationExtraLife: (state.run.temp?.tribulationExtraLife ?? 0) + e.tribulationExtraLife }
      state = { ...state, run: { ...state.run, temp } }
    }
    if (e.startInheritancePoints != null) {
      state = {
        ...state,
        player: { ...state.player, inheritancePoints: state.player.inheritancePoints + e.startInheritancePoints },
      }
    }
    if (e.tribulationStartShield != null) {
      const temp = { ...state.run.temp, tribulationStartShield: (state.run.temp?.tribulationStartShield ?? 0) + e.tribulationStartShield }
      state = { ...state, run: { ...state.run, temp } }
    }
  }
  return state
}
