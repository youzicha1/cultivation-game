import type { ElixirQuality, GameAction, GameState } from '../../engine'
import {
  getBreakthroughView,
  getDailyEnvironmentDef,
  shouldShowClutchHint,
} from '../../engine'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

const QUALITY_LABEL: Record<ElixirQuality, string> = {
  fan: '凡',
  xuan: '玄',
  di: '地',
  tian: '天',
}

const BEST_QUALITY_FIRST: ElixirQuality[] = ['tian', 'di', 'xuan', 'fan']

type UseElixirPlan = {
  elixirId: 'spirit_pill' | 'foundation_pill'
  quality: ElixirQuality
  count: number
}

type PresetId = 'steady' | 'balanced' | 'allin'

function getPresetPlan(
  state: GameState,
  presetId: PresetId,
): {
  useElixir: UseElixirPlan | undefined
  inheritanceSpent: number
  disabled: boolean
  missingHint?: string
  reason?: string
} {
  const { player } = state
  const maxInheritance = Math.min(3, player.inheritancePoints)

  if (presetId === 'steady') {
    const spirit = bestQualityAndCount(player.elixirs, 'spirit_pill')
    const inheritanceSpent = Math.min(1, maxInheritance)
    if (totalPills(player.elixirs, 'spirit_pill') === 0) {
      return { useElixir: undefined, inheritanceSpent: 0, disabled: true, missingHint: '缺：凝神丹' }
    }
    return {
      useElixir: spirit ? { elixirId: 'spirit_pill', quality: spirit.quality, count: spirit.count } : undefined,
      inheritanceSpent,
      disabled: false,
      reason: '凝神丹+传承1，稳中求进',
    }
  }

  if (presetId === 'balanced') {
    const totalS = totalPills(player.elixirs, 'spirit_pill')
    const totalF = totalPills(player.elixirs, 'foundation_pill')
    if (totalS === 0 && totalF === 0) {
      return { useElixir: undefined, inheritanceSpent: 0, disabled: true, missingHint: '缺：丹药' }
    }
    const pillId = totalF >= totalS ? 'foundation_pill' : 'spirit_pill'
    const best = bestQualityAndCount(player.elixirs, pillId)
    const inheritanceSpent = Math.min(2, maxInheritance)
    return {
      useElixir: best ? { elixirId: pillId, quality: best.quality, count: best.count } : undefined,
      inheritanceSpent,
      disabled: false,
      reason: '高库存丹+传承2，均衡配置',
    }
  }

  if (presetId === 'allin') {
    const foundation = bestQualityAndCount(player.elixirs, 'foundation_pill')
    if (totalPills(player.elixirs, 'foundation_pill') === 0) {
      return { useElixir: undefined, inheritanceSpent: 0, disabled: true, missingHint: '缺：筑基丹' }
    }
    const count = foundation?.count ?? 0
    const quality = foundation?.quality ?? 'fan'
    const inheritanceSpent = Math.min(3, maxInheritance)
    const missing: string[] = []
    if (inheritanceSpent < 3) missing.push('献祭传承×' + (3 - inheritanceSpent))
    return {
      useElixir: foundation ? { elixirId: 'foundation_pill', quality, count: count || 1 } : undefined,
      inheritanceSpent,
      disabled: false,
      missingHint: missing.length > 0 ? missing.join('、') : undefined,
      reason: `筑基丹×${count}+传承${inheritanceSpent}，梭哈一把`,
    }
  }

  return { useElixir: undefined, inheritanceSpent: 0, disabled: true }
}

function totalPills(
  elixirs: GameState['player']['elixirs'],
  pillId: 'spirit_pill' | 'foundation_pill',
): number {
  const e = elixirs[pillId]
  return e.fan + e.xuan + e.di + e.tian
}

function bestQualityAndCount(
  elixirs: GameState['player']['elixirs'],
  pillId: 'spirit_pill' | 'foundation_pill',
): { quality: ElixirQuality; count: number } | null {
  const e = elixirs[pillId]
  for (const q of BEST_QUALITY_FIRST) {
    const n = e[q]
    if (n > 0) return { quality: q, count: n }
  }
  return null
}

function planMatches(
  plan: { useElixir?: UseElixirPlan; inheritanceSpent: number },
  preset: { useElixir?: UseElixirPlan; inheritanceSpent: number },
): boolean {
  if (plan.inheritanceSpent !== preset.inheritanceSpent) return false
  if (!plan.useElixir && !preset.useElixir) return true
  if (!plan.useElixir || !preset.useElixir) return false
  return (
    plan.useElixir.elixirId === preset.useElixir.elixirId &&
    plan.useElixir.quality === preset.useElixir.quality &&
    plan.useElixir.count === preset.useElixir.count
  )
}

export function BreakthroughScreen({ state, dispatch }: ScreenProps) {
  const outcome = state.run.lastOutcome
  const plan = state.run.breakthroughPlan

  // ——— 战报式结算页（居中弹层） ———
  if (outcome?.kind === 'breakthrough') {
    const isSuccess = outcome.success

    return (
      <div className="breakthrough-page breakthrough-page--with-modal">
        <div className="breakthrough-page__mask" />
        <div className="breakthrough-page__result-modal">
          <div className={`breakthrough-battle-report breakthrough-battle-report--${isSuccess ? 'success' : 'failure'}`}>
            {/* 强反馈横幅（阶突破 / 境界突破共用 outcome.title） */}
            {isSuccess ? (
              <div className="breakthrough-banner breakthrough-banner--success">
                ✨ {outcome.title} ✨
              </div>
            ) : (
              <div className="breakthrough-banner breakthrough-banner--failure">
                ⚠️ {outcome.title} ⚠️
              </div>
            )}

            <div className="breakthrough-battle-report__hero">
              <h1 className="breakthrough-battle-report__title">{outcome.title}</h1>
              <p className="breakthrough-battle-report__subtitle">{outcome.text}</p>
            </div>

            {/* 战报内容：变化展示 */}
            <div className="breakthrough-battle-report__content">
              <div className="breakthrough-battle-report__section">
                <div className="breakthrough-battle-report__label">变化</div>
                <div className="breakthrough-battle-report__deltas">
                  {outcome.deltas.realm !== 0 && (
                    <div className="breakthrough-delta-item">
                      <span className="breakthrough-delta-label">境界</span>
                      <span className={`breakthrough-delta-value ${outcome.deltas.realm > 0 ? 'breakthrough-delta-value--up' : ''}`}>
                        {outcome.deltas.realm > 0 ? '↑' : '↓'} {Math.abs(outcome.deltas.realm)}
                      </span>
                    </div>
                  )}
                  {outcome.deltas.hp !== 0 && (
                    <div className="breakthrough-delta-item">
                      <span className="breakthrough-delta-label">生命</span>
                      <span className={`breakthrough-delta-value ${outcome.deltas.hp > 0 ? 'breakthrough-delta-value--up' : 'breakthrough-delta-value--down'}`}>
                        {outcome.deltas.hp > 0 ? '↑' : '↓'} {Math.abs(outcome.deltas.hp)}
                      </span>
                    </div>
                  )}
                  {outcome.deltas.maxHp !== 0 && (
                    <div className="breakthrough-delta-item">
                      <span className="breakthrough-delta-label">最大生命</span>
                      <span className={`breakthrough-delta-value ${outcome.deltas.maxHp > 0 ? 'breakthrough-delta-value--up' : ''}`}>
                        ↑ {outcome.deltas.maxHp}
                      </span>
                    </div>
                  )}
                  {outcome.deltas.exp !== 0 && (
                    <div className="breakthrough-delta-item">
                      <span className="breakthrough-delta-label">修为</span>
                      <span className="breakthrough-delta-value breakthrough-delta-value--up">
                        ↑ {outcome.deltas.exp}
                      </span>
                    </div>
                  )}
                  {outcome.deltas.inheritancePoints !== 0 && (
                    <div className="breakthrough-delta-item">
                      <span className="breakthrough-delta-label">献祭传承</span>
                      <span className={`breakthrough-delta-value ${outcome.deltas.inheritancePoints > 0 ? 'breakthrough-delta-value--up' : 'breakthrough-delta-value--down'}`}>
                        {outcome.deltas.inheritancePoints > 0 ? '↑' : '↓'} {Math.abs(outcome.deltas.inheritancePoints)}
                      </span>
                    </div>
                  )}
                  {outcome.deltas.pity !== 0 && (
                    <div className="breakthrough-delta-item">
                      <span className="breakthrough-delta-label">保底</span>
                      <span className={`breakthrough-delta-value ${outcome.deltas.pity > 0 ? 'breakthrough-delta-value--up' : ''}`}>
                        {outcome.deltas.pity > 0 ? '↑' : '↓'} {Math.abs(outcome.deltas.pity)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 消耗展示 */}
              {outcome.consumed && (
                <div className="breakthrough-battle-report__section">
                  <div className="breakthrough-battle-report__label">消耗</div>
                  <div className="breakthrough-battle-report__consumed">
                    {outcome.consumed.inheritanceSpent > 0 && (
                      <span className="breakthrough-consumed-item">献祭传承×{outcome.consumed.inheritanceSpent}</span>
                    )}
                    {outcome.consumed.elixir && (
                      <span className="breakthrough-consumed-item">
                        {outcome.consumed.elixir.elixirId === 'spirit_pill' ? '凝神丹' : '筑基丹'}（{QUALITY_LABEL[outcome.consumed.elixir.quality]}）×{outcome.consumed.elixir.count}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 失败补偿强调 */}
              {!isSuccess && (
                <div className="breakthrough-battle-report__compensation">
                  <div className="breakthrough-compensation-title">你从失败中悟得天机</div>
                  <div className="breakthrough-compensation-items">
                    {outcome.deltas.inheritancePoints > 0 && (
                      <span className="breakthrough-compensation-item">献祭传承+{outcome.deltas.inheritancePoints}（本局突破用）</span>
                    )}
                    {outcome.deltas.pity > 0 && (
                      <span className="breakthrough-compensation-item">保底+{outcome.deltas.pity}（下次更香）</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 下一步引导 */}
            <div className="breakthrough-battle-report__actions">
              <Button
                variant="primary"
                size="md"
                onClick={() => dispatch({ type: 'OUTCOME_RETRY_BREAKTHROUGH' })}
              >
                再冲一次
              </Button>
              {isSuccess ? (
                <>
                  <Button
                    variant="option-green"
                    size="sm"
                    onClick={() => dispatch({ type: 'OUTCOME_CONTINUE', to: 'explore' })}
                  >
                    去探索
                  </Button>
                  <Button
                    variant="option-blue"
                    size="sm"
                    onClick={() => dispatch({ type: 'OUTCOME_CONTINUE', to: 'alchemy' })}
                  >
                    去炼丹
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="option-green"
                    size="sm"
                    onClick={() => dispatch({ type: 'OUTCOME_CONTINUE', to: 'alchemy' })}
                  >
                    去炼丹
                  </Button>
                  <Button
                    variant="option-blue"
                    size="sm"
                    onClick={() => dispatch({ type: 'OUTCOME_CONTINUE', to: 'cultivate' })}
                  >
                    去修炼
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'OUTCOME_CONTINUE', to: 'home' })}>
                回主页
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ——— 主界面：一屏布局 + 底部固定条（单一来源 getBreakthroughView） ———
  const view = getBreakthroughView(state)
  const currentPlan = plan ?? { inheritanceSpent: 0, previewRate: 0, useElixir: undefined }
  const rate = view.successRate
  const kungfuAdd = view.breakdown.kungfuAdd ?? 0

  const presetSteady = getPresetPlan(state, 'steady')
  const presetBalanced = getPresetPlan(state, 'balanced')
  const presetAllin = getPresetPlan(state, 'allin')

  const clutchHint = shouldShowClutchHint(state)

  const applyPreset = (presetId: PresetId) => {
    const p = presetId === 'steady' ? presetSteady : presetId === 'balanced' ? presetBalanced : presetAllin
    if (p.disabled) return
    dispatch({
      type: 'BREAKTHROUGH_SET_PLAN',
      inheritanceSpent: p.inheritanceSpent,
      useElixir: p.useElixir,
    })
  }

  const dailyEnv = state.meta?.daily
    ? getDailyEnvironmentDef(state.meta.daily.environmentId as import('../../engine').DailyEnvironmentId)
    : null

  return (
    <div className="breakthrough-page">
      {/* 顶部：资源条（境界 + 阶 + 等级/本阶上限） */}
      <header className="breakthrough-resource-bar">
        <h2 className="breakthrough-resource-title">
          {view.realm} {view.stageIndex}阶 · Lv.{view.level}/{view.cap}
          {view.canRealmBreakthrough && ` → ${view.nextRealm}`}
        </h2>
        {dailyEnv && <div className="breakthrough-daily-hint">今日：{dailyEnv.name}</div>}
        <div className="breakthrough-realm-why" title="境界影响炼丹成功率、天劫难度与化解力、本局传承页点数结算">
          境界有什么用？每升一境：炼丹成功率+2%；天劫化解力+4、难度+6；本局结束时传承页点数+1。金丹/元婴/化神需对应功法方可冲关。
        </div>
        <div className="breakthrough-resource-chips">
          <Chip className="app-chip--gold">境界 {state.player.realm}</Chip>
          <Chip className="app-chip--hp">生命 {`${state.player.hp}/${state.player.maxHp}`}</Chip>
          <Chip className="app-chip--inherit" title="本局献祭用，突破时消耗可提高成功率；与传承页跨局点数不同">献祭传承 {state.player.inheritancePoints}</Chip>
          <Chip className="app-chip--pity">保底 {state.player.pity}</Chip>
        </div>
      </header>

      {/* 中部：阶突破 / 境界突破 二选一展示 */}
      <div className="breakthrough-main">
        {view.canStageBreakthrough && (
          <div className="breakthrough-stage-block">
            <div className="breakthrough-block-title">突破</div>
            <p className="breakthrough-block-desc">
              当前已达本阶上限（Lv{view.level}/{view.cap}），进行突破后可继续获得经验。
            </p>
            <div className="breakthrough-rate-display">
              <div className="breakthrough-rate-big">
                <span className="breakthrough-rate-big-value">{(view.stageBreakthroughRate * 100).toFixed(0)}%</span>
                <span className="breakthrough-rate-big-label">突破成功率</span>
              </div>
              <p className="breakthrough-rewards-desc">奖励：生命上限+10、回气丹×1；阶越高后续突破/渡劫基础成功率微幅提升。</p>
            </div>
          </div>
        )}

        {view.canRealmBreakthrough && (
          <>
            <div className="breakthrough-realm-block">
              <div className="breakthrough-block-title">境界突破</div>
              <p className="breakthrough-block-desc">
                已至 Lv99 且完成第7阶，可进行境界突破进入「{view.nextRealm}」。成功：境界+1、回满血、觉醒技能三选一；失败：高伤害，50% 概率境界跌落，保底+1、献祭传承补偿。
              </p>
            </div>
            <div className="breakthrough-rate-display">
              {!view.prereqOk && view.prereqReason && (
                <div className="breakthrough-prereq-warn">{view.prereqReason}</div>
              )}
              <div className="breakthrough-rate-big">
                <span className="breakthrough-rate-big-value">{(rate * 100).toFixed(0)}%</span>
                <span className="breakthrough-rate-big-label">境界突破成功率</span>
              </div>
              {view.prereqOk && rate === 0 && (
                <div className="breakthrough-kungfu-hint">需丹药或献祭传承增加成功率（基础 0%）</div>
              )}
              {kungfuAdd > 0 && (
                <div className="breakthrough-kungfu-hint">功法加成 +{(kungfuAdd * 100).toFixed(0)}%</div>
              )}
              {clutchHint.show && (
                <div className={`breakthrough-clutch-hint breakthrough-clutch-hint--${clutchHint.level}`}>
                  {clutchHint.message}
                </div>
              )}
            </div>
            <div className="breakthrough-presets">
              <div className="breakthrough-label">预设策略</div>
              <div className="breakthrough-presets-grid">
                <Button
                  variant="option-green"
                  size="sm"
                  className={`breakthrough-preset-btn ${planMatches(currentPlan, { useElixir: presetSteady.useElixir, inheritanceSpent: presetSteady.inheritanceSpent }) ? 'breakthrough-preset-btn--selected' : ''}`}
                  onClick={() => applyPreset('steady')}
                  disabled={presetSteady.disabled}
                  title={presetSteady.disabled ? presetSteady.missingHint : presetSteady.reason}
                >
                  <div className="breakthrough-preset-name">稳</div>
                  {presetSteady.disabled && presetSteady.missingHint && (
                    <div className="breakthrough-preset-missing">{presetSteady.missingHint}</div>
                  )}
                </Button>
                <Button
                  variant="option-blue"
                  size="sm"
                  className={`breakthrough-preset-btn ${planMatches(currentPlan, { useElixir: presetBalanced.useElixir, inheritanceSpent: presetBalanced.inheritanceSpent }) ? 'breakthrough-preset-btn--selected' : ''}`}
                  onClick={() => applyPreset('balanced')}
                  disabled={presetBalanced.disabled}
                  title={presetBalanced.disabled ? presetBalanced.missingHint : presetBalanced.reason}
                >
                  <div className="breakthrough-preset-name">均衡</div>
                  {presetBalanced.disabled && presetBalanced.missingHint && (
                    <div className="breakthrough-preset-missing">{presetBalanced.missingHint}</div>
                  )}
                </Button>
                <Button
                  variant="option-purple"
                  size="sm"
                  className={`breakthrough-preset-btn ${planMatches(currentPlan, { useElixir: presetAllin.useElixir, inheritanceSpent: presetAllin.inheritanceSpent }) ? 'breakthrough-preset-btn--selected' : ''}`}
                  onClick={() => applyPreset('allin')}
                  disabled={presetAllin.disabled}
                  title={presetAllin.disabled ? presetAllin.missingHint : presetAllin.reason}
                >
                  <div className="breakthrough-preset-name">梭哈</div>
                  {presetAllin.disabled && presetAllin.missingHint && (
                    <div className="breakthrough-preset-missing">{presetAllin.missingHint}</div>
                  )}
                  {!presetAllin.disabled && presetAllin.missingHint && (
                    <div className="breakthrough-preset-partial">{presetAllin.missingHint}</div>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {!view.canStageBreakthrough && !view.canRealmBreakthrough && (
          <div className="breakthrough-hint-block">
            <p>继续修炼或探索提升等级；到达本阶上限（Lv{view.cap}）后可进行<strong>突破</strong>；Lv99 且完成第7阶后可进行<strong>境界突破</strong>。</p>
          </div>
        )}
      </div>

      {/* 底部固定操作条 */}
      <footer className="breakthrough-footer">
        <div className="breakthrough-footer-preview">
          <div><strong>突破</strong>（达本阶上限）：生命+10、回气丹×1；<strong>境界突破</strong>（Lv99 第7阶）：境界+1、觉醒三选一、回满血。</div>
          <div className="breakthrough-why-hint">境界越高：炼丹成功率微幅提升；天劫化解力与难度同步提升；本局结算时传承页点数更多。</div>
        </div>
        <div className="breakthrough-footer-actions">
          <div className="breakthrough-confirm-row">
            {view.canStageBreakthrough && (
              <Button
                variant="primary"
                size="md"
                className="breakthrough-footer-main-btn"
                onClick={() => dispatch({ type: 'STAGE_BREAKTHROUGH_CONFIRM' })}
              >
                突破
              </Button>
            )}
            {view.canRealmBreakthrough && (
              <Button
                variant="primary"
                size="md"
                className="breakthrough-footer-main-btn"
                onClick={() => dispatch({ type: 'BREAKTHROUGH_CONFIRM' })}
              >
                开始境界突破
              </Button>
            )}
            {!view.canStageBreakthrough && !view.canRealmBreakthrough && (
              <span className="breakthrough-time-hint">达本阶上限或 Lv99 第7阶后可突破</span>
            )}
            {(view.canStageBreakthrough || view.canRealmBreakthrough) && (
              <span className="breakthrough-time-hint">消耗：1 时辰</span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
            返回
          </Button>
        </div>
      </footer>
    </div>
  )
}
