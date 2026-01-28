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
    breakthroughPlan?: {
      pillsUsed: number
      inheritanceSpent: number
      previewRate: number
    }
    lastOutcome?: {
      kind: 'breakthrough'
      success: boolean
      title: string
      text: string
      deltas: {
        realm: number
        hp: number
        maxHp: number
        exp: number
        pills: number
        inheritancePoints: number
        pity: number
      }
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
  | { type: 'BREAKTHROUGH_OPEN' }
  | {
      type: 'BREAKTHROUGH_SET_PLAN'
      pillsUsed: number
      inheritanceSpent: number
    }
  | { type: 'BREAKTHROUGH_CONFIRM' }
  | { type: 'OUTCOME_CONTINUE'; to: ScreenId }
  | { type: 'OUTCOME_RETRY_BREAKTHROUGH' }
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

function clampRate(value: number): number {
  return clamp(value, 0.05, 0.95)
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

function realmIndex(realm: string): number {
  const realms = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神']
  const index = realms.indexOf(realm)
  return index < 0 ? 0 : index
}

export function calcBreakthroughRate(
  state: GameState,
  pillsUsed: number,
  inheritanceSpent: number,
): number {
  const base = 0.22 + realmIndex(state.player.realm) * 0.03
  const pillsBonus = pillsUsed * 0.14
  const inheritanceBonus = inheritanceSpent * 0.1
  const pityBonus = state.player.pity * 0.06
  const dangerPenalty = state.run.danger > 0 ? state.run.danger * 0.02 : 0
  return clampRate(base + pillsBonus + inheritanceBonus + pityBonus - dangerPenalty)
}

function createBreakthroughPlan(
  state: GameState,
  pillsUsed: number,
  inheritanceSpent: number,
): GameState['run']['breakthroughPlan'] {
  const pills = clamp(pillsUsed, 0, state.player.pills)
  const inheritance = clamp(inheritanceSpent, 0, state.player.inheritancePoints)
  return {
    pillsUsed: pills,
    inheritanceSpent: inheritance,
    previewRate: calcBreakthroughRate(state, pills, inheritance),
  }
}

function buildOutcomeDeltas(
  before: GameState['player'],
  after: GameState['player'],
): GameState['run']['lastOutcome']['deltas'] {
  return {
    realm: realmIndex(after.realm) - realmIndex(before.realm),
    hp: after.hp - before.hp,
    maxHp: after.maxHp - before.maxHp,
    exp: after.exp - before.exp,
    pills: after.pills - before.pills,
    inheritancePoints: after.inheritancePoints - before.inheritancePoints,
    pity: after.pity - before.pity,
  }
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
    case 'BREAKTHROUGH_OPEN': {
      const plan = createBreakthroughPlan(state, 0, 0)
      let nextState: GameState = {
        ...state,
        screen: 'breakthrough',
        run: { ...baseRun, breakthroughPlan: plan },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'BREAKTHROUGH_SET_PLAN': {
      const plan = createBreakthroughPlan(
        state,
        action.pillsUsed,
        action.inheritanceSpent,
      )
      let nextState: GameState = {
        ...state,
        run: { ...baseRun, breakthroughPlan: plan },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'BREAKTHROUGH_CONFIRM': {
      const plan = baseRun.breakthroughPlan ?? createBreakthroughPlan(state, 0, 0)
      const pillsUsed = plan.pillsUsed
      const inheritanceSpent = plan.inheritanceSpent

      let nextPlayer = {
        ...basePlayer,
        pills: basePlayer.pills - pillsUsed,
        inheritancePoints: basePlayer.inheritancePoints - inheritanceSpent,
      }

      const beforePlayer = { ...basePlayer }
      const rate = calcBreakthroughRate(state, pillsUsed, inheritanceSpent)
      const success = next01() < rate
      const turn = baseRun.turn + 1

      if (success) {
        const maxHpGain = nextInt(0, 2)
        const maxHp = nextPlayer.maxHp + 2 + maxHpGain
        const expGain = nextInt(3, 8)
        nextPlayer = {
          ...nextPlayer,
          realm: nextRealm(nextPlayer.realm),
          maxHp,
          hp: maxHp,
          exp: nextPlayer.exp + expGain,
          pity: 0,
        }
        const deltas = buildOutcomeDeltas(beforePlayer, nextPlayer)
        let nextState: GameState = {
          ...state,
          player: nextPlayer,
          run: {
            ...baseRun,
            turn,
            breakthroughPlan: undefined,
            lastOutcome: {
              kind: 'breakthrough',
              success: true,
              title: '突破成功！',
              text: `你冲破瓶颈，踏入${nextPlayer.realm}之境！灵气灌体，生命上限提升至${maxHp}，顿悟获得${expGain}点经验。`,
              deltas,
            },
          },
        }
        nextState = addLog(nextState, `突破成功，境界提升至${nextPlayer.realm}`)
        return { ...nextState, run: { ...nextState.run, rngCalls } }
      }

      const dmg = nextInt(2, 6)
      const hp = nextPlayer.hp - dmg
      const inheritanceGain = 1 + nextInt(0, 1)
      nextPlayer = {
        ...nextPlayer,
        hp,
        inheritancePoints: nextPlayer.inheritancePoints + inheritanceGain,
        pity: nextPlayer.pity + 1,
      }
      const deltas = buildOutcomeDeltas(beforePlayer, nextPlayer)
      let nextState: GameState = {
        ...state,
        player: nextPlayer,
        run: {
          ...baseRun,
          turn,
          breakthroughPlan: undefined,
          lastOutcome: {
            kind: 'breakthrough',
            success: false,
            title: '突破失败',
            text: `突破受阻，气血翻涌损失${dmg}点生命。虽败犹荣，你获得${inheritanceGain}点传承点，保底进度+1。`,
            deltas,
          },
        },
      }
      nextState = addLog(nextState, `突破失败，获得${inheritanceGain}点传承点`)
      if (hp <= 0) {
        nextState = {
          ...nextState,
          screen: 'death',
          summary: { cause: '心魔反噬', turns: turn },
        }
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'OUTCOME_CONTINUE': {
      let nextState: GameState = {
        ...state,
        screen: action.to,
        run: {
          ...baseRun,
          breakthroughPlan: undefined,
          lastOutcome: undefined,
        },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    case 'OUTCOME_RETRY_BREAKTHROUGH': {
      const plan = createBreakthroughPlan(state, 0, 0)
      let nextState: GameState = {
        ...state,
        screen: 'breakthrough',
        run: {
          ...baseRun,
          breakthroughPlan: plan,
          lastOutcome: undefined,
        },
      }
      return { ...nextState, run: { ...nextState.run, rngCalls } }
    }
    default: {
      return { ...state, run: { ...state.run, rngCalls } }
    }
  }
}
