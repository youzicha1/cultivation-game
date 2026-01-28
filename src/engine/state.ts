/**
 * 玩家状态
 */
export interface PlayerState {
  /** 境界 */
  realm: string
  /** 经验值 */
  exp: number
  /** 当前生命值 */
  hp: number
  /** 最大生命值 */
  maxHp: number
  /** 传承点数 */
  inheritancePoints: number
}

/**
 * 创建初始状态
 */
export function createInitialState(): PlayerState {
  return {
    realm: '凡人',
    exp: 0,
    hp: 100,
    maxHp: 100,
    inheritancePoints: 0,
  }
}
