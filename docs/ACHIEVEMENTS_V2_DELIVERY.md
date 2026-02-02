# TICKET-28 成就系统 v2 交付清单

## 改动文件列表

- `src/engine/achievements.ts` — 成就引擎（types、getAchievementView、claimAchievement、claimAllAchievements、buildAchievementStateSlice）
- `src/engine/achievements.test.ts` — 成就单元测试
- `src/content/achievements.v1.json` — 72 条成就定义、8 组
- `src/engine/game.ts` — GameState.achievements/run.stats/run.streaks/run.flags、meta.statsLifetime、mergeAchievementProgress、CLAIM_ACHIEVEMENT/CLAIM_ALL_ACHIEVEMENTS、探索/炼丹/突破/天劫/坊市落点更新
- `src/engine/persistence.ts` — getPersistentAchievements、savePersistentAchievements、normalizeLoadedState 合并 achievements/run.stats/streaks/flags/meta.statsLifetime
- `src/app/store/useGameStore.ts` — newGame 时合并 getPersistentAchievements
- `src/app/screens/AchievementsScreen.tsx` — 重做：8 组 Tab、进度条、一键领取、隐藏成就
- `src/App.css` — 成就 v2 样式（tabs、cards、progress、claim-all）
- `src/engine/index.ts` — export * from './achievements'
- `src/engine/content_validation.test.ts` — achievements 内容校验（id 唯一、group/tier、criteria.key 白名单、reward 非负）
- `docs/ARCHITECTURE.md` — 成就系统 v2 小节
- `docs/ROADMAP.md` — TICKET-28 完成项、成就条目更新

## MetricKey / FlagKey 白名单与事件落点

### METRIC_KEYS（累计/本局计数）

- **explore_actions** — EXPLORE_DEEPEN 每次 +1（statsLifetimeAdd）
- **explore_cashouts** — EXPLORE_CASH_OUT +1
- **explore_legend_events** — 传说事件触发时 +1
- **run_max_danger** — EXPLORE_DEEPEN 后 run.stats 更新为 max(当前, nextDanger)
- **run_alchemy_count** — ALCHEMY_BREW_CONFIRM 后 statsRunAdd
- **run_item_types** — SHOP_BUY 后按材料种类数写入 run.stats
- **alchemy_success_lifetime / alchemy_boom_lifetime / alchemy_tian_lifetime** — ALCHEMY_BREW_CONFIRM 后 statsLifetimeAdd
- **breakthrough_success_lifetime / breakthrough_fail_lifetime** — BREAKTHROUGH_CONFIRM 成功/失败后
- **tribulation_success_lifetime / tribulation_fail_lifetime** — FINAL_TRIAL_CHOOSE 终局分支
- **shop_trades_lifetime / shop_spend_lifetime** — SHOP_BUY 后
- **codex_entries / relics_unlocked / recipes_unlocked / chains_completed** — 由 state.player / meta 派生
- **legacy_points_total / legacy_nodes / games_completed** — meta 或 statsLifetime
- **achievement_claims_lifetime** — claimAchievement/claimAll 后 +1

### STREAK_KEYS

- **cashout_streak** — EXPLORE_CASH_OUT 时 streaksSet 递增
- **alchemy_success_streak** — ALCHEMY_BREW_CONFIRM 后 streaksSet（爆丹则 0）
- **breakthrough_success_streak** — BREAKTHROUGH_CONFIRM 成功 +1、失败 0
- **tribulation_success_streak** — FINAL_TRIAL 成功分支 +1、失败 0

### FLAG_KEYS（技巧/挑战）

- **explore_low_hp_cashout / explore_greed_cashout** — EXPLORE_CASH_OUT 时 danger/hp 条件
- **explore_allin_no_cashout** — EXPLORE_DEEPEN 时 danger 从 <30 到 ≥80
- **alchemy_boom_high_success / alchemy_low_rate_success / build_danxiu_triggered** — ALCHEMY_BREW_CONFIRM 后根据 rates/outcome
- **breakthrough_low_rate_success / breakthrough_low_hp_success / breakthrough_pity_success / build_chongguan_triggered** — BREAKTHROUGH_CONFIRM 成功分支
- **tribulation_dmg_reduced** — FINAL_TRIAL 有 tribulationDmgReductionPercent 时
- **shop_spend_1500_once / shop_poor_rare_buy** — SHOP_BUY 时金额/金 <200 条件
- 其余 build_* / legacy_run_3 / collection_tian_legend_tribulation 等由对应玩法落点写入 run.flags

## 成就总数与各组数量

- **总数**：72 条
- **8 组**：探索 9、炼丹 9、突破 9、天劫 9、坊市 9、功法流派 9、收集 9、传承 9
- 可由测试 `achievements.test.ts` 中「成就定义 72 条、8 组」及 `content_validation.test.ts` 中「成就总数 ≥ 60，8 组」断言验证

## 手动验证步骤

1. **技巧 flag 成就**：触发一次「爆丹率≥15%仍成功」的炼丹（如选高爆丹配方+武火/真火），完成一炉成功 → 成就页应出现「炉温正好 III」且可领取；领取后不可重复领取。
2. **一键领取**：完成多个成就不领取 → 成就页「一键领取（N）」高亮，点击后全部领取，奖励正确累加（灵石），领取数 N 归零。
3. **隐藏成就**：未达成前列表中不显示；达成后出现且可领取（如「一把梭哈」：危险从 <30 连续到 ≥80 且期间不收手）。

## npm test 与 build

- 运行 `npm run check`（test + typecheck + build）应全部通过。
- 本地执行：`npm test` 摘要、`npm run build`、`git log -1` 由交付时在仓库根目录执行并附结果。
