import { createInitialState, type PlayerState } from './state'
import { randInt, type Rng } from './rng'

export type ScreenId =
  | 'start'
  | 'home'
  | 'cultivate'
  | 'explore'
  | 'alchemy'
  | 'breakthrough'
  | 'death'
  | 'summary'
  | 'settings'

export type GameState = {
  screen: ScreenId
  player: PlayerState
  run: {
    seed: number
    rngCalls: number
    turn: number
    danger: number
    pendingReward: number
  }
  log: string[]
  summary?: { cause?: string; turns: number }
}

export type GameAction =
  | { type: 'NEW_GAME'; seed: number }
  | { type: 'LOAD_GAME'; state: GameState }
  | { type: 'GO'; screen: ScreenId }
  | { type: 'CULTIVATE_TICK' }
  | { type: 'EXPLORE_START' }
  | { type: 'EXPLORE_PUSH' }
  | { type: 'EXPLORE_RETREAT' }
  | { type: 'ALCHEMY_BREW' }
  | { type: 'BREAKTHROUGH_ATTEMPT'; pillsUsed: number }
  | { type: 'CLEAR_LOG' }

export function createInitialGameState(seed: number): GameState {
  return {
    screen: 'start',
    player: createInitialState(),
    run: {
      seed,
      rngCalls: 0,
      turn: 0,
      danger: 0,
      pendingReward: 0,
    },
    log: [],
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function addLog(state: GameState, message: string): GameState {
  const nextLog = [...state.log, message]
  if (nextLog.length > 50) {
    nextLog.splice(0, nextLog.length - 50)
  }
  return { ...state, log: nextLog }
}

function nextRealm(current: string): string {
  const realms = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神']
  const index = realms.indexOf(current)
  if (index < 0) {
    return current
  }
  return realms[Math.min(index + 1, realms.length - 1)]
}

export function reduceGame(
  state: GameState,
  action: GameAction,
  rng: Rng,
): GameState {
  let rngCalls = state.run.rngCalls
  const rngWithCount: Rng = {
    next: () => {
      rngCalls += 1
      return rng.next()
    },
  }

  const next01 = () => rngWithCount.next()
  const nextInt = (min: number, max: number) => randInt(rngWithCount, min, max)

  const baseRun = { ...state.run }
  const basePlayer = { ...state.player }

  switch (action.type) {
    case 'NEW_GAME': {
      return createInitialGameState(action.seed)
    }
    case 'LOAD_GAME': {
      return action.state
    }
    case 'GO': {
      return { ...state, screen: action.screen }
    }
    case 'CLEAR_LOG': {
      return { ...state, log: [] }
    }
    case 'CULTIVATE_TICK': {
      const expGain = nextInt(1, 3)
      const turn = baseRun.turn + 1
      let nextState: GameState = {
        ...state,
        player: { ...basePlayer, exp: basePlayer.exp + expGain },
        run: { ...baseRun, turn },
      }

      if (next01() < 0.1) {
        const dmg = nextInt(1, 3)
        const hp = nextState.player.hp - dmg
        nextState = {
          ...nextState,
          player: { ...nextState.player, hp },
        }
        nextState = addLog(nextState, `走火入魔，损失生命 ${dmg}`)
        if (hp <= 0) {
          nextState = {
            ...nextState,
            screen: 'death',
            summary: { cause: '走火入魔', turns: turn },
          }
        }
      } else {
        nextState = addLog(nextState, `修炼获得经验 ${expGain}`)
      }

      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_START': {
      let nextState: GameState = {
        ...state,
        screen: 'explore',
        run: { ...baseRun, danger: 0, pendingReward: 0 },
      }
      nextState = addLog(nextState, '开始探索')
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_PUSH': {
      const danger = baseRun.danger + 1
      const reward = nextInt(1, 4) * (1 + danger)
      let nextState: GameState = {
        ...state,
        run: {
          ...baseRun,
          danger,
          pendingReward: baseRun.pendingReward + reward,
        },
      }
      nextState = addLog(nextState, `深入探索，收益 +${reward}`)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_RETREAT': {
      const danger = baseRun.danger
      const successRate = clamp(1 - danger * 0.15, 0.1, 0.95)
      const success = next01() < successRate
      if (success) {
        let nextState: GameState = {
          ...state,
          screen: 'home',
          player: {
            ...basePlayer,
            exp: basePlayer.exp + baseRun.pendingReward,
          },
          run: { ...baseRun, danger: 0, pendingReward: 0 },
        }
        nextState = addLog(
          nextState,
          `成功撤退，获得经验 ${baseRun.pendingReward}`,
        )
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }

      const maxDmg = Math.max(1, danger * 3)
      const dmg = nextInt(1, maxDmg)
      const hp = basePlayer.hp - dmg
      let nextState: GameState = {
        ...state,
        screen: hp <= 0 ? 'death' : 'home',
        player: { ...basePlayer, hp },
        run: { ...baseRun, pendingReward: 0 },
      }
      nextState = addLog(nextState, `撤退失败，损失生命 ${dmg}`)
      if (hp <= 0) {
        nextState = {
          ...nextState,
          summary: { cause: '探索失败', turns: baseRun.turn },
        }
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'ALCHEMY_BREW': {
      const pills = nextInt(0, 2)
      const turn = baseRun.turn + 1
      let nextState: GameState = {
        ...state,
        player: { ...basePlayer, pills: basePlayer.pills + pills },
        run: { ...baseRun, turn },
      }
      nextState = addLog(nextState, `炼丹产出 ${pills} 颗`)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'BREAKTHROUGH_ATTEMPT': {
      const pillsUsed = clamp(action.pillsUsed, 0, basePlayer.pills)
      const successRate = clamp(0.35 + pillsUsed * 0.15, 0.2, 0.95)
      const success = next01() < successRate
      let nextPlayer = {
        ...basePlayer,
        pills: basePlayer.pills - pillsUsed,
      }

      if (success) {
        const maxHp = nextPlayer.maxHp + 2
        nextPlayer = {
          ...nextPlayer,
          realm: nextRealm(nextPlayer.realm),
          maxHp,
          hp: maxHp,
        }
        let nextState: GameState = {
          ...state,
          screen: 'home',
          player: nextPlayer,
        }
        nextState = addLog(nextState, '突破成功')
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }

      const dmg = nextInt(1, 6)
      const hp = nextPlayer.hp - dmg
      nextPlayer = {
        ...nextPlayer,
        hp,
        inheritancePoints: nextPlayer.inheritancePoints + 1,
      }
      let nextState: GameState = {
        ...state,
        screen: hp <= 0 ? 'death' : 'breakthrough',
        player: nextPlayer,
      }
      nextState = addLog(nextState, '突破失败，获得传承点')
      if (hp <= 0) {
        nextState = {
          ...nextState,
          summary: { cause: '突破失败', turns: baseRun.turn },
        }
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    default: {
      return { ...state, run: { ...state.run, rngCalls } }
    }
  }
}
