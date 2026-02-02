/**
 * TICKET-11: 章节式奇遇事件链
 * - content 驱动 event_chains.v1.json
 * - 触发率随 danger 提升，终章必发 guaranteedReward
 */

import type { PlayerState } from './state'
import type { RelicId } from './relics'
import type { MaterialId, RecipeId } from './alchemy'
import type { Rng } from './rng'
import { randInt } from './rng'

import chainsFile from '../content/event_chains.v1.json'

export type ChainChoiceDef = {
  text: string
  successRateBase: number
  successRateDangerFactor: number
  onSuccess: { log: string; effects: unknown[] }
  onFail: { log: string; effects: unknown[] }
}

export type ChainChapterDef = {
  chapter: number
  title: string
  text: string
  choices: { A: ChainChoiceDef; B: ChainChoiceDef }
  final?: boolean
  guaranteedReward?: GuaranteedReward
}

/** TICKET-21: 终章大奖类型扩展（材料/配方/功法/丹药/称号/传承点/坊市折扣/天劫加成） */
export type GuaranteedReward =
  | { type: 'kungfu'; id: string }
  | { type: 'kungfu_or_recipe'; kungfuIds: string[]; recipeId: string; inheritanceFallback?: number }
  | { type: 'epic_material_elixir'; materialId: string; materialCount: number; inheritanceFallback?: number }
  | { type: 'recipe'; recipeId: string }
  | { type: 'pills'; count: number }
  | { type: 'title'; id: string; name: string }
  | { type: 'legacy'; points: number }
  | { type: 'shop_discount'; percent: number }
  | { type: 'tribulation_bonus'; dmgReductionPercent: number }

/** 终章奖励中作用于 run 的增量（坊市折扣/天劫减伤/称号） */
export type RunRewardDelta = {
  shopDiscountPercent?: number
  tribulationDmgReductionPercent?: number
  earnedTitle?: string
}

/** TICKET-37: 链解锁条件（起点条件） */
export type ChainUnlock = {
  minDanger?: number
  minRealm?: number
  minTribulationPassed?: number
}

export type ChainDef = {
  chainId: string
  name: string
  desc: string
  chapters: ChainChapterDef[]
  unlock?: ChainUnlock
}

type ChainsFile = {
  version: number
  chains: Array<{
    chainId: string
    name: string
    desc: string
    chapters: Array<{
      chapter: number
      title: string
      text: string
      choices: { A: ChainChoiceDef; B: ChainChoiceDef }
      final?: boolean
      guaranteedReward?: GuaranteedReward
    }>
    unlock?: { minDanger?: number; minRealm?: number; minTribulationPassed?: number }
  }>
}

function validateChainsFile(): ChainDef[] {
  const file = chainsFile as ChainsFile
  if (!file?.chains || !Array.isArray(file.chains)) {
    throw new Error('event_chains.v1.json: missing or invalid chains array')
  }
  return file.chains.map((c) => ({
    chainId: c.chainId,
    name: c.name,
    desc: c.desc,
    chapters: c.chapters.map((ch) => ({
      chapter: ch.chapter,
      title: ch.title,
      text: ch.text,
      choices: ch.choices,
      final: ch.final,
      guaranteedReward: ch.guaranteedReward,
    })),
    unlock: c.unlock,
  }))
}

let chainsRegistry: ChainDef[] | null = null

function getChainsRegistry(): ChainDef[] {
  if (!chainsRegistry) chainsRegistry = validateChainsFile()
  return chainsRegistry
}

export function getChains(): ChainDef[] {
  return [...getChainsRegistry()]
}

export function getChain(chainId: string): ChainDef | undefined {
  return getChainsRegistry().find((c) => c.chainId === chainId)
}

export function getChapter(chainId: string, chapterNum: number): ChainChapterDef | undefined {
  const chain = getChain(chainId)
  return chain?.chapters.find((ch) => ch.chapter === chapterNum)
}

/** 链触发率：基础 8%，danger>=50 12%，danger>=75 18% */
export function getChainTriggerRate(danger: number, debugAlwaysTrigger?: boolean): number {
  if (debugAlwaysTrigger && danger >= 50) return 1
  if (danger >= 75) return 0.18
  if (danger >= 50) return 0.12
  return 0.08
}

/** 临时 debug：设为 true 时 danger>=50 必触发链（默认 false，提交前请关） */
export const CHAIN_DEBUG_ALWAYS_TRIGGER = false

/** TICKET-21: 断链补偿默认（碎片+保底+小礼包），供 game 在死亡且进行中链时应用 */
export const DEFAULT_BREAK_COMPENSATION = {
  fragmentRecipeId: 'spirit_pill_recipe' as RecipeId,
  fragmentCount: 1,
  pityPlus: 1,
  materialId: 'spirit_herb' as MaterialId,
  materialCount: 1,
}

/** TICKET-37: 链触发条件判定（danger/境界/已通关劫数） */
export type ChainTriggerContext = {
  danger: number
  realmIndex?: number
  tribulationPassed?: number
}

export function canChainTrigger(chain: ChainDef, ctx: ChainTriggerContext): boolean {
  const u = chain.unlock
  if (!u) return true
  if (u.minDanger != null && ctx.danger < u.minDanger) return false
  if (u.minRealm != null && (ctx.realmIndex ?? 0) < u.minRealm) return false
  if (u.minTribulationPassed != null && (ctx.tribulationPassed ?? 0) < u.minTribulationPassed) return false
  return true
}

/** 终章奖励为材料时返回 materialId，供 UI 显示目标材料 */
export function getChainTargetMaterial(chain: ChainDef): string | undefined {
  const finalCh = chain.chapters.find((ch) => ch.final && ch.guaranteedReward)
  const r = finalCh?.guaranteedReward
  if (r?.type === 'epic_material_elixir') return r.materialId
  return undefined
}

/** TICKET-37: 链进度视图（目标材料 + 当前进度），供奇遇链页/日志展示 */
export function getChainProgressView(activeChainId: string | undefined, chapter: number | undefined): {
  activeChainId: string | undefined
  chapter: number
  totalChapters: number
  targetMaterialId: string | undefined
  chainName: string
} | null {
  if (!activeChainId || chapter == null) return null
  const chain = getChain(activeChainId)
  if (!chain) return null
  const totalChapters = chain.chapters.length
  const targetMaterialId = getChainTargetMaterial(chain)
  return {
    activeChainId,
    chapter,
    totalChapters,
    targetMaterialId,
    chainName: chain.name,
  }
}

/** 从未完成且满足条件的链中随机选一条（rng.next() 一次用于 randInt） */
export function pickChainToStart(
  rng: Rng,
  completedChainIds: Record<string, boolean>,
  ctx: ChainTriggerContext,
): ChainDef | null {
  const available = getChainsRegistry().filter(
    (c) => !completedChainIds[c.chainId] && canChainTrigger(c, ctx),
  )
  if (available.length === 0) return null
  const idx = randInt(rng, 0, available.length - 1)
  return available[idx]
}

/** 终章奖励应用到玩家与 run（纯函数，rng 可选用于随机功法）；返回 runDelta 供 game 合并到 run */
export function applyGuaranteedReward(
  player: PlayerState,
  reward: GuaranteedReward,
  rng?: Rng,
): { player: PlayerState; runDelta?: RunRewardDelta } {
  const next = { ...player }
  let runDelta: RunRewardDelta | undefined
  if (reward.type === 'kungfu') {
    const id = reward.id as RelicId
    if (next.relics.includes(id)) {
      next.inheritancePoints = (next.inheritancePoints ?? 0) + 1
    } else {
      next.relics = [...next.relics, id]
    }
    return { player: next }
  }
  if (reward.type === 'kungfu_or_recipe') {
    const notOwned = reward.kungfuIds.filter((id) => !next.relics.includes(id as RelicId))
    if (notOwned.length > 0 && rng) {
      const idx = randInt(rng, 0, notOwned.length - 1)
      const id = notOwned[idx] as RelicId
      next.relics = [...next.relics, id]
    } else if (reward.recipeId && !next.recipesUnlocked[reward.recipeId as RecipeId]) {
      next.recipesUnlocked = { ...next.recipesUnlocked, [reward.recipeId]: true }
    } else {
      next.inheritancePoints = (next.inheritancePoints ?? 0) + (reward.inheritanceFallback ?? 1)
    }
    return { player: next }
  }
  if (reward.type === 'epic_material_elixir') {
    const cur = next.materials[reward.materialId as MaterialId] ?? 0
    next.materials = { ...next.materials, [reward.materialId]: cur + reward.materialCount }
    next.inheritancePoints = (next.inheritancePoints ?? 0) + (reward.inheritanceFallback ?? 1)
    return { player: next }
  }
  if (reward.type === 'recipe') {
    next.recipesUnlocked = { ...next.recipesUnlocked, [reward.recipeId as RecipeId]: true }
    return { player: next }
  }
  if (reward.type === 'pills') {
    next.pills = (next.pills ?? 0) + reward.count
    return { player: next }
  }
  if (reward.type === 'title') {
    runDelta = { ...runDelta, earnedTitle: reward.name }
    return { player: next, runDelta }
  }
  if (reward.type === 'legacy') {
    next.inheritancePoints = (next.inheritancePoints ?? 0) + reward.points
    return { player: next }
  }
  if (reward.type === 'shop_discount') {
    runDelta = { ...runDelta, shopDiscountPercent: reward.percent }
    return { player: next, runDelta }
  }
  if (reward.type === 'tribulation_bonus') {
    runDelta = { ...runDelta, tribulationDmgReductionPercent: reward.dmgReductionPercent }
    return { player: next, runDelta }
  }
  return { player: next }
}
