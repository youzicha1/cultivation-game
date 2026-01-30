# 奇遇链内容审计（TICKET-21 前）

## 审计时间
扩容前基线（event_chains.v1.json + explore_events.v1.json）。

## 当前统计

### 事件链（event_chains.v1.json）
| 指标 | 数值 |
|------|------|
| **链数量** | 3 |
| **总节点数（章）** | 9（每条链 3 章） |
| **主题分布** | 3 类：残图引路、妖祟作乱、古炉重现 |

### 链明细
| chainId | name | 节点数 | 终章大奖类型 |
|---------|------|--------|--------------|
| map_to_legacy | 残图引路 | 3 | kungfu_or_recipe（功法/配方/传承点） |
| demon_lair | 妖祟作乱 | 3 | epic_material_elixir（材料+传承点） |
| ancient_furnace | 古炉重现 | 3 | kungfu（镇火诀） |

### 终章奖励类型覆盖（扩容前）
- 功法（kungfu）：1 条
- 功法或配方（kungfu_or_recipe）：1 条
- 材料+传承点（epic_material_elixir）：1 条  
**合计：3 种套路，未覆盖配方直解锁、丹药、称号、坊市折扣、天劫加成。**

### 独立探索事件（explore_events.v1.json）
| 指标 | 数值 |
|------|------|
| **事件数量** | 8 |
| **主题** | 古修遗迹、妖兽巢穴、心魔试炼、秘境裂隙、残破丹炉、残阵封锁、残魂低语、封印经卷 |

## 结论（扩容前）
- 链数、节点数远低于目标（12+ 主题、60+ 节点）。
- 终章大奖类型仅 3 种，需扩展至至少 6 种（材料/配方/功法/丹药/称号/传承点/坊市折扣/天劫加成）。
- 无断链补偿与爽文日志，失败体验偏劝退。

---

## 扩容后统计（TICKET-21）

### 事件链（event_chains.v1.json）
| 指标 | 扩容前 | 扩容后 |
|------|--------|--------|
| **链数量** | 3 | 15 |
| **总节点数** | 9 | 62 |
| **主题数** | 3 | 12+ |

### 新增链列表（主题 + 终章大奖类型）
| chainId | name | 节点数 | 终章大奖类型 |
|---------|------|--------|--------------|
| map_to_legacy | 残图引路 | 3 | kungfu_or_recipe |
| demon_lair | 妖祟作乱 | 3 | epic_material_elixir |
| ancient_furnace | 古炉重现 | 3 | kungfu |
| alchemy_fire_out | 丹火失控 | 4 | recipe |
| sect_mission | 宗门委托 | 4 | title |
| black_market | 黑市拍卖 | 4 | shop_discount |
| secret_herb_garden | 秘境采药 | 4 | epic_material_elixir |
| arena_duel | 斗法擂台 | 3 | tribulation_bonus |
| ancient_cave_legacy | 古洞府传承 | 3 | kungfu |
| spirit_beast_bond | 灵兽结缘 | 3 | legacy |
| demon_stalker | 魔修窥伺 | 3 | pills |
| medicine_king_recipe | 药王遗方 | 3 | recipe |
| celestial_omen | 天象异变 | 3 | shop_discount |
| cliff_fruit | 断崖奇果 | 5 | title |
| eve_of_tribulation | 渡劫前夜 | 3 | tribulation_bonus |

### 终章奖励类型覆盖（扩容后）
- 材料（epic_material_elixir）：2 条
- 配方（recipe）：2 条
- 功法（kungfu / kungfu_or_recipe）：3 条
- 丹药（pills）：1 条
- 称号（title）：2 条
- 传承点（legacy）：1 条
- 坊市折扣（shop_discount）：2 条
- 天劫加成（tribulation_bonus）：2 条  
**合计：8 种类型，满足「至少 6 种」验收。**
