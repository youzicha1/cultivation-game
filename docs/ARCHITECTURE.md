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
- **persistence**: localStorage 存档/读档；TICKET-24 使用 SaveEnvelope（meta.schemaVersion、savedAt + state），支持旧格式迁移与不兼容时自动备份
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

### Kungfu Modifiers（TICKET-22：mult/add 叠加规则）
- **单一来源**：`src/engine/kungfu_modifiers.ts` 的 `getKungfuModifiers(state)` 合并三槽位功法的 modifiers（含 JSON 新字段 `modifiers` 与旧 `effects` 映射），供探索/炼丹/突破/天劫公式使用
- **叠加规则**：
  - **\*Mult 类**（如 exploreDangerIncMult、exploreRareWeightMult、alchemyBoomMul、tribulationDamageMult）：默认 1，**相乘**
  - **\*Add 类**（如 breakthroughSuccessAdd、alchemySuccessAdd、exploreRetreatAdd）：默认 0，**相加**
  - **\*ChoiceAdd**（如 tribulationExtraChoiceAdd）：默认 0，相加后**取整**
- **接入点**：探索（危险增长、收手灵石/修为倍率、稀有权重）；炼丹（成功率加值、爆丹率乘数、材料消耗倍率、爆丹补偿倍率）；突破（成功率加值、失败保底增长倍率）；天劫（伤害倍率、额外选项）
- **流派标签**：功法 JSON 支持 `tags`（如 build:tanbao / build:danxiu / build:chongguan），UI 功法页展示流派标签与 1~2 条关键效果文案

### Cultivation: mind 状态与系统联动（TICKET-23）
- **状态**：`PlayerState.mind`（0~100，默认 50）、`PlayerState.injuredTurns`（受伤剩余回合）
- **引擎入口**：`src/engine/cultivation.ts`
  - `getCultivateInfo(state)`：返回 mind、mindTier（心浮/平稳/澄明/入定）、mindEffectsSummary
  - `cultivate(state, mode, rng)`：mode 为 breath（吐纳）/ pulse（冲脉）/ insight（悟道），返回 nextPlayer、nextRunDelta、logMessage、toast、可选 insightEvent（顿悟 A/B 卡）
- **三模式**：吐纳（稳定回血/修伤、修为 10+floor(mind/20)、mind+6、danger-2）；冲脉（高修为 16+rand(0,6)、mind-4、小概率受伤 hp-8 且 injuredTurns+2，成功时灵石+3）；悟道（基础修为 8、概率顿悟触发 A/B 选择：稳悟碎片/传承、险悟修为+危险/扣血）
- **mind 联动**：
  - **探索**：危险增长 × `getMindDangerIncMult(mind)`，乘数 = (1 - (mind-50)*0.002) clamp [0.85, 1.15]
  - **突破**：成功率 + `getMindBreakthroughBonus(mind)`，加值 = (mind-50)*0.0012
  - **炼丹**（可选）：mind≥70 时成功率 +2%（`getMindAlchemySuccessBonus`）
- **动作**：`CULTIVATE_TICK` 接受 mode；`CULTIVATE_INSIGHT_CHOOSE` 处理顿悟 A/B；`CLEAR_CULTIVATE_TOAST` / `CLEAR_INSIGHT_EVENT` 清除 UI 状态

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

### 内容结构与校验测试（TICKET-21）
- **事件链**：`src/content/event_chains.v1.json` 驱动；链 ID 唯一，每链 3~5 章，终章 `guaranteedReward` 必发；大奖类型：kungfu / kungfu_or_recipe / epic_material_elixir / recipe / pills / title / legacy / shop_discount / tribulation_bonus
- **run 级奖励**：终章可写 `run.shopDiscountPercent`、`run.tribulationDmgReductionPercent`、`run.earnedTitle`；坊市价格与天劫伤害公式读取上述字段
- **断链补偿**：死亡且存在进行中链时，发默认补偿（残页 +1、保底 +1、灵草 ×1）并写爽文日志，清空 activeChainId
- **校验测试**：`src/engine/content_validation.test.ts` 校验链 ID 唯一、每链 ≥3 节点且 ≥1 终章大奖、guaranteedReward 中 materialId/recipeId/kungfu id 存在、shop_discount/tribulation_bonus 数值在 0–100；探索事件 ID 唯一、minDanger/maxDanger 合法、rarity 合法、effects 中 material/fragment id 存在

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

### 坊市/商店（TICKET-18）
- **位置**：`src/engine/shop.ts`；ScreenId `shop`；`run.shopMissing` 可选（从炼丹页带入缺口）
- **价格**：纯函数；当前价 = ceil(basePrice × getPriceMult(state, category))；getPriceMult 读 `state.meta.daily.environmentId` → getDailyModifiers(envId).priceMultByCategory[category] ?? 1
- **每日修正**：DailyModifiers 新增 priceMultByCategory（herb/dew/ore/beast）；各环境在 daily.ts MODIFIERS 中配置（如 alchemy_day 草药 0.9、danger_day 矿 1.15）
- **买入**：canBuy(state, itemId, qty) 检查 gold ≥ 总价；applyBuy 返回 newPlayer/cost/logMessage；reducer SHOP_BUY 应用并写日志
- **一键补齐**：getFillMissingPlan(state, missing) 算总价与 missingGold；SHOP_FILL_MISSING 按顺序尽量买齐，钱不够则日志“还差灵石×X”
- **存档**：persistence 可选保存/加载 run.shopMissing

### 存档版本/迁移/诊断（TICKET-24）
- **SaveEnvelope**：localStorage 写入格式为 `{ meta: { schemaVersion, savedAt }, state }`；key 为 `cultivation_save_v1`
- **读档**：解析 raw → migrate(raw) → 返回 state；旧存档（纯 state 或旧 version/savedAt 格式）自动迁移为 envelope；schemaVersion 高于 CURRENT_SCHEMA 或解析失败时返回 null，不崩
- **备份**：不兼容或解析失败时 `tryBackup(raw, reason)` 写入 `cultivation_save_v1_backup_<timestamp>`，调用方收到 null 后重置为 initState()
- **诊断页**：`/diagnostics`（SettingsScreen 入口「诊断/自检」）；展示 APP_VERSION、CURRENT_SCHEMA、存档 meta、state 摘要；复制存档 JSON、粘贴导入（校验后写入）、清档

### 测试
- engine 层必须 100% 可测试
- 使用依赖注入，避免硬编码依赖
- 测试应使用确定性 RNG 或序列 RNG
