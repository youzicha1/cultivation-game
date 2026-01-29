import type { GameAction, GameState } from '../../engine'
import {
  getAllLegacyUpgrades,
  getLegacyUpgradesByBranch,
  canPurchaseUpgrade,
  getNextKeyNodeDistance,
  type LegacyBranch,
} from '../../engine/legacy'
import { Button } from '../ui/Button'
import { Chip } from '../ui/Chip'
import { Panel } from '../ui/Panel'
import { Stack } from '../ui/Stack'
import { useState } from 'react'

type ScreenProps = {
  state: GameState
  dispatch: (action: GameAction) => void
}

export function LegacyScreen({ state, dispatch }: ScreenProps) {
  const [activeBranch, setActiveBranch] = useState<LegacyBranch>('explore')
  const meta = state.meta ?? {}
  const legacyPoints = meta.legacyPoints ?? 0
  const legacyUpgrades = meta.legacyUpgrades ?? {}
  const upgrades = getLegacyUpgradesByBranch(activeBranch)
  const nextKeyNode = getNextKeyNodeDistance(meta)

  const branchLabels: Record<LegacyBranch, string> = {
    explore: '探宝流',
    alchemy: '丹修流',
    breakthrough: '冲关流',
  }

  return (
    <Panel title="传承升级树">
      <Stack gap={10}>
        <div className="legacy-header">
          <div className="legacy-points-display">
            <Chip className="app-chip--gold" style={{ fontSize: '18px', padding: '8px 16px' }}>
              可用传承点：{legacyPoints}
            </Chip>
          </div>
          {nextKeyNode && (
            <div className="legacy-nearmiss-hint">
              距离下一个关键节点《{nextKeyNode.name}》还差 {nextKeyNode.distance} 点
            </div>
          )}
        </div>

        <div className="legacy-branch-tabs">
          {(['explore', 'alchemy', 'breakthrough'] as LegacyBranch[]).map((branch) => (
            <Button
              key={branch}
              variant={activeBranch === branch ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveBranch(branch)}
            >
              {branchLabels[branch]}
            </Button>
          ))}
        </div>

        <div className="legacy-upgrades-list">
          {upgrades.map((upgrade) => {
            const owned = legacyUpgrades[upgrade.id] && legacyUpgrades[upgrade.id] > 0
            const check = canPurchaseUpgrade(upgrade.id, meta)
            const canBuy = check.can && !owned

            // 检查前置是否满足
            const prereqsMet = upgrade.prereqIds.every(
              (prereqId) => legacyUpgrades[prereqId] && legacyUpgrades[prereqId] > 0,
            )

            return (
              <div
                key={upgrade.id}
                className={`legacy-upgrade-card ${owned ? 'legacy-upgrade-card--owned' : ''} ${!prereqsMet && !owned ? 'legacy-upgrade-card--locked' : ''}`}
              >
                <div className="legacy-upgrade-header">
                  <div className="legacy-upgrade-name">
                    {upgrade.name}
                    {upgrade.isKeyNode && (
                      <Chip className="app-chip--gold" style={{ marginLeft: '8px', fontSize: '11px' }}>
                        关键
                      </Chip>
                    )}
                  </div>
                  <div className="legacy-upgrade-cost">
                    {owned ? (
                      <Chip className="app-chip--muted">已掌握</Chip>
                    ) : (
                      <Chip className="app-chip--gold">消耗 {upgrade.cost} 点</Chip>
                    )}
                  </div>
                </div>
                <div className="legacy-upgrade-desc">{upgrade.desc}</div>
                {!prereqsMet && !owned && upgrade.prereqIds.length > 0 && (
                  <div className="legacy-upgrade-prereq">
                    需要先掌握：{upgrade.prereqIds.map((id) => getAllLegacyUpgrades().find((u) => u.id === id)?.name ?? id).join('、')}
                  </div>
                )}
                {canBuy && (
                  <div className="legacy-upgrade-action">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => dispatch({ type: 'LEGACY_PURCHASE', upgradeId: upgrade.id })}
                    >
                      购买
                    </Button>
                  </div>
                )}
                {!check.can && !owned && check.reason && (
                  <div className="legacy-upgrade-error">{check.reason}</div>
                )}
              </div>
            )
          })}
        </div>

        <div className="page-actions">
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'GO', screen: 'home' })}>
            返回
          </Button>
        </div>
      </Stack>
    </Panel>
  )
}
