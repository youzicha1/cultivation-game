/**
 * TICKET-37: 奇遇链可到达性烟雾测试 — 用可控状态模拟触发并走完定向材料链拿到材料
 */

import { describe, expect, it } from 'vitest'
import { createInitialGameState, reduceGame } from './game'
import { createSeededRng } from './rng'
import { getChain, getChapter } from './chains'

function buildChainEventSnapshot(chainId: string, chapter: number): GameState['run']['currentEvent'] | null {
  const chain = getChain(chainId)
  const ch = getChapter(chainId, chapter)
  if (!chain || !ch) return null
  return {
    id: `chain_${chain.chainId}_ch${ch.chapter}`,
    title: ch.title,
    text: ch.text,
    aText: ch.choices.A.text,
    bText: ch.choices.B.text,
    rarity: 'legendary',
    chainId: chain.chainId,
    chapter: ch.chapter,
  }
}

type GameState = import('./game').GameState

describe('chain_reachability_smoke', () => {
  it('定向材料链（雷泽寻髓）从第 1 章选 B 两次可通关并拿到雷泽灵髓', () => {
    const chainId = 'leize_marrow_chain'
    const chain = getChain(chainId)
    expect(chain).toBeDefined()
    expect(chain!.chapters.length).toBe(2)
    const ch1 = getChapter(chainId, 1)
    const ch2 = getChapter(chainId, 2)
    expect(ch1).toBeDefined()
    expect(ch2).toBeDefined()
    expect(ch2?.final).toBe(true)
    expect(ch2?.guaranteedReward?.type).toBe('epic_material_elixir')
    expect((ch2?.guaranteedReward as { materialId?: string })?.materialId).toBe('leize_marrow')

    const rng = createSeededRng(999)
    let state = createInitialGameState(999)
    state = {
      ...state,
      run: {
        ...state.run,
        danger: 0,
        chain: { activeChainId: chainId, chapter: 1, completed: {} },
        currentEvent: buildChainEventSnapshot(chainId, 1) ?? undefined,
      },
    }
    expect(state.run.currentEvent?.chainId).toBe(chainId)
    expect(state.run.currentEvent?.chapter).toBe(1)

    state = reduceGame(state, { type: 'EXPLORE_CHOOSE', choice: 'B' }, rng) as GameState
    expect(state.run.chain?.activeChainId).toBe(chainId)
    expect(state.run.chain?.chapter).toBe(2)
    state = {
      ...state,
      run: {
        ...state.run,
        currentEvent: buildChainEventSnapshot(chainId, 2) ?? undefined,
      },
    }

    state = reduceGame(state, { type: 'EXPLORE_CHOOSE', choice: 'B' }, rng) as GameState
    expect(state.run.chain?.activeChainId).toBeUndefined()
    expect(state.run.chain?.completed?.[chainId]).toBe(true)
    const count = state.player.materials?.leize_marrow ?? 0
    expect(count).toBeGreaterThanOrEqual(1)
  })
})
