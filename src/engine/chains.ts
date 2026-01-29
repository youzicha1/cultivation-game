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

export type GuaranteedReward =
  | { type: 'kungfu'; id: string }
  | { type: 'kungfu_or_recipe'; kungfuIds: string[]; recipeId: string; inheritanceFallback?: number }
  | { type: 'epic_material_elixir'; materialId: string; materialCount: number; inheritanceFallback?: number }

export type ChainDef = {
  chainId: string
  name: string
  desc: string
  chapters: ChainChapterDef[]
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

/** 从未完成链中随机选一条（rng.next() 一次用于 randInt） */
export function pickChainToStart(
  rng: Rng,
  completedChainIds: Record<string, boolean>,
  danger: number,
): ChainDef | null {
  const available = getChainsRegistry().filter((c) => !completedChainIds[c.chainId])
  if (available.length === 0) return null
  const idx = randInt(rng, 0, available.length - 1)
  return available[idx]
}

/** 终章奖励应用到玩家（纯函数，rng 可选用于随机功法） */
export function applyGuaranteedReward(
  player: PlayerState,
  reward: GuaranteedReward,
  rng?: Rng,
): PlayerState {
  const next = { ...player }
  if (reward.type === 'kungfu') {
    const id = reward.id as RelicId
    if (next.relics.includes(id)) {
      next.inheritancePoints = (next.inheritancePoints ?? 0) + 1
    } else {
      next.relics = [...next.relics, id]
    }
    return next
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
    return next
  }
  if (reward.type === 'epic_material_elixir') {
    const cur = next.materials[reward.materialId as MaterialId] ?? 0
    next.materials = { ...next.materials, [reward.materialId]: cur + reward.materialCount }
    next.inheritancePoints = (next.inheritancePoints ?? 0) + (reward.inheritanceFallback ?? 1)
    return next
  }
  return next
}
