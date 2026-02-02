/**
 * TICKET-38: 机制型丹药 — 统一入口 canUsePill / applyPillEffect
 */

import pillsFile from '../../content/pills.v1.json'
import type { GameState } from '../game'
import type { ElixirQuality } from '../alchemy'
import { getPillQualityMultiplier } from '../alchemy'
import type { PillContext, PillDef, PillInstance } from './types'
import type { PillsFile } from './types'
import type { Rng } from '../rng'

const RULE_TYPES_REQUIRE_DI_TIAN = new Set([
  'extraLife',
  'freeRetreat',
  'noCostOnFail',
  'awakenExtraChoice',
  'cheatDeath',
  'revive',
  'freeRefreshOrBuy',
])

let pillsCache: PillDef[] | null = null

function getPillsRegistry(): PillDef[] {
  if (pillsCache) return pillsCache
  const raw = pillsFile as unknown as PillsFile
  if (!raw?.pills || !Array.isArray(raw.pills)) {
    throw new Error('pills.v1.json: pills must be non-empty array')
  }
  pillsCache = raw.pills
  return pillsCache
}

export function getPillDef(pillId: string): PillDef | undefined {
  return getPillsRegistry().find((p) => p.id === pillId)
}

export function getAllPillDefs(): PillDef[] {
  return getPillsRegistry()
}

/** 当前 state 下该 context 是否可用（页面/流程允许） */
function isContextAvailable(state: GameState, context: PillContext): boolean {
  switch (context) {
    case 'tribulation':
      return !!state.run.tribulation
    case 'explore':
      return state.screen === 'explore' && (state.run.currentEvent != null || (state.run.danger ?? 0) < 100)
    case 'breakthrough':
      return state.screen === 'breakthrough'
    case 'cultivate':
      return state.screen === 'home' || state.screen === 'cultivate'
    case 'market':
      return state.screen === 'shop'
    case 'survival':
      return true
    case 'any':
      return true
    default:
      return false
  }
}

/** 丹药是否可在该 context 使用（tags + 规则型仅地/天） */
export function canUsePill(
  state: GameState,
  pillInst: PillInstance,
  context: PillContext,
): boolean {
  const def = getPillDef(pillInst.pillId)
  if (!def) return false
  const inv = state.player.pillInventory ?? {}
  const byQual = inv[pillInst.pillId]
  const count = byQual?.[pillInst.quality] ?? 0
  if (count <= 0) return false
  if (!isContextAvailable(state, context)) return false
  const tagOk =
    context === 'any' ||
    def.tags.includes(context) ||
    def.tags.includes('survival') ||
    (context === 'tribulation' && def.tags.includes('tribulation')) ||
    (context === 'explore' && def.tags.includes('explore')) ||
    (context === 'breakthrough' && def.tags.includes('breakthrough')) ||
    (context === 'cultivate' && def.tags.includes('cultivate')) ||
    (context === 'market' && def.tags.includes('economy'))
  if (!tagOk) return false
  if (def.tianOnly && pillInst.quality !== 'tian') return false
  if (def.ruleType && RULE_TYPES_REQUIRE_DI_TIAN.has(def.ruleType)) {
    if (pillInst.quality !== 'di' && pillInst.quality !== 'tian') return false
  }
  return true
}

function deductPill(state: GameState, pillId: string, quality: ElixirQuality): GameState {
  const inv = { ...(state.player.pillInventory ?? {}) }
  const byQual = { ...(inv[pillId] ?? { fan: 0, xuan: 0, di: 0, tian: 0 }) }
  byQual[quality] = Math.max(0, (byQual[quality] ?? 0) - 1)
  inv[pillId] = byQual
  return {
    ...state,
    player: { ...state.player, pillInventory: inv },
  }
}

function addLog(state: GameState, message: string): GameState {
  const nextLog = [...(state.log ?? []), message]
  if (nextLog.length > 50) nextLog.splice(0, nextLog.length - 50)
  return { ...state, log: nextLog }
}

/** 应用丹药效果，写 run.temp / player，返回新 state 与日志事件 */
export function applyPillEffect(
  state: GameState,
  pillInst: PillInstance,
  context: PillContext,
  _rng?: Rng,
): { state: GameState; logEvents: string[] } {
  const def = getPillDef(pillInst.pillId)
  if (!def) {
    return { state, logEvents: [] }
  }
  const mult = getPillQualityMultiplier(pillInst.quality)
  const logEvents: string[] = []
  let next = deductPill(state, pillInst.pillId, pillInst.quality)
  const temp = { ...(next.run.temp ?? {}) }

  const effTrib = def.effects.tribulation
  const effExpl = def.effects.explore
  const effBreak = def.effects.breakthrough
  const effCult = def.effects.cultivate
  const effSurv = def.effects.survival
  const effMarket = def.effects.market

  if (context === 'tribulation' && effTrib) {
    if (effTrib.extraLife !== undefined && (pillInst.quality === 'di' || pillInst.quality === 'tian')) {
      temp.tribulationExtraLife = (temp.tribulationExtraLife ?? 0) + 1
      logEvents.push(`${def.name}：额外容错+1`)
    }
    if (effTrib.extraAction !== undefined && (pillInst.quality === 'di' || pillInst.quality === 'tian')) {
      temp.tribulationExtraAction = (temp.tribulationExtraAction ?? 0) + 1
      logEvents.push(`${def.name}：额外行动+1`)
    }
    if (effTrib.successRateAdd != null) {
      // 由天劫回合内 apply 时写入 tribulation 的 surge 加成等，这里只记 temp 供 tribulation 模块读
      logEvents.push(`${def.name}：天劫成功率加成`)
    }
    if (effTrib.clearDebuff) {
      logEvents.push(`${def.name}：清除心魔/灼烧`)
    }
  }

  if (context === 'explore' && effExpl) {
    if (effExpl.freeRetreat && (pillInst.quality === 'di' || pillInst.quality === 'tian')) {
      temp.exploreFreeRetreat = (temp.exploreFreeRetreat ?? 0) + 1
      logEvents.push(`${def.name}：无损撤退+1`)
    }
    if (effExpl.noDamageCount != null) {
      const n = Math.max(1, Math.round(effExpl.noDamageCount * mult))
      temp.exploreNoDamageCount = (temp.exploreNoDamageCount ?? 0) + n
      logEvents.push(`${def.name}：接下来${n}次探索受伤减免`)
    }
  }

  if (context === 'breakthrough' && effBreak) {
    if (effBreak.noCostOnFail && (pillInst.quality === 'di' || pillInst.quality === 'tian')) {
      temp.breakthroughNoCostOnFail = true
      logEvents.push(`${def.name}：本次失败不付代价`)
    }
  }

  if (context === 'cultivate' && effCult) {
    if (effCult.awakenExtraChoice && (pillInst.quality === 'di' || pillInst.quality === 'tian')) {
      temp.cultivateAwakenExtraChoice = (temp.cultivateAwakenExtraChoice ?? 0) + 1
      logEvents.push(`${def.name}：下一次觉醒候选+1`)
    }
    if (effCult.healAfter != null) {
      const amt = Math.round(effCult.healAfter * mult)
      next = {
        ...next,
        player: { ...next.player, hp: Math.min(next.player.maxHp, next.player.hp + amt) },
      }
      logEvents.push(`${def.name}：修炼后回血+${amt}`)
    }
  }

  if (context === 'survival' || (effSurv && (context === 'tribulation' || context === 'explore'))) {
    if (effSurv?.cheatDeath && (pillInst.quality === 'di' || pillInst.quality === 'tian')) {
      temp.survivalCheatDeath = (temp.survivalCheatDeath ?? 0) + 1
      logEvents.push(`${def.name}：免死一次`)
    }
  }

  if (context === 'market' && effMarket) {
    if (effMarket.freeRefreshOrBuy && (pillInst.quality === 'di' || pillInst.quality === 'tian')) {
      temp.marketFreeRefreshOrBuy = (temp.marketFreeRefreshOrBuy ?? 0) + 1
      logEvents.push(`${def.name}：坊市免费刷新或购买一次`)
    }
  }

  next = { ...next, run: { ...next.run, temp } }
  const qualityLabel = { fan: '凡', xuan: '玄', di: '地', tian: '天' }[pillInst.quality]
  const toastMsg = logEvents.length > 0 ? logEvents[logEvents.length - 1] : `${def.name}(${qualityLabel})已使用`
  next = {
    ...next,
    run: {
      ...next.run,
      temp: {
        ...next.run.temp,
        pillToast: { pillName: def.name, quality: qualityLabel, message: toastMsg },
      },
    },
  }
  for (const msg of logEvents) {
    next = addLog(next, `【丹药】${def.name}(${qualityLabel})：${msg}`)
  }
  return { state: next, logEvents }
}

const QUALITY_ORDER: ElixirQuality[] = ['fan', 'xuan', 'di', 'tian']

/** UI 用：当前 context 下可选的机制丹列表（含库存、名称、提示） */
export function getPillOptionsForContext(
  state: GameState,
  context: PillContext,
): Array<{ pillId: string; quality: ElixirQuality; count: number; name: string; hint: string }> {
  const inv = state.player.pillInventory ?? {}
  const list: Array<{ pillId: string; quality: ElixirQuality; count: number; name: string; hint: string }> = []
  for (const def of getPillsRegistry()) {
    const byQual = inv[def.id]
    if (!byQual) continue
    for (const q of QUALITY_ORDER) {
      const count = byQual[q] ?? 0
      if (count <= 0) continue
      const inst: PillInstance = { pillId: def.id, quality: q }
      if (!canUsePill(state, inst, context)) continue
      list.push({
        pillId: def.id,
        quality: q as ElixirQuality,
        count,
        name: def.name,
        hint: getPillPreviewText(inst, context),
      })
    }
  }
  return list
}

/** UI 用：预览文案 */
export function getPillPreviewText(pillInst: PillInstance, context: PillContext): string {
  const def = getPillDef(pillInst.pillId)
  if (!def) return ''
  const eff =
    context === 'tribulation'
      ? def.effects.tribulation
      : context === 'explore'
        ? def.effects.explore
        : context === 'breakthrough'
          ? def.effects.breakthrough
          : context === 'cultivate'
            ? def.effects.cultivate
            : context === 'market'
              ? def.effects.market
              : def.effects.survival
  if (!eff) return def.ruleDesc ?? def.name
  if (def.ruleDesc) return def.ruleDesc
  const q = getPillQualityMultiplier(pillInst.quality)
  if (def.effects.tribulation?.successRateAdd != null) return `天劫成功率+${Math.round(def.effects.tribulation.successRateAdd * 100 * q)}%`
  if (def.effects.explore?.noDamageCount != null) return `接下来${Math.round((def.effects.explore.noDamageCount ?? 0) * q)}次受伤减免`
  return def.name
}
