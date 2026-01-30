import { useState } from 'react'
import type { GameAction, GameState } from '../../engine'
import {
  alchemyMaterials,
  alchemyRecipes,
  buildKungfaModifiers,
  getAlchemyRates,
  getDailyEnvironmentDef,
  getDailyModifiers,
  getMaterialShortage,
  getRecipe,
  PITY_ALCHEMY_THRESHOLD,
  PITY_ALCHEMY_HARD,
  PITY_DEBUG_SHOW_VALUES,
} from '../../engine'
import type { HeatLevel } from '../../engine'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

const HEAT_OPTIONS: { value: HeatLevel; label: string }[] = [
  { value: 'steady', label: '稳' },
  { value: 'push', label: '冲' },
  { value: 'blast', label: '爆' },
]

const BOOM_RATE_HIGH_THRESHOLD = 0.15

export function AlchemyScreen({ state, dispatch }: ScreenProps) {
  const outcome = state.run.lastOutcome
  const plan = state.run.alchemyPlan ?? { recipeId: 'qi_pill_recipe', batch: 1, heat: 'push' }
  const recipe = getRecipe(plan.recipeId)
  const batch = Math.max(1, Math.min(5, plan.batch))
  const heat = plan.heat ?? 'push'

  const realmOrder = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神']
  const realmIndex = Math.max(0, realmOrder.indexOf(state.player.realm))

  const [rateExpanded, setRateExpanded] = useState(false)

  const unlocked = recipe ? state.player.recipesUnlocked[recipe.id] : false
  const { shortages, canBrew } = recipe
    ? getMaterialShortage(recipe, batch, state.player.materials as Record<string, number>)
    : { shortages: [] as Array<{ materialId: string; name: string; need: number; have: number; missing: number }>, canBrew: false }

  const dailyMod = state.meta?.daily
    ? getDailyModifiers(state.meta.daily.environmentId as import('../../engine').DailyEnvironmentId)
    : undefined
  const kungfuMod = {
    alchemyBoomMul: buildKungfaModifiers(state).alchemyBoomMul,
    alchemyQualityShift: buildKungfaModifiers(state).alchemyQualityShift,
  }
  const rates = recipe
    ? getAlchemyRates({
        recipe,
        realmIndex,
        pity: state.player.pity,
        totalBrews: state.player.codex.totalBrews,
        heat,
        dailyMod,
        kungfuMod,
      })
    : null

  const dailyEnv = state.meta?.daily
    ? getDailyEnvironmentDef(state.meta.daily.environmentId as import('../../engine').DailyEnvironmentId)
    : null

  const shortageText =
    shortages.length > 0
      ? `材料不足：缺 ${shortages.map((s) => `${s.name}×${s.missing}`).join('、')}`
      : '可炼'
  const boomRateHigh = rates ? rates.finalBoomRate >= BOOM_RATE_HIGH_THRESHOLD : false

  const canBrewThisBatch = unlocked && canBrew

  // ——— 结果弹层（居中浮层，不替换整页，主按钮仍在底部） ———
  if (outcome?.kind === 'alchemy') {
    const isBoom = outcome.boomed
    const isSuccess = outcome.successes > 0
    const hasTian = outcome.items?.tian > 0
    const hasDi = outcome.items?.di > 0

    return (
      <div className="alchemy-page alchemy-page--with-modal">
        <div className="alchemy-page__mask" />
        <div className="alchemy-page__result-modal">
          <div
            className={`alchemy-outcome alchemy-outcome--${isBoom ? 'boom' : isSuccess ? 'success' : 'fail'} ${hasTian ? 'alchemy-outcome--tian' : ''} ${hasDi ? 'alchemy-outcome--di' : ''}`}
          >
            {hasTian && (
              <div className="alchemy-quality-banner alchemy-quality-banner--tian">
                🌟 天品出世！！🌟
              </div>
            )}
            {hasDi && !hasTian && (
              <div className="alchemy-quality-banner alchemy-quality-banner--di">
                ✨ 地品丹成！✨
              </div>
            )}
            {outcome.booms > 0 && (
              <div className="alchemy-quality-banner alchemy-quality-banner--boom">
                ⚠️ 炉火反噬！⚠️
              </div>
            )}
            <div className="alchemy-outcome__hero">
              <span className="alchemy-outcome__icon" aria-hidden>
                {hasTian ? '🌟' : hasDi ? '✨' : isBoom ? '✕' : isSuccess ? '◆' : '·'}
              </span>
              <h2 className="alchemy-outcome__title">{outcome.title}</h2>
            </div>
            <div className="alchemy-outcome__card">
              <p className="alchemy-outcome__text">{outcome.text}</p>
              <div className="alchemy-battle-report">
                <div className="page-chips">
                  <span className="app-chip app-chip--pity">尝试 {outcome.attempted} 炉</span>
                  <span
                    className={
                      outcome.successes > 0 ? 'app-chip app-chip--gold' : 'app-chip app-chip--danger'
                    }
                  >
                    成功 {outcome.successes} 炉
                  </span>
                  {outcome.booms > 0 && (
                    <span className="app-chip app-chip--danger">爆丹 {outcome.booms} 次</span>
                  )}
                </div>
                {outcome.items && (
                  <div className="page-chips">
                    {outcome.items.fan > 0 && (
                      <span className="app-chip app-chip--pity">凡×{outcome.items.fan}</span>
                    )}
                    {outcome.items.xuan > 0 && (
                      <span className="app-chip app-chip--gold">玄×{outcome.items.xuan}</span>
                    )}
                    {outcome.items.di > 0 && (
                      <span className="app-chip app-chip--epic">地×{outcome.items.di}</span>
                    )}
                    {outcome.items.tian > 0 && (
                      <span className="app-chip app-chip--legendary">天×{outcome.items.tian}</span>
                    )}
                  </div>
                )}
                <div className="page-chips">
                  <span
                    className={
                      outcome.hpDelta >= 0 ? 'app-chip app-chip--hp' : 'app-chip app-chip--danger'
                    }
                  >
                    生命 {outcome.hpDelta > 0 ? '+' : ''}
                    {outcome.hpDelta}
                  </span>
                </div>
              </div>
              <div className="alchemy-result-actions">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => dispatch({ type: 'OUTCOME_CONTINUE', to: 'alchemy' })}
                >
                  再炼一次
                </Button>
                <Button
                  variant="option-blue"
                  size="sm"
                  onClick={() => dispatch({ type: 'ALCHEMY_OPEN_CODEX' })}
                >
                  图鉴
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch({ type: 'OUTCOME_CONTINUE', to: 'home' })}
                >
                  回主页
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ——— 主界面：一屏布局 + 底部固定条 ———
  return (
    <div className="alchemy-page">
      <Panel title="炼丹" className="alchemy-panel">
        {/* 顶部：资源条 */}
        <header className="alchemy-resource-bar">
          {dailyEnv && (
            <div className="alchemy-daily-hint">今日：{dailyEnv.name}</div>
          )}
          <div className="alchemy-pity-bar">
            <span className="alchemy-pity-label">天机：地品保底 {`${state.meta?.pityAlchemyTop ?? 0}/${PITY_ALCHEMY_THRESHOLD}`}</span>
            {(state.meta?.pityAlchemyTop ?? 0) >= PITY_ALCHEMY_THRESHOLD && (
              <span className="alchemy-pity-hint">天机渐明：下一炉更易出地品/天品</span>
            )}
            {PITY_DEBUG_SHOW_VALUES && (
              <span className="alchemy-pity-debug">[调试] 炼丹保底={state.meta?.pityAlchemyTop ?? 0} 硬保底阈值={PITY_ALCHEMY_HARD}</span>
            )}
          </div>
          <div className="alchemy-materials-row">
            {alchemyMaterials.map((m) => {
              const have = state.player.materials[m.id] ?? 0
              const need = recipe ? (recipe.cost[m.id] ?? 0) * batch : 0
              const isShort = need > 0 && have < need
              return (
                <div
                  key={m.id}
                  className={`alchemy-mat-item ${isShort ? 'alchemy-mat-item--short' : ''}`}
                  title={isShort ? `缺 ${m.name}×${need - have}` : undefined}
                >
                  <span className="alchemy-mat-name">{m.name}</span>
                  <span className="alchemy-mat-count">
                    {have}
                    {need > 0 && (
                      <span className="alchemy-mat-need">/需{need}</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
          {shortages.length > 0 && (
            <div className="alchemy-shortage-line">
              <span className="alchemy-shortage-label">缺口：</span>
              {shortages.map((s) => (
                <span key={s.materialId} className="alchemy-shortage-item">
                  缺 {s.name}×{s.missing}
                </span>
              ))}
              <Button
                variant="option-green"
                size="sm"
                className="alchemy-goto-btn"
                onClick={() => dispatch({ type: 'GO', screen: 'explore' })}
              >
                去探索
              </Button>
            </div>
          )}
        </header>

        {/* 主体：两列(PC) / 单列(手机)，可局部滚动 */}
        <div className="alchemy-main">
          <div className="alchemy-main-col alchemy-main-col--left">
            <div className="alchemy-label">配方</div>
            <div className="alchemy-recipe-row">
              {alchemyRecipes.map((r) => {
                const isUnlocked = state.player.recipesUnlocked[r.id]
                const fragNeed = r.unlock.type === 'fragment' ? r.unlock.need : 0
                const fragHave = state.player.fragments[r.id] ?? 0
                const selected = plan.recipeId === r.id
                return (
                  <Button
                    key={r.id}
                    variant={selected ? 'option-green' : 'pill-chip'}
                    size="sm"
                    className={`alchemy-recipe-btn ${selected ? 'alchemy-recipe-btn--selected' : ''}`}
                    onClick={() =>
                      dispatch({ type: 'ALCHEMY_SET_RECIPE', recipeId: r.id, batch, heat })
                    }
                    disabled={!isUnlocked}
                    title={
                      !isUnlocked && r.unlock.type === 'fragment'
                        ? `残页 ${fragHave}/${fragNeed}`
                        : undefined
                    }
                  >
                    {r.name}
                    {!isUnlocked && r.unlock.type === 'fragment' ? ` ${fragHave}/${fragNeed}` : ''}
                  </Button>
                )
              })}
            </div>

            <div className="alchemy-label">炉温</div>
            <div className="alchemy-heat-row">
              {HEAT_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={
                    opt.value === 'blast' ? 'option-purple' : opt.value === 'push' ? 'option-blue' : 'option-green'
                  }
                  size="sm"
                  className={`alchemy-heat-btn ${heat === opt.value ? 'alchemy-heat-btn--selected' : ''}`}
                  onClick={() =>
                    dispatch({ type: 'ALCHEMY_SET_RECIPE', recipeId: plan.recipeId, batch, heat: opt.value })
                  }
                  title={
                    opt.value === 'steady'
                      ? '稳：爆丹率-，天丹率-'
                      : opt.value === 'push'
                      ? '冲：默认'
                      : '爆：爆丹率+，天丹率+（高风险高收益）'
                  }
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            <div className="alchemy-label">批量</div>
            <div className="alchemy-batch-row">
              {[1, 2, 3, 4, 5].map((b) => {
                const shortForB =
                  recipe != null
                    ? getMaterialShortage(recipe, b, state.player.materials as Record<string, number>)
                    : { canBrew: false as const, shortages: [] as Array<{ name: string; missing: number }> }
                const disabled = !unlocked || !shortForB.canBrew
                const selected = batch === b
                return (
                  <Button
                    key={b}
                    variant="pill-chip"
                    size="sm"
                    className={`alchemy-batch-btn ${selected ? 'alchemy-batch-btn--selected' : ''}`}
                    onClick={() =>
                      dispatch({ type: 'ALCHEMY_SET_RECIPE', recipeId: plan.recipeId, batch: b, heat })
                    }
                    disabled={disabled}
                    title={
                      !shortForB.canBrew && shortForB.shortages.length > 0
                        ? `缺 ${shortForB.shortages.map((s) => `${s.name}×${s.missing}`).join('、')}`
                        : undefined
                    }
                  >
                    ×{b}
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="alchemy-main-col alchemy-main-col--right">
            {rates && (
              <>
                <div className="alchemy-rate-block">
                  <div className="alchemy-rate-big">
                    <span className="alchemy-rate-big-value">
                      {(rates.finalSuccessRate * 100).toFixed(0)}%
                    </span>
                    <span className="alchemy-rate-big-label">成功率</span>
                  </div>
                  <div className="alchemy-rate-boom">
                    爆丹 {(rates.finalBoomRate * 100).toFixed(1)}%
                  </div>
                  <button
                    type="button"
                    className="alchemy-rate-toggle"
                    onClick={() => setRateExpanded(!rateExpanded)}
                    aria-expanded={rateExpanded}
                  >
                    {rateExpanded ? '收起' : '展开'}概率拆解
                  </button>
                </div>
                {rateExpanded && (
                  <div className="alchemy-rate-breakdown">
                    <div className="alchemy-breakdown-section">
                      <div className="alchemy-breakdown-title">成功率</div>
                      <ul>
                        <li>基础：{(rates.breakdown.success.base * 100).toFixed(0)}%</li>
                        <li>境界：+{(rates.breakdown.success.realmBonus * 100).toFixed(0)}%</li>
                        <li>保底：+{(rates.breakdown.success.pityBonus * 100).toFixed(0)}%</li>
                        <li>熟练：+{(rates.breakdown.success.masteryBonus * 100).toFixed(0)}%</li>
                        <li>每日：+{(rates.breakdown.success.dailyBonus * 100).toFixed(0)}%</li>
                        <li>炉温：{(rates.breakdown.success.heatMod >= 0 ? '+' : '')}{(rates.breakdown.success.heatMod * 100).toFixed(0)}%</li>
                        <li><strong>最终：{(rates.breakdown.success.final * 100).toFixed(1)}%</strong></li>
                      </ul>
                    </div>
                    <div className="alchemy-breakdown-section">
                      <div className="alchemy-breakdown-title">爆丹率</div>
                      <ul>
                        <li>基础：{(rates.breakdown.boom.base * 100).toFixed(1)}%</li>
                        <li>炉温×{rates.breakdown.boom.heatMultiplier}</li>
                        <li>每日×{rates.breakdown.boom.dailyMultiplier}</li>
                        <li><strong>最终：{(rates.breakdown.boom.final * 100).toFixed(1)}%</strong></li>
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 底部固定操作条 */}
        <footer className="alchemy-footer">
          <div className="alchemy-footer-hint">
            {!unlocked && recipe && '未解锁该配方'}
            {unlocked && shortageText}
            {boomRateHigh && canBrewThisBatch && (
              <span className="alchemy-footer-risk">爆丹率较高，小心反噬</span>
            )}
          </div>
          <div className="alchemy-footer-actions">
            <div className="alchemy-brew-row">
              <Button
                variant="primary"
                size="md"
                className="alchemy-footer-main-btn"
                onClick={() => dispatch({ type: 'ALCHEMY_BREW_CONFIRM' })}
                disabled={!recipe || !canBrewThisBatch}
                title={!canBrewThisBatch && shortages.length > 0 ? shortageText : undefined}
              >
                炼丹
              </Button>
              <span className="alchemy-time-hint">消耗：1 时辰</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
              返回
            </Button>
          </div>
        </footer>
      </Panel>
    </div>
  )
}
