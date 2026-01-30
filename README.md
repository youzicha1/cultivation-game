# 仙途暴击

基于 React + TypeScript + Vite 开发的修仙类游戏。

## 开发环境

- Node.js
- npm

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发

```bash
npm run dev
```

### 测试

```bash
# 运行测试（单次）
npm test

# 监视模式
npm run test:watch

# 测试 UI
npm run test:ui

# 覆盖率报告
npm run test:coverage
```

### 构建

```bash
npm run build
```

## Git 配置

**注意**: 如果您的 Git 用户名/邮箱未配置，本仓库已设置本地配置（`user.name=local-dev`, `user.email=local-dev@example.com`）以完成初始提交。

您可以后续修改为您的个人配置：

```bash
git config user.name "您的名字"
git config user.email "您的邮箱"
```

## 项目结构

- `src/app/` - 应用层（screens、ui）
- `src/engine/` - 游戏引擎（纯逻辑）
- `src/test/` - 测试配置
- `docs/` - 项目文档

详见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
