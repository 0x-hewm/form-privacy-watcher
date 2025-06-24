#!/bin/bash

# 构建和打包 Chrome 插件的脚本

set -e

echo "🚀 开始构建 Form Privacy Watcher Chrome 插件..."

# 清理之前的构建
echo "🧹 清理构建目录..."
rm -rf dist/
rm -rf build/

# 运行类型检查
echo "🔍 运行 TypeScript 类型检查..."
npm run type-check

# 运行测试
echo "🧪 运行测试..."
npm test

# 运行代码检查
echo "📝 运行代码检查..."
npm run lint

# 构建生产版本
echo "📦 构建生产版本..."
npm run build:prod

# 检查构建结果
echo "✅ 检查构建结果..."
if [ ! -d "dist" ]; then
  echo "❌ 构建失败：dist 目录不存在"
  exit 1
fi

# 检查必要文件
required_files=("manifest.json" "background.js" "content.js" "popup.html" "options.html")
for file in "${required_files[@]}"; do
  if [ ! -f "dist/$file" ]; then
    echo "❌ 构建失败：缺少文件 $file"
    exit 1
  fi
done

# 检查是否有不应该存在的文件
if [ -d "dist/__tests__" ]; then
  echo "❌ 构建失败：发现测试文件目录 __tests__"
  exit 1
fi

echo "📊 构建统计信息："
echo "  - 文件总数: $(find dist -type f | wc -l)"
echo "  - 总大小: $(du -sh dist | cut -f1)"

# 创建发布包
echo "📦 创建发布包..."
cd dist
zip -r "../form-privacy-watcher-$(date +%Y%m%d-%H%M%S).zip" .
cd ..

echo "✨ 构建完成！"
echo "📁 构建文件位于: dist/"
echo "📦 发布包位于: form-privacy-watcher-*.zip"

# 显示安装说明
echo ""
echo "🔧 安装说明："
echo "1. 打开 Chrome 浏览器"
echo "2. 进入扩展管理页面 (chrome://extensions/)"
echo "3. 启用开发者模式"
echo "4. 点击'加载已解压的扩展程序'"
echo "5. 选择 dist/ 目录"
