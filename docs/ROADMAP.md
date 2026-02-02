# 路线图

## MVP 屏幕清单

以下是游戏的主要屏幕/功能模块：

1. **开局** - 游戏开始界面（已落地）
2. **主界面** - 游戏主菜单（已落地）
3. **修炼** - 修炼界面（已落地）
4. **探索** - 探索界面（已落地）
5. **探索深入** - 事件 JSON 系统（已落地）
6. **收手** - 停止探索（TICKET-5 已落地：EXPLORE_SETTLE）
7. **炼丹** - 炼丹系统（已落地，TICKET-5 炉温稳/冲/爆）
8. **突破准备** - 突破境界前的准备（已落地，TICKET-5 临门一脚提示）
9. **突破结算** - 突破结果展示（已落地，含保底机制）
10. **死亡结局** - 角色死亡处理（已落地）
11. **本局总结** - 单局游戏总结（已落地）
12. **图鉴** - 游戏内容图鉴（已落地）
13. **设置** - 游戏设置（已落地）
14. **存档** - 存档/读档功能（已落地）
15. **传承** - 传承系统（TICKET-12 可玩：传承升级树、3条路线、18个节点、元进度永久保存、近失感提示）
16. **商店** - 商店系统
17. **背包** - 物品管理
18. **任务** - 任务系统
19. **成就** - 成就系统（TICKET-28 已落地：72 条成就、8 组、进度/领取/一键领取、隐藏成就）
20. **统计** - 游戏统计数据
21. **奇遇回顾** - 探索事件回顾（占位）
22. **丹药配方系统** - 丹药合成与配方（已落地）
23. **装备/功法** - 功法系统（TICKET-10 可玩：12 本功法、3 槽装备、探索/炼丹/突破加成、探索掉落、功法页已拥有/未获得/一键装备）
24. **事件图鉴** - 探索事件图鉴（占位）

## TICKET-5 完成项（上头循环升级）

- **秘境分层 + 连胜**：Depth、Risk（稳/险/狂）、气运连斩 streak；深入/收手/继续梭哈/撤退
- **炉温赌一把**：炼丹炉温 稳/冲/爆，影响爆丹率与天品质概率
- **突破临门一脚**：pity ≥ 阈值时 UI 提示“下一次成功率将大幅提升”
- **遗物/成就/结局**：遗物装备屏、成就屏、结局 ID + 差一点提示（数据结构就绪）
- **工程**：RNG 封装不变、reducer 可测、新逻辑有 Vitest、存档兼容

## TICKET-6 完成项（每日天象/时运 BUFF & DEBUFF）

- **每日天道环境**：6 种环境（丹火旺盛日、灵潮涌动日、道心澄明日、心魔作祟日、五行平和日、煞气弥漫日），主 Buff + 副 Buff + Debuff + 今日任务
- **确定性生成**：`hashDaySeed(dayKey, runSeed)` → 同一天同 seed 环境一致；`SYNC_DAILY(dayKey)` 由 HomeScreen 注入本地日期
- **Modifier 落地**：探索（掉落倍率、事件触发率、撤退成功率、受伤）、炼丹（天品质/爆丹伤害/成功率/爆丹率）、突破（成功率、失败保底、受伤）、修炼（走火入魔受伤）
- **今日任务与领取**：brew_success / explore_depth / attempt_breakthrough / encounter_event / cultivate_tick / retreat_success；进度在对应动作中推进，`DAILY_CLAIM` 发放赠礼
- **UI**：HomeScreen 顶部“今日天道环境”卡片（标题、三行 Buff/Debuff、任务进度条、领取按钮、立即前往）
- **工程**：daily.test.ts（hashDaySeed、generateDailyEnvironment、getDailyEnvironmentDef、getDailyModifiers）；game.test.ts（SYNC_DAILY、DAILY_CLAIM）；docs 更新

## TICKET-7 完成项（探索"出货"系统）

- **掉落表系统**：`src/engine/loot.ts` - 四稀有度掉落表（common/rare/epic/legendary），材料/残页/丹药/遗物碎片
- **掉落生成**：每次 `EXPLORE_DEEPEN` 至少一次掉落；`EXPLORE_CHOOSE` 事件结算额外掉落；`EXPLORE_CASH_OUT` 连斩宝箱结算
- **权重系统**：danger≥50/75 和 streak≥3/5/8 时稀有掉落权重提升（`getLootRarityWeight`）
- **连斩奖励**：streak 达到 3/5/8 时触发额外掉落；收手时 streak 结算成"连斩宝箱"（高权重掉落）
- **强反馈 UI**：`LootToast` 组件（common 灰、rare 蓝+灵光一闪、epic 紫+紫气东来、legendary 金+天降机缘），3 秒自动消失
- **连斩提示**：探索面板显示连斩层数和"下次宝箱更大"提示（streak 3/5/8 阈值）
- **工程**：loot.test.ts（权重计算、掉落生成、固定 rng 可预测）；game reducer 中掉落应用；docs 更新

## TICKET-10 完成项（功法系统“真正可玩”）

- **功法内容**：`kungfu.v1.json` 12 本功法（稳心诀、浅息诀、稳炉符、退避玉、深境诀、拾缘诀、镇火诀、向天诀、破境诀、天缘石、连斩护符、天机眼），效果覆盖探索撤退/危险增量/掉落权重、炼丹爆丹/品质、突破成功率
- **引擎 ctx**：`buildKungfaModifiers(state)` 单一入口，公式只读此 ctx
- **三条线接入**：探索（危险增量、撤退率、稀有掉落权重）、炼丹（爆丹率乘数、品质偏移）、突破（成功率加值）
- **获取与补偿**：探索掉落功法（rare/epic/legendary）；已有则转化为传承点+1
- **功法页**：3 槽展示/卸下、已拥有/未获得分组、一键装备到空槽、sourceHint 展示
- **下一步**：事件链/传奇事件必掉功法、传承树扩展

## TICKET-12 完成项（元进度：传承升级树）

- **传承升级树**：3条路线（探宝流/丹修流/冲关流），每条6个节点，共18个节点（MVP）
- **元进度永久保存**：legacyPoints、legacyUpgrades 保存在 meta 层，跨局保留
- **升级效果真实影响玩法**：探索（撤退率、掉落权重、危险增量、连斩宝箱）、炼丹（爆丹率、成功率、天品偏移、额外产出）、突破（成功率、失败伤害减免、pity加成、死亡保护）
- **每局都不亏**：基础+1，通关事件链+1，突破成功+1
- **近失感提示**：结算页和传承页显示“距离下一个关键节点还差X点”
- **UI**：LegacyScreen（三条分支Tab、节点卡片列表、锁定/可购买/已掌握状态、关键节点金色角标）
- **工程**：legacy.test.ts（purchaseUpgrade、modifiers生效）、game.test.ts（LEGACY_PURCHASE、legacy modifiers接入）、persistence保存、docs更新

## TICKET-11 完成项（章节奇遇事件链）

- **3 条链**：《残图引路》洞府传承（功法/配方/传承点）、《妖祟作乱》妖王内丹（史诗材料+传承点）、《古炉重现》炉灵认主（镇火诀）
- **触发**：danger≥75 约 18%、≥50 约 12%、否则 8%；有进行中链时深入直接进当前章
- **终章大货**：guaranteedReward 必发；日志【金】奇遇通关；completed 标记防重复
- **UI**：事件卡标题前缀「奇遇·《xxx》 2/3」；探索面板无事件时显示「奇遇进度：2/3（继续深入可推进）」+「终章必有大货」
- **调试**：`src/engine/chains.ts` 中 `CHAIN_DEBUG_ALWAYS_TRIGGER = true` 可令 danger≥50 必触发链（默认 false）

## TICKET-13 完成项（软保底 + 碎片兑换）

- **炼丹保底**：pityAlchemyTop，6 炉未出地/天则下一炉品质向地/天偏移，10 炉硬保底至少地品；UI“天机：地品保底 X/6”
- **探索传奇保底**：pityLegendLoot，12 次未出传奇则权重提升，20 次硬保底下一次传奇；UI“传奇机缘保底 X/12”、高危险“此时收手，更容易吃到传奇保底”
- **功法保底**：pityLegendKungfa，10 次功法掉落未出传奇则传奇权重提升；重复功法转碎片
- **碎片兑换**：kungfaShards 30/60/100 兑换指定稀有/史诗/传奇功法；功法页兑换区 + 兑换成功弹层“你以碎片换得《xxx》”
- **工程**：pity.test.ts（保底与碎片纯函数）；game.test.ts（KUNGFU_SHARD_EXCHANGE、CLEAR_SHARD_EXCHANGE_TOAST）；persistence（meta.pity*、kungfaShards 保存/加载）；docs 更新

## TICKET-14 完成项（天劫倒计时 · 局长节拍器）

- **时辰**：`run.timeLeft` / `run.timeMax`（默认 24），每局重置；关键动作各消耗 1 时辰（修炼、探索深入、事件选项、炼丹、突破）
- **收官**：时辰耗尽自动进入 ending、天劫文案 + 传承点奖励，单局时长稳定约 15~25 分钟
- **UI**：顶部“时辰 x/24”；≤4 时红字“天劫将至！再贪就来不及了。”；探索/炼丹/突破处“消耗：1 时辰”
- **工程**：time.ts（getActionTimeCost、applyTimeCost、shouldTriggerTribulationFinale）；time.test.ts；game.test.ts（TICKET-14 用例）；persistence 保存/加载 timeLeft/timeMax；DEBUG_SET_TIME_LEFT + 设置页可选调试按钮

## TICKET-15 完成项（终局天劫挑战 + 多结局）

- **流程**：时辰耗尽后进入「天劫挑战」页（screen=final_trial），3 回合抉择（稳/搏/献祭），完成后根据 hp/resolve/threat 判定结局并进入「结局」页（screen=final_result）
- **状态**：`run.finalTrial` = { step: 1|2|3, threat, resolve, wounds?, choices[], rewardSeed? }；threat 由本局表现纯函数计算（境界、danger、丹品质、通关链），clamp [60,140]
- **三选项**：稳（守心渡劫，伤害低、resolve+2）、搏（逆天一搏，rng 成功伤害低 resolve+6、失败伤害高）、献祭（消耗灵石/丹药/材料/传承点换伤害减免或回血或 resolve）
- **结局**：ascend（飞升）、retire（归隐）、demon（入魔）、dead（战死）；每种结局均有传承点+碎片奖励（爽文补偿），入魔解锁魔道天赋
- **UI**：FinalTrialScreen（天劫条 3 段、HP/resolve/threat、第 X 雷 + 三选项）；FinalResultScreen（结局标题、战报、传承点/碎片、开新一局/去传承升级）
- **工程**：finalTrial.ts（computeThreat、computeInitialResolve、伤害公式、computeEndingId、getFinalRewards）；finalTrial.test.ts；game.test.ts（FINAL_TRIAL_CHOOSE、step 推进、搏 rng）；persistence 保存/加载 finalTrial；docs 更新

## TICKET-17A 完成项（炼丹页一屏化 + 爽文 UI + 开奖弹层）

- **一屏布局**：1366×768 / 390×844 下无需下滑即可见顶部资源条、配方/炉温/批量、成功率大数字、底部 StickyFooter（状态提示 + 炼丹 + 返回）
- **材料缺口**：缺什么、缺多少一眼可见；缺项在材料列表中高亮；「去探索」「去商店（开发中）」入口
- **主题**：丹火暖色（火焰橙/灵玉绿/爆丹红/紫稀有），面板暖金微光，主按钮橙金、触控≥44px
- **概率单一来源**：`src/engine/alchemy_calc.ts` 的 `getAlchemyChances(state, selection)` 返回 successRate、boomRate、breakdown；`getAlchemyShortage(state, selection)` 返回缺口；UI 仅展示上述返回值
- **开奖弹层**：点击炼丹后居中 Modal，成丹/爆丹、获得物品+品质（灰/蓝/紫/金），主按钮「继续炼丹」、次按钮「去突破」
- **通用组件**：StickyFooter、Modal（后续突破/探索复用）
- **工程**：alchemy_calc.ts、alchemy_calc.test.ts（缺口与概率）；AlchemyScreen 用 alchemy_calc；ROADMAP 更新

## TICKET-18 完成项（坊市/商店 + 每日价格 + 缺口闭环）

- **坊市**：买入灵草/月华露/铁砂/妖核等基础材料（4 种与炼丹配方一致）；价格 = ceil(basePrice × dailyMult)，dailyMult 来自今日天道环境
- **每日价格**：daily.modifiers.priceMultByCategory（herb/dew/ore/beast）；例：丹火日草药 0.9、灵潮日露 0.85、煞气日矿/妖核偏贵
- **闭环**：炼丹页“缺口”旁【去坊市】带 run.shopMissing；坊市页【按缺口补齐】一键购买（钱不够则部分补齐 + 提示还差灵石×X）
- **引擎**：shop.ts（getShopCatalog、canBuy、applyBuy、getFillMissingPlan）；game.ts SHOP_BUY、SHOP_FILL_MISSING、GO 支持 shopMissing
- **UI**：ShopScreen 一屏（资源条 + 商品列表可内部滚动 + StickyFooter）；persistence 可选保存 run.shopMissing
- **工程**：shop.test.ts（价格受 daily、买入扣金加料、金钱不足不可买、qty 边界、fillPlan）；docs 更新

## TICKET-21 完成项（奇遇链扩容 v2）

- **链与节点**：奇遇链主题 ≥12 类，总链数 ≥15 条，每条 3~5 节点，总节点 ≥60
- **终章大奖类型**：材料 / 配方 / 功法 / 丹药 / 称号 / 传承点 / 坊市折扣 / 天劫加成（至少 6 种）
- **断链补偿**：死亡时若有进行中链，发碎片 + 保底 + 小礼包 + 爽文日志「虽未竟全功，亦有残卷与保底相随。」
- **内容校验**：`src/engine/content_validation.test.ts` 校验链 ID 唯一、节点唯一、reward/item 引用存在、每链 ≥3 节点且 ≥1 终章大奖、tags/rarity/danger 合法
- **文档**：`docs/CONTENT_AUDIT.md` 扩容前后统计；`docs/ARCHITECTURE.md` 补「内容结构与校验测试」小节

## TICKET-22 完成项（功法流派化 Build 成型）

- **数据**：`kungfu.v1.json` 每本功法新增 `tags`（如 build:tanbao / build:danxiu / build:chongguan）与 `modifiers`（camelCase 键），旧 `effects` 保留兼容
- **单一来源**：`getKungfuModifiers(state)` 合并三槽位 modifiers，*Mult 相乘、*Add 相加；探索/炼丹/突破/天劫各至少吃到一个 modifier
- **探索**：危险增长倍率、收手灵石/修为倍率、稀有权重
- **炼丹**：成功率加值、爆丹率乘数、材料消耗倍率、爆丹补偿倍率
- **突破**：成功率加值、失败保底增长倍率
- **天劫**：伤害倍率、额外选项
- **UI**：功法页展示流派标签与 1~2 条关键效果文案
- **工程**：kungfu_modifiers.ts + kungfu_modifiers.test.ts；各 calc 测试补断言；docs 更新

## TICKET-23 完成项（修炼系统增强：心境 + 三模式 + 顿悟）

- **三模式**：吐纳（稳回血/修伤/修为）、冲脉（高修为小概率受伤/成功灵石+3）、悟道（概率顿悟 A/B 选赏）
- **状态**：mind 0~100（默认 50）、injuredTurns；心境档位心浮/平稳/澄明/入定
- **mind 联动**：探索危险增长 × mind 乘数；突破成功率 + mind 加值；炼丹（可选）mind≥70 成功率+2%
- **顿悟**：悟道触发时弹层展示 A（稳悟碎片/传承）/ B（险悟修为+危险或扣血）
- **UI**：修炼页心境条 + 三模式按钮（吐纳/冲脉/悟道）+ 结果 Toast + 顿悟弹层；一屏完成主要操作
- **工程**：cultivation.ts + cultivation.test.ts；game CULTIVATE_TICK(mode)、CULTIVATE_INSIGHT_CHOOSE；persistence mind/injuredTurns/pendingInsightEvent；docs 更新

## TICKET-27 完成项（天劫 12 重小通关 + 爽文命名 + 难度递增）

- **通关条件**：连续渡过 12 次天劫即通关；tribulationLevel 0..12，每次渡劫成功 +1，达 12 进入 Victory 屏
- **12 重命名**：`src/engine/tribulation/names.ts` 固定表（青霄雷劫、赤炎焚心劫 … 大道归一劫）；FinalTrialScreen 显示「第 N 重：{名字} / 12」
- **成功率**：`getTribulationSuccessRate(level, bonus)` 单一真相，base 0.78、每重降 0.045、clamp [0.12, 0.95]；UI 展示由引擎返回
- **失败**：任意一重战死 → final_result，传承点 1+floor(level/4)；成功续局则时辰重置、回 home
- **Victory 屏**：十二劫尽渡传承点 +8，摘要 + 再开一局；time 排除 screen=victory 触发收官
- **工程**：tribulation/names.ts、rates.ts + 对应 test；game.run.tribulationLevel、ScreenId victory、FINAL_TRIAL_CHOOSE 三分支（victory / final_result / home）；persistence tribulationLevel；VictoryScreen、FinalTrialScreen 文案；ARCHITECTURE + ROADMAP

## TICKET-28 完成项（成就系统 v2：72 条、8 组、进度/领取/校验）

- **成就数量与分组**：72 条成就、8 组（探索/炼丹/突破/天劫/坊市/功法流派/收集/传承），每组 ≥6 条、含至少 1 条隐藏技巧；tier I~VI 递进
- **条件类型**：累计计数（lifetime）、本局达成（run max）、连胜（streak）、技巧/挑战（flag）、all 组合；MetricKey/FlagKey 白名单，content 校验
- **单一来源**：`getAchievementView(state)` 返回进度/可领取/已领取/奖励/分组/排序；UI 不计算进度
- **领取**：`claimAchievement(state, id)`、`claimAllAchievements(state)` 幂等，奖励（灵石/传承点）由引擎发放
- **持久化**：achievements.claimed、meta.statsLifetime 独立 key 跨局保存；新开局合并
- **UI**：AchievementsScreen 顶部分组 Tab、卡片列表（标题+tier+desc+进度条+奖励+领取按钮）、一键领取（≥44px）
- **工程**：achievements.ts、achievements.v1.json、achievements.test.ts、content_validation 成就校验；game reducer 落点更新 stats/streaks/flags；docs ARCHITECTURE + ROADMAP

## TICKET-24 完成项（发布前稳定性：版本号 + 存档信封 + 诊断 + 内容校验）

- **版本号**：APP_VERSION 从 package.json 经 vite define 注入；设置页或首页底部显示（如 v0.1.0 / v1.0.0）
- **SaveEnvelope**：存档写入 `{ meta: { schemaVersion, savedAt }, state }`；读档支持旧格式自动迁移；schemaVersion 更高或解析失败时自动备份并重置
- **诊断页**：/diagnostics 显示版本、schemaVersion、savedAt、state 摘要；复制存档、粘贴导入（校验）、清档
- **内容校验**：content_validation.test.ts 覆盖 chains/events/kungfu/recipes 等主要 content JSON（id 唯一、引用存在、数值范围）
- **工程**：version.ts、persistence envelope/migrate/tryBackup、DiagnosticsScreen、content_validation 扩展；docs 更新

## TICKET-29 完成项（天劫玩法重做：回合制 + 意图 + 四行动 + 丹药/功法）

- **目标**：天劫从“一键扣血”升级为多回合（3～5 回合）可操作玩法，可读意图 + 多回合决策 + 丹药/功法/风险收益。
- **天道意图**：至少 3 种（雷击、心魔、天火），展示意图名称 + 预计伤害区间 + 附加效果；由引擎计算，UI 只展示。
- **四行动**：稳住心神（减伤/净化）、吞服丹药（选丹：回血/护盾/净化，消耗背包）、护体硬抗（高减伤、下回合虚弱）、逆冲天威（高风险高收益，成功率受功法影响）。
- **丹药接入**：至少 2 类生效（回血 qi_pill/blood_lotus_pill、护盾 purple_heart_pill、净化 ice_heart_pill）；消耗由引擎处理。
- **功法接入**：tribulationDamageMult 影响伤害；tribulationSurgeRateAdd 影响逆冲成功率；成就 build_mod_tribulation 在功法影响天劫时触发。
- **单一来源**：getTribulationTurnView(state) 输出 UI 所需一切；startTribulation(state, rng)、applyTribulationAction(state, action, rng, pill?)；RNG 可 mock。
- **UI**：FinalTrialScreen 重做——状态条（HP/护盾/回合/debuff）、天道意图卡、四行动按钮（吞丹展开丹药面板）、回合日志；数据仅来自 getTribulationTurnView。

## TICKET-38 完成项（机制型丹药系统：入口盘点 + 统一引擎 + 24 丹 + 规则型爽点 + UI 爽反馈）

- **入口盘点**：天劫页已有【吞服丹药】→ TRIBULATION_ACTION(PILL)；突破页用丹在计划内；探索/修炼/背包原无入口；新增 USE_PILL + 天劫页机制丹选项 + 全局 pillToast
- **引擎**：`src/engine/pills/pill_effects.ts` — PillContext、canUsePill、applyPillEffect、getPillOptionsForContext、getPillPreviewText；`run.temp` 承载 tribulationExtraLife、exploreFreeRetreat、breakthroughNoCostOnFail、survivalCheatDeath 等；天劫/突破/探索结算中消费 temp
- **内容**：`src/content/pills.v1.json` 24 个机制丹（6 类×4）：护劫/避雷/清心/天命(规则)、护道/遁空(规则)/引宝/回元、破境/镇脉/固本/问心(规则)、凝神/开脉/悟道(规则)/回春、续命/龟息(规则)/化厄/涅槃(规则·天)、折扣/聚财/万宝(规则)/鉴宝
- **规则型**：天命丹(地/天)额外容错或行动、遁空丹无损撤退、问心丹失败不付代价、龟息丹免死一次、涅槃丹(天)复活、万宝丹坊市免费刷新或购买
- **UI**：使用丹药后 run.temp.pillToast 展示【丹药名】品质：效果；CLEAR_PILL_TOAST 清除；天劫页吞丹面板展示机制丹并 dispatch USE_PILL
- **测试**：pill_can_use.test.ts、pill_effects_tribulation/explore/breakthrough/survival.test.ts、content 校验 24 丹；npm test 全绿

## TICKET-39 完成项（通用丹方：outputMode=pool + 池抽取 + 保底 + tier 影响）

- **产物模式**：`RecipeDef.outputMode` 为 `fixed`（固定丹药）或 `pool`（从用途池随机抽机制丹）；pool 时 `pillPoolTag`（tribulation/explore/breakthrough/cultivate/survival/economy/utility）
- **丹药池归属**：`pills.v1.json` 每丹增加 `pillRarity`（common/rare/legendary）、`isRulePill?`（规则型仅天品丹炉可出）
- **通用丹方**：护劫丹炉(tribulation)、探宝丹炉(explore)、破境丹炉(breakthrough)、悟道丹炉(cultivate)、续命丹炉(survival)、聚财丹炉(economy)、杂炼丹炉(utility)；每张有 tier 与材料需求，凡便宜/天极贵
- **引擎**：`src/engine/alchemy/pill_pool.ts` — getPillPool、rollPillFromPool、getPoolPreviewByRarity；保底 `run.pillPoolPityByTag`，阈值 rare 6、legendary 18；resolveBrew 当 outputMode=pool 时写 pillInventory 与 pity；战报 poolPill（pillId/quality/rarity/isRulePill）
- **UI**：AlchemyScreen 丹方列表【丹炉·定向炼制】分组；选通用丹方后展示方向、产出池预览（按稀有度种数）、天品丹炉「有极小概率炼出逆天丹」；炼成弹层「炼成：××丹·地（稀有）」、规则丹「逆天改命！」
- **测试**：pill_pool_roll.test.ts、pill_pool_pity.test.ts、alchemy_pool_recipe_integration.test.ts、content_validation 扩展（pool recipe pillPoolTag 合法、pill pillRarity/池 tag）；npm test 全绿 + npm run build 通过

## TICKET-37 完成项（奇遇链：定向材料链 + 条件解锁 + 目标材料 UI）

- **内容**：6 种天材地宝材料（雷泽灵髓/天外陨铁/九转玄藤/炉心碎玉/命纹石/紫府灵砂）入 `alchemy_recipes.v1.json`；≥12 条定向获取链入 `event_chains.v1.json`，每条 2～4 段、终章 `guaranteedReward` 材料、可选 `unlock`（minDanger/minTribulationPassed）
- **引擎**：`chains.ts` — `ChainUnlock`、`canChainTrigger(chain, ctx)`、`getChainTargetMaterial`、`getChainProgressView`；`pickChainToStart(rng, completed, ctx)` 按 ctx 过滤；奖励 `applyGuaranteedReward` 写入背包
- **UI**：ExploreScreen 奇遇进度区显示「目标材料：XXX」与当前进度
- **测试**：content_validation 链 id 唯一、定向材料链≥12、reward materialId 存在、解锁条件低 danger/trib 不触发；chain_reachability_smoke 可控 rng 走完雷泽寻髓链拿到雷泽灵髓

## TICKET-36 完成项（天劫意图扩容：≥12 种、稀有意图、可读可防、counter 生效）

- **内容**：`src/content/tribulation_intents.v1.json` 意图 ≥12 种（含 ≥3 稀有）；字段 id/name/rarity/tags/effectSpec/telegraphText/counterHint/minTier/baseWeight；普通意图（雷击/连劈/蓄力重雷/雷云压制/破盾/抽灵/心魔侵蚀/天火/雷链）、稀有意图（天罚·锁命/九霄·三连判定/紫电·穿透）minTier≥6。
- **引擎**：`src/engine/tribulation/tribulation_intents.ts` 从 JSON 加载；`rollIntent(level, rng)` 按 minTier 过滤、baseWeight 加权；结算支持 blockHeal（本回合回血无效）、shieldPenetration（护盾穿透）；`getTribulationTurnView` 输出 telegraphText、counterHint。
- **UI**：意图卡展示「下回合将发生：XXX」+ 意图名 + 伤害区间 + 一行应对提示（counterHint）。
- **测试**：tribulation_intent.test.ts 覆盖意图数量/稀有数、minTier（低 tier 不出稀有、高 tier 可出）、counter（GUARD 承伤更少、addDebuff 叠加）；content_validation 校验意图 id 唯一、≥12、≥3 稀有、telegraphText/counterHint/minTier/baseWeight。

## TICKET-30 完成项（突破系统重做：99 级 + 境界门槛 + 觉醒技能三选一）

- **境界/等级**：`realms.v1.json` 至少 6 境界，每境界 levelCap（凡人 15/炼气 30/筑基 45/金丹 60/元婴 75/化神 99）；player.level（1..99）、player.exp；达 cap 后经验不再增长，需突破才能继续升级。
- **四类门槛**：经验（cap 挡）、丹药（地/天有境界与每局上限 pillRules）、功法（kungfuRule 限制可装备最高稀有度）、天劫（tier>max 则禁入或 successRate=0）。
- **突破页**：getBreakthroughView(state) 单一来源；背包丹药通用选择 + 突破姿态三选一（safe/steady/surge）+ 成功率预览/拆解；attemptBreakthrough(state, plan, rng)，plan = { pills, focus }。
- **觉醒技能**：突破成功后 rollAwakenSkillChoices(state, rng) 抽 3 选 1（不重复）；chooseAwakenSkill(state, skillId)；技能 modifiers 合并到全局（getKungfuModifiers 含 awaken）。
- **全局挂钩**：修炼/探索/事件加经验走 applyExpGain；吃丹走 canTakePill + recordPillUse；功法装备走 canEquipKungfu；天劫进入走 getTribulationGate。
- **UI**：BreakthroughScreen 用 getBreakthroughView 展示 Lv/Cap、成功率拆解；AwakenSkillScreen 三选一；CultivateScreen 显示 Lv/99、已到上限需突破提示。
- **测试**：level_cap.test.ts、pill_gate.test.ts、kungfu_gate.test.ts、tribulation_gate.test.ts；content_validation 覆盖 realms/awaken_skills。
- **测试**：tribulation.test.ts 覆盖 startTribulation 初始化、getTribulationTurnView、四动作各至少 1 例、胜负判定、RNG 可控；game.test.ts 更新时辰耗尽进入 tribulation。
- **工程**：tribulation.ts、tribulation_intents.ts、persistence run.tribulation、kungfu_modifiers tribulationSurgeRateAdd、docs ARCHITECTURE + ROADMAP

## TICKET-33 完成项（修炼系统大改：等级经验曲线 + 阶进阶循环 + 99级境界突破）

- **进度结构**：realm + stageIndex（1..7）+ level（1..99）；每阶 15 级，最后一阶 Lv91–99；阶边界 15,30,45,60,75,90,99。
- **经验曲线**：`expNeededForNextLevel(level)` 二次曲线；修炼/探索经验经 `applyExpGain`，达本阶上限时经验停止并提示需阶突破。
- **阶突破**：达本阶上限且 stageIndex<7 可进行阶突破；成功 stageIndex++、level++、maxHp+10、回气丹×1；失败扣血、保底+1。
- **境界突破**：仅 Lv99 且 stageIndex=7 可进行境界突破；成功 realm 升级、level=1、stageIndex=1、觉醒技能三选一。
- **UI**：修炼页境界+阶+等级/本阶上限+经验条，cap 时提示需阶突破；突破页明确区分阶突破与境界突破及收益说明。
- **测试**：progression_exp_curve.test.ts、stage_breakthrough.test.ts；经验曲线、cap 挡经验、阶突破/境界突破状态与奖励落地；npm test 全绿。

## TICKET-34 完成项（坊市系统重做：获取途径 + 分类/筛选 + 出售回收）

- **Obtainable 校验**：content_validation 断言所有 recipe 材料在可获得集合内（坊市+探索掉落+奇遇链+探索事件）；缺失时测试失败并 console 输出列表；loot 导出 getLootMaterialIds，market/obtainable 导出 getObtainableMaterialIds、getRecipeMaterialIds。
- **定价**：market/pricing.ts — RARITY_BASE_PRICE（common 10～legendary 320）、getBasePriceByRarity；shop 全 16 材料按 category+rarity/basePrice 定价；卖价=买价×0.8 向下取整。
- **补齐途径**：坊市目录扩展为 16 种材料（紫灵叶/血莲精/青木藤/冰灵果/火阳芝/龙须根/千年黄精/地心乳/蛇涎果/魔核/魂婴果/菩提子等），均可在坊市购买。
- **出售**：canSell、applySell、getSellPrice；SHOP_SELL action；卖 1/卖全部，数量扣减、灵石增加。
- **UI**：ShopScreen 分类 Tab（炼丹材料 / 出售）；材料 Tab 支持按价格/稀有度排序、仅买得起筛选；出售 Tab 展示背包可售材料、回收单价与总价、卖1/卖全部，说明回收价=买价×0.8。
- **测试**：content_validation obtainable；shop.test.ts 目录 16 种、买入、出售、卖全部、数量不足不可卖；market/pricing.test.ts rarity 映射、卖价=买价×0.8；npm test 全绿。

## TICKET-35 完成项（觉醒技能池扩容：≥60、按流派分池、权重三选一、互斥、UI）

- **内容**：`awaken_skills.v1.json` ≥60 条，每 tag 至少 8 条、legendary 至少 10 条；id/name/desc/rarity/tags[]/modifiers{}/exclusiveGroup?；modifiers 复用 mult/add 体系。
- **引擎**：`src/engine/awaken/roll.ts` — getAwakenPoolByTags（基础权重 + tag 加权）、互斥过滤、weightedSampleWithoutReplacement；rollAwakenSkillChoices 三选一不重复；池不足时 fallback 返回全部。
- **互斥**：exclusiveGroup 同组不同时出现/不可同时拥有。
- **UI**：AwakenSkillScreen 卡片显示稀有度徽章、tags 徽章、短描述（≤18 字）、关键效果 2 条（modifiers 映射）。
- **测试**：awaken_roll.test.ts 覆盖三选一不重复、互斥组过滤、权重偏好（explore 加权）、生效（getKungfuModifiers 改变）；content_validation 觉醒技能数量与 tag/legendary 约束。

## TICKET-31 完成项（UI 氛围感图标体系）

- **AtmosIcon**：`src/app/ui/IconArt.tsx`，内联 SVG 氛围感图标，name 覆盖主界面入口（修炼/探索/炼丹/突破/坊市/功法/传承/成就/设置）与炼丹关键区（丹方/炉温/材料/概率/批量）；tone=gold|jade|purple|red；未知 name 回退不崩。
- **IconButtonCard**：`src/app/ui/IconButtonCard.tsx`，手游式按钮卡片（图标框+标题+副标题+可选 badge），主界面入口全部替换为此组件。
- **全局样式**：App.css 新增 .atm-card、.atm-card--glow、.atm-iconFrame、.atm-btn、.atm-press、.atm-textTitle/.atm-textSub；按钮≥44px、无横向滚动、prefers-reduced-motion 禁用动画。
- **主界面**：HomeScreen 入口改为 IconButtonCard + 爽文副标题；每日可领取时 daily-card 加 atm-card--glow。
- **炼丹页**：丹方/炉温/批量/成功率·爆丹率区块套用 atm-card + 小图标（recipe、heat_wu、batch、rate_success、rate_boom）。
- **测试**：IconArt.test.ts（所有 name 可渲染、未知 name fallback）、IconButtonCard.test.tsx（title+icon、disabled）、HomeScreen.icons.test.ts（入口 iconName 完整）。
- **文档**：ARCHITECTURE 新增「UI 视觉系统」小节；ROADMAP 本项勾选。

## 开发优先级

待定，将根据游戏设计逐步确定。
