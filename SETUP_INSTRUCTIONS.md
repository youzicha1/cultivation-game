# 手动设置指南

由于权限限制，请手动执行以下步骤完成项目初始化：

## 步骤 1: 安装依赖

```powershell
npm install
```

## 步骤 2: Git 初始化

```powershell
# 初始化 Git 仓库
git init
git branch -M main

# 如果 Git 用户名/邮箱未配置，设置本地配置
git config user.name "local-dev"
git config user.email "local-dev@example.com"

# 添加所有文件并提交
git add -A
git commit -m "chore: scaffold vite react-ts + vitest + docs + engine rng"
```

## 步骤 3: 验证测试

```powershell
npm test
```

应该看到所有测试通过（全绿）。

## 或者使用自动化脚本

您也可以直接运行 PowerShell 脚本：

```powershell
.\setup.ps1
```

## 验证清单

- [ ] `npm install` 成功完成
- [ ] `npm test` 所有测试通过
- [ ] `npm run dev` 可以启动开发服务器
- [ ] Git 仓库已初始化并完成首次提交
