/**
 * TICKET-14: 天劫倒计时（局长节拍器）
 * 用“时辰”控制单局长度，不依赖现实时间。
 */

import type { GameState } from './game'

/** 本局总时辰（约 20~35 次关键行动） */
export const TIME_MAX = 24

/** 剩余时辰 ≤ 此值时 UI 红字提示“天劫将至” */
export const TIME_WARNING_THRESHOLD = 4

/** 设置页是否显示“减少时辰”调试按钮（默认隐藏） */
export const TIME_DEBUG_BUTTON = false

/** 阶段名（纯氛围，可选） */
export const DAY_PHASES = ['劫', '暮', '昼', '晨'] as const

export function getDayPhase(timeLeft: number, timeMax: number): string {
  if (timeMax <= 0) return '晨'
  const ratio = timeLeft / timeMax
  if (ratio <= TIME_WARNING_THRESHOLD / timeMax) return '劫'
  if (ratio <= 0.4) return '暮'
  if (ratio <= 0.7) return '昼'
  return '晨'
}

/** 某类 action 消耗的时辰数（MVP 固定：关键动作 1，其余 0） */
export function getActionTimeCost(actionType: string, _state?: GameState): number {
  switch (actionType) {
    case 'CULTIVATE_TICK':
    case 'EXPLORE_CHOOSE':
    case 'ALCHEMY_BREW_CONFIRM':
    case 'BREAKTHROUGH_CONFIRM':
      return 1
    default:
      return 0
  }
}

/** 扣减时辰并返回新 state（不触发收官，由 reducer 判断） */
export function applyTimeCost(state: GameState, cost: number): GameState {
  if (cost <= 0) return state
  const timeMax = state.run.timeMax ?? TIME_MAX
  const timeLeft = Math.max(0, (state.run.timeLeft ?? timeMax) - cost)
  return {
    ...state,
    run: { ...state.run, timeLeft, timeMax },
  }
}

/** 时辰耗尽且本局未结束（非 death）时应触发收官；本局已触发过则不再触发（防刷传承点） */
export function shouldTriggerTribulationFinale(state: GameState): boolean {
  if (state.meta?.tribulationFinaleTriggered) return false
  const timeLeft = state.run.timeLeft ?? TIME_MAX
  return timeLeft <= 0 && state.screen !== 'death' && state.screen !== 'ending' && state.screen !== 'summary' && state.screen !== 'victory'
}
