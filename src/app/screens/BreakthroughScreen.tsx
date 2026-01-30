import { useState } from 'react'
import type { ElixirQuality, GameAction, GameState } from '../../engine'
import {
  buildKungfaModifiers,
  calcBreakthroughRate,
  getDailyEnvironmentDef,
  getDailyModifiers,
  shouldShowClutchHint,
} from '../../engine'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { ProgressRing } from '../ui/ProgressRing'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

const REALMS = ['凡人', '炼气', '筑基', '金丹', '元婴', '化神'] as const

const QUALITY_LABEL: Record<ElixirQuality, string> = {
  fan: '凡',
  xuan: '玄',
  di: '地',
  tian: '天',
}

const QUALITIES: ElixirQuality[] = ['fan', 'xuan', 'di', 'tian']
const BEST_QUALITY_FIRST: ElixirQuality[] = ['tian', 'di', 'xuan', 'fan']

function realmIndexForDisplay(realm: string): number {
  const index = REALMS.indexOf(realm as (typeof REALMS)[number])
  return index < 0 ? 0 : index
}

function nextRealmDisplay(realm: string): string {
  const index = realmIndexForDisplay(realm)
  return REALMS[Math.min(index + 1, REALMS.length - 1)] ?? realm
}

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
    const count = foundation ? Math.min(2, foundation.count) : 0
    const quality = foundation?.quality ?? 'fan'
    const inheritanceSpent = Math.min(3, maxInheritance)
    const missing: string[] = []
    if (count < 2 && foundation) missing.push('筑基丹×' + (2 - count))
    if (inheritanceSpent < 3) missing.push('传承点×' + (3 - inheritanceSpent))
    return {
      useElixir: foundation ? { elixirId: 'foundation_pill', quality, count: count || 1 } : undefined,
      inheritanceSpent,
      disabled: false,
      missingHint: missing.length > 0 ? missing.join('、') : undefined,
      reason: '筑基丹×2+传承3，梭哈一把',
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
    if (n > 0) return { quality: q, count: Math.min(2, n) }
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
    const clutchHint = shouldShowClutchHint(state)

    return (
      <div className="breakthrough-page breakthrough-page--with-modal">
        <div className="breakthrough-page__mask" />
        <div className="breakthrough-page__result-modal">
          <div className={`breakthrough-battle-report breakthrough-battle-report--${isSuccess ? 'success' : 'failure'}`}>
            {/* 强反馈横幅 */}
            {isSuccess ? (
              <div className="breakthrough-banner breakthrough-banner--success">
                ✨ 境界突破！✨
              </div>
            ) : (
              <div className="breakthrough-banner breakthrough-banner--failure">
                ⚠️ 心魔反噬！⚠️
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
                      <span className="breakthrough-delta-label">传承点</span>
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
                      <span className="breakthrough-consumed-item">传承点×{outcome.consumed.inheritanceSpent}</span>
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
                      <span className="breakthrough-compensation-item">传承+{outcome.deltas.inheritancePoints}</span>
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

  // ——— 主界面：一屏布局 + 底部固定条 ———
  const currentPlan = plan ?? { inheritanceSpent: 0, previewRate: 0.22, useElixir: undefined }
  const useElixir = currentPlan.useElixir
  const dailyMod = state.meta?.daily
    ? getDailyModifiers(state.meta.daily.environmentId as import('../../engine').DailyEnvironmentId)
    : undefined
  const rate = calcBreakthroughRate(
    state,
    currentPlan.inheritanceSpent,
    useElixir,
    dailyMod?.breakthroughSuccessBonus ?? 0,
  )
  const kungfuAdd = buildKungfaModifiers(state).breakthroughRateAdd

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
      {/* 顶部：资源条 */}
      <header className="breakthrough-resource-bar">
        <h2 className="breakthrough-resource-title">
          {state.player.realm} → {nextRealmDisplay(state.player.realm)}
        </h2>
        {dailyEnv && <div className="breakthrough-daily-hint">今日：{dailyEnv.name}</div>}
        <div className="breakthrough-resource-chips">
          <Chip className="app-chip--gold">境界 {state.player.realm}</Chip>
          <Chip className="app-chip--hp">生命 {`${state.player.hp}/${state.player.maxHp}`}</Chip>
          <Chip className="app-chip--inherit">传承 {state.player.inheritancePoints}</Chip>
          <Chip className="app-chip--pity">保底 {state.player.pity}</Chip>
        </div>
      </header>

      {/* 中部：成功率大数字 + 临门一脚提示 */}
      <div className="breakthrough-main">
        <div className="breakthrough-rate-display">
          <div className="breakthrough-rate-big">
            <span className="breakthrough-rate-big-value">{(rate * 100).toFixed(0)}%</span>
            <span className="breakthrough-rate-big-label">成功率</span>
          </div>
          {kungfuAdd > 0 && (
            <div className="breakthrough-kungfu-hint">功法加成 +{(kungfuAdd * 100).toFixed(0)}%</div>
          )}
          {clutchHint.show && (
            <div className={`breakthrough-clutch-hint breakthrough-clutch-hint--${clutchHint.level}`}>
              {clutchHint.message}
            </div>
          )}
        </div>

        {/* 预设策略 */}
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
      </div>

      {/* 底部固定操作条 */}
      <footer className="breakthrough-footer">
        <div className="breakthrough-footer-preview">
          成功：境界+1 回满血；失败：保底+1 传承补偿
        </div>
        <div className="breakthrough-footer-actions">
          <div className="breakthrough-confirm-row">
            <Button
              variant="primary"
              size="md"
              className="breakthrough-footer-main-btn"
              onClick={() => dispatch({ type: 'BREAKTHROUGH_CONFIRM' })}
            >
              开始突破
            </Button>
            <span className="breakthrough-time-hint">消耗：1 时辰</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
            返回
          </Button>
        </div>
      </footer>
    </div>
  )
}
