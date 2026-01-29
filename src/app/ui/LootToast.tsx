/**
 * TICKET-7: 掉落 Toast 组件
 * - common：普通灰
 * - rare：蓝光 + "灵光一闪！"
 * - epic：紫光 + "紫气东来！"
 * - legendary：金光 + "天降机缘！！"
 */

import { useEffect, useState } from 'react'
import type { LootDrop } from '../../engine/loot'
import { getRarityLabel, getRarityToastText } from '../../engine/loot'
import { relicRegistry } from '../../engine'

type LootToastProps = {
  drops: LootDrop[]
  onDismiss: () => void
}

function getItemLabel(item: LootDrop['item']): string {
  if (item.type === 'material') {
    const names: Record<string, string> = {
      spirit_herb: '灵草',
      iron_sand: '铁砂',
      beast_core: '妖核',
      moon_dew: '月华露',
    }
    return `${names[item.id] ?? item.id}×${item.count}`
  } else if (item.type === 'fragment') {
    return `残页×${item.count}`
  } else if (item.type === 'pills') {
    return `丹药×${item.count}`
  } else if (item.type === 'relic_fragment') {
    return `遗物碎片×${item.count}`
  } else if (item.type === 'kungfu') {
    const kungfuName = relicRegistry[item.id]?.name ?? item.id
    return `《${kungfuName}》`
  }
  return '未知物品'
}

export function LootToast({ drops, onDismiss }: LootToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (drops.length === 0) return
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 300)
    }, 3000)
    return () => clearTimeout(timer)
  }, [drops, onDismiss])

  if (drops.length === 0 || !visible) return null

  // 只显示最高稀有度的掉落
  const highestRarity = drops.reduce((max, d) => {
    const order: LootDrop['rarity'][] = ['common', 'rare', 'epic', 'legendary']
    return order.indexOf(d.rarity) > order.indexOf(max.rarity) ? d.rarity : max
  }, 'common' as LootDrop['rarity'])

  const highestDrop = drops.find((d) => d.rarity === highestRarity) ?? drops[0]
  const toastText = getRarityToastText(highestRarity)
  const itemLabel = getItemLabel(highestDrop.item)

  return (
    <div className={`loot-toast loot-toast--${highestRarity} ${visible ? 'loot-toast--visible' : ''}`}>
      <div className="loot-toast__content">
        {toastText && <div className="loot-toast__text">{toastText}</div>}
        <div className="loot-toast__item">
          【{getRarityLabel(highestRarity)}】{itemLabel}
        </div>
        {drops.length > 1 && (
          <div className="loot-toast__count">+{drops.length - 1} 其他掉落</div>
        )}
      </div>
    </div>
  )
}
