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

### content 层（内容层，未来）
- 事件 JSON 驱动（`src/content/explore_events.v1.json`）
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

### 测试
- engine 层必须 100% 可测试
- 使用依赖注入，避免硬编码依赖
- 测试应使用确定性 RNG 或序列 RNG
