import type { GameAction, GameState } from '../../engine'
import { alchemyRecipes, getRecipesSynthesizable } from '../../engine'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

const qualityName: Record<string, string> = {
  none: '未炼出',
  fan: '凡',
  xuan: '玄',
  di: '地',
  tian: '天',
}

export function AlchemyCodexScreen({ state, dispatch }: ScreenProps) {
  const codex = state.player.codex
  const successBrews = codex.successBrews ?? 0
  const totalBlastHeatUsed = codex.totalBlastHeatUsed ?? 0
  const bestQualityByElixir = codex.bestQualityByElixir ?? {
    qi_pill: 'none' as const,
    spirit_pill: 'none' as const,
    foundation_pill: 'none' as const,
  }
  
  // TICKET-8: 计算全局最高品质
  const globalBestQuality = Object.values(bestQualityByElixir).reduce((best, q) => {
    if (q === 'none') return best
    if (best === 'none') return q
    const order = ['fan', 'xuan', 'di', 'tian']
    return order.indexOf(q) > order.indexOf(best) ? q : best
  }, 'none' as const)

  const synthesizable = getRecipesSynthesizable(state.player)
  const fragmentParts = state.player.fragmentParts ?? {}

  return (
    <Panel title="炼丹图鉴">
      <Stack gap={10}>
        {/* TICKET-8: 总统计 */}
        <div className="page-chips">
          <Chip className="app-chip--pity">炼丹 {codex.totalBrews}</Chip>
          <Chip className="app-chip--gold">成功 {successBrews}</Chip>
          <Chip className="app-chip--danger">爆丹 {codex.totalBooms}</Chip>
          {totalBlastHeatUsed > 0 && (
            <Chip className="app-chip--epic">爆炉 {totalBlastHeatUsed} 次</Chip>
          )}
        </div>
        
        {/* TICKET-8: 最高品质统计 */}
        {globalBestQuality !== 'none' && (
          <div className="page-chips">
            <Chip className={globalBestQuality === 'tian' ? 'app-chip--legendary' : globalBestQuality === 'di' ? 'app-chip--epic' : 'app-chip--gold'}>
              全局最高：{qualityName[globalBestQuality]}
            </Chip>
          </div>
        )}

        {/* 丹方合成：集齐上/中/下篇可合成，坊市不可出售残页 */}
        {synthesizable.length > 0 && (
          <>
            <div className="page-label">丹方合成</div>
            <div className="codex-list">
              {synthesizable.map((r) => (
                <div key={r.id} className="codex-item codex-item--synthesizable">
                  <span className="codex-item__name">{r.name}</span>
                  <span className="codex-item__meta">上/中/下篇已齐</span>
                  <Button variant="option-blue" size="sm" onClick={() => dispatch({ type: 'RECIPE_SYNTHESIZE', recipeId: r.id })}>
                    合成
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* TICKET-8: 每种丹药最高品质 */}
        <div className="page-label">丹药最高品质</div>
        <div className="codex-list">
          {alchemyRecipes.map((r) => {
            const unlocked = state.player.recipesUnlocked[r.id]
            const bestByRecipe = codex.bestQualityByRecipe[r.id]
            const bestByElixir = bestQualityByElixir[r.elixirId] ?? 'none'
            const parts = r.unlock.type === 'fragment' ? (fragmentParts[r.id] ?? { upper: 0, middle: 0, lower: 0 }) : null
            return (
              <div key={r.id} className={`codex-item ${unlocked ? 'codex-item--unlocked' : ''}`}>
                <span className="codex-item__name">{r.name}</span>
                <span className="codex-item__meta">
                  {unlocked
                    ? `最高 ${qualityName[bestByElixir]}（配方：${qualityName[bestByRecipe]}）`
                    : parts !== null
                    ? `残页 上${parts.upper} 中${parts.middle} 下${parts.lower}`
                    : '未解锁'}
                </span>
              </div>
            )
          })}
        </div>

        <div className="page-actions">
          <Button variant="option-blue" size="sm" onClick={() => dispatch({ type: 'OUTCOME_CONTINUE', to: 'alchemy' })}>
            返回炼丹
          </Button>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
            回主页
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}

