/**
 * TICKET-27: 12 重天劫爽文命名（固定映射表）
 * 第 1～12 重依次更狠更燃，短、好记、带画面。
 */

export const TRIBULATION_NAMES: readonly [string, string, string, string, string, string, string, string, string, string, string, string] = [
  '青霄雷劫',
  '赤炎焚心劫',
  '玄冰锁魂劫',
  '罡风碎骨劫',
  '金光破界劫',
  '幽冥噬影劫',
  '万剑诛神劫',
  '星陨坠天劫',
  '九幽黄泉劫',
  '太古天罚劫',
  '混沌开天劫',
  '大道归一劫',
]

export const TRIBULATION_COUNT = 12

/** 第 level 重（1-based）的名称，level 超出范围返回空字符串 */
export function getTribulationName(level: number): string {
  if (level < 1 || level > TRIBULATION_COUNT) return ''
  return TRIBULATION_NAMES[level - 1] ?? ''
}
