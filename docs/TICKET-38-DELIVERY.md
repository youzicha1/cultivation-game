# TICKET-38 机制型丹药系统 — 交付与入口清单

## A. 丹药使用入口盘点结果（实现前）

### 已有入口

| 入口 | 文件 | 触发 action / dispatch | 说明 |
|------|------|------------------------|------|
| 天劫页-吞服丹药 | `src/app/screens/FinalTrialScreen.tsx` | `TRIBULATION_ACTION` `{ action: 'PILL', pill: { elixirId, quality } }` | 回合旁【吞服丹药】→ 选择 qi_pill/foundation_pill，消耗 1 粒，效果由 tribulation 模块应用 |
| 突破页-用丹 | `src/app/screens/BreakthroughScreen.tsx` | `BREAKTHROUGH_SET_PLAN` 带 `pills: BreakthroughPillEntry[]` | 选丹加入“突破计划”，在 `BREAKTHROUGH_CONFIRM` 时一并消耗，用于成功率加成，非“即时吃丹” |

### 缺失入口（需在 B 中补齐）

- **探索事件页**：无“吃丹”入口（押命/撤退/护盾类无法在探索中使用）
- **修炼页**：无“吃丹”入口（经验/状态类无法在修炼中使用）
- **背包/物品页**：无通用“选择丹药 → 选择使用场景”入口（无 InventoryScreen/BagScreen）
- **坊市/市场**：无“使用丹药”入口（经济类丹无使用点）

### Reducer / Actions 现状

- **无** `USE_ITEM` / `CONSUME_ITEM` / `APPLY_BUFF`
- 天劫用：`TRIBULATION_ACTION` + `action: 'PILL'`，由 `applyTribulationAction` 内部扣减 `elixirs` 并应用效果
- 突破用：`BREAKTHROUGH_SET_PLAN` + `BREAKTHROUGH_CONFIRM`，由突破流程扣减 `elixirs` 并计入成功率

### 结论

- **仅有 1 个“即时吃丹”入口**：天劫页-吞服丹药（且仅支持 qi_pill/foundation_pill，无 24 个机制丹）。
- 为支撑 24 个机制型丹药（6 类×4）及“按场景使用”，需要：**统一引擎入口**（C）+ **新 action USE_PILL**（B）+ **各页吃丹/背包入口**（B）。

---

## 实现后：新增入口与文件位置（B 产物）

- **天劫页**：`src/app/screens/FinalTrialScreen.tsx` — 【吞服丹药】面板内增加机制丹列表（`getPillOptionsForContext(state, 'tribulation')`），选机制丹发 `USE_PILL(context: 'tribulation')`；凝神/筑基丹仍发 `TRIBULATION_ACTION(PILL)`
- **全局丹药 Toast**：`src/App.tsx` — 当 `state.run.temp?.pillToast` 时展示【丹药名】品质：效果文案，点「知道了」发 `CLEAR_PILL_TOAST`
- **通用背包/丹药入口**：未新建 InventoryScreen；机制丹入口以天劫页扩展为主，其余 context 可由后续 B2 在各页加【吃丹】快捷

---

## 24 个机制丹清单（按 6 类分组）+ 规则型标注（D 产物）

| 类别 | 丹药 id | 名称 | 规则型 |
|------|---------|------|--------|
| tribulation | guard_tribulation, avoid_thunder, clear_mind, fate_tribulation | 护劫丹、避雷丹、清心丹、天命丹 | 天命丹(地/天)：额外容错+1 或额外行动+1 |
| explore | guard_explore, escape_explore, treasure_explore, recover_after_hit | 护道丹、遁空丹、引宝丹、回元丹 | 遁空丹(地/天)：无损撤退+1 |
| breakthrough | break_rate, calm_meridian, solid_base, ask_heart | 破境丹、镇脉丹、固本丹、问心丹 | 问心丹(地/天)：本次失败不付代价 |
| cultivate | focus_cultivate, open_meridian, enlighten_cultivate, spring_cultivate | 凝神丹、开脉丹、悟道丹、回春丹 | 悟道丹(地/天)：下一次觉醒候选+1 |
| survival | extend_life, turtle_breath, resolve_crisis, nirvana | 续命丹、龟息丹、化厄丹、涅槃丹 | 龟息丹(地/天)：免死一次；涅槃丹(天)：复活 |
| economy | discount_market, wealth_market, treasure_market, appraise_market | 折扣丹、聚财丹、万宝丹、鉴宝丹 | 万宝丹(地/天)：坊市免费刷新或购买一次 |

---

## 手动验证步骤

1. **天劫吃天命丹翻盘**：进入天劫 → 【吞服丹药】→ 若有机制丹库存（需先通过掉落/调试给 pillInventory 塞天命丹(地)）→ 选天命丹 → 获得额外容错；本回合若 hp≤0 会触发「天命容错，生命保留 1」并继续渡劫
2. **探索吃遁空丹无损撤退**：探索中先 dispatch USE_PILL(遁空丹, context: 'explore') → 再【见好就收】→ 日志出现「【遁空丹】无损撤退，收获全拿」
3. **突破吃问心丹失败不付代价**：突破前 dispatch USE_PILL(问心丹, context: 'breakthrough') → 再突破失败 → 战报为「问心护体」、无扣血/无跌境
4. **免死一次**：龟息丹使用后 run.temp.survivalCheatDeath+1（致死时消费逻辑可后续在 game 死亡分支接入）

---

## npm test 摘要 + npm run build

- **npm test**：47 个测试文件、410 条断言全绿（含 pill_can_use、pill_effects_tribulation/explore/breakthrough/survival、content 校验 24 丹）
- **npm run build**：tsc && vite build 通过
