import { createInitialState, type PlayerState } from './state'
import { randInt, type Rng } from './rng'
import {
  exploreEvents,
  pickExploreEvent,
  resolveExploreChoice,
  type ExploreEvent,
} from './events'

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
    currentEvent?: {
      id: string
      title: string
      text: string
      aText: string
      bText: string
    }
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
  | { type: 'EXPLORE_ROLL_EVENT' }
  | { type: 'EXPLORE_CHOOSE'; choice: 'A' | 'B' }
  | { type: 'EXPLORE_DISMISS_EVENT' }
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
      currentEvent: undefined,
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

function snapshotEvent(event: ExploreEvent): GameState['run']['currentEvent'] {
  return {
    id: event.id,
    title: event.title,
    text: event.text,
    aText: event.choices.A.text,
    bText: event.choices.B.text,
  }
}

function findEventById(eventId: string): ExploreEvent | undefined {
  return exploreEvents.find((event) => event.id === eventId)
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
        run: { ...baseRun, danger: 0, pendingReward: 0, currentEvent: undefined },
      }
      nextState = addLog(nextState, '开始探索')
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_PUSH': {
      const danger = baseRun.danger + 1
      const triggerEvent = next01() < 0.65
      if (triggerEvent) {
        const event = pickExploreEvent(rngWithCount, danger)
        let nextState: GameState = {
          ...state,
          run: { ...baseRun, danger, currentEvent: snapshotEvent(event) },
        }
        nextState = addLog(nextState, `你遭遇了：${event.title}`)
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }

      const reward = nextInt(1, 3) * (1 + danger)
      let nextState: GameState = {
        ...state,
        run: {
          ...baseRun,
          danger,
          pendingReward: baseRun.pendingReward + reward,
        },
      }
      nextState = addLog(nextState, `未遇异象，收获 +${reward}`)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_ROLL_EVENT': {
      const danger = baseRun.danger
      const event = pickExploreEvent(rngWithCount, danger)
      let nextState: GameState = {
        ...state,
        run: { ...baseRun, currentEvent: snapshotEvent(event) },
      }
      nextState = addLog(nextState, `你遭遇了：${event.title}`)
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_DISMISS_EVENT': {
      if (!baseRun.currentEvent) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      let nextState: GameState = {
        ...state,
        run: { ...baseRun, currentEvent: undefined },
      }
      nextState = addLog(nextState, '你压下冲动，暂避锋芒。')
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_CHOOSE': {
      const current = baseRun.currentEvent
      if (!current) {
        return { ...state, run: { ...state.run, rngCalls } }
      }
      const event = findEventById(current.id)
      if (!event) {
        let nextState: GameState = {
          ...state,
          run: { ...baseRun, currentEvent: undefined },
        }
        nextState = addLog(nextState, '事件已远去，只得继续前行。')
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }
      let nextState = resolveExploreChoice(
        state,
        event,
        action.choice,
        next01,
        nextInt,
      )
      if (nextState.screen !== 'death') {
        nextState = { ...nextState, screen: 'explore' }
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'EXPLORE_RETREAT': {
      if (baseRun.currentEvent) {
        let nextState: GameState = {
          ...state,
          run: { ...baseRun, currentEvent: undefined },
        }
        nextState = addLog(nextState, '你压下冲动，暂避锋芒。')
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }
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
          run: {
            ...baseRun,
            danger: 0,
            pendingReward: 0,
            currentEvent: undefined,
          },
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
        run: { ...baseRun, pendingReward: 0, currentEvent: undefined },
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
