#!/bin/bash

echo "🔧 更新项目依赖和修复安全漏洞..."

# 清理旧的依赖
echo "📦 清理旧的node_modules..."
rm -rf node_modules package-lock.json

# 安装新的依赖
echo "📥 安装更新的依赖..."
npm install

# 修复安全漏洞（如果有的话）
echo "🔒 检查并修复安全漏洞..."
npm audit fix --force || echo "⚠️  某些安全问题可能需要手动修复"

# 运行测试确保一切正常
echo "🧪 运行测试..."
npm run type-check
npm run lint
npm test

echo "✅ 依赖更新完成！"
