/**
 * TICKET-34: 可获得物品来源汇总（探索掉落 + 坊市售卖 + 奇遇链 + 探索事件）
 * 用于校验：所有被消耗/需求的 itemId（尤其 recipes 材料）必须 ∈ obtainableIds
 */

import type { MaterialId } from '../alchemy'
import { alchemyRecipes } from '../alchemy'
import { getShopCatalogDef } from '../shop'
import { getLootMaterialIds } from '../loot'
import { getChains } from '../chains'
import exploreEventsFile from '../../content/explore_events.v1.json'
import type { ExploreEventsFile } from '../events'

/** 可获得材料 ID 集合：坊市 + 探索掉落 + 奇遇链奖励/选项 + 探索事件选项 */
export function getObtainableMaterialIds(): Set<MaterialId> {
  const set = new Set<MaterialId>()

  // 坊市售卖
  for (const def of getShopCatalogDef()) {
    set.add(def.id)
  }

  // 探索掉落表
  for (const id of getLootMaterialIds()) {
    set.add(id)
  }

  // 奇遇链：终章 guaranteedReward 与选项 effects 中的 material
  const chains = getChains()
  for (const chain of chains) {
    for (const ch of chain.chapters) {
      const r = ch.guaranteedReward
      if (r?.type === 'epic_material_elixir') {
        set.add(r.materialId as MaterialId)
      }
      const choices = ch.choices as { A?: { onSuccess?: { effects?: Array<{ type?: string; id?: string }> }; onFail?: { effects?: Array<{ type?: string; id?: string }> } }; B?: { onSuccess?: { effects?: Array<{ type?: string; id?: string }> }; onFail?: { effects?: Array<{ type?: string; id?: string }> } } } | undefined
      if (!choices) continue
      for (const key of ['A', 'B'] as const) {
        const choice = choices[key]
        if (!choice) continue
        for (const outcome of [choice.onSuccess, choice.onFail]) {
          for (const eff of outcome?.effects ?? []) {
            if (eff?.type === 'material' && eff.id) set.add(eff.id as MaterialId)
          }
        }
      }
    }
  }

  // 探索事件：选项 effects 中的 material
  const file = exploreEventsFile as ExploreEventsFile
  const events = file.events ?? []
  for (const e of events) {
    const choices = e.choices as { A?: { onSuccess?: { effects?: Array<{ type?: string; id?: string }> }; onFail?: { effects?: Array<{ type?: string; id?: string }> } }; B?: { onSuccess?: { effects?: Array<{ type?: string; id?: string }> }; onFail?: { effects?: Array<{ type?: string; id?: string }> } } } | undefined
    if (!choices) continue
    for (const key of ['A', 'B'] as const) {
      const choice = choices[key]
      if (!choice) continue
      for (const outcome of [choice.onSuccess, choice.onFail]) {
        for (const eff of outcome?.effects ?? []) {
          if (eff?.type === 'material' && eff.id) set.add(eff.id as MaterialId)
        }
      }
    }
  }

  return set
}

/** 配方中出现的全部材料 ID（去重） */
export function getRecipeMaterialIds(): MaterialId[] {
  const set = new Set<MaterialId>()
  for (const r of alchemyRecipes) {
    for (const mid of Object.keys(r.cost ?? {})) {
      set.add(mid as MaterialId)
    }
  }
  return [...set]
}
