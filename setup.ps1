# 项目初始化脚本（PowerShell）

Write-Host "正在安装依赖..." -ForegroundColor Green
npm install

Write-Host "正在初始化 Git..." -ForegroundColor Green
git init
git branch -M main

# 检查 Git 配置
$userName = git config user.name
if (-not $userName) {
    Write-Host "Git 用户名为配置，设置本地配置..." -ForegroundColor Yellow
    git config user.name "local-dev"
    git config user.email "local-dev@example.com"
}

Write-Host "正在添加文件..." -ForegroundColor Green
git add -A

Write-Host "正在提交..." -ForegroundColor Green
git commit -m "chore: scaffold vite react-ts + vitest + docs + engine rng"

Write-Host "正在运行测试..." -ForegroundColor Green
npm test

Write-Host "完成！" -ForegroundColor Green
