#!/bin/bash
# 项目初始化脚本（Windows 用户请使用 PowerShell 版本）

echo "正在安装依赖..."
npm install

echo "正在初始化 Git..."
git init
git branch -M main

# 检查 Git 配置
if ! git config user.name > /dev/null 2>&1; then
    echo "Git 用户名为配置，设置本地配置..."
    git config user.name "local-dev"
    git config user.email "local-dev@example.com"
fi

echo "正在添加文件..."
git add -A

echo "正在提交..."
git commit -m "chore: scaffold vite react-ts + vitest + docs + engine rng"

echo "正在运行测试..."
npm test

echo "完成！"
