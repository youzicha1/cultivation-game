import { useState, useCallback, useRef, useEffect } from 'react'
import type { GameAction, GameState } from '../../engine'
import {
  alchemyMaterials,
  alchemyRecipes,
  getDailyEnvironmentDef,
  getRecipe,
  PITY_ALCHEMY_HARD,
  PITY_ALCHEMY_THRESHOLD,
  PITY_DEBUG_SHOW_VALUES,
} from '../../engine'
import { getAlchemyChances, getAlchemyShortage, type AlchemySelection } from '../../engine/alchemy_calc'
import type { HeatLevel } from '../../engine'
import { AlchemyFurnaceGauge } from '../ui/AlchemyFurnaceGauge'
import { AlchemyResultEffect, getAlchemyResultGrade, type AlchemyGrade } from '../ui/AlchemyResultEffect'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { StickyFooter } from '../ui/StickyFooter'
import { Modal } from '../ui/Modal'

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

  const selection: AlchemySelection = { recipeId: plan.recipeId, batch, heat }
  const { shortages, canBrew } = getAlchemyShortage(state, selection)
  const chances = getAlchemyChances(state, selection)

  const [rateExpanded, setRateExpanded] = useState(false)
  const [isBrewing, setIsBrewing] = useState(false)
  const brewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unlocked = recipe ? state.player.recipesUnlocked[recipe.id] : false
  const canBrewThisBatch = unlocked && canBrew

  useEffect(() => () => {
    if (brewTimeoutRef.current) clearTimeout(brewTimeoutRef.current)
  }, [])

  const handleBrewClick = useCallback(() => {
    if (!recipe || !canBrewThisBatch || isBrewing) return
    setIsBrewing(true)
    brewTimeoutRef.current = setTimeout(() => {
      brewTimeoutRef.current = null
      dispatch({ type: 'ALCHEMY_BREW_CONFIRM' })
      setIsBrewing(false)
    }, 1400)
  }, [recipe, canBrewThisBatch, isBrewing, dispatch])

  const dailyEnv = state.meta?.daily
    ? getDailyEnvironmentDef(state.meta.daily.environmentId as import('../../engine').DailyEnvironmentId)
    : null

  const shortageText =
    shortages.length > 0
      ? `材料不足：缺 ${shortages.map((s) => `${s.name}×${s.missing}`).join('、')}`
      : '可炼'
  const boomRateHigh = chances ? chances.boomRate >= BOOM_RATE_HIGH_THRESHOLD : false
  const primaryButtonReason =
    !canBrewThisBatch && shortages.length > 0
      ? `材料不足：缺 ${shortages.map((s) => `${s.name}×${s.missing}`).join('、')}`
      : null

  // ——— 结果弹层（TICKET-17A：居中 Modal + 品级特效） ———
  if (outcome?.kind === 'alchemy') {
    const isBoom = outcome.boomed
    const isSuccess = outcome.successes > 0
    const hasTian = outcome.items?.tian > 0
    const hasDi = outcome.items?.di > 0
    const resultGrade: AlchemyGrade = getAlchemyResultGrade(outcome.items, isBoom)
    const shakeClass = resultGrade === 'tian' ? 'alchemy-page--shake-tian' : resultGrade === 'di' ? 'alchemy-page--shake-di' : ''

    return (
      <div className={`alchemy-page alchemy-page--with-modal ${shakeClass}`}>
        <AlchemyResultEffect grade={resultGrade} hasBoom={outcome.booms > 0} />
        <Modal className="modal-backdrop--alchemy-result">
          <div
            className={`alchemy-outcome alchemy-outcome--${isBoom ? 'boom' : isSuccess ? 'success' : 'fail'} alchemy-outcome--grade-${resultGrade} ${hasTian ? 'alchemy-outcome--tian' : ''} ${hasDi ? 'alchemy-outcome--di' : ''}`}
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
                  继续炼丹
                </Button>
                <Button
                  variant="option-blue"
                  size="sm"
                  onClick={() => dispatch({ type: 'OUTCOME_CONTINUE', to: 'breakthrough' })}
                >
                  去突破
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
        </Modal>
      </div>
    )
  }

  // ——— 主界面：一屏布局 + 底部固定条 ———
  return (
    <div className="alchemy-page">
      {isBrewing && (
        <div className="alchemy-brewing-overlay" aria-live="polite" aria-busy="true">
          <span className="alchemy-brewing-overlay__text">炼中…</span>
          <span className="alchemy-brewing-overlay__glow" />
        </div>
      )}
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
              <Button
                variant="option-green"
                size="sm"
                className="alchemy-goto-btn"
                onClick={() =>
                  dispatch({
                    type: 'GO',
                    screen: 'shop',
                    shopMissing: shortages.map((s) => ({ materialId: s.materialId, need: s.missing })),
                  })
                }
              >
                去坊市
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
                const shortForB = getAlchemyShortage(state, { recipeId: plan.recipeId, batch: b, heat })
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
            {chances && (
              <>
                <div className="alchemy-gauge-wrap">
                  <AlchemyFurnaceGauge
                    successRate={chances.successRate}
                    boomRate={chances.boomRate}
                    mode={isBrewing ? 'brewing' : 'idle'}
                  />
                </div>
                <div className="alchemy-rate-block">
                  <div className="alchemy-rate-big">
                    <span className="alchemy-rate-big-value">
                      {(chances.successRate * 100).toFixed(0)}%
                    </span>
                    <span className="alchemy-rate-big-label">成功率</span>
                  </div>
                  <div className="alchemy-rate-boom">
                    爆丹 {(chances.boomRate * 100).toFixed(1)}%
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
                        <li>基础：{(chances.breakdown.success.base * 100).toFixed(0)}%</li>
                        <li>境界：+{(chances.breakdown.success.realmBonus * 100).toFixed(0)}%</li>
                        <li>保底：+{(chances.breakdown.success.pityBonus * 100).toFixed(0)}%</li>
                        <li>熟练：+{(chances.breakdown.success.masteryBonus * 100).toFixed(0)}%</li>
                        <li>每日：+{(chances.breakdown.success.dailyBonus * 100).toFixed(0)}%</li>
                        <li>炉温：{(chances.breakdown.success.heatMod >= 0 ? '+' : '')}{(chances.breakdown.success.heatMod * 100).toFixed(0)}%</li>
                        <li><strong>最终：{(chances.breakdown.success.final * 100).toFixed(1)}%</strong></li>
                      </ul>
                    </div>
                    <div className="alchemy-breakdown-section">
                      <div className="alchemy-breakdown-title">爆丹率</div>
                      <ul>
                        <li>基础：{(chances.breakdown.boom.base * 100).toFixed(1)}%</li>
                        <li>炉温×{chances.breakdown.boom.heatMultiplier}</li>
                        <li>每日×{chances.breakdown.boom.dailyMultiplier}</li>
                        <li><strong>最终：{(chances.breakdown.boom.final * 100).toFixed(1)}%</strong></li>
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* TICKET-17A: 底部固定操作条（StickyFooter） */}
        <StickyFooter
          className="alchemy-footer"
          hint={
            <>
              {!unlocked && recipe && '未解锁该配方'}
              {unlocked && shortageText}
              {boomRateHigh && canBrewThisBatch && (
                <span className="alchemy-footer-risk">风险：爆丹率 {((chances?.boomRate ?? 0) * 100).toFixed(0)}%（建议稳火）</span>
              )}
            </>
          }
          actions={
            <>
              <Button
                variant="primary"
                size="md"
                className="alchemy-footer-main-btn"
                onClick={handleBrewClick}
                disabled={!recipe || !canBrewThisBatch || isBrewing}
                title={primaryButtonReason ?? undefined}
              >
                {isBrewing ? '炼中…' : '炼丹'}
              </Button>
              <span className="alchemy-time-hint">消耗：1 时辰</span>
              <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
                返回
              </Button>
            </>
          }
        />
      </Panel>
    </div>
  )
}
