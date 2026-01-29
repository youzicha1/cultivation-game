# TICKET-5 设计思路版 · 交付说明

## 一、上头循环：小爽 / 中爽 / 大爽 如何触发

- **小爽（约 10~30 秒）**
  - 探索：每次「深入」有概率触发事件（掉落/奇遇），无事件则直接加收益；收益受 **Risk 倍率** 与 **连斩倍率** 加成，连斩越高越上头。
  - 炼丹：单次炼丹成丹/爆丹/品质结果即时反馈；**炉温「爆」** 提高天品质概率与爆丹率，形成赌一把体验。
  - 突破：保底 pity 累积，**临门一脚** 提示（pity ≥ 3）强化「再点一次就成」的暗示。

- **中爽（约 3~5 分钟）**
  - 探索：**收手** 结算本次收益；**继续梭哈** 提升 Risk 档位（稳→险→狂），掉落与风险同步放大。
  - 炼丹：炉温 **稳/冲/爆** 三档，炼出更高品质、或赌爆炉，形成明显节奏变化。
  - 突破：成功则境界+1、回满血；失败则 pity+1、传承点补偿，为下一把铺路。

- **大爽 / 终极诱饵（每局）**
  - 数据结构已就绪：**结局 ID**（飞升/入魔/归隐/战死）、**成就**（12 个爽文梗命名）、**遗物**（装备 3 槽、影响爆丹/撤退/天品质等）；本局结束可展示 **nearMissHints**（差一点飞升/差一页残页/再来一把或许天丹等），诱使下一局。

---

## 二、新增数据结构

| 类型 | 说明 |
|------|------|
| **Depth** | `run.depth`：秘境层数，每次「深入」+1，收手/撤退清零。 |
| **Risk** | `run.risk`：0=稳、1=险、2=狂；影响掉落倍率（RISK_DROP_MULTIPLIER）与撤退成功率（RISK_RETREAT_FACTOR）。 |
| **Streak** | `run.streak`：气运连斩，连续深入不撤退则累加，收手/撤退清零；影响掉落倍率（STREAK_DROP_BONUS_PER_LEVEL）。 |
| **ChainProgress** | `run.chainProgress`：`Record<chainId, stepIndex>`，为事件链（nextEventId/chainTag）预留；当前事件 JSON 未扩展，引擎已留字段。 |
| **Relic** | `player.relics`：已获得遗物 ID 列表；`player.equippedRelics`：3 槽装备；`relics.ts` 中遗物定义（爆丹率-/撤退+/天品质+ 等）。 |
| **炉温 FurnaceTemp** | `run.alchemyPlan.furnaceTemp`：`'stable'|'rush'|'boom'`；影响爆丹率乘数（FURNACE_BOOM_MULTIPLIER）与天品质权重乘数（FURNACE_TIAN_BONUS）。 |
| **AchievementId** | `player.achievements`：已解锁成就 ID 数组；12 个成就 ID 定义于 `constants.ts`。 |
| **EndingId / nearMissHints** | `summary.endingId`：结局 ID（如 `'death'`）；`summary.nearMissHints`：差一点提示文案数组（可后续在死亡/总结时写入）。 |

---

## 三、新增 Screen

| Screen | 说明 |
|--------|------|
| **relics** | 遗物屏：展示已获得遗物、3 个装备槽位（下拉选择装备/卸下），返回主页。 |
| **achievements** | 成就屏：展示 12 个成就及解锁状态，返回主页。 |
| **ending** | 结局屏：当前路由到 summary（可后续专用于结局+差一点文案）。 |

主页新增入口：**遗物**、**成就**。探索页无事件时：**深入 / 收手 / 继续梭哈 / 撤退 / 返回**，并展示层数、险档、连斩、收益。

---

## 四、npm test 全绿摘要

- 本地执行：`npm test -- --run`
- 若环境存在 `spawn EPERM`（如沙箱），请在本地环境运行测试。
- 本次新增/调整用例：
  - **state.test.ts**：`createInitialState` 包含 `achievements`、`relics`、`equippedRelics`。
  - **game.test.ts**：探索 push 断言 `depth`、`streak`；撤退断言 `streak` 清零；`EXPLORE_START` 重置 depth/risk/streak/chainProgress；`EXPLORE_RISK_UP` 档位；`EXPLORE_SETTLE` 结算与清连斩；`RELIC_EQUIP` 装备已拥有遗物。
  - **alchemy.test.ts**：炉温 `stable` 降低爆丹率（同一 roll 下 rush 爆、stable 不爆）。

---

## 五、Git commit 信息建议

```
feat(TICKET-5): 上头循环升级 - 秘境分层/连斩/炉温/遗物/成就/临门一脚

- 探索：Depth、Risk(稳/险/狂)、气运连斩；深入/收手/继续梭哈/撤退
- 炼丹：炉温 稳/冲/爆，影响爆丹率与天品质概率
- 突破：pity≥3 时 UI 临门一脚提示
- 遗物：类型+装备槽 3+遗物屏；成就：12 成就 ID+成就屏
- 结局：summary.endingId、nearMissHints 预留
- 存档：run/player 新字段兼容旧档
- 测试：EXPLORE_*、RELIC_EQUIP、炉温 stable 用例；ROADMAP 更新
```

---

## 六、未在本轮实现的扩展点（可后续迭代）

- **事件链**：在 `explore_events.v1.json` 中为事件增加 `chainTag`、`nextEventId`（或按选项分支），引擎在 `resolveExploreChoice` 后根据 `nextEventId` 推进 `chainProgress` 并推送下一则事件。
- **材料稀有度**：common/rare/epic/legendary，掉落时强反馈（金光/紫气）；可在事件 effects 中增加 `rarity` 或新 effect 类型。
- **遗物掉落**：在事件或深度奖励中增加「遗物」effect，写入 `player.relics`；遗物效果（爆丹率-/撤退+等）在 `calcBrewSuccessRate`、撤退成功率等处读取 `player.equippedRelics` 并应用。
- **成就解锁**：在突破成功、成丹天品质、探索十连、收手满收益等分支中检查条件并 `player.achievements.push(id)`。
- **结局判定与 nearMissHints**：在进入 death/summary 时根据境界、残页、遗物等计算 `endingId` 和 `nearMissHints` 并写入 `summary`。
