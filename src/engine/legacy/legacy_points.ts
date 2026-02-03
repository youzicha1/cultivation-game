/**
 * TICKET-40: 结局传承点结算 — 通关/失败都给点，规则清晰可测
 */

import type { GameState } from '../game'

export type EndingType = 'victory' | 'death' | 'abandon'

/**
 * 根据结局与已渡劫数计算本局获得的传承点
 * - 基础：每通过一劫 +1
 * - 里程碑：通过 3/6/9 劫额外 +2/+3/+4；通过 12 劫额外 +8
 * - 失败补偿：若在第 X 劫失败，再额外 floor(X/2)
 * - 通关大奖：额外 +20
 */
export function calcLegacyPointsOnEnd(state: GameState, ending: EndingType): number {
  const cleared = state.run.tribulationsCleared ?? state.run.tribulationLevel ?? 0
  const failedAt = state.run.tribulation?.level ?? (cleared + 1)

  let points = 0
  points += cleared
  if (cleared >= 3) points += 2
  if (cleared >= 6) points += 3
  if (cleared >= 9) points += 4

  if (ending === 'victory') {
    points += 8
    points += 20
    return points
  }

  if (ending === 'death') {
    const x = Math.min(12, Math.max(1, failedAt))
    points += Math.floor(x / 2)
  }

  return points
}
