# 架构设计

## 分层结构

### app 层（应用层）
- **screens/**: 游戏屏幕/页面组件
- **ui/**: 可复用的 UI 组件
- **store/**: 状态机驱动 UI，负责存档联动

### engine 层（引擎层）
- 纯逻辑层，无 DOM 依赖
- 可测试、可注入依赖
- 包含游戏核心逻辑：状态管理、随机数生成、游戏规则等
- **game reducer**: 纯函数状态机，驱动 screen 切换
- **persistence**: localStorage 存档/读档（仅序列化 GameState）
- **events**: JSON 驱动探索事件，校验结构并提供抽取与结算函数

### Loot System（TICKET-7：探索掉落表系统）
- **位置**：`src/engine/loot.ts`
- **概念**：每次深入至少一次掉落，事件结算额外掉落；材料/残页/丹药/遗物碎片分四稀有度（common/rare/epic/legendary）
- **权重系统**：`getLootRarityWeight(rarity, danger, streak)` - danger≥50/75 和 streak≥3/5/8 时稀有掉落权重提升
- **掉落生成**：`rollLootDrop(rng01, danger, streak)` 从掉落表中抽取，权重基于 danger 和 streak
- **应用掉落**：`applyLootItem(player, item)` 将掉落应用到玩家状态（材料/残页/丹药/遗物）
- **连斩奖励**：streak 达到 3/5/8 时触发额外掉落；收手时 streak 结算成"连斩宝箱"（高权重掉落）
- **UI 反馈**：`LootToast` 组件显示掉落 Toast（common 灰、rare 蓝、epic 紫、legendary 金），3 秒自动消失

### Daily Environment（TICKET-6：每日天道环境）
- **位置**：`src/engine/daily.ts`
- **概念**：每天一个“天道环境”= 1 个主 Buff + 1 个副 Buff + 1 个 Debuff + 1 个今日任务；完成任务可领取今日赠礼
- **确定性**：`dayKey`（如 YYYY-MM-DD，由 app 注入）+ `run.seed` → `hashDaySeed(dayKey, runSeed)` → 当日 `environmentId` 与 mission 固定可复现；同一天同 seed 输出一致，跨天自动刷新
- **状态**：`GameState.meta.daily` = `{ dayKey, environmentId, mission: { type, target, progress, claimed } }`；由 `SYNC_DAILY(dayKey)` 写入/刷新，不占用主 RNG
- **Modifier 应用**：`getDailyModifiers(environmentId)` 返回加成对象；在探索（掉落倍率、事件触发率、撤退成功率、受伤）、炼丹（天品质乘数、爆丹伤害减量、成功率、爆丹率）、突破（成功率、失败保底、受伤）等处以纯函数方式注入（`getDailyModifiersFromState(state)` + 各 calc/action）
- **任务进度**：`advanceDailyMission(state, missionType)` 在 CULTIVATE_TICK / EXPLORE_PUSH / EXPLORE_RETREAT / EXPLORE_ROLL_EVENT / ALCHEMY_BREW_CONFIRM（成功成丹）/ BREAKTHROUGH_CONFIRM 等动作中推进；`DAILY_CLAIM` 检查 progress ≥ target 且未领取后发放奖励并设 claimed

### 功法系统（TICKET-10：content → engine ctx → 公式入口）
- **内容**：`src/content/kungfu.v1.json`，12 本功法（common/rare/epic/legendary），每本含 id、name、rarity、shortDesc、effects、sourceHint
- **效果类型**：explore_retreat_add、explore_danger_inc_mul、loot_rare_weight_mul / loot_legend_weight_mul、alchemy_boom_rate_mul、alchemy_quality_shift、breakthrough_rate_add
- **引擎入口**：`src/engine/kungfu.ts`
  - `getEquippedKungfa(state)`：按槽位顺序返回已装备功法列表
  - `buildKungfaModifiers(state)`：将 3 槽功法效果叠加为单一 ctx（KungfuModifiers）
- **公式接入**：所有公式只读此 ctx，单一来源便于测试与扩展
  - **探索**：深入危险增量 × ctx.exploreDangerIncMul；收手撤退成功率 base + ctx.exploreRetreatAdd；掉落稀有度权重 × ctx.lootRareMul / ctx.lootLegendMul
  - **炼丹**：爆丹率 × ctx.alchemyBoomMul；品质分布应用 ctx.alchemyQualityShift（向地/天偏移）
  - **突破**：成功率 + ctx.breakthroughRateAdd
- **装备规则**：仅可装备已拥有；不可重复装备；最多 3 槽；RELIC_EQUIP 装备/卸下有日志
- **获取**：探索掉落表与事件中可掉功法（kungfu 类型）；已有则转化为传承点+1

### 事件链系统（TICKET-11：content 驱动 + chain 状态 + pickEvent 优先级）
- **内容**：`src/content/event_chains.v1.json`，3 条链（残图引路、妖祟作乱、古炉重现），每条 3 章，终章 `guaranteedReward` 必发
- **状态**：`GameState.run.chain` = `{ activeChainId?, chapter?, completed: Record<string, boolean> }`；存档可续，收手后链条保留
- **触发**：`getChainTriggerRate(danger)` 基础 8%、danger≥50 12%、danger≥75 18%；无进行中链时 roll < rate 则 `pickChainToStart` 从未完成链中随机一条并进入第 1 章
- **优先级**：有 `activeChain` 时 EXPLORE_DEEPEN 直接进入当前章事件；无则先 roll 链触发，再 fallback 普通 `pickExploreEvent`
- **结算**：每章仍走 `resolveExploreChoice`（A/B 效果）；终章额外 `applyGuaranteedReward`（功法/配方/材料/传承点），清空 activeChain、`completed[chainId]=true`，日志【金】奇遇通关
- **调试**：`CHAIN_DEBUG_ALWAYS_TRIGGER` 设为 true 时 danger≥50 必触发链（默认 false）

### 软保底系统（TICKET-13：pity counters + weight modifiers + UI progress）
- **位置**：`src/engine/pity.ts`
- **概念**：三类保底——炼丹地/天品、探索传奇掉落、功法传奇掉落；均维护 meta 内计数，达阈值后施加权重偏移或硬保底，避免“脸黑到怀疑人生”
- **状态**：`GameState.meta` = `{ pityAlchemyTop?, pityLegendLoot?, pityLegendKungfa?, kungfaShards? }`；存档保存/加载不丢
- **炼丹保底**：每次炼丹最高品质 < 地则 pityAlchemyTop++，≥ 地则清零；达 THRESHOLD(6) 对下一炉品质施加向地/天偏移；达 HARD(10) 下一炉至少出地品
- **探索传奇保底**：每次宝箱/掉落未出 legendary 则 pityLegendLoot++，出则清零；达 THRESHOLD(12) 传奇权重提升；达 HARD(20) 下一次必出传奇（danger 允许时）
- **功法保底**：功法掉落未出 legendary 则 pityLegendKungfa++，出则清零；达 THRESHOLD(10) 传奇功法权重提升；重复功法转为功法残页+碎片
- **碎片兑换**：meta.kungfaShards 累加（重复功法+1）；30/60/100 碎片可兑换指定稀有/史诗/传奇功法；KUNGFU_SHARD_EXCHANGE 校验拥有与碎片后扣除并加入 relics
- **UI**：炼丹页“天机：地品保底 X/6”、达阈值“天机渐明”；探索页“传奇机缘保底 X/12”、高危险时“此时收手，更容易吃到传奇保底”；功法页“传奇功法保底 X/10”、“碎片 xx/100（可兑换传奇）”+ 兑换区 + 兑换成功弹层
- **调试**：`PITY_DEBUG_SHOW_VALUES = true` 时 UI 显示当前保底数值（默认 false）

### 传承升级树系统（TICKET-12：元进度永久保存 + modifiers合并）
- **内容**：`src/content/legacy_tree.v1.json`，18 个节点（探宝流/丹修流/冲关流各 6 个），每个节点含 id、name、desc、branch、cost、prereqIds、effect、isKeyNode
- **状态**：`GameState.meta` = `{ legacyPoints?, legacySpent?, legacyUpgrades?: Record<string, number> }`；跨局永久保存，不随 run 重置
- **引擎入口**：`src/engine/legacy.ts`
  - `buildLegacyModifiers(meta)`：将所有已购买升级效果叠加为单一 ctx（LegacyModifiers）
  - `canPurchaseUpgrade(upgradeId, meta)`：检查点数、前置、是否已掌握
  - `purchaseUpgrade(meta, upgradeId)`：扣点、记录升级、返回新 meta
  - `getNextKeyNodeDistance(meta)`：计算距离最近关键节点还差多少点（近失感）
- **Modifiers 合并**：legacy modifiers 与 kungfu modifiers 在公式入口处合并
  - **探索**：撤退率 + legacyCtx.exploreRetreatAdd；危险增量 × legacyCtx.exploreDangerIncMul；掉落权重 × legacyCtx.lootRareWeightMul / lootLegendWeightMul；连斩宝箱额外掉落 + legacyCtx.streakChestExtraDrop
  - **炼丹**：爆丹率 × legacyCtx.alchemyBoomRateMul；成功率 + legacyCtx.alchemySuccessAdd；天品偏移 + legacyCtx.alchemyQualityShiftBlast；额外产出概率 + legacyCtx.alchemyExtraYieldChance
  - **突破**：成功率 + legacyCtx.breakthroughRateAdd；失败伤害 - legacyCtx.breakthroughFailureDamageReduction；pity 加成 + legacyCtx.breakthroughPityBonus；pity 阈值额外成功率 + legacyCtx.breakthroughPityBonusRate；死亡保护 + legacyCtx.breakthroughDeathProtectionOnce
- **传承点发放**：`calculateLegacyPointsReward(state)` 基础+1、通关事件链+1、突破成功+1；死亡/总结时发放
- **UI**：LegacyScreen（三条分支Tab、节点卡片、锁定/可购买/已掌握状态、关键节点金色角标）；SummaryScreen 显示传承点奖励和近失感提示

### content 层（内容层）
- 事件 JSON 驱动（`src/content/explore_events.v1.json`）
- 功法 JSON 驱动（`src/content/kungfu.v1.json`）
- 事件链 JSON 驱动（`src/content/event_chains.v1.json`）
- 传承升级树 JSON 驱动（`src/content/legacy_tree.v1.json`）
- 配置数据（版本化）

## 核心原则

### RNG（随机数生成器）
- **必须统一封装在 `src/engine/rng.ts`**
- **禁止在代码中直接使用 `Math.random()`**
- 所有随机数生成必须通过可注入的 `Rng` 接口
- 支持：
  - 默认实现（`defaultRng`）
  - 确定性种子实现（`createSeededRng`）
  - 序列实现（`createSequenceRng`，用于测试）
- **可复现存档**：存 `seed + rngCalls`，加载后跳过调用数恢复随机序列
- **事件快照**：存档只保存事件快照（id/title/text/选项），加载后用 id 回查原事件定义
- **lastOutcome**：结算页数据，用于展示成功/失败的强反馈（包含数值变化 deltas）
- **pity 保底机制**：突破失败累积 pity，提高后续成功率，成功时清零

### 天劫倒计时（TICKET-14：局长节拍器）
- **位置**：`src/engine/time.ts`；`GameState.run.timeLeft` / `timeMax`
- **概念**：用“时辰”（行动步数）控制单局长度，不依赖现实时间；每局重置，约 20~35 次关键行动后时辰耗尽
- **消耗**：修炼、探索深入、探索事件选项、炼丹（一次）、突破（一次）各消耗 1 时辰；返回/查看/装备/领取等不消耗
- **耗尽**：`timeLeft === 0` 时进入天劫挑战（screen=final_trial），不再直接 ending；完成 3 回合后进入 final_result 并发放结局奖励
- **统一入口**：`applyTimeCost(state, cost)` 扣减；`shouldTriggerTribulationFinale(state)` 判断；reducer 关键 action 开头 `tryTribulationFinaleIfNoTime(state)` 若时辰已耗尽则 `enterFinalTrial(state)` 进入天劫挑战
- **UI**：主界面顶部“时辰 x/24”；剩余 ≤4 时红字“天劫将至！再贪就来不及了。”；探索/炼丹/突破按钮旁“消耗：1 时辰”
- **调试**：`TIME_DEBUG_BUTTON = true` 时设置页显示“[调试] 减少 5 时辰”；`DEBUG_SET_TIME_LEFT` action 可设 timeLeft，耗尽时进入 final_trial

### 终局天劫挑战与多结局（TICKET-15）
- **位置**：`src/engine/finalTrial.ts`；`GameState.run.finalTrial`
- **流程**：时辰耗尽 → screen=final_trial，初始化 finalTrial（step=1, threat, resolve, choices=[]）；每回合 FINAL_TRIAL_CHOOSE（steady/gamble/sacrifice）→ 扣血/加 resolve、step++；step>3 → 根据 hp/resolve/threat 计算 endingId（ascend/retire/demon/dead）→ screen=final_result，summary + meta 奖励，tribulationFinaleTriggered=true
- **threat**：纯函数 computeThreat(state)，base 50 + 境界*6 + danger*0.3 + 丹品质（地+6 天+12）+ 通关链数*8，clamp [60,140]
- **伤害**：getDmgBase(threat, step)；稳 applySteadyDamage；搏 applyGamble(rng)；献祭 applySacrificeDamage + 资源扣除；伤害 clamp ≥1
- **结局判定**：computeEndingId(hp, resolve, threat)；hp≤0 → dead；score=resolve-threat，≥20 ascend，[-5,19] retire，<-5 demon
- **奖励**：getFinalRewards(endingId)；ascend +3 传承 +3 碎片；retire +2 +2；demon +2 +1 且 demonPathUnlocked；dead +1 +1
- **存档**：persistence 保存/加载 run.finalTrial（step、threat、resolve、choices），中途退出可续

### 测试
- engine 层必须 100% 可测试
- 使用依赖注入，避免硬编码依赖
- 测试应使用确定性 RNG 或序列 RNG
