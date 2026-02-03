import type { GameAction, GameState } from '../../engine'
import {
  getAllLegacyUpgrades,
  getLegacyUpgradesByBranch,
  canPurchaseUpgrade,
  getNextKeyNodeDistance,
  type LegacyBranch,
} from '../../engine/legacy'
import { getLegacyUnlocks, canBuyUnlock } from '../../engine'
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

  const legacyUnlocks = getLegacyUnlocks()
  const legacyUnlockToast = state.run.legacyUnlockToast
  const unlockedIds = meta.legacyUnlocks ? Object.keys(meta.legacyUnlocks) : []

  return (
    <Panel title="传承">
      <Stack gap={10}>
        {legacyUnlockToast && (
          <div className="legacy-unlock-toast" role="alert">
            {legacyUnlockToast}
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'CLEAR_LEGACY_UNLOCK_TOAST' })}>
              知道了
            </Button>
          </div>
        )}
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

        <div className="legacy-section-title">传承解锁（永久生效，新局生效）</div>
        <div className="legacy-unlocks-list">
          {legacyUnlocks.map((u) => {
            const owned = unlockedIds.includes(u.id)
            const check = canBuyUnlock(meta, u.id)
            const canBuy = check.can && !owned
            return (
              <div
                key={u.id}
                className={`legacy-upgrade-card ${owned ? 'legacy-upgrade-card--owned' : ''}`}
              >
                <div className="legacy-upgrade-header">
                  <div className="legacy-upgrade-name">
                    {u.name}
                    <Chip className="app-chip--muted" style={{ marginLeft: '6px', fontSize: '10px' }}>
                      {u.tier}
                    </Chip>
                  </div>
                  <div className="legacy-upgrade-cost">
                    {owned ? (
                      <Chip className="app-chip--muted">已解锁</Chip>
                    ) : (
                      <Chip className="app-chip--gold">消耗 {u.cost} 点</Chip>
                    )}
                  </div>
                </div>
                <div className="legacy-upgrade-desc">{u.desc}</div>
                {!owned && canBuy && (
                  <div className="legacy-upgrade-action">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => dispatch({ type: 'LEGACY_UNLOCK', unlockId: u.id })}
                    >
                      购买
                    </Button>
                  </div>
                )}
                {!owned && !check.can && check.reason && (
                  <div className="legacy-upgrade-error">{check.reason}</div>
                )}
              </div>
            )
          })}
        </div>

        <div className="legacy-section-title">传承升级树</div>
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
                key={`${upgrade.id}-${legacyUpgrades[upgrade.id] ?? 0}`}
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
