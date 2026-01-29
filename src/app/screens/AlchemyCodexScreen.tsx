import type { GameAction, GameState } from '../../engine'
import { alchemyRecipes } from '../../engine'
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

        {/* TICKET-8: 每种丹药最高品质 */}
        <div className="page-label">丹药最高品质</div>
        <div className="codex-list">
          {alchemyRecipes.map((r) => {
            const unlocked = state.player.recipesUnlocked[r.id]
            const bestByRecipe = codex.bestQualityByRecipe[r.id]
            const bestByElixir = bestQualityByElixir[r.elixirId] ?? 'none'
            const fragNeed = r.unlock.type === 'fragment' ? r.unlock.need : 0
            const fragHave = state.player.fragments[r.id] ?? 0
            return (
              <div key={r.id} className={`codex-item ${unlocked ? 'codex-item--unlocked' : ''}`}>
                <span className="codex-item__name">{r.name}</span>
                <span className="codex-item__meta">
                  {unlocked
                    ? `最高 ${qualityName[bestByElixir]}（配方：${qualityName[bestByRecipe]}）`
                    : r.unlock.type === 'fragment'
                    ? `残页 ${fragHave}/${fragNeed}`
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

