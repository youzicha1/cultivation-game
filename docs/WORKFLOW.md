# 工作流程

## 开发迭代流程

每次功能迭代遵循以下流程：

1. **实现功能**
   - 在对应层级实现功能
   - 遵循架构原则（RNG 注入、分层、screen 状态机）
   - UI 通过 store 调用 reducer，不在组件内写游戏逻辑

2. **补充测试**
   - 为新功能编写测试
   - engine 与 persistence 必须有可复现测试
   - 新增事件必须同时覆盖成功/失败结算测试
   - 涉及概率与资源消耗的改动必须补“成功/失败/边界”三类测试

3. **更新文档**
   - 如有架构变更，更新 `ARCHITECTURE.md`
   - 如有新功能，更新 `ROADMAP.md`

4. **运行检查**
   - 每次提交前**必须**执行 `npm run check`（test + typecheck + build），全部通过才允许提交。
   - 若只跑 `npm test` 而未跑 `npm run build`，可能出现 test 绿但 tsc 失败，导致 CI/Vercel 构建失败。

5. **提交代码**
   - 通过 `npm run check` 后提交代码
   - 使用清晰的 commit message

## 测试与构建命令

- `npm test`: 运行所有测试（单次）
- `npm run typecheck`: 仅类型检查（tsc --noEmit）
- `npm run build`: 类型检查 + Vite 构建
- `npm run check`: **推荐** — 依次执行 test、typecheck、build，全部通过即可提交
- `npm run test:watch`: 监视模式运行测试
- `npm run test:ui`: 打开测试 UI
- `npm run test:coverage`: 生成覆盖率报告
