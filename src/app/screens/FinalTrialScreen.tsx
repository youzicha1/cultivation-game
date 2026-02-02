/**
 * TICKET-29: 天劫回合制页 — 天道意图卡 + 四行动（稳/吞丹/护体/逆冲）+ 丹药面板 + 回合日志
 * 数据单一来源：getTribulationTurnView(state)，UI 只展示与发 action。
 */

import { useState } from 'react'
import type { GameAction, GameState } from '../../engine'
import { getTribulationTurnView } from '../../engine/tribulation/tribulation'
import { getTribulationName } from '../../engine/tribulation/names'
import {
  getDmgBase,
  applySteadyDamage,
  GAMBLE_SUCCESS_RATE,
  canSacrifice,
  type SacrificeKind,
} from '../../engine/finalTrial'
import { getTribulationSuccessRate } from '../../engine/tribulation/rates'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

const SACRIFICE_LABELS: Record<SacrificeKind, string> = {
  spirit_stones: '献祭灵石(50)',
  pills: '献祭丹药(2)',
  material: '献祭灵草(3)',
  inheritance: '献祭传承点(2)',
}

export function FinalTrialScreen({ state, dispatch }: ScreenProps) {
  const view = getTribulationTurnView(state)
  const trib = state.run.tribulation
  const ft = state.run.finalTrial
  const player = state.player

  // TICKET-29: 新回合制天劫
  if (trib && view) {
    return (
      <TribulationTurnUI
        view={view}
        level={trib.level}
        levelName={getTribulationName(trib.level)}
        dispatch={dispatch}
      />
    )
  }

  // 旧版 finalTrial（兼容存档）
  if (!ft || ft.step < 1 || ft.step > 3) {
    return (
      <Panel title="天劫挑战">
        <p>状态异常，请返回开局。</p>
      </Panel>
    )
  }

  const step = ft.step
  const level = (state.run.tribulationLevel ?? 0) + 1
  const levelName = getTribulationName(level)
  const tribulationSuccessRate = getTribulationSuccessRate(level)
  const dmgBase = getDmgBase(ft.threat, step)
  const steady = applySteadyDamage(dmgBase, ft.resolve)
  const successRate = Math.round(GAMBLE_SUCCESS_RATE * 100)

  return (
    <Panel
      title="天劫挑战"
      subtitle={`第 ${level} 重：${levelName} / 12 · 第 ${step} 道天雷 · 渡劫成功率 ${Math.round(tribulationSuccessRate * 100)}%`}
    >
      <Stack gap={12}>
        <div className="final-trial-stats">
          <span className="final-trial-stat">HP {player.hp}/{player.maxHp}</span>
          <span className="final-trial-stat">威胁 {ft.threat}</span>
          <span className="final-trial-stat">道心 {ft.resolve}</span>
        </div>
        <div className="final-trial-progress">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`final-trial-segment ${i <= step ? 'final-trial-segment--active' : ''} ${i < step ? 'final-trial-segment--done' : ''}`}
            />
          ))}
        </div>
        <p className="final-trial-hint">
          稳：约伤 {steady.dmg}，道心+2 · 搏：成功率 {successRate}%，成则伤少道心+6，败则伤高
        </p>
        <div className="final-trial-actions">
          <Button
            variant="option-blue"
            size="md"
            onClick={() => dispatch({ type: 'FINAL_TRIAL_CHOOSE', choice: 'steady' })}
          >
            稳（守心渡劫）
          </Button>
          <Button
            variant="option-purple"
            size="md"
            onClick={() => dispatch({ type: 'FINAL_TRIAL_CHOOSE', choice: 'gamble' })}
          >
            搏（逆天一搏）
          </Button>
          {(['spirit_stones', 'pills', 'material', 'inheritance'] as SacrificeKind[]).map((kind) => {
            const ok = canSacrifice(state, kind)
            return (
              <Button
                key={kind}
                variant="secondary"
                size="sm"
                disabled={!ok}
                title={!ok ? `资源不足：${SACRIFICE_LABELS[kind]}` : undefined}
                onClick={() => dispatch({ type: 'FINAL_TRIAL_CHOOSE', choice: 'sacrifice', sacrificeKind: kind })}
              >
                {SACRIFICE_LABELS[kind]}{!ok ? '（不足）' : ''}
              </Button>
            )
          })}
        </div>
      </Stack>
    </Panel>
  )
}

function TribulationTurnUI({
  view,
  level,
  levelName,
  dispatch,
}: {
  view: NonNullable<ReturnType<typeof getTribulationTurnView>>
  level: number
  levelName: string
  dispatch: (action: GameAction) => void
}) {
  const [pillOpen, setPillOpen] = useState(false)
  const { turn, totalTurns, hp, maxHp, shield, debuffs, intent, actions, pillOptions, recentLog, surgeSuccessRate } = view

  return (
    <Panel
      title="天劫挑战"
      subtitle={`第 ${level} 重：${levelName} / 12 · 回合 ${turn + 1}/${totalTurns}`}
    >
      <Stack gap={12}>
        {/* 状态条 */}
        <div className="tribulation-stats">
          <span className="tribulation-stat">HP {hp}/{maxHp}</span>
          {shield > 0 && <span className="tribulation-stat">护盾 {shield}</span>}
          <span className="tribulation-stat">回合 {turn + 1}/{totalTurns}</span>
          {(debuffs.mindChaos > 0 || debuffs.burn > 0 || debuffs.weak > 0) && (
            <span className="tribulation-stat tribulation-debuffs">
              {debuffs.mindChaos > 0 && `心乱${debuffs.mindChaos} `}
              {debuffs.burn > 0 && `灼烧${debuffs.burn} `}
              {debuffs.weak > 0 && `虚弱${debuffs.weak}`}
            </span>
          )}
        </div>

        {/* 天道意图卡 */}
        <div className="tribulation-intent-card">
          <div className="tribulation-intent-title">本回合天道意图：{intent.name}</div>
          <div className="tribulation-intent-damage">
            预计伤害 {intent.damageMin}～{intent.damageMax}（期望约 {intent.expectedDamage}）
          </div>
          {intent.addEffectText && (
            <div className="tribulation-intent-add">{intent.addEffectText}</div>
          )}
        </div>

        {/* 行动区：四按钮 ≥44px */}
        <div className="tribulation-actions">
          {actions.map((a) => {
            if (a.id === 'PILL') {
              return (
                <Button
                  key={a.id}
                  variant="secondary"
                  size="md"
                  disabled={!a.available}
                  title={a.hint}
                  onClick={() => setPillOpen((o) => !o)}
                >
                  吞服丹药
                </Button>
              )
            }
            if (a.id === 'SURGE' && surgeSuccessRate != null) {
              return (
                <Button
                  key={a.id}
                  variant="option-purple"
                  size="md"
                  disabled={!a.available}
                  title={a.hint}
                  onClick={() => dispatch({ type: 'TRIBULATION_ACTION', action: 'SURGE' })}
                >
                  逆冲天威（{Math.round(surgeSuccessRate * 100)}%）
                </Button>
              )
            }
            return (
              <Button
                key={a.id}
                variant={a.id === 'STEADY' ? 'option-blue' : a.id === 'GUARD' ? 'secondary' : 'secondary'}
                size="md"
                disabled={!a.available}
                title={a.hint}
                onClick={() => dispatch({ type: 'TRIBULATION_ACTION', action: a.id })}
              >
                {a.id === 'STEADY' ? '稳住心神' : a.id === 'GUARD' ? '护体硬抗' : a.id}
              </Button>
            )
          })}
        </div>

        {/* 吞丹展开面板 */}
        {pillOpen && pillOptions.length > 0 && (
          <div className="tribulation-pill-panel">
            <div className="tribulation-pill-panel-title">选择丹药（消耗 1 粒）</div>
            {pillOptions.map((opt) => (
              <Button
                key={`${opt.elixirId}-${opt.quality}`}
                variant="secondary"
                size="sm"
                onClick={() => {
                  dispatch({
                    type: 'TRIBULATION_ACTION',
                    action: 'PILL',
                    pill: { elixirId: opt.elixirId, quality: opt.quality },
                  })
                  setPillOpen(false)
                }}
              >
                {opt.hint}
              </Button>
            ))}
            <Button variant="secondary" size="sm" onClick={() => setPillOpen(false)}>
              取消
            </Button>
          </div>
        )}

        {/* 回合日志（可折叠感：最近 3～5 条） */}
        {recentLog.length > 0 && (
          <details className="tribulation-log">
            <summary>最近结算</summary>
            <ul className="tribulation-log-list">
              {recentLog.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </details>
        )}
      </Stack>
    </Panel>
  )
}
