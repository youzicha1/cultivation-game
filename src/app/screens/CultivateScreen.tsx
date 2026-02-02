import type { GameAction, GameState } from '../../engine'
import { getCultivateInfo, getStageCap, expNeededForNextLevel } from '../../engine'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function CultivateScreen({ state, dispatch }: ScreenProps) {
  const info = getCultivateInfo(state)
  const level = Math.max(1, Math.min(99, state.player.level ?? 1))
  const stageIndex = state.player.stageIndex ?? (level <= 15 ? 1 : level <= 30 ? 2 : level <= 45 ? 3 : level <= 60 ? 4 : level <= 75 ? 5 : level <= 90 ? 6 : 7)
  const stageCap = getStageCap(state)
  const expToNext = expNeededForNextLevel(level)
  const expProgress = level >= stageCap ? 1 : Math.max(0, Math.min(1, (state.player.exp ?? 0) / expToNext))
  const hpProgress = Math.max(0, Math.min(1, state.player.hp / state.player.maxHp))
  const mindProgress = Math.max(0, Math.min(1, info.mind / 100))
  const cultivateCount = state.run.cultivateCount ?? 0
  const toast = state.run.cultivateToast
  const insight = state.run.pendingInsightEvent
  const injuredTurns = state.player.injuredTurns ?? 0
  const capped = level >= stageCap

  return (
    <Panel title="修炼">
      <Stack gap={10}>
        <div className="page-chips">
          <Chip className="app-chip--gold">{state.player.realm}</Chip>
          <Chip className="app-chip--muted">{stageIndex}阶</Chip>
          <Chip className="app-chip--hp">{`${state.player.hp}/${state.player.maxHp}`}</Chip>
          <Chip className="app-chip--muted">本局修炼 {cultivateCount} 次</Chip>
          {injuredTurns > 0 && (
            <Chip className="app-chip--danger">受伤 {injuredTurns} 回合</Chip>
          )}
        </div>

        <div className="stat-group">
          <div className="stat-row">
            <span className="stat-label">心境 · {info.mindTier}</span>
            <span className="stat-value">{info.mind}/100</span>
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill stat-bar-fill-mind"
              style={{ width: `${mindProgress * 100}%` }}
            />
          </div>
          <div className="stat-row">
            <span className="stat-label">修为 · Lv.{level}/{stageCap}</span>
            <span className="stat-value">{state.player.exp ?? 0}{!capped ? ` / ${expToNext}` : ''}</span>
          </div>
          {capped && (
            <div className="cultivate-cap-hint">已到上限，需阶突破</div>
          )}
          <div className="stat-bar">
            <div
              className="stat-bar-fill stat-bar-fill-exp"
              style={{ width: `${expProgress * 100}%` }}
            />
          </div>
          <div className="stat-row">
            <span className="stat-label">生命</span>
            <span className="stat-value">{`${state.player.hp}/${state.player.maxHp}`}</span>
          </div>
          <div className="stat-bar">
            <div
              className="stat-bar-fill stat-bar-fill-hp"
              style={{ width: `${hpProgress * 100}%` }}
            />
          </div>
        </div>

        <div className="page-label">修炼模式</div>
        <div className="cultivate-modes">
          <Button
            variant="option-green"
            size="md"
            className="cultivate-mode-btn cultivate-mode--breath"
            onClick={() => dispatch({ type: 'CULTIVATE_TICK', mode: 'breath' })}
            title="稳定回血、修伤、涨修为与心境；危险值-2；无风险"
          >
            吐纳
          </Button>
          <Button
            variant="primary"
            size="md"
            className="cultivate-mode-btn cultivate-mode--pulse"
            onClick={() => dispatch({ type: 'CULTIVATE_TICK', mode: 'pulse' })}
            title="修为更高，但有小概率走火受伤；未受伤则额外得灵石"
          >
            冲脉
          </Button>
          <Button
            variant="option-purple"
            size="md"
            className="cultivate-mode-btn cultivate-mode--insight"
            onClick={() => dispatch({ type: 'CULTIVATE_TICK', mode: 'insight' })}
            title="修为较低，有概率触发顿悟，选 A/B 得传承、残页或大量修为"
          >
            悟道
          </Button>
        </div>
        <div className="cultivate-mode-desc" role="region" aria-label="修炼模式说明">
          <p className="cultivate-mode-desc__title">三种模式说明（每次修炼消耗 1 时辰）</p>
          <ul className="cultivate-mode-desc__list">
            <li><strong>吐纳</strong>：稳扎稳打。稳定增加修为与生命，心境+6，并略缓伤势；若在探索中还会减 2 点危险值。无随机风险，适合回血、修伤或拉高心境。</li>
            <li><strong>冲脉</strong>：险中求进。修为收益更高（16~22），但有小概率「走火岔气」：受伤则生命-8、伤势+2 回合；未受伤则额外获得灵石。心境越低，受伤概率越高。</li>
            <li><strong>悟道</strong>：机缘顿悟。基础只加少量修为与心境；有概率触发顿悟事件，弹出 A/B 选项：选稳悟得传承点或功法残页，选险悟得大量修为（伴随危险或扣血）。心境越高，顿悟概率越高。</li>
          </ul>
          <p className="cultivate-mode-desc__foot">心境影响探索危险增长、突破成功率与炼丹成功率，建议先用吐纳把心境提到「澄明」以上再冲脉或悟道。</p>
        </div>

        {toast && (
          <div className="cultivate-toast">
            <span>
              修为+{toast.expGain}
              {toast.hpGain != null ? ` · 生命+${toast.hpGain}` : ''}
              {toast.mindDelta != null ? ` · 心境${toast.mindDelta >= 0 ? '+' : ''}${toast.mindDelta}` : ''}
              {toast.spiritStonesGain != null ? ` · 灵石+${toast.spiritStonesGain}` : ''}
            </span>
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'CLEAR_CULTIVATE_TOAST' })}>
              确定
            </Button>
          </div>
        )}

        <div className="page-actions">
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
            返回
          </Button>
        </div>
      </Stack>

      {insight && (
        <div className="cultivate-insight-overlay">
          <div className="cultivate-insight-mask" />
          <div className="cultivate-insight-card">
            <h3 className="cultivate-insight-title">{insight.title}</h3>
            <p className="cultivate-insight-text">{insight.text}</p>
            <div className="cultivate-insight-choices">
              <Button
                variant="option-green"
                size="md"
                onClick={() => dispatch({ type: 'CULTIVATE_INSIGHT_CHOOSE', choice: 'A' })}
              >
                {insight.choiceA.text}
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => dispatch({ type: 'CULTIVATE_INSIGHT_CHOOSE', choice: 'B' })}
              >
                {insight.choiceB.text}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}
