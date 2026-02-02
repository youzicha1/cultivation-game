# 架构设计

## 分层结构

### app 层（应用层）
- **screens/**: 游戏屏幕/页面组件
- **ui/**: 可复用的 UI 组件
- **store/**: 状态机驱动 UI，负责存档联动

### UI 视觉系统：AtmosIcon + IconButtonCard + atm-* 全局样式规范（TICKET-31）
- **AtmosIcon**（`src/app/ui/IconArt.tsx`）：氛围感图标体系，内联 SVG，无外链；`<AtmosIcon name="alchemy" size={28} tone="gold|jade|purple|red" />`；iconName 覆盖主界面入口（修炼/探索/炼丹/突破/坊市/功法/传承/成就/设置）与炼丹关键区（丹方/炉温/材料/概率/批量）。
- **IconButtonCard**（`src/app/ui/IconButtonCard.tsx`）：手游式按钮卡片，左侧图标框（atm-iconFrame）+ 右侧标题/副标题，可选 badge；主界面入口统一使用此组件。
- **全局样式**（App.css）：`.atm-card`（暗色渐变+内阴影+边缘高光）、`.atm-card--glow`（可领取/可操作微光）、`.atm-iconFrame`（图标符印框）、`.atm-btn` / `.atm-btn--primary` / `.atm-btn--ghost`、`.atm-press`（按压反馈，prefers-reduced-motion 时禁用动画）、`.atm-textTitle` / `.atm-textSub`；按钮≥44px，无横向滚动，手机一屏关键操作可见。

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

### 突破难度与系统联动（突破前置 + 失败惩罚）
- **位置**：`src/engine/breakthrough_requirements.ts`；`calcBreakthroughRate` / `BREAKTHROUGH_CONFIRM` 于 game.ts
- **基础成功率 0%**：无丹药/传承/功法时突破率由心境等微量加成，需丹药或传承点才明显提升；单次突破**丹药不限量**（可用满背包同品质）
- **后期境界前置**：目标境界需**拥有**特定功法否则成功率强制 0%（吃再多丹也为 0）：筑基→金丹需**破境诀**，金丹→元婴需**天缘石**，元婴→化神需**天机眼**；凡人→炼气、炼气→筑基无功法要求
- **失败惩罚**：失败时**高伤害**（约 14~26+，传承/功法可减伤）；**50% 概率境界跌落一重**（凡人不再降），保底+1、传承点补偿
- **联动**：炼丹提供丹药→突破加概率；探索/事件链掉落功法→满足后期突破前置；传承树提供突破率/失败减伤/保底加成；功法提供突破率加值与保底倍率

### TICKET-30：境界/等级门槛 + 突破重做 + 觉醒技能
- **内容**：`src/content/realms.v1.json`（至少 6 境界：凡人/炼气/筑基/金丹/元婴/化神，levelCap 15/30/45/60/75/99，tribulationMaxTier、pillRules、kungfuRule）；`src/content/awaken_skills.v1.json`（觉醒技能 id/name/desc/modifiers/exclusiveGroup）
- **状态**：`player.level`（1..99）、`player.awakenSkills`（突破成功三选一）；`run.pillUsedByQuality`（本局按品质服用次数）、`run.pendingAwakenChoices`（待选 3 技能）
- **境界门槛**：`src/engine/realm/gates.ts` — `getLevelCap(state)`、`applyExpGain(state, amount)`（cap 挡住不再增长）、`canTakePill(state, quality)` / `recordPillUse(run, quality)`、`canEquipKungfu(state, kungfuId)`、`getTribulationGate(state, tier)`（tier>max 则禁止或 successRate=0）
- **突破引擎**：`src/engine/breakthrough/breakthrough.ts` — `getBreakthroughView(state)`（UI 单一来源：境界/下一境界、Lv/Cap、成功率拆解、可用丹药列表与禁用原因）、`attemptBreakthrough(state, plan, rng)`（plan = pills + focus safe/steady/surge；成功则 realm 升级 + 进入觉醒三选一）、`rollAwakenSkillChoices(state, rng)`、`chooseAwakenSkill(state, skillId)`（modifiers 合并到全局）
- **突破成功率**：`src/engine/breakthrough/rates.ts` — `calcBreakthroughRate` / `calcBreakthroughRateWithBreakdown`（支持多丹药 pills 数组）
- **全局挂钩**：修炼/探索/事件加经验统一走 `applyExpGain`；吃丹（突破页、天劫页）统一走 `canTakePill` + `recordPillUse`；功法装备走 `canEquipKungfu`；天劫进入走 `getTribulationGate`（不满足则禁入）
- **觉醒技能 modifiers**：与功法 modifiers 在 `getKungfuModifiers(state)` 中合并，影响突破/天劫/炼丹/探索公式

### Awaken 池/权重/互斥（TICKET-35）
- **内容**：`src/content/awaken_skills.v1.json` 觉醒技能 ≥60 条，按 rarity（common/rare/epic/legendary）分层，按 tags 分池：explore / alchemy / tribulation / breakthrough / economy / survival / utility；每 tag 至少 8 条，legendary 至少 10 条；字段 id、name、desc、rarity、tags[]、modifiers{}、exclusiveGroup?；modifiers 复用现有 mult/add 体系。
- **位置**：`src/engine/awaken/roll.ts`、`src/engine/awaken_skills.ts`（效果文案映射）
- **权重池**：`getAwakenPoolByTags(state)` 返回 weightsBySkillId。基础权重：common 100、rare 35、epic 20、legendary 8；tag 加权乘数由 `getTagWeightMult(state, tag)` 计算（例：探索多 run_max_danger≥40 → explore×1.25，炼丹多 run_alchemy_count≥5 → alchemy×1.25，天劫频繁 tribulationLevel≥3 → tribulation×1.25）。
- **互斥**：已拥有技能及其同 `exclusiveGroup` 的技能不再入池；选一个技能后，同组其他技能后续三选一不再出现、且不可同时拥有。
- **三选一**：`rollAwakenSkillChoices(state, rng)` 使用加权无放回抽样 `weightedSampleWithoutReplacement` 从池中抽 3 个不重复技能 id；池不足 3 个时返回全部可用。
- **UI**：AwakenSkillScreen 卡片展示稀有度徽章、tags 徽章、短描述（≤18 字）、关键效果 2 条（`getAwakenSkillEffectLines` 从 modifiers 映射）。

### Progression：realm + stage + level + exp 曲线 + cap挡经验 + 两类突破（TICKET-33）
- **进度结构**：玩家始终有 `realm`（境界）+ `stageIndex`（阶 1..7）+ `level`（等级 1..99）。每境界内按阶推进：每阶 15 级，最后一阶 9 级（Lv91–99）；阶边界 15,30,45,60,75,90,99。
- **位置**：`src/engine/progression/stage.ts` — `getStageIndex(level)`、`getStageCapByStage(stageIndex)`、`getStageCap(state)`、`isStageCapped(state)`、`canStageBreakthrough(state)`、`canRealmBreakthrough(state)`；`expNeededForNextLevel(level)` 二次曲线升级所需经验。
- **经验与 cap**：`src/engine/realm/gates.ts` 的 `applyExpGain(state, amount)` 以当前阶上限为 cap；`level === stageCap` 时经验不再增长并返回提示「已到上限，需阶突破」。修炼/探索经验统一走 `applyExpGain`。
- **两类突破**：
  - **阶突破**（`attemptStageBreakthrough`）：条件 `level === stageCap` 且 `stageIndex < 7`；成功则 `stageIndex++`、`level++`、exp 清零，奖励包（maxHp+10、回气丹×1）；失败扣血、保底+1。`STAGE_BREAKTHROUGH_CONFIRM` 触发。
  - **境界突破**（`attemptBreakthrough`）：条件 Lv99 且 `stageIndex === 7`；成功则 realm 升级、level=1、stageIndex=1、exp 清零，触发觉醒技能三选一；失败高伤害、50% 境界跌落。`BREAKTHROUGH_CONFIRM` 触发。
- **单一真相**：所有 cap/经验/突破判定与收益均在 engine；UI 只展示 `getBreakthroughView`/`getStageCap` 等与触发 action。CultivateScreen 展示境界+阶+等级/本阶上限+经验条；BreakthroughScreen 区分阶突破与境界突破并写清收益。

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

### 成就系统 v2（TICKET-28：criteria 类型、stats/streak/flag、单一来源 view、claim 幂等）
- **位置**：`src/engine/achievements.ts`、`src/content/achievements.v1.json`
- **概念**：72 条成就、8 组（探索/炼丹/突破/天劫/坊市/功法流派/收集/传承），条件类型：累计计数（lifetime counter）、本局达成（run max）、连胜（streak）、技巧/挑战（flag）、收集类、Build 类
- **状态**：`GameState.achievements.claimed`（已领取 ID，跨局持久化）；`GameState.meta.statsLifetime`（累计统计）；`GameState.run.stats`（本局 run_max_danger、run_alchemy_count、run_item_types 等）；`GameState.run.streaks`（cashout_streak、alchemy_success_streak、breakthrough_success_streak、tribulation_success_streak）；`GameState.run.flags`（技巧/挑战触发）
- **单一来源**：`getAchievementView(state)` 返回 UI 需要的全部（进度 current/target、completed、claimable、claimed、rewardText、分组、排序）；UI 不计算进度
- **领取**：`claimAchievement(state, id)`、`claimAllAchievements(state)` 幂等，奖励（灵石/传承点）由引擎发放；领取后写入 claimed 并累加 achievement_claims_lifetime
- **事件落点**：探索（EXPLORE_DEEPEN 更新 explore_actions、run_max_danger、explore_allin_no_cashout；EXPLORE_CASH_OUT 更新 explore_cashouts、cashout_streak、explore_low_hp_cashout/explore_greed_cashout）；炼丹（ALCHEMY_BREW_CONFIRM 更新 alchemy_success/boom/tian_lifetime、run_alchemy_count、alchemy_success_streak、alchemy_boom_high_success 等 flag）；突破（BREAKTHROUGH_CONFIRM 成功/失败更新 breakthrough_success/fail_lifetime、breakthrough_success_streak、低成功率/残血/保底 flag）；天劫（TRIBULATION_ACTION 终局或 FINAL_TRIAL_CHOOSE 终局更新 tribulation_success/fail_lifetime、tribulation_success_streak、build_mod_tribulation flag）；坊市（SHOP_BUY 更新 shop_trades/spend_lifetime、run_item_types、shop_spend_1500_once 等 flag）
- **持久化**：`getPersistentAchievements()` / `savePersistentAchievements(state)` 独立 key 存储 claimed 与 statsLifetime；新开局时合并进新 state

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
- 天劫意图 JSON 驱动（`src/content/tribulation_intents.v1.json`，TICKET-36）
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
- **概念**：用“时辰”（行动步数）控制单局长度，不依赖现实时间；单局约 20–30 分钟，难度提升后给足时辰
- **时辰量**：首局 48 时辰（`TIME_MAX_BASE`）；每过一劫续局时 +12（`getTimeMaxForSegment(level)` = 48 + level×12），如过 1 劫后 60、过 2 劫后 72
- **消耗**：修炼、探索深入、探索事件选项、炼丹（一次）、突破（一次）各消耗 1 时辰；返回/查看/装备/领取等不消耗
- **耗尽**：`timeLeft === 0` 时进入天劫挑战（screen=final_trial）；TICKET-29 使用回合制天劫（run.tribulation），完成 totalTurns 回合后根据 hp 与重数进入 victory / final_result / home（续局）
- **统一入口**：`applyTimeCost(state, cost)` 扣减；`shouldTriggerTribulationFinale(state)` 判断（排除 screen=death/ending/summary/victory）；reducer 关键 action 开头 `tryTribulationFinaleIfNoTime(state, rng)` 若时辰已耗尽则 `enterFinalTrial(state, rng)` → startTribulation 初始化回合制天劫
- **UI**：主界面顶部“时辰 x/48”（或当前 timeMax）；剩余 ≤8 时红字“天劫将至！再贪就来不及了。”；探索/炼丹/突破按钮旁“消耗：1 时辰”
- **调试**：`TIME_DEBUG_BUTTON = true` 时设置页显示“[调试] 减少 5 时辰”；`DEBUG_SET_TIME_LEFT` action 可设 timeLeft，耗尽时进入 final_trial

### 终局天劫挑战与多结局（TICKET-15）
- **位置**：`src/engine/finalTrial.ts`；`GameState.run.finalTrial`（旧流程，兼容存档）
- **TICKET-29 回合制**：时辰耗尽后进入**天劫回合制**（run.tribulation），见下节；旧 finalTrial 流程仍支持 FINAL_TRIAL_CHOOSE 以兼容旧存档。
- **流程（旧）**：finalTrial step=1..3，FINAL_TRIAL_CHOOSE（steady/gamble/sacrifice）→ step>3 → endingId → final_result / victory / home
- **结局判定**：computeEndingId(hp, resolve, threat)；hp≤0 → dead；score=resolve-threat，≥20 ascend，[-5,19] retire，<-5 demon
- **奖励**：getFinalRewards(endingId)；ascend +3 传承 +3 碎片；retire +2 +2；demon +2 +1 且 demonPathUnlocked；dead +1 +1
- **存档**：persistence 保存/加载 run.finalTrial 与 run.tribulation（回合制子状态），中途退出可续

### 天劫回合制（TICKET-29：Intent → View → Action → Resolve）
- **位置**：`src/engine/tribulation/tribulation.ts`、`tribulation_intents.ts`；`GameState.run.tribulation`
- **概念**：天劫从“一键扣血”升级为多回合（3～5 回合）可操作玩法；每回合展示**天道意图**，玩家选一次行动，结算有反馈与变数。
- **子状态**：`run.tribulation` = { level, totalTurns, turn, shield, debuffs: { mindChaos, burn, weak }, wrath, currentIntent, log[] }；level 为当前要渡的第几重，totalTurns 由 getTotalTurnsForLevel(level) 得 3/4/5。
- **单一来源**：`getTribulationTurnView(state)` 输出 UI 所需一切（回合/HP/护盾/debuff、意图名称与伤害区间、telegraphText/counterHint、可用动作列表与提示、最近日志、逆冲成功率）；UI 只展示与发 TRIBULATION_ACTION，不自行算概率与伤害。
- **意图（Intent）**：TICKET-36 内容驱动，`src/content/tribulation_intents.v1.json` ≥12 种（含 ≥3 稀有）；每意图含 id/name/rarity/effectSpec/telegraphText/counterHint/minTier/baseWeight；抽选由 `rollIntent(level, rng)` 完成，按 minTier 过滤、按 baseWeight 加权（低 tier 不出稀有）。
- **稀有与特殊**：稀有意图 minTier≥6；effectSpec 可含 blockHeal（本回合回血丹无效）、shieldPenetration（护盾穿透比例）；结算时 applyDamageToState 支持穿透，PILL 回血受 blockHeal 限制。
- **行动（Action）**：STEADY（减伤约 25%+清除 1 层心乱/灼烧）、PILL（选丹：回血/护盾/净化，消耗背包）、GUARD（高减伤 50%，下回合 weak+1）、SURGE（逆冲天威，成功率受 level/mindChaos/功法 tribulationSurgeRateAdd 影响，成功降劫威，失败额外受伤或心乱）。
- **RNG 注入**：所有随机（意图抽取、伤害 roll、逆冲成败）统一走 rng 注入；测试用 createSequenceRng。
- **丹药接入**：至少 2 类生效——回血（qi_pill、blood_lotus_pill）、护盾（purple_heart_pill）、净化（ice_heart_pill）；getTribulationPillOptions(state) 列出可选丹，applyTribulationAction(…, 'PILL', rng, pill) 消耗数量并生效。
- **功法接入**：tribulationDamageMult 影响最终伤害；tribulationSurgeRateAdd 影响 SURGE 成功率；getKungfuModifiers(state) 单一来源。
- **胜负**：hp≤0 → outcome 'lose'，走既有渡劫失败流程（final_result、传承点、成就）；turn≥totalTurns → outcome 'win'，走既有成功流程（victory 或 home 续局）。
- **存档**：persistence 校验并恢复 run.tribulation（level/turn/shield/debuffs/wrath/currentIntent/log）。

### 天劫 12 重通关（TICKET-27）
- **状态**：`GameState.run.tribulationLevel` 0..12，表示本局已渡过的天劫重数；NEW_GAME 为 0，渡劫成功 +1，达 12 即通关
- **命名**：`src/engine/tribulation/names.ts` 固定 12 重名称（青霄雷劫 → 大道归一劫）；`getTribulationName(level)` 取第 level 重名称
- **成功率**：`src/engine/tribulation/rates.ts` 的 `getTribulationSuccessRate(level, bonus)`，base 0.78、每重降 0.045、下限 0.12、上限 0.95；供 UI 展示与后续难度缩放
- **通关条件**：连续渡过 12 次天劫（每次时辰耗尽 → final_trial 3 回合 → 成功则 tribulationLevel += 1）；tribulationLevel === 12 时进入 screen=**victory**，传承点 +8，显示「十二劫尽渡，登临大道！」
- **失败**：任意一重 hp≤0（endingId=dead）→ screen=final_result，传承点 1+floor(level/4)，本局结束
- **续局**：渡劫成功且 level < 12 → screen=home，timeLeft/timeMax 重置，tribulationFinaleTriggered=false，可继续玩至下次时辰耗尽进入下一重
- **UI**：FinalTrialScreen 显示「第 N 重：{名字} / 12」与渡劫成功率；VictoryScreen 通关摘要 + 再开一局
- **存档**：persistence 保存/加载 run.tribulationLevel（0..12）

### 坊市/商店（TICKET-18 / TICKET-34）
- **位置**：`src/engine/shop.ts`、`src/engine/market/pricing.ts`、`src/engine/market/obtainable.ts`；ScreenId `shop`；`run.shopMissing` 可选（从炼丹页带入缺口）
- **价格**：纯函数；当前买价 = ceil((basePrice ?? getBasePriceByRarity(rarity)) × getPriceMult(state, category))；getPriceMult 读 daily 与 shopDiscountPercent；**TICKET-34** 稀有度定价：common 10、uncommon 25、rare 60、epic 140、legendary 320（`RARITY_BASE_PRICE`）。
- **出售**：getSellPrice(state, itemId) = floor(买价×0.8)；canSell/applySell；reducer SHOP_SELL 扣材料、加灵石并写日志。
- **商品分类/稀有度**：ShopItemDef 含 category（herb/dew/ore/beast）、rarity（MarketRarity）、basePrice 可选；全 16 种炼丹材料进坊市可购买（补齐获取途径）。
- **Obtainable 校验**：`getObtainableMaterialIds()` 汇总坊市售卖 + 探索掉落（getLootMaterialIds）+ 奇遇链 guaranteedReward/effects + 探索事件 effects；content_validation 断言所有 recipe 材料 ∈ obtainableIds，缺失时测试失败并输出列表。
- **买入**：canBuy、applyBuy；SHOP_BUY；一键补齐 getFillMissingPlan、SHOP_FILL_MISSING。
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
